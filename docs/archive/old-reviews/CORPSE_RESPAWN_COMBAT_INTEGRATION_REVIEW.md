# Corpse and Respawn System - Combat Integration Review

**Reviewer:** Combat Systems Architect
**Date:** 2025-11-08
**Status:** Design Review Complete - Ready for Implementation
**Related Docs:**
- `/docs/systems/containers/CORPSE_CONTAINER_SPEC.md`
- `/docs/systems/combat/COMBAT_XP_ARCHITECTURE.md`
- `/src/combat/CombatEncounter.js`
- `/src/respawnService.js`
- `/src/systems/loot/LootGenerator.js`

---

## Executive Summary

The corpse and respawn system requires tight integration with the existing combat system. This review identifies all integration points, analyzes combat-specific balance considerations, documents edge cases, and specifies testing requirements from a combat mechanics perspective.

**Key Findings:**
1. Current NPC death handling is **ready for corpse integration** - clean separation exists
2. **LootGenerator system is fully implemented** and ready to use
3. **Respawn service exists** but needs corpse decay hooks
4. **No container system exists yet** - this is the main implementation gap
5. Combat state cleanup is handled correctly, but needs corpse awareness

---

## 1. Current Combat System Analysis

### 1.1 NPC Death Flow (As Implemented)

**File:** `/src/combat/CombatEncounter.js`

Current death handling when NPC HP reaches 0:

```javascript
// Line 77-90: Death during flee opportunity attack
if (damageResult.dead) {
    const deathMessage = getDeathMessage(attacker);
    this.broadcast(deathMessage);
    this.broadcast(`${attacker.name} dies while trying to flee!`);

    // Award XP and remove dead NPC
    if (player.socket && player.username) {
        const xp = calculateCombatXP(attacker, player.level);
        awardXP(player, xp, 'combat', this.playerDB);
    }
    this.removeNPCFromRoom(attacker);  // <-- INTEGRATION POINT
    this.endCombat(true);
    return;
}

// Line 118-136: Normal combat death
if (damageResult.dead) {
    const deathMessage = getDeathMessage(target);
    this.broadcast(deathMessage);

    if (target.socket && target.username) {
        // Player death handling (ghost state)
        target.isGhost = true;
        // ... ghost state setup
    }

    this.endCombat();  // <-- Calls removeNPCFromRoom for NPC deaths
    return;
}

// Line 178-196: endCombat() method
endCombat(skipXpAward = false) {
    this.isActive = false;

    const winner = this.participants.find(p => !p.isDead());
    const loser = this.participants.find(p => p.isDead());

    // Award XP if player won against NPC
    if (winner && loser && winner.socket && !loser.socket && !skipXpAward) {
        const xp = calculateCombatXP(loser, winner.level);
        awardXP(winner, xp, 'combat', this.playerDB);

        // Remove dead NPC from room so it can respawn properly
        this.removeNPCFromRoom(loser);  // <-- INTEGRATION POINT
    } else if (loser && !loser.socket && skipXpAward) {
        // XP already awarded, just remove NPC
        this.removeNPCFromRoom(loser);  // <-- INTEGRATION POINT
    }

    this.broadcast(colors.combat('Combat has ended!'));
}
```

**Analysis:**
- ✅ Clean death detection via `damageResult.dead`
- ✅ Proper XP award before removal
- ✅ Centralized removal via `removeNPCFromRoom()`
- ✅ Correct handling of double-death edge case (flee vs normal)
- ✅ Player death already handled separately (ghost state)

### 1.2 removeNPCFromRoom() Implementation

**File:** `/src/combat/CombatEncounter.js` (Lines 203-219)

```javascript
removeNPCFromRoom(npc) {
    if (!npc || npc.socket) return; // Only remove NPCs, not players

    const room = this.world.getRoom(this.roomId);
    if (room && room.npcs) {
        // Find the NPC ID in the room
        const npcId = Object.keys(this.world.npcs).find(id => this.world.npcs[id] === npc);

        if (npcId) {
            const index = room.npcs.indexOf(npcId);
            if (index > -1) {
                room.npcs.splice(index, 1);
                logger.log(`Removed NPC ${npc.name} (${npcId}) from room ${room.id}`);
            }
        }
    }
}
```

**Critical Observations:**
1. This is the **PERFECT integration point** for corpse creation
2. We have access to:
   - `npc` - the dead NPC object with all stats
   - `this.roomId` - where the corpse should spawn
   - `room` - the room object for adding corpse container
   - `npcId` - unique identifier for respawn tracking

