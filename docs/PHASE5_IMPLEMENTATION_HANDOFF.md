# Phase 5 Implementation Handoff

**To:** Combat-Mechanic Agent
**From:** MUD Architect Agent
**Date:** 2025-11-02
**Subject:** Phase 5 XP and Leveling Integration - Implementation Tasks

---

## Executive Summary

Phase 5 is **90% complete**. The XP system and combat system are fully implemented and already integrated. Your primary task is to:

1. **Fix one critical bug** (proficiency bonus not updating)
2. **Test the existing integration** thoroughly
3. **Verify all edge cases** work correctly
4. **Document test results**

**Estimated Time:** 2-4 hours (mostly testing)

---

## Critical Information

### What's Already Working

✅ **XP Award on NPC Death**
- File: `src/combat/CombatEncounter.js` line 103
- Function: `endCombat()` already calls `awardXP()`
- Formula: XP scales with level difference (+20% per level above, -20% below)

✅ **Level-Up Detection**
- File: `src/progression/xpSystem.js` line 30
- Function: `checkLevelUp()` automatically detects threshold
- Supports multi-level gains (recursive)

✅ **Stat Gains Application**
- File: `src/progression/statProgression.js` line 10
- Function: `calculateStatGains()` returns gains object
- Function: `applyStatGains()` applies to player
- Every level: +5 HP, Every 4th: +1 STR, Every 5th: +1 CON, Every 6th: +1 DEX

✅ **Level-Up Messages**
- File: `src/progression/xpSystem.js` line 57
- Formatted with ASCII borders and color
- Shows HP increase and stat gains

✅ **Persistence**
- File: `src/playerdb.js`
- Method: `updatePlayerXP(username, xp)`
- Method: `updatePlayerLevel(username, level, maxHp, hp)`
- Auto-saves to `players.json`

✅ **Score Command**
- File: `src/commands.js` line 887
- Already displays: "XP: 12000 / 20000 (8000 to next)"

### What Needs Fixing

⚠️ **CRITICAL BUG: Proficiency Bonus Not Updated**
- Problem: `levelUp()` doesn't update `player.proficiency`
- Impact: Attack bonuses stay at +2 even at high levels
- Fix: Add one line to `levelUp()` function
- Time: 5 minutes

---

## Implementation Task: Fix Proficiency Bonus

### Step 1: Edit xpSystem.js

**File:** `/Users/au288926/Documents/mudmud/src/progression/xpSystem.js`

**Line 2:** Add import to existing imports:

```javascript
const { calculateStatGains, applyStatGains, getProficiencyBonus } = require('./statProgression');
```

**Change FROM (line 2):**
```javascript
const { calculateStatGains, applyStatGains } = require('./statProgression');
```

**Change TO:**
```javascript
const { calculateStatGains, applyStatGains, getProficiencyBonus } = require('./statProgression');
```

---

**Line 46-55:** Add proficiency update to `levelUp()` function:

**Change FROM:**
```javascript
function levelUp(player, playerDB) {
  player.level++;

  // Increase stats
  const statGains = calculateStatGains(player);
  applyStatGains(player, statGains);

  // Full heal on level-up
  player.hp = player.maxHp;

  // ... rest of function
}
```

**Change TO:**
```javascript
function levelUp(player, playerDB) {
  player.level++;

  // Update proficiency bonus (CRITICAL FIX)
  player.proficiency = getProficiencyBonus(player.level);

  // Increase stats
  const statGains = calculateStatGains(player);
  applyStatGains(player, statGains);

  // Full heal on level-up
  player.hp = player.maxHp;

  // ... rest of function
}
```

### Step 2: Verify the Fix

**Test Proficiency Progression:**
```
Level 1-4:  +2 proficiency
Level 5-8:  +3 proficiency
Level 9-12: +4 proficiency
Level 13-16: +5 proficiency
Level 17-20: +6 proficiency
```

**Quick Test:**
1. Create L1 player with 0 XP
2. Edit `players.json` to set `xp: 19000` (just below L5)
3. Restart server, login
4. Check score: should show proficiency +2
5. Attack goblin to level up to L5
6. Check score: should show proficiency +3 ✅

---

## Testing Tasks

### Test 1: Basic XP Award (15 minutes)

**Objective:** Verify XP awards on NPC defeat

