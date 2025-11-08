/**
 * Magical Armor - Core Item Set
 *
 * A comprehensive collection of magical armor with proper D&D 5e-style bonuses.
 * These armor pieces demonstrate the full range of magical armor properties including:
 * - AC bonuses (+1, +2, +3)
 * - Proper DEX cap implementation for all armor types
 * - Light, medium, and heavy armor examples
 * - Special protective jewelry (rings of protection)
 * - Stat bonuses and resistance effects
 */

const { ItemType, ItemRarity, EquipmentSlot, ArmorClass, DamageType, SpawnTag } = require('../../../src/items/schemas/ItemTypes');

const magicalArmor = [
  // ============================================================
  // +1 LIGHT ARMOR (UNCOMMON)
  // ============================================================

  {
    id: 'leather_armor_plus_one',
    name: 'Leather Armor +1',
    description: 'This supple leather armor has been treated with magical oils and blessed by an enchanter. It provides better protection than ordinary leather while remaining light and flexible.',
    keywords: ['leather', 'armor', 'magical', 'enchanted', '+1', 'light'],
    itemType: ItemType.ARMOR,
    subType: 'light',
    weight: 10,
    value: 500,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_LIGHT,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 11,
      magicalACBonus: 1,  // Total AC = 12 + DEX
      armorClass: ArmorClass.LIGHT,
      armorType: 'light',
      maxDexBonus: 999,  // Light armor: unlimited DEX bonus (999 = effectively no cap)
      stealthDisadvantage: false
    },
    examineText: 'The leather gleams with magical enhancement. This light armor provides AC 12 + your full Dexterity modifier.',
    durability: 100,
    maxDurability: 100
  },

  {
    id: 'studded_leather_plus_one',
    name: 'Studded Leather Armor +1',
    description: 'Reinforced leather armor with enchanted steel studs. The magical enhancement makes it surprisingly protective without sacrificing mobility. Rogues and rangers prize such armor.',
    keywords: ['studded', 'leather', 'armor', 'magical', 'enchanted', '+1', 'light'],
    itemType: ItemType.ARMOR,
    subType: 'light',
    weight: 13,
    value: 750,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_LIGHT,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 12,
      magicalACBonus: 1,  // Total AC = 13 + DEX
      armorClass: ArmorClass.LIGHT,
      armorType: 'light',
      maxDexBonus: 999,  // Light armor: unlimited DEX bonus (999 = effectively no cap)
      stealthDisadvantage: false
    },
    examineText: 'The studs pulse with protective magic. Provides AC 13 + your full Dexterity modifier. Excellent for agile warriors.',
    durability: 100,
    maxDurability: 100
  },

  // ============================================================
  // +1 MEDIUM ARMOR (UNCOMMON)
  // ============================================================

  {
    id: 'chain_shirt_plus_one',
    name: 'Chain Shirt +1',
    description: 'A finely crafted chain shirt with links that have been magically strengthened. Lighter than it looks, and far more protective. The metal has a silvery sheen.',
    keywords: ['chain', 'shirt', 'armor', 'magical', 'enchanted', '+1', 'medium', 'mail'],
    itemType: ItemType.ARMOR,
    subType: 'medium',
    weight: 18,
    value: 650,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_MEDIUM,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 13,
      magicalACBonus: 1,  // Total AC = 14 + DEX (max 2)
      armorClass: ArmorClass.MEDIUM,
      armorType: 'medium',
      maxDexBonus: 2,  // Medium armor: max +2 DEX bonus
      stealthDisadvantage: false
    },
    examineText: 'The chainmail links shimmer with enchantment. Provides AC 14 + Dexterity modifier (maximum +2). No stealth disadvantage.',
    durability: 100,
    maxDurability: 100
  },

  {
    id: 'scale_mail_plus_one',
    name: 'Scale Mail +1',
    description: 'Armor made of overlapping metal scales, each one individually enchanted. The scales shift and adjust to deflect blows more effectively than mundane armor.',
    keywords: ['scale', 'mail', 'armor', 'magical', 'enchanted', '+1', 'medium'],
    itemType: ItemType.ARMOR,
    subType: 'medium',
    weight: 42,
    value: 850,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_MEDIUM,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 14,
      magicalACBonus: 1,  // Total AC = 15 + DEX (max 2)
      armorClass: ArmorClass.MEDIUM,
      armorType: 'medium',
      maxDexBonus: 2,  // Medium armor: max +2 DEX bonus
      stealthDisadvantage: true
    },
    examineText: 'Each scale gleams with protective magic. Provides AC 15 + Dexterity modifier (maximum +2). Imposes disadvantage on Stealth checks.',
    durability: 100,
    maxDurability: 100
  },

  {
    id: 'breastplate_plus_one',
    name: 'Breastplate +1',
    description: 'A magnificently crafted breastplate that fits like a second skin. The magical enhancement provides exceptional protection while allowing full range of motion.',
    keywords: ['breastplate', 'armor', 'magical', 'enchanted', '+1', 'medium', 'chest'],
    itemType: ItemType.ARMOR,
    subType: 'medium',
    weight: 18,
    value: 900,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_MEDIUM,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 14,
      magicalACBonus: 1,  // Total AC = 15 + DEX (max 2)
      armorClass: ArmorClass.MEDIUM,
      armorType: 'medium',
      maxDexBonus: 2,  // Medium armor: max +2 DEX bonus
      stealthDisadvantage: false
    },
    examineText: 'The breastplate is a masterwork of both craftsmanship and enchantment. AC 15 + Dexterity modifier (maximum +2). No stealth disadvantage.',
    durability: 100,
    maxDurability: 100
  },

  // ============================================================
  // +1 HEAVY ARMOR (UNCOMMON)
  // ============================================================

  {
    id: 'chain_mail_plus_one',
    name: 'Chain Mail +1',
    description: 'Full-body chain mail with magically reinforced links. Despite the weight, the enchantment helps distribute the load more evenly. Provides excellent protection for those strong enough to wear it.',
    keywords: ['chain', 'mail', 'armor', 'magical', 'enchanted', '+1', 'heavy'],
    itemType: ItemType.ARMOR,
    subType: 'heavy',
    weight: 52,
    value: 1200,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_HEAVY,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 16,
      magicalACBonus: 1,  // Total AC = 17
      armorClass: ArmorClass.HEAVY,
      armorType: 'heavy',
      maxDexBonus: 0,  // Heavy armor: no DEX bonus
      stealthDisadvantage: true,
      strengthRequirement: 13
    },
    examineText: 'The chainmail glows faintly with protective magic. Provides AC 17. Dexterity does not affect AC. Requires Strength 13. Imposes disadvantage on Stealth.',
    durability: 100,
    maxDurability: 100
  },

  {
    id: 'plate_armor_plus_one',
    name: 'Plate Armor +1',
    description: 'The pinnacle of armored protection, enhanced with powerful enchantments. This full suit of plate makes you nearly invincible. The steel is polished to a mirror shine and covered in protective runes.',
    keywords: ['plate', 'armor', 'magical', 'enchanted', '+1', 'heavy', 'full'],
    itemType: ItemType.ARMOR,
    subType: 'heavy',
    weight: 60,
    value: 2500,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_HEAVY,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.ELITE_DROP,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 18,
      magicalACBonus: 1,  // Total AC = 19
      armorClass: ArmorClass.HEAVY,
      armorType: 'heavy',
      maxDexBonus: 0,  // Heavy armor: no DEX bonus
      stealthDisadvantage: true,
      strengthRequirement: 15
    },
    examineText: 'Runes of warding cover every surface. Provides AC 19. Dexterity does not affect AC. Requires Strength 15. Imposes disadvantage on Stealth checks.',
    durability: 100,
    maxDurability: 100
  },

  // ============================================================
  // +2 ARMOR (RARE)
  // ============================================================

  {
    id: 'plate_armor_plus_two',
    name: 'Plate Armor +2',
    description: 'Legendary plate armor that glows with barely contained magical power. Forged by master smiths and enchanted by archmages. Only the greatest heroes wear such protection.',
    keywords: ['plate', 'armor', 'magical', 'enchanted', '+2', 'heavy', 'legendary', 'powerful'],
    itemType: ItemType.ARMOR,
    subType: 'heavy',
    weight: 60,
    value: 10000,
    rarity: ItemRarity.RARE,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    spawnable: true,
    lootTables: ['rare_loot', 'boss_drops'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_HEAVY,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_RARE,
      SpawnTag.BOSS_DROP,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 18,
      magicalACBonus: 2,  // Total AC = 20
      armorClass: ArmorClass.HEAVY,
      armorType: 'heavy',
      maxDexBonus: 0,  // Heavy armor: no DEX bonus
      stealthDisadvantage: true,
      strengthRequirement: 15
    },
    examineText: 'The armor radiates protective magic. Provides AC 20. Dexterity does not affect AC. Requires Strength 15.',
    durability: 100,
    maxDurability: 100
  },

  {
    id: 'studded_leather_plus_two',
    name: 'Studded Leather Armor +2',
    description: 'Exceptionally rare enchanted leather armor. The studs are made of mithril and inscribed with protective wards. Provides remarkable protection without hindering agility.',
    keywords: ['studded', 'leather', 'armor', 'magical', 'enchanted', '+2', 'light', 'powerful'],
    itemType: ItemType.ARMOR,
    subType: 'light',
    weight: 13,
    value: 5000,
    rarity: ItemRarity.RARE,
    isEquippable: true,
    slot: EquipmentSlot.CHEST,
    spawnable: true,
    lootTables: ['rare_loot', 'boss_drops'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_LIGHT,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_RARE,
      SpawnTag.BOSS_DROP,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 12,
      magicalACBonus: 2,  // Total AC = 14 + DEX
      armorClass: ArmorClass.LIGHT,
      armorType: 'light',
      maxDexBonus: 999,  // Light armor: unlimited DEX bonus (999 = effectively no cap)
      stealthDisadvantage: false
    },
    examineText: 'The mithril studs pulse with power. Provides AC 14 + your full Dexterity modifier. Perfect for agile combatants.',
    durability: 100,
    maxDurability: 100
  },

  // ============================================================
  // MAGICAL JEWELRY - PROTECTION
  // ============================================================

  {
    id: 'ring_of_protection',
    name: 'Ring of Protection',
    description: 'A simple silver band inscribed with protective runes. When worn, an invisible shield of force surrounds you, deflecting blows. The ring feels warm against your skin.',
    keywords: ['ring', 'protection', 'magical', 'enchanted', 'jewelry', 'ac'],
    itemType: ItemType.JEWELRY,
    subType: 'ring',
    weight: 0.1,
    value: 2000,
    rarity: ItemRarity.RARE,
    isEquippable: true,
    slot: EquipmentSlot.RING_1,
    spawnable: true,
    lootTables: ['rare_loot', 'boss_drops'],
    requiresAttunement: true,
    attunementSlots: 1,
    spawnTags: [
      SpawnTag.TYPE_JEWELRY,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_RARE,
      SpawnTag.ELITE_DROP,
      SpawnTag.REALM_GENERIC
    ],
    // Rings grant AC bonus through a special property
    statModifiers: {
      // Note: AC bonus will be handled by EquipmentManager
      // This is a placeholder for the bonus AC
    },
    // Custom property for AC bonus (will be read by EquipmentManager)
    bonusAC: 1,
    examineText: 'The runes glow softly. Grants a +1 bonus to AC. Requires attunement.',
    durability: 100,
    maxDurability: 100
  },

  {
    id: 'ring_of_protection_plus_two',
    name: 'Ring of Protection +2',
    description: 'An exceptionally rare and powerful protective ring. The force shield it generates is visible as a faint shimmer around your body. Legends speak of these rings saving lives countless times.',
    keywords: ['ring', 'protection', 'magical', 'enchanted', 'jewelry', 'ac', '+2', 'powerful'],
    itemType: ItemType.JEWELRY,
    subType: 'ring',
    weight: 0.1,
    value: 8000,
    rarity: ItemRarity.LEGENDARY,
    isEquippable: true,
    slot: EquipmentSlot.RING_1,
    spawnable: true,
    lootTables: ['legendary_loot', 'boss_drops'],
    requiresAttunement: true,
    attunementSlots: 1,
    spawnTags: [
      SpawnTag.TYPE_JEWELRY,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_LEGENDARY,
      SpawnTag.BOSS_DROP,
      SpawnTag.REALM_GENERIC
    ],
    bonusAC: 2,
    examineText: 'The ring emanates visible protective energy. Grants a +2 bonus to AC. Requires attunement.',
    durability: 100,
    maxDurability: 100
  },

  // ============================================================
  // MAGICAL SHIELDS
  // ============================================================

  {
    id: 'shield_plus_one',
    name: 'Shield +1',
    description: 'A sturdy wooden shield reinforced with enchanted steel bands. The magic makes it lighter and more effective at deflecting blows.',
    keywords: ['shield', 'magical', 'enchanted', '+1', 'defense'],
    itemType: ItemType.ARMOR,
    subType: 'shield',
    weight: 6,
    value: 750,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.OFF_HAND,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_ARMOR,
      SpawnTag.ARMOR_SHIELD,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    armorProperties: {
      baseAC: 2,
      magicalACBonus: 1,  // Total AC bonus = 3
      armorClass: ArmorClass.SHIELD,
      armorType: 'shield',
      maxDexBonus: 999,  // Shields don't restrict DEX (999 = effectively no cap)
      stealthDisadvantage: false
    },
    examineText: 'The shield is covered in protective runes. Grants a +3 bonus to AC when equipped.',
    durability: 100,
    maxDurability: 100
  }
];

module.exports = magicalArmor;
