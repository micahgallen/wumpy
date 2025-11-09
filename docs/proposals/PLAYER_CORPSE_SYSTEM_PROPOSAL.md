# Player Corpse System - Architectural Proposal

**Version:** 1.0
**Date:** 2025-11-09
**Status:** Draft for Review

---

## Executive Summary

This proposal outlines an extension to the existing NPC corpse system to support player corpses with fundamentally different behavior. While NPC corpses decay after 5 minutes and trigger respawn, player corpses must persist indefinitely until looted by the original owner, contain the player's actual inventory (not random loot), and integrate with the existing ghost system.

---

## 1. Core Design Differences

### NPC Corpses (Current System)
- **Decay**: Time-based (5 minutes)
- **Contents**: Randomly generated loot + currency
- **Cleanup**: Automatic decay triggers NPC respawn
- **Ownership**: None (anyone can loot)
- **Persistence**: Saved/restored across restarts with decay timers

### Player Corpses (Proposed)
- **Decay**: Ownership-based (persists until player loots it)
- **Contents**: Player's actual inventory + currency at time of death
- **Cleanup**: Manual removal after player loots OR admin cleanup for abandoned corpses
- **Ownership**: Locked to original player (only they can loot)
- **Persistence**: Must survive server restarts and player logouts
- **No Respawn**: Player corpses are disconnected from RespawnManager entirely

---

## 2. Data Structure Design

### Shared Properties (Both Corpse Types)
Both NPC and player corpses share the base container structure:

```javascript
{
  id: string,                    // Unique corpse ID
  instanceId: string,            // Same as id
  name: string,                  // "corpse of [Name]"
  description: string,           // Death description
  keywords: Array<string>,       // ['corpse', 'body', ...]
  itemType: ItemType.CONTAINER,
  containerType: string,         // 'npc_corpse' or 'player_corpse'
  isPickupable: boolean,
  weight: number,
  capacity: number,
  inventory: Array<Item>,        // Contents
  isOpen: boolean,
  isLocked: boolean,
  createdAt: timestamp,
  killerName: string             // Who killed them
}
```

### Player-Specific Properties
```javascript
{
  containerType: 'player_corpse',

  // Ownership and retrieval
  ownerUsername: string,          // REQUIRED: Player who died

  // Location tracking
  roomId: string,                 // Current room (can change if picked up)
  deathLocation: string,          // Original death location (for recovery)

  // Player state at death
  playerLevel: number,            // Level when died (for display)
  currency: object,               // Actual currency from player.currency

  // Lifecycle management
  isLooted: boolean,              // Has owner retrieved items?
  lootedAt: timestamp | null,     // When was it looted?

  // NO decayTime property
  // NO npcId property
  // NO spawnLocation property
}
```

### NPC-Specific Properties (Current)
```javascript
{
  containerType: 'npc_corpse',
  npcId: string,
  npcType: string,
  spawnLocation: string,
  decayTime: timestamp
}
```

---

## 3. Code Architecture

### 3.1 CorpseManager Extension

**Current Structure:**
```
CorpseManager
├─ createNPCCorpse(npc, roomId, killerName, world)
├─ onCorpseDecay(corpseId, world)
├─ hasActiveCorpse(npcId)
├─ exportState() / restoreState()
└─ Internal maps: corpses, npcCorpseMap
```

**Proposed Structure:**
```
CorpseManager
├─ NPC Methods (existing)
│   ├─ createNPCCorpse(npc, roomId, killerName, world)
│   ├─ onCorpseDecay(corpseId, world)
│   └─ hasActiveCorpse(npcId)
│
├─ Player Methods (new)
│   ├─ createPlayerCorpse(player, roomId, killer, world)
│   ├─ canLootPlayerCorpse(corpse, player)
│   ├─ markCorpseAsLooted(corpseId, player)
│   └─ cleanupLootedCorpses()
│
├─ Shared Methods (enhanced)
│   ├─ getCorpse(corpseId)
│   ├─ getCorpseByPlayer(username) → NEW
│   ├─ destroyCorpse(corpseId, world)
│   └─ removeCorpseFromRoom(corpseId, roomId, world)
│
└─ Storage (enhanced)
    ├─ corpses: Map<corpseId, corpse>
    ├─ npcCorpseMap: Map<npcId, corpseId>
    └─ playerCorpseMap: Map<username, corpseId> → NEW
```

