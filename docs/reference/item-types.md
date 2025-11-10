---
title: Item Types Reference
status: current
last_updated: 2025-11-10
related: [item-combat, item-systems, item-loot, item-properties-overview]
---

# Item Types Reference

Quick lookup for item types, rarity, equipment slots, and core properties.

## Item Types

| Type | Purpose | Stackable | Equippable |
|------|---------|-----------|------------|
| `weapon` | Combat weapons | No | Yes |
| `armor` | Protective gear | No | Yes |
| `jewelry` | Rings, necklaces, trinkets | No | Yes |
| `consumable` | Potions, food, scrolls | Yes | No |
| `quest` | Quest-related items | No | No |
| `cosmetic` | Appearance items | No | Yes |
| `material` | Crafting components | Yes | No |
| `container` | Bags, chests | No | No |
| `currency` | Gold, coins | Yes | No |
| `misc` | Miscellaneous items | Varies | No |

**Implementation:** `/src/items/schemas/ItemTypes.js:ItemType`

## Item Rarity

| Rarity | Typical Use | Color Code |
|--------|-------------|------------|
| `common` | Basic items | Gray/White |
| `uncommon` | Enhanced items | Green |
| `rare` | Superior items | Blue |
| `epic` | Exceptional items | Purple |
| `legendary` | Unique powerful items | Orange |
| `artifact` | Extremely rare quest items | Red/Gold |

**Implementation:** `/src/items/schemas/ItemTypes.js:ItemRarity`

## Equipment Slots

| Slot | Type | Restrictions |
|------|------|--------------|
| `main_hand` | Weapon | One-handed or two-handed weapons |
| `off_hand` | Weapon/Shield | Shields, one-handed weapons, empty if two-handed equipped |
| `head` | Armor | Helms, hats, circlets |
| `neck` | Jewelry | Amulets, necklaces |
| `shoulders` | Armor | Pauldrons, cloaks |
| `chest` | Armor | Chestplates, robes, shirts |
| `back` | Armor | Cloaks, capes |
| `wrists` | Armor | Bracers, wristbands |
| `hands` | Armor | Gloves, gauntlets |
| `waist` | Armor | Belts |
| `legs` | Armor | Leggings, pants |
| `feet` | Armor | Boots, shoes |
| `ring_1` | Jewelry | Rings |
| `ring_2` | Jewelry | Rings |
| `trinket_1` | Jewelry | Special items |
| `trinket_2` | Jewelry | Special items |

**Implementation:** `/src/items/schemas/ItemTypes.js:EquipmentSlot`

## Core Item Properties

| Property | Type | Required | Purpose | Default |
|----------|------|----------|---------|---------|
| `name` | string | Yes | Display name | - |
| `description` | string | Yes | Flavor text | - |
| `keywords` | array | Yes | Words to identify item | - |
| `itemType` | enum | Yes | ItemType value | - |
| `subType` | string | No | Specific category | null |
| `weight` | number | Yes | Weight in pounds | - |
| `value` | number | Yes | Gold value | - |
| `rarity` | enum | No | ItemRarity value | "common" |
| `isTakeable` | boolean | No | Can be picked up | true |
| `isDroppable` | boolean | No | Can be dropped | true |
| `isEquippable` | boolean | No | Can be equipped | false |
| `isTradeable` | boolean | No | Can be traded | true |
| `isQuestItem` | boolean | No | Quest-related | false |
| `isStackable` | boolean | No | Stacks in inventory | false |
| `slot` | enum | No | Equipment slot | null |
| `requiredLevel` | number | No | Minimum level to use | 0 |
| `requiredClass` | string | No | Required guild/class | null |

**Implementation:** `/src/items/BaseItem.js`

## See Also

- [Item Combat Properties](item-combat.md) - Weapon, armor, damage properties
- [Item Systems](item-systems.md) - Attunement, binding, encumbrance
- [Item Loot](item-loot.md) - Spawn tags and code reference
