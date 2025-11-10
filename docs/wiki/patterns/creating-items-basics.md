---
title: Creating Items - Basics
status: current
last_updated: 2025-11-10
related: [item-system, creating-items-advanced, item-properties, item-types]
---

# Creating Items - Basics

This guide covers creating basic items including weapons, armor, consumables, quest items, and jewelry. For advanced topics like custom hooks and testing, see [Creating Items - Advanced](creating-items-advanced.md).

## Quick Start

Creating an item involves three steps: define the item properties, register it in the ItemRegistry, and optionally create instances for testing or world placement.

### Basic Weapon Example

```javascript
const { ItemType, ItemRarity, EquipmentSlot, WeaponClass, DamageType } = require('./src/items/schemas/ItemTypes');
const ItemRegistry = require('./src/items/ItemRegistry');

const ironSword = {
  id: 'iron_sword',
  name: 'Iron Sword',
  description: 'A simple iron sword with a leather-wrapped hilt.',
  keywords: ['sword', 'iron', 'blade'],
  itemType: ItemType.WEAPON,
  weight: 3,
  value: 15,
  rarity: ItemRarity.COMMON,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  weaponProperties: {
    damageDice: '1d8',
    damageType: DamageType.SLASHING,
    weaponClass: WeaponClass.SWORDS,
    isTwoHanded: false,
    isRanged: false
  }
};

ItemRegistry.registerItem(ironSword, 'core');
```

### Basic Armor Example

```javascript
const leatherChest = {
  id: 'leather_chest',
  name: 'Leather Chestpiece',
  description: 'Sturdy leather armor covering the torso.',
  keywords: ['chest', 'leather', 'armor'],
  itemType: ItemType.ARMOR,
  weight: 10,
  value: 50,
  rarity: ItemRarity.COMMON,
  isEquippable: true,
  slot: EquipmentSlot.CHEST,
  armorProperties: {
    armorClass: 2,
    armorType: 'light',
    armorMaterial: 'leather'
  }
};

ItemRegistry.registerItem(leatherChest, 'core');
```

## Item Properties Reference

All items require these base properties:

| Property | Required | Type | Purpose |
|----------|----------|------|---------|
| `id` | Yes | string | Unique identifier |
| `name` | Yes | string | Display name |
| `description` | Yes | string | Full description |
| `keywords` | Yes | string[] | Targeting keywords |
| `itemType` | Yes | ItemType | Type classification |
| `weight` | Yes | number | Encumbrance (lbs) |
| `value` | Yes | number | Base gold value |
| `rarity` | Yes | ItemRarity | Rarity tier |

Common optional properties:

| Property | Type | Purpose |
|----------|------|---------|
| `isEquippable` | boolean | Can be worn/wielded |
| `slot` | EquipmentSlot | Which slot |
| `requiredLevel` | number | Min level to use |
| `requiredClass` | string[] | Class restrictions |
| `requiresAttunement` | boolean | Needs attunement |
| `statModifiers` | object | Stat bonuses |

## Creating Weapons

Weapons require `weaponProperties` with combat stats:

```javascript
const flamingSword = {
  id: 'flaming_sword',
  name: 'Flaming Sword',
  description: 'A blade wreathed in eternal flames.',
  keywords: ['sword', 'flaming', 'fire'],
  itemType: ItemType.WEAPON,
  weight: 4,
  value: 500,
  rarity: ItemRarity.RARE,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  requiredLevel: 5,
  weaponProperties: {
    damageDice: '1d8+1',              // Base damage
    damageType: DamageType.SLASHING,
    weaponClass: WeaponClass.SWORDS,
    isTwoHanded: false,
    isRanged: false,
    attackBonus: 1,                   // +1 to hit
    magicalProperties: [
      {
        type: 'extra_damage',
        value: '1d6',
        description: 'Deals an additional 1d6 fire damage'
      }
    ]
  },
  statModifiers: {
    str: 1                             // +1 STR while equipped
  }
};
```

### Two-Handed Weapon

```javascript
const greatsword = {
  id: 'greatsword',
  name: 'Greatsword',
  description: 'A massive two-handed blade.',
  keywords: ['greatsword', 'sword', 'blade'],
  itemType: ItemType.WEAPON,
  weight: 8,
  value: 100,
  rarity: ItemRarity.COMMON,
  isEquippable: true,
  slot: EquipmentSlot.TWO_HAND,        // Note: TWO_HAND slot
  weaponProperties: {
    damageDice: '2d6',                  // More damage than one-handed
    damageType: DamageType.SLASHING,
    weaponClass: WeaponClass.SWORDS,
    isTwoHanded: true,
    isRanged: false
  }
};
```

