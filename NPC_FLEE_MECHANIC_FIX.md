# NPC Flee Mechanic - Proper Implementation

## Issue
Previous implementation had NPCs despawning when fleeing, but the correct behavior is:
1. NPC attempts to flee
2. Player gets an attack of opportunity
3. If NPC survives, it moves to a random adjacent room
4. NPC stays alive and can be encountered again in the new room

## Proper Flee Behavior

### Flee Sequence
1. **Flee Decision**: NPC's HP drops below flee threshold, AI decides to flee
2. **Announce**: "Blue Wumpy attempts to flee!"
3. **Attack of Opportunity**: Player gets one automatic attack as NPC tries to escape
4. **Resolution**:
   - If attack kills NPC: "Blue Wumpy dies while trying to flee!" → XP awarded, NPC removed
   - If NPC survives: NPC moves to random adjacent room → "Blue Wumpy flees from combat!"
5. **Room Entry**: Players in destination room see: "Blue Wumpy arrives, fleeing from combat!"

### Edge Cases
- **No Exits**: "Blue Wumpy tries to flee but there's nowhere to go!" → Combat ends anyway
- **Dead-End Room**: NPC stuck, cannot flee to safety
- **Multiple Exits**: Random choice keeps it unpredictable

## Implementation

### File: `src/combat/CombatEncounter.js`