**Recommended Modification:**
```javascript
removeNPCFromRoom(npc) {
    if (!npc || npc.socket) return;

    const room = this.world.getRoom(this.roomId);
    if (room && room.npcs) {
        const npcId = Object.keys(this.world.npcs).find(id => this.world.npcs[id] === npc);

        if (npcId) {
            const index = room.npcs.indexOf(npcId);
            if (index > -1) {
                room.npcs.splice(index, 1);
                logger.log(`Removed NPC ${npc.name} (${npcId}) from room ${room.id}`);

                // NEW: Create corpse container with loot
                this.createNPCCorpse(npc, npcId, room);
            }
        }
    }
}
```

---

## 2. Loot Generation Integration

### 2.1 LootGenerator Analysis

**File:** `/src/systems/loot/LootGenerator.js`

The `LootGenerator.generateNPCLoot(npc)` method (lines 276-316) is **fully implemented** and ready to use:

```javascript
static generateNPCLoot(npc) {
    const level = npc.level || 1;
    const lootTables = npc.lootTables || ['common_loot', 'trash_loot'];
    const spawnTags = npc.spawnTags || null;

    // Boss NPCs get better loot
    const isBoss = npc.isBoss || false;
    const itemCount = isBoss
        ? config.spawn.generation.defaultItemCount + 2
        : config.spawn.generation.defaultItemCount;

    const items = this.generateLoot({
        lootTables,
        spawnTags,
        level,
        itemCount,
        includeCurrency: false
    });

    // Generate currency based on NPC challenge rating
    const challengeRating = npc.challengeRating || npc.cr || level;
    const currencyAmount = isBoss
        ? this.generateBossCurrency()
        : this.generateCurrency(challengeRating);

    // Convert currency to items
    const CurrencyManager = require('../economy/CurrencyManager');
    const currencyItems = CurrencyManager.createCurrencyItems(currencyAmount);

    const allItems = [...items, ...currencyItems];

    return {
        items: allItems,
        currency: currencyAmount
    };
}
```

**Integration Notes:**
- ✅ Respects NPC level for item gating
- ✅ Uses `lootTables` array from NPC definition
- ✅ Generates currency based on challenge rating
- ✅ Returns item instances ready for inventory
- ✅ Boss detection for enhanced loot
- ⚠️ **Requires NPC to have `lootTables` property** - need to add to NPC schema

### 2.2 NPC Loot Configuration Requirements

Current NPC structure (from `/world/sesame_street/npcs/red_wumpy.js`):

```json
{
  "id": "red_wumpy",
  "name": "Red Wumpy",
  "level": 1,
  "hp": 20,
  // ... other properties
}
```

**Required additions for loot system:**
```json
{
  "id": "red_wumpy",
  "name": "Red Wumpy",
  "level": 1,
  "hp": 20,
  "challengeRating": 1,              // For currency drops
  "lootTables": ["trash_loot"],      // For item drops
  "spawnTags": ["common", "wumpy"],  // Optional tag filtering
  "isBoss": false                     // Boss flag for enhanced loot
}
```

---

## 3. Respawn System Integration

### 3.1 Current Respawn Service

**File:** `/src/respawnService.js`

```javascript
checkAndRespawn() {
    console.log('Checking for missing NPCs to respawn...');
    for (const roomId in this.world.rooms) {
        const currentRoom = this.world.rooms[roomId];
        const initialRoom = this.world.initialRoomsState[roomId];

        if (!initialRoom || !initialRoom.npcs) continue;

        // Identify missing NPCs
        const missingNpcIds = initialRoom.npcs.filter(
            initialNpcId => !currentRoom.npcs.includes(initialNpcId)
        );

        if (missingNpcIds.length > 0) {
            console.log(`Respawning NPCs in room ${roomId}: ${missingNpcIds.join(', ')}`);
            for (const npcId of missingNpcIds) {
                currentRoom.npcs.push(npcId);

                // Reset NPC HP when respawning
                const npc = this.world.getNPC(npcId);
                if (npc) {
                    npc.hp = npc.maxHp;
                    console.log(`Reset HP for ${npc.name} (${npcId}): ${npc.hp}/${npc.maxHp}`);
                }
            }
        }
    }
}
```

**Integration Requirements:**

The respawn service needs to be **corpse-aware**:

1. **Don't respawn while corpse exists** - corpse decay should trigger respawn
2. **Track corpse → NPC mapping** - need bidirectional link
3. **Notify players of respawn** - currently TODO (line 54)

**Proposed Architecture:**

