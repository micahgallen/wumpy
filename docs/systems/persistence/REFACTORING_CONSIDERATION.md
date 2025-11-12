# Persistence System Refactoring Consideration

**Date**: 2025-11-12
**Status**: Proposal
**Version**: 1.0
**Author**: Architecture Review

---

## Executive Summary

The current persistence system works but shows signs of architectural fragility. While immediate bugs can be fixed, the underlying design has scalability and maintainability concerns. This document evaluates whether a refactoring to a unified architecture would provide better long-term value.

**Key Finding**: The system suffers from having **no single source of truth** for entity state, leading to consistency bugs that will recur as new features are added.

**Recommendation**: Fix immediate bugs, then plan gradual migration to **Entity-Component System** for long-term stability.

---

## Core Problems Identified

From the comprehensive persistence review, several architectural red flags emerged:

### 1. No Single Source of Truth
Items are tracked in 6 different places:
- Player inventory (`data/players/*.json`)
- Room containers (`data/containers.json`)
- Corpses (`data/corpses.json`)
- Rooms (`world/*/rooms/*.js`)
- Shops (`data/shops/*.json`)
- Void (orphaned items with `location: { type: "void" }`)

**Problem**: No authoritative system that knows where every item is.

### 2. Location is Metadata, Not Authority
Systems treat `item.location` as informational rather than authoritative:
- Physical location: Item in `container.inventory[]` array
- Metadata location: `item.location = { type: 'inventory', owner: 'player' }`
- **These can diverge**, causing duplication bugs

**Problem**: State exists in two places that can contradict each other.

### 3. No Central Coordinator
Each system manages its own persistence independently:
- `PlayerDB.savePlayer()` - saves players
- `ContainerManager.exportState()` - saves containers
- `CorpseManager.exportState()` - saves corpses
- `StateManager` - coordinates periodic saves but doesn't validate consistency

**Problem**: No system ensures global consistency.

### 4. Reactive Fixes Pattern
Every new feature adds validation without fixing root cause:
- Added containers → added container location type
- Added corpses → added corpse location type
- Added quest items → added `isDroppable` checks in 3 places
- Each feature requires updates to 4-6 different systems

**Problem**: Linear growth in complexity. Adding feature N requires touching N existing systems.

### 5. Split Brain Problem
Current bug demonstrates the core issue:
- Item physically exists in container (`containerObj.inventory` array)
- Item's metadata says it's in player inventory (`item.location.owner = 'player'`)
- System has two contradictory truths

**Problem**: No way to detect or prevent contradictions.

---

## What Classic MUDs Got Right

### The Heartbeat Pattern

Classic MUD engines used a central game loop:

```
Game Tick (every 1-2 seconds):
  1. Update all entities (players, NPCs, items, rooms)
  2. Process all queued actions
  3. Validate state consistency
  4. Mark dirty objects
  5. Save dirty objects to disk
```

**Key Advantages**:
- **Single execution context**: All state changes flow through one place
- **Consistency validation**: Easy to check "does every item have exactly one location?"
- **Natural save points**: Tick boundaries are safe points to persist
- **Deterministic**: Same inputs produce same outputs (testable)

### What We're Missing

Our system is **event-driven** (good for responsiveness) but **lacks consistency validation** (bad for correctness):

```javascript
// Player action triggers immediate save
player.execute('put sword in chest');
// → InventoryManager.removeItem()
// → ContainerManager.addItem()
// → PlayerDB.savePlayer()
// → ContainerManager.exportState()
// No validation that item exists in exactly one place!
```

---

## Refactoring Options

### Option 1: Entity-Component System (RECOMMENDED)

**Core Concept**: Everything is an Entity with Components