## Creating Armor

Armor requires `armorProperties` with AC and type:

```javascript
const plateHelm = {
  id: 'plate_helm',
  name: 'Plate Helmet',
  description: 'A gleaming steel helmet.',
  keywords: ['helmet', 'helm', 'plate'],
  itemType: ItemType.ARMOR,
  weight: 5,
  value: 150,
  rarity: ItemRarity.UNCOMMON,
  isEquippable: true,
  slot: EquipmentSlot.HEAD,
  armorProperties: {
    armorClass: 3,                     // +3 AC
    armorType: 'heavy',                // Caps DEX at +0
    armorMaterial: 'plate',
    requiredProficiency: ['heavy']     // Requires heavy armor proficiency
  }
};
```

## Creating Consumables

Consumables use `onUse` hook for effects:

```javascript
const healthPotion = {
  id: 'health_potion',
  name: 'Health Potion',
  description: 'A red liquid that smells faintly of cherries.',
  keywords: ['potion', 'health', 'red'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.5,
  value: 50,
  rarity: ItemRarity.COMMON,
  consumableProperties: {
    maxCharges: 1,
    currentCharges: 1
  },
  onUse: (player, item, context) => {
    const healAmount = 25;
    const actualHeal = Math.min(healAmount, player.maxHp - player.hp);

    player.hp += actualHeal;

    return {
      success: true,
      message: `You drink the ${item.name} and heal ${actualHeal} HP.`,
      consumed: true                   // Remove after use
    };
  }
};
```

## Creating Quest Items

Quest items use flags to restrict dropping/trading:

```javascript
const questKey = {
  id: 'mysterious_key',
  name: 'Mysterious Key',
  description: 'An ornate key with strange runes.',
  keywords: ['key', 'mysterious', 'ornate'],
  itemType: ItemType.QUEST,
  weight: 0.1,
  value: 0,                            // Cannot be sold
  rarity: ItemRarity.EPIC,
  isDroppable: false,                  // Cannot drop
  isTradeable: false,                  // Cannot trade
  isQuestItem: true,
  questItemProperties: {
    questId: 'unlock_tower_quest',
    questStage: 3
  }
};
```

## Creating Jewelry

Jewelry provides pure stat bonuses:

```javascript
const strengthRing = {
  id: 'ring_of_strength',
  name: 'Ring of Giant Strength',
  description: 'A thick iron band that pulses with power.',
  keywords: ['ring', 'strength', 'giant'],
  itemType: ItemType.JEWELRY,
  weight: 0.1,
  value: 800,
  rarity: ItemRarity.UNCOMMON,
  isEquippable: true,
  slot: EquipmentSlot.RING_1,          // Can use RING_1 or RING_2
  requiresAttunement: true,             // Magical jewelry often requires attunement
  statModifiers: {
    str: 2                              // +2 STR
  }
};
```

## Common Patterns

### Magical Weapon with Multiple Effects

```javascript
const legendaryBlade = {
  id: 'excalibur',
  name: 'Excalibur',
  description: 'The legendary sword of kings.',
  keywords: ['excalibur', 'sword', 'legendary'],
  itemType: ItemType.WEAPON,
  weight: 4,
  value: 10000,
  rarity: ItemRarity.LEGENDARY,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  requiredLevel: 10,
  requiresAttunement: true,
  weaponProperties: {
    damageDice: '1d10+3',
    damageType: DamageType.SLASHING,
    weaponClass: WeaponClass.SWORDS,
    isTwoHanded: false,
    isRanged: false,
    attackBonus: 3,
    magicalProperties: [
      { type: 'extra_damage', value: '1d6', description: '+1d6 radiant damage' },
      { type: 'life_steal', value: '10', description: 'Heal 10% of damage dealt' }
    ]
  },
  statModifiers: {
    str: 2,
    cha: 2
  }
};
```

### Stackable Consumable

```javascript
const arrow = {
  id: 'arrow',
  name: 'Arrow',
  description: 'A simple wooden arrow.',
  keywords: ['arrow', 'ammunition'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.1,
  value: 1,
  rarity: ItemRarity.COMMON,
  consumableProperties: {
    maxCharges: 99,          // Stacks up to 99
    currentCharges: 20       // Initial quantity
  }
};
```

## See Also

- [Creating Items - Advanced](creating-items-advanced.md) - Custom hooks, testing, domain organization
- [Item System Overview](../systems/item-system.md) - Architecture and components
- [Item Properties Reference](../reference/item-properties.md) - Complete property schemas
- [Item Types Reference](../reference/item-types.md) - All item types detailed
- [Item Combat Reference](../reference/item-combat.md) - Combat integration
