# Combat Observer Bug Fix

## Issue Summary
Combat messages were not being broadcast to observers (non-combatant players) in the same room as the fight. Only combatants could see combat dialogue, making the world feel disconnected and preventing situational awareness.

## Root Cause
In `/Users/au288926/Documents/mudmud/src/combat/CombatEncounter.js`, the `broadcast()` method (lines 73-79 in original code) only iterated over `this.participants` (the combatants) instead of all players in the room.

### Original Code (Buggy):
```javascript
broadcast(message) {
    for (const participant of this.participants) {
        if (participant.socket) { // Check if it's a player
            participant.send('\n' + message + '\n');
        }
    }
}
```

## Solution Implemented
Modified the `broadcast()` method to send messages to all players in the same room, following the same pattern already used in `initiateCombat()` and `endCombat()` methods.

### Fixed Code:
```javascript
broadcast(message) {
    // Send combat messages to all players in the same room, not just participants
    const room = this.world.getRoom(this.participants[0].currentRoom);
    if (room) {
        for (const p of this.allPlayers) {
            if (p.currentRoom === room.id) {
                p.send('\n' + message + '\n');
            }
        }
    }
}
```

## Files Modified
- `/Users/au288926/Documents/mudmud/src/combat/CombatEncounter.js` - Fixed broadcast method (lines 73-83)

## Files Created
- `/Users/au288926/Documents/mudmud/test_combat_observer.js` - Comprehensive test to verify observers receive combat messages

## Testing
Created and ran two tests to verify the fix:

### 1. Observer Test (test_combat_observer.js)
- Sets up 2 combatants and 2 observers in the same room
- Verifies all players receive "Combat has begun!" message
- Verifies all players receive combat action messages during rounds
- Result: PASSED - All players receive combat messages

### 2. Regression Test (test_combat_encounter.js)
- Existing combat test to ensure no functionality was broken
- Result: PASSED - Combat system works as before

### Test Results
```
Both tests PASSED:
- Combatants receive combat messages
- Observers in the same room receive combat messages
- No regressions in existing combat functionality
```

## Impact
- All players in a room now see combat happening around them
- Observers can watch fights and gain situational awareness
- Makes the world feel more alive and connected
- Maintains the D&D tabletop experience where everyone can see combat actions

## Consistency
The fix aligns with the existing pattern already used in the same class:
- `initiateCombat()` (lines 15-24) - broadcasts "Combat has begun!" to all players in room
- `endCombat()` (lines 75-85) - broadcasts "Combat has ended!" to all players in room
- `broadcast()` (lines 87-97) - NOW broadcasts combat actions to all players in room

## Future Considerations

### CombatResolver System (Not Currently Active)
There is a newer combat system in `/Users/au288926/Documents/mudmud/src/systems/combat/CombatResolver.js` that has a similar issue in its `broadcastToCombat()` function (lines 236-243). This system is NOT currently active in the server (server.js uses CombatEngine, which uses CombatEncounter).

When this newer system is eventually activated, the same fix should be applied. However, the architecture is different:
- Uses callback functions (`messageFn`, `broadcastRoomFn`)
- Doesn't have direct access to world/room data
- Would require adding `broadcastRoomFn` parameter to `processCombatRound()`
- Would require updating all call sites to provide the room broadcast function

**Recommendation**: When activating CombatResolver, apply the same fix pattern but adapted to its callback-based architecture.

## Related Combat Systems
The MUD has two combat systems:
1. **Active System**: CombatEngine -> CombatEncounter (FIXED)
2. **Newer System**: CombatResolver (NOT ACTIVE, has same bug)

The active system is now working correctly. The newer system will need the same fix when deployed.

## Verification Steps
To verify this fix in a live server:
1. Have two players in the same room
2. Have one player attack an NPC
3. The second player (observer) should see all combat messages
4. Both combatant and observer should see identical combat dialogue

## D&D 5e Alignment
This fix aligns with D&D 5e rules where all participants at the table can observe combat. In a tabletop game, everyone can see what's happening in combat, and this fix brings the MUD closer to that experience.
