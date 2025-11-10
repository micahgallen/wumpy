---
title: Item Loot and Spawn Tags Reference
status: current
last_updated: 2025-11-10
related: [item-types, item-combat, item-systems]
---

# Item Loot and Spawn Tags Reference

Quick lookup for loot generation tags and item system code references.

## Spawn Tags

Tags for loot generation filtering. Items can have multiple tags.

### Realm Tags

| Tag | Purpose |
|-----|---------|
| `realm:sesame_street` | Sesame Street themed items |
| `realm:narnia` | Narnia themed items |
| `realm:florida` | Florida themed items |
| `realm:texas` | Texas themed items |
| `realm:disney` | Disney themed items |
| `realm:generic` | Fits any realm |

### Type Tags

| Tag | Purpose |
|-----|---------|
| `type:weapon` | Weapon items |
| `type:armor` | Armor items |
| `type:jewelry` | Jewelry items |
| `type:consumable` | Consumable items |
| `type:material` | Crafting materials |
| `type:currency` | Currency items |

### Special Tags

| Tag | Purpose |
|-----|---------|
| `starter_gear` | Good for new players |
| `trash_mob` | Low-value drops from weak enemies |
| `elite_drop` | Higher-value drops from elite enemies |
| `boss_drop` | Boss-specific loot |
| `crafting_component` | Used in crafting |
| `vendor_trash` | Junk items to sell |
| `magical` | Has magical properties |
| `mundane` | No magical properties |

**Implementation:** `/src/items/schemas/ItemTypes.js:SpawnTag`

## Code Reference

| System | Primary File | Key Functions |
|--------|--------------|---------------|
| Item Creation | `/src/items/ItemRegistry.js` | `createItem()`, `getItem()` |
| Equipment | `/src/systems/equipment/EquipmentManager.js` | `equip()`, `unequip()`, `calculateAC()` |
| Item Properties | `/src/items/BaseItem.js` | Item class definition |
| Type Definitions | `/src/items/schemas/ItemTypes.js` | All enums and types |
| Configuration | `/src/config/itemsConfig.js` | System tunables |

## See Also

- [Item Types](item-types.md) - Item types, rarity, and slots
- [Item Combat](item-combat.md) - Weapon and armor properties
- [Item Systems](item-systems.md) - Attunement, binding, and other systems
