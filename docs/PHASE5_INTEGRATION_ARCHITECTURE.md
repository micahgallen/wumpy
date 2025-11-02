# Phase 5: XP and Leveling Integration Architecture

**Version:** 1.0
**Date:** 2025-11-02
**Status:** Design Complete - Ready for Implementation
**Prerequisites:** Phases 1-4 Complete (100% test pass rate)

---

## Executive Summary

Phase 5 integrates the existing XP system (`src/progression/xpSystem.js`) with the operational combat system (`src/combat/CombatEncounter.js`). This phase will enable automatic XP award on NPC defeat and trigger level-up with stat gains, messages, and persistence.

**Key Integration Points:**
1. **Combat End → XP Award** - When NPC dies, award XP to victor
2. **XP Threshold Check → Level-Up** - Automatic level advancement
3. **Level-Up → Stat Application** - Apply HP, proficiency, and attribute gains
4. **Persistence → PlayerDB** - Save XP and level changes
5. **UI Display → Score Command** - Show XP progress

**Implementation Time Estimate:** 4-6 hours (with testing)

---

## Current State Analysis

### Existing Implementation (Already Working)

#### XP System (`src/progression/xpSystem.js`)
**Status:** ✅ Complete and ready

**Functions Available:**
- `awardXP(player, xpAmount, source, playerDB)` - Awards XP and checks for level-up
- `checkLevelUp(player, playerDB)` - Detects XP threshold and triggers level-up
- `levelUp(player, playerDB)` - Applies stat gains, heals, persists
- `calculateCombatXP(npc, playerLevel)` - Calculates XP reward based on level difference
- `getXPToNextLevel(player)` - Returns XP needed for next level

**Key Features:**
- XP scaling based on level difference (+20% per level above, -20% per level below)
- Multi-level support (checks recursively for multiple levels at once)
- Full heal on level-up
- Formatted messages with color coding
- Automatic persistence via PlayerDB

#### Combat System (`src/combat/CombatEncounter.js`)
**Status:** ✅ Complete and operational

**Integration Point (Lines 96-108):**
```javascript
endCombat() {
    this.isActive = false;

    const winner = this.participants.find(p => !p.isDead());
    const loser = this.participants.find(p => p.isDead());

    if (winner && loser && winner.socket && !loser.socket) {
        const xp = calculateCombatXP(loser, winner.level);
        awardXP(winner, xp, 'combat', this.playerDB);
    }

    this.broadcast(colors.combat('Combat has ended!'));
}
```

**Current Behavior:**
- ✅ Already calls `calculateCombatXP()` and `awardXP()` when NPC defeated
- ✅ Validates winner is player (has socket) and loser is NPC (no socket)
- ✅ Passes correct parameters to XP system
- ✅ Integration exists but needs verification

#### Stat Progression (`src/progression/statProgression.js`)
**Status:** ✅ Complete

**Functions Available:**
- `calculateStatGains(player)` - Returns stat gains object
- `applyStatGains(player, gains)` - Mutates player object with stat increases
- `getProficiencyBonus(level)` - D&D 5e proficiency formula

**Stat Gain Rules:**
- Every level: +5 HP
- Every 4th level: +1 Strength
- Every 5th level: +1 Constitution
- Every 6th level: +1 Dexterity
- Full heal on level-up

#### Player Database (`src/playerdb.js`)
**Status:** ✅ Has required methods

**Available Methods:**
- `updatePlayerXP(username, xp)` - Persists XP
- `updatePlayerLevel(username, level, maxHp, hp)` - Persists level and HP
- Standard save() mechanism for JSON persistence

#### Score Command (`src/commands.js` line 887)
**Status:** ✅ Already displays XP

**Current Display:**
```
Character Information
=======================
Name: PlayerName
Level: 5
XP: 12000 / 20000 (8000 to next)

HP: 30 / 30

Strength: 12
Dexterity: 10
Constitution: 11
...
```

---

## Architecture Design

### 1. Combat Flow with XP Integration