### 3.2 New Method Specifications

#### `createPlayerCorpse(player, roomId, killer, world)`
```javascript
/**
 * Create a corpse from a dead player
 * @param {object} player - Player object who died
 * @param {string} roomId - Room where player died
 * @param {object} killer - NPC or Player who killed them (optional)
 * @param {object} world - World instance
 * @returns {object} Created player corpse container
 */
createPlayerCorpse(player, roomId, killer, world) {
  // 1. Generate unique corpse ID: corpse_player_USERNAME_TIMESTAMP
  // 2. Create corpse container with containerType: 'player_corpse'
  // 3. Transfer ALL items from player.inventory to corpse.inventory
  // 4. Transfer player.currency to corpse.currency
  // 5. Clear player.inventory = []
  // 6. Clear player.currency = CurrencyManager.createWallet()
  // 7. Set ownerUsername, roomId, deathLocation
  // 8. Add to room.items
  // 9. Store in corpses map and playerCorpseMap
  // 10. NO timer scheduling (no decay)
  // 11. Return corpse object
}
```

#### `canLootPlayerCorpse(corpse, player)`
```javascript
/**
 * Check if a player can loot a player corpse
 * @param {object} corpse - Player corpse object
 * @param {object} player - Player attempting to loot
 * @returns {boolean} True if player owns this corpse
 */
canLootPlayerCorpse(corpse, player) {
  if (corpse.containerType !== 'player_corpse') return false;
  if (corpse.isLooted) return false;
  return corpse.ownerUsername === player.username;
}
```

#### `markCorpseAsLooted(corpseId, player)`
```javascript
/**
 * Mark a player corpse as looted (owner retrieved items)
 * @param {string} corpseId - Corpse ID
 * @param {object} player - Player who looted it
 * @returns {boolean} True if marked successfully
 */
markCorpseAsLooted(corpseId, player) {
  // 1. Get corpse, verify ownership
  // 2. Set corpse.isLooted = true
  // 3. Set corpse.lootedAt = Date.now()
  // 4. Keep corpse in world for a grace period (empty container)
  // 5. Schedule cleanup timer (e.g., 30 seconds after looting)
  // 6. Return success
}
```

### 3.3 Integration Points

#### Combat System (CombatEncounter.js)
**Current NPC Death Flow:**
```javascript
// Line 226 in CombatEncounter.js
const corpse = CorpseManager.createNPCCorpse(npc, this.roomId, killerName, this.world);
```

**New Player Death Flow:**
```javascript
// Around line 124 in CombatEncounter.js (player death handler)
if (target.socket && target.username) {
  // Set ghost status (already implemented)
  target.isGhost = true;
  this.playerDB.updatePlayerGhostStatus(target.username, true);

  // NEW: Create player corpse
  const corpse = CorpseManager.createPlayerCorpse(
    target,
    this.roomId,
    attacker,
    this.world
  );

  if (corpse) {
    target.send(colors.info(`\nYour belongings have fallen into your corpse.`));
    target.send(colors.hint(`Return here after revival to recover your items.\n`));
  }

  // Send death messages (already implemented)
  target.send('\n' + colors.error('======================================'));
  // ... rest of death messages
}
```

#### Ghost Revival System (Future Integration)
When player is revived (hospital/spell):
```javascript
function revivePlayer(player) {
  // 1. Set player.isGhost = false
  // 2. Restore HP to some percentage
  // 3. Check for player corpse
  const corpse = CorpseManager.getCorpseByPlayer(player.username);
  if (corpse) {
    player.send(colors.warning(`\nYou have a corpse waiting at: ${corpse.deathLocation}`));
    player.send(colors.hint(`Return there to recover your items.\n`));
  }
}
```

