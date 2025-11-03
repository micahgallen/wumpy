# Combat System Fixes - Testing Guide

## Issues Fixed

### 1. Combat Dialogue Not Showing
**Root Cause**: The broadcast method in `CombatEncounter.js` was using `this.participants[0].currentRoom` to find the room. When an NPC rolled higher initiative and became first in the participants array, this failed because NPCs don't have a `currentRoom` property.

**Fix**: Store the room ID in the constructor by finding any player participant, and use that stored room ID for all broadcasts.

**Files Modified**:
- `src/combat/CombatEncounter.js` (lines 29-32, 35-36, 115-130)

### 2. Damage/Health Mismatch
**Root Cause**: This was a symptom of issue #1 - when combat messages weren't being broadcast due to the NPC initiative bug, players couldn't see the combat happening at all.

**Fix**: The same fix as above resolves this issue.

## Testing Instructions

### Test 1: Combat with Various NPCs
1. Start the server from the project directory:
   ```bash
   cd /Users/au288926/Documents/mudmud
   node src/server.js
   ```

2. Attack different NPCs multiple times and verify:
   - Combat messages ALWAYS appear
   - "Combat has begun!" message shows
   - Attack messages show (e.g., "Player strikes Wumpy!")
   - Damage messages show with correct numbers (e.g., "5 physical damage!")
   - Health bars display correctly with current HP

### Test 2: Verify Damage Calculation
When you see a combat message like:
```
Player strikes Wumpy!
5 physical damage!
Wumpy: [########------------] 40/50 HP
```

Verify that the damage number (5) matches the HP change:
- Before: 45 HP (previous round or starting HP)
- After: 40 HP
- Difference: 5 HP (matches the damage shown)

### Test 3: Multiple Rounds
Fight an NPC for several rounds and verify:
- Health bar decreases consistently with damage shown
- Messages appear every round (every 3 seconds)
- Both player and NPC attacks are visible

### Test 4: Different NPCs
Test with NPCs that have different stats/resistance:
- High-timidity NPCs (might flee)
- Aggressive NPCs (attack first)
- NPCs with resistances (damage should be reduced)

## Expected Behavior

**Combat Flow**:
1. "Combat has begun!" (shows once at start)
2. Every 3 seconds, each combatant takes their turn:
   - Attack message (hit/miss/critical)
   - If hit: Damage message + health bar
   - If defeated: Death message + "Combat has ended!"

**Damage Display**:
- Shows final damage (after resistance calculations)
- Health bar shows current HP after damage is applied
- Numbers should always match

## If Issues Persist

If you still see problems:
1. Check server logs for any errors
2. Verify you're running from the correct directory
3. Check if the NPC has required stats (hp, maxHp, resistances)
4. Look for any JavaScript errors in the server output