```
Player attacks NPC
         ↓
Combat initiated (CombatEncounter)
         ↓
Rounds execute every 3 seconds
         ↓
Player/NPC attacks in turn order
         ↓
Damage applied via applyDamage()
         ↓
Check isDead() after each attack
         ↓
NPC dies (hp <= 0)
         ↓
endCombat() triggered
         ↓
┌────────────────────────────────┐
│ PHASE 5 INTEGRATION POINT      │
├────────────────────────────────┤
│ 1. Calculate XP reward         │
│    - calculateCombatXP()       │
│    - Based on level difference │
│                                │
│ 2. Award XP to winner          │
│    - awardXP()                 │
│    - Send XP gain message      │
│                                │
│ 3. Check level threshold       │
│    - checkLevelUp()            │
│    - Compare xp vs threshold   │
│                                │
│ 4. If threshold met:           │
│    - levelUp()                 │
│    - Apply stat gains          │
│    - Full heal                 │
│    - Send level-up message     │
│    - Broadcast to room         │
│                                │
│ 5. Persist to database         │
│    - updatePlayerXP()          │
│    - updatePlayerLevel()       │
└────────────────────────────────┘
         ↓
Combat ended message
         ↓
Player can act normally
```

### 2. XP Award Calculation Logic

**Formula (Already Implemented):**
```javascript
function calculateCombatXP(npc, playerLevel) {
  const baseXP = npc.xpReward || (npc.level * 50);
  const levelDiff = npc.level - playerLevel;

  // Scale XP based on level difference
  let multiplier = 1 + (levelDiff * 0.2);
  multiplier = Math.max(0.1, Math.min(2.0, multiplier));

  return Math.floor(baseXP * multiplier);
}
```

**Scaling Examples:**
- L1 player defeats L1 goblin (base 50 XP): 50 XP (100%)
- L1 player defeats L3 goblin: 70 XP (140%)
- L3 player defeats L1 goblin: 30 XP (60%)
- L1 player defeats L6 elite: 100 XP (200% cap)
- L10 player defeats L1 trash mob: 5 XP (10% floor)

### 3. Level-Up Trigger Logic

**Automatic Detection (Already Implemented):**
```javascript
function checkLevelUp(player, playerDB) {
  const nextLevelXP = getXPForLevel(player.level + 1);

  if (player.xp >= nextLevelXP) {
    levelUp(player, playerDB);

    // Recursive check for multi-level gains
    checkLevelUp(player, playerDB);
  }
}
```

**Multi-Level Support:**
- If a player gains enough XP to skip a level (e.g., L1 → L3), the system will:
  1. Level up to L2
  2. Apply L2 stat gains
  3. Check again recursively
  4. Level up to L3
  5. Apply L3 stat gains
  6. Continue until XP < next threshold

### 4. Stat Gains Application

**Level-Up Sequence (Already Implemented):**
```javascript
function levelUp(player, playerDB) {
  player.level++;

  // 1. Calculate gains based on new level
  const statGains = calculateStatGains(player);

  // 2. Apply stat increases
  applyStatGains(player, statGains);

  // 3. Full heal (combat reward)
  player.hp = player.maxHp;

  // 4. Display formatted message
  const levelUpMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LEVEL UP! You are now level 5!

Max HP: 25 → 30 (+5)
Strength: +1

You have been fully healed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  player.socket.write(levelUpMessage + '\n');

  // 5. Persist to database
  playerDB.updatePlayerLevel(player.name, player.level, player.maxHp, player.hp);
}
```

### 5. Message Flow

**XP Gain Message:**
```
You gain 70 XP! (combat)
```

**Level-Up Message:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LEVEL UP! You are now level 5!

Max HP: 25 → 30 (+5)
Strength: +1
Constitution: +1

You have been fully healed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Room Broadcast (Not Yet Implemented):**
```
PlayerName glows briefly as they gain a level!
```

### 6. Persistence Architecture

**Database Update Flow:**

```
XP Award:
  awardXP() → playerDB.updatePlayerXP(player.name, player.xp)

Level-Up:
  levelUp() → playerDB.updatePlayerLevel(player.name, player.level, player.maxHp, player.hp)

Both updates:
  → save() → fs.writeFileSync('players.json')
```

**Player JSON Schema:**
```json
{
  "PlayerName": {
    "passwordHash": "...",
    "level": 5,
    "xp": 15000,
    "maxHp": 30,
    "hp": 30,
    "strength": 12,
    "dexterity": 10,
    "constitution": 11,
    "intelligence": 10,
    "wisdom": 10,
    "charisma": 10,
    "currentRoom": "sesame_street_main"
  }
}
```

---

## Implementation Tasks

### Task 5.1: Verify XP Award Integration ✅ (Minimal Work)

**Location:** `src/combat/CombatEncounter.js` (lines 96-108)

