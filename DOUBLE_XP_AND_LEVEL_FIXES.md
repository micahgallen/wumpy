# Double XP Award and Negative XP Fixes

## Issues Reported

### Issue 1: Double XP on Flee Death
When an NPC died during a flee attempt, XP was awarded twice:
```
Red Wumpy attempts to flee!
[Attack of Opportunity] cyberslayer hits Red Wumpy solidly!
1 Physical damage!
Red Wumpy dies while trying to flee!
You gain 5 XP! (combat)
You gain 5 XP! (combat)  <-- DUPLICATE
```

### Issue 2: Negative XP from Admin Level Commands
Using `addlevel` or `removelevel` resulted in massively negative XP:
```
> score
-27960 / 8000 XP (35960 to next level)
```

## Root Causes

### Double XP Bug
**Location**: `src/combat/CombatEncounter.js`

When an NPC died during flee:
1. Flee handler awarded XP (line 81-83)
2. Flee handler called `endCombat()` (line 86)
3. `endCombat()` saw a dead NPC and awarded XP again (line 146-148)

**Code flow**:
```javascript
// In flee handler
if (damageResult.dead) {
    awardXP(player, xp, 'combat', this.playerDB);  // FIRST AWARD
    this.endCombat();  // Calls endCombat below
}

// In endCombat()
if (winner && loser && winner.socket && !loser.socket) {
    awardXP(winner, xp, 'combat', this.playerDB);  // SECOND AWARD (duplicate!)
}
```

### Negative XP Bug
**Location**: `src/admin/commands.js`

When using `addlevel` or `removelevel`:
- Level was changed correctly
- XP was NOT adjusted to match new level
- Player might have 100 XP but be level 5 (which requires 8000 XP minimum)
- Score display showed: `100 - 8000 = -7900` (negative progress)

**Example**:
```
Level 1 with 100 XP → addlevel 4 → Level 5 with 100 XP
But level 5 starts at 8000 XP!
Result: -7900 XP displayed
```

## Fixes Applied

### Fix 1: Add skipXpAward Parameter to endCombat()

**File**: `src/combat/CombatEncounter.js`

Modified `endCombat()` to accept an optional parameter:
```javascript
endCombat(skipXpAward = false) {
    // Award XP only if not already awarded
    if (winner && loser && winner.socket && !loser.socket && !skipXpAward) {
        const xp = calculateCombatXP(loser, winner.level);
        awardXP(winner, xp, 'combat', this.playerDB);
        this.removeNPCFromRoom(loser);
    } else if (loser && !loser.socket && skipXpAward) {
        // XP already awarded, just remove the NPC
        this.removeNPCFromRoom(loser);
    }
    // ...
}
```

When NPC dies during flee, pass `true` to skip duplicate XP:
```javascript
if (damageResult.dead) {
    // Award XP here
    awardXP(player, xp, 'combat', this.playerDB);
    this.removeNPCFromRoom(attacker);
    this.endCombat(true);  // Skip XP award in endCombat
    return;
}
```

### Fix 2: Set XP to Minimum for New Level

**File**: `src/admin/commands.js`

Added import:
```javascript
const { getXPForLevel } = require('../progression/xpSystem');
```

Updated `addlevelCommand()`:
```javascript
const oldLevel = targetData.level || 1;
const newLevel = Math.max(1, oldLevel + delta);

// Set XP to the minimum for the new level
const newXP = getXPForLevel(newLevel);

// Update both level and XP
playerDB.updatePlayerLevel(targetData.username, newLevel, targetData.maxHp, targetData.hp);
playerDB.updatePlayerXP(targetData.username, newXP);

// Update online player
if (targetPlayer) {
    targetPlayer.level = newLevel;
    targetPlayer.xp = newXP;  // Set XP too
    // ...
}
```

Updated `removelevelCommand()` with same logic.

## XP Level Requirements

