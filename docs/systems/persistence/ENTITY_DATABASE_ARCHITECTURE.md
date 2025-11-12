# Entity-Component + Database Architecture

**Date**: 2025-11-12
**Status**: Architectural Proposal
**Version**: 1.0

---

## Executive Summary

This document proposes combining **Entity-Component System** with **Database Persistence** to achieve the best of both worlds:

- **Unified entity management** (solves consistency bugs)
- **Modern database** (scalability, transactions, queries)
- **Template-based content creation** (like LPmud - engine vs content separation)

This architecture separates:
- **Engine** (EntityManager) - handles game logic
- **Persistence** (Database) - handles state storage
- **Content** (JSON templates) - created by world builders

---

## The Key Insight: Definitions vs Instances

### Problem with Current Approach

The current system conflates **definitions** (what an item IS) with **instances** (specific copies of that item):

```javascript
// Player inventory saved to players/alice.json
{
  "inventory": [
    {
      "definitionId": "iron_sword",
      "instanceId": "sword_12345",
      "name": "Iron Sword",           // ← From definition
      "damage": "1d8",                 // ← From definition
      "weight": 3,                     // ← From definition
      "durability": 85,                // ← Instance-specific
      "isEquipped": true,              // ← Instance-specific
      "location": { ... }              // ← Instance-specific
    }
  ]
}
```

**Problem**: Definition data is duplicated in every instance. Changing "Iron Sword" damage requires updating hundreds of files.

### Proposed Separation

**Definitions** (Templates) → JSON files in `world/` directory
**Instances** (Runtime state) → Database records

```
┌────────────────────────────────────────────────────────┐
│ Definition (Template)                                  │
│ File: world/core/items/iron_sword.json               │
├────────────────────────────────────────────────────────┤
│ {                                                      │
│   "id": "iron_sword",                                 │
│   "name": "Iron Sword",                               │
│   "description": "A well-balanced iron blade",        │
│   "itemType": "weapon",                               │
│   "damage": "1d8",                                    │
│   "weight": 3,                                        │
│   "value": 15,                                        │
│   "keywords": ["sword", "iron", "blade"]             │
│ }                                                      │
└────────────────────────────────────────────────────────┘
                          ↓ spawns
┌────────────────────────────────────────────────────────┐
│ Instance (Runtime)                                     │
│ Database: entity_instances table                       │
├────────────────────────────────────────────────────────┤
│ instanceId: "sword_12345"                             │
│ definitionId: "iron_sword"          ← Links to template
│ location: { type: "inventory", owner: "player_alice" }│
│ durability: 85                      ← Instance state   │
│ isEquipped: true                    ← Instance state   │
│ modifiedAt: "2025-11-12T10:30:00"  ← Instance state   │
└────────────────────────────────────────────────────────┘
                          ↓ references
┌────────────────────────────────────────────────────────┐
│ Player sees:                                           │
│ "Iron Sword (durability: 85%)" [equipped]            │
│                                                        │
│ Name/damage from definition                           │
│ Durability/equipped from instance                     │
└────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

```sql
-- ============================================================
-- DEFINITIONS (could be JSON files OR database, or both)
-- ============================================================

-- Optional: Cache definitions in database for fast lookup
CREATE TABLE definitions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'item', 'npc', 'room'
  data JSONB NOT NULL, -- Full definition
  file_path TEXT, -- Source file for editing
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_definitions_type ON definitions(type);

-- ============================================================
-- ENTITY INSTANCES (runtime state)
-- ============================================================

CREATE TABLE entity_instances (
  -- Identity
  id TEXT PRIMARY KEY, -- Instance ID (uuid)
  definition_id TEXT NOT NULL, -- References definition
  entity_type TEXT NOT NULL, -- 'item', 'npc', 'player', 'container'

  -- Location (the critical part that fixes duplication bug)
  location_type TEXT NOT NULL, -- 'inventory', 'container', 'room', 'equipped', 'void'
  location_owner TEXT, -- Player/NPC/Container ID that owns this
  location_room TEXT, -- Room ID if in a room

  -- Instance-specific state (varies by entity type)
  state JSONB, -- Flexible: { durability: 85, isEquipped: true, ... }

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  FOREIGN KEY (definition_id) REFERENCES definitions(id),

  -- Ensure each instance appears in exactly one location
  UNIQUE(id),

  CHECK (
    (location_type = 'inventory' AND location_owner IS NOT NULL) OR
    (location_type = 'container' AND location_owner IS NOT NULL) OR
    (location_type = 'room' AND location_room IS NOT NULL) OR
    (location_type = 'equipped' AND location_owner IS NOT NULL) OR
    (location_type = 'void')
  )
);