```javascript
/**
 * Unified Entity Manager
 *
 * Manages ALL game objects through a single system
 */
class EntityManager {
  entities = new Map(); // id → Entity

  constructor() {
    this.entities = new Map();
    this.dirtyEntities = new Set();
  }

  /**
   * Every entity has:
   * - id: unique identifier
   * - type: 'player' | 'item' | 'npc' | 'container' | 'room'
   * - components: { location, inventory, stats, ... }
   * - isDirty: needs save
   */

  createEntity(type, data) {
    const entity = new Entity(type, data);
    this.entities.set(entity.id, entity);
    return entity;
  }

  /**
   * Location becomes a component, not metadata
   */
  moveEntity(entityId, targetId) {
    const entity = this.getEntity(entityId);
    const target = this.getEntity(targetId);

    // Validate move
    if (!target.hasComponent('inventory')) {
      throw new Error('Target cannot hold items');
    }

    // Remove from old location
    const oldParent = this.getEntity(entity.location.parentId);
    if (oldParent) {
      oldParent.inventory.remove(entityId);
      this.markDirty(oldParent);
    }

    // Add to new location
    target.inventory.add(entityId);
    entity.location.parentId = targetId;

    // Mark both entities dirty for next save
    this.markDirty(entity);
    this.markDirty(target);
  }

  /**
   * Save only dirty entities
   */
  save() {
    for (const entityId of this.dirtyEntities) {
      const entity = this.entities.get(entityId);
      this.saveEntity(entity);
    }
    this.dirtyEntities.clear();
  }

  /**
   * Validate global consistency
   */
  validate() {
    // Every item has exactly one location
    const itemLocations = new Map();

    for (const entity of this.entities.values()) {
      if (entity.type === 'item') {
        const loc = entity.location.parentId;
        if (!itemLocations.has(entity.id)) {
          itemLocations.set(entity.id, []);
        }
        itemLocations.get(entity.id).push(loc);
      }
    }

    // Check for duplicates
    for (const [itemId, locations] of itemLocations) {
      if (locations.length !== 1) {
        logger.error(`Item ${itemId} has ${locations.length} locations!`);
      }
    }
  }

  /**
   * Optional: Add heartbeat
   */
  startHeartbeat(intervalMs = 1000) {
    setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  tick() {
    // Process any scheduled updates
    // Validate consistency
    this.validate();
    // Save dirty entities
    this.save();
  }
}

/**
 * Example: Location Component
 */
class LocationComponent {
  type: 'inventory' | 'container' | 'room' | 'equipped' | 'void';
  parentId: string; // Who/what contains this entity

  constructor(type, parentId) {
    this.type = type;
    this.parentId = parentId;
  }
}

/**
 * Example: Entity Definition
 */
class Entity {
  constructor(type, data) {
    this.id = data.id || generateId();
    this.type = type;
    this.components = {};
    this.isDirty = false;

    // Add components based on type
    if (type === 'item') {
      this.components.location = new LocationComponent('void', null);
    }
    if (type === 'container' || type === 'player') {
      this.components.inventory = new InventoryComponent();
    }
  }

  hasComponent(name) {
    return !!this.components[name];
  }

  getComponent(name) {
    return this.components[name];
  }
}
```

#### Benefits

1. **Single System**: AI only needs to understand EntityManager
2. **Consistent**: Location changes go through one code path
3. **Extensible**: New entity types are just new component combinations
4. **Testable**: Mock EntityManager, test everything
5. **Debuggable**: `entityManager.validate()` catches inconsistencies
6. **Future-proof**: Natural place to add guilds, mounts, vehicles, etc.

#### AI Maintainability

```javascript
// OLD: AI needs to understand 6 different systems
PlayerDB.savePlayer(player);
ContainerManager.addItem(containerId, item);
CorpseManager.createCorpse(npc);
InventoryManager.removeItem(player, itemId);
RoomManager.addItem(roomId, item);
ShopManager.addItem(shopId, item);
// Each with different patterns, different APIs, different validation

// NEW: AI understands one system
entityManager.moveEntity(itemId, toContainerId);
entityManager.save(); // saves all dirty entities
// Single API, single pattern, single validation path
```

#### Adding New Features

```javascript
// Want to add guild banks?

// OLD WAY:
// 1. Create GuildBankManager.js (200 lines)
// 2. Add guild_bank location type to 6 systems
// 3. Update InventoryManager to handle guild_bank
// 4. Update persistence to save guild banks
// 5. Update serializers for guild_bank validation
// 6. Add guild_bank checks to put/get commands
// 7. Update 12 different files

// NEW WAY:
class GuildBank extends Entity {
  constructor(data) {
    super('guild_bank', data);
    this.components.inventory = new InventoryComponent();
    this.components.location = new LocationComponent('room', data.roomId);
    this.components.permissions = new PermissionsComponent();
  }
}
// Done. EntityManager handles everything.
// Zero changes to existing code.
```

