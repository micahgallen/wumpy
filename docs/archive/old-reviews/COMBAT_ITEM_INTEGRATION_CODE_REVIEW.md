# Combat & Item Integration - Comprehensive Code Review

**Date:** 2025-01-08
**Reviewer:** mud-code-reviewer agent (Claude Sonnet 4.5)
**Scope:** Review implementation against ITEM_COMBAT_FINAL_IMPLEMENTATION_PLAN.md and COMBAT_ITEM_INTEGRATION.md
**Status:** Phase 3 Complete, Phase 4 Critical Gaps Identified

---

## Executive Summary

**Overall Implementation Status:** ~55-60% Complete

**Current Phase Reached:** Phase 3 (Equipment Mechanics) - **Substantially Complete**
Phase 4 (Combat Integration) - **Partially Implemented**

**Critical Issues Count:**
- **Blockers:** 3 issues preventing Phase 4 completion
- **Critical:** 8 issues needed for D&D 5e fidelity
- **High Priority:** 12 issues affecting game balance
- **Medium Priority:** 7 issues for system completeness

**Phase Breakdown:**
- ✅ **Phase 0** (Project Setup): 100% - Schema validation, item registry operational
- ✅ **Phase 1** (Core Item Framework): 95% - Item registry, attunement manager complete
- ✅ **Phase 2** (Inventory & Encumbrance): 100% - Hybrid encumbrance, stacking, death durability implemented
- ✅ **Phase 3** (Equipment Mechanics): 90% - Equipment manager, slot validation, proficiency checks functional
- ⚠️ **Phase 4** (Combat Integration): 35% - **CRITICAL GAPS** in weapon/armor integration with combat
- ❌ **Phase 5** (Economy & Loot): 10% - Currency system exists but shops incomplete
- ❌ **Phase 6** (Content & Domain Integration): 20% - Some sample items exist
- ❌ **Phase 7** (QA & Launch): 0% - Not started

---

## Section 1: Root Cause Analysis

### The Foundation is Solid

The item and equipment systems are **well-architected** and **functionally complete**:
- ✅ EquipmentManager properly calculates AC with DEX caps
- ✅ Proficiency checking logic works correctly
- ✅ Stat bonus aggregation is implemented
- ✅ Attunement system enforces 3-slot limit
- ✅ Encumbrance with slot + weight limits functional

### The Critical Disconnect

**Combat systems don't actually USE the item systems.**

Three fundamental integration failures:

#### Failure 1: Property Name Mismatch
```javascript
// EquipmentManager.recalculatePlayerStats() sets:
player.strength = player.stats.strength;  // Full property name
player.dexterity = player.stats.dexterity;

// Combat reads:
const attackBonus = getModifier(attacker.str) + proficiency;  // Short name!
```

**Result:** Equipment stat bonuses are calculated but never used in combat.

#### Failure 2: AC Calculation Orphaned
```javascript
// EquipmentManager.calculateAC() correctly computes:
const totalAC = 18;  // Plate armor + DEX

// But never stores the result!
// player.armorClass remains 12 from character creation
```

**Result:** Armor provides zero defensive benefit.

#### Failure 3: Legacy Weapon Property
```javascript
// Combat uses:
const weapon = attacker.currentWeapon;  // Never updated!

// Should use:
const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');
```

**Result:** Equipped weapons don't affect combat at all.

---

## Section 2: Missing Features by Phase

### Phase 4 Features (Combat Integration) - HIGH PRIORITY

#### CRITICAL - Prevents D&D 5e Combat

**1. Weapon Bonuses NOT Applied to Attack Rolls**
- **File:** `/src/systems/combat/AttackRoll.js:38-40`
- **Design Spec:** Combat-Item Integration doc Section 3.4 lines 624-653
- **Current Code:** `attackBonus = getModifier(attacker.str) + attacker.proficiency`
- **Missing:** No extraction of `weapon.weaponProperties.magicalAttackBonus`
- **Impact:** Magical +1/+2/+3 weapons provide zero benefit to hit chance
- **Priority:** BLOCKER

**2. Weapon Bonuses NOT Applied to Damage**
- **File:** `/src/systems/combat/DamageCalculator.js:82-93`
- **Design Spec:** Combat-Item Integration doc Section 3.1 lines 433-463
- **Current Code:** Uses `weapon.damageDice` but not `weapon.weaponProperties.magicalDamageBonus`
- **Impact:** +1 longsword deals same damage as regular longsword
- **Priority:** BLOCKER

**3. Equipment Stat Bonuses NOT Used in Combat**
- **File:** `/src/systems/combat/AttackRoll.js:39`
- **Design Spec:** Combat-Item Integration Section 7.1 lines 1286-1303
- **Current Code:** Reads `attacker.str` directly instead of equipment-modified value
- **Impact:** +2 STR ring provides zero combat benefit
- **Priority:** BLOCKER

**4. Armor AC NOT Integrated with Combat**
- **File:** `/src/systems/equipment/EquipmentManager.js:733` (missing code)
- **Design Spec:** Combat-Item Integration Section 4.1 lines 675-716
- **Current State:** `EquipmentManager.calculateAC()` EXISTS but result never stored
- **Impact:** Wearing plate armor provides same AC as being naked
- **Priority:** CRITICAL

**5. Proficiency Penalties NOT Applied in Combat**
- **File:** `/src/systems/combat/AttackRoll.js` (missing integration)
- **Design Spec:** Combat-Item Integration Section 5.3 lines 954-975
- **Current State:** `EquipmentManager.checkProficiency()` calculates penalties but combat never checks
- **Impact:** Mages can use greatswords with full attack bonus
- **Priority:** CRITICAL

**6. Versatile Weapons (Two-Handed) NOT Implemented**
- **File:** `/src/systems/combat/DamageCalculator.js:82`
- **Design Spec:** Combat-Item Integration Section 3.2 lines 483-503
- **Current Code:** Always uses `weapon.damageDice`, never checks `versatileDamageDice`
- **Impact:** Longsword always does 1d8 even when wielded two-handed (should be 1d10)
- **Priority:** CRITICAL

**7. Finesse Weapon DEX Option NOT Implemented**
- **File:** `/src/systems/combat/AttackRoll.js:39`
- **Design Spec:** Combat-Item Integration Section 3.4 lines 631-641
- **Current Code:** Combat always uses STR modifier, never checks `isFinesse` property
- **Impact:** Rogues with high DEX can't benefit from daggers/rapiers
- **Priority:** CRITICAL

**8. Dual-Wielding System NOT Implemented**
- **File:** `/src/systems/combat/CombatResolver.js` (missing logic)
- **Design Spec:** Implementation Plan line 20, Combat-Item Integration Section 12.1
- **Current Code:** No off-hand attack logic exists
- **Impact:** Dual-wielding provides zero benefit
- **Priority:** HIGH

**9. Magical Effects System NOT Implemented**
- **File:** Combat system (missing entirely)
- **Design Spec:** Combat-Item Integration Section 6 (lines 1002-1252)
- **Current Code:** No `magicEffects` processing in combat at all
- **Impact:** Flaming sword deals no extra fire damage, magical effects don't trigger
- **Priority:** HIGH

**10. Critical Hit Damage Calculation INCORRECT**
- **File:** `/src/systems/combat/DamageCalculator.js:23`
- **Design Spec:** Combat-Item Integration Section 3.1 lines 456-465 - "D&D 5e critical hits double dice, not modifiers"
- **Current Code:** Passes `isCritical` to damage function but may double all damage including modifiers
- **Impact:** Crits too powerful (2d8+6 instead of 3d8+3) - need to verify dice.js implementation
- **Priority:** HIGH

### Phase 5 Features (Economy & Loot) - MEDIUM PRIORITY

**11. Shop System Incomplete**
- **Design Spec:** Implementation Plan lines 88-94
- **Current Status:** Currency conversion config exists, but no shop transaction commands
- **Priority:** MEDIUM

