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

## Container Systems

| Container Type | Storage Location | Pickupable | Persistent | Example |
|---------------|-----------------|------------|-----------|---------|
| Room Container | `room.containers[]` | No | Yes | Treasure chest, barrel |
| Portable Container | `room.items[]` | Yes | Yes | Corpse, bag |
| Legacy Object | `room.objects[]` | No | No | Lamppost, bench |

**Room Containers:**
- Fixed in place (cannot be picked up)
- Can be opened, closed, locked, unlocked
- Spawn and respawn loot automatically
- State persists across server restarts (Phase 3)

**Loot Configuration:**
```javascript
"lootConfig": {
  "spawnOnInit": true,           // Spawn loot on container creation
  "respawnOnEmpty": true,         // Auto-respawn when empty
  "respawnDelay": 600000,         // 10 minutes in milliseconds
  "respawnMode": "empty",         // "empty" | "partial" | "full"
  "maxItems": 10,                 // Limit total items spawned

  "guaranteedItems": [
    { "itemId": "health_potion", "quantity": 2, "chance": 100 },
    { "itemId": "magic_scroll", "quantity": 1, "chance": 75 }
  ],

  "randomItems": {
    "count": 3,                   // Number of random items
    "lootTable": "common_loot",   // Loot table category
    "level": 1                    // Area level for gating
  }
}
```

**For details:** See [Room Container System](../systems/containers/INDEX.md)

**Phase 1 Complete:** Basic open/close/get functionality (2025-11-11)
**Phase 2 Complete:** Loot spawning and respawning system (2025-11-12)

## See Also

- [Item Types](item-types.md) - Item types and core properties
- [Item Combat](item-combat.md) - Weapon and armor properties
- [Combat Stats](combat-stats.md) - Combat calculations and proficiency
- [Item Loot](item-loot.md) - Spawn tags and code reference
- [Container Systems](../systems/containers/INDEX.md) - Room container documentation