#### Migration Path

**Phase 1**: Wrap existing systems
```javascript
// EntityManager delegates to old systems during transition
class EntityManager {
  moveEntity(entityId, targetId) {
    const entity = this.getEntity(entityId);

    if (entity.type === 'item') {
      // Use old system during migration
      if (target.type === 'player') {
        InventoryManager.addItem(player, item);
      } else if (target.type === 'container') {
        ContainerManager.addItem(containerId, item);
      }
    }
  }
}
```

**Phase 2**: Gradual migration
- Items first (simplest)
- Then players
- Then containers
- Then NPCs

**Phase 3**: Remove old systems once migration complete

---

### Option 2: Event Sourcing (More Radical)

**Core Concept**: Don't save state, save events

```javascript
/**
 * Event Store
 *
 * State is derived by replaying all events
 */
class EventStore {
  events = [];
  snapshot = null;

  /**
   * Instead of saving "item is in container"
   * Save: "PlayerMovedItem { itemId, from: 'inventory', to: 'container', timestamp }"
   */

  recordEvent(event) {
    event.timestamp = Date.now();
    this.events.push(event);
    this.persist(event);
  }

  /**
   * Reconstruct current state by replaying all events
   */
  getCurrentState() {
    let state = this.snapshot || {};

    // Replay events since last snapshot
    for (const event of this.events) {
      state = event.apply(state);
    }

    return state;
  }

  /**
   * Snapshots for performance
   */
  takeSnapshot() {
    this.snapshot = this.getCurrentState();
    this.clearOldEvents();
  }
}

/**
 * Example Events
 */
class ItemMovedEvent {
  constructor(itemId, fromType, fromId, toType, toId) {
    this.type = 'ItemMoved';
    this.itemId = itemId;
    this.from = { type: fromType, id: fromId };
    this.to = { type: toType, id: toId };
  }

  apply(state) {
    // Remove from old location
    const oldParent = state.entities[this.from.id];
    oldParent.inventory = oldParent.inventory.filter(id => id !== this.itemId);

    // Add to new location
    const newParent = state.entities[this.to.id];
    newParent.inventory.push(this.itemId);

    // Update item location
    state.entities[this.itemId].location = this.to;

    return state;
  }
}
```

#### Benefits

1. **Perfect Audit Trail**: Know exactly what happened and when
2. **Time Travel Debugging**: Replay to any point in time
3. **No Duplication Bugs**: Events are atomic and ordered
4. **Easy Rollback**: Restore to any previous state
5. **Analytics**: Mine event log for player behavior

#### Drawbacks

1. **Complex**: Harder to understand than direct state manipulation
2. **Performance**: Requires snapshot system to avoid replaying millions of events
3. **Query Complexity**: Can't easily query "what items does player have?" without replay
4. **Learning Curve**: Developers need to think in events, not state

#### When to Use

- Financial systems (need audit trail)
- High-value items (need to track ownership history)
- Anti-cheat (need to replay suspicious actions)
- Post-mortem debugging (need to see what happened)

**Verdict for this MUD**: Probably overkill unless you need audit trail for economy/trading.

---

### Option 3: Database-Backed (Simplest)

**Core Concept**: Use real database for state management

```sql
-- SQLite or PostgreSQL
-- Database enforces relationships and consistency

-- Entities table (players, items, containers, etc.)
CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'player', 'item', 'container', etc.
  definition_id TEXT,
  data JSONB, -- Type-specific data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items table (specialized view)
CREATE TABLE items (
  id TEXT PRIMARY KEY REFERENCES entities(id),
  definition_id TEXT NOT NULL,
  location_type TEXT NOT NULL, -- 'inventory', 'container', 'room'
  location_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,

  -- Foreign key ensures parent exists
  FOREIGN KEY (location_id) REFERENCES entities(id) ON DELETE SET NULL,

  -- Unique constraint prevents duplication
  UNIQUE(id) -- Each item can only appear once
);

-- Index for fast lookups
CREATE INDEX idx_items_location ON items(location_id);

-- When item moves, use transaction
BEGIN TRANSACTION;
  UPDATE items
  SET location_type = 'container',
      location_id = 'container_123',
      modified_at = CURRENT_TIMESTAMP
  WHERE id = 'item_456';
COMMIT;
```