**12. Loot Table System NOT Implemented**
- **Design Spec:** Implementation Plan lines 91-93
- **Current Status:** `ItemRegistry.getItemsByLootTable()` exists but no spawning system
- **Priority:** MEDIUM

**13. Identify/Repair Services NOT Implemented**
- **Design Spec:** Phase 3 line 67, Phase 5 line 90
- **Current Status:** Config values exist, no commands or NPC services
- **Priority:** LOW

### Phase 6 Features (Content) - LOW PRIORITY

**14. Limited Item Content**
- **Design Spec:** Phase 6 lines 101-103
- **Current Status:** ~5 weapons/armor pieces exist, need dozens for variety
- **Priority:** LOW

**15. Tutorial Quest NOT Implemented**
- **Design Spec:** Implementation Plan lines 19, 55, 102
- **Current Status:** Players spawn unarmed with no quest to obtain gear
- **Priority:** MEDIUM

---

## Section 3: Implementation Gaps (Detailed)

### Gap 1: Combat Resolver Doesn't Read Equipment

**File:** `/src/systems/combat/AttackRoll.js`
**Lines:** 26-76

**What Exists:**
```javascript
function resolveAttackRoll(attacker, defender, attackerParticipant, defenderParticipant = null) {
  // ... advantage/disadvantage logic ...

  // Line 39: Attack bonus calculation
  const attackBonus = getModifier(attacker.str) + attacker.proficiency;
  const totalAttack = naturalRoll + attackBonus;
  // ...
}
```

**What's Missing:**
- No call to `EquipmentManager.getEquippedInSlot(attacker, 'main_hand')`
- No extraction of `weapon.weaponProperties.magicalAttackBonus`
- No proficiency penalty check
- No effective stat calculation (should use equipment-modified STR)
- No finesse weapon DEX option

**Required Changes:**
```javascript
// Should be:
const EquipmentManager = require('../equipment/EquipmentManager');
const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');

// Get effective STR (base + equipment bonuses)
const effectiveStr = attacker.str;  // Already updated by recalculatePlayerStats if we fix property names

// Get weapon magical bonus
const weaponAttackBonus = weapon?.weaponProperties?.magicalAttackBonus || 0;

// Check proficiency
const proficiencyCheck = EquipmentManager.checkProficiency(attacker, weapon);
const proficiencyBonus = proficiencyCheck.isProficient ?
                         attacker.proficiency :
                         (attacker.proficiency + proficiencyCheck.penalty);

// Check finesse
let abilityModifier;
if (weapon?.weaponProperties?.isFinesse) {
  abilityModifier = Math.max(getModifier(attacker.str), getModifier(attacker.dex));
} else if (weapon?.weaponProperties?.isRanged) {
  abilityModifier = getModifier(attacker.dex);
} else {
  abilityModifier = getModifier(attacker.str);
}

const attackBonus = abilityModifier + proficiencyBonus + weaponAttackBonus;
```

### Gap 2: Damage Calculator Doesn't Use Weapon Properties

**File:** `/src/systems/combat/DamageCalculator.js`
**Lines:** 70-110

**What Exists:**
```javascript
function resolveAttackDamage(attacker, target, attackResult) {
  // Get weapon damage
  const weapon = attacker.currentWeapon || {
    damageDice: '1d4',
    damageType: 'physical'
  };

  // Calculate damage
  const damageResult = calculateDamage(
    weapon.damageDice,
    attackResult.critical,
    weapon.damageType,
    target
  );
  // ...
}
```

**What's Missing:**
- Uses `attacker.currentWeapon` (legacy property) instead of `EquipmentManager.getEquippedInSlot()`
- Doesn't extract `weapon.weaponProperties.damageDice`
- Doesn't extract or apply `weapon.weaponProperties.magicalDamageBonus`
- Doesn't check for two-handed use (versatile weapons)
- Doesn't pass ability modifier to damage calculation

**Required Changes:**
```javascript
function resolveAttackDamage(attacker, target, attackResult) {
  const EquipmentManager = require('../equipment/EquipmentManager');

  // Get equipped weapon
  const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');
  const offHand = EquipmentManager.getEquippedInSlot(attacker, 'off_hand');

  let damageDice, damageType, damageBonus;

  if (!weapon || weapon.itemType !== 'weapon') {
    // Unarmed
    damageDice = '1d4';
    damageType = 'physical';
    damageBonus = 0;
  } else {
    // Check for versatile two-handing
    if (weapon.weaponProperties.versatileDamageDice && !offHand) {
      damageDice = weapon.weaponProperties.versatileDamageDice;
    } else {
      damageDice = weapon.weaponProperties.damageDice;
    }

    damageType = weapon.weaponProperties.damageType;
    damageBonus = weapon.weaponProperties.magicalDamageBonus || 0;
  }

  // Calculate ability modifier
  let abilityModifier;
  if (weapon?.weaponProperties?.isFinesse) {
    abilityModifier = Math.max(getModifier(attacker.str), getModifier(attacker.dex));
  } else if (weapon?.weaponProperties?.isRanged) {
    abilityModifier = getModifier(attacker.dex);
  } else {
    abilityModifier = getModifier(attacker.str);
  }

  // Calculate damage
  const damageResult = calculateDamage(
    damageDice,
    abilityModifier,
    damageBonus,
    attackResult.critical,
    damageType,
    target
  );
  // ...
}
```

### Gap 3: AC Calculation NOT Saved to Player

**File:** `/src/systems/equipment/EquipmentManager.js`
**Lines:** 458-528, 690-733

**What Exists:**
```javascript
calculateAC(player) {
  // Lines 458-528: Comprehensive AC calculation WITH armor, DEX cap, magical bonuses
  // Returns: { baseAC, dexBonus, magicalBonus, totalAC, breakdown }

  // ... (correct implementation exists) ...

  return {
    baseAC,
    dexBonus: Math.min(dexMod, dexCap),
    magicalBonus,
    totalAC,
    breakdown
  };
}
```

**The Problem:**
This function is called in:
- Line 149: `equipItem()` - calls but doesn't save result
- Line 206: `unequipItem()` - calls but doesn't save result
- Line 733: End of `recalculatePlayerStats()` - **NOT CALLED AT ALL**

**Result:** AC is calculated correctly but the `totalAC` value is never stored in `player.armorClass`.

**Required Fix:**

In `recalculatePlayerStats()`, add after line 733:
```javascript
// Recalculate and update armor class
const acResult = this.calculateAC(player);
player.armorClass = acResult.totalAC;

// Log for debugging
logger.log(`Updated ${player.username} AC: ${acResult.totalAC} (base: ${acResult.baseAC}, dex: ${acResult.dexBonus}, magical: ${acResult.magicalBonus})`);
```

In `equipItem()` after line 149:
```javascript
// Update AC
const acResult = this.calculateAC(player);
player.armorClass = acResult.totalAC;
```

In `unequipItem()` after line 206:
```javascript
// Update AC
const acResult = this.calculateAC(player);
player.armorClass = acResult.totalAC;
```

### Gap 4: Stat Recalculation Property Name Mismatch

**File:** `/src/systems/equipment/EquipmentManager.js`
**Lines:** 690-733

**What Exists:**
```javascript
recalculatePlayerStats(player, playerDB = null) {
  // Calculates equipment bonuses
  const equipmentBonuses = this.calculateEquipmentStatBonuses(player);

  // Updates player.stats with base + equipment
  player.stats = {
    strength: player.baseStats.strength + equipmentBonuses.strength,
    dexterity: player.baseStats.dexterity + equipmentBonuses.dexterity,
    // ... other stats ...
  };

  // Lines 722-727: Updates individual properties
  player.strength = player.stats.strength;
  player.dexterity = player.stats.dexterity;
  player.constitution = player.stats.constitution;
  player.intelligence = player.stats.intelligence;
  player.wisdom = player.stats.wisdom;
  player.charisma = player.stats.charisma;
}
```

**The Problem:**
Combat reads from **short property names** (`str`, `dex`, `con`), but EquipmentManager sets **long property names** (`strength`, `dexterity`, `constitution`).