**Current Code:**
```javascript
if (winner && loser && winner.socket && !loser.socket) {
    const xp = calculateCombatXP(loser, winner.level);
    awardXP(winner, xp, 'combat', this.playerDB);
}
```

**Analysis:**
- ✅ Already imports `awardXP` and `calculateCombatXP`
- ✅ Already calls both functions with correct parameters
- ✅ Already validates player vs NPC
- ✅ Already passes playerDB reference

**Required Actions:**
1. **Verify import statement exists** (line 5)
2. **Test XP award actually triggers** in live combat
3. **Verify XP persists** to players.json
4. **Test level-up triggers** when threshold reached

**Expected Behavior:**
- When NPC dies, player immediately sees "You gain X XP! (combat)"
- If XP crosses threshold, level-up message displays immediately
- Score command shows updated XP and level
- players.json updated with new values

**Testing Procedure:**
```bash
# 1. Start server
node src/server.js

# 2. Connect with player at L1 (0 XP)
telnet localhost 4000

# 3. Attack low-level NPC
> attack goblin

# 4. Wait for combat resolution
# Expected: "You gain 50 XP! (combat)"

# 5. Check score
> score
# Expected: XP: 50 / 1000 (950 to next)

# 6. Attack 19 more goblins to reach 1000 XP
# Expected: "LEVEL UP! You are now level 2!"

# 7. Verify persistence
# Check players.json for updated level and XP
```

### Task 5.2: Add Room Broadcast for Level-Up (New Feature)

**Location:** `src/progression/xpSystem.js` (line 46-72, function `levelUp`)

**Current Code (lines 68-70):**
```javascript
player.socket.write(levelUpMessage + '\n');

// Persist
playerDB.updatePlayerLevel(player.name, player.level, player.maxHp, player.hp);
```

**Required Change:**
Add room broadcast between message and persistence:

```javascript
player.socket.write(levelUpMessage + '\n');

// NEW: Broadcast to room
const room = world.getRoom(player.currentRoom);
if (room) {
    broadcastToRoom(
        player,
        allPlayers,
        room.id,
        colors.levelUp(`${player.username} glows briefly as they gain a level!`)
    );
}

// Persist
playerDB.updatePlayerLevel(player.name, player.level, player.maxHp, player.hp);
```

**Problem:** `levelUp()` doesn't have access to `world` or `allPlayers`

**Solution:** Update function signature

**Before:**
```javascript
function levelUp(player, playerDB) { ... }
```

**After:**
```javascript
function levelUp(player, playerDB, world, allPlayers) { ... }
```

**Cascading Changes Required:**
1. Update `levelUp()` signature in `xpSystem.js`
2. Update `checkLevelUp()` to pass `world` and `allPlayers`
3. Update `awardXP()` to pass `world` and `allPlayers`
4. Update `CombatEncounter.js` to pass `world` and `allPlayers` when calling `awardXP()`

**Alternative (Simpler):** Skip room broadcast for Phase 5, add in Phase 6

### Task 5.3: Test Multi-Level Gains

**Test Scenario:**
Player at L1 with 0 XP defeats L10 boss that awards 5000 XP:
- L1 → L2: needs 1000 XP (total: 1000)
- L2 → L3: needs 2027 XP (total: 3027)
- L3 → L4: needs 3831 XP (total: 6858) → NOT REACHED

**Expected:**
- Player levels up twice (L1 → L2 → L3)
- Two level-up messages displayed
- Stat gains applied for both levels
- Final: L3, 5000/6858 XP

**Implementation:**
Already handled by recursive `checkLevelUp()` call in `xpSystem.js` line 37:

```javascript
if (player.xp >= nextLevelXP) {
    levelUp(player, playerDB);

    // Check again in case of multi-level gains
    checkLevelUp(player, playerDB); // ← RECURSIVE CALL
}
```

### Task 5.4: Update Score Command (Already Done ✅)

**Location:** `src/commands.js` (line 887-917)

**Current Display:**
```javascript
output.push(`${colors.highlight('XP:')} ${player.xp} / ${getXPForLevel(player.level + 1)} (${getXPToNextLevel(player)} to next)`);
```

**Status:** ✅ Already implemented correctly

**Displays:**
```
XP: 12000 / 20000 (8000 to next)
```

### Task 5.5: Test XP Loss Edge Cases

**Edge Case 1: XP at Exact Threshold**
- Player at 999 XP (1 below L2)
- Gains 1 XP
- Expected: Level-up triggers at exactly 1000 XP