```javascript
// Corpse should store original NPC ID for respawn linkage
const corpse = {
    id: 'corpse_123',
    npcId: 'red_wumpy_1',  // NEW: Link back to NPC
    npcDefinitionId: 'red_wumpy',  // NEW: For respawn data
    roomId: 'sesame_street_plaza',
    inventory: [...],
    decayTime: Date.now() + 300000,
    // ... other properties
};

// Modified respawn check
checkAndRespawn() {
    for (const roomId in this.world.rooms) {
        const currentRoom = this.world.rooms[roomId];
        const initialRoom = this.world.initialRoomsState[roomId];

        if (!initialRoom || !initialRoom.npcs) continue;

        const missingNpcIds = initialRoom.npcs.filter(
            initialNpcId => {
                // Check if NPC is missing from room
                const inRoom = currentRoom.npcs.includes(initialNpcId);
                if (inRoom) return false;

                // NEW: Check if corpse still exists for this NPC
                const hasCorpse = this.hasActiveCorpse(initialNpcId, roomId);
                return !hasCorpse;  // Only respawn if no corpse
            }
        );

        // ... respawn logic
    }
}

hasActiveCorpse(npcId, roomId) {
    // Check if any corpse in the room belongs to this NPC
    const room = this.world.getRoom(roomId);
    if (!room.corpses) return false;

    return room.corpses.some(corpse =>
        corpse.npcId === npcId && corpse.decayTime > Date.now()
    );
}
```

---

## 4. Container System (NEW IMPLEMENTATION REQUIRED)

### 4.1 Gap Analysis

**Status:** No container system currently exists in the codebase.

**Required Components:**

1. **Container Base Class** (`/src/systems/containers/Container.js`)
   - Base properties: id, name, capacity, inventory
   - Methods: addItem(), removeItem(), isEmpty(), isFull()
   - Weight calculation for encumbrance

2. **Corpse Container Subclass** (`/src/systems/containers/CorpseContainer.js`)
   - Extends Container
   - Additional properties: npcId, decayTime, isOpen
   - Decay timer management
   - Link to respawn system

3. **ContainerManager** (`/src/systems/containers/ContainerManager.js`)
   - Factory for creating containers
   - Global container registry
   - Decay processing loop
   - Persistence (save/load)

### 4.2 Recommended Implementation Order

**Phase 1: Base Container System**
1. Implement `Container` base class
2. Implement `ContainerManager` singleton
3. Add container support to room data structure
4. Implement `examine <corpse>` command

**Phase 2: Corpse-Specific Features**
1. Implement `CorpseContainer` subclass
2. Add decay timer system
3. Integrate with combat death (modify `removeNPCFromRoom`)
4. Implement `loot <corpse>` command

**Phase 3: Respawn Integration**
1. Modify respawn service to check for corpses
2. Link corpse decay to NPC respawn
3. Add player notifications
4. Test full death → loot → decay → respawn cycle

---

## 5. Combat Balance Considerations

### 5.1 Respawn Timer Balancing

**Design Question:** How long should corpses last before decay triggers respawn?

**Factors to Consider:**

1. **Player Progression Pacing**
   - Too short: Players can't loot in group scenarios
   - Too long: Farming becomes too easy (kill → loot → wait for respawn)

2. **Loot Economy Impact**
   - Faster respawn = more loot generation
   - Need to balance currency generation rate
   - Item flooding could devalue loot

3. **Combat Encounter Density**
   - Area population density affects pacing
   - Boss respawn should be significantly longer
   - Trash mob respawn can be faster

**Recommendations:**

| NPC Type | Corpse Decay | Respawn After Decay | Total Death → Respawn |
|----------|--------------|---------------------|----------------------|
| Trash Mob (L1-5) | 5 minutes | Immediate | 5 minutes |
| Standard Mob (L6-10) | 5 minutes | Immediate | 5 minutes |
| Elite Mob | 10 minutes | Immediate | 10 minutes |
| Boss | 30 minutes | 30 minutes | 60 minutes |