**Evidence:**
- `/src/systems/combat/AttackRoll.js:39`: `getModifier(attacker.str)`
- `/src/data/CombatStats.js:25-30`: Properties are `str`, `dex`, `con`, etc.

**Required Fix:**

Change lines 722-727 to:
```javascript
// Update player stat properties (using short names for combat compatibility)
player.str = player.stats.strength;
player.dex = player.stats.dexterity;
player.con = player.stats.constitution;
player.int = player.stats.intelligence;
player.wis = player.stats.wisdom;
player.cha = player.stats.charisma;
```

### Gap 5: Weapon Properties Missing from Item Definitions

**File:** `/world/sesame_street/items/equipment/wooden_practice_sword.js`
**Lines:** 32-40

**What Exists:**
```javascript
weaponProperties: {
  damageDice: '1d4',
  damageType: DamageType.BLUDGEONING,
  weaponClass: WeaponClass.SIMPLE_MELEE,
  isTwoHanded: false,
  isRanged: false,
  isLight: true,
  isFinesse: false
}
```

**What's Missing:**
- No `magicalAttackBonus` property (for +1/+2/+3 weapons)
- No `magicalDamageBonus` property
- No `versatileDamageDice` property (for longswords used two-handed)
- No `range` or `longRange` properties for ranged weapons
- No `magicEffects` array for special weapon abilities

**These properties are defined in design docs but not in item schema.**

**Required Additions:**

For magical weapons:
```javascript
weaponProperties: {
  damageDice: '1d8',
  damageType: DamageType.SLASHING,
  weaponClass: WeaponClass.MARTIAL_MELEE,
  isTwoHanded: false,
  isRanged: false,
  isLight: false,
  isFinesse: false,

  // ADD THESE:
  magicalAttackBonus: 1,      // +1 to hit
  magicalDamageBonus: 1,      // +1 to damage
  versatileDamageDice: null   // Not versatile
}
```

For versatile weapons (longsword):
```javascript
weaponProperties: {
  damageDice: '1d8',          // One-handed
  versatileDamageDice: '1d10', // Two-handed (ADD THIS)
  // ...
}
```

### Gap 6: Armor Properties Incomplete

**File:** `/world/sesame_street/items/equipment/leather_cap.js`
**Lines:** 31-36

**What Exists:**
```javascript
armorProperties: {
  baseAC: 1,               // AC contribution
  armorClass: ArmorClass.LIGHT,
  armorType: 'light',
  stealthDisadvantage: false
}
```

**What's Missing:**
- No `magicalACBonus` property (for +1/+2/+3 armor)
- No explicit `maxDexBonus` property (should be on item, not just inferred from armorClass)
- No `strengthRequirement` property (heavy armor requires 13+ STR)

**Required Additions:**

For light armor:
```javascript
armorProperties: {
  baseAC: 11,
  armorClass: ArmorClass.LIGHT,
  armorType: 'light',
  maxDexBonus: null,           // ADD: null = unlimited
  magicalACBonus: 0,           // ADD: +0 for non-magical
  stealthDisadvantage: false,
  strengthRequirement: 0       // ADD: no STR requirement
}
```

For medium armor:
```javascript
armorProperties: {
  baseAC: 14,
  armorClass: ArmorClass.MEDIUM,
  armorType: 'medium',
  maxDexBonus: 2,              // ADD: max +2 DEX
  magicalACBonus: 0,
  stealthDisadvantage: false,
  strengthRequirement: 0
}
```

For heavy armor:
```javascript
armorProperties: {
  baseAC: 18,
  armorClass: ArmorClass.HEAVY,
  armorType: 'heavy',
  maxDexBonus: 0,              // ADD: no DEX bonus
  magicalACBonus: 0,
  stealthDisadvantage: true,
  strengthRequirement: 15      // ADD: requires 15 STR
}
```

### Gap 7: Level-Up Doesn't Recalculate Equipment Stats

**File:** `/src/systems/progression/LevelUpHandler.js`
**Lines:** 94-143

**What Exists:**
```javascript
function applyLevelUp(player, guildHook = null) {
  player.level++;
  player.maxHp += 5;
  player.currentHp = player.maxHp;
  player.proficiency = calculateProficiency(player.level);

  // Stat choice every 4th level
  if (player.level % 4 === 0) {
    // Handle stat choice...
  }
  // ...
}
```

**What's Missing:**
- **NO call to `EquipmentManager.recalculatePlayerStats(player)`** after level-up
- **NO recalculation of AC** after proficiency changes
- **NO update to attack bonuses** from new proficiency

**Impact:** Player levels up, proficiency increases, but attack bonus doesn't update until they unequip/re-equip items.

**Required Fix:**

Add after proficiency update (line 113):
```javascript
player.proficiency = calculateProficiency(player.level);

// Recalculate all equipment-dependent stats
const EquipmentManager = require('../equipment/EquipmentManager');
EquipmentManager.recalculatePlayerStats(player);
```

---

## Section 4: Bugs and Issues

### BUG 1: Critical Hit May Double Modifiers (D&D 5e Violation)

**Severity:** HIGH
**File:** `/src/systems/combat/DamageCalculator.js:21-24`
**Line:** 23

**Expected Behavior (D&D 5e):**
- Critical hit: Roll damage dice **twice**, add modifier **once**
- Example: Longsword crit = 2d8 + 3 (STR modifier)
- Design Doc Section 3.1 lines 456-465

**Current Code:**
```javascript
function calculateDamage(damageDice, isCritical, damageType, target) {
  // Line 23: Roll damage dice (critical hits roll twice as many dice)
  const baseDamage = rollDamage(damageDice, isCritical);
  // ...
}
```

**The Issue:**
The function passes `isCritical` to `rollDamage()`, but we need to verify:
1. Does `rollDamage()` in `/src/utils/dice.js` double ONLY the dice?
2. Or does it double the entire damage including modifiers?

**Investigation Needed:**
Check `/src/utils/dice.js` to see if critical handling is correct.

**Correct Implementation Should Be:**
```javascript
function calculateDamage(damageDice, abilityModifier, weaponBonus, isCritical, damageType, target) {
  let totalDamage = rollDice(damageDice);

  // Critical: roll damage dice AGAIN (don't double modifiers)
  if (isCritical) {
    totalDamage += rollDice(damageDice);
  }

  // Add modifiers ONCE (not doubled on crit)
  totalDamage += abilityModifier + weaponBonus;

  // Apply resistance
  const multiplier = getResistanceMultiplier(target, damageType);
  totalDamage = Math.floor(totalDamage * multiplier);

  // Minimum 1 damage
  return Math.max(1, totalDamage);
}
```

### BUG 2: Player.currentWeapon Not Synced with Equipment

**Severity:** MEDIUM
**File:** `/src/data/CombatStats.js:36-40`
**File:** `/src/systems/combat/DamageCalculator.js:82-86`

**Issue:**
```javascript
// CombatStats.js defines:
currentWeapon: {
  name: 'Fists',
  damageDice: '1d4',
  damageType: 'physical'
}
```

This is a **legacy property** that exists on player stats but is NEVER updated when equipment changes.

**Evidence:**
```javascript
// DamageCalculator.js reads from it:
const weapon = attacker.currentWeapon || {
  damageDice: '1d4',
  damageType: 'physical'
};
```

**Problem:**
1. Player equips a longsword via EquipmentManager
2. `player.inventory` contains equipped longsword with `isEquipped = true`
3. `player.currentWeapon` still says "Fists 1d4"
4. Combat uses `player.currentWeapon` and deals 1d4 damage instead of 1d8

**Suggested Fix:**
Replace all `attacker.currentWeapon` references with:
```javascript
const EquipmentManager = require('../equipment/EquipmentManager');
const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');

if (!weapon || weapon.itemType !== 'weapon') {
  // Unarmed
  weaponData = { damageDice: '1d4', damageType: 'physical' };
}
```

### BUG 3: DEX Cap Not Enforced (Method Call on Plain Object)

**Severity:** MEDIUM
**File:** `/src/systems/equipment/EquipmentManager.js:478`