#### Looting Commands (get/loot)
Existing looting commands must check corpse ownership:
```javascript
// In get command when looting from corpse
if (container.containerType === 'player_corpse') {
  if (!CorpseManager.canLootPlayerCorpse(container, player)) {
    return player.send(colors.error("This is someone else's corpse. You cannot loot it.\n"));
  }
  // After successful looting of all items
  if (container.inventory.length === 0) {
    CorpseManager.markCorpseAsLooted(container.id, player);
  }
}
```

---

## 4. Persistence Strategy

### 4.1 Corpse Persistence
Player corpses must be saved alongside NPC corpses but with different restoration logic:

**Export State (Enhanced):**
```javascript
exportState() {
  const state = {
    npcCorpses: [],
    playerCorpses: []  // NEW
  };

  for (const corpse of this.corpses.values()) {
    if (corpse.containerType === 'npc_corpse') {
      state.npcCorpses.push({/* existing NPC fields */});
    } else if (corpse.containerType === 'player_corpse') {
      state.playerCorpses.push({
        id: corpse.id,
        ownerUsername: corpse.ownerUsername,
        roomId: corpse.roomId,
        deathLocation: corpse.deathLocation,
        playerLevel: corpse.playerLevel,
        inventory: corpse.inventory,
        currency: corpse.currency,
        isLooted: corpse.isLooted,
        lootedAt: corpse.lootedAt,
        createdAt: corpse.createdAt,
        killerName: corpse.killerName,
        // All container properties...
      });
    }
  }
  return state;
}
```

**Restore State (Enhanced):**
```javascript
restoreState(state, world) {
  // Restore NPC corpses (existing logic with timers)
  for (const npcCorpse of state.npcCorpses || []) {
    // Existing logic...
  }

  // Restore player corpses (NO timers)
  for (const playerCorpse of state.playerCorpses || []) {
    // If corpse was looted and grace period expired, skip it
    if (playerCorpse.isLooted &&
        (Date.now() - playerCorpse.lootedAt > 300000)) { // 5 min grace
      continue;
    }

    // Recreate corpse in memory
    this.corpses.set(playerCorpse.id, playerCorpse);
    this.playerCorpseMap.set(playerCorpse.ownerUsername, playerCorpse.id);

    // Add back to room
    this.addCorpseToRoom(playerCorpse, playerCorpse.roomId, world);

    // If looted, schedule cleanup timer
    if (playerCorpse.isLooted) {
      const remaining = 300000 - (Date.now() - playerCorpse.lootedAt);
      if (remaining > 0) {
        TimerManager.schedule(
          `player_corpse_cleanup_${playerCorpse.id}`,
          remaining,
          (data) => this.destroyCorpse(data.corpseId, world),
          { type: 'player_corpse_cleanup', corpseId: playerCorpse.id }
        );
      }
    }
  }
}
```

### 4.2 Player Inventory Concerns
**IMPORTANT:** Player corpses contain actual Item instances from the player's inventory. These must be properly serialized/deserialized.

The existing `InventorySerializer` system should handle this automatically since corpse.inventory is an array of Item instances, but we should verify:
- Items with durability are properly saved
- Currency is correctly transferred
- Stackable items maintain quantity
- Equipped items are transferred (or handled separately)

---

## 5. Edge Cases & Solutions

### 5.1 Player Dies Multiple Times
**Problem:** What if a player dies again before retrieving their first corpse?

**Solution:** Allow multiple player corpses per player:
```javascript
// Change playerCorpseMap to support multiple corpses
playerCorpseMap: Map<username, Set<corpseId>>

getCorpsesByPlayer(username) {
  const corpseIds = this.playerCorpseMap.get(username) || new Set();
  return Array.from(corpseIds).map(id => this.corpses.get(id));
}
```

When player revives, list all their corpses:
```
You have died 3 times. Your corpses are located at:
  1. Arena Main (5 items, 234 gold)
  2. Dark Forest (12 items, 50 gold)
  3. Dragon's Lair (0 items - already looted)
```

### 5.2 Corpse Location Tracking
**Problem:** If corpse is picked up by another player (or admin), how does owner find it?

**Solution 1 (Simple):** Make player corpses non-pickupable
```javascript
isPickupable: false  // Only for player corpses
```