-- Indexes for fast queries
CREATE INDEX idx_instances_location ON entity_instances(location_type, location_owner);
CREATE INDEX idx_instances_definition ON entity_instances(definition_id);
CREATE INDEX idx_instances_room ON entity_instances(location_room);

-- ============================================================
-- PLAYERS (special entity type)
-- ============================================================

CREATE TABLE players (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,

  -- Current state
  current_room TEXT NOT NULL,
  hp INTEGER NOT NULL,
  max_hp INTEGER NOT NULL,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,

  -- Stats
  stats JSONB, -- { str: 10, dex: 12, ... }

  -- Flags
  is_admin BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  last_logout TIMESTAMP,

  -- Metadata
  play_time_seconds INTEGER DEFAULT 0,
  settings JSONB -- { colorEnabled: true, ... }
);

CREATE INDEX idx_players_online ON players(is_online);
CREATE INDEX idx_players_room ON players(current_room);

-- ============================================================
-- CONTAINERS (special entity type)
-- ============================================================

CREATE TABLE containers (
  id TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL,
  room_id TEXT NOT NULL,

  -- State
  is_open BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  capacity INTEGER DEFAULT 20,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (definition_id) REFERENCES definitions(id)
);

CREATE INDEX idx_containers_room ON containers(room_id);

-- ============================================================
-- UTILITY VIEWS
-- ============================================================

-- Player inventory view
CREATE VIEW player_inventories AS
SELECT
  ei.location_owner as player_username,
  ei.id as instance_id,
  ei.definition_id,
  d.data->>'name' as item_name,
  ei.state,
  ei.modified_at
FROM entity_instances ei
JOIN definitions d ON ei.definition_id = d.id
WHERE ei.location_type = 'inventory';

-- Container contents view
CREATE VIEW container_contents AS
SELECT
  ei.location_owner as container_id,
  ei.id as instance_id,
  ei.definition_id,
  d.data->>'name' as item_name,
  ei.state,
  ei.modified_at
FROM entity_instances ei
JOIN definitions d ON ei.definition_id = d.id
WHERE ei.location_type = 'container';

-- Room items view
CREATE VIEW room_items AS
SELECT
  ei.location_room as room_id,
  ei.id as instance_id,
  ei.definition_id,
  d.data->>'name' as item_name,
  ei.state,
  ei.modified_at
FROM entity_instances ei
JOIN definitions d ON ei.definition_id = d.id
WHERE ei.location_type = 'room';
```

---

## Architecture Layers

### Layer 1: Content Templates (JSON Files)

**Purpose**: World builders define game content
**Location**: `world/` directory
**Format**: JSON files
**Examples**:

```javascript
// world/core/items/iron_sword.json
{
  "id": "iron_sword",
  "name": "Iron Sword",
  "description": "A well-balanced blade of iron",
  "itemType": "weapon",
  "keywords": ["sword", "iron", "blade"],
  "weight": 3,
  "value": 15,
  "weaponProperties": {
    "damage": "1d8",
    "damageType": "slashing"
  }
}

// world/sesame_street/npcs/grover.json
{
  "id": "grover",
  "name": "Grover",
  "description": "A friendly blue monster",
  "race": "muppet",
  "keywords": ["grover", "monster", "blue"],
  "stats": {
    "hp": 50,
    "level": 5
  },
  "dialogue": {
    "greeting": "Hello there, my friend!"
  }
}

// world/sesame_street/rooms/arena_lounge.json
{
  "id": "arena_lounge",
  "name": "Arena Lounge",
  "description": "A cozy lounge area...",
  "exits": {
    "south": "sesame_street_01"
  },
  "fixtures": ["equipment_rack"], // Reference to container definition
  "npcs": ["grover"] // Reference to NPC definition
}
```

**Key Point**: These files NEVER change at runtime. Only world builders edit them.

---

### Layer 2: Database (Runtime State)

**Purpose**: Store instance state and handle transactions
**Technology**: SQLite (simple) or PostgreSQL (scalable)
**Handles**:
- Entity instances (items in inventories, NPCs in rooms)
- Player state (position, HP, inventory)
- Container state (open/closed, contents)
- Transactions (atomic state changes)
- Queries (find all items, leaderboards)

---

### Layer 3: EntityManager (Game Engine)

**Purpose**: Coordinate between definitions, database, and game logic
**Responsibilities**:
- Load definitions from JSON files
- Create/destroy entity instances in database
- Handle entity interactions (move, equip, use)
- Enforce game rules
- Coordinate persistence

```javascript
class EntityManager {
  constructor(database, definitionLoader) {
    this.db = database;
    this.definitions = definitionLoader;
    this.entityCache = new Map(); // In-memory cache for performance
  }