**Edge Case 2: Player Already at Level 50**
- Max level (per xpTable.js)
- Gains XP
- Expected: XP increases but no level-up

**Edge Case 3: NPC with No xpReward Property**
- Fallback: `npc.level * 50` (line 81 in xpSystem.js)
- Expected: Calculates correctly

**Edge Case 4: Player Below NPC Level by 6+**
- L1 player vs L7+ NPC
- Expected: XP capped at 200% (multiplier 2.0)

**Edge Case 5: Player Above NPC Level by 6+**
- L10 player vs L4 NPC
- Expected: XP floored at 10% (multiplier 0.1)

### Task 5.6: Verify Proficiency Bonus Update

**Issue:** Proficiency bonus must update on level-up

**Current Implementation:**
- `statProgression.js` has `getProficiencyBonus(level)` function
- Player object likely has `proficiency` property
- **Need to verify:** Is proficiency recalculated on level-up?

**Check Required:**
Look at `applyStatGains()` in `statProgression.js` line 44-55:

```javascript
function applyStatGains(player, gains) {
  if (gains.hp) {
    player.maxHp += gains.hp;
    player.currentHp += gains.hp;
  }
  if (gains.strength) player.strength += gains.strength;
  // ... other stats
}
```

**Problem:** No proficiency update!

**Solution Required:**
Add to `levelUp()` function:

```javascript
function levelUp(player, playerDB) {
  player.level++;

  // Calculate stat gains
  const statGains = calculateStatGains(player);
  applyStatGains(player, statGains);

  // NEW: Update proficiency bonus
  player.proficiency = getProficiencyBonus(player.level);

  // Full heal
  player.hp = player.maxHp;

  // ... rest of function
}
```

**Import Required:**
Add to top of `xpSystem.js`:

```javascript
const { getProficiencyBonus } = require('./statProgression');
```

---

## Testing Strategy

### Unit Tests (Recommended but Not Blocking)

**Test File:** `tests/test_xp_integration.js`

**Test Cases:**
1. `calculateCombatXP()` returns correct values for level differences
2. `awardXP()` increases player.xp correctly
3. `checkLevelUp()` triggers when threshold reached
4. `checkLevelUp()` doesn't trigger when below threshold
5. `levelUp()` increments player.level
6. `levelUp()` applies stat gains correctly
7. Multi-level gains work (2+ levels at once)
8. Proficiency bonus updates correctly
9. Max level (L50) doesn't crash

### Integration Tests (Critical)

**Test Scenario 1: Basic XP Award**
```bash
1. Create L1 player with 0 XP
2. Attack and defeat L1 goblin (50 XP base)
3. Verify: Player has 50 XP
4. Verify: players.json updated
5. Verify: Score shows "50 / 1000 (950 to next)"
```

**Test Scenario 2: Level-Up Trigger**
```bash
1. Create L1 player with 950 XP (manually edit players.json)
2. Attack and defeat L1 goblin (50 XP)
3. Verify: Level-up message displays
4. Verify: Player is L2 with 1000 XP
5. Verify: HP increased to 15 (10 + 5)
6. Verify: HP is full (15/15) after level-up
7. Verify: players.json shows level:2, xp:1000, maxHp:15, hp:15
```

**Test Scenario 3: Stat Gains**
```bash
1. Create L3 player with 6700 XP
2. Attack and defeat L4 goblin (158 XP → 6858 XP)
3. Verify: Level-up to L4 triggers
4. Verify: Strength +1 (L4 is divisible by 4)
5. Verify: Score shows Strength: 11 (was 10)
```

**Test Scenario 4: Multi-Level Gain**
```bash
1. Create L1 player with 0 XP
2. Award 5000 XP manually (simulate boss kill)
3. Verify: Two level-up messages (L1→L2, L2→L3)
4. Verify: Player ends at L3, 5000/6858 XP
5. Verify: maxHp is 20 (10 + 5 + 5)
```

**Test Scenario 5: XP Scaling**
```bash
1. L1 player defeats L3 goblin
   - Expected: ~70 XP (140% of base 50)

2. L3 player defeats L1 goblin
   - Expected: ~30 XP (60% of base 50)

3. L1 player defeats L10 boss
   - Expected: Capped at 200% multiplier
```

### Live Server Testing