**Solution 2 (Complex):** Track corpse movement with notifications
```javascript
// When corpse moved
if (corpse.containerType === 'player_corpse') {
  corpse.lastMovedBy = moverName;
  corpse.lastMovedAt = Date.now();
  // Send notification to owner if online
}
```

**Recommendation:** Solution 1 (non-pickupable) for initial implementation.

### 5.3 Abandoned Corpses (Player Never Returns)
**Problem:** Player dies, quits the game, never retrieves corpse. Memory leak?

**Solution:** Implement corpse expiration based on player activity:
```javascript
// In cleanup routine (runs daily or on server restart)
cleanupAbandonedCorpses() {
  const ABANDONMENT_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days

  for (const corpse of this.corpses.values()) {
    if (corpse.containerType !== 'player_corpse') continue;
    if (corpse.isLooted) continue; // Already handled

    const age = Date.now() - corpse.createdAt;
    if (age > ABANDONMENT_THRESHOLD) {
      // Check if player has logged in recently
      const player = PlayerDB.getPlayer(corpse.ownerUsername);
      if (!player || (Date.now() - player.lastLogin > ABANDONMENT_THRESHOLD)) {
        logger.log(`Cleaning up abandoned corpse for ${corpse.ownerUsername}`);
        this.destroyCorpse(corpse.id, world);
      }
    }
  }
}
```

### 5.4 Corpse Looting Prevention
**Problem:** Can other players steal from corpses?

**Solution:** Enforce ownership in looting commands (see Section 3.3).

**Alternative:** PvP servers could make looting optional:
```javascript
// In itemsConfig.js
corpses: {
  player: {
    allowPvPLooting: false,  // Only owner can loot
    lootableAfterDuration: null  // Or: 3600000 (1 hour)
  }
}
```

### 5.5 Equipped Items vs Inventory
**Problem:** Should equipped items drop into corpse?

**Options:**
1. **Everything drops:** All inventory AND all equipped items → corpse
2. **Only inventory drops:** Equipped items stay equipped (damaged by death durability loss)
3. **Hybrid:** Inventory drops, equipped items stay but take durability hit

**Recommendation:** Option 2 (only inventory drops) because:
- Equipped items already have death penalty (durability loss)
- DeathHandler.handlePlayerDeath() already implemented
- Players keep their gear but need to repair it
- Simpler implementation

**Implementation:**
```javascript
createPlayerCorpse(player, roomId, killer, world) {
  // Transfer only UNEQUIPPED items
  const unequippedItems = player.inventory.filter(item => {
    return !EquipmentManager.isEquipped(player, item.instanceId);
  });

  corpse.inventory = unequippedItems;

  // Remove transferred items from player
  player.inventory = player.inventory.filter(item => {
    return EquipmentManager.isEquipped(player, item.instanceId);
  });

  // Currency always drops
  corpse.currency = player.currency;
  player.currency = CurrencyManager.createWallet();
}
```

### 5.6 Ghost Player Interactions
**Problem:** Can ghost players pick up their corpse while dead?

**Solution:** No. Player must be revived first.
```javascript
// In get/loot command
if (player.isGhost) {
  return player.send(colors.error("You must be revived before you can interact with your corpse.\n"));
}
```

---

## 6. Configuration

Add player corpse configuration to `/src/config/itemsConfig.js`:

```javascript
corpses: {
  npc: {
    decayTime: 300000,        // 5 minutes
    baseWeight: 100,
    capacity: 20,
    isPickupable: true
  },
  player: {
    // NEW SECTION
    baseWeight: 150,          // Players heavier than NPCs
    capacity: 100,            // Large capacity (player's full inventory)
    isPickupable: false,      // Cannot be picked up
    allowPvPLooting: false,   // Only owner can loot
    lootedGracePeriod: 300000,  // 5 minutes before cleanup after looting
    abandonmentThreshold: 604800000  // 7 days (cleanup if player inactive)
  },
  sizeWeights: {
    // ... existing
  }
}
```

---

## 7. Implementation Plan

