/**
 * Test Equipment Set
 *
 * A comprehensive set of test items covering EVERY equipment slot.
 * These items are designed for testing the equipment system and can be
 * spawned using admin commands like @spawn_full.
 *
 * Includes:
 * - Dual-wieldable daggers (main_hand/off_hand)
 * - All armor slots (head, neck, shoulders, chest, back, wrists, hands, waist, legs, feet)
 * - All jewelry slots (ring_1, ring_2, trinket_1, trinket_2)
 * - Variety of armor types (light, medium, heavy)
 */

const { ItemType, ItemRarity, EquipmentSlot, WeaponClass, ArmorClass, DamageType, SpawnTag } = require('../../../src/items/schemas/ItemTypes');

const testEquipmentSet = [
  // ============================================================
  // WEAPONS - Dual-wieldable light daggers for testing
  // ============================================================
  {
    id: 'test_iron_dagger',
    name: 'Test Iron Dagger',
    description: 'A simple iron dagger designed for testing dual-wield mechanics. Light enough to use in either hand.',
    keywords: ['dagger', 'test', 'iron', 'blade', 'knife'],
    itemType: ItemType.WEAPON,
    subType: 'dagger',
    weight: 1,
    value: 10,
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

      // Non-magical weapon bonuses
      magicalAttackBonus: 0,
      magicalDamageBonus: 0,
      versatileDamageDice: null
    }
  },

  {
    id: 'test_steel_dagger',
    name: 'Test Steel Dagger',
    description: 'A well-crafted steel dagger for testing off-hand weapon mechanics. Slightly better than its iron counterpart.',
    keywords: ['dagger', 'test', 'steel', 'blade', 'knife'],
    itemType: ItemType.WEAPON,
    subType: 'dagger',
    weight: 1,
    value: 15,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.OFF_HAND,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_SIMPLE,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '1d4+1',
      damageType: DamageType.PIERCING,
      weaponClass: WeaponClass.SIMPLE_MELEE,
      isTwoHanded: false,
      isRanged: false,
      isLight: true,
      isFinesse: true,

      // Non-magical weapon bonuses
      magicalAttackBonus: 0,
      magicalDamageBonus: 0,
      versatileDamageDice: null
    }
  },

  // ============================================================
  // ARMOR - HEAD SLOT
  // ============================================================
  {
    id: 'test_iron_helmet',
    name: 'Test Iron Helmet',
    description: 'A sturdy iron helmet for testing head slot equipment. Provides decent protection without magical frills.',
    keywords: ['helmet', 'test', 'iron', 'head', 'helm'],
    itemType: ItemType.ARMOR,
    subType: 'medium',
    weight: 5,
    value: 25,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.HEAD,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_MEDIUM,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 1,  // Medium head: 12% of AC budget
      armorClass: ArmorClass.MEDIUM,
      armorType: 'medium',
      maxDexBonus: 2,  // Medium armor: max +2 DEX bonus
      stealthDisadvantage: false
    }
  },

  // ============================================================
  // ARMOR - NECK SLOT
  // ============================================================
  {
    id: 'test_amulet_of_health',
    name: 'Test Amulet of Health',
    description: 'A simple brass amulet on a leather cord. Designed for testing neck slot equipment functionality.',
    keywords: ['amulet', 'test', 'necklace', 'brass', 'neck'],
    itemType: ItemType.JEWELRY,
    subType: 'amulet',
    weight: 0.2,
    value: 30,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.NECK,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_JEWELRY,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    statModifiers: {
      con: 1
    }
  },

  // ============================================================
  // ARMOR - SHOULDERS SLOT
  // ============================================================
  {
    id: 'test_leather_pauldrons',
    name: 'Test Leather Pauldrons',
    description: 'Reinforced leather shoulder guards. Perfect for testing the shoulder equipment slot.',
    keywords: ['pauldrons', 'test', 'leather', 'shoulders', 'guards'],
    itemType: ItemType.ARMOR,
    subType: 'light',
    weight: 3,
    value: 20,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.SHOULDERS,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_LIGHT,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 1,  // Light shoulders: 6% of AC budget
      armorClass: ArmorClass.LIGHT,
      armorType: 'light',
      maxDexBonus: 999,  // Light armor: unlimited DEX bonus (999 = effectively no cap)
      stealthDisadvantage: false
    }
  },

  // ============================================================
  // ARMOR - CHEST SLOT
  // ============================================================
  {
    id: 'test_chainmail_shirt',
    name: 'Test Chainmail Shirt',
    description: 'A well-maintained chainmail shirt. The standard test item for chest slot equipment.',
    keywords: ['chainmail', 'test', 'shirt', 'chest', 'armor', 'mail'],
    itemType: ItemType.ARMOR,
    subType: 'medium',
    weight: 20,
    value: 75,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_MEDIUM,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 4,  // Medium chest: 40% of AC budget
      armorClass: ArmorClass.MEDIUM,
      armorType: 'medium',
      maxDexBonus: 2,  // Medium armor: max +2 DEX bonus
      stealthDisadvantage: false
    }
  },

  // ============================================================
  // ARMOR - BACK SLOT
  // ============================================================
  {
    id: 'test_travelers_cloak',
    name: "Test Traveler's Cloak",
    description: 'A weather-worn cloak in faded green. Ideal for testing back slot equipment without magical complications.',
    keywords: ['cloak', 'test', 'travelers', 'back', 'cape'],
    itemType: ItemType.ARMOR,
    subType: 'light',
    weight: 2,
    value: 15,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.BACK,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_LIGHT,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 0,  // Light back: 3% of AC budget (minimal)
      armorClass: ArmorClass.LIGHT,
      armorType: 'light',
      maxDexBonus: 999,  // Light armor: unlimited DEX bonus (999 = effectively no cap)
      stealthDisadvantage: false
    }
  },

  // ============================================================
  // ARMOR - WRISTS SLOT
  // ============================================================
  {
    id: 'test_iron_bracers',
    name: 'Test Iron Bracers',
    description: 'Sturdy iron bracers that protect the forearms. Standard test equipment for the wrist slot.',
    keywords: ['bracers', 'test', 'iron', 'wrists', 'vambraces'],
    itemType: ItemType.ARMOR,
    subType: 'medium',
    weight: 2,
    value: 18,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.WRISTS,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_MEDIUM,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 1,  // Medium wrists: 4% of AC budget
      armorClass: ArmorClass.MEDIUM,
      armorType: 'medium',
      maxDexBonus: 2,  // Medium armor: max +2 DEX bonus
      stealthDisadvantage: false
    }
  },

  // ============================================================
  // ARMOR - HANDS SLOT
  // ============================================================
  {
    id: 'test_leather_gloves',
    name: 'Test Leather Gloves',
    description: 'Supple leather gloves that allow good dexterity. Perfect for testing hand slot equipment.',
    keywords: ['gloves', 'test', 'leather', 'hands', 'gauntlets'],
    itemType: ItemType.ARMOR,
    subType: 'light',
    weight: 1,
    value: 12,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.HANDS,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_LIGHT,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 1,  // Light hands: 8% of AC budget
      armorClass: ArmorClass.LIGHT,
      armorType: 'light',
      maxDexBonus: 999,  // Light armor: unlimited DEX bonus (999 = effectively no cap)
      stealthDisadvantage: false
    }
  },

  // ============================================================
  // ARMOR - WAIST SLOT
  // ============================================================
  {
    id: 'test_studded_belt',
    name: 'Test Studded Belt',
    description: 'A wide leather belt reinforced with metal studs. Practical test equipment for the waist slot.',
    keywords: ['belt', 'test', 'studded', 'waist', 'leather'],
    itemType: ItemType.ARMOR,
    subType: 'light',
    weight: 1,
    value: 10,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.WAIST,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_LIGHT,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 0,  // Light waist: 4% of AC budget (minimal)
      armorClass: ArmorClass.LIGHT,
      armorType: 'light',
      maxDexBonus: 999,  // Light armor: unlimited DEX bonus (999 = effectively no cap)
      stealthDisadvantage: false
    }
  },

  // ============================================================
  // ARMOR - LEGS SLOT
  // ============================================================
  {
    id: 'test_iron_greaves',
    name: 'Test Iron Greaves',
    description: 'Solid iron leg armor that provides good protection. The standard test item for leg slot equipment.',
    keywords: ['greaves', 'test', 'iron', 'legs', 'armor'],
    itemType: ItemType.ARMOR,
    subType: 'heavy',
    weight: 8,
    value: 40,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.LEGS,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_HEAVY,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 2,  // Heavy legs: 15% of AC budget
      armorClass: ArmorClass.HEAVY,
      armorType: 'heavy',
      maxDexBonus: 0,  // Heavy armor: no DEX bonus
      stealthDisadvantage: true,
      strengthRequirement: 13
    }
  },

  // ============================================================
  // ARMOR - FEET SLOT
  // ============================================================
  {
    id: 'test_leather_boots',
    name: 'Test Leather Boots',
    description: 'Comfortable leather boots suitable for long journeys. Perfect for testing foot slot equipment.',
    keywords: ['boots', 'test', 'leather', 'feet', 'footwear'],
    itemType: ItemType.ARMOR,
    subType: 'light',
    weight: 2,
    value: 8,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.FEET,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_LIGHT,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 1,
      armorClass: ArmorClass.LIGHT,
      armorType: 'light',
      maxDexBonus: 999,  // Light armor: unlimited DEX bonus (999 = effectively no cap)
      stealthDisadvantage: false
    }
  },

  // ============================================================
  // JEWELRY - RING SLOT 1
  // ============================================================
  {
    id: 'test_silver_ring',
    name: 'Test Silver Ring',
    description: 'A simple silver ring with no gemstones. Designed for testing the first ring slot.',
    keywords: ['ring', 'test', 'silver', 'jewelry'],
    itemType: ItemType.JEWELRY,
    subType: 'ring',
    weight: 0.1,
    value: 20,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.RING_1,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_JEWELRY,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    statModifiers: {
      wis: 1
    }
  },

  // ============================================================
  // JEWELRY - RING SLOT 2
  // ============================================================
  {
    id: 'test_copper_ring',
    name: 'Test Copper Ring',
    description: 'A tarnished copper ring. Perfect for testing the second ring slot independently.',
    keywords: ['ring', 'test', 'copper', 'jewelry'],
    itemType: ItemType.JEWELRY,
    subType: 'ring',
    weight: 0.1,
    value: 15,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.RING_2,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_JEWELRY,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    statModifiers: {
      int: 1
    }
  },

  // ============================================================
  // JEWELRY - TRINKET SLOT 1
  // ============================================================
  {
    id: 'test_lucky_charm',
    name: 'Test Lucky Charm',
    description: 'A worn rabbits foot on a keychain. Standard test equipment for the first trinket slot.',
    keywords: ['trinket', 'test', 'charm', 'lucky', 'rabbit'],
    itemType: ItemType.JEWELRY,
    subType: 'trinket',
    weight: 0.2,
    value: 25,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.TRINKET_1,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_JEWELRY,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    statModifiers: {
      cha: 1
    }
  },

  // ============================================================
  // JEWELRY - TRINKET SLOT 2
  // ============================================================
  {
    id: 'test_pocket_watch',
    name: 'Test Pocket Watch',
    description: 'A brass pocket watch that no longer keeps accurate time. Ideal for testing the second trinket slot.',
    keywords: ['trinket', 'test', 'watch', 'pocket', 'brass'],
    itemType: ItemType.JEWELRY,
    subType: 'trinket',
    weight: 0.3,
    value: 30,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.TRINKET_2,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_JEWELRY,
      SpawnTag.STARTER_GEAR,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    statModifiers: {
      dex: 1
    }
  },

  // ============================================================
  // BONUS: HEAVY ARMOR HELMET FOR VARIETY
  // ============================================================
  {
    id: 'test_steel_greathelm',
    name: 'Test Steel Greathelm',
    description: 'A heavy steel helmet with a narrow vision slit. Provides excellent protection at the cost of visibility. Good for testing heavy armor properties.',
    keywords: ['helmet', 'test', 'steel', 'greathelm', 'heavy'],
    itemType: ItemType.ARMOR,
    subType: 'heavy',
    weight: 8,
    value: 50,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.HEAD,
    spawnable: true,
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_HEAVY,
      SpawnTag.MUNDANE,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 2,  // Heavy head: 12% of AC budget
      armorClass: ArmorClass.HEAVY,
      armorType: 'heavy',
      maxDexBonus: 0,  // Heavy armor: no DEX bonus
      stealthDisadvantage: true,
      strengthRequirement: 15
    }
  }
];

module.exports = testEquipmentSet;