#### 1. Flee Handler (lines 54-103)
```javascript
if (action === 'flee') {
    // NPC attempts to flee - player gets attack of opportunity
    const player = target;

    this.broadcast(colors.combat(`${attacker.name} attempts to flee!`));

    // Attack of opportunity
    const opportunityAttack = rollAttack(player, attacker);
    const opportunityMessage = getAttackMessage(player, attacker, opportunityAttack.hit, opportunityAttack.critical);
    this.broadcast(colors.hit(`[Attack of Opportunity] `) + opportunityMessage);

    if (opportunityAttack.hit) {
        const damage = rollDamage(player, '1d6', opportunityAttack.critical);
        const damageResult = applyDamage(attacker, damage, 'physical');
        const damageMessage = getDamageMessage(damageResult.finalDamage, 'physical', attacker);
        this.broadcast(damageMessage);

        if (damageResult.dead) {
            // NPC killed during flee attempt
            const deathMessage = getDeathMessage(attacker);
            this.broadcast(deathMessage);
            this.broadcast(colors.combat(`${attacker.name} dies while trying to flee!`));

            // Award XP and remove dead NPC
            if (player.socket && player.username) {
                const xp = calculateCombatXP(attacker, player.level);
                awardXP(player, xp, 'combat', this.playerDB);
            }
            this.removeNPCFromRoom(attacker);
            this.endCombat();
            return;
        }
    }

    // NPC survives and flees to adjacent room
    const fleeSuccess = this.moveNPCToAdjacentRoom(attacker);

    if (fleeSuccess) {
        this.broadcast(colors.combat(`${attacker.name} flees from combat!`));
    } else {
        this.broadcast(colors.combat(`${attacker.name} tries to flee but there's nowhere to go!`));
    }

    this.endCombat();
    return;
}
```

#### 2. Room Movement Method (lines 179-228)
```javascript
moveNPCToAdjacentRoom(npc) {
    if (!npc || npc.socket) return false;

    const currentRoom = this.world.getRoom(this.roomId);
    if (!currentRoom || !currentRoom.exits || currentRoom.exits.length === 0) {
        return false; // No exits available
    }

    // Find the NPC ID
    const npcId = Object.keys(this.world.npcs).find(id => this.world.npcs[id] === npc);
    if (!npcId) return false;

    // Choose random exit
    const randomExit = currentRoom.exits[Math.floor(Math.random() * currentRoom.exits.length)];
    const destinationRoom = this.world.getRoom(randomExit.room);

    if (!destinationRoom) return false;

    // Remove NPC from current room
    const index = currentRoom.npcs.indexOf(npcId);
    if (index > -1) {
        currentRoom.npcs.splice(index, 1);
    }

    // Add NPC to destination room
    if (!destinationRoom.npcs) {
        destinationRoom.npcs = [];
    }
    destinationRoom.npcs.push(npcId);

    logger.log(`NPC ${npc.name} (${npcId}) fled from ${currentRoom.id} to ${destinationRoom.id} via ${randomExit.direction}`);

    // Notify players in destination room
    for (const p of this.allPlayers) {
        if (p.currentRoom === destinationRoom.id) {
            p.send(`\n${colors.action(`${npc.name} arrives, fleeing from combat!`)}\n`);
        }
    }

    return true;
}
```

## Gameplay Example

### Successful Flee
```
> attack wumpy
Combat has begun!
Player strikes Blue Wumpy!
5 physical damage!
Blue Wumpy: [########--------] 40/50 HP

Blue Wumpy strikes Player!
3 physical damage!
Player: [################----] 80/100 HP

[Next round...]

Blue Wumpy attempts to flee!
[Attack of Opportunity] Player swings at Blue Wumpy but misses!
Blue Wumpy flees from combat!
Combat has ended!

> look
The Street
=========
You see Blue Wumpy here.  // NPC is gone!

> n
[Move to north room]

You see Blue Wumpy here.  // NPC fled here!
```

### Killed During Flee
```
Blue Wumpy attempts to flee!
[Attack of Opportunity] Player strikes Blue Wumpy!
8 physical damage!
Blue Wumpy: [--------------------] 0/50 HP
Blue Wumpy has been defeated!
Blue Wumpy dies while trying to flee!
You gain 5 XP! (combat)
Combat has ended!

> look
The Street
=========
[Blue Wumpy is gone - will respawn in 60s]
```

### No Escape Route
```
Blue Wumpy attempts to flee!
[Attack of Opportunity] Player swings at Blue Wumpy but misses!
Blue Wumpy tries to flee but there's nowhere to go!
Combat has ended!

> look
The Street
=========
You see Blue Wumpy here.  // Still here, but combat ended
```

## Design Benefits

1. **Realistic Movement**: NPCs actually move through the world
2. **Player Reward**: Attack of opportunity gives player chance to finish them off
3. **Strategic Depth**: Low-HP NPCs can escape and be found elsewhere
4. **World Coherence**: NPCs don't just vanish, they flee to safety
5. **Pursuit Gameplay**: Players can chase fled NPCs to adjacent rooms
6. **No Despawn**: NPCs stay in the world (only dead ones despawn and respawn)

## Comparison

| Old Behavior (Despawn) | New Behavior (Move) |
|------------------------|---------------------|
| NPC says "flees" | NPC says "attempts to flee" |
| No attack of opportunity | Player gets one automatic attack |
| NPC removed from world | NPC moves to adjacent room |
| Can't find NPC again | Can pursue to new room |
| Respawns after 60s | Stays alive in new location |

## Technical Details

### NPC Selection Logic
- Uses existing flee threshold and timidity from `combatAI.js`
- No changes to AI decision-making
- Only changes what happens when flee is chosen

### Room Selection
- Random choice from available exits
- No pathfinding or "smart" escape
- Adds unpredictability to NPC behavior

### XP Award
- Only awarded if NPC dies (normal death or during flee)
- No XP for successful flee (NPC escaped)
- Prevents XP farming by repeatedly letting NPCs flee

### Respawn Interaction
- Dead NPCs removed and respawn after 60s (existing behavior)
- Fled NPCs stay alive and roam until killed
- Fled NPCs can be attacked again in new location

## Testing Checklist

- [ ] Attack NPC to low HP
- [ ] Verify "attempts to flee" message
- [ ] Verify attack of opportunity occurs
- [ ] If NPC survives, verify it's in adjacent room
- [ ] If NPC dies, verify XP awarded
- [ ] Verify players in destination room see arrival
- [ ] Test in dead-end room (no exits)
- [ ] Verify fled NPC can be attacked in new location
- [ ] Verify multiple flee attempts work correctly

## Future Enhancements

Possible future improvements:
1. **Smart Fleeing**: NPCs prefer exits away from danger
2. **Stamina**: NPCs can only flee once per combat
3. **Speed Check**: Faster NPCs more likely to escape
4. **Pursuit**: Player command to chase fleeing NPC
5. **Directional Bias**: Wounded NPCs flee toward "home" areas
