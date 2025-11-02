# Combat System - Critical Fixes Needed

**Priority:** HIGH
**Estimated Time:** 1-2 hours
**Status:** BLOCKING PHASE 5

---

## Fix 1: Complete XP Table (15 min)

**File:** `/src/progression/xpTable.js`

**Current State:**
```javascript
const XP_TABLE = {
  1: 0,
  2: 1000,
  3: 3000,
  4: 6000,
  5: 10000,
  // ... up to 50  <-- INCOMPLETE!
};
```

**Required:** Add all levels 6-50 following D&D 5e progression or similar exponential curve.

**Example progression:**
- Level 6: 15,000
- Level 7: 21,000
- Level 8: 28,000
- Level 9: 36,000
- Level 10: 45,000
- Continue to level 50...

---

## Fix 2: Correct Proficiency Bonus Formula (5 min)

**File:** `/src/progression/statProgression.js`

**Current (INCORRECT):**
```javascript
function getProficiencyBonus(level) {
  return Math.floor(level / 4) + 1;
}
```

**Issue:**
- Level 1 returns +1 (should be +2)
- Level 4 returns +1 (should be +2)

**Fix (D&D 5e):**
```javascript
function getProficiencyBonus(level) {
  return Math.floor((level - 1) / 4) + 2;
}
```

**Verification:**
- Level 1-4: +2
- Level 5-8: +3
- Level 9-12: +4
- Level 13-16: +5
- Level 17-20: +6

---

## Fix 3: Complete Stat Gains Implementation (10 min)

**File:** `/src/progression/statProgression.js`

**Current (INCOMPLETE):**
```javascript
function calculateStatGains(player) {
  const gains = { hp: 5, strength: 0, dexterity: 0, /* ... */ };

  if (player.level % 4 === 0) {
    gains.strength = 1; // or based on class
  }

  if (player.level % 5 === 0) {
    gains.constitution = 1;
  }

  return gains;
}
```

**Issues:**
- Only strength and constitution defined
- Other stats missing: dexterity, intelligence, wisdom, charisma

**Fix:** Complete the implementation:
```javascript
function calculateStatGains(player) {
  const gains = {
    hp: 5,
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0
  };

  // Every 4 levels: +1 to primary stat (or ASI)
  if (player.level % 4 === 0) {
    gains.strength = 1;  // Or based on class
  }

  // Every 5 levels: +1 CON
  if (player.level % 5 === 0) {
    gains.constitution = 1;
  }

  // Add additional progression rules as needed
  // Example: Every 8 levels, +1 to secondary stat
  if (player.level % 8 === 0) {
    gains.dexterity = 1;
  }

  return gains;
}
```

**Don't forget to add applyStatGains():**
```javascript
function applyStatGains(player, gains) {
  player.maxHp += gains.hp;
  player.strength += gains.strength;
  player.dexterity += gains.dexterity;
  player.constitution += gains.constitution;
  player.intelligence += gains.intelligence;
  player.wisdom += gains.wisdom;
  player.charisma += gains.charisma;
}
```

---

## Fix 4: Initialize NPC Resistances (10 min)

**File:** `/src/world.js` (or wherever NPCs are created)

**Issue:** NPCs missing resistances property, causes crash in combat

**Current:** NPCs likely defined without resistances

**Fix:** Ensure all NPCs have resistances object:
```javascript
// In NPC creation/loading
npc.resistances = npc.resistances || {
  physical: 0,
  fire: 0,
  ice: 0,
  lightning: 0,
  poison: 0,
  necrotic: 0,
  radiant: 0,
  psychic: 0
};
```

**Alternative:** Add defensive check in combatResolver.js:
```javascript
function applyDamage(target, rawDamage, damageType) {
  const resistances = target.resistances || {};  // <-- Add this
  const resistance = resistances[damageType] || 0;
  // ... rest of function
}
```

---

## Fix 5: Export Player Class (2 min)

**File:** `/src/server.js`

**Issue:** Player class not exported, cannot unit test

**Fix:** Add at end of file:
```javascript
module.exports = {
  Player,
  // ... other exports
};
```

---

## Testing After Fixes

Run these commands to verify fixes:

```bash
# 1. Run comprehensive tests
node tests/comprehensivePhaseTests.js

# 2. Check proficiency progression
node -e "const {getProficiencyBonus} = require('./src/progression/statProgression'); for(let i=1; i<=20; i++) console.log('Level', i, '-> Prof', getProficiencyBonus(i))"

# 3. Verify XP table
node -e "const {XP_TABLE, getXPForLevel} = require('./src/progression/xpTable'); for(let i=1; i<=10; i++) console.log('Level', i, ':', getXPForLevel(i))"

# 4. Start server and test combat
node src/server.js &
# ... manual combat testing
```

---

## Validation Checklist

- [ ] XP table has all 50 levels
- [ ] Proficiency bonus matches D&D 5e at levels 1, 4, 5, 8, 9
- [ ] calculateStatGains returns all 7 properties (hp + 6 stats)
- [ ] applyStatGains function exists and applies all gains
- [ ] All NPCs have resistances object
- [ ] Player class can be imported in tests
- [ ] All Phase 1-4 tests pass
- [ ] Live combat works without crashes
- [ ] HP bars display correctly
- [ ] XP awards correctly
- [ ] Level-ups increase all relevant stats

---

**Once these fixes are complete, the combat system will be ready for Phase 5 and production testing.**
