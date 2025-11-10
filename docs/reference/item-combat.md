---
title: Item Combat Properties Reference
status: current
last_updated: 2025-11-10
related: [item-types, combat-stats, item-systems, combat-overview]
---

# Item Combat Properties Reference

Quick lookup for weapon, armor, and combat-related item properties.

## Weapon Properties

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `weaponClass` | enum | Weapon category | "swords", "bows" |
| `damageDice` | string | Damage roll | "1d8", "2d6" |
| `damageDiceTwo` | string | Two-handed damage (versatile) | "1d10" |
| `damageType` | enum | Type of damage | "slashing", "fire" |
| `isFinesse` | function | Can use DEX instead of STR | Returns boolean |
| `isRanged` | function | Ranged weapon | Returns boolean |
| `isVersatile` | function | One or two-handed | Returns boolean |
| `isTwoHanded` | boolean | Requires both hands | true/false |
| `isLight` | boolean | Can dual-wield | true/false |
| `attackBonus` | number | Magical attack bonus | +1, +2, +3 |
| `damageBonus` | number | Magical damage bonus | +1, +2, +3 |

**Implementation:** Defined in item definitions, used by `/src/combat/combatResolver.js`

## Armor Properties

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `armorClass` | enum | Armor weight category | "light", "medium", "heavy" |
| `baseAC` | number | Base armor class value | 11, 14, 18 |
| `maxDexBonus` | number/null | DEX modifier cap | 2, 0, null (unlimited) |
| `acBonus` | number | Magical AC bonus | +1, +2, +3 |
| `stealthDisadvantage` | boolean | Imposes disadvantage on stealth | true/false |

**Implementation:** `/src/systems/equipment/EquipmentManager.js:calculateAC()`

### Armor Type Details

| Armor Type | Base AC | Max DEX | Proficiency Required | Example |
|------------|---------|---------|----------------------|---------|
| Light | 11-12 | Unlimited | Light armor | Leather |
| Medium | 13-15 | +2 | Medium armor | Chain shirt, Breastplate |
| Heavy | 16-18 | 0 | Heavy armor | Chain mail, Plate |
| Shield | +2 | N/A | Shields | Wooden shield, Tower shield |

**Config:** `/src/config/itemsConfig.js:armorDexCaps`

## Magical Properties

| Property Type | Purpose | Example Effect |
|--------------|---------|----------------|
| `extra_damage` | Additional damage dice | +1d6 fire damage |
| `damage_bonus` | Flat damage bonus | +2 damage |
| `attack_bonus` | Attack roll bonus | +1 to hit |
| `critical_improvement` | Better critical range | Crit on 19-20 |
| `life_steal` | HP on hit | Restore 10% of damage |
| `mana_steal` | Resource on hit | Restore 5% of damage as mana |
| `chance_to_stun` | Stun chance | 10% chance to stun |
| `chance_to_slow` | Slow chance | 15% chance to slow |
| `on_hit_effect` | Custom effect on hit | Cast spell on hit |
| `on_kill_effect` | Effect on killing blow | Heal on kill |
| `stat_bonus` | Stat increase | +2 STR, +1 DEX |
| `armor_class_bonus` | AC bonus | +1 AC |
| `resistance` | Damage resistance | 50% fire resistance |

**Implementation:** `/src/items/schemas/ItemTypes.js:MagicalPropertyType`

## Consumable Properties

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `consumableType` | enum | Type of consumable | "potion", "food" |
| `effect` | object | What happens on use | Healing, buffs |
| `charges` | number | Uses before consumed | 1 (single-use), 3 (multi) |
| `cooldown` | number | Milliseconds until can use again | 30000 (30 sec) |

### Consumable Types

| Type | Purpose | Typical Effects |
|------|---------|----------------|
| `potion` | Drinkable potions | Healing, buffs, effects |
| `food` | Edible items | HP restore, temporary buffs |
| `scroll` | Magic scrolls | Cast spell, learn spell |
| `elixir` | Powerful brews | Major buffs, transformations |
| `poison` | Harmful substances | Weapon coating, traps |
| `tool` | Usable tools | Utility effects |

**Implementation:** `/src/items/schemas/ItemTypes.js:ConsumableType`

## Damage Types

| Type | Description | Typical Source |
|------|-------------|----------------|
| `physical` | Generic physical damage | Unarmed, basic weapons |
| `slashing` | Cutting damage | Swords, axes |
| `piercing` | Penetrating damage | Arrows, spears |
| `bludgeoning` | Impact damage | Maces, hammers |
| `fire` | Burning damage | Fire spells, flaming weapons |
| `ice` | Freezing damage | Ice spells, frost weapons |
| `lightning` | Electric damage | Lightning spells, shock weapons |
| `poison` | Toxic damage | Poisoned weapons, venom |
| `necrotic` | Death energy | Dark magic, undead |
| `radiant` | Holy energy | Divine spells, blessed weapons |
| `psychic` | Mental damage | Mind spells |
| `force` | Pure magical force | Magic missiles |

**Implementation:** `/src/items/schemas/ItemTypes.js:DamageType`

## Weapon Classes

| Class | Category | Proficiency | Examples |
|-------|----------|-------------|----------|
| `simple_melee` | Simple | Simple weapons | Club, dagger, quarterstaff |
| `swords` | Martial | Swords | Shortsword, longsword, greatsword |
| `axes` | Martial | Axes | Handaxe, battleaxe, greataxe |
| `maces` | Martial | Maces | Mace, morningstar, flail |
| `polearms` | Martial | Polearms | Spear, halberd, glaive |
| `exotic_melee` | Exotic | Exotic weapons | Special unique melee weapons |
| `simple_ranged` | Simple | Simple weapons | Sling, light crossbow |
| `bows` | Martial | Bows | Shortbow, longbow |
| `crossbows` | Martial | Crossbows | Heavy crossbow, hand crossbow |
| `thrown` | Martial | Thrown weapons | Throwing axe, javelin |
| `exotic_ranged` | Exotic | Exotic weapons | Special unique ranged weapons |
| `wands` | Magical | Wands | Magic wands |
| `staves` | Magical | Staves | Magic staves, quarterstaffs |

**Implementation:** `/src/items/schemas/ItemTypes.js:WeaponClass`

## See Also

- [Combat Stats Reference](combat-stats.md) - Attack, damage, and AC formulas
- [Item Types](item-types.md) - Item types and core properties
- [Item Systems](item-systems.md) - Attunement, proficiency, and other systems
- [Combat Overview](../wiki/systems/combat-overview.md) - Combat system integration
