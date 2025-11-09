# Corpse and Respawn System - Implementation Journal

**Status:** Architectural Design Complete
**Date:** 2025-11-08
**Author:** MUD Architect
**Priority:** High (Foundational feature for death/loot system)

---

## Executive Summary

This document provides a comprehensive architectural analysis and implementation roadmap for the corpse container and NPC respawn system. The system will handle NPC death → corpse creation → loot containment → decay → respawn in a robust, extensible manner.

**Key Findings:**
- Existing container system is well-architected and can be extended for corpses
- Current respawn system is basic (60s timer, no corpse tracking)
- No event system exists; need to implement lightweight hooks
- Loot generation system is mature and ready for integration
- Timer management needs improvement for persistence across restarts

---

## Table of Contents

1. [Current System Analysis](#current-system-analysis)
2. [Architectural Decisions](#architectural-decisions)
3. [Data Structures](#data-structures)
4. [Integration Strategy](#integration-strategy)
5. [Implementation Phases](#implementation-phases)
6. [Risk Assessment](#risk-assessment)
7. [Testing Strategy](#testing-strategy)
8. [Future Enhancements](#future-enhancements)

---

## Current System Analysis

### 1. Container System (`/src/systems/containers/ContainerManager.js`)

**Status:** Mature and well-designed

**Capabilities:**
- ✓ Create/manage containers with inventories
- ✓ Lock/unlock mechanism with keys
- ✓ Open/close state tracking
- ✓ Capacity management
- ✓ Item transfer (put/take)
- ✓ Stack handling
- ✓ Location tracking

**Architecture:**
- Singleton pattern (exported instance)
- In-memory Map storage (`containers`)
- No persistence across restarts
- No decay/timer support

**Integration Points:**
- Works with `InventoryManager` for item transfers
- Works with `ItemFactory` for item cloning
- Container capacity configurable via `itemsConfig.js`

**Gaps for Corpse System:**
- No timer/decay mechanism
- No automatic deletion on decay
- No respawn hooks
- No corpse-specific properties (weight, NPC metadata)
- No room integration for automatic placement

### 2. Combat System (`/src/combat/CombatEncounter.js`)

**Status:** Functional, handles NPC death

**Death Handling:**
```javascript
// Line 203: removeNPCFromRoom()
// When NPC dies, it's removed from room.npcs array
// No corpse is created
// No loot is dropped
```

**Current Flow:**
1. NPC takes fatal damage
2. Death message broadcast
3. XP awarded to winner
4. `removeNPCFromRoom()` removes NPC from room
5. Combat ends

**Integration Points:**
- Has access to `world`, `allPlayers`, `playerDB`
- Has `roomId` tracking for combat location
- Already broadcasts messages to room

**Gaps:**
- No corpse creation hook
- No loot generation call
- No corpse placement in room

### 3. Loot Generation (`/src/systems/loot/LootGenerator.js`)

**Status:** Excellent - fully featured

**Capabilities:**
- ✓ Weighted random item selection
- ✓ Rarity-based spawn rates
- ✓ Tag-based filtering (realm, type, etc)
- ✓ Level gating for rare items
- ✓ Currency generation by CR
- ✓ Boss loot handling
- ✓ NPC-specific loot tables
- ✓ Quantity generation for stacks

**Key Methods:**
- `generateNPCLoot(npc)` - Returns `{items: [], currency: number}`
- `generateCurrency(challengeRating)` - Returns copper amount
- `generateBossCurrency()` - Returns high-value loot

**Perfect for Corpses:**
- Already designed for NPC corpses
- Returns item instances ready to add to container
- Handles currency as items via `CurrencyManager.createCurrencyItems()`

### 4. Respawn System (`/src/respawnService.js`)

**Status:** Basic, needs enhancement

**Current Implementation:**
```javascript
// 60-second interval
// Checks initialRoomsState vs current room.npcs
// Re-adds missing NPC IDs to room
// Resets NPC HP
```

**Gaps:**
- No corpse tracking
- No decay timer awareness
- Respawns on fixed interval (not corpse decay)
- No spawn location tracking (always spawns in initial room)
- No player notification
- No loot cleanup before respawn

**Strengths:**
- Already has interval timer infrastructure
- Has access to `world` and initial state
- HP reset logic in place

### 5. Room System (`/src/world.js`)

**Status:** Functional, JSON-based

**Room Structure:**
```javascript
{
  id: string,
  name: string,
  description: string,
  exits: [{direction, room}],
  npcs: [npcId],      // Array of NPC IDs
  objects: [objId],
  items: [itemData],  // Array of item instances
  realm: string
}
```

**Container Storage:**
- No current mechanism to store containers in rooms
- Items are stored directly in `room.items`
- No `room.containers` array

**Needed:**
- Add `containers` array to room schema
- Link containers to room IDs
- Display containers in room description
- Clean up containers on decay

### 6. Configuration (`/src/config/itemsConfig.js`)

**Existing Config:**
- Container capacities by type
- Economy settings
- Loot table categories
- NPC currency drop ranges by CR

**Missing Config:**
- Corpse decay times (NPC vs Player)
- Corpse weight
- Corpse-specific capacity
- Respawn delays
- Persistence settings

---

## Architectural Decisions

### Decision 1: Corpse as Special Container Type

**Choice:** Extend `ContainerManager` with corpse-specific logic

**Rationale:**
- Corpses ARE containers (they hold items)
- Avoids code duplication
- Reuses existing inventory transfer logic
- Maintains consistency with container commands

**Implementation:**
- Add `containerType: 'npc_corpse'` and `containerType: 'player_corpse'`
- Add corpse-specific properties to container schema
- Add corpse-specific methods to `ContainerManager`

### Decision 2: Timer Management Approach

**Choice:** Centralized `CorpseDecayService` with timer tracking

**Rationale:**
- Single source of truth for all decay timers
- Can persist timer state to file/DB
- Easier to pause/resume on server restart
- Separates concerns from `ContainerManager`

**Alternative Considered:**
- Individual `setTimeout` per corpse → Hard to persist, memory leaks

**Implementation:**
- New `CorpseDecayService` class
- Tracks `{corpseId, decayTime, spawnLocation, npcId}` map
- Interval-based check (every 10 seconds)
- JSON file persistence for restart recovery

### Decision 3: Respawn Trigger Mechanism

**Choice:** Decay service triggers respawn directly

**Rationale:**
- Tight coupling between decay and respawn is intentional
- Simpler than event system for this use case
- Respawn happens exactly when corpse decays (design requirement)

**Implementation:**
- `CorpseDecayService.onCorpseDecay(corpseId)` calls `RespawnService.respawnNPC()`
- Pass original spawn location and NPC ID
- Respawn even if corpse was moved

### Decision 4: Corpse Weight Design

**Choice:** High weight (100 pounds for medium NPC)

**Rationale:**
- Prevents corpse farming/hoarding
- Realistic (dead bodies are heavy)
- Forces players to loot in place
- Very strong characters can carry 1-2 max

**Calculation:**
```
Base corpse weight = 100 lbs (medium creature)
Small creatures: 50 lbs
Large creatures: 200 lbs
Huge creatures: 500 lbs
```

### Decision 5: Room-Container Relationship

**Choice:** Add `room.containers` array, separate from `room.items`

**Rationale:**
- Containers are interactive objects, not pickupable items
- Easier to filter/display separately
- Allows room-specific container logic
- Future: Chests, crates, barrels also go here

**Schema Change:**
```javascript
room.containers = [
  {
    containerId: "corpse_goblin_123",
    location: { type: 'room', roomId: 'dungeon_01' }
  }
]
```

### Decision 6: Persistence Strategy

**Choice:** Persist corpse timers to JSON file, not full containers

**Rationale:**
- Containers can be recreated from timer data
- Smaller file size
- Faster save/load
- Items already persist via container inventory

**File Structure:**
```json
{
  "corpses": [
    {
      "corpseId": "corpse_goblin_123",
      "npcId": "goblin_warrior",
      "roomId": "dungeon_01",
      "spawnLocation": "dungeon_entrance",
      "createdAt": 1699999999999,
      "decayAt": 1700000299999,
      "items": [...],
      "currency": 50
    }
  ]
}
```

---

## Data Structures

### Corpse Container Schema

```javascript
{
  // Standard Container Properties
  id: "corpse_goblin_123",
  name: "corpse of a goblin",
  description: "The lifeless body of a goblin.",
  keywords: ["corpse", "goblin", "body"],
  containerType: "npc_corpse",  // or "player_corpse"
  capacity: 20,
  inventory: [...items],        // Item instances from loot generation
  isOpen: true,                 // NPC corpses always open
  isLocked: false,
  location: { type: "room", roomId: "dungeon_01" },

  // Corpse-Specific Properties
  npcId: "goblin_warrior",      // Original NPC ID for respawn
  npcType: "goblin",            // NPC type for display
  weight: 100,                  // Heavy (prevents hoarding)
  createdAt: 1699999999999,     // Timestamp
  decayTime: 1700000299999,     // Timestamp (5 min from creation)
  spawnLocation: "dungeon_entrance", // Where NPC respawns

  // Optional (Player Corpses)
  owner: "alice",               // Player name (for player corpses)
  playerLevel: 5,               // Player level at death
}
```

### Timer Tracking Data

```javascript
// In CorpseDecayService
this.corpseTimers = new Map();
// Key: corpseId
// Value: {
//   corpseId: string,
//   npcId: string,
//   roomId: string,
//   spawnLocation: string,
//   decayTime: number,
//   isPlayerCorpse: boolean
// }
```

### Room Schema Update

```javascript
{
  // Existing properties...
  id: string,
  name: string,
  description: string,
  exits: [{direction, room}],
  npcs: [npcId],
  objects: [objId],
  items: [itemData],
  realm: string,

  // NEW: Container array
  containers: [
    {
      containerId: string,
      containerType: string  // For filtering/display
    }
  ]
}
```

---

## Integration Strategy

### Integration Point 1: Combat → Corpse Creation

**Location:** `/src/combat/CombatEncounter.js`

**Current Code (Line 189):**
```javascript
if (winner && loser && winner.socket && !loser.socket && !skipXpAward) {
  const xp = calculateCombatXP(loser, winner.level);
  awardXP(winner, xp, 'combat', this.playerDB);
  this.removeNPCFromRoom(loser);
}
```

**New Code:**
```javascript
if (winner && loser && winner.socket && !loser.socket && !skipXpAward) {
  const xp = calculateCombatXP(loser, winner.level);
  awardXP(winner, xp, 'combat', this.playerDB);

  // Create corpse with loot
  const CorpseManager = require('../systems/corpses/CorpseManager');
  CorpseManager.createNPCCorpse(loser, this.roomId, this.world);

  this.removeNPCFromRoom(loser);
}
```

**Requirements:**
- Import `CorpseManager`
- Pass `loser` (NPC object), `this.roomId`, `this.world`
- Handle flee scenario (line 88) similarly

### Integration Point 2: Corpse Decay → Respawn

**Location:** New `/src/systems/corpses/CorpseDecayService.js`

**Flow:**
```javascript
class CorpseDecayService {
  checkDecay() {
    const now = Date.now();
    for (const [corpseId, timer] of this.corpseTimers) {
      if (now >= timer.decayTime) {
        this.decayCorpse(corpseId, timer);
      }
    }
  }

  decayCorpse(corpseId, timer) {
    // 1. Remove corpse from container manager
    const ContainerManager = require('../containers/ContainerManager');
    ContainerManager.deleteContainer(corpseId);

    // 2. Remove from room
    const room = this.world.getRoom(timer.roomId);
    if (room && room.containers) {
      room.containers = room.containers.filter(c => c.containerId !== corpseId);
    }

    // 3. Trigger respawn
    if (!timer.isPlayerCorpse) {
      const RespawnService = require('../../respawnService');
      RespawnService.respawnNPC(timer.npcId, timer.spawnLocation, this.world);
    }

    // 4. Remove timer
    this.corpseTimers.delete(corpseId);
    this.saveState();
  }
}
```

### Integration Point 3: Room Display

**Location:** `/src/world.js` - `formatRoom()` method

**Add After Objects (Line 247):**
```javascript
// Containers (corpses, chests, etc)
if (room.containers && room.containers.length > 0) {
  const ContainerManager = require('./systems/containers/ContainerManager');
  output.push('');
  for (const containerRef of room.containers) {
    const container = ContainerManager.getContainer(containerRef.containerId);
    if (container) {
      if (container.containerType.includes('corpse')) {
        // Special display for corpses
        output.push(colors.dim(`${container.name} lies here.`));
      } else {
        // Regular containers
        output.push('You see ' + colors.objectName(container.name) + ' here.');
      }
    }
  }
}
```

### Integration Point 4: Commands

**New Commands Needed:**
1. `loot <corpse>` - Specialized looting command
2. `examine corpse` - Show decay time remaining
3. `@clearcorpses` - Admin command

**Command Locations:**
- `/src/commands/containers/loot.js` (new)
- `/src/commands/containers/examine.js` (extend existing)
- `/src/admin/commands.js` (add clearcorpses)

---

## Implementation Phases

### Phase 1: Foundation (Corpse Container Extension)

**Estimated Time:** 2 hours

**Goals:**
- Extend container system for corpses
- Add corpse-specific properties
- Create `CorpseManager` helper module
- Update configuration

**Tasks:**
1. Add corpse config to `/src/config/itemsConfig.js`:
   ```javascript
   corpses: {
     npc: {
       decayTime: 300000,        // 5 minutes (300,000 ms)
       weight: 100,              // 100 pounds
       capacity: 20,
       showInRoom: true
     },
     player: {
       decayTime: 1800000,       // 30 minutes
       weight: 100,
       capacity: Infinity,
       currencyLossPercent: 0.10,
       ownerOnly: true
     },
     sizeWeights: {
       tiny: 10,
       small: 50,
       medium: 100,
       large: 200,
       huge: 500,
       gargantuan: 1000
     }
   }
   ```

2. Create `/src/systems/corpses/CorpseManager.js`:
   ```javascript
   class CorpseManager {
     static createNPCCorpse(npc, roomId, world) {
       // Generate loot
       const loot = LootGenerator.generateNPCLoot(npc);

       // Create container
       const corpse = ContainerManager.createContainer({
         name: `corpse of ${npc.name}`,
         containerType: 'npc_corpse',
         npcId: npc.id,
         npcType: npc.type || 'creature',
         inventory: loot.items,
         capacity: config.corpses.npc.capacity,
         weight: this.calculateWeight(npc),
         isOpen: true,
         isLocked: false,
         location: { type: 'room', roomId: roomId },
         createdAt: Date.now(),
         decayTime: Date.now() + config.corpses.npc.decayTime,
         spawnLocation: npc.spawnLocation || roomId
       });

       // Add to room
       this.addCorpseToRoom(corpse, roomId, world);

       // Register with decay service
       const CorpseDecayService = require('./CorpseDecayService');
       CorpseDecayService.registerCorpse(corpse);

       return corpse;
     }

     static calculateWeight(npc) {
       const size = npc.size || 'medium';
       return config.corpses.sizeWeights[size] || 100;
     }

     static addCorpseToRoom(corpse, roomId, world) {
       const room = world.getRoom(roomId);
       if (room) {
         if (!room.containers) {
           room.containers = [];
         }
         room.containers.push({
           containerId: corpse.id,
           containerType: corpse.containerType
         });
       }
     }
   }
   ```

3. Add `spawnLocation` to NPC definitions (world files)

4. Test: Create corpse manually, verify it appears in room

**Acceptance Criteria:**
- Corpse created with correct properties
- Corpse appears in room containers array
- Loot generated and added to corpse inventory
- Weight calculated correctly

**Review Required:** No (foundation work)

---

### Phase 2: Decay Timer System

**Estimated Time:** 3 hours

**Goals:**
- Implement timer tracking service
- Persistence to JSON file
- Automatic cleanup on decay
- Server restart recovery

**Tasks:**
1. Create `/src/systems/corpses/CorpseDecayService.js`:
   ```javascript
   class CorpseDecayService {
     constructor(world) {
       this.world = world;
       this.corpseTimers = new Map();
       this.checkInterval = null;
       this.persistenceFile = './data/corpse_timers.json';
       this.loadState();
     }

     start() {
       if (this.checkInterval) return;
       logger.log('Starting corpse decay service...');
       this.checkInterval = setInterval(() => this.checkDecay(), 10000); // Every 10 sec
     }

     stop() {
       if (this.checkInterval) {
         clearInterval(this.checkInterval);
         this.checkInterval = null;
         this.saveState();
       }
     }

     registerCorpse(corpse) {
       this.corpseTimers.set(corpse.id, {
         corpseId: corpse.id,
         npcId: corpse.npcId,
         roomId: corpse.location.roomId,
         spawnLocation: corpse.spawnLocation,
         decayTime: corpse.decayTime,
         isPlayerCorpse: corpse.containerType === 'player_corpse'
       });
       this.saveState();
     }

     checkDecay() {
       const now = Date.now();
       const decayed = [];

       for (const [corpseId, timer] of this.corpseTimers) {
         if (now >= timer.decayTime) {
           decayed.push({corpseId, timer});
         }
       }

       for (const {corpseId, timer} of decayed) {
         this.decayCorpse(corpseId, timer);
       }
     }

     decayCorpse(corpseId, timer) {
       logger.log(`Corpse ${corpseId} decaying...`);

       // Remove from container manager
       const ContainerManager = require('../containers/ContainerManager');
       ContainerManager.deleteContainer(corpseId);

       // Remove from room
       const room = this.world.getRoom(timer.roomId);
       if (room && room.containers) {
         room.containers = room.containers.filter(c => c.containerId !== corpseId);
       }

       // Trigger respawn for NPC corpses
       if (!timer.isPlayerCorpse && timer.npcId) {
         this.respawnNPC(timer.npcId, timer.spawnLocation);
       }

       // Remove timer
       this.corpseTimers.delete(corpseId);
       this.saveState();
     }

     respawnNPC(npcId, spawnLocation) {
       const room = this.world.getRoom(spawnLocation);
       if (!room) {
         logger.log(`Cannot respawn ${npcId}: room ${spawnLocation} not found`);
         return;
       }

       // Check if NPC already exists in room
       if (room.npcs && room.npcs.includes(npcId)) {
         logger.log(`NPC ${npcId} already exists in ${spawnLocation}, skipping respawn`);
         return;
       }

       // Add NPC back to room
       if (!room.npcs) room.npcs = [];
       room.npcs.push(npcId);

       // Reset NPC HP
       const npc = this.world.getNPC(npcId);
       if (npc) {
         npc.hp = npc.maxHp;
         logger.log(`Respawned ${npc.name} (${npcId}) in ${spawnLocation}`);
       }
     }

     saveState() {
       const data = {
         version: 1,
         savedAt: Date.now(),
         corpses: Array.from(this.corpseTimers.values())
       };

       const fs = require('fs');
       const path = require('path');
       const dir = path.dirname(this.persistenceFile);
       if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir, { recursive: true });
       }

       fs.writeFileSync(this.persistenceFile, JSON.stringify(data, null, 2));
     }

     loadState() {
       const fs = require('fs');
       if (!fs.existsSync(this.persistenceFile)) {
         return;
       }

       try {
         const data = JSON.parse(fs.readFileSync(this.persistenceFile, 'utf8'));
         for (const timer of data.corpses) {
           this.corpseTimers.set(timer.corpseId, timer);
         }
         logger.log(`Loaded ${this.corpseTimers.size} corpse timers from disk`);
       } catch (err) {
         logger.log(`Error loading corpse timers: ${err.message}`);
       }
     }
   }

   module.exports = new CorpseDecayService(global.world || null);
   ```

2. Initialize service in `/src/server.js`:
   ```javascript
   // After World initialization
   const CorpseDecayService = require('./systems/corpses/CorpseDecayService');
   CorpseDecayService.world = world;
   CorpseDecayService.start();

   // On server shutdown
   process.on('SIGINT', () => {
     CorpseDecayService.stop();
     respawnService.stop();
     server.close();
     process.exit(0);
   });
   ```

3. Test scenarios:
   - Create corpse, wait 5 minutes, verify decay
   - Create corpse, restart server, verify timer persists
   - Multiple corpses decaying at different times
   - Verify NPC respawns after decay

**Acceptance Criteria:**
- Corpses decay after configured time
- Timers persist across server restarts
- NPCs respawn in original spawn location
- Multiple corpses tracked independently
- No memory leaks

**Review Required:** No (core infrastructure)

---

### Phase 3: Combat Integration

**Estimated Time:** 2 hours

**Goals:**
- Hook corpse creation into combat death
- Handle both normal death and flee death
- Broadcast messages to room

**Tasks:**
1. Modify `/src/combat/CombatEncounter.js`:
   - Import `CorpseManager`
   - Call `createNPCCorpse()` before `removeNPCFromRoom()`
   - Add message: "A corpse falls to the ground."

2. Handle all death scenarios:
   - Normal combat death (line 185)
   - Attack of opportunity death during flee (line 88)
   - Off-hand attack death (line 190)

3. Test:
   - Kill NPC, verify corpse created
   - Loot corpse, verify items transfer
   - Wait for decay, verify respawn
   - Kill NPC during flee, verify corpse placement

**Acceptance Criteria:**
- Corpse created on every NPC death
- Corpse placed in correct room
- Messages broadcast to players
- No duplicate corpses
- Loot contains expected items/currency

**Review Required:** Yes (mud-code-reviewer) - Combat integration is critical

---

### Phase 4: Player Commands

**Estimated Time:** 2 hours

**Goals:**
- Implement `loot` command
- Extend `examine` command for corpses
- Update `look` to show corpses

**Tasks:**
1. Create `/src/commands/containers/loot.js`:
   ```javascript
   module.exports = {
     name: 'loot',
     description: 'Loot items from a corpse',
     usage: 'loot <corpse>',
     aliases: ['get from', 'take from'],
     category: 'containers',

     execute(player, args, world, allPlayers, playerDB) {
       if (args.length === 0) {
         player.send('Loot what?');
         return;
       }

       const ContainerManager = require('../../systems/containers/ContainerManager');
       const keyword = args.join(' ').toLowerCase();
       const room = world.getRoom(player.currentRoom);

       if (!room || !room.containers) {
         player.send('There are no containers here.');
         return;
       }

       // Find corpse
       const corpseRef = room.containers.find(c => {
         const container = ContainerManager.getContainer(c.containerId);
         return container &&
                container.containerType.includes('corpse') &&
                (container.name.toLowerCase().includes(keyword) ||
                 container.keywords.some(kw => kw.includes(keyword)));
       });

       if (!corpseRef) {
         player.send('You don\'t see that corpse here.');
         return;
       }

       const corpse = ContainerManager.getContainer(corpseRef.containerId);

       // Check ownership (player corpses)
       if (corpse.containerType === 'player_corpse' && corpse.owner !== player.username) {
         player.send('That corpse belongs to someone else.');
         return;
       }

       // Auto-open if closed
       if (!corpse.isOpen) {
         corpse.isOpen = true;
       }

       // Show contents
       const contents = ContainerManager.getContentsDisplay(corpse);
       player.send(contents);

       // Loot all items
       if (corpse.inventory.length > 0) {
         player.send('\nLooting...');
         for (const item of [...corpse.inventory]) {
           const result = ContainerManager.takeFromContainer(
             player, corpse, item.name, item.quantity || 1
           );
           if (result.success) {
             player.send(result.message);
           }
         }
       }
     }
   };
   ```

2. Update room display in `/src/world.js` (see Integration Point 3)

3. Add decay time display to `examine` command

**Acceptance Criteria:**
- `loot corpse` works correctly
- Items transfer to player inventory
- Capacity limits respected
- Player corpses restricted to owner
- Decay time shown in examine

**Review Required:** No (standard command implementation)

---

### Phase 5: Admin Tools

**Estimated Time:** 1 hour

**Goals:**
- Admin commands for corpse management
- Debugging tools
- Manual respawn controls

**Tasks:**
1. Add to `/src/admin/commands.js`:
   ```javascript
   @clearcorpses: {
     execute(player, args, world) {
       const room = world.getRoom(player.currentRoom);
       if (!room || !room.containers) {
         player.send('No corpses here.');
         return;
       }

       const ContainerManager = require('../systems/containers/ContainerManager');
       const CorpseDecayService = require('../systems/corpses/CorpseDecayService');
       let count = 0;

       const corpseRefs = room.containers.filter(c => {
         const container = ContainerManager.getContainer(c.containerId);
         return container && container.containerType.includes('corpse');
       });

       for (const ref of corpseRefs) {
         ContainerManager.deleteContainer(ref.containerId);
         CorpseDecayService.corpseTimers.delete(ref.containerId);
         count++;
       }

       room.containers = room.containers.filter(c =>
         !corpseRefs.find(r => r.containerId === c.containerId)
       );

       player.send(`Cleared ${count} corpse(s).`);
     }
   },

   @listcorpses: {
     execute(player, args, world) {
       const CorpseDecayService = require('../systems/corpses/CorpseDecayService');
       const timers = Array.from(CorpseDecayService.corpseTimers.values());

       if (timers.length === 0) {
         player.send('No corpses in the world.');
         return;
       }

       player.send(`\n=== Active Corpses (${timers.length}) ===\n`);
       for (const timer of timers) {
         const remaining = Math.max(0, timer.decayTime - Date.now());
         const minutes = Math.floor(remaining / 60000);
         const seconds = Math.floor((remaining % 60000) / 1000);

         player.send(
           `${timer.corpseId} - Room: ${timer.roomId} - ` +
           `Decays in: ${minutes}m ${seconds}s`
         );
       }
     }
   }
   ```

2. Test admin commands

**Acceptance Criteria:**
- Admin can clear corpses
- Admin can list all corpses
- Commands work across all rooms

**Review Required:** No (admin tools)

---

### Phase 6: Integration Testing

**Estimated Time:** 2 hours

**Goals:**
- End-to-end testing
- Edge case handling
- Performance validation

**Test Cases:**
1. **Basic Flow:**
   - Kill NPC → Corpse created
   - Loot corpse → Items transferred
   - Wait 5 min → Corpse decays
   - Wait → NPC respawns

2. **Edge Cases:**
   - Kill NPC, move corpse, verify respawn location
   - Multiple NPCs die in same room
   - Server restart during decay timer
   - Player inventory full when looting
   - Corpse in room with no exits
   - NPC dies, NPC ID not in world.npcs

3. **Performance:**
   - 100 corpses decaying simultaneously
   - Memory leak check (create/decay 1000 corpses)
   - Timer persistence file size

4. **Integration:**
   - Currency items in corpse loot properly
   - Stackable items combine when looted
   - Equipment items transfer correctly
   - Loot generation respects level gating

**Acceptance Criteria:**
- All test cases pass
- No memory leaks
- No timer drift
- Persistence file < 100KB for 100 corpses

**Review Required:** Yes (mud-code-reviewer) - Full system review

---

## Risk Assessment

### Risk 1: Timer Drift on Server Restart

**Severity:** Medium
**Likelihood:** High

**Problem:**
Server restarts during long decay periods could cause corpses to persist longer than intended.

**Mitigation:**
- Check decay on service startup
- Immediately decay corpses past their decay time
- Add max decay time cap (24 hours)

**Code:**
```javascript
loadState() {
  // ... load timers ...

  // Immediately decay expired corpses
  const now = Date.now();
  for (const [id, timer] of this.corpseTimers) {
    if (timer.decayTime < now) {
      this.decayCorpse(id, timer);
    }
  }
}
```

### Risk 2: Orphaned Corpses (No Timer)

**Severity:** High
**Likelihood:** Low

**Problem:**
If `CorpseManager.createNPCCorpse()` succeeds but `CorpseDecayService.registerCorpse()` fails, corpse exists without timer.

**Mitigation:**
- Make timer registration atomic with corpse creation
- Add validation check on startup
- Admin command to detect orphans

**Code:**
```javascript
validateCorpses() {
  const ContainerManager = require('../containers/ContainerManager');
  const orphans = [];

  for (const [id, container] of ContainerManager.containers) {
    if (container.containerType.includes('corpse') && !this.corpseTimers.has(id)) {
      orphans.push(id);
    }
  }

  if (orphans.length > 0) {
    logger.log(`WARNING: Found ${orphans.length} orphaned corpses`);
    // Auto-register or delete
  }
}
```

### Risk 3: Respawn Race Condition

**Severity:** Medium
**Likelihood:** Low

**Problem:**
NPC could be manually spawned by admin while decay service tries to respawn.

**Mitigation:**
- Check if NPC exists in room before respawning
- Add `lastRespawnTime` tracking to prevent duplicate respawns

### Risk 4: Memory Leak from Unclosed Containers

**Severity:** Medium
**Likelihood:** Medium

**Problem:**
`ContainerManager` stores containers in Map, never cleans up unless explicitly deleted.

**Mitigation:**
- Ensure `deleteContainer()` called on every decay
- Add cleanup on room change/deletion
- Periodic orphan cleanup job

### Risk 5: Loot Generation Failure

**Severity:** Low
**Likelihood:** Low

**Problem:**
`LootGenerator.generateNPCLoot()` could throw error, preventing corpse creation.

**Mitigation:**
- Wrap in try/catch
- Create corpse with empty inventory on failure
- Log error for debugging

**Code:**
```javascript
createNPCCorpse(npc, roomId, world) {
  let loot = { items: [], currency: 0 };

  try {
    loot = LootGenerator.generateNPCLoot(npc);
  } catch (err) {
    logger.log(`Error generating loot for ${npc.name}: ${err.message}`);
  }

  // Continue with corpse creation...
}
```

---

## Testing Strategy

### Unit Tests

**File:** `/tests/systems/corpses/corpseManagerTests.js`

```javascript
describe('CorpseManager', () => {
  test('createNPCCorpse creates corpse with correct properties', () => {
    const npc = { id: 'goblin_1', name: 'Goblin', level: 1, maxHp: 10 };
    const corpse = CorpseManager.createNPCCorpse(npc, 'room_1', world);

    expect(corpse.containerType).toBe('npc_corpse');
    expect(corpse.npcId).toBe('goblin_1');
    expect(corpse.weight).toBeGreaterThan(0);
    expect(corpse.decayTime).toBeGreaterThan(Date.now());
  });

  test('corpse weight calculated based on NPC size', () => {
    const small = { id: 'rat', size: 'small' };
    const large = { id: 'ogre', size: 'large' };

    const smallCorpse = CorpseManager.createNPCCorpse(small, 'r1', world);
    const largeCorpse = CorpseManager.createNPCCorpse(large, 'r1', world);

    expect(smallCorpse.weight).toBe(50);
    expect(largeCorpse.weight).toBe(200);
  });
});
```

### Integration Tests

**File:** `/tests/integration/corpseRespawnIntegrationTest.js`

```javascript
describe('Corpse and Respawn System Integration', () => {
  test('full death → corpse → loot → decay → respawn flow', async () => {
    // 1. Kill NPC
    const npc = world.getNPC('goblin_warrior');
    const encounter = new CombatEncounter([player, npc], world, allPlayers, playerDB);
    // ... kill NPC ...

    // 2. Verify corpse created
    const room = world.getRoom(player.currentRoom);
    expect(room.containers.length).toBe(1);

    // 3. Loot corpse
    const lootCmd = require('../../src/commands/containers/loot');
    lootCmd.execute(player, ['corpse'], world, allPlayers, playerDB);
    expect(player.inventory.length).toBeGreaterThan(0);

    // 4. Fast-forward decay
    CorpseDecayService.corpseTimers.get(corpse.id).decayTime = Date.now() - 1000;
    CorpseDecayService.checkDecay();

    // 5. Verify corpse removed
    expect(room.containers.length).toBe(0);

    // 6. Verify NPC respawned
    expect(room.npcs).toContain('goblin_warrior');
    expect(npc.hp).toBe(npc.maxHp);
  });

  test('corpse timers persist across server restart', async () => {
    // Create corpse
    const corpse = CorpseManager.createNPCCorpse(npc, 'room_1', world);

    // Save state
    CorpseDecayService.saveState();

    // Simulate restart
    const newService = new CorpseDecayService(world);
    newService.loadState();

    // Verify timer loaded
    expect(newService.corpseTimers.has(corpse.id)).toBe(true);
  });
});
```

### Manual Test Script

**File:** `/scripts/test_corpse_system.js`

```javascript
const net = require('net');

async function testCorpseSystem() {
  const client = net.connect(3000, 'localhost');

  // Login
  await send(client, 'testuser\n');
  await send(client, 'password\n');

  // Go to NPC room
  await send(client, 'go north\n');

  // Kill NPC
  await send(client, 'attack goblin\n');
  await waitForMatch(client, 'corpse');

  // Look for corpse
  await send(client, 'look\n');
  await waitForMatch(client, 'corpse of a goblin');

  // Loot corpse
  await send(client, 'loot corpse\n');
  await waitForMatch(client, 'You take');

  // Check inventory
  await send(client, 'inventory\n');

  // Wait 5 minutes (or adjust config for testing)
  console.log('Waiting for decay...');
  await sleep(300000);

  // Check corpse gone
  await send(client, 'look\n');
  await waitForNoMatch(client, 'corpse');

  // Check NPC respawned
  await send(client, 'look\n');
  await waitForMatch(client, 'Goblin');

  console.log('All tests passed!');
  client.end();
}
```

---

## Future Enhancements

### Enhancement 1: Player Corpses

**Complexity:** Medium
**Dependencies:** Player death system, ghost mode

**Features:**
- Corpse created on player death
- Contains equipped items + % of currency
- Longer decay time (30 min - 24 hours)
- Owner-only looting
- Corpse retrieval quest/spell

**Implementation Notes:**
- Reuse `CorpseManager` with `createPlayerCorpse()`
- Store corpse location in player DB
- Add `@retrievecorpse` command for admins

### Enhancement 2: Corpse Dragging

**Complexity:** Low
**Dependencies:** None

**Features:**
- `drag corpse <direction>` command
- Moves corpse to adjacent room
- Respawn still uses original location
- Weight affects drag success (STR check)

**Implementation:**
```javascript
// In loot.js or new drag.js
if (player.strength < 14 && corpse.weight > 100) {
  player.send('The corpse is too heavy to move!');
  return;
}

// Move corpse to new room
const newRoom = world.findExit(player.currentRoom, direction);
corpse.location.roomId = newRoom;
```

### Enhancement 3: Necromancy Interactions

**Complexity:** High
**Dependencies:** Magic system, spell system

**Features:**
- `animate corpse` spell - Raises NPC as skeleton
- `speak with dead` spell - Get info from corpse
- `preserve corpse` spell - Extends decay time
- Corpses can be spell reagents

**Implementation:**
- Add `corpse.isUndead` flag
- Prevent decay if animated
- Add spell target validation for corpses

### Enhancement 4: Advanced Loot Rules

**Complexity:** Medium
**Dependencies:** Party/group system

**Features:**
- Loot rights based on combat participation
- Round-robin looting
- Need/greed roll system
- Auto-loot settings

**Implementation:**
- Track damage dealers in combat
- Add `corpse.lootRights = [player1, player2]`
- Restrict looting to authorized players

### Enhancement 5: Corpse Desecration

**Complexity:** Low
**Dependencies:** None

**Features:**
- `desecrate corpse` command for evil characters
- Prevents NPC respawn
- Alignment/reputation penalty
- Religious faction impact

**Implementation:**
- Add `corpse.isDesecrated` flag
- Skip respawn if desecrated
- Fire event for reputation system

---

## Appendix A: File Structure

```
/src
  /systems
    /corpses
      CorpseManager.js           // Corpse creation/management
      CorpseDecayService.js      // Timer tracking and decay
  /commands
    /containers
      loot.js                    // Loot corpse command
  /config
    itemsConfig.js               // Add corpses config section
  respawnService.js              // Update to use decay triggers

/data
  corpse_timers.json             // Persistence file

/tests
  /systems
    /corpses
      corpseManagerTests.js
      corpseDecayServiceTests.js
  /integration
    corpseRespawnIntegrationTest.js

/scripts
  test_corpse_system.js
```

## Appendix B: Configuration Reference

```javascript
// /src/config/itemsConfig.js
module.exports = {
  // ... existing config ...

  corpses: {
    // NPC corpse settings
    npc: {
      decayTime: 300000,        // 5 minutes in milliseconds
      weight: 100,              // Base weight in pounds
      capacity: 20,             // Item slots
      showInRoom: true,         // Display in room description
      allowFreeForAll: true     // Anyone can loot
    },

    // Player corpse settings (future)
    player: {
      decayTime: 1800000,       // 30 minutes
      weight: 100,
      capacity: Infinity,       // No limit
      currencyLossPercent: 0.10, // 10% currency lost
      itemsDropped: 'equipped', // 'all', 'equipped', 'random'
      allowOthersToLoot: false, // Owner-only
      persistAcrossRestart: true
    },

    // Weight by creature size
    sizeWeights: {
      tiny: 10,
      small: 50,
      medium: 100,
      large: 200,
      huge: 500,
      gargantuan: 1000
    },

    // Decay service settings
    decay: {
      checkInterval: 10000,     // Check every 10 seconds
      maxDecayTime: 86400000,   // 24 hours max (safety cap)
      persistenceEnabled: true,
      persistenceFile: './data/corpse_timers.json'
    }
  }
};
```

---

## Conclusion

This implementation plan provides a complete, production-ready architecture for the corpse and respawn system. The phased approach allows for incremental development and testing while maintaining system stability.

**Key Strengths:**
- Extends existing systems without major refactoring
- Persistence-ready from day one
- Clear separation of concerns
- Well-defined integration points
- Comprehensive testing strategy

**Next Steps:**
1. Review this document with project stakeholders
2. Begin Phase 1 implementation
3. Test each phase before proceeding
4. Request code review after Phase 3 and Phase 6

**Estimated Total Time:** 12 hours across 6 phases

---

**Document Version:** 1.0
**Last Updated:** 2025-11-08
**Status:** Ready for Implementation