**Rationale:**
- 5 minutes gives players ample time to loot without pressure
- Prevents rapid farming (can't immediately re-kill)
- Boss timers create scarcity and value
- Immediate respawn after decay prevents "dead zones"

**Configuration:**

```javascript
// In itemsConfig.js or new corpsesConfig.js
corpses: {
    npc: {
        decayTime: {
            trash: 300000,      // 5 minutes
            standard: 300000,   // 5 minutes
            elite: 600000,      // 10 minutes
            boss: 1800000       // 30 minutes
        },
        respawnDelay: {
            trash: 0,           // Immediate
            standard: 0,        // Immediate
            elite: 0,           // Immediate
            boss: 1800000       // Additional 30 min after decay
        }
    }
}
```

### 5.2 Loot Generation Tuning

**Current LootGenerator Configuration:**

From `/src/config/itemsConfig.js`, the spawn system uses:
- `defaultItemCount`: Number of items per loot roll
- `bonusItemChance`: Chance for extra item
- `emptyLootChance`: Chance for no loot

**Recommendations for NPC Drops:**

```javascript
npcLoot: {
    trash: {
        itemCount: 1,
        bonusChance: 10,      // 10% chance for 2nd item
        emptyChance: 20       // 20% chance for no items (just currency)
    },
    standard: {
        itemCount: 2,
        bonusChance: 20,
        emptyChance: 10
    },
    elite: {
        itemCount: 3,
        bonusChance: 30,
        emptyChance: 5
    },
    boss: {
        itemCount: 5,
        bonusChance: 50,
        emptyChance: 0        // Boss always drops loot
    }
}
```

### 5.3 Currency Drop Rates

**Current Implementation:** `/src/systems/loot/LootGenerator.js` lines 235-273

```javascript
static generateCurrency(challengeRating = 1) {
    // Ranges based on CR
    cr0:  [1, 5]       // ~3 copper average
    cr1:  [5, 20]      // ~12 copper average
    cr2:  [10, 50]     // ~30 copper average
    cr3:  [25, 100]    // ~62 copper average
    cr4:  [50, 200]    // ~125 copper average
    cr5+: [100, 1000]  // ~550 copper average
}
```

**Balance Analysis:**

Assuming level progression requires ~13,000 XP to L5 (90 minutes):
- At 12 copper per kill (CR1)
- ~100 kills to L5 = 1,200 copper (12 silver)
- Is this appropriate for economy?

**Needs cross-reference with:**
- Item shop prices
- Equipment costs
- Potion prices
- Repair costs

**Recommendation:** Test with actual gameplay to validate economy balance.

---

## 6. Edge Cases and Error Handling

### 6.1 Multi-Player Combat Scenarios

**Scenario:** 2+ players kill the same NPC

**Issues:**
1. Who gets to loot the corpse?
2. How is XP distributed? (Currently: only player who lands killing blow)
3. Should corpse loot be instanced per player or shared?

**Current XP Distribution:** `/src/combat/CombatEncounter.js` line 186-187
```javascript
const xp = calculateCombatXP(loser, winner.level);
awardXP(winner, xp, 'combat', this.playerDB);
```

**Problem:** Only the "winner" (survivor in 1v1 combat) gets XP.

**Multi-Player Not Supported:** The `CombatEncounter` class only handles 2 participants (lines 15-22).

**Design Decision Required:**
- Implement group combat support first, OR
- Document corpse system as solo/1v1 only for MVP

**Recommendation:**
1. For MVP, keep 1v1 combat only
2. Corpse is free-for-all (first to loot gets items)
3. Document group combat as Phase 6 enhancement

### 6.2 Corpse Movement Edge Case

**Scenario:** Player tries to pick up and move corpse to another room

**Design Questions:**
1. Should corpses be moveable at all?
2. If yes, does it break respawn logic?
3. Weight encumbrance considerations

**From Spec:** `CORPSE_CONTAINER_SPEC.md` line 28
> "have a high weight, a normal character could carry 1 and be encumbered, a very strong character could maybe carry 2 at most."

**Respawn Concern:**
If corpse is moved, `respawnService.js` checks `currentRoom.npcs` but corpse is in different room.

**Solution:**
```javascript
// When creating corpse, store original spawn room
const corpse = {
    id: 'corpse_123',
    npcId: 'red_wumpy_1',
    originalRoomId: 'sesame_street_plaza',  // Where NPC spawned
    currentRoomId: 'sesame_street_plaza',   // Where corpse currently is
    // ...
};

// Respawn service checks original room for corpse
hasActiveCorpse(npcId, originalRoomId) {
    // Search ALL rooms for corpse with this npcId
    for (const roomId in this.world.rooms) {
        const room = this.world.rooms[roomId];
        if (room.corpses && room.corpses.some(c => c.npcId === npcId)) {
            return true;
        }
    }
    return false;
}
```

**Recommendation:**
- Allow corpse movement for MVP (adds gameplay depth)
- Implement global corpse search in respawn check
- Set corpse weight to ~150 lbs (very heavy)

### 6.3 Combat Continues After Death

**Scenario:** NPC dies but other enemies still attacking

**Current Behavior:** `endCombat()` is called immediately on NPC death (line 135)

**Analysis:**
- Combat only supports 2 participants currently
- If multi-enemy combat is added later, corpse should persist during ongoing fight
- Dead NPC is removed from combat participants

**No Issue for MVP:** 1v1 combat means death always ends combat.

**Future Consideration:** When implementing group combat, ensure:
```javascript
if (allEnemiesDead(combat)) {
    endCombat();
} else {
    removeCombatant(deadNpc);  // Keep fighting
}
```

### 6.4 Respawn While Players in Room

**Scenario:** Corpse decays and NPC respawns while players are still looting

**Current Behavior:** No check for player presence in `respawnService.js`

**Potential Issues:**
1. Immersion breaking (corpse vanishes, full-health NPC appears)
2. Accidental aggro immediately after respawn
3. Exploit: Camp spawn point, kill repeatedly

**Recommendations:**

**Option A: Delay Respawn if Players Present**
```javascript
respawnNpc(npcInstance, roomId) {
    const room = this.world.getRoom(roomId);

    // Check if any players in room
    const playersInRoom = Array.from(this.allPlayers).filter(p => p.currentRoom === roomId);

    if (playersInRoom.length > 0) {
        // Delay respawn by 1 minute
        setTimeout(() => this.respawnNpc(npcInstance, roomId), 60000);
        return;
    }

    // ... normal respawn logic
}
```

**Option B: Respawn Regardless (RAW Approach)**
- More predictable for players
- Creates tension/risk
- Prevents spawn camping (NPC comes back and attacks)

**Recommended:** Option B for MVP - respawn regardless of player presence. Adds risk/reward to looting.

### 6.5 Decay Timer Edge Cases

**Scenario 1: Server Restart During Decay**

**Issue:** Decay timers are in-memory, will reset on restart

**Solutions:**
1. Persist corpse data to disk with decay timestamp
2. On server load, check elapsed time and decay immediately if needed
3. OR: All corpses decay on server restart (simpler, acceptable for MVP)

**Recommendation:** Decay all corpses on server restart for MVP. Document as known limitation.

**Scenario 2: Player Logs Out with Corpse in Inventory**

**Issue:** If corpses are moveable, what happens to corpse in player inventory during decay?

**Solution:**
```javascript
// During decay check, scan all player inventories too
processCorpseDecay() {
    // Check rooms
    for (const roomId in this.world.rooms) {
        // ... room corpse decay
    }

    // Check player inventories
    for (const player of this.allPlayers) {
        if (player.inventory) {
            player.inventory = player.inventory.filter(item => {
                if (item.itemType === 'corpse' && item.decayTime < Date.now()) {
                    player.send('The corpse you were carrying decays!');
                    return false;  // Remove
                }
                return true;
            });
        }
    }
}
```

**Recommendation:** Implement inventory decay check if corpses are moveable.

---

## 7. Testing Requirements

### 7.1 Unit Tests

**File:** `/tests/test_corpse_system.js` (NEW)

```javascript
describe('Corpse System', () => {
    describe('Container Creation', () => {
        it('should create corpse when NPC dies');
        it('should generate loot using LootGenerator');
        it('should set decay timer correctly');
        it('should link corpse to original NPC ID');
    });

    describe('Loot Generation', () => {
        it('should respect NPC level for item gating');
        it('should use NPC lootTables property');
        it('should generate currency based on challenge rating');
        it('should give bonus loot for boss NPCs');
        it('should handle NPCs with no lootTables gracefully');
    });

    describe('Decay System', () => {
        it('should decay corpse after configured time');
        it('should trigger NPC respawn after decay');
        it('should handle corpse in player inventory');
        it('should restore decayed corpses on server restart');
    });

    describe('Respawn Integration', () => {
        it('should not respawn NPC while corpse exists');
        it('should respawn NPC immediately after corpse decay');
        it('should reset NPC HP and stats on respawn');
        it('should place NPC at original spawn location');
        it('should notify players in room of respawn');
    });
});
```

### 7.2 Integration Tests

**File:** `/tests/test_corpse_combat_integration.js` (NEW)

```javascript
describe('Corpse + Combat Integration', () => {
    it('should create corpse when NPC defeated in combat');
    it('should award XP before creating corpse');
    it('should remove NPC from room after death');
    it('should allow looting corpse items');
    it('should decay corpse after timer expires');
    it('should respawn NPC after corpse decays');

    describe('Edge Cases', () => {
        it('should handle NPC death during flee attempt');
        it('should handle NPC death during off-hand attack');
        it('should prevent duplicate corpses for same NPC');
        it('should handle corpse movement between rooms');
        it('should respawn even if players in room');
    });
});
```

### 7.3 Combat Balance Tests

**File:** `/tests/test_corpse_balance.js` (NEW)

```javascript
describe('Corpse System Balance', () => {
    it('should generate appropriate loot for NPC level');
    it('should generate currency within expected ranges');
    it('should respect respawn timer durations');
    it('should prevent rapid farming exploits');
    it('should balance boss loot vs trash loot');

    describe('Economy Impact', () => {
        it('should track total currency generation rate');
        it('should track item drop frequency by rarity');
        it('should validate against economy balance targets');
    });
});
```

### 7.4 Manual Test Scenarios

**Test Case 1: Basic Death → Loot → Respawn**
```
1. Player attacks Red Wumpy
2. Defeat Red Wumpy
3. Verify corpse appears in room
4. Examine corpse (should show loot)
5. Loot corpse (items go to inventory)
6. Wait 5 minutes (or adjust timer for testing)
7. Verify corpse decays
8. Verify Red Wumpy respawns at full HP
```

**Test Case 2: Multiple NPCs in Same Room**
```
1. Kill multiple NPCs in one room
2. Verify each creates separate corpse
3. Verify corpses have unique IDs
4. Loot all corpses
5. Wait for decay
6. Verify all NPCs respawn correctly
```

**Test Case 3: Corpse Movement**
```
1. Kill NPC in Room A
2. Pick up corpse
3. Move to Room B
4. Drop corpse
5. Wait for decay
6. Verify NPC respawns in Room A (original spawn)
```

**Test Case 4: Boss Loot**
```
1. Kill boss-tier NPC
2. Verify enhanced loot (more items, better quality)
3. Verify longer decay timer
4. Verify longer respawn delay after decay
```

---

## 8. Implementation Plan

### Phase 1: Container Foundation (2-3 hours)

**Files to Create:**
- `/src/systems/containers/Container.js` - Base container class
- `/src/systems/containers/ContainerManager.js` - Global manager
- `/src/systems/containers/CorpseContainer.js` - Corpse-specific subclass

**Files to Modify:**
- `/src/world.js` - Add `room.corpses = []` initialization
- `/src/commands/core/examine.js` - Add corpse examination support

**Deliverables:**
- Working container system with basic add/remove item
- Corpse containers with decay timer
- Ability to examine corpses in room

### Phase 2: Combat Integration (2-3 hours)

**Files to Modify:**
- `/src/combat/CombatEncounter.js` - Modify `removeNPCFromRoom()`
- `/world/sesame_street/npcs/*.js` - Add lootTables to all NPCs

**Implementation:**
```javascript
// In CombatEncounter.js
removeNPCFromRoom(npc) {
    if (!npc || npc.socket) return;

    const room = this.world.getRoom(this.roomId);
    if (room && room.npcs) {
        const npcId = Object.keys(this.world.npcs).find(id => this.world.npcs[id] === npc);

        if (npcId) {
            const index = room.npcs.indexOf(npcId);
            if (index > -1) {
                room.npcs.splice(index, 1);
                logger.log(`Removed NPC ${npc.name} (${npcId}) from room ${room.id}`);

                // Create corpse with loot
                const ContainerManager = require('../systems/containers/ContainerManager');
                const LootGenerator = require('../systems/loot/LootGenerator');

                const { items, currency } = LootGenerator.generateNPCLoot(npc);

                const corpse = ContainerManager.createCorpse({
                    npcId: npcId,
                    npcName: npc.name,
                    roomId: room.id,
                    items: items,
                    decayTime: this.getDecayTime(npc)
                });

                if (!room.corpses) room.corpses = [];
                room.corpses.push(corpse);

                this.broadcast(`The corpse of ${npc.name} lies here.`);
            }
        }
    }
}

getDecayTime(npc) {
    const config = require('../config/itemsConfig');
    const baseTime = npc.isBoss ? 1800000 : 300000;  // 30 min or 5 min
    return Date.now() + baseTime;
}
```

**Deliverables:**
- NPCs create corpses on death
- Corpses contain generated loot
- Players can examine corpses to see contents

### Phase 3: Looting System (1-2 hours)

**Files to Create:**
- `/src/commands/core/loot.js` - New loot command

**Implementation:**
```javascript
// loot.js
function loot(player, args, world, allPlayers) {
    if (args.length === 0) {
        return 'Loot what?';
    }

    const target = args.join(' ').toLowerCase();
    const room = world.getRoom(player.currentRoom);

    if (!room.corpses || room.corpses.length === 0) {
        return 'There are no corpses here to loot.';
    }

    // Find matching corpse
    const corpse = room.corpses.find(c =>
        c.name.toLowerCase().includes(target)
    );

    if (!corpse) {
        return `You don't see '${target}' here.`;
    }

    // Transfer items from corpse to player
    const ContainerManager = require('../../systems/containers/ContainerManager');
    const lootedItems = ContainerManager.lootCorpse(corpse, player);

    if (lootedItems.length === 0) {
        return 'The corpse is empty.';
    }

    let message = `You loot ${corpse.name}:\n`;
    lootedItems.forEach(item => {
        message += `  - ${item.name}`;
        if (item.quantity > 1) message += ` x${item.quantity}`;
        message += '\n';
    });

    return message.trim();
}
```

**Deliverables:**
- Players can loot corpses with `loot <corpse>` command
- Items transfer from corpse to player inventory
- Empty corpses remain until decay

### Phase 4: Decay & Respawn (2-3 hours)

**Files to Modify:**
- `/src/respawnService.js` - Add corpse awareness
- `/src/systems/containers/ContainerManager.js` - Add decay processing

**Implementation:**
```javascript
// In ContainerManager.js
class ContainerManager {
    static startDecayLoop(world, allPlayers) {
        setInterval(() => {
            this.processCorpseDecay(world, allPlayers);
        }, 60000);  // Check every minute
    }

