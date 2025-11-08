/**
 * Sugar Cookie - Hooper's Store Classic
 *
 * A simple, delicious sugar cookie from Hooper's Store.
 * Perfectly sweet and suitable for all ages.
 */

const { ItemType, ItemRarity, ConsumableType, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'sugar_cookie',
  name: 'a sugar cookie',
  description: 'This golden-brown sugar cookie achieves the perfect balance between crispy edges and a soft center. Decorated with just enough granulated sugar to catch the light like edible diamonds, it emanates the kind of simple, honest sweetness that makes you believe in basic goodness. The edges show the telltale marks of being lovingly pressed with a fork.',
  keywords: ['cookie', 'sugar', 'sweet'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.1,
  value: 20,
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
    healAmount: 4,
    flavorText: 'simple, sweet, and satisfying'
  }
};