**Procedure:**
```bash
# 1. Start server
node src/server.js

# 2. Connect via telnet
telnet localhost 4000

# 3. Login as new character (L1, 0 XP)

# 4. Navigate to Wumpie Deathmatch Arena
> south
> south
> south

# 5. Attack Gronk the Cannibal (L5 NPC)
> attack gronk

# 6. Wait for combat to resolve (3-4 rounds)

# Expected output:
# - Combat messages with attacks/damage
# - "Gronk the Cannibal has been defeated!"
# - "You gain X XP! (combat)"
# - Combat has ended!

# 7. Check XP in score
> score

# Expected:
# Level: 1
# XP: [some number] / 1000 ([remaining] to next)
```

**Success Criteria:**
- ✅ XP gain message appears after NPC dies
- ✅ XP amount is reasonable (50-200 for L1 vs L5)
- ✅ Score command shows updated XP
- ✅ `players.json` contains updated XP value

**Record Results:**
- XP awarded: ___
- XP formula correct: Y/N
- Persistence works: Y/N

---

### Test 2: Level-Up Trigger (20 minutes)

**Objective:** Verify level-up occurs at threshold

**Setup:**
```bash
# 1. Stop server
# 2. Edit players.json
# 3. Find your character entry
# 4. Set: "xp": 950, "level": 1
# 5. Save file
# 6. Restart server
```

**Procedure:**
```bash
# 1. Login to character (should be L1, 950 XP)
> score
# Verify: XP: 950 / 1000 (50 to next)

# 2. Attack low-level NPC
> attack [target]

# 3. Wait for combat to end

# Expected output:
# - "You gain 50+ XP! (combat)"
# - Level-up message with borders
# - "LEVEL UP! You are now level 2!"
# - "Max HP: 10 → 15 (+5)"
# - "You have been fully healed!"

# 4. Check score
> score

# Expected:
# Level: 2
# XP: 1000+ / 2027
# HP: 15 / 15 (full)
# Proficiency should be +2 (still, until L5)
```

**Success Criteria:**
- ✅ Level-up triggers at exactly 1000 XP
- ✅ Level-up message displays correctly
- ✅ HP increases to 15
- ✅ Current HP is full (15/15)
- ✅ XP persists in players.json
- ✅ Level persists in players.json

**Record Results:**
- Level-up triggered: Y/N
- HP increased correctly: Y/N
- Full heal applied: Y/N
- Proficiency at L2: ___

---

### Test 3: Proficiency Bonus Update (15 minutes)

**Objective:** Verify proficiency increases at L5

**Setup:**
```bash
# Edit players.json
# Set: "xp": 19000, "level": 4
# This puts player at L4, needing 1000 more XP to reach L5
```

**Procedure:**
```bash
# 1. Login (should be L4)
> score
# Expected: Proficiency: +2 (or check in combat attack rolls)

# 2. Attack NPC to gain ~1000+ XP
> attack [target]

# 3. Verify level-up to L5
# Expected: "LEVEL UP! You are now level 5!"

# 4. Check score
> score

# Expected:
# Level: 5
# HP: 30 / 30
# Proficiency: +3 ← CRITICAL: Must be +3, not +2

# 5. Attack another NPC to verify attack bonus
> attack [target]

# Expected combat message:
# "You roll [15] (total: 18)" ← 15 (roll) + 3 (prof) + 0 (STR mod) = 18
# NOT 17 (which would be 15 + 2 + 0)
```

**Success Criteria:**
- ✅ Proficiency is +2 at L4
- ✅ Proficiency increases to +3 at L5
- ✅ Attack rolls use new proficiency bonus
- ✅ Proficiency persists in players.json

**Record Results:**
- Proficiency at L4: ___
- Proficiency at L5: ___
- Attack bonus correct: Y/N

---

### Test 4: Multi-Level Gains (20 minutes)

**Objective:** Verify recursive level-up for multiple levels

**Setup:**
```bash
# Edit players.json
# Set: "xp": 0, "level": 1, "maxHp": 10, "hp": 10
```

**Procedure:**
```bash
# 1. Start server and login

# 2. Use manual XP award (create test script)
# Create: tests/test_multi_level.js

const { awardXP } = require('../src/progression/xpSystem');

// This simulates killing a high-level boss
player.xp = 0;
player.level = 1;
awardXP(player, 5000, 'test', playerDB);

# Expected output:
# - First level-up message (L1 → L2)
# - Second level-up message (L2 → L3)
# - Final state: L3, 5000/6858 XP

# 3. Verify final stats
> score

# Expected:
# Level: 3
# XP: 5000 / 6858 (1858 to next)
# HP: 20 / 20 (10 + 5 + 5)
```

**Success Criteria:**
- ✅ Two level-ups occur automatically
- ✅ Both level-up messages display
- ✅ HP increases twice (+5 per level = 20 total)
- ✅ Final level is L3, not L2
- ✅ XP is 5000, not reset