### Phase 1: Core Player Corpse Creation
1. Add player corpse properties to CorpseManager
2. Implement `createPlayerCorpse()` method
3. Add `playerCorpseMap` storage
4. Integrate with CombatEncounter death handler
5. Test basic corpse creation on player death

### Phase 2: Ownership & Looting
1. Implement `canLootPlayerCorpse()` check
2. Modify looting commands (get/loot) to enforce ownership
3. Implement `markCorpseAsLooted()` method
4. Add cleanup timer for looted corpses
5. Test looting workflow

### Phase 3: Persistence
1. Enhance `exportState()` to handle player corpses
2. Enhance `restoreState()` to recreate player corpses
3. Test server restart with active player corpses
4. Verify inventory/currency preservation

### Phase 4: Edge Cases & Polish
1. Support multiple corpses per player
2. Implement abandoned corpse cleanup
3. Add player notifications (corpse location on revival)
4. Add admin commands for corpse management
5. Comprehensive integration testing

### Phase 5: Documentation & Demo
1. Update NPC_CORPSE_QUICK_GUIDE.md to include player corpses
2. Create PLAYER_CORPSE_GUIDE.md for players
3. Create demo/test scenarios
4. Update system architecture diagrams

---

## 8. Testing Strategy

### Unit Tests
- `createPlayerCorpse()` creates valid corpse with all properties
- `canLootPlayerCorpse()` enforces ownership correctly
- `markCorpseAsLooted()` marks and schedules cleanup
- Multiple corpses per player stored correctly
- Persistence exports/restores player corpses

### Integration Tests
- Player dies → corpse created with all inventory/currency
- Player loots own corpse → items transferred back
- Other players cannot loot player corpses
- Server restart preserves player corpses
- Abandoned corpse cleanup works after threshold

### Manual Tests
- Kill player in combat
- Verify inventory/currency in corpse
- Revive player at hospital
- Return to corpse and loot
- Verify items restored to player

---

## 9. Open Questions

1. **PvP Considerations:** Should player corpses be lootable by killers in PvP zones?
   - Recommendation: Add configuration flag, default to false

2. **Corpse Decay Visual:** Should player corpses show decay states like NPC corpses?
   - Recommendation: No, since they don't decay

3. **Recovery Assistance:** Should there be a command to locate your corpses?
   - Recommendation: Yes, add `/corpses` or `/locate corpse` command

4. **Death Count:** Should we track how many times a player has died?
   - Recommendation: Yes, useful for achievements/statistics

5. **Equipment Dropping:** Final decision on equipped items?
   - Recommendation: Only inventory drops (see 5.5)

---

## 10. Summary

This proposal extends the existing NPC corpse system with a parallel player corpse system that:

- **Reuses** the container infrastructure and room management
- **Diverges** on decay/cleanup behavior (ownership-based vs time-based)
- **Integrates** with ghost system, combat, and looting commands
- **Persists** across server restarts with proper serialization
- **Handles** edge cases like multiple deaths and abandoned corpses

The architecture maintains clean separation between NPC and player corpse logic while sharing core container functionality, making it maintainable and extensible.

---

## Files to Modify

### Core System Files
- `/src/systems/corpses/CorpseManager.js` - Add player corpse methods
- `/src/config/itemsConfig.js` - Add player corpse configuration

### Integration Points
- `/src/combat/CombatEncounter.js` - Call createPlayerCorpse on player death
- `/src/commands/core/get.js` - Enforce ownership checks
- `/src/commands/core/loot.js` - Enforce ownership checks (if exists)

### New Files (Optional)
- `/src/commands/player/corpses.js` - List player's corpses
- `/src/commands/player/locate.js` - Locate corpse command

### Documentation
- `/docs/quick-guides/PLAYER_CORPSE_GUIDE.md` - Player-facing guide
- `/docs/quick-guides/NPC_CORPSE_QUICK_GUIDE.md` - Update to mention player corpses

### Tests
- `/tests/playerCorpseTests.js` - Unit tests
- `/tests/playerCorpseIntegrationTest.js` - Integration tests
- `/tests/playerCorpseDemo.js` - Manual demo

---

**End of Proposal**