For reference, the XP required for each level:
```
Level 1: 0 XP
Level 2: 800 XP
Level 3: 2464 XP
Level 4: 4971 XP
Level 5: 8355 XP
Level 6: 12640 XP
Level 7: 17839 XP
Level 8: 23960 XP
Level 9: 31004 XP
Level 10: 38971 XP
```

## Testing

### Test 1: Flee Death XP
```
> attack red wumpy
[Damage to low HP...]
Red Wumpy attempts to flee!
[Attack of Opportunity] Player hits Red Wumpy!
Red Wumpy dies while trying to flee!
You gain 5 XP! (combat)
```
✅ Only one XP award message

### Test 2: Normal Death XP
```
> attack blue wumpy
[Combat continues...]
Blue Wumpy has been defeated!
You gain 5 XP! (combat)
```
✅ Still works correctly

### Test 3: addlevel Command
```
> score
100 / 800 XP

> addlevel cyberslayer 4
Changed cyberslayer's level from 1 to 5
XP set to: 8355 (minimum for level 5)

> score
Level: 5
8355 / 12640 XP (4285 to next level)
```
✅ No negative XP, shows correct progress

### Test 4: removelevel Command
```
> score
Level: 5
9000 / 12640 XP

> removelevel cyberslayer 2
Removed 2 level(s) from cyberslayer
Level: 5 -> 3
XP set to: 2464 (minimum for level 3)

> score
Level: 3
2464 / 4971 XP (2507 to next level)
```
✅ XP set correctly for reduced level

## Behavior Changes

### Before
| Scenario | Old Behavior | New Behavior |
|----------|--------------|--------------|
| NPC dies during flee | XP awarded twice | XP awarded once |
| addlevel command | XP unchanged | XP set to level minimum |
| removelevel command | XP unchanged | XP set to level minimum |
| Score display after level change | Negative XP shown | Positive XP from level start |

### Admin Command Output

**addlevel** now shows:
```
Changed player's level from 1 to 5
XP set to: 8355 (minimum for level 5)
```

**removelevel** now shows:
```
Removed 3 level(s) from player
Level: 5 -> 2
HP: 50 -> 30
XP set to: 800 (minimum for level 2)
```

## Files Modified

1. **src/combat/CombatEncounter.js**
   - Added `skipXpAward` parameter to `endCombat()`
   - Pass `true` when NPC dies during flee
   - Handle NPC removal when XP already awarded

2. **src/admin/commands.js**
   - Import `getXPForLevel` from xpSystem
   - Set XP to level minimum in `addlevelCommand()`
   - Set XP to level minimum in `removelevelCommand()`
   - Update both database and online player XP
   - Show XP change in command feedback

## Design Rationale

### Why Set XP to Level Minimum?

When an admin changes a player's level, we have three options:

1. **Keep current XP** (OLD) - Causes negative XP display
2. **Set to level minimum** (NEW) - Clean slate, no negatives
3. **Scale proportionally** - Complex, may cause confusion

We chose option 2 because:
- Simple and predictable
- No negative XP ever displayed
- Clear to admins what happened
- Players start fresh at new level
- Matches how actual leveling works (you start at level XP)

### Why Skip XP in endCombat?

Alternative approaches considered:
1. ❌ Track XP award state in class variable (adds complexity)
2. ❌ Check if XP already awarded in endCombat (requires tracking)
3. ✅ Pass parameter to indicate XP already handled (clean, simple)

Option 3 is clearest and most maintainable.

## Future Considerations

### Potential Enhancements

1. **Preserve XP progress**: Scale XP proportionally when changing levels
   ```javascript
   const currentProgress = (oldXP - oldLevelStart) / (oldLevelEnd - oldLevelStart);
   const newXP = newLevelStart + (currentProgress * (newLevelEnd - newLevelStart));
   ```

2. **XP buffer**: Add a small XP buffer when adding levels
   ```javascript
   const newXP = getXPForLevel(newLevel) + 100; // Start with small bonus
   ```

3. **Admin flag**: `--keep-xp` flag to preserve XP when changing levels
   ```bash
   addlevel player 5 --keep-xp
   ```

For now, setting to level minimum is the simplest and most reliable approach.
