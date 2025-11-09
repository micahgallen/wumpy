/**
 * Sample Item Definitions
 *
 * Example items demonstrating the item system capabilities including spawn tags.
 * These are registered in the core domain for testing.
 */

const { ItemType, ItemRarity, EquipmentSlot, WeaponClass, ArmorClass, DamageType, ConsumableType, SpawnTag } = require('../../../src/items/schemas/ItemTypes');

const sampleItems = [
  // Basic Weapons
  {
    id: 'rusty_dagger',
    name: 'Rusty Dagger',
    description: 'A small, rusted dagger. It has seen better days.',
    keywords: ['dagger', 'rusty', 'knife', 'blade'],
    itemType: ItemType.WEAPON,
    subType: 'dagger',
    weight: 1,
    value: 2,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['common_loot', 'trash_loot'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_SIMPLE,
      SpawnTag.STARTER_GEAR,
      SpawnTag.TRASH_MOB,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '1d4',
      damageType: DamageType.PIERCING,
      weaponClass: WeaponClass.SIMPLE_MELEE,
      isTwoHanded: false,
      isRanged: false,
      isLight: true,
      isFinesse: true,
      versatileDamageDice: null  // Not a versatile weapon
    }
  },

  {
    id: 'iron_longsword',
    name: 'Iron Longsword',
    description: 'A well-balanced longsword made of iron.',
    keywords: ['longsword', 'sword', 'iron', 'blade'],
    itemType: ItemType.WEAPON,
    subType: 'longsword',
    weight: 3,
    value: 15,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    maxDurability: 100,
    spawnable: true,
    lootTables: ['common_loot', 'uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_MARTIAL,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '1d8',
      damageType: DamageType.SLASHING,
      weaponClass: WeaponClass.SWORDS,
      isTwoHanded: false,
      isRanged: false,
      isVersatile: true,
      versatileDamageDice: '1d10',
      isLight: false,
      isFinesse: false
    }
  },

  {
    id: 'oak_staff',
    name: 'Oak Staff',
    description: 'A sturdy quarterstaff carved from oak wood.',
    keywords: ['staff', 'quarterstaff', 'oak', 'wood'],
    itemType: ItemType.WEAPON,
    subType: 'quarterstaff',
    weight: 4,
    value: 2,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_SIMPLE,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC,
      SpawnTag.REALM_SESAME_STREET  // Thematically appropriate for Sesame Street
    ],
    weaponProperties: {
      damageDice: '1d6',
      damageType: DamageType.BLUDGEONING,
      weaponClass: WeaponClass.SIMPLE_MELEE,
      isTwoHanded: false,
      isRanged: false,
      isVersatile: true,
      versatileDamageDice: '1d8',
      isLight: false,
      isFinesse: false
    }
  },

  // Basic Armor
  {
    id: 'leather_armor',
    name: 'Leather Armor',
    description: 'Supple leather armor that offers modest protection.',
    keywords: ['leather', 'armor'],
    itemType: ItemType.ARMOR,
    subType: 'light',
    weight: 10,
    value: 25,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    maxDurability: 100,
    spawnable: true,
    lootTables: ['common_loot'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_LIGHT,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 11,
      armorClass: ArmorClass.LIGHT,
      // Light armor: unlimited DEX bonus (no maxDexBonus restriction)
      stealthDisadvantage: false
    }
  },

  {
    id: 'chainmail',
    name: 'Chainmail',
    description: 'Heavy armor made of interlocking metal rings.',
    keywords: ['chainmail', 'chain', 'armor', 'mail'],
    itemType: ItemType.ARMOR,
    subType: 'heavy',
    weight: 55,
    value: 150,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    maxDurability: 200,
    spawnable: true,
    lootTables: ['uncommon_loot'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_HEAVY,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 16,
      armorClass: ArmorClass.HEAVY,
      maxDexBonus: 0,  // Heavy armor: no DEX bonus
      stealthDisadvantage: true,
      strengthRequirement: 13
    }
  },

  // Consumables
  {
    id: 'minor_health_potion',
    name: 'Minor Health Potion',
    description: 'A small vial of red liquid that restores health.',
    keywords: ['potion', 'health', 'minor', 'red', 'vial'],
    itemType: ItemType.CONSUMABLE,
    weight: 0.5,
    value: 25,
    rarity: ItemRarity.COMMON,
    isStackable: true,
    spawnable: true,
    lootTables: ['common_loot', 'trash_loot'],
    spawnTags: [
      SpawnTag.TYPE_CONSUMABLE,
      SpawnTag.CONSUMABLE_HEALING,
      SpawnTag.TRASH_MOB,
      SpawnTag.REALM_GENERIC
    ],
    consumableProperties: {
      consumableType: ConsumableType.POTION,
      healAmount: 10
    }
  },

  {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'A glowing red potion that restores a moderate amount of health.',
    keywords: ['potion', 'health', 'red', 'vial'],
    itemType: ItemType.CONSUMABLE,
    weight: 0.5,
    value: 50,
    rarity: ItemRarity.COMMON,
    isStackable: true,
    spawnable: true,
    lootTables: ['common_loot', 'uncommon_loot'],
    spawnTags: [
      SpawnTag.TYPE_CONSUMABLE,
      SpawnTag.CONSUMABLE_HEALING,
      SpawnTag.REALM_GENERIC
    ],
    consumableProperties: {
      consumableType: ConsumableType.POTION,
      healAmount: 25
    }
  },

  {
    id: 'bread',
    name: 'Loaf of Bread',
    description: 'A freshly baked loaf of bread. It smells delicious.',
    keywords: ['bread', 'loaf', 'food'],
    itemType: ItemType.CONSUMABLE,
    weight: 0.5,
    value: 1,
    rarity: ItemRarity.COMMON,
    isStackable: true,
    spawnable: true,
    lootTables: ['common_loot', 'trash_loot'],
    spawnTags: [
      SpawnTag.TYPE_CONSUMABLE,
      SpawnTag.CONSUMABLE_FOOD,
      SpawnTag.VENDOR_TRASH,
      SpawnTag.REALM_GENERIC,
      SpawnTag.REALM_SESAME_STREET
    ],
    consumableProperties: {
      consumableType: ConsumableType.FOOD,
      healAmount: 5,
      flavorText: 'warm and filling'
    }
  },

  // Magical Items
  {
    id: 'flaming_sword',
    name: 'Flaming Sword',
    description: 'An enchanted blade wreathed in dancing flames.',
    keywords: ['sword', 'flaming', 'fire', 'enchanted', 'magical'],
    itemType: ItemType.WEAPON,
    weight: 3,
    value: 500,
    rarity: ItemRarity.RARE,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    requiresAttunement: true,
    requiredLevel: 5,
    maxDurability: 200,
    spawnable: true,
    lootTables: ['rare_loot', 'boss_drops'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_MARTIAL,
      SpawnTag.MAGICAL,
      SpawnTag.ELITE_DROP,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '1d8+1',
      damageType: DamageType.SLASHING,
      weaponClass: WeaponClass.SWORDS,
      isTwoHanded: false,
      isRanged: false,
      attackBonus: 1,
      versatileDamageDice: null,  // Not a versatile weapon
      magicalProperties: [
        {
          type: 'extra_damage',
          value: '1d6',
          description: '+1d6 fire damage'
        },
        {
          type: 'attack_bonus',
          value: 1,
          description: '+1 to attack rolls'
        }
      ]
    }
  },

  {
    id: 'elven_cloak',
    name: 'Elven Cloak',
    description: 'A silvery cloak woven by elven craftsmen. It seems to shimmer and fade.',
    keywords: ['cloak', 'elven', 'silvery', 'magical'],
    itemType: ItemType.ARMOR,
    weight: 1,
    value: 300,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.BACK,
    requiresAttunement: true,
    spawnable: true,
    lootTables: ['uncommon_loot', 'rare_loot'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_LIGHT,
      SpawnTag.MAGICAL,
      SpawnTag.REALM_NARNIA  // Thematically fits Narnia
    ],
    armorProperties: {
      baseAC: 1,
      armorClass: ArmorClass.LIGHT,
      // Light armor: unlimited DEX bonus (no maxDexBonus restriction)
      magicalACBonus: 1
    },
    statModifiers: {
      dex: 1
    }
  },

  // Quest Item Example
  {
    id: 'ancient_key',
    name: 'Ancient Key',
    description: 'An ornate key covered in strange runes. It pulses with faint magical energy.',
    keywords: ['key', 'ancient', 'magical', 'ornate'],
    itemType: ItemType.QUEST,
    weight: 0.1,
    value: 0,
    rarity: ItemRarity.ARTIFACT,
    isQuestItem: true,
    isDroppable: false,
    isTradeable: false,
    spawnable: false,  // Quest items explicitly not spawnable
    consumableProperties: {
      questId: 'ancient_temple_quest',
      questStage: 'find_key',
      questDescription: 'A key to unlock the Ancient Temple'
    }
  },

  // Currency (stackable)
  {
    id: 'gold_coin',
    name: 'Gold Coin',
    description: 'A shiny gold coin.',
    keywords: ['gold', 'coin', 'money', 'currency'],
    itemType: ItemType.CURRENCY,
    weight: 0.01,
    value: 1,
    rarity: ItemRarity.COMMON,
    isStackable: true,
    spawnable: true,  // Currency is always spawnable (config override)
    spawnTags: [
      SpawnTag.TYPE_CURRENCY,
      SpawnTag.REALM_GENERIC
    ]
  }
];

module.exports = sampleItems;
