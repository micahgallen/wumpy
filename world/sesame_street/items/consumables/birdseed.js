/**
 * Birdseed - For Big Bird and Friends
 *
 * A small bag of mixed birdseed, perfect for our feathered friends
 * on Sesame Street. Humans can technically eat it, but probably shouldn't.
 */

const { ItemType, ItemRarity, ConsumableType, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'birdseed',
  name: 'a small bag of birdseed',
  description: 'A cloth bag filled with an assortment of seeds, millet, and tiny grains that birds find inexplicably delightful. The bag has a cheerful picture of a cardinal on it, though the cardinal looks suspiciously judgmental. While technically edible for non-avians, the texture is best described as "crunchy disappointment".',
  keywords: ['birdseed', 'seed', 'bag', 'bird', 'food'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.2,
  value: 10,
  rarity: ItemRarity.COMMON,
  isStackable: true,
  spawnable: true,
  lootTables: ['common_loot', 'trash_loot', 'vendor_only'],
  spawnTags: [
    SpawnTag.TYPE_CONSUMABLE,
    SpawnTag.CONSUMABLE_FOOD,
    SpawnTag.VENDOR_TRASH,
    SpawnTag.REALM_SESAME_STREET
  ],
  consumableProperties: {
    consumableType: ConsumableType.FOOD,
    healAmount: 2,
    flavorText: 'crunchy and probably meant for birds'
  }
};