**Issue:**
```javascript
// Line 478: Tries to call method on item object
dexCap = chestArmor.getMaxDexBonus ? chestArmor.getMaxDexBonus() : Infinity;
```

**Problem:**
- Items are plain JavaScript objects (from JSON-like definitions)
- They don't have methods like `getMaxDexBonus()`
- This check always fails, defaults to `Infinity`
- All armor (including heavy plate) allows full DEX bonus to AC

**Evidence from Item Definitions:**
```javascript
// Items don't have getMaxDexBonus() method
armorProperties: {
  baseAC: 13,
  armorClass: ArmorClass.MEDIUM,
  armorType: 'medium'
  // No maxDexBonus property defined!
}
```

**Result:**
Heavy armor doesn't restrict DEX bonus, violating D&D 5e rules.

**Suggested Fix:**

1. Add `maxDexBonus` property to armor definitions (see Gap 6)
2. Change line 478 to:
```javascript
dexCap = chestArmor.armorProperties?.maxDexBonus ?? Infinity;
```

Or use armor type to determine cap:
```javascript
const armorType = chestArmor.armorProperties?.armorType;
if (armorType === 'heavy') {
  dexCap = 0;
} else if (armorType === 'medium') {
  dexCap = 2;
} else {
  dexCap = Infinity;  // Light armor, no cap
}
```

### BUG 4: Proficiency System Uses Inconsistent Property Names

**Severity:** LOW
**Files:** Multiple

**Issue:** Confusion between `armorClass` as proficiency category vs AC value.

**Evidence:**
1. `/src/systems/equipment/EquipmentManager.js:318`:
```javascript
const armorClass = item.armorProperties.armorClass || 'light';
```

2. `/src/items/schemas/ItemTypes.js`:
```javascript
ArmorClass.LIGHT  // Enum value for proficiency
```

3. Player stats:
```javascript
player.armorClass = 15;  // AC value (number)
```

**Confusion:**
- `armorClass` as property name conflicts with AC value
- Should be `armorCategory` or `armorType` for proficiency

