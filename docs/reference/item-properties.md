---
title: Item Properties Overview
status: current
last_updated: 2025-11-10
related: [item-types, item-combat, item-systems, item-loot]
---

# Item Properties Overview

The item system provides comprehensive properties for weapons, armor, jewelry, consumables, and other item types. This overview links to focused reference documents for quick lookups.

## Reference Documents

### [Item Types](item-types.md)
Core item categorization, rarity system, equipment slots, and base item properties.

**Contents:**
- Item type enum (weapon, armor, jewelry, consumable, etc.)
- Rarity levels (common, uncommon, rare, epic, legendary, artifact)
- Equipment slot definitions (main_hand, chest, ring_1, etc.)
- Core item properties (name, description, weight, value, etc.)

### [Item Combat Properties](item-combat.md)
Combat-specific properties for weapons, armor, and magical effects.

**Contents:**
- Weapon properties (damage dice, attack bonuses, finesse, versatile)
- Armor properties (AC values, DEX caps, stealth disadvantage)
- Magical property types (extra damage, life steal, stat bonuses)
- Consumable properties (potions, scrolls, food)
- Damage types (physical, fire, ice, necrotic, etc.)
- Weapon class proficiencies (swords, bows, staves, etc.)

### [Item Systems](item-systems.md)
Gameplay systems related to items: attunement, binding, encumbrance, and more.

**Contents:**
- Attunement system (3-slot limit, requires rest)
- Binding system (bind on pickup, bind on equip)
- Encumbrance (inventory slots, weight capacity)
- Stacking rules (consumables, currency, materials)
- Durability system (loss on death, repair costs)
- Proficiency penalties (weapon/armor proficiency)
- Identification system (hidden magical properties)
- Dual wielding rules (off-hand mechanics)

### [Item Loot & Code](item-loot.md)
Loot generation tags and code reference for the item system.

**Contents:**
- Spawn tags (realm tags, type tags, special tags)
- Code file reference (ItemRegistry, EquipmentManager, BaseItem, etc.)

## Quick Navigation by Use Case

**Creating a new weapon:**
1. Check [Item Types](item-types.md) for core properties
2. Check [Item Combat](item-combat.md) for weapon-specific properties
3. Check [Item Loot](item-loot.md) for spawn tags

**Understanding armor:**
1. Check [Item Combat](item-combat.md) for armor properties and AC calculation
2. Check [Item Systems](item-systems.md) for proficiency penalties

**Implementing attunement:**
1. Check [Item Systems](item-systems.md) for attunement rules
2. Check [Item Loot](item-loot.md) for code references

**Setting up loot drops:**
1. Check [Item Loot](item-loot.md) for spawn tag system
2. Check [Item Types](item-types.md) for item types and rarity

## See Also

- [Combat Stats Reference](combat-stats.md) - Combat calculations using equipment
- [Combat Overview](../wiki/systems/combat-overview.md) - Equipment integration in combat
