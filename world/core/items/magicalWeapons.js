/**
 * Magical Weapons - Core Item Set
 *
 * A comprehensive collection of magical weapons with proper D&D 5e-style bonuses.
 * These weapons demonstrate the full range of magical weapon properties including:
 * - Attack and damage bonuses (+1, +2, +3)
 * - Versatile weapons with two-handed damage
 * - Finesse weapons for DEX-based attackers
 * - Two-handed weapons for heavy damage
 * - Special magical effects (for future implementation)
 */

const { ItemType, ItemRarity, EquipmentSlot, WeaponClass, DamageType, SpawnTag } = require('../../../src/items/schemas/ItemTypes');

const magicalWeapons = [
  // ============================================================
  // +1 WEAPONS (UNCOMMON)
  // ============================================================

  {
    id: 'dagger_plus_one',
    name: 'Dagger +1',
    description: 'This finely balanced dagger feels lighter than it should. The blade never seems to dull, and strikes with uncanny precision. A faint shimmer of enchantment runs along its edge.',
    keywords: ['dagger', 'knife', 'blade', 'magical', 'enchanted', '+1'],
    itemType: ItemType.WEAPON,
    subType: 'dagger',
    weight: 1,
    value: 250,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_SIMPLE,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
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

      // Magical bonuses
      magicalAttackBonus: 1,
      magicalDamageBonus: 1,
      versatileDamageDice: null
    },
    examineText: 'The dagger bears faint runes along its hilt. The enchantment grants a +1 bonus to attack and damage rolls.',
    durability: 100,
    maxDurability: 100
  },

  {
    id: 'longsword_plus_one',
    name: 'Longsword +1',
    description: 'A masterwork longsword of exceptional balance. The blade gleams with a subtle magical aura, and you feel more confident with each swing. The crossguard is inscribed with words of power.',
    keywords: ['longsword', 'sword', 'blade', 'magical', 'enchanted', '+1'],
    itemType: ItemType.WEAPON,
    subType: 'sword',
    weight: 3,
    value: 500,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_MARTIAL,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '1d8',
      versatileDamageDice: '1d10',  // Two-handed damage
      damageType: DamageType.SLASHING,
      weaponClass: WeaponClass.SWORDS,
      isTwoHanded: false,
      isRanged: false,
      isLight: false,
      isFinesse: false,

      // Magical bonuses
      magicalAttackBonus: 1,
      magicalDamageBonus: 1
    },
    examineText: 'Runes of power are etched along the blade. When wielded one-handed it deals 1d8+1 damage, or 1d10+1 when used two-handed. The weapon grants a +1 bonus to attack and damage rolls.',
    durability: 100,
    maxDurability: 100
  },

  {
    id: 'rapier_plus_one',
    name: 'Rapier +1',
    description: 'An elegant dueling blade that seems to guide your strikes. The thin, flexible blade thrums with magical energy. Perfect for the discerning swordsman who values precision over brute force.',
    keywords: ['rapier', 'sword', 'blade', 'dueling', 'magical', 'enchanted', '+1'],
    itemType: ItemType.WEAPON,
    subType: 'sword',
    weight: 2,
    value: 450,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_MARTIAL,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '1d8',
      damageType: DamageType.PIERCING,
      weaponClass: WeaponClass.SWORDS,
      isTwoHanded: false,
      isRanged: false,
      isLight: false,
      isFinesse: true,  // Can use DEX for attack and damage

      // Magical bonuses
      magicalAttackBonus: 1,
      magicalDamageBonus: 1,
      versatileDamageDice: null
    },
    examineText: 'The blade is inscribed with flowing script. This finesse weapon allows you to use Dexterity for attack and damage rolls, with a +1 magical bonus.',
    durability: 100,
    maxDurability: 100
  },

  {
    id: 'greatsword_plus_one',
    name: 'Greatsword +1',
    description: 'This massive two-handed blade radiates power. Despite its size, it feels remarkably balanced in your hands. The enchantment makes it lighter and more devastating than any mundane greatsword.',
    keywords: ['greatsword', 'sword', 'blade', 'two-handed', 'magical', 'enchanted', '+1'],
    itemType: ItemType.WEAPON,
    subType: 'sword',
    weight: 6,
    value: 550,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_MARTIAL,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '2d6',
      damageType: DamageType.SLASHING,
      weaponClass: WeaponClass.SWORDS,
      isTwoHanded: true,
      isRanged: false,
      isLight: false,
      isFinesse: false,

      // Magical bonuses
      magicalAttackBonus: 1,
      magicalDamageBonus: 1,
      versatileDamageDice: null
    },
    examineText: 'Magical runes pulse with power along the length of the blade. This two-handed weapon deals 2d6+1 slashing damage and grants a +1 bonus to attack rolls.',
    durability: 100,
    maxDurability: 100
  },

  {
    id: 'battleaxe_plus_one',
    name: 'Battleaxe +1',
    description: 'A fearsome axe with a keenly sharpened edge that never dulls. The weapon hums with barely contained violence, eager to bite into foes. Can be wielded one-handed or with both hands for greater power.',
    keywords: ['battleaxe', 'axe', 'weapon', 'magical', 'enchanted', '+1'],
    itemType: ItemType.WEAPON,
    subType: 'axe',
    weight: 4,
    value: 500,
    rarity: ItemRarity.UNCOMMON,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['uncommon_loot', 'vendor_only'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_MARTIAL,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_UNCOMMON,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '1d8',
      versatileDamageDice: '1d10',  // Two-handed damage
      damageType: DamageType.SLASHING,
      weaponClass: WeaponClass.AXES,
      isTwoHanded: false,
      isRanged: false,
      isLight: false,
      isFinesse: false,

      // Magical bonuses
      magicalAttackBonus: 1,
      magicalDamageBonus: 1
    },
    examineText: 'The axe head glows faintly with enchantment. It deals 1d8+1 damage one-handed, or 1d10+1 when wielded with both hands. Grants a +1 bonus to attack and damage rolls.',
    durability: 100,
    maxDurability: 100
  },

  // ============================================================
  // +2 WEAPONS (RARE)
  // ============================================================

  {
    id: 'longsword_plus_two',
    name: 'Longsword +2',
    description: 'An exquisitely crafted blade that pulses with potent magic. The steel seems almost alive, responding to your intentions. Only master enchanters could create such a weapon.',
    keywords: ['longsword', 'sword', 'blade', 'magical', 'enchanted', '+2', 'powerful'],
    itemType: ItemType.WEAPON,
    subType: 'sword',
    weight: 3,
    value: 2500,
    rarity: ItemRarity.RARE,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['rare_loot', 'boss_drops'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_MARTIAL,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_RARE,
      SpawnTag.ELITE_DROP,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '1d8',
      versatileDamageDice: '1d10',
      damageType: DamageType.SLASHING,
      weaponClass: WeaponClass.SWORDS,
      isTwoHanded: false,
      isRanged: false,
      isLight: false,
      isFinesse: false,

      // Magical bonuses
      magicalAttackBonus: 2,
      magicalDamageBonus: 2
    },
    examineText: 'The blade emanates visible magical power. Deals 1d8+2 damage one-handed or 1d10+2 two-handed. Grants a +2 bonus to attack and damage rolls.',
    durability: 100,
    maxDurability: 100,
    requiresAttunement: true
  },

  {
    id: 'rapier_plus_two',
    name: 'Rapier +2',
    description: 'A legendary dueling blade that practically fights on its own. The enchantment is so powerful that the blade leaves trails of light as it moves. Warriors would kill for such a weapon.',
    keywords: ['rapier', 'sword', 'blade', 'dueling', 'magical', 'enchanted', '+2', 'powerful'],
    itemType: ItemType.WEAPON,
    subType: 'sword',
    weight: 2,
    value: 2400,
    rarity: ItemRarity.RARE,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['rare_loot', 'boss_drops'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_MARTIAL,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_RARE,
      SpawnTag.ELITE_DROP,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '1d8',
      damageType: DamageType.PIERCING,
      weaponClass: WeaponClass.SWORDS,
      isTwoHanded: false,
      isRanged: false,
      isLight: false,
      isFinesse: true,

      // Magical bonuses
      magicalAttackBonus: 2,
      magicalDamageBonus: 2,
      versatileDamageDice: null
    },
    examineText: 'The blade shimmers with power. This finesse weapon uses Dexterity for attack and damage, dealing 1d8+2 piercing damage with a +2 bonus to attack rolls.',
    durability: 100,
    maxDurability: 100
  },

  // ============================================================
  // SPECIAL MAGICAL WEAPONS (Future Magic Effects)
  // ============================================================

  {
    id: 'flaming_longsword',
    name: 'Flaming Longsword',
    description: 'This enchanted blade bursts into flames when wielded. The fire never consumes the blade itself, but enemies are not so fortunate. The heat is intense enough to feel even from several feet away.',
    keywords: ['longsword', 'sword', 'flaming', 'fire', 'magical', 'enchanted', 'burning'],
    itemType: ItemType.WEAPON,
    subType: 'sword',
    weight: 3,
    value: 3000,
    rarity: ItemRarity.RARE,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['rare_loot', 'boss_drops'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_MARTIAL,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_RARE,
      SpawnTag.BOSS_DROP,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '1d8',
      versatileDamageDice: '1d10',
      damageType: DamageType.SLASHING,
      weaponClass: WeaponClass.SWORDS,
      isTwoHanded: false,
      isRanged: false,
      isLight: false,
      isFinesse: false,

      // Magical bonuses
      magicalAttackBonus: 1,
      magicalDamageBonus: 1
    },
    // Phase 4: Magic effects system now implemented!
    magicEffects: [{
      trigger: 'on_hit',
      type: 'extra_damage',
      damageDice: '1d6',
      damageType: DamageType.FIRE,
      message: "{{attacker.name}}'s flaming blade erupts in flames"
    }],
    examineText: 'Flames dance along the blade. Deals 1d8+1 slashing damage (1d10+1 two-handed) with a +1 bonus to attack rolls. On hit, the flames deal an additional 1d6 fire damage.',
    durability: 100,
    maxDurability: 100,
    requiresAttunement: true
  },

  {
    id: 'frost_dagger',
    name: 'Frost Dagger',
    description: 'This dagger is perpetually covered in a thin layer of frost. The blade is so cold it burns to the touch, yet the hilt remains comfortable. Water droplets freeze solid when they touch the steel.',
    keywords: ['dagger', 'frost', 'ice', 'cold', 'magical', 'enchanted', 'frozen'],
    itemType: ItemType.WEAPON,
    subType: 'dagger',
    weight: 1,
    value: 1500,
    rarity: ItemRarity.RARE,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['rare_loot', 'boss_drops'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_SIMPLE,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_RARE,
      SpawnTag.ELITE_DROP,
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

      // Magical bonuses
      magicalAttackBonus: 1,
      magicalDamageBonus: 1,
      versatileDamageDice: null
    },
    // Phase 4: Magic effects system now implemented!
    magicEffects: [{
      trigger: 'on_hit',
      type: 'extra_damage',
      damageDice: '1d4',
      damageType: DamageType.ICE,
      message: "{{attacker.name}}'s frost dagger freezes on contact"
    }],
    examineText: 'The blade radiates intense cold. Deals 1d4+1 piercing damage with a +1 bonus to attack rolls. This finesse weapon uses Dexterity. On hit, the frost deals an additional 1d4 ice damage.',
    durability: 100,
    maxDurability: 100,
    requiresAttunement: true
  },

  {
    id: 'vorpal_greatsword',
    name: 'Vorpal Greatsword',
    description: 'A legendary blade of incredible sharpness. The edge is so keen it seems to cut through the very air itself. In the hands of a master, this weapon can sever heads with a single stroke.',
    keywords: ['greatsword', 'vorpal', 'sword', 'legendary', 'magical', 'enchanted', 'sharp'],
    itemType: ItemType.WEAPON,
    subType: 'sword',
    weight: 6,
    value: 15000,
    rarity: ItemRarity.LEGENDARY,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    spawnable: true,
    lootTables: ['legendary_loot', 'boss_drops'],
    spawnTags: [
      SpawnTag.TYPE_WEAPON,
      SpawnTag.WEAPON_MELEE,
      SpawnTag.WEAPON_MARTIAL,
      SpawnTag.MAGICAL,
      SpawnTag.RARITY_LEGENDARY,
      SpawnTag.BOSS_DROP,
      SpawnTag.REALM_GENERIC
    ],
    weaponProperties: {
      damageDice: '2d6',
      damageType: DamageType.SLASHING,
      weaponClass: WeaponClass.SWORDS,
      isTwoHanded: true,
      isRanged: false,
      isLight: false,
      isFinesse: false,

      // Magical bonuses
      magicalAttackBonus: 3,
      magicalDamageBonus: 3,
      versatileDamageDice: null
    },
    // NOTE: Magic effects system not yet implemented
    // Future enhancement: Critical hits on 19-20, instant kill on natural 20
    // magicEffects: [{
    //   trigger: 'on_critical',
    //   type: 'instant_kill',
    //   saveType: 'constitution',
    //   saveDC: 15
    // }],
    examineText: 'The blade whispers as it cuts through air. Deals 2d6+3 slashing damage with a +3 bonus to attack rolls. Future: improved critical hit range and devastating critical effects.',
    durability: 100,
    maxDurability: 100,
    requiresAttunement: true,
    attunementSlots: 1
  }
];

module.exports = magicalWeapons;