  // ========================================
  // Loading & Caching
  // ========================================

  /**
   * Get entity definition (template)
   */
  getDefinition(definitionId) {
    return this.definitions.get(definitionId);
  }

  /**
   * Get entity instance (runtime)
   */
  async getInstance(instanceId) {
    // Check cache first
    if (this.entityCache.has(instanceId)) {
      return this.entityCache.get(instanceId);
    }

    // Load from database
    const row = await this.db.get(
      'SELECT * FROM entity_instances WHERE id = ?',
      [instanceId]
    );

    if (!row) return null;

    // Combine definition + instance
    const definition = this.getDefinition(row.definition_id);
    const instance = {
      ...definition, // Definition data
      instanceId: row.id,
      location: {
        type: row.location_type,
        owner: row.location_owner,
        room: row.location_room
      },
      state: JSON.parse(row.state || '{}')
    };

    // Cache for performance
    this.entityCache.set(instanceId, instance);
    return instance;
  }

  // ========================================
  // Entity Lifecycle
  // ========================================

  /**
   * Create new entity instance
   */
  async createInstance(definitionId, location, initialState = {}) {
    const definition = this.getDefinition(definitionId);
    if (!definition) {
      throw new Error(`Definition not found: ${definitionId}`);
    }

    const instanceId = generateUUID();

    // Insert into database
    await this.db.run(`
      INSERT INTO entity_instances (
        id, definition_id, entity_type,
        location_type, location_owner, location_room,
        state
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      instanceId,
      definitionId,
      definition.itemType || definition.type,
      location.type,
      location.owner || null,
      location.room || null,
      JSON.stringify(initialState)
    ]);

    // Load and cache
    return await this.getInstance(instanceId);
  }

  /**
   * Delete entity instance
   */
  async destroyInstance(instanceId) {
    await this.db.run(
      'DELETE FROM entity_instances WHERE id = ?',
      [instanceId]
    );
    this.entityCache.delete(instanceId);
  }

  // ========================================
  // Entity Movement (FIXES DUPLICATION BUG)
  // ========================================

  /**
   * Move entity to new location
   * This is THE single point of truth for location changes
   */
  async moveEntity(instanceId, targetLocation) {
    const instance = await this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    // Validate target location exists
    await this.validateLocation(targetLocation);

    // Use transaction for atomic update
    await this.db.run('BEGIN TRANSACTION');

    try {
      // Update location in database
      await this.db.run(`
        UPDATE entity_instances
        SET location_type = ?,
            location_owner = ?,
            location_room = ?,
            modified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        targetLocation.type,
        targetLocation.owner || null,
        targetLocation.room || null,
        instanceId
      ]);

      await this.db.run('COMMIT');

      // Update cache
      instance.location = targetLocation;
      this.entityCache.set(instanceId, instance);

      logger.log(`Moved entity ${instanceId} to ${targetLocation.type}:${targetLocation.owner || targetLocation.room}`);

