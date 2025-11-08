/**
 * Oatmeal Cookie - The Healthier Option (Allegedly)
 *
 * An oatmeal cookie from Hooper's Store. Contains actual oats,
 * which technically makes it health food if you squint.
 */

const { ItemType, ItemRarity, ConsumableType, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'oatmeal_cookie',
  name: 'an oatmeal cookie',
  description: 'This hearty oatmeal cookie contains enough rolled oats to qualify as "breakfast" in certain philosophical frameworks. Studded with raisins that may or may not be chocolate chips (a distinction that has caused heated debates in cookie circles), it has that wholesome, slightly chewy texture that suggests nutritional value while still delivering on taste. The kind of cookie your grandmother would approve of.',
  keywords: ['cookie', 'oatmeal', 'oat', 'raisin'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.15,
  value: 30,
  rarity: ItemRarity.COMMON,
  isStackable: true,
  spawnable: true,
  lootTables: ['common_loot', 'vendor_only'],
  spawnTags: [
    SpawnTag.TYPE_CONSUMABLE,
    SpawnTag.CONSUMABLE_FOOD,
    SpawnTag.VENDOR_TRASH,
    SpawnTag.REALM_SESAME_STREET,
    SpawnTag.REALM_GENERIC
  ],
  consumableProperties: {
    consumableType: ConsumableType.FOOD,
    healAmount: 6,
    flavorText: 'hearty, wholesome, and surprisingly filling'
  }
};