    static processCorpseDecay(world, allPlayers) {
        const now = Date.now();

        for (const roomId in world.rooms) {
            const room = world.rooms[roomId];
            if (!room.corpses) continue;

            room.corpses = room.corpses.filter(corpse => {
                if (corpse.decayTime <= now) {
                    // Notify players in room
                    this.notifyCorpseDecay(room, corpse, allPlayers);

                    // Decay triggers respawn (handled by respawnService)
                    return false;  // Remove corpse
                }
                return true;  // Keep corpse
            });
        }
    }

    static notifyCorpseDecay(room, corpse, allPlayers) {
        const message = `The ${corpse.name} decays into dust.`;
        for (const player of allPlayers) {
            if (player.currentRoom === room.id) {
                player.send(message);
            }
        }
    }
}

// In respawnService.js - modify checkAndRespawn()
checkAndRespawn() {
    for (const roomId in this.world.rooms) {
        const currentRoom = this.world.rooms[roomId];
        const initialRoom = this.world.initialRoomsState[roomId];

        if (!initialRoom || !initialRoom.npcs) continue;

        const missingNpcIds = initialRoom.npcs.filter(initialNpcId => {
            // Not in room
            if (currentRoom.npcs.includes(initialNpcId)) return false;

            // Has active corpse - don't respawn yet
            if (this.hasActiveCorpse(initialNpcId, currentRoom)) return false;

            return true;  // Missing and no corpse = ready to respawn
        });

        // ... respawn logic
    }
}

