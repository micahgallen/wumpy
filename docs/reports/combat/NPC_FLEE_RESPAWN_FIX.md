# NPC Flee and Respawn Bug Fix

## Critical Bug Report

### Issue Discovered
When fighting the blue wumpy:
1. NPC would "flee" but remain in the same room
2. Player could attack it again immediately
3. Killing it awarded XP
4. Process could be repeated infinitely for XP farming
5. NPC never actually left the room or respawned properly

## Root Causes Identified

### 1. Flee Action Incomplete
**Location**: `src/combat/CombatEncounter.js:58-62`

**Problem**: When an NPC fled, the code only:
- Broadcast "X flees from combat!"
- Ended combat

**Missing**:
- NPC was not removed from the room
- NPC stayed at low HP
- Could be attacked immediately again

### 2. Dead NPCs Not Removed
**Location**: `src/combat/CombatEncounter.js:99-111`

**Problem**: When combat ended with a dead NPC:
- XP was awarded to the winner
- Combat ended
- **NPC was never removed from the room**

**Result**: Dead NPCs at 0 HP remained in the room and could be "killed" repeatedly.

### 3. Respawn Service Limitations
**Location**: `src/respawnService.js:26-50`

**Problem**: Respawn service only worked for NPCs that were **missing** from the room:
```javascript
const missingNpcIds = initialRoom.npcs.filter(
  initialNpcId => !currentRoom.npcs.includes(initialNpcId)
);
```

Since dead/fled NPCs were never removed, they were never "missing" and thus:
- Never respawned
- HP was never reset
- Stayed at 0 HP indefinitely

### 4. No HP Reset on Respawn
**Problem**: Even when NPCs did respawn, their HP was not reset to maxHp.

### 5. Dead NPCs Could Be Attacked
**Location**: `src/commands.js:40-63`

**Problem**: The attack command didn't check if an NPC was dead before initiating combat.

## Fixes Implemented

### 1. Remove NPCs When Fleeing
**File**: `src/combat/CombatEncounter.js`

Added `removeNPCFromRoom()` method and call it when NPC flees:
```javascript
if (action === 'flee') {
    this.broadcast(`${attacker.name} flees from combat!`);
    this.removeNPCFromRoom(attacker);  // NEW
    this.endCombat();
    return;
}
```

### 2. Remove NPCs When Dead
**File**: `src/combat/CombatEncounter.js`

Modified `endCombat()` to remove dead NPCs:
```javascript
if (winner && loser && winner.socket && !loser.socket) {
    const xp = calculateCombatXP(loser, winner.level);
    awardXP(winner, xp, 'combat', this.playerDB);
    this.removeNPCFromRoom(loser);  // NEW - Remove dead NPC
}
```

### 3. Added removeNPCFromRoom() Method
**File**: `src/combat/CombatEncounter.js`

New method that properly removes an NPC from its room:
```javascript
removeNPCFromRoom(npc) {
    if (!npc || npc.socket) return; // Only remove NPCs, not players

    const room = this.world.getRoom(this.roomId);
    if (room && room.npcs) {
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

### 4. Reset HP on Respawn
**File**: `src/respawnService.js`

Modified respawn logic to reset NPC HP:
```javascript
for (const npcId of missingNpcIds) {
    currentRoom.npcs.push(npcId);

    // Reset NPC HP when respawning
    const npc = this.world.getNPC(npcId);
    if (npc) {
        npc.hp = npc.maxHp;  // NEW
        console.log(`Reset HP for ${npc.name} (${npcId}): ${npc.hp}/${npc.maxHp}`);
    }
}
```

### 5. Prevent Attacking Dead NPCs
**File**: `src/commands.js`

Added dead check before initiating combat:
```javascript
// Check if NPC is dead
if (npc.isDead && npc.isDead()) {
    player.send('\n' + colors.error(`The ${npc.name} is already dead.\n`));
    return;
}
```

## How It Works Now

### Normal Combat Flow
1. Player attacks NPC
2. Combat proceeds
3. NPC dies
4. NPC is removed from room
5. XP awarded to player
6. After 60 seconds, NPC respawns with full HP

### Flee Flow
1. Player attacks NPC
2. Combat proceeds
3. NPC's HP drops below flee threshold
4. NPC flees
5. NPC is removed from room
6. Combat ends (no XP)
7. After 60 seconds, NPC respawns with full HP

### Edge Case Protection
- Dead NPCs can't be attacked (error message)
- NPCs must be removed from room before they can respawn
- HP is fully restored on respawn
- No XP farming possible

## Testing Checklist

### Test 1: Normal Combat
- [ ] Attack an NPC
- [ ] Kill it
- [ ] Verify it disappears from the room
- [ ] Verify XP awarded
- [ ] Wait 60 seconds
- [ ] Verify NPC respawns with full HP
- [ ] Verify `look` shows the NPC again

### Test 2: NPC Flees
- [ ] Attack an NPC
- [ ] Damage it to low HP (but don't kill)
- [ ] Wait for it to flee
- [ ] Verify it says "X flees from combat!"
- [ ] Verify NPC disappears from room
- [ ] Verify no XP awarded
- [ ] Wait 60 seconds
- [ ] Verify NPC respawns

### Test 3: No XP Farming
- [ ] Kill an NPC
- [ ] Verify it's removed from room
- [ ] Try to attack it again immediately
- [ ] Verify error message "You don't see X here to attack"
- [ ] Verify can't repeat kill for XP

### Test 4: Dead NPC Protection (Edge Case)
If an NPC somehow remains in room at 0 HP:
- [ ] Try to attack it
- [ ] Verify error: "The X is already dead."
- [ ] No combat initiated

## Files Modified

1. **src/combat/CombatEncounter.js**
   - Added `removeNPCFromRoom()` method
   - Call `removeNPCFromRoom()` when NPC flees
   - Call `removeNPCFromRoom()` when NPC dies

2. **src/respawnService.js**
   - Reset NPC HP to maxHp when respawning

3. **src/commands.js**
   - Add dead check before initiating combat

## Impact

### Security
- **XP Farming Exploit**: Fixed - Can no longer kill same NPC repeatedly
- **Dead NPC Interaction**: Fixed - Can't attack dead NPCs

### Gameplay
- **Flee Mechanic**: Now works correctly - NPCs actually leave the room
- **Respawn System**: Now works as designed - NPCs respawn after 60 seconds
- **HP Reset**: NPCs return at full health

### Performance
- No performance impact
- Minor memory improvement (dead NPCs properly cleaned up)

## Migration Notes

**No breaking changes** - This is a pure bug fix. All existing functionality preserved.

## Known Limitations

1. Respawn time is fixed at 60 seconds (configurable in `RESPAWN_INTERVAL`)
2. Players are not notified when NPCs respawn (TODO in respawnService.js)
3. Fled NPCs respawn after same timer as killed NPCs (could differentiate in future)