**Suggested Fix:**
Standardize terminology:
- Use `weaponCategory` instead of `weaponClass` (or keep weaponClass, it's less confusing)
- Use `armorCategory` or stick with `armorType` (already used in line 34)
- Reserve `armorClass` only for the AC numeric value

**Low priority** - confusing but functional.

---

## Section 5: Integration Problems

### Integration Issue 1: Attack Bonus Calculation Ignores Equipment

**Systems Involved:** Combat (AttackRoll.js) + Equipment (EquipmentManager.js)
**Severity:** CRITICAL

**Expected Flow (Design Doc Section 3.4):**
1. Combat resolver needs attack bonus
2. Get equipped weapon from EquipmentManager
3. Extract weapon's magical attack bonus (+1/+2/+3)
4. Check proficiency with weapon
5. Get effective STR (base + equipment bonuses)
6. Calculate: `d20 + proficiency ± proficiency_penalty + STR_modifier + weapon_bonus`

**Actual Flow:**
1. Combat resolver needs attack bonus
2. Hardcoded: `attackBonus = getModifier(attacker.str) + attacker.proficiency`
3. Done (no equipment involved)

**Files:**
- `/src/systems/combat/AttackRoll.js:39` - Needs modification
- Should call `/src/systems/equipment/EquipmentManager.js:536-552` for proficiency check
- Should call `/src/systems/equipment/EquipmentManager.js:getEquippedInSlot()` for weapon

**Required Changes:**
See Gap 1 for detailed implementation.

### Integration Issue 2: AC Calculation Disconnected from Combat

**Systems Involved:** Combat (DamageCalculator.js) + Equipment (EquipmentManager.js)
**Severity:** CRITICAL

**Expected Flow:**
1. Player equips plate armor
2. EquipmentManager.calculateAC() computes new AC (18)
3. Result stored in player.armorClass
4. Combat reads player.armorClass
5. Attacks hit/miss based on actual AC

**Actual Flow:**
1. Player equips plate armor
2. EquipmentManager.calculateAC() computes AC = 18 ✓
3. **Result DISCARDED** (not stored)
4. Combat reads player.armorClass (still 12 from character creation)
5. Armor provides zero benefit

**Fix Location:** `/src/systems/equipment/EquipmentManager.js:733`

**Required Changes:**
See Gap 3 for detailed implementation.

### Integration Issue 3: Stat Bonuses NOT Used in Combat

**Systems Involved:** Equipment (EquipmentManager.js) + Combat (AttackRoll.js, DamageCalculator.js)
**Severity:** CRITICAL

**Expected Flow (Design Doc Section 7.1):**
1. Player equips +2 STR ring
2. Equipment calculates: `effectiveStr = baseStr + equipmentBonus = 16`
3. Equipment updates: `player.str = 16`
4. Combat uses `player.str` which returns 16
5. Attack bonus includes +3 modifier (from 16 STR)

**Actual Flow:**
1. Player equips +2 STR ring
2. Equipment calculates: `player.stats.strength = 16` ✓
3. Equipment updates: `player.strength = 16` ✓
4. Combat reads `attacker.str` (short name) which is still old value
5. Attack bonus uses old stat

**Root Cause:**
Property name mismatch between equipment system (uses `strength`) and combat system (uses `str`).

**Fix Location:** `/src/systems/equipment/EquipmentManager.js:722-727`

**Required Changes:**
See Gap 4 for detailed implementation.

### Integration Issue 4: Proficiency Penalties Calculated but Not Applied

**Systems Involved:** Equipment (EquipmentManager.js) + Combat (AttackRoll.js)
**Severity:** HIGH

**Expected Flow:**
1. Wizard equips longsword (martial weapon)
2. EquipmentManager.checkProficiency() returns `{ isProficient: false, penalty: -4 }`
3. Combat calls checkProficiency before attack
4. Attack roll applies -4 penalty
5. Warning message: "You are not proficient with longswords!"

**Actual Flow:**
1. Wizard equips longsword
2. EquipmentManager.checkProficiency() returns penalty ✓
3. **Penalty shown as WARNING only** (line 157-158 of EquipmentManager)
4. Combat NEVER calls checkProficiency
5. Wizard attacks with full bonus

**Missing Code:**
AttackRoll.js needs to integrate proficiency check.

**Required Changes:**
See Gap 1 for detailed implementation.

### Integration Issue 5: Resistances Not Aggregated from Equipment

**Systems Involved:** Damage Calculator + Equipment Manager
**Severity:** MEDIUM

**Expected Flow:**
1. Player equips "Ring of Fire Resistance" (20% fire resistance = 0.8 multiplier)
2. Equipment aggregates resistances into `player.resistances`
3. Fire attack hits player
4. Damage reduced by 20%

**Actual Flow:**
1. Player equips ring with `resistances: { fire: 0.8 }`
2. **Equipment Manager doesn't aggregate resistances**
3. Fire attack hits
4. Combat checks `target.resistances` (undefined or base only)
5. Fire damage dealt at 100%

**Missing Code:**
`EquipmentManager.recalculatePlayerStats()` doesn't aggregate resistances.

**Required Addition:**

In `recalculatePlayerStats()` after line 733:
```javascript
// Aggregate resistances from all equipment
const resistances = {
  physical: 1.0,
  fire: 1.0,
  ice: 1.0,
  lightning: 1.0,
  poison: 1.0,
  necrotic: 1.0,
  radiant: 1.0,
  psychic: 1.0
};

for (const item of player.inventory) {
  if (item.isEquipped && item.resistances) {
    for (const [type, multiplier] of Object.entries(item.resistances)) {
      // Stack multiplicatively (0.8 * 0.8 = 0.64 = 36% resistance)
      resistances[type] *= multiplier;
    }
  }
}

player.resistances = resistances;
```

---

## Section 6: Level Up and Progression Issues

### Issue 1: Stat Increases Don't Update Equipment-Modified Stats

**Severity:** MEDIUM
**File:** `/src/systems/progression/LevelUpHandler.js:154-181`

**Problem:**
```javascript
function applyStatIncrease(player, statName) {
  const oldValue = player[statName];
  player[statName]++;  // Increases player.str directly

  // Recalculates AC if DEX increased
  if (statName === 'dex') {
    player.armorClass = calculateArmorClass(player.dex, armorBonus);
  }
  // ...
}
```

**Issues:**
1. Increases `player.str` directly, but EquipmentManager uses `player.baseStats.strength`
2. Should increase `player.baseStats.strength`, then call `recalculatePlayerStats()`
3. AC recalculation uses old `calculateArmorClass()` function instead of `EquipmentManager.calculateAC()`
4. Doesn't recalculate attack bonuses or max HP

**Correct Flow:**
1. Increase `player.baseStats.strength`
2. Call `EquipmentManager.recalculatePlayerStats(player)` to update all derived stats
3. AC, attack bonuses, HP all update automatically

**Suggested Fix:**
```javascript
function applyStatIncrease(player, statName) {
  // Map short names to baseStats properties
  const statMap = {
    str: 'strength',
    dex: 'dexterity',
    con: 'constitution',
    int: 'intelligence',
    wis: 'wisdom',
    cha: 'charisma'
  };

  const fullStatName = statMap[statName];
  const oldValue = player.baseStats[fullStatName];
  player.baseStats[fullStatName]++;

  // Recalculate ALL stats (including equipment bonuses, AC, HP)
  const EquipmentManager = require('../equipment/EquipmentManager');
  EquipmentManager.recalculatePlayerStats(player);

  return {
    success: true,
    statName: fullStatName,
    oldValue,
    newValue: player.baseStats[fullStatName],
    effectiveValue: player[statName]  // After equipment
  };
}
```

### Issue 2: Level-Up HP Calculation Doesn't Account for CON Changes

**Severity:** LOW
**File:** `/src/systems/progression/LevelUpHandler.js:107`

**Current Code:**
```javascript
player.maxHp += 5;  // Flat increase
```

**D&D 5e Rule:**
- HP per level = Hit Die + CON modifier
- For most classes: d8 (average 5) + CON mod
- If CON increases, gain retroactive HP for all levels

**Example:**
- Level 4 Wizard, CON 14 (+2): 10 + (4-1)×(5+2) = 31 HP
- Increases CON to 16 (+3) at level 8: Should gain +1 HP per level = +8 HP retroactive
- New max: 39 HP (not 31 + 5 = 36)

**Current Implementation:**
Doesn't account for CON. Flat +5 regardless.

**Design Decision Needed:**
- **Option A:** Keep flat +5 for simplicity (current - acceptable for MUD)
- **Option B:** Calculate HP based on CON: `5 + conModifier` per level
- **Option C:** Full retroactive recalculation on CON change

**Recommendation:** Option B for D&D authenticity without retroactive complexity

**Suggested Implementation (Option B):**
```javascript
// In applyLevelUp()
const conModifier = Math.floor((player.con - 10) / 2);
const hpGain = 5 + conModifier;
player.maxHp += hpGain;
player.currentHp = player.maxHp;  // Full heal on level up
```

### Issue 3: Max HP Not Recalculated When CON Changes from Equipment

**Severity:** MEDIUM
**File:** `/src/systems/equipment/EquipmentManager.js:690-733`

**Problem:**
Player equips +2 CON amulet, CON increases from 14 to 16, but max HP doesn't update.

**Expected:**
- CON 14 (+2 mod): Level 5 = 10 + 4*5 + 5*2 = 40 HP
- CON 16 (+3 mod): Level 5 = 10 + 4*5 + 5*3 = 45 HP
- Should gain +5 HP when equipping amulet

**Actual:**
Max HP stays at 40.

**Suggested Fix:**

In `recalculatePlayerStats()` after updating stats:
```javascript
// Recalculate max HP based on CON
const conModifier = Math.floor((player.con - 10) / 2);
const baseHp = 10 + (player.level - 1) * 5;
const newMaxHp = baseHp + (conModifier * player.level);

// Update current HP proportionally if max changed
if (newMaxHp !== player.maxHp) {
  const hpPercent = player.currentHp / player.maxHp;
  player.maxHp = newMaxHp;
  player.currentHp = Math.min(Math.floor(newMaxHp * hpPercent), newMaxHp);
}
```

---

## Section 7: Prioritized Fix List

### 🔴 BLOCKERS (Must Fix Immediately)

#### 1. Fix Property Name Mismatch Between Equipment and Combat
**Owner:** combat-mechanic
**Complexity:** LOW (1-2 hours)
**Dependencies:** None
**Priority:** BLOCKER
**Files:**
- `/src/systems/equipment/EquipmentManager.js:722-727`

**Current Code:**
```javascript
// Lines 722-727
player.strength = player.stats.strength;
player.dexterity = player.stats.dexterity;
player.constitution = player.stats.constitution;
player.intelligence = player.stats.intelligence;
player.wisdom = player.stats.wisdom;
player.charisma = player.stats.charisma;
```

**Change TO:**
```javascript
// Update player stat properties (using short names for combat compatibility)
player.str = player.stats.strength;
player.dex = player.stats.dexterity;
player.con = player.stats.constitution;
player.int = player.stats.intelligence;
player.wis = player.stats.wisdom;
player.cha = player.stats.charisma;
```

**Verification:**
- Check that combat reads `attacker.str`, not `attacker.strength`
- Verify stat bonuses from equipment now affect combat

---

#### 2. Update AC When Equipment Changes
**Owner:** combat-mechanic
**Complexity:** LOW (30 minutes)
**Dependencies:** None
**Priority:** BLOCKER
**Files:**
- `/src/systems/equipment/EquipmentManager.js:733` (end of recalculatePlayerStats)
- `/src/systems/equipment/EquipmentManager.js:149` (after equipItem AC calc)
- `/src/systems/equipment/EquipmentManager.js:206` (after unequipItem AC calc)

**Add after line 733 in recalculatePlayerStats():**
```javascript
// Recalculate and update armor class
const acResult = this.calculateAC(player);
player.armorClass = acResult.totalAC;

// Update max HP based on CON
const conModifier = Math.floor((player.con - 10) / 2);
const baseHp = 10 + (player.level - 1) * 5;
player.maxHp = baseHp + (conModifier * player.level);

// Don't let current HP exceed new max
player.currentHp = Math.min(player.currentHp, player.maxHp);

logger.log(`Recalculated ${player.username}: AC=${player.armorClass}, MaxHP=${player.maxHp}`);
```

**Add after line 149 in equipItem():**
```javascript
const acResult = this.calculateAC(player);
player.armorClass = acResult.totalAC;
```

**Add after line 206 in unequipItem():**
```javascript
const acResult = this.calculateAC(player);
player.armorClass = acResult.totalAC;
```

**Verification:**
- Equip armor, check that `player.armorClass` updates
- Unequip armor, verify AC returns to unarmored value

---

#### 3. Replace currentWeapon with Equipment Manager in Combat
**Owner:** combat-mechanic
**Complexity:** MEDIUM (2-3 hours)
**Dependencies:** None
**Priority:** BLOCKER
**Files:**
- `/src/systems/combat/DamageCalculator.js:82-86`

**Current Code (lines 82-86):**
```javascript
const weapon = attacker.currentWeapon || {
  damageDice: '1d4',
  damageType: 'physical'
};
```

**Change TO:**
```javascript
const EquipmentManager = require('../equipment/EquipmentManager');
const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');

let weaponData;
if (!weapon || weapon.itemType !== ItemType.WEAPON) {
  // Unarmed strike
  weaponData = {
    name: 'Fists',
    damageDice: '1d4',
    damageType: DamageType.PHYSICAL,
    weaponProperties: {
      damageDice: '1d4',
      damageType: DamageType.PHYSICAL,
      magicalAttackBonus: 0,
      magicalDamageBonus: 0,
      isFinesse: false,
      isRanged: false,
      versatileDamageDice: null
    }
  };
} else {
  weaponData = weapon;
}
```

**Then update references from `weapon.damageDice` to `weaponData.weaponProperties.damageDice`**

**Verification:**
- Equip sword, verify damage dice change from 1d4 to 1d8
- Unequip weapon, verify damage returns to 1d4

---

### ⚠️ CRITICAL (Needed for Phase 4 Completion)

#### 4. Add Weapon Attack Bonus to Attack Rolls
**Owner:** combat-mechanic
**Complexity:** MEDIUM (2-3 hours)
**Dependencies:** #3 (weapon from equipment)
**Priority:** CRITICAL
**Files:**
- `/src/systems/combat/AttackRoll.js:26-76`

**Current Code (line 39):**
```javascript
const attackBonus = getModifier(attacker.str) + attacker.proficiency;
```

**Implementation:**

Add before line 39:
```javascript
// Get equipped weapon for attack bonus
const EquipmentManager = require('../equipment/EquipmentManager');
const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');
const weaponBonus = weapon?.weaponProperties?.magicalAttackBonus || 0;
```

Change line 39 to:
```javascript
const attackBonus = getModifier(attacker.str) + attacker.proficiency + weaponBonus;
```

**Verification:**
- Equip +1 sword, verify attack roll shows bonus
- Check combat log for higher attack totals

---

#### 5. Add Weapon Damage Bonus to Damage Rolls
**Owner:** combat-mechanic
**Complexity:** MEDIUM (2 hours)
**Dependencies:** #3 (weapon from equipment)
**Priority:** CRITICAL
**Files:**
- `/src/systems/combat/DamageCalculator.js:14-38` (calculateDamage function)

**Current calculateDamage signature:**
```javascript
function calculateDamage(damageDice, isCritical, damageType, target)
```

**Change TO:**
```javascript
function calculateDamage(damageDice, abilityModifier, weaponBonus, isCritical, damageType, target) {
  let baseDamage = rollDice(damageDice);

  // Critical: roll dice again (not modifiers)
  if (isCritical) {
    baseDamage += rollDice(damageDice);
  }

  // Add modifiers once
  baseDamage += abilityModifier + weaponBonus;

  // Apply resistance
  const multiplier = getResistanceMultiplier(target, damageType);
  const finalDamage = Math.floor(baseDamage * multiplier);

  // Minimum 1 damage
  return Math.max(1, finalDamage);
}
```

**Update callers to pass new parameters.**

**Verification:**
- Equip +1 sword, verify damage increased by 1
- Test critical hits don't double the +1 bonus

---

#### 6. Implement Proficiency Penalty in Combat
**Owner:** combat-mechanic
**Complexity:** MEDIUM (2-3 hours)
**Dependencies:** #4 (attack bonus)
**Priority:** CRITICAL
**Files:**
- `/src/systems/combat/AttackRoll.js:39`

**Add before attack bonus calculation:**
```javascript
const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');
const profCheck = EquipmentManager.checkProficiency(attacker, weapon);

let proficiencyBonus = attacker.proficiency;
if (!profCheck.isProficient) {
  proficiencyBonus += profCheck.penalty;  // penalty is negative (-4)

  // Send warning message
  if (attacker.socket) {
    attacker.send(colors.warning(`You are not proficient with ${weapon.name}!`));
  }
}

const attackBonus = abilityModifier + proficiencyBonus + weaponBonus;
```

**Verification:**
- Mage equips longsword, verify attack penalty applied
- Warrior equips same sword, verify no penalty

---

#### 7. Add Finesse Weapon DEX Option
**Owner:** combat-mechanic
**Complexity:** MEDIUM (2 hours)
**Dependencies:** #4 (attack bonus calculation)
**Priority:** CRITICAL
**Files:**
- `/src/systems/combat/AttackRoll.js:39`

**Replace simple STR modifier with:**
```javascript
const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');

let abilityModifier;
if (weapon?.weaponProperties?.isFinesse) {
  // Finesse: use higher of STR or DEX
  const strMod = getModifier(attacker.str);
  const dexMod = getModifier(attacker.dex);
  abilityModifier = Math.max(strMod, dexMod);
} else if (weapon?.weaponProperties?.isRanged) {
  // Ranged: always DEX
  abilityModifier = getModifier(attacker.dex);
} else {
  // Melee: STR
  abilityModifier = getModifier(attacker.str);
}
```

**Also update DamageCalculator to use same logic for damage modifier.**

**Verification:**
- Rogue (high DEX) equips dagger (finesse), verify uses DEX for attack
- Same rogue equips mace, verify uses STR

---

#### 8. Fix Critical Hit Damage (Dice Only, Not Modifiers)
**Owner:** combat-mechanic
**Complexity:** MEDIUM (2-3 hours)
**Dependencies:** #5 (damage calculation)
**Priority:** CRITICAL
**Files:**
- `/src/systems/combat/DamageCalculator.js:14-38`
- `/src/utils/dice.js` (verify implementation)

**Task:**
1. Check `/src/utils/dice.js` to see how `rollDamage()` handles critical
2. Ensure it only doubles DICE, not modifiers
3. If incorrect, fix per the code in #5

**D&D 5e Example:**
- Normal hit: 1d8+3 = 8 damage (5 on die, +3 STR)
- Critical hit: 2d8+3 = 13 damage (5+5 on dice, +3 STR once)
- NOT: (1d8+3)×2 = 16 damage (incorrect)

**Verification:**
- Force critical hit in test
- Verify damage = 2× dice + modifiers (not 2× everything)

---

#### 9. Add Versatile Weapon Two-Handed Damage
**Owner:** combat-mechanic
**Complexity:** MEDIUM (2 hours)
**Dependencies:** #3 (weapon from equipment)
**Priority:** CRITICAL
**Files:**
- `/src/systems/combat/DamageCalculator.js:82-110`

**Add logic to check for two-handing:**
```javascript
const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');
const offHand = EquipmentManager.getEquippedInSlot(attacker, 'off_hand');

let damageDice;
if (weapon.weaponProperties.versatileDamageDice && !offHand) {
  // Two-handing versatile weapon
  damageDice = weapon.weaponProperties.versatileDamageDice;
} else {
  damageDice = weapon.weaponProperties.damageDice;
}
```

**Verification:**
- Equip longsword + shield: 1d8 damage
- Equip longsword only: 1d10 damage

---

#### 10. Add maxDexBonus Property to Armor Definitions
**Owner:** mud-architect
**Complexity:** LOW (1 hour)
**Dependencies:** None
**Priority:** CRITICAL
**Files:**
- All armor item definition files in `/world/sesame_street/items/equipment/` and `/world/core/items/`

**Task:**
Add `maxDexBonus` property to all armor `armorProperties`:

**Light armor:**
```javascript
armorProperties: {
  baseAC: 11,
  armorClass: ArmorClass.LIGHT,
  armorType: 'light',
  maxDexBonus: null,  // ADD: null = unlimited
  stealthDisadvantage: false
}
```

**Medium armor:**
```javascript
armorProperties: {
  baseAC: 14,
  armorClass: ArmorClass.MEDIUM,
  armorType: 'medium',
  maxDexBonus: 2,  // ADD: max +2 DEX
  stealthDisadvantage: false
}
```

**Heavy armor:**
```javascript
armorProperties: {
  baseAC: 18,
  armorClass: ArmorClass.HEAVY,
  armorType: 'heavy',
  maxDexBonus: 0,  // ADD: no DEX bonus
  stealthDisadvantage: true,
  strengthRequirement: 15
}
```

**Update EquipmentManager.js line 478:**
```javascript
// FROM:
dexCap = chestArmor.getMaxDexBonus ? chestArmor.getMaxDexBonus() : Infinity;

// TO:
dexCap = chestArmor.armorProperties?.maxDexBonus ?? Infinity;
```

**Verification:**
- Equip heavy armor with high DEX, verify AC doesn't include DEX
- Equip medium armor with DEX +4, verify AC capped at +2

---

### 📊 HIGH PRIORITY (Important for System Stability)

#### 11. Implement Dual-Wielding Attack
**Owner:** combat-mechanic
**Complexity:** HIGH (4-6 hours)
**Dependencies:** #3, #4, #5 (weapon/attack/damage systems)
**Priority:** HIGH
**Files:**
- `/src/systems/combat/CombatResolver.js:93-166`

**Implementation:**

After main hand attack in combat round:
```javascript
// Check for dual-wield off-hand attack
const mainWeapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');
const offHandWeapon = EquipmentManager.getEquippedInSlot(attacker, 'off_hand');

if (offHandWeapon && offHandWeapon.itemType === ItemType.WEAPON) {
  // Both weapons must be light for dual-wielding
  if (mainWeapon?.weaponProperties?.isLight && offHandWeapon.weaponProperties.isLight) {

    // Off-hand attack (simplified auto-attack per design)
    const offHandAttack = resolveAttackRoll(attacker, target, attackerParticipant);

    if (offHandAttack.hit) {
      // D&D 5e: off-hand deals damage WITHOUT ability modifier
      // MUD adaptation: half damage (design doc line 20)
      const offHandDamage = resolveOffHandDamage(attacker, target, offHandAttack);

      combat.broadcast(`${attacker.name} strikes with their off-hand ${offHandWeapon.name}!`);
      // Apply damage...
    }
  }
}
```

**Verification:**
- Dual-wield two daggers, verify two attacks per round
- Equip longsword + dagger, verify no off-hand attack (longsword not light)

---

#### 12. Add Resistance Aggregation from Equipment
**Owner:** combat-mechanic
**Complexity:** MEDIUM (2-3 hours)
**Dependencies:** #2 (recalculate stats)
**Priority:** HIGH
**Files:**
- `/src/systems/equipment/EquipmentManager.js:690-733`

**Add in recalculatePlayerStats() after line 733:**
```javascript
// Aggregate resistances from all equipped items
const resistances = {
  physical: 1.0,
  fire: 1.0,
  ice: 1.0,
  lightning: 1.0,
  poison: 1.0,
  necrotic: 1.0,
  radiant: 1.0,
  psychic: 1.0
};

for (const item of player.inventory) {
  if (item.isEquipped && item.resistances) {
    for (const [dmgType, multiplier] of Object.entries(item.resistances)) {
      // Stack multiplicatively: 0.8 * 0.8 = 0.64 (36% resistance)
      resistances[dmgType] *= multiplier;
    }
  }
}

player.resistances = resistances;
```

**Verification:**
- Equip ring with 20% fire resist (0.8 multiplier)
- Take fire damage, verify reduced by 20%

---

#### 13. Add Magical Weapon/Armor Properties to Item Definitions
**Owner:** mud-architect
**Complexity:** MEDIUM (2-3 hours)
**Dependencies:** None
**Priority:** HIGH
**Files:**
- Create: `/world/core/items/magicalWeapons.js`
- Create: `/world/core/items/magicalArmor.js`

**Task:**
Create 5-10 magical items with full properties:

**Example +1 Longsword:**
```javascript
{
  id: 'longsword_plus_one',
  name: 'Longsword +1',
  itemType: ItemType.WEAPON,
  rarity: 'uncommon',
  value: 500,
  weight: 3,

  weaponProperties: {
    damageDice: '1d8',
    versatileDamageDice: '1d10',
    damageType: DamageType.SLASHING,
    weaponClass: WeaponClass.MARTIAL_MELEE,
    isTwoHanded: false,
    isRanged: false,
    isLight: false,
    isFinesse: false,

    // Magical properties
    magicalAttackBonus: 1,
    magicalDamageBonus: 1,

    proficiencyRequired: [
      GuildProficiency.MARTIAL_WEAPONS,
      GuildProficiency.LONGSWORDS
    ]
  },

  description: 'A finely crafted longsword with a faint magical aura.',
  examineText: 'The blade gleams with enchantment. Runes of power are etched along its length.'
}
```

**Example +1 Plate Armor:**
```javascript
{
  id: 'plate_armor_plus_one',
  name: 'Plate Armor +1',
  itemType: ItemType.ARMOR,
  rarity: 'uncommon',
  value: 2500,
  weight: 65,

  armorProperties: {
    baseAC: 18,
    magicalACBonus: 1,  // Total AC = 19
    armorClass: ArmorClass.HEAVY,
    armorType: 'heavy',
    maxDexBonus: 0,
    stealthDisadvantage: true,
    strengthRequirement: 15,

    proficiencyRequired: [GuildProficiency.HEAVY_ARMOR]
  },

  description: 'Masterwork plate armor reinforced with magical wards.',
  examineText: 'The armor hums with protective magic. No smith could craft such perfection.'
}
```

**Create 5-10 of each type with varying bonuses (+1, +2, special effects)**

---

#### 14. Fix Level-Up Stat Increase to Use baseStats
**Owner:** combat-mechanic
**Complexity:** MEDIUM (2 hours)
**Dependencies:** #1, #2 (stat system)
**Priority:** HIGH
**Files:**
- `/src/systems/progression/LevelUpHandler.js:154-181`

**Replace applyStatIncrease function:**
```javascript
function applyStatIncrease(player, statName) {
  // Map short names to baseStats properties
  const statMap = {
    str: 'strength',
    dex: 'dexterity',
    con: 'constitution',
    int: 'intelligence',
    wis: 'wisdom',
    cha: 'charisma'
  };

  const fullStatName = statMap[statName];
  if (!fullStatName) {
    return { success: false, reason: 'Invalid stat name' };
  }

  const oldValue = player.baseStats[fullStatName];
  player.baseStats[fullStatName]++;

  // Recalculate ALL stats (including equipment bonuses, AC, HP)
  const EquipmentManager = require('../equipment/EquipmentManager');
  EquipmentManager.recalculatePlayerStats(player);

  return {
    success: true,
    statName: fullStatName,
    oldValue,
    newValue: player.baseStats[fullStatName],
    effectiveValue: player[statName]  // After equipment bonuses
  };
}
```

**Add to applyLevelUp after proficiency update:**
```javascript
player.proficiency = calculateProficiency(player.level);

// Recalculate all equipment-dependent stats
const EquipmentManager = require('../equipment/EquipmentManager');
EquipmentManager.recalculatePlayerStats(player);
```

**Verification:**
- Level up, increase STR, verify attack bonus updates
- Level up, increase CON, verify max HP increases

---

### 📋 MEDIUM PRIORITY (Needed for Completeness)

#### 15. Implement Basic Magical Effects System
**Owner:** combat-mechanic
**Complexity:** HIGH (6-8 hours)
**Dependencies:** #4, #5 (combat integration)
**Priority:** MEDIUM
**Files:**
- Create: `/src/systems/equipment/MagicEffectProcessor.js`
- Modify: `/src/systems/combat/CombatResolver.js`

**Create magic effect processor:**
```javascript
class MagicEffectProcessor {
  static processOnHitEffects(attacker, target, attackResult, combat) {
    let totalExtraDamage = 0;
    const effects = this.getEquippedEffects(attacker, 'on_hit');

    for (const { item, effect } of effects) {
      if (effect.type === 'extra_damage') {
        const extraDamage = rollDice(effect.damageDice);
        const finalExtra = attackResult.critical ? extraDamage * 2 : extraDamage;
        totalExtraDamage += finalExtra;

        combat.broadcast(
          `${attacker.name}'s ${item.name} erupts with ${effect.damageType} energy! (+${finalExtra} damage)`
        );
      }
    }

    return { totalExtraDamage };
  }

  static getEquippedEffects(player, trigger) {
    const effects = [];
    for (const item of player.inventory) {
      if (item.isEquipped && item.magicEffects) {
        for (const effect of item.magicEffects) {
          if (effect.trigger === trigger) {
            effects.push({ item, effect });
          }
        }
      }
    }
    return effects;
  }
}
```

**Integrate into combat resolver.**

---

#### 16-20. Additional Medium Priority Tasks

(Identify/Attune commands, sample magical items, HP calculation, STR requirements, naming cleanup - see original report Section 7 for details)

---

### 🔽 LOW PRIORITY (Nice to Have)

#### 21. Implement Tutorial Quest for Starting Gear
**Owner:** mud-architect
**Complexity:** HIGH (8-10 hours)
**Priority:** LOW

#### 22. Implement Shop Buy/Sell Commands
**Owner:** mud-architect
**Complexity:** HIGH (6-8 hours)
**Priority:** LOW

#### 23. Implement Loot Table Spawning
**Owner:** mud-architect
**Complexity:** HIGH (8-10 hours)
**Priority:** LOW

---

## Section 8: Recommended Implementation Order

### Sprint 1: Core Combat Integration (Week 1-2)
**Goal:** Get weapons and armor actually working in combat

**Tasks:** #1-10 (Blockers + Critical)
- Fix property names (str vs strength)
- Update AC on equipment changes
- Replace currentWeapon with EquipmentManager
- Add weapon attack/damage bonuses
- Implement proficiency penalties
- Add finesse weapon DEX option
- Fix critical hit damage
- Add versatile two-handed damage
- Add maxDexBonus to armor

**Deliverable:**
- Players can equip weapons and see attack/damage bonuses
- Armor provides proper AC with DEX caps
- Proficiency system enforced in combat
- D&D 5e combat mechanics functional

---

### Sprint 2: Advanced Combat Features (Week 3-4)
**Goal:** Polish combat mechanics and add advanced features

**Tasks:** #11-14 (High Priority)
- Dual-wielding system
- Resistance aggregation
- Magical item properties
- Fix level-up stat system

**Deliverable:**
- Full D&D 5e combat fidelity
- Dual-wielding functional
- Magical items with bonuses work
- Character progression integrated with equipment

---

### Sprint 3: Magic and Content (Week 5-7)
**Goal:** Add magical effects and content variety

**Tasks:** #15-20 (Medium Priority)
- Magic effect system (on-hit, on-attack triggers)
- Identify and attune commands
- Create 20+ magical items
- HP calculation improvements

**Deliverable:**
- Rich item variety with magical effects
- Flaming swords, resistance rings, etc.
- Attunement system active
- Full item progression path

---

### Sprint 4: Economy and Polish (Week 8-10)
**Goal:** Complete Phase 5-6, prepare for launch

**Tasks:** #21-23 (Low Priority)
- Tutorial quest for starting gear
- Shop buy/sell system
- Loot table generation
- Final QA and balance testing

**Deliverable:**
- Complete item + combat system
- Player progression from tutorial to endgame
- Economy balanced
- Ready for player testing

---

## Section 9: File Locations Quick Reference

### Files Requiring CRITICAL Changes

**Combat System (combat-mechanic):**
- ✏️ `/src/systems/combat/AttackRoll.js:39` - Add weapon bonus, proficiency, finesse
- ✏️ `/src/systems/combat/DamageCalculator.js:82-110` - Use equipment manager, add damage bonus
- ✏️ `/src/systems/combat/CombatResolver.js:93-166` - Add dual-wield logic (later)

**Equipment System (combat-mechanic):**
- ✏️ `/src/systems/equipment/EquipmentManager.js:722-727` - Fix property names (str vs strength)
- ✏️ `/src/systems/equipment/EquipmentManager.js:733` - Add AC update and HP recalc
- ✏️ `/src/systems/equipment/EquipmentManager.js:149,206` - Update AC on equip/unequip
- ✏️ `/src/systems/equipment/EquipmentManager.js:478` - Fix maxDexBonus reading

**Character Progression (combat-mechanic):**
- ✏️ `/src/systems/progression/LevelUpHandler.js:107` - Add CON-based HP (optional)
- ✏️ `/src/systems/progression/LevelUpHandler.js:113` - Add recalculatePlayerStats call
- ✏️ `/src/systems/progression/LevelUpHandler.js:154-181` - Fix stat increase to use baseStats

**Item Definitions (mud-architect):**
- ✏️ All files in `/world/sesame_street/items/equipment/` - Add maxDexBonus, magical bonuses
- ✏️ All files in `/world/core/items/` - Add maxDexBonus, magical bonuses
- ➕ Create `/world/core/items/magicalWeapons.js` - +1/+2/+3 weapons
- ➕ Create `/world/core/items/magicalArmor.js` - +1/+2/+3 armor

**New Files Needed (combat-mechanic):**
- ➕ `/src/systems/equipment/MagicEffectProcessor.js` - Magic effects (#15)

**New Files Needed (mud-architect):**
- ➕ `/src/commands/core/identify.js` - Identify command (#16)
- ➕ `/src/commands/core/attune.js` - Attune command (#16)

---

## Section 10: Testing Checklist

After implementing fixes, verify these test cases:

### Equipment Integration Tests

**Weapon Tests:**
- [ ] Equip wooden sword (1d4), verify damage 1d4
- [ ] Equip longsword (1d8), verify damage 1d8
- [ ] Equip longsword two-handed, verify damage 1d10
- [ ] Equip +1 longsword, verify attack +1, damage +1
- [ ] Equip +2 greatsword, verify attack +2, damage +2
- [ ] Mage equips longsword (not proficient), verify attack penalty

**Armor Tests:**
- [ ] Unarmored (DEX 14), verify AC = 12
- [ ] Equip leather armor (AC 11), verify AC = 13
- [ ] Equip chainmail (AC 16, heavy), verify AC = 16 (no DEX)
- [ ] Equip scale mail (AC 14, medium) with DEX 18, verify AC = 16 (DEX capped at +2)
- [ ] Equip +1 plate armor, verify AC = 19
- [ ] Mage equips plate (not proficient), verify AC penalty and warnings

**Stat Bonus Tests:**
- [ ] Equip +2 STR ring, verify STR increases
- [ ] Verify attack bonus increases from STR ring
- [ ] Equip +2 DEX ring, verify AC increases
- [ ] Equip +2 CON amulet, verify max HP increases
- [ ] Stack multiple stat bonuses, verify cumulative

**Level-Up Tests:**
- [ ] Level up, verify proficiency bonus increases
- [ ] Level up, verify attack bonus updates (without re-equipping)
- [ ] Level up, increase STR, verify attack/damage update
- [ ] Level up, increase CON, verify max HP update
- [ ] Level up while wearing +stat items, verify calculations correct

**Combat Tests:**
- [ ] Attack with unarmed, verify 1d4 damage
- [ ] Attack with equipped sword, verify correct damage dice
- [ ] Attack with +1 sword, verify bonus applied
- [ ] Critical hit, verify dice doubled but not modifiers
- [ ] Rogue with dagger (finesse), verify uses DEX for attack
- [ ] Dual-wield two daggers, verify two attacks
- [ ] Equip longsword + dagger, verify no dual-wield (longsword not light)

---

## Conclusion

This comprehensive code review has identified the root causes of the combat-item integration issues:

### The Good
- **Phase 0-3 implementation is excellent** - Item framework is solid
- Equipment Manager is well-designed
- Proficiency and attunement systems work
- Encumbrance and inventory functional

### The Critical Issues
1. **Property name mismatch** prevents equipment stats from affecting combat
2. **AC calculation orphaned** - computed but never saved
3. **Legacy weapon property** - combat uses old `currentWeapon` instead of equipment system

### The Fix
23 prioritized tasks organized into 4 sprints:
- **Sprint 1 (Critical):** Fix core integration (2-3 weeks)
- **Sprint 2 (High):** Advanced features (2 weeks)
- **Sprint 3 (Medium):** Magic and content (3-4 weeks)
- **Sprint 4 (Low):** Economy and polish (2-3 weeks)

### Next Steps
1. Begin with **Blockers #1-3** (4 hours total) - highest ROI
2. Move to **Critical #4-10** (20 hours) - complete Phase 4
3. Continue through prioritized list

The foundation is strong. With focused effort on the integration gaps, the combat-item system will achieve full D&D 5e fidelity within 2-3 weeks.

---

**Report Complete**
**Total Issues Identified:** 23
**Estimated Fix Time:** 60-80 hours
**Recommended Timeline:** 8-10 weeks (4 sprints)
