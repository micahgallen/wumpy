# Combat-Item System Integration Design
**The Wumpy and Grift MUD**

**Version:** 1.0
**Date:** 2025-11-05
**Status:** Design Document - Ready for Implementation
**Author:** Combat Systems Architect (Claude Sonnet 4.5)

---

## Executive Summary

This document provides the complete design for integrating the item system with the existing combat mechanics in the MUD. The design maintains D&D 5e fidelity while supporting MUD-specific features like magical autocast weapons and proficiency-based mechanics.

**Key Integration Points:**
1. Weapon damage calculation (melee/ranged, one/two-handed)
2. Armor damage mitigation (AC bonuses, damage reduction)
3. Proficiency system (weapons, armor, penalties/bonuses)
4. Magical effects (autocast during combat, triggered effects)
5. Stat bonuses from equipment (attribute modifiers, special effects)

**Design Philosophy:**
- Honor D&D 5e mechanics as the foundation
- Maintain existing combat system architecture
- Support gradual rollout (weapons → armor → jewelry → magic)
- Balance for MUD environment (persistent world, solo/group play)
- Extensible for future features (enchantments, crafting, legendary items)

---

## Table of Contents

1. [Current Combat System Review](#1-current-combat-system-review)
2. [Item System Architecture](#2-item-system-architecture)
3. [Weapon Integration](#3-weapon-integration)
4. [Armor Integration](#4-armor-integration)
5. [Proficiency System](#5-proficiency-system)
6. [Magical Effects System](#6-magical-effects-system)
7. [Stat Bonuses System](#7-stat-bonuses-system)
8. [Balance Recommendations](#8-balance-recommendations)
9. [Combat Integration Points](#9-combat-integration-points)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Testing Strategy](#11-testing-strategy)

---

## 1. Current Combat System Review

### 1.1 Attack Resolution Flow

**Current Implementation** (`/src/systems/combat/AttackRoll.js`):

```javascript
// 1. Determine advantage/disadvantage
const advantageType = calculateNetAdvantage(
  attackerParticipant.advantageCount,
  attackerParticipant.disadvantageCount
);

// 2. Roll d20 with advantage/disadvantage
const attackRoll = rollAttack(advantageType);
const naturalRoll = attackRoll.natural;

// 3. Calculate attack bonus (STR mod + proficiency)
const attackBonus = getModifier(attacker.str) + attacker.proficiency;
const totalAttack = naturalRoll + attackBonus;

// 4. Check vs AC
const hit = isHit(totalAttack, defender.armorClass);
```

**Observations:**
- Currently uses fixed STR modifier for melee attacks
- Proficiency bonus is flat addition
- **NO weapon bonuses applied** (hardcoded in comment: `// Future: weapon bonus`)
- **NO proficiency checks** for weapon type
- **NO differentiation** between melee/ranged weapons

### 1.2 Damage Calculation Flow

**Current Implementation** (`/src/combat/combatResolver.js` line 42-82):

```javascript
function getDamageDice(attacker) {
  // Check if attacker has a weapon equipped
  if (attacker.equippedWeapon && attacker.equippedWeapon.damage) {
    return attacker.equippedWeapon.damage;
  }

  // Unarmed damage: 1d4 (will add STR modifier separately)
  return '1d4';
}

function rollDamage(attacker, damageDice, critical = false) {
  let baseDamage = rollDice(damageDice);

  // Add STR modifier for melee/unarmed attacks
  const strModifier = getModifier(attacker.strength || 10);
  const isUnarmed = damageDice === '1d4';
  const weaponUsesStr = !attacker.equippedWeapon ||
                        !attacker.equippedWeapon.finesse;

  if (isUnarmed || weaponUsesStr) {
    baseDamage += strModifier;
  }

  // Minimum damage of 1
  baseDamage = Math.max(1, baseDamage);

  // Critical hits double the damage
  const finalDamage = critical ? baseDamage * 2 : baseDamage;

  return finalDamage;
}
```

**Observations:**
- **ALREADY checks for equipped weapon** via `equippedWeapon.damage`
- Supports finesse weapons (DEX-based damage)
- Unarmed combat as fallback (1d4)
- Critical hits double total damage (including modifiers)
- **NO armor damage reduction**
- **NO magical bonus damage**

### 1.3 Armor Class Calculation

**Current Implementation** (`/src/combat/combatResolver.js` line 15-21):

```javascript
function getArmorClass(defender) {
  const baseAC = 10;
  const dexMod = getModifier(defender.dexterity);
  const armorBonus = 0; // Future: armor equipment

  return baseAC + dexMod + armorBonus;
}
```

**Observations:**
- Base AC = 10 (D&D standard)
- DEX modifier added (standard D&D)
- **NO armor bonuses** (hardcoded 0)
- **NO DEX cap** for heavy armor
- **NO shield bonuses**

### 1.4 Player Combat Stats

**Current Structure** (`/src/data/CombatStats.js` line 14-53):

```javascript
{
  // Attributes
  str: 10, dex: 12, con: 10, int: 10, wis: 10, cha: 10,

  // Derived
  proficiency: calculateProficiency(level),
  armorClass: calculateArmorClass(12, 0),

  // Current Weapon (default unarmed)
  currentWeapon: {
    name: 'Fists',
    damageDice: '1d4',
    damageType: 'physical'
  },

  // Combat State
  maxHp: 10,
  currentHp: 10
}
```

**Observations:**
- Has `currentWeapon` property (already in use)
- **NO `equippedWeapon` reference** to item system
- **NO `equippedArmor` property**
- **NO equipment slots** (head, chest, hands, etc.)
- **NO proficiency lists** for weapons/armor

---

## 2. Item System Architecture

### 2.1 Item Categories

**Weapons:**
- **Melee:** Swords, axes, maces, daggers, unarmed
- **Ranged:** Bows, crossbows, thrown weapons
- **Versatile:** Can be used one-handed or two-handed (longsword, spear)
- **Special:** Wands (spell autocast), staves, magical weapons

**Armor:**
- **Light:** Cloth, leather (DEX to AC, no limit)
- **Medium:** Hide, chain shirt (DEX to AC, max +2)
- **Heavy:** Plate, splint (no DEX to AC)
- **Shields:** +2 AC bonus (requires free hand)

**Jewelry:**
- **Rings:** Stat bonuses, resistance bonuses, special effects
- **Amulets:** Stat bonuses, condition immunity
- **Bracers:** AC bonus, damage bonuses

### 2.2 Item Schema

**Weapon Item Definition:**

```javascript
{
  id: 'longsword_of_fire',
  name: 'Longsword of Fire',
  type: 'weapon',

  // Weapon Properties
  weaponType: 'longsword',           // Proficiency category
  handedness: 'versatile',            // one-handed, two-handed, versatile
  range: 'melee',                     // melee, ranged, reach

  // Damage
  damageDice: '1d8',                  // One-handed damage
  damageDiceTwo: '1d10',              // Two-handed damage (versatile only)
  damageType: 'physical',             // Base damage type

  // Bonuses
  attackBonus: 1,                     // +1 to hit
  damageBonus: 1,                     // +1 to damage

  // Properties
  finesse: false,                     // Can use DEX instead of STR
  light: false,                       // Can dual-wield
  heavy: false,                       // Disadvantage for Small creatures
  reach: false,                       // 10ft range instead of 5ft

  // Magical Effects
  magicEffects: [
    {
      type: 'extra_damage',
      damageDice: '1d6',
      damageType: 'fire',
      trigger: 'on_hit'
    },
    {
      type: 'autocast_spell',
      spell: 'fireball',
      trigger: 'on_attack',
      chance: 0.10,              // 10% chance per attack
      cooldown: 60000            // 1 minute cooldown
    }
  ],

  // Requirements
  proficiencyRequired: ['martial_weapons', 'longswords'],
  minStrength: 13,
  minLevel: 5,

  // Physical Properties
  weight: 3,
  value: 500,
  rarity: 'rare',

  // Description
  description: 'A finely crafted longsword wreathed in flames.',
  examineText: 'The blade glows with inner fire...'
}
```

**Armor Item Definition:**

```javascript
{
  id: 'plate_armor_plus_one',
  name: 'Plate Armor +1',
  type: 'armor',

  // Armor Properties
  armorType: 'heavy',                 // light, medium, heavy, shield
  slot: 'body',                       // body, head, hands, feet, shield

  // Defense
  baseAC: 18,                         // Base AC provided
  acBonus: 1,                         // Magical bonus
  maxDexBonus: null,                  // null = no DEX bonus (heavy armor)

  // Damage Reduction (optional MUD-specific mechanic)
  damageReduction: {
    physical: 2,                      // Flat reduction per hit
    slashing: 3,                      // Type-specific reduction
  },

  // Properties
  stealthDisadvantage: true,          // Heavy armor penalty

  // Bonuses
  statBonuses: {
    con: 1                            // +1 Constitution
  },

  resistances: {
    physical: 0.10                    // 10% resistance to physical
  },

  // Requirements
  proficiencyRequired: ['heavy_armor'],
  minStrength: 15,
  minLevel: 3,

  // Physical
  weight: 65,
  value: 1500,
  rarity: 'uncommon',

  description: 'Masterwork plate armor with a magical sheen.'
}
```

**Jewelry Item Definition:**

```javascript
{
  id: 'ring_of_protection',
  name: 'Ring of Protection',
  type: 'jewelry',

  // Jewelry Properties
  slot: 'ring',                       // ring, amulet, bracers

  // Bonuses
  acBonus: 1,                         // +1 AC
  savingThrowBonus: 1,                // +1 to all saves (future)

  statBonuses: {
    dex: 2,                           // +2 Dexterity
    wis: 1                            // +1 Wisdom
  },

  resistances: {
    fire: 0.20,                       // 20% fire resistance
    ice: 0.20                         // 20% ice resistance
  },

  // Magical Effects
  magicEffects: [
    {
      type: 'passive_heal',
      amount: 1,                      // 1 HP per round
      trigger: 'start_of_turn',
      inCombatOnly: true
    }
  ],

  // Requirements
  minLevel: 3,
  attunementRequired: true,           // D&D attunement slot

  weight: 0.1,
  value: 2000,
  rarity: 'rare',

  description: 'A silver ring inscribed with protective runes.'
}
```

### 2.3 Equipment Slots

**Standard D&D Slots:**
- `weapon_main`: Main hand weapon
- `weapon_off`: Off-hand weapon (dual-wield, shield)
- `body`: Chest armor
- `head`: Helmet
- `hands`: Gloves/gauntlets
- `feet`: Boots
- `ring_1`: First ring slot
- `ring_2`: Second ring slot
- `amulet`: Necklace/amulet
- `bracers`: Wrist armor/bracers
- `cloak`: Back slot (future)
- `belt`: Waist slot (future)

**Player Equipment Property:**

```javascript
player.equipment = {
  weapon_main: itemRef,           // Reference to item instance
  weapon_off: null,
  body: itemRef,
  head: null,
  hands: null,
  feet: null,
  ring_1: itemRef,
  ring_2: null,
  amulet: itemRef,
  bracers: null
};
```

---

## 3. Weapon Integration

### 3.1 Weapon Damage Calculation

**Updated Damage Flow:**

```javascript
/**
 * Get effective weapon damage for an attacker
 * Handles one-handed, two-handed, and versatile weapons
 */
function getWeaponDamage(attacker) {
  const weapon = attacker.equipment.weapon_main;

  if (!weapon) {
    // Unarmed strike
    return {
      damageDice: '1d4',
      damageType: 'physical',
      attackBonus: 0,
      damageBonus: 0
    };
  }

  // Check if using two hands for versatile weapon
  const usingTwoHands = weapon.handedness === 'versatile' &&
                        !attacker.equipment.weapon_off;

  return {
    damageDice: usingTwoHands ? weapon.damageDiceTwo : weapon.damageDice,
    damageType: weapon.damageType,
    attackBonus: weapon.attackBonus || 0,
    damageBonus: weapon.damageBonus || 0
  };
}
```

**Damage Roll with Weapon Bonuses:**

```javascript
function rollWeaponDamage(attacker, weaponData, isCritical) {
  // 1. Roll weapon dice
  let baseDamage = rollDice(weaponData.damageDice);

  // 2. Add ability modifier (STR or DEX for finesse)
  const useFinesse = weaponData.finesse &&
                     getModifier(attacker.dex) > getModifier(attacker.str);
  const abilityMod = useFinesse ?
                     getModifier(attacker.dex) :
                     getModifier(attacker.str);

  baseDamage += abilityMod;

  // 3. Add weapon damage bonus (magical weapons)
  baseDamage += weaponData.damageBonus;

  // 4. Minimum damage of 1
  baseDamage = Math.max(1, baseDamage);

  // 5. Critical hit doubles DICE damage, not modifiers
  if (isCritical) {
    const diceOnlyDamage = rollDice(weaponData.damageDice);
    baseDamage += diceOnlyDamage; // Add another set of dice
  }

  return baseDamage;
}
```

**Important:** D&D 5e critical hits double **dice**, not modifiers. A critical hit with a longsword (1d8+3) rolls 2d8+3, not (1d8+3)×2.

### 3.2 Two-Handed vs One-Handed

**Weapon Handedness Types:**

1. **One-Handed:** Can be used with shield or dual-wielded (if light)
   - Examples: Shortsword (1d6), Mace (1d6)

2. **Two-Handed:** Requires both hands, no shield
   - Examples: Greatsword (2d6), Longbow (1d8)
   - Benefit: Higher damage dice

3. **Versatile:** Can use one OR two hands
   - Examples: Longsword (1d8/1d10), Spear (1d6/1d8)
   - Benefit: Flexibility based on tactical needs

**Implementation Logic:**

```javascript
function isUsingTwoHands(player) {
  const mainWeapon = player.equipment.weapon_main;
  const offHand = player.equipment.weapon_off;

  if (!mainWeapon) return false;

  // Two-handed weapons always use two hands
  if (mainWeapon.handedness === 'two-handed') {
    return true;
  }

  // Versatile weapons use two hands if off-hand is empty
  if (mainWeapon.handedness === 'versatile' && !offHand) {
    return true;
  }

  // One-handed weapons never use two hands
  return false;
}
```

**Equipment Validation:**

```javascript
function canEquipWeapon(player, weapon, slot) {
  // Cannot equip two-handed weapon if off-hand occupied
  if (slot === 'weapon_main' && weapon.handedness === 'two-handed') {
    if (player.equipment.weapon_off) {
      return {
        success: false,
        reason: 'You must free your off-hand to wield a two-handed weapon.'
      };
    }
  }

  // Cannot equip off-hand if main hand is two-handed
  if (slot === 'weapon_off' && player.equipment.weapon_main) {
    const mainWeapon = player.equipment.weapon_main;
    if (mainWeapon.handedness === 'two-handed') {
      return {
        success: false,
        reason: 'You cannot use anything in your off-hand while wielding a two-handed weapon.'
      };
    }
  }

  return { success: true };
}
```

### 3.3 Ranged vs Melee Weapons

**Key Mechanical Differences:**

| Aspect | Melee | Ranged |
|--------|-------|--------|
| **Attack Range** | 5 ft (10 ft with reach) | 30-600 ft (weapon-dependent) |
| **Ability Modifier** | STR (or DEX for finesse) | DEX |
| **Disadvantage in Melee** | No | Yes (within 5 ft of enemy) |
| **Ammunition** | Not required | Required (arrows, bolts) |
| **Cover Bonus** | N/A | Target gets +2/+5 AC |

**Ranged Attack Implementation:**

```javascript
function resolveRangedAttack(attacker, defender, weapon) {
  let attackBonus = getModifier(attacker.dex) + attacker.proficiency;
  attackBonus += weapon.attackBonus || 0;

  // Check for disadvantage (enemy within 5 ft)
  const enemiesInMelee = getEnemiesInMelee(attacker);
  let advantageType = 'normal';

  if (enemiesInMelee.length > 0) {
    advantageType = 'disadvantage';
    broadcastToCombat('${attacker.name} shoots at disadvantage (enemy in melee)!');
  }

  // Check range penalties
  const distance = getDistance(attacker, defender);
  const normalRange = weapon.range || 30;
  const longRange = weapon.longRange || normalRange * 3;

  if (distance > normalRange && distance <= longRange) {
    advantageType = 'disadvantage';
    broadcastToCombat('${attacker.name} shoots at long range!');
  } else if (distance > longRange) {
    return {
      hit: false,
      reason: 'Target is out of range!'
    };
  }

  // Roll attack
  return rollAttackWithAdvantage(attackBonus, defender.armorClass, advantageType);
}
```

**Ammunition Tracking:**

```javascript
// Simple ammunition system
function useAmmunition(player, weapon) {
  if (!weapon.requiresAmmo) return { success: true };

  const ammoType = weapon.ammoType; // 'arrows', 'bolts', 'bullets'
  const ammoCount = player.inventory[ammoType] || 0;

  if (ammoCount <= 0) {
    return {
      success: false,
      reason: `You are out of ${ammoType}!`
    };
  }

  // Consume 1 ammunition
  player.inventory[ammoType]--;

  // 50% chance to recover ammo after combat (D&D rule)
  return { success: true };
}
```

### 3.4 Attack Bonus Calculation

**Full Attack Bonus Formula:**

```
Attack Roll = 1d20 + proficiency + ability modifier + weapon bonus + situational modifiers

Where:
- Proficiency: +2 at L1, +3 at L5, +4 at L9, etc.
- Ability Modifier: STR for melee, DEX for ranged/finesse
- Weapon Bonus: +1, +2, +3 for magical weapons
- Situational: Advantage/disadvantage, cover, conditions
```

**Updated Implementation:**

```javascript
function getAttackBonus(attacker, weapon, target) {
  // 1. Base proficiency
  let bonus = attacker.proficiency;

  // 2. Ability modifier
  const isRanged = weapon.range === 'ranged';
  const isFinesse = weapon.finesse && !isRanged;

  if (isRanged || isFinesse) {
    // Use DEX if higher (for finesse) or always (for ranged)
    const strMod = getModifier(attacker.str);
    const dexMod = getModifier(attacker.dex);
    bonus += isFinesse ? Math.max(strMod, dexMod) : dexMod;
  } else {
    // Melee weapons use STR
    bonus += getModifier(attacker.str);
  }

  // 3. Weapon magical bonus
  bonus += weapon.attackBonus || 0;

  // 4. Check proficiency penalty (if not proficient)
  if (!hasProficiency(attacker, weapon)) {
    bonus -= attacker.proficiency; // Remove proficiency bonus
  }

  return bonus;
}
```

---

## 4. Armor Integration

### 4.1 Armor Class Calculation

**Full AC Formula:**

```
AC = base armor AC + DEX modifier (capped by armor type) + shield bonus + magical bonuses

Where:
- Base Armor AC: 11 (leather), 14 (chain), 18 (plate)
- DEX Modifier: Full for light, max +2 for medium, none for heavy
- Shield Bonus: +2 if equipped
- Magical Bonuses: +1/+2/+3 from enchanted items
```

**Updated Implementation:**

```javascript
function calculateArmorClass(player) {
  let ac = 10; // Unarmored base
  let dexMod = getModifier(player.dex);
  let maxDexBonus = null; // null = unlimited

  // 1. Check equipped body armor
  const bodyArmor = player.equipment.body;
  if (bodyArmor) {
    ac = bodyArmor.baseAC;
    maxDexBonus = bodyArmor.maxDexBonus;
    ac += bodyArmor.acBonus || 0; // Magical bonus

    // Check for armor proficiency
    if (!hasProficiency(player, bodyArmor)) {
      ac -= 2; // Penalty for wearing armor you're not proficient with
    }
  }

  // 2. Apply DEX modifier (capped by armor type)
  if (maxDexBonus !== null) {
    dexMod = Math.min(dexMod, maxDexBonus);
  }
  ac += dexMod;

  // 3. Check for shield
  const shield = player.equipment.weapon_off;
  if (shield && shield.armorType === 'shield') {
    ac += shield.baseAC || 2;
    ac += shield.acBonus || 0;

    if (!hasProficiency(player, shield)) {
      ac -= 2; // Penalty for using shield without proficiency
    }
  }

  // 4. Add jewelry/bracers bonuses
  ac += getEquipmentACBonuses(player);

  // 5. Minimum AC of 10
  return Math.max(10, ac);
}
```

**Armor Type Examples:**

```javascript
// Light Armor (full DEX bonus)
{
  name: 'Leather Armor',
  baseAC: 11,
  maxDexBonus: null,  // No limit
  armorType: 'light'
}

// Medium Armor (DEX bonus capped at +2)
{
  name: 'Chain Shirt',
  baseAC: 13,
  maxDexBonus: 2,  // Max +2 DEX
  armorType: 'medium'
}

// Heavy Armor (no DEX bonus)
{
  name: 'Plate Armor',
  baseAC: 18,
  maxDexBonus: 0,  // No DEX bonus
  armorType: 'heavy',
  minStrength: 15  // STR requirement
}
```

### 4.2 Damage Mitigation

**Two Approaches:**

**Approach 1: AC-Only (Pure D&D 5e)**
- Armor increases AC
- No damage reduction
- Binary hit/miss system
- **Pros:** Authentic D&D, simple, mathematically sound
- **Cons:** Less visceral feedback, high variance

**Approach 2: AC + Damage Reduction (MUD-style)**
- Armor provides AC **and** flat damage reduction
- Reduces damage by 1-5 per hit
- **Pros:** More "realistic," consistent mitigation
- **Cons:** Deviates from D&D, balance complexity

**Recommendation:** Use **Approach 1 (AC-only)** for initial implementation to maintain D&D fidelity. Add optional damage reduction later as a MUD-specific feature for heavy armor only.

**Optional Damage Reduction (Future Feature):**

```javascript
function applyArmorDamageReduction(damage, defender) {
  const bodyArmor = defender.equipment.body;

  if (!bodyArmor || !bodyArmor.damageReduction) {
    return damage;
  }

  // Apply flat reduction per damage type
  const reduction = bodyArmor.damageReduction[damageType] ||
                    bodyArmor.damageReduction.physical ||
                    0;

  // Damage reduction can't reduce below 1 (D&D minimum damage rule)
  return Math.max(1, damage - reduction);
}
```

### 4.3 Armor Proficiency Penalties

**D&D 5e Proficiency Rules:**

- **Wearing armor without proficiency:**
  - Disadvantage on all ability checks, saving throws, and attack rolls involving STR or DEX
  - Cannot cast spells

**MUD Adaptation (Simplified):**

```javascript
function checkArmorProficiencyPenalty(player) {
  const bodyArmor = player.equipment.body;

  if (!bodyArmor) return null;

  if (!hasProficiency(player, bodyArmor)) {
    return {
      attackDisadvantage: true,
      acPenalty: -2,
      cannotCastSpells: true
    };
  }

  return null;
}

function hasArmorDisadvantage(player) {
  const penalty = checkArmorProficiencyPenalty(player);
  return penalty && penalty.attackDisadvantage;
}
```

**Application in Combat:**

```javascript
function resolveAttackRoll(attacker, defender) {
  // ... existing advantage/disadvantage logic ...

  // Check if attacker wearing non-proficient armor
  if (hasArmorDisadvantage(attacker)) {
    attackerParticipant.disadvantageCount++;
    broadcastToCombat(`${attacker.name}'s armor hinders their movements!`);
  }

  // ... rest of attack resolution ...
}
```

---

## 5. Proficiency System

### 5.1 Proficiency Categories

**Weapon Proficiencies (D&D 5e):**

- **Simple Weapons:** Club, dagger, mace, quarterstaff, shortbow, sling
- **Martial Weapons:** Longsword, greatsword, longbow, warhammer, battleaxe
- **Exotic Weapons:** (MUD-specific) Whips, nets, specialized weapons

**Armor Proficiencies:**

- **Light Armor:** Cloth, leather, padded
- **Medium Armor:** Hide, chain shirt, scale mail
- **Heavy Armor:** Chain mail, splint, plate
- **Shields:** All shields

**Player Proficiency Structure:**

```javascript
player.proficiencies = {
  weapons: [
    'simple_weapons',      // All simple weapons
    'martial_weapons',     // All martial weapons
    'longswords',          // Specific weapon type
    'shortswords'
  ],
  armor: [
    'light_armor',
    'medium_armor',
    'shields'
  ]
};
```

### 5.2 Proficiency Checks

**Weapon Proficiency Check:**

```javascript
function hasWeaponProficiency(player, weapon) {
  if (!weapon || !player.proficiencies) {
    return false;
  }

  const weaponProfs = player.proficiencies.weapons || [];

  // Check for specific weapon proficiency
  if (weaponProfs.includes(weapon.weaponType)) {
    return true;
  }

  // Check for category proficiency
  if (weapon.category === 'simple' && weaponProfs.includes('simple_weapons')) {
    return true;
  }

  if (weapon.category === 'martial' && weaponProfs.includes('martial_weapons')) {
    return true;
  }

  return false;
}
```

**Armor Proficiency Check:**

```javascript
function hasArmorProficiency(player, armor) {
  if (!armor || !player.proficiencies) {
    return false;
  }

  const armorProfs = player.proficiencies.armor || [];

  // Check for armor type proficiency
  const proficiencyName = `${armor.armorType}_armor`;

  if (armorProfs.includes(proficiencyName)) {
    return true;
  }

  // Shields are separate
  if (armor.armorType === 'shield' && armorProfs.includes('shields')) {
    return true;
  }

  return false;
}
```

### 5.3 Proficiency Bonuses and Penalties

**Weapon Proficiency:**

**WITH Proficiency:**
- Attack roll = d20 + proficiency bonus + ability modifier + weapon bonus

**WITHOUT Proficiency:**
- Attack roll = d20 + ability modifier + weapon bonus
- (No proficiency bonus added)
- Optional penalty: -2 to hit (MUD-specific)

**Armor Proficiency:**

**WITH Proficiency:**
- Full AC from armor

**WITHOUT Proficiency:**
- AC penalty: -2
- Disadvantage on all STR/DEX checks and attacks
- Cannot cast spells (if player is a caster)

**Implementation:**

```javascript
function getAttackBonusWithProficiency(attacker, weapon) {
  let bonus = getModifier(attacker.str); // Or DEX for finesse/ranged

  if (hasWeaponProficiency(attacker, weapon)) {
    bonus += attacker.proficiency;
  } else {
    // Optionally add penalty for non-proficiency
    bonus -= 2; // MUD-specific penalty

    // Send warning to player
    if (attacker.socket) {
      attacker.send(colors.warning(
        `You lack proficiency with ${weapon.name}!`
      ));
    }
  }

  bonus += weapon.attackBonus || 0;

  return bonus;
}
```

### 5.4 Gaining Proficiencies

**Methods to Gain Proficiencies:**

1. **Class/Guild Starting Proficiencies:**
   - Fighters: All weapons, all armor, shields
   - Rogues: Simple weapons, light armor
   - Mages: Daggers, staves, cloth armor only

2. **Leveling Up:**
   - Every 5 levels, gain 1 weapon proficiency of choice
   - Every 10 levels, gain 1 armor proficiency of choice

3. **Training NPCs:**
   - Pay gold/complete quests to learn proficiency
   - "Train with the weapon master to learn longswords"

4. **Weapon Usage (Skill-by-Use):**
   - After X successful hits with a weapon, gain proficiency
   - More MUD-like, less D&D-like

**Recommended Approach:** Use **Class-based starting proficiencies** + **Leveling rewards** for D&D authenticity.

---

## 6. Magical Effects System

### 6.1 Magic Effect Types

**Passive Effects (Always Active):**
- Stat bonuses (+2 STR, +1 DEX)
- Resistance bonuses (20% fire resistance)
- AC bonuses (+1 AC from ring)
- HP regeneration (1 HP per turn)

**Triggered Effects (Conditional):**
- **On Hit:** Extra damage, apply status effect
- **On Crit:** Double extra damage, special message
- **On Miss:** Chance to re-roll
- **Start of Turn:** Heal, gain temp HP, remove condition
- **End of Turn:** DoT effects, buff expiration
- **On Kill:** Restore HP, gain temporary buff

**Autocast Effects (Spell-like):**
- **On Attack:** 10% chance to cast Fireball at target
- **On Damage Taken:** Automatically cast Shield spell
- **On Low HP:** Automatically cast Healing Word

### 6.2 Magic Effect Schema

```javascript
// Example: Flaming Sword
magicEffects: [
  {
    type: 'extra_damage',
    damageDice: '1d6',
    damageType: 'fire',
    trigger: 'on_hit',
    message: '${attacker.name}\'s sword erupts in flames!'
  },
  {
    type: 'autocast_spell',
    spell: 'fireball',
    trigger: 'on_attack',
    chance: 0.05,                    // 5% chance
    cooldown: 30000,                 // 30 second cooldown
    targetSelf: false,               // Target enemy
    message: '${attacker.name}\'s sword unleashes a massive fireball!'
  }
]

// Example: Ring of Regeneration
magicEffects: [
  {
    type: 'passive_heal',
    amount: 1,
    trigger: 'start_of_turn',
    inCombatOnly: true,
    message: 'You feel the ring\'s power restore your vitality.'
  }
]

// Example: Cloak of Displacement
magicEffects: [
  {
    type: 'grant_advantage',
    trigger: 'on_attacked',
    chance: 0.50,                    // 50% chance
    durationRounds: 1,               // Until next turn
    message: 'Your form shimmers and blurs!'
  }
]
```

### 6.3 Magic Effect Processing

**When to Process Effects:**

```javascript
// In CombatEncounter.executeCombatRound()

for (const attacker of this.participants) {
  // 1. Process "start_of_turn" effects
  processStartOfTurnEffects(attacker);

  // 2. Select action and target
  const target = selectTarget(attacker);

  // 3. Process "on_attack" effects (before roll)
  processOnAttackEffects(attacker, target);

  // 4. Roll attack
  const attackResult = rollAttack(attacker, target);

  // 5. Process "on_hit" or "on_miss" effects
  if (attackResult.hit) {
    processOnHitEffects(attacker, target, attackResult);

    // 6. Roll damage (including extra damage from effects)
    const damageResult = rollDamageWithEffects(attacker, target, attackResult);

    // 7. Apply damage
    applyDamage(target, damageResult);

    // 8. Check for death
    if (target.isDead()) {
      processOnKillEffects(attacker, target);
    }
  } else {
    processOnMissEffects(attacker, target);
  }

  // 9. Process "end_of_turn" effects
  processEndOfTurnEffects(attacker);
}
```

**Extra Damage Implementation:**

```javascript
function rollDamageWithEffects(attacker, target, attackResult) {
  // Roll base weapon damage
  let totalDamage = rollWeaponDamage(attacker, attackResult.critical);
  let damageBreakdown = [{
    amount: totalDamage,
    type: attacker.currentWeapon.damageType,
    source: 'weapon'
  }];

  // Check for extra damage effects on equipped items
  const equippedItems = getAllEquippedItems(attacker);

  for (const item of equippedItems) {
    if (!item.magicEffects) continue;

    for (const effect of item.magicEffects) {
      if (effect.type === 'extra_damage' && effect.trigger === 'on_hit') {
        // Roll extra damage
        const extraDamage = rollDice(effect.damageDice);

        // Critical hits double extra damage dice (D&D rule)
        const finalExtra = attackResult.critical ? extraDamage * 2 : extraDamage;

        totalDamage += finalExtra;
        damageBreakdown.push({
          amount: finalExtra,
          type: effect.damageType,
          source: item.name
        });

        // Send flavor message
        if (effect.message) {
          broadcastToCombat(interpolateMessage(effect.message, attacker, target));
        }
      }
    }
  }

  return { totalDamage, damageBreakdown };
}
```

### 6.4 Autocast Spell System

**Spell Autocast Flow:**

```javascript
function processAutocastEffects(attacker, target, trigger) {
  const equippedItems = getAllEquippedItems(attacker);

  for (const item of equippedItems) {
    if (!item.magicEffects) continue;

    for (const effect of item.magicEffects) {
      if (effect.type !== 'autocast_spell') continue;
      if (effect.trigger !== trigger) continue;

      // Check cooldown
      if (isOnCooldown(attacker, item, effect)) {
        continue;
      }

      // Check random chance
      if (Math.random() > effect.chance) {
        continue;
      }

      // Cast the spell
      const spell = getSpell(effect.spell);
      const spellTarget = effect.targetSelf ? attacker : target;

      broadcastToCombat(interpolateMessage(
        effect.message || `${item.name} activates!`,
        attacker,
        target
      ));

      castSpell(attacker, spellTarget, spell);

      // Set cooldown
      setCooldown(attacker, item, effect, effect.cooldown);
    }
  }
}
```

**Spell Definitions (Future System):**

```javascript
const SPELLS = {
  fireball: {
    name: 'Fireball',
    damage: '8d6',
    damageType: 'fire',
    area: 'single',  // or 'aoe'
    savingThrow: 'dex',
    saveDC: 15,
    description: 'A bright streak flashes from your hand to a point you choose...'
  },

  healing_word: {
    name: 'Healing Word',
    healing: '1d4+3',
    area: 'single',
    description: 'A word of comfort restores hit points...'
  }
};
```

**Cooldown Tracking:**

```javascript
// Add to player object
player.itemCooldowns = new Map(); // Map<itemId_effectIndex, expiresAt>

function isOnCooldown(player, item, effect) {
  const key = `${item.id}_${effect.type}`;
  const expiresAt = player.itemCooldowns.get(key);

  if (!expiresAt) return false;

  if (Date.now() < expiresAt) {
    return true; // Still on cooldown
  }

  // Cooldown expired, clear it
  player.itemCooldowns.delete(key);
  return false;
}

function setCooldown(player, item, effect, durationMs) {
  const key = `${item.id}_${effect.type}`;
  const expiresAt = Date.now() + durationMs;
  player.itemCooldowns.set(key, expiresAt);
}
```

---

## 7. Stat Bonuses System

### 7.1 Aggregating Equipment Bonuses

**Stat Bonus Sources:**
- Weapons (+1 STR sword)
- Armor (+2 CON plate)
- Jewelry (+3 DEX ring)
- Shields (+1 WIS shield)

**Implementation:**

```javascript
function getEquipmentStatBonuses(player) {
  const bonuses = {
    str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0
  };

  // Iterate through all equipment slots
  for (const [slot, item] of Object.entries(player.equipment)) {
    if (!item || !item.statBonuses) continue;

    for (const [stat, bonus] of Object.entries(item.statBonuses)) {
      bonuses[stat] += bonus;
    }
  }

  return bonuses;
}

function getEffectiveStat(player, statName) {
  const baseStat = player[statName]; // e.g., player.str
  const equipmentBonus = getEquipmentStatBonuses(player)[statName];

  return baseStat + equipmentBonus;
}
```

**Usage in Combat:**

```javascript
// OLD (incorrect)
const attackBonus = getModifier(attacker.str) + attacker.proficiency;

// NEW (correct)
const effectiveStr = getEffectiveStat(attacker, 'str');
const attackBonus = getModifier(effectiveStr) + attacker.proficiency;
```

### 7.2 Resistance Aggregation

**Resistance Bonus Sources:**
- Armor (10% physical resistance)
- Ring (20% fire resistance)
- Amulet (15% ice resistance)

**Implementation:**

```javascript
function getEquipmentResistances(player) {
  const resistances = {
    physical: 0, fire: 0, ice: 0, lightning: 0,
    poison: 0, necrotic: 0, radiant: 0, psychic: 0
  };

  for (const [slot, item] of Object.entries(player.equipment)) {
    if (!item || !item.resistances) continue;

    for (const [type, value] of Object.entries(item.resistances)) {
      // Resistances stack additively (up to 75% cap)
      resistances[type] = Math.min(0.75, resistances[type] + value);
    }
  }

  return resistances;
}

function getTotalResistance(player, damageType) {
  const baseResist = player.resistances[damageType] || 0;
  const equipmentResist = getEquipmentResistances(player)[damageType] || 0;

  // Cap at 75% resistance (D&D standard)
  return Math.min(0.75, baseResist + equipmentResist);
}
```

### 7.3 AC Bonus Aggregation

**AC Bonus Sources:**
- Armor (+1 AC enchantment)
- Shield (+2 AC base, +1 enchantment)
- Ring of Protection (+1 AC)
- Bracers of Defense (+2 AC)

**Implementation:**

```javascript
function getEquipmentACBonuses(player) {
  let totalBonus = 0;

  for (const [slot, item] of Object.entries(player.equipment)) {
    if (!item) continue;

    // Armor/shield AC bonuses
    if (item.acBonus) {
      totalBonus += item.acBonus;
    }

    // Jewelry AC bonuses (rings, amulets, bracers)
    if (item.type === 'jewelry' && item.acBonus) {
      totalBonus += item.acBonus;
    }
  }

  return totalBonus;
}
```

---

## 8. Balance Recommendations

### 8.1 Weapon Damage Balance

**Damage Dice Progression (D&D 5e Standard):**

| Weapon Type | One-Handed | Two-Handed | Finesse | Reach |
|-------------|------------|------------|---------|-------|
| **Simple**  |            |            |         |       |
| Dagger      | 1d4        | -          | Yes     | No    |
| Club        | 1d4        | -          | No      | No    |
| Quarterstaff| 1d6        | 1d8        | No      | No    |
| Spear       | 1d6        | 1d8        | No      | Yes   |
| **Martial** |            |            |         |       |
| Shortsword  | 1d6        | -          | Yes     | No    |
| Longsword   | 1d8        | 1d10       | No      | No    |
| Rapier      | 1d8        | -          | Yes     | No    |
| Greatsword  | -          | 2d6        | No      | No    |
| Greataxe    | -          | 1d12       | No      | No    |

**Average Damage Per Round (DPR) at Level 1:**

Assumptions:
- STR/DEX modifier: +3
- Proficiency bonus: +2
- Enemy AC: 13
- Hit probability: ~65%

| Weapon | Damage Formula | Avg Hit | DPR |
|--------|----------------|---------|-----|
| Dagger (1d4) | 1d4+3 | 5.5 | 3.6 |
| Shortsword (1d6) | 1d6+3 | 6.5 | 4.2 |
| Longsword 1H (1d8) | 1d8+3 | 7.5 | 4.9 |
| Longsword 2H (1d10) | 1d10+3 | 8.5 | 5.5 |
| Greatsword (2d6) | 2d6+3 | 10 | 6.5 |

**Guidance:**
- Two-handed weapons should deal ~30% more damage than one-handed
- Versatile weapons bridge the gap (+1-2 damage when two-handed)
- Finesse weapons trade damage for flexibility (DEX-based)

### 8.2 Armor Class Balance

**Target ACs by Level:**

| Level | Light Armor | Medium Armor | Heavy Armor |
|-------|-------------|--------------|-------------|
| 1-4   | 13-15       | 15-17        | 16-18       |
| 5-10  | 15-17       | 17-19        | 18-20       |
| 11-16 | 17-19       | 19-21        | 20-22       |
| 17-20 | 19-21       | 21-23        | 22-24       |

**Armor Progression Examples:**

```javascript
// Tier 1 (Levels 1-4)
{ name: 'Leather Armor', baseAC: 11, value: 10, rarity: 'common' }
{ name: 'Chain Shirt', baseAC: 13, value: 50, rarity: 'common' }
{ name: 'Chain Mail', baseAC: 16, value: 75, rarity: 'common' }

// Tier 2 (Levels 5-10)
{ name: 'Studded Leather', baseAC: 12, value: 45, rarity: 'common' }
{ name: 'Scale Mail', baseAC: 14, maxDexBonus: 2, value: 50, rarity: 'common' }
{ name: 'Splint Armor', baseAC: 17, value: 200, rarity: 'uncommon' }

// Tier 3 (Levels 11-16)
{ name: 'Leather Armor +1', baseAC: 11, acBonus: 1, value: 500, rarity: 'uncommon' }
{ name: 'Plate Armor', baseAC: 18, value: 1500, rarity: 'rare' }

// Tier 4 (Levels 17-20)
{ name: 'Plate Armor +2', baseAC: 18, acBonus: 2, value: 8000, rarity: 'very rare' }
```

**AC vs Attack Bonus Scaling:**

| Level | Proficiency | Avg AC | Avg Attack | Hit Chance |
|-------|-------------|--------|------------|------------|
| 1     | +2          | 13     | +5         | 65%        |
| 5     | +3          | 16     | +7         | 60%        |
| 10    | +4          | 18     | +9         | 60%        |
| 15    | +5          | 20     | +11        | 60%        |
| 20    | +6          | 22     | +13        | 60%        |

**Target:** Maintain ~60% hit rate at equal level encounters.

### 8.3 Magical Item Rarity and Power

**D&D 5e Rarity System:**

| Rarity | Bonus | Level Range | Market Value | Drop Rate |
|--------|-------|-------------|--------------|-----------|
| Common | +0    | 1+          | 50-100g      | 40%       |
| Uncommon | +1  | 3+          | 101-500g     | 30%       |
| Rare | +2      | 7+          | 501-5000g    | 20%       |
| Very Rare | +3  | 11+         | 5001-50000g  | 8%        |
| Legendary | +4+ | 17+         | 50000g+      | 2%        |

**Magical Weapon Guidelines:**

```javascript
// +1 Weapon (Uncommon, Level 3+)
{
  attackBonus: 1,
  damageBonus: 1,
  magicEffects: null,  // No special effects
  value: 300
}

// +2 Weapon (Rare, Level 7+)
{
  attackBonus: 2,
  damageBonus: 2,
  magicEffects: [
    { type: 'extra_damage', damageDice: '1d4', damageType: 'fire', trigger: 'on_hit' }
  ],
  value: 2000
}

// +3 Weapon (Very Rare, Level 11+)
{
  attackBonus: 3,
  damageBonus: 3,
  magicEffects: [
    { type: 'extra_damage', damageDice: '1d6', damageType: 'fire', trigger: 'on_hit' },
    { type: 'autocast_spell', spell: 'fireball', chance: 0.05, cooldown: 30000 }
  ],
  value: 10000
}
```

**Stat Bonus Guidelines:**

| Rarity | Stat Bonus | Secondary Bonus | Resistance Bonus |
|--------|------------|-----------------|------------------|
| Common | +1 | - | 5-10% |
| Uncommon | +2 | +1 | 10-15% |
| Rare | +3 | +2 | 15-25% |
| Very Rare | +4 | +3 | 25-35% |
| Legendary | +5 | +4 | 35-50% |

**Resistance Cap:** 75% maximum (D&D 5e standard) to prevent immunity stacking.

### 8.4 Time-to-Kill (TTK) Targets

**Solo Combat TTK Goals:**

| Encounter Type | Rounds | Real Time (3s/round) |
|----------------|--------|----------------------|
| Trash mob (same level) | 2-4 | 6-12 seconds |
| Standard mob | 4-6 | 12-18 seconds |
| Elite mob (+2 levels) | 6-10 | 18-30 seconds |
| Boss (+5 levels) | 10-20 | 30-60 seconds |

**Balancing Factors:**
- Player HP: 10 + (level × 5)
- Mob HP: (level × 5) to (level × 10) for bosses
- Player DPR: 3-6 at L1, 10-20 at L10, 30-50 at L20
- Mob DPR: Similar to player at equal level

**Example L5 Balance:**

```
Player:
- HP: 30 (10 + 25)
- AC: 16 (studded leather + DEX)
- Attack: +7 (prof +3, STR +4)
- DPR: ~10 (1d8+4 longsword, 60% hit rate)

Elite Mob (L7):
- HP: 50
- AC: 15
- Attack: +6
- DPR: ~12 (1d10+3)

TTK: ~5 rounds for player to kill mob, ~2.5 rounds for mob to kill player
Result: Challenging but winnable with tactical play
```

---

## 9. Combat Integration Points

### 9.1 Modified CombatResolver Functions

**File:** `/src/combat/combatResolver.js`

**Changes Required:**

1. **Update `getAttackBonus()` to include weapon bonuses:**

```javascript
// OLD
function getAttackBonus(attacker, damageType) {
  const proficiency = getProficiencyBonus(attacker.level);
  const ability = damageType === 'physical'
    ? getModifier(attacker.strength)
    : getModifier(attacker.dexterity);
  const equipment = 0; // Future: weapon bonus

  return proficiency + ability + equipment;
}

// NEW
function getAttackBonus(attacker, weapon, target) {
  // Get effective weapon
  const effectiveWeapon = weapon || getEquippedWeapon(attacker);

  // Base proficiency
  let bonus = attacker.proficiency;

  // Ability modifier (STR for melee, DEX for ranged/finesse)
  const isRanged = effectiveWeapon.range === 'ranged';
  const isFinesse = effectiveWeapon.finesse;

  if (isRanged) {
    bonus += getEffectiveModifier(attacker, 'dex');
  } else if (isFinesse) {
    // Use higher of STR or DEX
    const strMod = getEffectiveModifier(attacker, 'str');
    const dexMod = getEffectiveModifier(attacker, 'dex');
    bonus += Math.max(strMod, dexMod);
  } else {
    bonus += getEffectiveModifier(attacker, 'str');
  }

  // Weapon magical bonus
  bonus += effectiveWeapon.attackBonus || 0;

  // Check proficiency penalty
  if (!hasWeaponProficiency(attacker, effectiveWeapon)) {
    bonus -= attacker.proficiency; // Remove proficiency bonus
    // Optionally add additional penalty
    bonus -= 2;
  }

  return bonus;
}
```

2. **Update `getArmorClass()` to include armor equipment:**

```javascript
// OLD
function getArmorClass(defender) {
  const baseAC = 10;
  const dexMod = getModifier(defender.dexterity);
  const armorBonus = 0; // Future: armor equipment

  return baseAC + dexMod + armorBonus;
}

// NEW
function getArmorClass(defender) {
  return calculateArmorClass(defender); // Use new comprehensive function
}

function calculateArmorClass(player) {
  let ac = 10; // Unarmored base
  let dexMod = getEffectiveModifier(player, 'dex');
  let maxDexBonus = null;

  // Body armor
  const bodyArmor = player.equipment?.body;
  if (bodyArmor) {
    ac = bodyArmor.baseAC;
    maxDexBonus = bodyArmor.maxDexBonus;
    ac += bodyArmor.acBonus || 0;

    // Proficiency penalty
    if (!hasArmorProficiency(player, bodyArmor)) {
      ac -= 2;
    }
  }

  // Apply capped DEX
  if (maxDexBonus !== null) {
    dexMod = Math.min(dexMod, maxDexBonus);
  }
  ac += dexMod;

  // Shield
  const shield = player.equipment?.weapon_off;
  if (shield && shield.armorType === 'shield') {
    ac += shield.baseAC || 2;
    ac += shield.acBonus || 0;

    if (!hasArmorProficiency(player, shield)) {
      ac -= 2;
    }
  }

  // Jewelry/accessory bonuses
  ac += getEquipmentACBonuses(player);

  return Math.max(10, ac);
}
```

3. **Update `getDamageDice()` to handle two-handed weapons:**

```javascript
// OLD
function getDamageDice(attacker) {
  if (attacker.equippedWeapon && attacker.equippedWeapon.damage) {
    return attacker.equippedWeapon.damage;
  }
  return '1d4';
}

// NEW
function getDamageDice(attacker) {
  const weapon = attacker.equipment?.weapon_main;

  if (!weapon) {
    return '1d4'; // Unarmed
  }

  // Check if using two hands for versatile weapon
  if (weapon.handedness === 'versatile' && !attacker.equipment.weapon_off) {
    return weapon.damageDiceTwo || weapon.damageDice;
  }

  return weapon.damageDice;
}
```

4. **Update `rollDamage()` to include weapon damage bonuses:**

```javascript
// Existing code is mostly correct, add:
baseDamage += weapon.damageBonus || 0;

// After ability modifier, before min damage check
```

5. **Update `applyDamage()` to handle armor damage reduction (optional):**

```javascript
function applyDamage(target, rawDamage, damageType) {
  const resistance = target.resistances[damageType] || 0;

  // Apply resistance multiplier
  let finalDamage = calculateResistance(rawDamage, damageType, target.resistances);

  // Apply armor damage reduction (optional MUD feature)
  if (target.equipment?.body?.damageReduction) {
    const reduction = target.equipment.body.damageReduction[damageType] ||
                      target.equipment.body.damageReduction.physical || 0;
    finalDamage = Math.max(1, finalDamage - reduction);
  }

  target.takeDamage(finalDamage);

  if (target.socket) {
    target.lastDamageTaken = Date.now();
  }

  return {
    rawDamage,
    resistance,
    finalDamage,
    dead: target.isDead()
  };
}
```

### 9.2 Modified CombatEncounter Flow

**File:** `/src/combat/CombatEncounter.js`

**Changes Required:**

1. **Add magic effect processing in `executeCombatRound()`:**

```javascript
executeCombatRound() {
  if (!this.isActive) return;

  this.turn++;

  for (const attacker of this.participants) {
    if (attacker.isDead()) continue;

    // NEW: Process start-of-turn effects
    this.processStartOfTurnEffects(attacker);

    const target = this.participants.find(p => p !== attacker && !p.isDead());
    if (!target) {
      this.endCombat();
      return;
    }

    // Determine action (NPC AI or player action)
    // ... existing code ...

    // NEW: Process on-attack effects
    this.processOnAttackEffects(attacker, target);

    // Roll attack
    const attackResult = rollAttack(attacker, target);
    const attackMessage = getAttackMessage(attacker, target, attackResult.hit, attackResult.critical);
    this.broadcast(attackMessage);

    if (attackResult.hit) {
      // NEW: Get weapon with bonuses
      const weapon = getEquippedWeapon(attacker);
      const damageDice = getDamageDice(attacker);

      // Roll base damage
      let damage = rollDamage(attacker, damageDice, attackResult.critical);

      // NEW: Process on-hit effects (extra damage, etc.)
      const extraDamageResult = this.processOnHitEffects(attacker, target, attackResult);
      damage += extraDamageResult.totalExtraDamage;

      // Apply damage
      const damageResult = applyDamage(target, damage, weapon.damageType);
      const damageMessage = getDamageMessage(damageResult.finalDamage, weapon.damageType, target);
      this.broadcast(damageMessage);

      // Check for death
      if (damageResult.dead) {
        const deathMessage = getDeathMessage(target);
        this.broadcast(deathMessage);

        // NEW: Process on-kill effects
        this.processOnKillEffects(attacker, target);

        // ... existing death handling ...
      }
    } else {
      // NEW: Process on-miss effects
      this.processOnMissEffects(attacker, target);
    }

    // NEW: Process end-of-turn effects
    this.processEndOfTurnEffects(attacker);
  }
}
```

2. **Add magic effect processing methods:**

```javascript
processStartOfTurnEffects(combatant) {
  const equippedItems = getAllEquippedItems(combatant);

  for (const item of equippedItems) {
    if (!item.magicEffects) continue;

    for (const effect of item.magicEffects) {
      if (effect.trigger === 'start_of_turn') {
        this.triggerMagicEffect(combatant, null, effect, item);
      }
    }
  }
}

processOnHitEffects(attacker, target, attackResult) {
  let totalExtraDamage = 0;
  const equippedItems = getAllEquippedItems(attacker);

  for (const item of equippedItems) {
    if (!item.magicEffects) continue;

    for (const effect of item.magicEffects) {
      if (effect.type === 'extra_damage' && effect.trigger === 'on_hit') {
        const extraDamage = rollDice(effect.damageDice);
        const finalExtra = attackResult.critical ? extraDamage * 2 : extraDamage;
        totalExtraDamage += finalExtra;

        if (effect.message) {
          this.broadcast(interpolateMessage(effect.message, attacker, target));
        }
      }
    }
  }

  return { totalExtraDamage };
}

// Similar methods for processOnKillEffects, processOnMissEffects, etc.
```

### 9.3 Equipment Management Functions

**New File:** `/src/systems/equipment/EquipmentManager.js`

```javascript
/**
 * Equipment Manager
 * Handles equipping, unequipping, and equipment slot validation
 */

class EquipmentManager {
  /**
   * Equip an item to a player
   */
  static equipItem(player, item, slot) {
    // Validate item can be equipped
    const validation = this.validateEquip(player, item, slot);
    if (!validation.success) {
      return validation;
    }

    // Unequip existing item in slot
    if (player.equipment[slot]) {
      this.unequipItem(player, slot);
    }

    // Handle two-handed weapon special case
    if (item.handedness === 'two-handed') {
      if (player.equipment.weapon_off) {
        this.unequipItem(player, 'weapon_off');
      }
    }

    // Equip new item
    player.equipment[slot] = item;

    // Recalculate derived stats
    this.recalculateStats(player);

    return {
      success: true,
      message: `You equip ${item.name}.`
    };
  }

  /**
   * Unequip an item from a slot
   */
  static unequipItem(player, slot) {
    const item = player.equipment[slot];
    if (!item) {
      return { success: false, reason: 'Nothing equipped in that slot.' };
    }

    player.equipment[slot] = null;

    // Recalculate derived stats
    this.recalculateStats(player);

    return {
      success: true,
      message: `You unequip ${item.name}.`,
      item: item
    };
  }

  /**
   * Recalculate player stats based on equipment
   */
  static recalculateStats(player) {
    // Recalculate AC
    player.armorClass = calculateArmorClass(player);

    // Recalculate effective stats (for display in score)
    player.effectiveStats = {
      str: getEffectiveStat(player, 'str'),
      dex: getEffectiveStat(player, 'dex'),
      con: getEffectiveStat(player, 'con'),
      int: getEffectiveStat(player, 'int'),
      wis: getEffectiveStat(player, 'wis'),
      cha: getEffectiveStat(player, 'cha')
    };

    // Update max HP if CON changed
    const oldMaxHp = player.maxHp;
    player.maxHp = calculateMaxHp(player);

    // Adjust current HP proportionally if max changed
    if (oldMaxHp !== player.maxHp) {
      const hpPercent = player.currentHp / oldMaxHp;
      player.currentHp = Math.floor(player.maxHp * hpPercent);
    }
  }

  /**
   * Validate if item can be equipped
   */
  static validateEquip(player, item, slot) {
    // Check slot matches item type
    if (!this.isValidSlot(item, slot)) {
      return {
        success: false,
        reason: `${item.name} cannot be equipped in that slot.`
      };
    }

    // Check proficiency
    if (item.type === 'weapon' && !hasWeaponProficiency(player, item)) {
      // Warning but allow
      return {
        success: true,
        warning: `You are not proficient with ${item.name}.`
      };
    }

    if (item.type === 'armor' && !hasArmorProficiency(player, item)) {
      return {
        success: true,
        warning: `You are not proficient with ${item.armorType} armor.`
      };
    }

    // Check level requirement
    if (item.minLevel && player.level < item.minLevel) {
      return {
        success: false,
        reason: `You must be level ${item.minLevel} to use ${item.name}.`
      };
    }

    // Check stat requirements
    if (item.minStrength && player.str < item.minStrength) {
      return {
        success: false,
        reason: `You need ${item.minStrength} Strength to use ${item.name}.`
      };
    }

    // Check two-handed weapon conflicts
    if (item.handedness === 'two-handed' && player.equipment.weapon_off) {
      return {
        success: false,
        reason: 'You must free your off-hand to wield a two-handed weapon.'
      };
    }

    return { success: true };
  }

  static isValidSlot(item, slot) {
    if (item.type === 'weapon') {
      return slot === 'weapon_main' || slot === 'weapon_off';
    }

    if (item.type === 'armor') {
      return slot === item.slot; // e.g., 'body', 'head'
    }

    if (item.type === 'jewelry') {
      return slot === item.slot; // e.g., 'ring_1', 'amulet'
    }

    return false;
  }
}

module.exports = EquipmentManager;
```

---

## 10. Implementation Roadmap

### Phase 1: Weapon Integration (Week 1-2)

**Goals:**
- Weapons affect damage calculations
- Attack bonuses from magical weapons
- Two-handed vs one-handed mechanics
- Basic proficiency checks

**Tasks:**
1. Update `getDamageDice()` to support versatile weapons
2. Update `getAttackBonus()` to include weapon bonuses
3. Update `rollDamage()` to include weapon damage bonuses
4. Add `equipment` property to player schema
5. Implement `EquipmentManager.equipItem()` and `unequipItem()`
6. Add weapon proficiency checks
7. Create 5-10 example weapons (simple, martial, magical)
8. Test weapon equipping and combat

**Testing:**
- Equip dagger (1d4), verify damage
- Equip longsword (1d8), verify damage
- Equip longsword two-handed (1d10), verify damage
- Equip magical sword (+1), verify attack/damage bonuses
- Equip weapon without proficiency, verify penalty

### Phase 2: Armor Integration (Week 3-4)

**Goals:**
- Armor affects AC
- DEX bonuses capped by armor type
- Shields provide AC bonus
- Armor proficiency penalties

**Tasks:**
1. Update `calculateArmorClass()` comprehensive function
2. Add armor equipment slots (body, head, hands, feet)
3. Implement DEX cap logic (light/medium/heavy)
4. Add shield mechanics
5. Add armor proficiency checks
6. Create 10-15 example armor pieces
7. Test armor AC calculations
8. Test proficiency penalties

**Testing:**
- Equip leather armor, verify AC = 11 + DEX
- Equip plate armor, verify AC = 18 (no DEX)
- Equip shield, verify +2 AC
- Equip armor without proficiency, verify disadvantage

### Phase 3: Stat Bonuses (Week 5)

**Goals:**
- Equipment provides stat bonuses
- Bonuses aggregate across all equipment
- Effective stats used in combat

**Tasks:**
1. Implement `getEquipmentStatBonuses()`
2. Implement `getEffectiveStat()`
3. Update combat to use effective stats
4. Add stat bonus items (rings, amulets, magical weapons)
5. Test stat aggregation
6. Update `score` command to show bonuses

**Testing:**
- Equip ring (+2 DEX), verify effective DEX
- Equip multiple items with STR bonuses, verify aggregate
- Verify attack rolls use effective stats
- Verify AC uses effective DEX

### Phase 4: Basic Magical Effects (Week 6-7)

**Goals:**
- Extra damage on hit
- Passive stat bonuses
- Simple triggered effects

**Tasks:**
1. Add `magicEffects` array to item schema
2. Implement `processOnHitEffects()` for extra damage
3. Implement `processStartOfTurnEffects()` for passive healing
4. Add effect message interpolation
5. Create 5-10 magical items with effects
6. Test magic effect triggering
7. Test effect damage in combat

**Testing:**
- Equip flaming sword, verify extra fire damage
- Equip ring of regeneration, verify HP restore
- Verify critical hits double extra damage
- Verify effect messages display

### Phase 5: Autocast Spells (Week 8-9)

**Goals:**
- Weapons can autocast spells
- Cooldown system for autocast
- Spell effect resolution

**Tasks:**
1. Define basic spell effects (fireball, healing word)
2. Implement cooldown tracking system
3. Implement `processAutocastEffects()`
4. Add chance-based triggering
5. Create spell effect resolution
6. Create 3-5 autocast weapons
7. Test autocast triggering
8. Test cooldown enforcement

**Testing:**
- Equip wand of fireballs, attack 20 times, verify ~2 fireballs
- Verify cooldown prevents back-to-back casts
- Verify spell damage/healing applied
- Verify spell messages display

### Phase 6: Advanced Effects (Week 10+)

**Goals:**
- Grant advantage/disadvantage
- Apply status effects (poison, burn, freeze)
- On-kill effects
- Conditional effects (low HP, enemy type)

**Tasks:**
- Implement status effect system
- Add condition tracking to combat
- Create legendary items with complex effects
- Test advanced effect interactions

---

## 11. Testing Strategy

### 11.1 Unit Tests

**Damage Calculation Tests:**

```javascript
describe('Weapon Damage Calculation', () => {
  it('should calculate base weapon damage correctly', () => {
    const player = createTestPlayer({ str: 16 }); // +3 modifier
    const weapon = { damageDice: '1d8', damageBonus: 0 };

    // Mock dice roll to 5
    mockDiceRoll(5);

    const damage = rollWeaponDamage(player, weapon, false);
    expect(damage).toBe(8); // 5 (roll) + 3 (STR)
  });

  it('should add magical weapon bonus', () => {
    const player = createTestPlayer({ str: 16 });
    const weapon = { damageDice: '1d8', damageBonus: 2 };

    mockDiceRoll(5);

    const damage = rollWeaponDamage(player, weapon, false);
    expect(damage).toBe(10); // 5 + 3 + 2
  });

  it('should double dice on critical hit', () => {
    const player = createTestPlayer({ str: 16 });
    const weapon = { damageDice: '1d8', damageBonus: 2 };

    mockDiceRoll(5); // First roll
    mockDiceRoll(4); // Second roll (critical)

    const damage = rollWeaponDamage(player, weapon, true);
    expect(damage).toBe(14); // (5 + 4) + 3 + 2
  });

  it('should handle versatile weapons', () => {
    const player = createTestPlayer();
    player.equipment = {
      weapon_main: { damageDice: '1d8', damageDiceTwo: '1d10' },
      weapon_off: null // Two-handing
    };

    const dice = getDamageDice(player);
    expect(dice).toBe('1d10'); // Two-handed damage
  });
});
```

**AC Calculation Tests:**

```javascript
describe('Armor Class Calculation', () => {
  it('should calculate unarmored AC correctly', () => {
    const player = createTestPlayer({ dex: 14 }); // +2 modifier
    player.equipment = {};

    const ac = calculateArmorClass(player);
    expect(ac).toBe(12); // 10 + 2
  });

  it('should use armor base AC', () => {
    const player = createTestPlayer({ dex: 14 });
    player.equipment = {
      body: { baseAC: 16, maxDexBonus: 0 } // Plate armor
    };

    const ac = calculateArmorClass(player);
    expect(ac).toBe(16); // No DEX bonus for heavy armor
  });

  it('should cap DEX bonus for medium armor', () => {
    const player = createTestPlayer({ dex: 18 }); // +4 modifier
    player.equipment = {
      body: { baseAC: 13, maxDexBonus: 2 } // Chain shirt
    };

    const ac = calculateArmorClass(player);
    expect(ac).toBe(15); // 13 + 2 (capped)
  });

  it('should add shield bonus', () => {
    const player = createTestPlayer({ dex: 14 });
    player.equipment = {
      body: { baseAC: 11 },
      weapon_off: { armorType: 'shield', baseAC: 2 }
    };

    const ac = calculateArmorClass(player);
    expect(ac).toBe(15); // 11 + 2 + 2
  });
});
```

**Proficiency Tests:**

```javascript
describe('Proficiency System', () => {
  it('should detect weapon proficiency', () => {
    const player = createTestPlayer();
    player.proficiencies = { weapons: ['simple_weapons'] };

    const weapon = { weaponType: 'club', category: 'simple' };

    expect(hasWeaponProficiency(player, weapon)).toBe(true);
  });

  it('should detect lack of proficiency', () => {
    const player = createTestPlayer();
    player.proficiencies = { weapons: ['simple_weapons'] };

    const weapon = { weaponType: 'longsword', category: 'martial' };

    expect(hasWeaponProficiency(player, weapon)).toBe(false);
  });

  it('should apply proficiency penalty to attack', () => {
    const player = createTestPlayer({ str: 16, proficiency: 2 });
    player.proficiencies = { weapons: [] }; // No proficiencies

    const weapon = { weaponType: 'longsword', attackBonus: 0 };

    const bonus = getAttackBonusWithProficiency(player, weapon);
    expect(bonus).toBe(1); // 3 (STR) - 2 (proficiency removed)
  });
});
```

### 11.2 Integration Tests

**Full Combat with Equipment:**

```javascript
describe('Combat with Equipment', () => {
  it('should use equipped weapon in combat', async () => {
    const player = createTestPlayer({ str: 16, level: 5 });
    player.equipment = {
      weapon_main: {
        name: 'Longsword +1',
        damageDice: '1d8',
        attackBonus: 1,
        damageBonus: 1
      }
    };

    const npc = createTestNPC({ ac: 15 });

    const combat = new CombatEncounter([player, npc], world, allPlayers, playerDB);

    mockDiceRoll(15); // Attack roll
    mockDiceRoll(6); // Damage roll

    combat.executeCombatRound();

    // Attack roll: 15 + 3 (STR) + 3 (prof) + 1 (weapon) = 22 vs AC 15 (hit)
    // Damage: 6 + 3 (STR) + 1 (weapon) = 10
    expect(npc.currentHp).toBe(npc.maxHp - 10);
  });

  it('should use equipped armor in combat', async () => {
    const player = createTestPlayer({ dex: 14 });
    player.equipment = {
      body: { baseAC: 16, maxDexBonus: 0 } // Plate armor
    };

    expect(player.armorClass).toBe(16);

    const npc = createTestNPC({ str: 12, level: 5 });

    mockDiceRoll(12); // Attack roll vs AC 16

    const attackResult = rollAttack(npc, player);

    // 12 + 1 (STR) + 3 (prof) = 16 vs AC 16 (just barely hits)
    expect(attackResult.hit).toBe(true);
  });
});
```

**Magic Effect Tests:**

```javascript
describe('Magic Item Effects', () => {
  it('should trigger extra damage on hit', async () => {
    const player = createTestPlayer();
    player.equipment = {
      weapon_main: {
        damageDice: '1d8',
        magicEffects: [
          {
            type: 'extra_damage',
            damageDice: '1d6',
            damageType: 'fire',
            trigger: 'on_hit'
          }
        ]
      }
    };

    const npc = createTestNPC();
    const combat = new CombatEncounter([player, npc], world, allPlayers, playerDB);

    mockDiceRoll(15); // Hit
    mockDiceRoll(6); // Weapon damage
    mockDiceRoll(4); // Fire damage

    combat.executeCombatRound();

    // Damage: 6 (weapon) + 3 (STR) + 4 (fire) = 13
    expect(npc.currentHp).toBe(npc.maxHp - 13);
  });

  it('should respect autocast cooldowns', async () => {
    const player = createTestPlayer();
    player.equipment = {
      weapon_main: {
        magicEffects: [
          {
            type: 'autocast_spell',
            spell: 'fireball',
            trigger: 'on_attack',
            chance: 1.0, // Always trigger
            cooldown: 30000 // 30 seconds
          }
        ]
      }
    };

    const npc = createTestNPC();
    const combat = new CombatEncounter([player, npc], world, allPlayers, playerDB);

    // First attack - should trigger
    combat.executeCombatRound();
    expect(player.itemCooldowns.size).toBe(1);

    // Second attack immediately - should NOT trigger
    combat.executeCombatRound();
    // Verify fireball only cast once (check combat log or damage)
  });
});
```

### 11.3 Balance Testing

**DPR Simulation:**

```javascript
function simulateDPR(attacker, defender, rounds = 100) {
  let totalDamage = 0;

  for (let i = 0; i < rounds; i++) {
    const attackResult = rollAttack(attacker, defender);

    if (attackResult.hit) {
      const weapon = getEquippedWeapon(attacker);
      const damage = rollWeaponDamage(attacker, weapon, attackResult.critical);
      totalDamage += damage;
    }
  }

  return totalDamage / rounds;
}

describe('Combat Balance', () => {
  it('should maintain ~60% hit rate at equal level', () => {
    const attacker = createTestPlayer({ str: 16, level: 5 });
    attacker.equipment = { weapon_main: { damageDice: '1d8' } };

    const defender = createTestNPC({ ac: 16, level: 5 });

    let hits = 0;
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      const result = rollAttack(attacker, defender);
      if (result.hit) hits++;
    }

    const hitRate = hits / trials;
    expect(hitRate).toBeCloseTo(0.60, 1); // ~60% ±10%
  });

  it('should complete equal-level fight in 4-6 rounds', () => {
    const player = createTestPlayer({ str: 16, level: 5, maxHp: 30 });
    player.equipment = { weapon_main: { damageDice: '1d8' } };

    const npc = createTestNPC({ ac: 16, level: 5, maxHp: 30 });

    let rounds = 0;

    while (player.currentHp > 0 && npc.currentHp > 0) {
      rounds++;

      // Player attacks
      const playerAttack = rollAttack(player, npc);
      if (playerAttack.hit) {
        const damage = rollWeaponDamage(player, getEquippedWeapon(player), playerAttack.critical);
        npc.currentHp -= damage;
      }

      if (npc.currentHp <= 0) break;

      // NPC attacks
      const npcAttack = rollAttack(npc, player);
      if (npcAttack.hit) {
        const damage = rollWeaponDamage(npc, getEquippedWeapon(npc), npcAttack.critical);
        player.currentHp -= damage;
      }

      if (rounds > 20) break; // Safety limit
    }

    expect(rounds).toBeGreaterThanOrEqual(4);
    expect(rounds).toBeLessThanOrEqual(6);
  });
});
```

---

## 12. Open Questions and Design Decisions

### 12.1 Dual-Wielding System

**D&D 5e Rule:** Two-weapon fighting allows a bonus action attack with the off-hand weapon (light weapons only), adding no ability modifier to damage.

**MUD Adaptation Options:**

**Option A: Full D&D 5e (Bonus Action)**
- Requires action economy system (action, bonus action, reaction)
- Complex for MUD environment
- Authentic but heavyweight

**Option B: Simplified (Automatic Second Attack)**
- If wielding two light weapons, automatically attack twice per round
- Each attack rolls separately, second attack deals half damage
- Simpler, more MUD-friendly

**Option C: Dual-Wield as Single Attack**
- Roll both weapons' damage dice at once
- Average damage higher than single weapon
- Simplest implementation

**Recommendation:** Use **Option B** initially, upgrade to **Option A** if action economy added later.

### 12.2 Damage Reduction vs AC-Only

**Question:** Should heavy armor provide flat damage reduction in addition to AC?

**Arguments For:**
- More "realistic" feeling
- Consistent mitigation (less RNG)
- Differentiates armor types beyond AC numbers
- Makes heavy armor feel more impactful

**Arguments Against:**
- Deviates from D&D 5e standard
- Additional complexity in balancing
- Can trivialize weak enemies (damage reduced to 1)
- Difficult to balance vs high-damage enemies

**Recommendation:** Use **AC-only** for initial implementation to maintain D&D fidelity. Add optional damage reduction as a MUD-specific feature for heavy armor only (1-3 points) if player feedback requests it.

### 12.3 Attunement System

**D&D 5e Rule:** Magical items require attunement (limited to 3 items), binding the item to the user.

**MUD Considerations:**
- Prevents overpowered item stacking
- Adds strategic choice (which items to attune?)
- Requires rest/time to attune

**Options:**

**Option A: Full Attunement (3 slots)**
- Most powerful items require attunement
- Can only attune during rest
- Must choose which items to attune

**Option B: No Attunement**
- Simpler, more MUD-like
- Balance by rarity and level requirements
- Risk of item stacking abuse

**Option C: Light Attunement (5 slots)**
- More forgiving than D&D
- Only legendary items require attunement

**Recommendation:** Use **Option B (No Attunement)** initially for simplicity. Add **Option A** later if item power creep becomes an issue.

### 12.4 Item Durability

**Question:** Should items have durability that degrades with use?

**Arguments For:**
- Item sink for economy
- Encourages repair profession
- Adds resource management

**Arguments Against:**
- Tedious maintenance
- Punishes active players
- Can feel like "un-fun tax"

**Recommendation:** **No durability system** for combat items. Focus on enjoyment over resource management. If needed for economy, add crafting material consumption instead.

---

## 13. Conclusion

This design document provides a complete roadmap for integrating the item system with combat mechanics in a D&D 5e-authentic manner while accommodating MUD-specific features. The phased implementation approach allows for gradual rollout, testing, and balance adjustments.

**Key Takeaways:**

1. **Weapon Integration:** Directly impacts damage calculation through dice, bonuses, and properties (finesse, versatile, two-handed)

2. **Armor Integration:** Affects AC through base values, DEX caps, and magical bonuses. Optional damage reduction for heavy armor.

3. **Proficiency System:** Enforces weapon/armor restrictions with meaningful penalties for non-proficient use.

4. **Magical Effects:** Trigger-based system for extra damage, autocast spells, and passive bonuses with cooldown management.

5. **Stat Bonuses:** Aggregate across all equipment, affecting combat calculations through effective stats.

6. **Balance:** Maintain D&D 5e mathematical balance (60% hit rate, 4-6 round fights at equal level) while accommodating MUD environment.

**Next Steps:**

1. Review and approve this design document
2. Create item schema definitions (weapons, armor, jewelry)
3. Begin Phase 1 implementation (Weapon Integration)
4. Test thoroughly at each phase before proceeding
5. Gather player feedback and iterate on balance

**Files to Create/Modify:**

- `/src/systems/equipment/EquipmentManager.js` (new)
- `/src/systems/equipment/ProficiencySystem.js` (new)
- `/src/systems/equipment/MagicEffectProcessor.js` (new)
- `/src/combat/combatResolver.js` (modify)
- `/src/combat/CombatEncounter.js` (modify)
- `/src/data/CombatStats.js` (modify)
- `/src/commands/equip.js` (new command)
- `/src/commands/unequip.js` (new command)

**Estimated Implementation Time:** 8-10 weeks for full system (all phases)

**Estimated Testing Time:** 2-3 weeks for comprehensive testing and balance

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Status:** Ready for Implementation
**Author:** Combat Systems Architect (Claude Sonnet 4.5)