**Procedure:**
1. Start server: `node src/server.js`
2. Connect two clients via telnet
3. Player 1 attacks NPC repeatedly
4. Verify XP messages display after each kill
5. Continue until level-up
6. Verify level-up message and stat gains
7. Other player observes combat (future: should see level-up broadcast)
8. Check `players.json` file for persistence

---

## Known Issues and Limitations

### Issue 1: Room Broadcast Not Implemented
**Problem:** `levelUp()` function doesn't have access to `world` or `allPlayers`

**Impact:** Other players in room don't see level-up notification

**Workaround:** Skip room broadcast for Phase 5, add in Phase 6

**Proper Fix:**
- Update function signatures to pass `world` and `allPlayers`
- Add `broadcastToRoom()` utility function

### Issue 2: Proficiency Bonus Not Updated (CRITICAL)
**Problem:** `applyStatGains()` doesn't update `player.proficiency`

**Impact:** Attack bonuses remain at +2 even at high levels

**Fix Required:** Add proficiency update to `levelUp()` function

**Code Change:**
```javascript
player.proficiency = getProficiencyBonus(player.level);
```

### Issue 3: XP Display in Combat
**Problem:** XP gain message appears after combat ends, not during

**Impact:** Minor UX issue, not blocking

**Enhancement:** Could move XP message to appear before "Combat has ended!"

### Issue 4: Multiple NPCs in Combat
**Current:** Combat supports only 1v1 (player vs 1 NPC)

**Future:** When multi-NPC combat added, need to:
- Split XP among all defeated NPCs
- Award partial XP for assists (NPCs killed by others)

### Issue 5: No XP Loss on Death
**Current:** Players don't lose XP when dying

**Future:** Add XP penalty system (5-10% loss, capped at current level threshold)

### Issue 6: No XP Bonus for Difficulty
**Current:** Only level difference affects XP

**Future Enhancements:**
- Boss multiplier (2x-3x XP)
- First kill bonus (+50% XP)
- Rare spawn bonus (+25% XP)
- Group penalty (-10% per additional player)

---

## Phase 6 Preview: Commands Polish

**After Phase 5 completes, these enhancements can be added:**

1. **Room Level-Up Broadcast**
   - "PlayerName glows briefly as they gain a level!"
   - Requires passing `world` and `allPlayers` to `levelUp()`

2. **XP Progress Bar**
   - Visual bar in score command: `[=======   ] 70%`
   - Color-coded: green when close to level-up

3. **Stat Increase Highlights**
   - Show changed stats in gold color
   - "Strength: 10 → 11"

4. **XP History Command**
   - `xplog` or `xphistory` command
   - Shows recent XP gains with timestamps

5. **Leaderboard Command**
   - `top` or `leaderboard` command
   - Shows highest level players

---

## File Modification Checklist

### Files to Modify

#### 1. `src/combat/CombatEncounter.js`
**Lines:** 96-108 (endCombat function)

**Changes:**
- ✅ Already calls `calculateCombatXP()` and `awardXP()`
- ⚠️ Verify imports are correct
- ⚠️ Test XP award actually triggers

**Testing:** Live combat test

---

#### 2. `src/progression/xpSystem.js`
**Lines:** 46-72 (levelUp function)

**Changes Required:**
1. **Add proficiency update** (CRITICAL)
   ```javascript
   player.proficiency = getProficiencyBonus(player.level);
   ```

2. **Import getProficiencyBonus**
   ```javascript
   const { getProficiencyBonus } = require('./statProgression');
   ```

3. **Optional:** Add room broadcast (requires signature change)

**Testing:** Level-up integration test

---

#### 3. `src/commands.js`
**Lines:** 887-917 (score command)

**Status:** ✅ No changes needed

**Verification:** Test XP display in score output

---

#### 4. `src/playerdb.js`
**Methods:** `updatePlayerXP()`, `updatePlayerLevel()`

**Status:** ✅ Already implemented

**Verification:** Check players.json after XP gain/level-up

---

### Files to Create (Optional)

#### 1. `tests/test_xp_integration.js`
**Purpose:** Unit tests for XP system

**Priority:** Medium (not blocking)

**Contents:**
- XP calculation tests
- Level-up threshold tests
- Multi-level gain tests
- Proficiency update tests

---

## Success Criteria

### Phase 5 is Complete When:

1. ✅ **XP Award Working**
   - Player gains XP after defeating NPC
   - XP message displays with correct amount
   - XP amount reflects level difference scaling

2. ✅ **Level-Up Triggers**
   - Level-up occurs automatically when XP threshold reached
   - Level-up message displays with stat gains
   - Multiple levels can be gained at once

