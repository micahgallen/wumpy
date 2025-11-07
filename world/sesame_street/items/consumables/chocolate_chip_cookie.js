/**
 * Chocolate Chip Cookie - Sesame Street Consumable
 *
 * A delicious cookie that defies thermodynamics by staying warm forever.
 * Perfect for testing the new item system.
 */

const { ItemType, ItemRarity, ConsumableType, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'chocolate_chip_cookie',
  name: 'a chocolate chip cookie',
  description: 'This is a perfectly round chocolate chip cookie that somehow maintains its temperature despite all known laws of thermodynamics. It smells delicious and promises to taste even better. The chocolate chips arrange themselves in a pattern that suggests either divine intervention or very precise manufacturing.',
  keywords: ['cookie', 'chocolate', 'chip'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.1,
  value: 2,
  rarity: ItemRarity.COMMON,
  isStackable: true,
  spawnable: true,
  lootTables: ['common_loot', 'trash_loot', 'vendor_only'],
  spawnTags: [
    SpawnTag.TYPE_CONSUMABLE,
    SpawnTag.CONSUMABLE_FOOD,
    SpawnTag.VENDOR_TRASH,
    SpawnTag.REALM_SESAME_STREET,
    SpawnTag.REALM_GENERIC
  ],
  consumableProperties: {
    consumableType: ConsumableType.FOOD,
    healAmount: 5,
    flavorText: 'impossibly warm and delicious'
  }
};