      return { success: true };

    } catch (err) {
      await this.db.run('ROLLBACK');
      throw err;
    }
  }

  // ========================================
  // Queries
  // ========================================

  /**
   * Get all items in player inventory
   */
  async getPlayerInventory(username) {
    const rows = await this.db.all(`
      SELECT * FROM entity_instances
      WHERE location_type = 'inventory'
        AND location_owner = ?
    `, [username]);

    return Promise.all(rows.map(row => this.getInstance(row.id)));
  }

  /**
   * Get all items in container
   */
  async getContainerContents(containerId) {
    const rows = await this.db.all(`
      SELECT * FROM entity_instances
      WHERE location_type = 'container'
        AND location_owner = ?
    `, [containerId]);

    return Promise.all(rows.map(row => this.getInstance(row.id)));
  }

  /**
   * Get all items in room
   */
  async getRoomItems(roomId) {
    const rows = await this.db.all(`
      SELECT * FROM entity_instances
      WHERE location_type = 'room'
        AND location_room = ?
    `, [roomId]);

    return Promise.all(rows.map(row => this.getInstance(row.id)));
  }

  /**
   * Find all instances of a definition
   */
  async findInstancesByDefinition(definitionId) {
    const rows = await this.db.all(`
      SELECT * FROM entity_instances
      WHERE definition_id = ?
    `, [definitionId]);

    return Promise.all(rows.map(row => this.getInstance(row.id)));
  }

  // ========================================
  // Consistency Validation
  // ========================================

  /**
   * Validate no entity appears in multiple locations
   */
  async validateConsistency() {
    // Check: Each instance appears exactly once
    const duplicates = await this.db.all(`
      SELECT id, COUNT(*) as count
      FROM entity_instances
      GROUP BY id
      HAVING count > 1
    `);

    if (duplicates.length > 0) {
      logger.error(`Found ${duplicates.length} duplicated entities!`);
      return false;
    }

    // Check: All location references are valid
    const orphaned = await this.db.all(`
      SELECT ei.id, ei.location_type, ei.location_owner
      FROM entity_instances ei
      WHERE
        (ei.location_type = 'inventory' AND ei.location_owner NOT IN (SELECT username FROM players))
        OR
        (ei.location_type = 'container' AND ei.location_owner NOT IN (SELECT id FROM containers))
    `);

    if (orphaned.length > 0) {
      logger.error(`Found ${orphaned.length} orphaned entities!`);
      return false;
    }

    logger.log('Entity consistency validation passed');
    return true;
  }

  // ========================================
  // Persistence
  // ========================================

  /**
   * Save is automatic - database handles it
   * But we can flush cache if needed
   */
  flushCache() {
    this.entityCache.clear();
  }

  /**
   * Backup database
   */
  async backup(backupPath) {
    // SQLite: Just copy the file
    // PostgreSQL: Use pg_dump
    await this.db.backup(backupPath);
  }
}
```

---

## How Commands Work

### Old Way (Multiple Systems)

```javascript
// put command (old)
function execute(player, args, context) {
  const item = InventoryManager.findItem(player, itemName);
  const container = ContainerManager.findContainer(room, containerName);

  // Remove from player
  InventoryManager.removeItem(player, item);

  // Add to container
  ContainerManager.addItem(container, item);

  // BUG: item.location never updated!

  // Save separately
  PlayerDB.savePlayer(player);
  ContainerManager.saveState();
}
```

### New Way (Unified)

```javascript
// put command (new)
async function execute(player, args, context) {
  const { entityManager } = context;

  // Find entities
  const item = await entityManager.getPlayerInventory(player.username)
    .then(items => items.find(i => matchesKeyword(i, itemName)));

  const container = await entityManager.getContainerInRoom(room.id, containerName);

  if (!item || !container) {
    player.send('Item or container not found');
    return;
  }

  // Move entity (ONE FUNCTION - atomic, transactional)
  await entityManager.moveEntity(item.instanceId, {
    type: 'container',
    owner: container.id
  });

  player.send(`You put ${item.name} in ${container.name}`);

  // No manual save needed - database handles it!
}
```

**Benefits**:
- Single function call
- Atomic (can't fail halfway)
- Location guaranteed correct
- No manual saves needed
- Database transaction ensures consistency

---

## Content Creator Workflow

### Creating a New Item (World Builder)

```bash
# 1. Create definition file
$ nano world/mystic_realm/items/enchanted_staff.json
```

```json
{
  "id": "enchanted_staff",
  "name": "Enchanted Staff",
  "description": "A staff crackling with arcane energy",
  "itemType": "weapon",
  "keywords": ["staff", "enchanted", "arcane"],
  "weight": 4,
  "value": 500,
  "weaponProperties": {
    "damage": "2d6",
    "damageType": "magic"
  },
  "magical": true,
  "spells": ["fireball", "lightning_bolt"]
}
```

```bash
# 2. Reload definitions (hot reload, no restart needed)
> /admin reload items

# 3. Spawn an instance for testing
> /admin spawn enchanted_staff

# 4. Test
> look enchanted_staff
> wield enchanted_staff
> cast fireball at goblin