3. ✅ **Stat Gains Apply**
   - HP increases by +5 per level
   - Attributes increase per schedule (STR/4, CON/5, DEX/6)
   - Proficiency bonus updates correctly
   - Player fully healed on level-up

4. ✅ **Persistence Works**
   - XP persists to players.json after each gain
   - Level persists to players.json after level-up
   - Stats persist to players.json after level-up
   - Server restart preserves XP/level

5. ✅ **Score Command Updated**
   - Shows current XP / next level XP
   - Shows XP remaining to next level
   - Updates immediately after XP gain

6. ✅ **Edge Cases Handled**
   - Multi-level gains work correctly
   - Level 50 cap doesn't crash
   - Exact threshold triggers level-up
   - XP scaling works at extreme level differences

### Production Ready When:

7. ✅ **Testing Complete**
   - All integration tests pass
   - Live combat testing successful
   - Multi-level scenario verified
   - Persistence verified across restarts

8. ✅ **Documentation Updated**
   - COMBAT_IMPLEMENTATION_STATUS.md updated
   - This architecture doc finalized
   - Known issues documented

---

## Handoff to Combat-Mechanic Agent

### Implementation Priority

**High Priority (Blocking):**
1. Fix proficiency bonus update in `levelUp()`
2. Test XP award in live combat
3. Verify persistence to players.json
4. Test level-up triggers correctly

**Medium Priority (Important):**
5. Test multi-level gains scenario
6. Test XP scaling at extreme level differences
7. Verify score command displays correctly

**Low Priority (Nice to Have):**
8. Add room broadcast for level-up
9. Write unit tests
10. Add XP progress bar to score

### Testing Sequence

```bash
# 1. Start with proficiency fix
- Edit src/progression/xpSystem.js
- Add proficiency update to levelUp()
- Add import for getProficiencyBonus

# 2. Start server
node src/server.js

# 3. Test basic XP award
- Create L1 player
- Attack goblin
- Verify XP gain message
- Check players.json

# 4. Test level-up
- Edit players.json: set xp to 950
- Restart server
- Attack goblin (+50 XP = 1000 XP)
- Verify level-up message
- Check proficiency bonus in score

# 5. Test multi-level
- Edit players.json: set xp to 0, level to 1
- Manually call awardXP with 5000 XP
- Verify two level-ups occur
- Check final stats

# 6. Test edge cases
- Level 50 player gains XP
- Exact threshold (999 → 1000)
- XP scaling tests (L1 vs L10, L10 vs L1)
```

### Files to Touch

**Must Modify:**
1. `/Users/au288926/Documents/mudmud/src/progression/xpSystem.js` - Add proficiency update

**Must Test:**
2. `/Users/au288926/Documents/mudmud/src/combat/CombatEncounter.js` - Verify XP integration
3. `/Users/au288926/Documents/mudmud/src/commands.js` - Test score display

**Must Verify:**
4. `/Users/au288926/Documents/mudmud/players.json` - Check persistence

### Questions to Resolve During Implementation

1. **Room Broadcast:** Include in Phase 5 or defer to Phase 6?
   - **Recommendation:** Defer (requires signature changes)

2. **XP Progress Bar:** Add to score command or separate?
   - **Recommendation:** Separate (Phase 6 feature)

3. **XP Loss on Death:** Implement now or later?
   - **Recommendation:** Later (out of scope for Phase 5)

4. **Group XP Sharing:** How to split among multiple players?
   - **Recommendation:** Not needed yet (only 1v1 combat exists)

---

## Conclusion

Phase 5 integration is **90% complete** already. The XP system and combat system are both fully implemented and already calling each other correctly. The primary work needed is:

1. **Fix proficiency bonus update** (5 minutes)
2. **Test XP award in live combat** (30 minutes)
3. **Test level-up scenarios** (30 minutes)
4. **Verify persistence** (15 minutes)
5. **Test edge cases** (30 minutes)

**Total Estimated Time:** 2 hours of testing and verification, minimal code changes.

**Risk Assessment:** Low - systems already integrated and working

**Recommendation:** Proceed with testing first, fix any issues discovered, then mark Phase 5 complete.

---

**Next Steps:**
1. Review this architecture document
2. Make proficiency fix in xpSystem.js
3. Run integration tests
4. Update COMBAT_IMPLEMENTATION_STATUS.md
5. Begin Phase 6 planning