#### Benefits

1. **Database Enforces Consistency**: Foreign keys prevent orphaned items
2. **Easy Queries**: `SELECT * FROM items WHERE location_id = 'player_123'`
3. **Transactions**: Atomic state changes (all-or-nothing)
4. **Proven Technology**: Decades of database research
5. **Scales Well**: Databases handle millions of records efficiently
6. **Concurrent Access**: Built-in locking for multiple servers

#### Drawbacks

1. **External Dependency**: Requires SQLite/PostgreSQL setup
2. **Setup Complexity**: Schema migrations, backups, etc.
3. **Less Traditional**: Most MUDs use flat files
4. **Network Latency**: If using remote database (not applicable with SQLite)

#### When to Use

- Large player base (1000+ concurrent)
- Need horizontal scaling (multiple servers)
- Complex queries (leaderboards, economy analytics)
- Long-term data retention

**Verdict for this MUD**: Good option if you expect to scale or need relational queries.

---

## Recommendation: Phased Approach

### Phase 1: Immediate (Week 1)
**Keep current system, fix critical bugs**

```javascript
// 1. Apply the two bug fixes from FIXES_GUIDE.md
//    - Update location in put.js
//    - Save players in ShutdownHandler.js

// 2. Add LocationValidator utility
class LocationValidator {
  static validateItemLocation(item) {
    if (!item.location || !item.location.type) {
      logger.error(`Item ${item.id} has invalid location`);
      return false;
    }
    return true;
  }

  static repairItemLocation(item, correctType, correctParentId) {
    item.location = {
      type: correctType,
      parentId: correctParentId
    };
    item.modifiedAt = Date.now();
    logger.debug(`Repaired location for ${item.id}`);
  }
}

// 3. Create single moveItem() function that all systems must use
class ItemMover {
  static moveItem(item, toType, toParentId) {
    // Remove from old location (future implementation)

    // Update location metadata
    item.location = {
      type: toType,
      parentId: toParentId
    };

    // Add to new location (future implementation)

    // Validate
    LocationValidator.validateItemLocation(item);
  }
}
```

**Outcome**: System is stable, bugs fixed, foundation for refactor in place.

---

### Phase 2: Near-term (3-6 months)
**Implement Entity-Component System**

**Month 1-2: Design & Prototype**
```javascript
// 1. Design EntityManager API
// 2. Prototype with items only
// 3. Write tests
// 4. Get team feedback

// Example prototype
class EntityManager {
  entities = new Map();

  moveEntity(entityId, targetId) {
    // Core logic
  }

  save() {
    // Persistence
  }
}

// 5. Test with subset of items (health potions only)
// 6. Measure performance
// 7. Refine based on learnings
```

**Month 3-4: Migrate Items**
```javascript
// 1. EntityManager handles all item movements
// 2. Old systems delegate to EntityManager
// 3. Run both systems in parallel (validation)
// 4. Gradual cutover room by room
```

**Month 5-6: Migrate Players & Containers**
```javascript
// 1. Players become entities
// 2. Containers become entities
// 3. Remove old systems
// 4. Clean up dead code
```

**Outcome**: Unified system, extensible architecture, easier maintenance.

---

### Phase 3: Long-term (6-12 months)
**Add Advanced Features**

**Optional: Heartbeat for Consistency**
```javascript
class EntityManager {
  startHeartbeat(intervalMs = 1000) {
    setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  tick() {
    // Update entities
    this.updateAll();

    // Validate consistency
    this.validate();

    // Save dirty entities
    this.save();

    // Process timers, respawns, etc.
    this.processScheduled();
  }
}
```

**Optional: Event Sourcing for Audit Trail**
```javascript
// Add event log for high-value transactions
class EntityManager {
  moveEntity(entityId, targetId) {
    // Record event
    this.eventLog.record({
      type: 'EntityMoved',
      entityId,
      targetId,
      timestamp: Date.now()
    });

    // Apply change
    // ... existing logic
  }
}
```

**Optional: Database Backend**
```javascript
// Add database persistence layer
class EntityManager {
  constructor(storageBackend) {
    this.storage = storageBackend; // FileStorage or DatabaseStorage
  }

  save() {
    for (const entity of this.dirtyEntities) {
      this.storage.save(entity);
    }
  }
}
```

