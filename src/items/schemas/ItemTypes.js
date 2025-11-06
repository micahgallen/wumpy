/**
 * Item Type Definitions and Enums
 *
 * Central definitions for all item-related types, enums, and constants.
 * These mirror the design document schemas.
 */

const ItemType = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  JEWELRY: 'jewelry',
  CONSUMABLE: 'consumable',
  QUEST: 'quest',
  COSMETIC: 'cosmetic',
  MATERIAL: 'material',
  CONTAINER: 'container',
  CURRENCY: 'currency',
  MISC: 'misc'
};

const ItemRarity = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
  ARTIFACT: 'artifact'
};

const EquipmentSlot = {
  // Weapons
  MAIN_HAND: 'main_hand',
  OFF_HAND: 'off_hand',

  // Armor
  HEAD: 'head',
  NECK: 'neck',
  SHOULDERS: 'shoulders',
  CHEST: 'chest',
  BACK: 'back',
  WRISTS: 'wrists',
  HANDS: 'hands',
  WAIST: 'waist',
  LEGS: 'legs',
  FEET: 'feet',

  // Jewelry
  RING_1: 'ring_1',
  RING_2: 'ring_2',
  TRINKET_1: 'trinket_1',
  TRINKET_2: 'trinket_2'
};

const WeaponClass = {
  // Simple Melee
  SIMPLE_MELEE: 'simple_melee',

  // Martial Melee
  SWORDS: 'swords',
  AXES: 'axes',
  MACES: 'maces',
  POLEARMS: 'polearms',
  EXOTIC_MELEE: 'exotic_melee',

  // Simple Ranged
  SIMPLE_RANGED: 'simple_ranged',

  // Martial Ranged
  BOWS: 'bows',
  CROSSBOWS: 'crossbows',
  THROWN: 'thrown',
  EXOTIC_RANGED: 'exotic_ranged',

  // Magical
  WANDS: 'wands',
  STAVES: 'staves'
};

const ArmorClass = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
  SHIELD: 'shield'
};

const DamageType = {
  PHYSICAL: 'physical',
  SLASHING: 'slashing',
  PIERCING: 'piercing',
  BLUDGEONING: 'bludgeoning',
  FIRE: 'fire',
  ICE: 'ice',
  LIGHTNING: 'lightning',
  POISON: 'poison',
  NECROTIC: 'necrotic',
  RADIANT: 'radiant',
  PSYCHIC: 'psychic',
  FORCE: 'force'
};

const MagicalPropertyType = {
  // Damage Enhancements
  EXTRA_DAMAGE: 'extra_damage',
  DAMAGE_BONUS: 'damage_bonus',

  // Attack Enhancements
  ATTACK_BONUS: 'attack_bonus',
  CRITICAL_IMPROVEMENT: 'critical_improvement',

  // Special Effects
  LIFE_STEAL: 'life_steal',
  MANA_STEAL: 'mana_steal',
  CHANCE_TO_STUN: 'chance_to_stun',
  CHANCE_TO_SLOW: 'chance_to_slow',
  ON_HIT_EFFECT: 'on_hit_effect',
  ON_KILL_EFFECT: 'on_kill_effect',

  // Stat Bonuses
  STAT_BONUS: 'stat_bonus',
  ARMOR_CLASS_BONUS: 'armor_class_bonus',
  RESISTANCE: 'resistance',

  // Utility
  LIGHT_SOURCE: 'light_source',
  INVISIBILITY: 'invisibility',
  DETECT_HIDDEN: 'detect_hidden'
};

const ConsumableType = {
  POTION: 'potion',
  FOOD: 'food',
  SCROLL: 'scroll',
  ELIXIR: 'elixir',
  POISON: 'poison',
  TOOL: 'tool'
};

// Helper functions for validation
const ItemTypeValidation = {
  isValidItemType(type) {
    return Object.values(ItemType).includes(type);
  },

  isValidRarity(rarity) {
    return Object.values(ItemRarity).includes(rarity);
  },

  isValidEquipmentSlot(slot) {
    return Object.values(EquipmentSlot).includes(slot);
  },

  isValidWeaponClass(weaponClass) {
    return Object.values(WeaponClass).includes(weaponClass);
  },

  isValidArmorClass(armorClass) {
    return Object.values(ArmorClass).includes(armorClass);
  },

  isValidDamageType(damageType) {
    return Object.values(DamageType).includes(damageType);
  },

  isValidMagicalPropertyType(propType) {
    return Object.values(MagicalPropertyType).includes(propType);
  },

  isValidConsumableType(consumableType) {
    return Object.values(ConsumableType).includes(consumableType);
  }
};

module.exports = {
  ItemType,
  ItemRarity,
  EquipmentSlot,
  WeaponClass,
  ArmorClass,
  DamageType,
  MagicalPropertyType,
  ConsumableType,
  ItemTypeValidation
};
