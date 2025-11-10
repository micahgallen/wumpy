# Combat Stats Reference

Quick lookup tables for combat calculations and formulas.

## Proficiency Bonus by Level

| Level Range | Proficiency | Level Range | Proficiency |
|-------------|-------------|-------------|-------------|
| 1-4         | +2          | 13-16       | +5          |
| 5-8         | +3          | 17-20       | +6          |
| 9-12        | +4          | 21+         | +7          |

**Formula:** `2 + floor((level - 1) / 4)`

**Implementation:** `/src/progression/statProgression.js:getProficiencyBonus()`

## Ability Score Modifiers

| Score | Modifier | Score | Modifier | Score | Modifier |
|-------|----------|-------|----------|-------|----------|
| 1     | -5       | 11    | 0        | 21    | +5       |
| 2-3   | -4       | 12-13 | +1       | 22-23 | +6       |
| 4-5   | -3       | 14-15 | +2       | 24-25 | +7       |
| 6-7   | -2       | 16-17 | +3       | 26-27 | +8       |
| 8-9   | -1       | 18-19 | +4       | 28-29 | +9       |
| 10    | 0        | 20    | +5       | 30    | +10      |

**Formula:** `floor((score - 10) / 2)`

**Implementation:** `/src/utils/modifiers.js:getModifier()`

## HP Progression

### HP Gain Per Level

| Component | Formula | Notes |
|-----------|---------|-------|
| Base HP (Level 1) | 10 | Starting HP |
| HP per level | 4 + CON modifier | Minimum 1 per level |
| Full heal on level up | Yes | Current HP set to max HP |

**Formula:** `maxHP += max(1, 4 + CON_modifier)`

**Implementation:** `/src/progression/statProgression.js:calculateStatGains()`

### HP Examples by Level

| Level | CON 10 (0) | CON 12 (+1) | CON 14 (+2) | CON 16 (+3) |
|-------|------------|-------------|-------------|-------------|
| 1     | 10         | 10          | 10          | 10          |
| 2     | 14         | 15          | 16          | 17          |
| 5     | 26         | 30          | 34          | 38          |
| 10    | 46         | 55          | 64          | 73          |
| 20    | 86         | 105         | 124         | 143         |

## Attack Bonus Calculation

### Components

| Component | Formula | Notes |
|-----------|---------|-------|
| Proficiency Bonus | See table above | Based on attacker level |
| Ability Modifier | See table above | STR (melee), DEX (ranged/finesse) |
| Weapon Bonus | Varies | Magical weapon enhancement |
| Proficiency Penalty | -2 | If not proficient with weapon |
| Armor Penalty | -2 | If not proficient with armor |

**Total Attack Bonus = Proficiency + Ability Mod + Weapon Bonus + Proficiency Penalty + Armor Penalty**

**Implementation:** `/src/combat/combatResolver.js:getAttackBonus()`

### Attack Bonus Examples

| Level | STR/DEX | Proficient | Weapon | Total Bonus |
|-------|---------|------------|--------|-------------|
| 1     | 14 (+2) | Yes        | None   | +4 (+2 prof + 2 ability) |
| 1     | 14 (+2) | No         | None   | +2 (+2 prof + 2 ability - 2 penalty) |
| 5     | 16 (+3) | Yes        | +1     | +7 (+3 prof + 3 ability + 1 weapon) |
| 10    | 18 (+4) | Yes        | +2     | +10 (+4 prof + 4 ability + 2 weapon) |

## Armor Class Calculation

### Base AC Formula

**AC = Base Armor AC + min(DEX_modifier, maxDexBonus) + Shield AC + Jewelry Bonuses**

**Implementation:** `/src/systems/equipment/EquipmentManager.js:calculateAC()`

### Armor Types and DEX Caps

| Armor Type | Base AC | Max DEX Bonus | Example Total AC (14 DEX) |
|------------|---------|---------------|---------------------------|
| Unarmored  | 10      | Unlimited     | 12 (10 + 2 DEX) |
| Leather    | 11      | Unlimited     | 13 (11 + 2 DEX) |
| Chain Shirt| 13      | +2            | 15 (13 + 2 DEX) |
| Breastplate| 14      | +2            | 16 (14 + 2 DEX) |
| Half Plate | 15      | +2            | 17 (15 + 2 DEX) |
| Plate      | 18      | 0             | 18 (18 + 0 DEX) |