**Outcome**: Production-ready, scalable, feature-rich system.

---

## Why Entity-Component Works Best

### 1. AI Maintainability

**Single conceptual model:**
```javascript
// AI prompt: "Add a new feature: guild banks"
// AI response: "Create a GuildBank entity with inventory and permissions components"

// vs current system:
// AI prompt: "Add a new feature: guild banks"
// AI response: "Update PlayerDB, ContainerManager, InventoryManager,
//              put.js, get.js, persistence, serialization... (12 files)"
```

### 2. Extensibility

**Easy to add new entity types:**
```javascript
// Mounts (rideable creatures)
class Mount extends Entity {
  components = [
    new LocationComponent(),
    new MovementComponent(),
    new StatsComponent()
  ];
}

// Vehicles (boats, carts)
class Vehicle extends Entity {
  components = [
    new LocationComponent(),
    new InventoryComponent(),
    new PassengerComponent()
  ];
}

// Zero changes to existing code
```

### 3. Testing

**One system to test:**
```javascript
describe('EntityManager', () => {
  it('prevents item duplication', () => {
    const em = new EntityManager();
    const item = em.createEntity('item', { id: 'sword_1' });
    const container = em.createEntity('container', { id: 'chest_1' });

    em.moveEntity('sword_1', 'chest_1');

    // Validate
    const locations = em.findAllLocationsOf('sword_1');
    expect(locations.length).toBe(1);
    expect(locations[0]).toBe('chest_1');
  });
});
```

### 4. Debugging

**Built-in consistency checks:**
```javascript
// At any time, validate entire game state
entityManager.validate();
// → "Item sword_1 has 2 locations!"
// → "Container chest_3 references non-existent item potion_7"
// → "Player alice inventory has 55 items but capacity is 50"
```

---

## Migration Strategy

### Coexistence Pattern

**Old and new systems run side-by-side:**

```javascript
class EntityManager {
  moveEntity(entityId, targetId) {
    // NEW: Update entity system
    const entity = this.entities.get(entityId);
    entity.location.parentId = targetId;

    // OLD: Also update legacy system (for safety during transition)
    if (entity.type === 'item') {
      LegacyItemMover.move(entity, targetId);
    }

    // VALIDATE: Both systems agree
    const newLocation = entity.location.parentId;
    const oldLocation = LegacyItemMover.getLocation(entity.id);
    if (newLocation !== oldLocation) {
      logger.error('Migration mismatch detected!');
    }
  }
}
```

### Gradual Rollout

**Week 1-2**: Items in one room (test room)
**Week 3-4**: Items in one realm (Sesame Street)
**Week 5-6**: All items
**Week 7-8**: Containers
**Week 9-10**: Players
**Week 11-12**: Remove legacy system

### Rollback Plan

**If issues arise:**
```javascript
// Feature flag to disable EntityManager
const USE_ENTITY_MANAGER = process.env.USE_ENTITY_MANAGER === 'true';

if (USE_ENTITY_MANAGER) {
  entityManager.moveEntity(itemId, targetId);
} else {
  // Fall back to old system
  LegacyItemMover.move(item, target);
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Migration breaks existing items** | Medium | High | Run systems in parallel, validate |
| **Performance degradation** | Low | Medium | Benchmark early, optimize hotpaths |
| **Incomplete migration** | Low | High | Clear milestones, automated tests |
| **Team unfamiliar with pattern** | High | Low | Training, documentation, examples |
| **Scope creep** | Medium | Medium | Strict phasing, MVP first |

**Overall Risk**: LOW-MEDIUM (manageable with proper planning)

---

## Cost-Benefit Analysis

### Costs

**Time Investment:**
- Design: 2 weeks
- Prototype: 3 weeks
- Migration: 12 weeks
- Testing: 4 weeks
- **Total: ~5 months**

**Risks:**
- Bugs during migration
- Learning curve for team
- Temporary code complexity (during coexistence)

### Benefits

**Short-term:**
- Eliminates entire class of bugs (location inconsistency)
- Easier to validate state correctness
- Single system to understand

**Long-term:**
- Linear complexity growth (adding feature N touches 1 system, not N systems)
- AI can reason about entire system
- Easy to add guilds, mounts, vehicles, housing, etc.
- Foundation for advanced features (time travel, event sourcing, multi-server)

**Return on Investment**: High (one-time cost, permanent benefit)

---

## Alternative: Do Nothing

**What if we don't refactor?**

**Pros:**
- Zero migration effort
- No risk of breaking things
- Ship features faster short-term

**Cons:**
- Every new feature requires touching 6+ systems
- Bugs like item duplication will recur
- Complexity grows exponentially
- Eventually becomes unmaintainable
- Technical debt compounds

**Example projection:**

```
Current state (6 systems):
- Adding feature requires updating: 6 files
- Bug surface area: 6 systems × 6 systems = 36 interaction points
- AI prompt complexity: "Update these 6 systems..."