**Record Results:**
- Level-ups triggered: ___
- Final level: ___
- Final HP: ___
- Final XP: ___

---

### Test 5: XP Scaling (20 minutes)

**Objective:** Verify XP scales with level difference

**Test Cases:**

**Case 1: Even Level (L1 vs L1)**
```bash
# L1 player attacks L1 goblin (base 50 XP)
# Expected: 50 XP (100%)
```

**Case 2: Higher Level NPC (L1 vs L3)**
```bash
# L1 player attacks L3 NPC
# Level diff: +2
# Multiplier: 1 + (2 * 0.2) = 1.4
# Expected: 50 * 1.4 = 70 XP (140%)
```

**Case 3: Lower Level NPC (L3 vs L1)**
```bash
# L3 player attacks L1 goblin
# Level diff: -2
# Multiplier: 1 + (-2 * 0.2) = 0.6
# Expected: 50 * 0.6 = 30 XP (60%)
```

**Case 4: Much Higher (L1 vs L10)**
```bash
# L1 player attacks L10 boss
# Level diff: +9
# Multiplier: 1 + (9 * 0.2) = 2.8 → capped at 2.0
# Expected: (L10 base XP) * 2.0 (200% cap)
```

**Case 5: Much Lower (L10 vs L1)**
```bash
# L10 player attacks L1 trash mob
# Level diff: -9
# Multiplier: 1 + (-9 * 0.2) = -0.8 → floored at 0.1
# Expected: 50 * 0.1 = 5 XP (10% floor)
```

**Success Criteria:**
- ✅ XP increases for higher-level NPCs
- ✅ XP decreases for lower-level NPCs
- ✅ XP caps at 200% multiplier
- ✅ XP floors at 10% multiplier

**Record Results:**
- Even level (L1 vs L1): ___ XP
- Higher (L1 vs L3): ___ XP
- Lower (L3 vs L1): ___ XP
- Much higher cap: verified Y/N
- Much lower floor: verified Y/N

---

### Test 6: Persistence (15 minutes)

**Objective:** Verify XP/level persists across restart

**Procedure:**
```bash
# 1. Start server, login
# 2. Gain some XP (don't level up)
# 3. Check score, note XP value
# 4. Stop server (Ctrl+C)
# 5. Check players.json file
# 6. Verify XP matches what was in score
# 7. Restart server
# 8. Login again
# 9. Check score
# 10. Verify XP is still the same

# 11. Now level up
# 12. Check score, note level and HP
# 13. Stop server
# 14. Check players.json
# 15. Verify level and HP match
# 16. Restart server
# 17. Login
# 18. Verify level and HP still match
```

**Success Criteria:**
- ✅ XP persists after server restart
- ✅ Level persists after server restart
- ✅ HP persists after server restart
- ✅ All stats persist after server restart

**Record Results:**
- XP persistence: Y/N
- Level persistence: Y/N
- HP persistence: Y/N
- Stats persistence: Y/N

---

### Test 7: Edge Cases (20 minutes)

**Edge Case 1: Exact Threshold**
```bash
# Set player to 999 XP (1 below L2 threshold of 1000)
# Gain exactly 1 XP
# Expected: Level-up triggers at 1000
```

**Edge Case 2: Max Level (L50)**
```bash
# Edit players.json: "level": 50
# Attack NPC
# Expected: XP increases, but no level-up (max level reached)
```

**Edge Case 3: NPC with no xpReward**
```bash
# Create NPC without xpReward property
# Formula falls back to: npc.level * 50
# L3 NPC = 150 XP base
# Expected: Calculates correctly without crashing
```

**Edge Case 4: Full Heal on Level-Up**
```bash
# Set player to 5/15 HP, 950 XP
# Gain 50 XP to level up
# Expected: HP goes to 20/20 (full), not 10/20
```

**Success Criteria:**
- ✅ Exact threshold triggers level-up
- ✅ Level 50 doesn't crash
- ✅ Missing xpReward uses fallback
- ✅ Full heal works correctly

**Record Results:**
- Exact threshold: Y/N
- L50 handling: Y/N
- Fallback XP: Y/N
- Full heal: Y/N

---

## Test Results Template