# 5. Place in world
$ nano world/mystic_realm/rooms/wizard_tower.json
```

```json
{
  "id": "wizard_tower",
  "name": "Wizard's Tower",
  "items": ["enchanted_staff"]  // ← Spawns on room load
}
```

**Key Point**: World builder NEVER touches database or code. Just JSON files.

---

### Creating a New Container

```bash
# 1. Create container definition
$ nano world/mystic_realm/objects/mystical_chest.json
```

```json
{
  "id": "mystical_chest",
  "name": "a mystical chest",
  "description": "An ornate chest glowing with runes",
  "containerType": "room_container",
  "keywords": ["chest", "mystical"],
  "capacity": 30,
  "isLocked": true,
  "keyItemId": "mystical_key",
  "lootConfig": {
    "spawnOnInit": true,
    "guaranteedItems": [
      { "itemId": "enchanted_staff", "quantity": 1 }
    ]
  }
}
```

```bash
# 2. Place in room
$ nano world/mystic_realm/rooms/treasure_vault.json
```

```json
{
  "id": "treasure_vault",
  "containers": ["mystical_chest"]
}
```

**EntityManager handles**:
- Creating container instance in database
- Spawning loot items
- Tracking container state
- Everything else

---

## Migration Strategy

### Phase 1: Add Database Layer (2-3 weeks)

**Week 1: Setup Database**
```bash
# Install SQLite (or Postgres)
$ npm install better-sqlite3

# Create schema
$ node scripts/init_database.js
```

**Week 2: Parallel Operation**
```javascript
// EntityManager saves to BOTH database and JSON
class EntityManager {
  async moveEntity(instanceId, location) {
    // NEW: Save to database
    await this.db.run('UPDATE entity_instances SET location = ?', [location]);

    // OLD: Also save to JSON (for safety)
    await LegacySystem.save();
  }
}
```

**Week 3: Validate & Test**
```javascript
// Compare database vs JSON
const dbInventory = await entityManager.getPlayerInventory('alice');
const jsonInventory = await LegacySystem.getInventory('alice');
assert.deepEqual(dbInventory, jsonInventory);
```

---

### Phase 2: Migrate Data (1 week)

```javascript
// Migration script
async function migrateToDatabase() {
  const entityManager = new EntityManager(db);

  // 1. Load all players from JSON
  const players = await loadAllPlayers('./data/players/');

  for (const player of players) {
    // Create player record
    await db.run('INSERT INTO players ...', [player]);

    // Migrate inventory
    for (const item of player.inventory) {
      await entityManager.createInstance(
        item.definitionId,
        { type: 'inventory', owner: player.username },
        item.state
      );
    }
  }

  // 2. Load all containers from JSON
  const containers = JSON.parse(fs.readFileSync('./data/containers.json'));

  for (const container of containers) {
    // Create container
    await db.run('INSERT INTO containers ...', [container]);

    // Migrate contents
    for (const item of container.inventory) {
      await entityManager.createInstance(
        item.definitionId,
        { type: 'container', owner: container.id },
        item.state
      );
    }
  }

  console.log('Migration complete!');
}
```

---

### Phase 3: Remove JSON Persistence (1 week)

```javascript
// Remove all JSON save code
// ❌ PlayerDB.savePlayer() → delete
// ❌ ContainerManager.exportState() → delete
// ❌ CorpseManager.saveState() → delete

// Keep only definition loading from JSON
// ✓ ItemRegistry.loadFromFile()
// ✓ RoomLoader.loadFromFile()
```

---

## Benefits Summary

### For Developers

```javascript
// OLD: Update 6 systems to add guild banks
PlayerDB.addGuildBankSupport()
ContainerManager.addGuildBankType()
InventoryManager.handleGuildBankLocation()
Serializer.addGuildBankValidation()
// ... 200 lines of changes

// NEW: Just add guild bank entity
class GuildBank extends Entity {
  type = 'guild_bank';
  components = ['inventory', 'permissions'];
}
// Done. 5 lines.
```

### For World Builders

```javascript
// OLD: Need developer to add mystical chests
// Submit ticket, wait for code change, wait for deploy

// NEW: Just create JSON file
$ nano world/mystic_realm/objects/mystical_chest.json
$ /admin reload objects
// Done. No code changes.
```

### For Operations

```bash
# Backup entire game state
$ sqlite3 game.db ".backup backup-2025-11-12.db"

# Query anything
$ sqlite3 game.db "SELECT COUNT(*) FROM entity_instances WHERE definition_id = 'ancient_key'"

# Find duplication bugs
$ sqlite3 game.db "SELECT id, COUNT(*) FROM entity_instances GROUP BY id HAVING COUNT(*) > 1"