### AC Bonuses from Equipment

| Item Type | Typical Bonus | Notes |
|-----------|---------------|-------|
| Shield    | +2            | Requires off-hand slot |
| Ring of Protection | +1  | Jewelry slot |
| Cloak of Protection | +1 | Jewelry slot |
| Magical Armor | +1 to +3 | Enhancement bonus |

## Damage Calculations

### Base Damage

**Damage = Dice Roll + Ability Modifier + Weapon Bonus**

| Weapon Type | Ability Used | Notes |
|-------------|--------------|-------|
| Melee       | STR          | Standard melee weapons |
| Finesse     | STR or DEX   | Player choice (higher used) |
| Ranged      | DEX          | Bows, crossbows |
| Unarmed     | STR          | 1d4 + STR mod |

### Critical Hits

**Critical hits occur on natural 20**

| Damage Component | Normal | Critical |
|------------------|--------|----------|
| Dice roll        | 1x     | 2x       |
| Ability modifier | Added once | Added once (not doubled) |
| Weapon bonus     | Added once | Added once (not doubled) |

**Example:** Longsword (1d8) + 3 STR + 1 weapon bonus
- Normal: 1d8 + 3 + 1 = 5-12 damage
- Critical: 2d8 + 3 + 1 = 7-20 damage

**Implementation:** `/src/combat/combatResolver.js:rollDamage()`

### Resistance and Vulnerability

| Status | Damage Multiplier | Effect |
|--------|-------------------|--------|
| Normal | 1.0x              | Full damage |
| Resistant | 0.5x           | Half damage (rounded) |
| Vulnerable | 2.0x          | Double damage |

**Implementation:** `/src/data/CombatStats.js:getResistanceMultiplier()`

## Common Weapon Damage

| Weapon | Damage Dice | Handedness | Properties |
|--------|-------------|------------|------------|
| Dagger | 1d4         | One-handed | Finesse |
| Shortsword | 1d6    | One-handed | Finesse |
| Longsword | 1d8     | One-handed | Versatile (1d10) |
| Greataxe | 1d12     | Two-handed | - |
| Greatsword | 2d6    | Two-handed | - |
| Shortbow | 1d6      | Two-handed | Ranged |
| Longbow | 1d8       | Two-handed | Ranged |

## Advantage and Disadvantage

### Mechanics

| Type | Dice Rolled | Result Used |
|------|-------------|-------------|
| Normal | 1d20 | Roll value |
| Advantage | 2d20 | Higher roll |
| Disadvantage | 2d20 | Lower roll |

### Net Calculation

**If advantage count > disadvantage count:** Advantage
**If disadvantage count > advantage count:** Disadvantage
**If equal:** Normal roll

**Implementation:** `/src/utils/modifiers.js:calculateNetAdvantage()`

### Common Sources of Advantage

- Attacking prone enemy (melee only)
- Hidden attacker
- Item-specific attunement bonuses

### Common Sources of Disadvantage

- Ranged attack with enemy in melee range
- Attacking while prone
- Not proficient with equipped armor

## Stat Progression

### Attribute Gains by Level

| Level Milestone | Stat Gained | Amount |
|----------------|-------------|--------|
| Every 4th level | Strength   | +1     |
| Every 5th level | Constitution | +1   |
| Every 6th level | Dexterity  | +1     |

**Implementation:** `/src/progression/statProgression.js:calculateStatGains()`

## Code Reference

| Calculation | Primary File | Function |
|-------------|--------------|----------|
| Attack Roll | `/src/combat/combatResolver.js` | `rollAttack()` |
| Attack Bonus | `/src/combat/combatResolver.js` | `getAttackBonus()` |
| Armor Class | `/src/systems/equipment/EquipmentManager.js` | `calculateAC()` |
| Damage Roll | `/src/combat/combatResolver.js` | `rollDamage()` |
| Proficiency | `/src/progression/statProgression.js` | `getProficiencyBonus()` |
| Ability Modifier | `/src/utils/modifiers.js` | `getModifier()` |
| HP Gains | `/src/progression/statProgression.js` | `calculateStatGains()` |
| Resistance | `/src/data/CombatStats.js` | `getResistanceMultiplier()` |