```markdown
# Phase 5 Test Results

**Date:** ___________
**Tester:** ___________
**Server Version:** ___________

## Proficiency Fix
- [ ] Import added to xpSystem.js
- [ ] Proficiency update added to levelUp()
- [ ] Proficiency increases at L5
- [ ] Attack rolls use new proficiency

## Test 1: Basic XP Award
- [ ] XP gain message displays
- [ ] XP amount is correct
- [ ] Score shows updated XP
- [ ] Persistence works
- XP awarded: ___
- Formula verified: Y/N

## Test 2: Level-Up Trigger
- [ ] Level-up at 1000 XP
- [ ] Level-up message displays
- [ ] HP increases to 15
- [ ] Full heal applied
- [ ] Persistence works
- Final stats: L___, HP ___/___, XP ___/___

## Test 3: Proficiency Update
- [ ] Proficiency +2 at L4
- [ ] Proficiency +3 at L5
- [ ] Attack rolls updated
- [ ] Persistence works
- Proficiencies: L4=___, L5=___

## Test 4: Multi-Level Gains
- [ ] Two level-ups occurred
- [ ] Both messages displayed
- [ ] HP increased twice
- [ ] Final stats correct
- Final stats: L___, HP ___/___, XP ___/___

## Test 5: XP Scaling
- [ ] Even level correct
- [ ] Higher level correct
- [ ] Lower level correct
- [ ] Cap at 200%
- [ ] Floor at 10%
- XP values: L1vsL1=___, L1vsL3=___, L3vsL1=___

## Test 6: Persistence
- [ ] XP persists
- [ ] Level persists
- [ ] HP persists
- [ ] Stats persist

## Test 7: Edge Cases
- [ ] Exact threshold works
- [ ] L50 doesn't crash
- [ ] Missing xpReward works
- [ ] Full heal works

## Overall Results
- Total tests: 7
- Passed: ___/7
- Failed: ___/7
- Blocking issues: ___

## Blockers (if any)
[List any critical issues found]

## Notes
[Any additional observations]

## Sign-Off
Phase 5 ready for production: Y/N
Signature: ___________
Date: ___________
```

---

## Success Criteria Summary

Phase 5 is **COMPLETE** when:

1. ✅ Proficiency fix applied and tested
2. ✅ Basic XP award works in live combat
3. ✅ Level-up triggers at threshold
4. ✅ Proficiency bonus updates at L5, L9, L13
5. ✅ Multi-level gains work
6. ✅ XP scaling verified (even/higher/lower levels)
7. ✅ Persistence works (XP, level, HP, stats)
8. ✅ All edge cases handled
9. ✅ Test results documented
10. ✅ No blocking bugs found

---

## Files You Need to Touch

**Must Edit:**
- `/Users/au288926/Documents/mudmud/src/progression/xpSystem.js`
  - Line 2: Add `getProficiencyBonus` to import
  - Line 47: Add proficiency update to `levelUp()`

**Must Test:**
- `/Users/au288926/Documents/mudmud/src/combat/CombatEncounter.js` (verify integration)
- `/Users/au288926/Documents/mudmud/src/commands.js` (verify score display)

**Must Verify:**
- `/Users/au288926/Documents/mudmud/players.json` (persistence)

**Documentation:**
- Create test results document
- Update `docs/COMBAT_IMPLEMENTATION_STATUS.md` with test results
- Mark Phase 5 checkboxes complete

---

## Reference Materials

**Full Architecture:**
- `/Users/au288926/Documents/mudmud/docs/PHASE5_INTEGRATION_ARCHITECTURE.md`

**Combat Status:**
- `/Users/au288926/Documents/mudmud/docs/COMBAT_IMPLEMENTATION_STATUS.md`

**XP Architecture:**
- `/Users/au288926/Documents/mudmud/docs/COMBAT_XP_ARCHITECTURE.md`

**XP Table Reference:**
```
L1 → L2: 1,000 XP
L2 → L3: 2,027 XP
L3 → L4: 3,831 XP
L4 → L5: 6,135 XP (Proficiency +2 → +3)
L5 → L6: 8,871 XP
```

**Proficiency Schedule:**
```
L1-4: +2
L5-8: +3
L9-12: +4
L13-16: +5
L17-20: +6
```

---

## Questions?

If you encounter issues during implementation:

1. **Check the architecture doc** for detailed flow diagrams
2. **Verify imports** are correct at the top of files
3. **Check the logs** in console output for errors
4. **Test incrementally** - fix one thing, test it, move on
5. **Document any bugs found** in a new file: `docs/PHASE5_BUGS.md`

---

## Final Notes

This is a **verification and testing phase**, not a development phase. 90% of the work is already done. Your job is to:

1. Apply the one-line proficiency fix
2. Test everything thoroughly
3. Document the results
4. Mark Phase 5 complete

**Good luck, and happy testing!**

---

**End of Handoff Document**