# Richest players
$ sqlite3 game.db "SELECT location_owner, COUNT(*) as gold FROM entity_instances WHERE definition_id = 'gold_coins' GROUP BY location_owner ORDER BY gold DESC"
```

### For AI

```javascript
// AI can reason about ONE system
"To add mounts:
1. Create mount definition JSON
2. EntityManager handles the rest"

// vs OLD
"To add mounts:
1. Create MountManager
2. Update PlayerDB for mount ownership
3. Update InventoryManager for mount items
4. Update movement commands for mounted travel
5. Add mount persistence
6. Add mount serialization
7. Update 12 files..."
```

---

## Performance Considerations

### Database is Fast

```javascript
// Indexed queries are ~1ms
SELECT * FROM entity_instances WHERE location_owner = 'player_alice'
// → 1ms with 100,000 entities

// JSON file scanning is slow
for (const file of allPlayerFiles) {
  const data = JSON.parse(fs.readFileSync(file));
  if (data.username === 'alice') return data;
}
// → 500ms+ with 1000 players
```

### Caching Layer

```javascript
// Keep hot entities in memory
class EntityManager {
  entityCache = new LRU(1000); // Cache 1000 most-used entities

  async getInstance(id) {
    // Check cache (0.01ms)
    if (this.entityCache.has(id)) {
      return this.entityCache.get(id);
    }

    // Load from database (1ms)
    const entity = await this.db.get(...);
    this.entityCache.set(id, entity);
    return entity;
  }
}
```

### Write-Through Strategy

```javascript
// Immediate consistency
entityManager.moveEntity(itemId, location);
// → Writes to database immediately
// → Also updates cache

// Player always sees current state
```

---

## LPmud Comparison

### LPmud Architecture

```
┌─────────────────────────────────────────────────┐
│ Driver (C code)                                 │
│ - Game loop                                     │
│ - Object management                             │
│ - Persistence (save_object/restore_object)      │
└─────────────────────────────────────────────────┘
              ↓ executes
┌─────────────────────────────────────────────────┐
│ Mudlib (LPC code)                               │
│ /std/object.c                                   │
│ /std/living.c                                   │
│ /std/container.c                                │
│ /domains/castle/room.c                          │
└─────────────────────────────────────────────────┘
```

**Creators edit LPC files** → Driver handles everything else

### Your MUD Architecture (Proposed)

```
┌─────────────────────────────────────────────────┐
│ EntityManager (JS code)                         │
│ - Entity management                             │
│ - Game logic                                    │
│ - Database coordination                         │
└─────────────────────────────────────────────────┘
              ↓ manages
┌─────────────────────────────────────────────────┐
│ Database (SQLite/Postgres)                      │
│ - Entity instances                              │
│ - Transactions                                  │
│ - Queries                                       │
└─────────────────────────────────────────────────┘
              ↑ loads from
┌─────────────────────────────────────────────────┐
│ Templates (JSON files)                          │
│ world/items/sword.json                          │
│ world/npcs/grover.json                          │
│ world/rooms/arena.json                          │
└─────────────────────────────────────────────────┘
```

**Creators edit JSON files** → EntityManager + Database handle everything else

**Same philosophy, modern implementation.**

---

## Conclusion

Combining **Entity-Component + Database + Templates** gives you:

✅ **Single source of truth** (database location is authoritative)
✅ **Scalability** (database handles millions of entities)
✅ **Separation of concerns** (engine vs content)
✅ **AI-friendly** (one system to understand)
✅ **Creator-friendly** (just edit JSON files)
✅ **Modern best practices** (transactions, indexes, queries)
✅ **LPmud philosophy** (engine + content separation)

This is the right architecture for a modern MUD.

---

## Next Steps

1. **Decide on database** (SQLite for simplicity, Postgres for scale)
2. **Design schema** (use this document as starting point)
3. **Implement EntityManager** (with database backend)
4. **Migrate players first** (lowest risk)
5. **Migrate items** (fixes duplication bug)
6. **Remove JSON persistence** (keep only definitions)

**Timeline**: 8-12 weeks for full migration
**Risk**: Low (parallel operation during transition)
**Reward**: Permanent solution to consistency bugs, infinite scalability

---

**Status**: Ready for team review
**Decision needed**: SQLite vs PostgreSQL
**Recommendation**: SQLite (simpler, sufficient for most MUDs)