After 5 more features (11 systems):
- Adding feature requires updating: 11 files
- Bug surface area: 11 × 11 = 121 interaction points
- AI prompt complexity: "Update these 11 systems..."
- Team velocity: 50% slower due to complexity

After Entity-Component refactor (1 system):
- Adding feature requires updating: 1 file
- Bug surface area: 1 system (linear growth)
- AI prompt complexity: "Add component to Entity"
- Team velocity: Stable or improving
```

**Conclusion**: Refactoring pays for itself within 1 year.

---

## Practical Next Steps

### 1. Decide: Refactor or Not?

**Decision criteria:**
- **Refactor if**: Planning to add guilds, housing, mounts, or other major features
- **Don't refactor if**: Game is feature-complete and just needs bug fixes
- **Delay decision if**: Unsure about future roadmap

### 2. If Refactoring: Start Small

**Week 1: Design EntityManager API**
```javascript
// Just the interface, no implementation yet
class EntityManager {
  createEntity(type, data) { }
  getEntity(id) { }
  moveEntity(entityId, targetId) { }
  validate() { }
  save() { }
}
```

**Week 2: Prototype with One Item**
```javascript
// Just health potions
const em = new EntityManager();
const potion = em.createEntity('item', { definitionId: 'health_potion' });
const player = em.createEntity('player', { username: 'test' });

em.moveEntity(potion.id, player.id);
em.validate(); // Should pass
```

**Week 3: Get Team Feedback**
- Does the API make sense?
- Are there edge cases we missed?
- Do we like this direction?

### 3. If Not Refactoring: Strengthen Current System

**Add these safeguards:**
```javascript
// 1. Central moveItem() function
class ItemMover {
  static moveItem(item, toType, toParentId) {
    // All systems MUST use this
  }
}

// 2. Validation on every save
class InventorySerializer {
  serializeInventory(player) {
    for (const item of player.inventory) {
      LocationValidator.validate(item, 'inventory', player.username);
    }
  }
}

// 3. Periodic consistency check
setInterval(() => {
  ConsistencyChecker.validateAllItems();
}, 60000);
```

---

## Conclusion

The current persistence system works but shows architectural fragility that will worsen as features are added. The item duplication bug is a symptom of **no single source of truth** for entity location.

**Recommended path forward:**

1. **Immediate** (1 week): Fix critical bugs using FIXES_GUIDE.md
2. **Near-term** (1-2 weeks): Add LocationValidator and central moveItem() function
3. **Decision point** (2 weeks): Evaluate future roadmap
   - If major features planned → Start Entity-Component migration
   - If maintenance mode → Strengthen current system with safeguards
4. **Long-term** (6 months): Complete migration to Entity-Component System

The Entity-Component pattern provides the **unified, AI-friendly architecture** requested while allowing **gradual, low-risk migration** from the current system.

---

## Questions for Discussion

1. **Roadmap**: What features are planned in the next 6-12 months?
2. **Timeline**: Is 5 months acceptable for a refactor?
3. **Team**: Who would work on this? How many developers?
4. **Risk tolerance**: Comfortable with gradual migration approach?
5. **Alternative**: If not refactoring, should we add consistency checks to current system?

---

## Related Documents

- [Persistence Bug Report](./PERSISTENCE_BUG_REPORT.md) - Detailed analysis of current bugs
- [Fixes Implementation Guide](./FIXES_GUIDE.md) - How to fix immediate bugs
- [System Architecture Overview](./OVERVIEW.md) - Current system documentation

---

**Document Status**: Ready for Team Review
**Next Step**: Schedule architecture discussion meeting
**Decision Needed By**: Before starting next major feature