hasActiveCorpse(npcId, room) {
    if (!room.corpses) return false;
    return room.corpses.some(c => c.npcId === npcId);
}
```

**Deliverables:**
- Corpses decay after configured time
- Decay triggers NPC respawn
- Players notified of decay
- Full death → loot → decay → respawn cycle works

### Phase 5: Testing & Balance (2-3 hours)

**Tasks:**
1. Write unit tests for all new components
2. Write integration tests for death → respawn cycle
3. Manual testing of edge cases
4. Balance tuning based on test results
5. Documentation update

**Deliverables:**
- Comprehensive test suite
- Balance validation report
- Updated documentation
- Bug fixes from testing

---

## 9. Configuration Recommendations

### 9.1 Corpse Configuration

**File:** `/src/config/corpsesConfig.js` (NEW)

```javascript
module.exports = {
    npc: {
        // Decay timers by NPC tier (milliseconds)
        decayTime: {
            trash: 300000,      // 5 minutes
            standard: 300000,   // 5 minutes
            elite: 600000,      // 10 minutes
            boss: 1800000       // 30 minutes
        },

        // Additional respawn delay after decay
        respawnDelay: {
            trash: 0,           // Immediate
            standard: 0,        // Immediate
            elite: 0,           // Immediate
            boss: 1800000       // 30 minutes after decay
        },

        // Corpse properties
        weight: 150,            // Very heavy (lbs)
        isMoveable: true,       // Can be picked up
        isOpen: true,           // Always open for looting
        showInRoom: true,       // Visible in room description

        // Loot configuration
        loot: {
            trash: {
                itemCount: 1,
                bonusChance: 0.10,
                emptyChance: 0.20
            },
            standard: {
                itemCount: 2,
                bonusChance: 0.20,
                emptyChance: 0.10
            },
            elite: {
                itemCount: 3,
                bonusChance: 0.30,
                emptyChance: 0.05
            },
            boss: {
                itemCount: 5,
                bonusChance: 0.50,
                emptyChance: 0
            }
        }
    },

    player: {
        // Player corpses (future implementation)
        decayTime: 1800000,       // 30 minutes
        currencyLossPercent: 0.10,
        itemsDropped: 'equipped',
        allowOthersToLoot: false
    }
};
```

### 9.2 NPC Loot Tables

**Example NPC with Full Loot Configuration:**

```json
{
    "id": "red_wumpy",
    "name": "Red Wumpy",
    "description": "A small, round, aggressively red creature...",
    "level": 1,
    "hp": 20,
    "maxHp": 20,
    "strength": 8,
    "dexterity": 10,
    "constitution": 10,

    "challengeRating": 1,
    "lootTables": ["trash_loot", "common_loot"],
    "spawnTags": ["common", "wumpy", "sesame_street"],
    "isBoss": false,
    "tier": "trash",

    "is_kickable": true,
    "roaming": true,
    "dialogue": ["Wump wump!", "..."]
}
```

---

## 10. Success Criteria

### 10.1 Functional Requirements

- ✅ NPC death creates corpse container in room
- ✅ Corpse contains loot from LootGenerator
- ✅ Players can examine corpse to see contents
- ✅ Players can loot items from corpse
- ✅ Corpse decays after configured time
- ✅ NPC respawns after corpse decays
- ✅ Respawn restores NPC to full HP
- ✅ Respawn places NPC at original location

### 10.2 Combat Integration Requirements

- ✅ XP awarded before corpse creation
- ✅ Combat state cleaned up properly
- ✅ Death messages displayed correctly
- ✅ No duplicate corpses created
- ✅ Works with flee mechanic
- ✅ Works with off-hand attacks

### 10.3 Balance Requirements

- ✅ Loot generation matches designed economy
- ✅ Currency drops balanced for progression
- ✅ Respawn timers prevent rapid farming
- ✅ Boss loot significantly better than trash
- ✅ No exploits or edge case issues

### 10.4 Performance Requirements

- ✅ Decay processing completes in <10ms
- ✅ No memory leaks from corpse accumulation
- ✅ Efficient corpse lookup in respawn checks
- ✅ Graceful handling of 100+ corpses

---

## 11. Risks and Mitigation

### Risk 1: Container System Scope Creep

**Risk:** Building full container system (chests, bags, etc.) delays corpse implementation

**Mitigation:**
- Build minimal container system focused on corpses only
- Defer generic containers to later phase
- Use inheritance to allow future expansion

### Risk 2: Loot Balance Issues

**Risk:** Item/currency generation unbalanced for economy

**Mitigation:**
- Start conservative (low drop rates)
- Monitor actual gameplay data
- Easy to adjust config values post-launch
- Build admin command to adjust rates on the fly

### Risk 3: Respawn Exploits

**Risk:** Players find ways to farm corpses rapidly

**Mitigation:**
- Implement respawn delays
- Add player presence checks (optional)
- Monitor kill rates via logging
- Ready to adjust timers based on data

### Risk 4: Memory Leaks

**Risk:** Corpses not cleaned up properly, memory grows

**Mitigation:**
- Decay loop guarantees cleanup
- Server restart clears all corpses (acceptable for MVP)
- Add admin command to force corpse cleanup
- Monitor memory usage during testing

---

## 12. Recommendations

### Immediate Actions

1. **Create container system foundation** - this is the critical path blocker
2. **Add lootTables to all NPC definitions** - required for loot generation
3. **Implement corpse creation in `removeNPCFromRoom()`** - clean integration point
4. **Build decay processing loop** - background timer system

### Design Decisions Needed

1. **Should corpses be moveable?**
   - Recommendation: YES - adds gameplay depth, manageable complexity

2. **Respawn if players in room?**
   - Recommendation: YES - respawn regardless (creates tension)

3. **Multi-player loot distribution?**
   - Recommendation: DEFER - keep 1v1 combat only for MVP

4. **Persist corpses across restart?**
   - Recommendation: NO for MVP - decay all on restart

### Future Enhancements (Post-MVP)

1. Player corpses (death penalty system)
2. Corpse dragging/movement
3. Necromancy spells (animate corpse)
4. Burial system
5. Corpse preservation items
6. Insurance system
7. Multi-player loot instancing

---

## 13. Conclusion

The corpse and respawn system is **architecturally ready for implementation**. The combat system provides clean integration points, the loot generation system is complete, and the respawn service exists with clear modification points.

**Primary Implementation Gap:** Container system foundation

**Estimated Implementation Time:** 10-14 hours for complete MVP

**Recommended Approach:**
1. Build minimal container system (corpses only)
2. Integrate with combat death flow
3. Implement decay + respawn linkage
4. Test thoroughly
5. Balance tune based on gameplay

**Confidence Level:** HIGH - all pieces are in place, just need assembly.

---

**Next Steps:**
1. Review this document with mud-architect agent
2. Implement Phase 1 (Container Foundation)
3. Implement Phase 2 (Combat Integration)
4. Test and iterate

**Point of Contact:** Combat Systems Architect
**Review Status:** APPROVED FOR IMPLEMENTATION
