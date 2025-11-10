---
title: Item Systems Reference
status: current
last_updated: 2025-11-10
related: [item-types, item-combat, item-loot, combat-stats]
---

# Item Systems Reference

Quick lookup for item-related systems: attunement, binding, encumbrance, proficiency, and more.

## Attunement System

| Property | Value | Purpose |
|----------|-------|---------|
| `requiresAttunement` | boolean | Item requires attunement to use magic properties |
| `isAttuned` | boolean | Currently attuned to a character |
| `attunedTo` | string | Character name attuned to |
| Max attunement slots | 3 | Maximum items a character can attune |

**Config:** `/src/config/itemsConfig.js:attunement`

**Rules:**
- Magical items with `requiresAttunement: true` don't grant bonuses unless attuned
- Attuning requires a short rest (not yet implemented)
- Maximum 3 attuned items per character
- Un-attuning frees a slot

## Binding System

| Property | Value | Purpose |
|----------|-------|---------|
| `bindOnPickup` | boolean | Binds when picked up |
| `bindOnEquip` | boolean | Binds when equipped |
| `boundTo` | string | Character name bound to |

**Config:** `/src/config/itemsConfig.js:binding`

**Rules:**
- Bound items cannot be traded (config: `allowTradeWhenBound: false`)
- Bound items cannot be dropped (config: `allowDropWhenBound: false`)
- Binding is permanent

## Encumbrance System

| Property | Formula | Default |
|----------|---------|---------|
| Inventory slots | `baseSlots + (slotsPerStrength × STR_modifier)` | 20 + (2 × STR_mod) |
| Weight capacity | `baseWeight + (weightPerStrength × STR_score)` | 150 + (15 × STR) |

**Config:** `/src/config/itemsConfig.js:encumbrance`

**Examples:**

| STR Score | STR Mod | Inventory Slots | Weight Capacity (lbs) |
|-----------|---------|----------------|----------------------|
| 10        | 0       | 20             | 300                  |
| 14        | +2      | 24             | 360                  |
| 18        | +4      | 28             | 420                  |

## Stacking Rules

| Item Type | Max Stack Size | Config Key |
|-----------|----------------|------------|
| Consumables | 99 | `consumableStackSize` |
| Currency | 9999 | `currencyStackSize` |
| Materials | 999 | `materialStackSize` |
| Default | 99 | `defaultStackSize` |

**Config:** `/src/config/itemsConfig.js:stacking`

## Durability System

| Property | Value | Purpose |
|----------|-------|---------|
| `maxDurability` | number | Maximum durability value |
| `durability` | number | Current durability |
| Loss on death | 10% | Percentage of max durability lost on death |
| Repair cost | 20% | `item_value × durability_lost × 0.2` |
| Broken penalty | 50% | Stats reduced by 50% when durability = 0 |

**Config:** `/src/config/itemsConfig.js:durability`

## Proficiency Penalties

| Proficiency Type | Penalty | Notes |
|-----------------|---------|-------|
| Weapon (not proficient) | -4 | Attack roll penalty |
| Light armor (not proficient) | 0 | No penalty |
| Medium armor (not proficient) | -2 | Attack roll penalty |
| Heavy armor (not proficient) | -4 | Attack roll penalty |

**Config:** `/src/config/itemsConfig.js:proficiency`

## Identification System

| Property | Value | Purpose |
|----------|-------|---------|
| `isIdentified` | boolean | Whether magical properties are known |
| Hide magical properties | true | Magic hidden until identified |
| Identify cost (NPC) | 50 gold | Cost to identify at merchant |
| Identify scroll cost | 25 gold | Cost for identify scroll |

**Config:** `/src/config/itemsConfig.js:identification`

## Dual Wielding

| Property | Value | D&D 5e Rule |
|----------|-------|-------------|
| Off-hand damage modifier | 0.5 (flag) | Don't add ability mod to off-hand damage |
| Requires light weapons | true | Both weapons must be light property |
| Auto-attack | true | Off-hand attacks automatically |

**Config:** `/src/config/itemsConfig.js:dualWield`

**Note:** The `offHandDamageMultiplier: 0.5` is used as a flag in combat code to indicate off-hand attacks shouldn't add ability modifier (D&D 5e standard).

## See Also

- [Item Types](item-types.md) - Item types and core properties
- [Item Combat](item-combat.md) - Weapon and armor properties
- [Combat Stats](combat-stats.md) - Combat calculations and proficiency
- [Item Loot](item-loot.md) - Spawn tags and code reference
