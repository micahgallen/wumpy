/**
 * Milk Bottle - Classic Cold Beverage
 *
 * A small glass bottle of cold milk, perfect for washing down
 * all those cookies from Hooper's Store.
 */

const { ItemType, ItemRarity, ConsumableType, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'milk_bottle',
  name: 'a bottle of cold milk',
  description: 'This small glass bottle contains milk so cold and fresh it seems to emit a faint, wholesome glow. Condensation beads on the outside like tiny pearls of beverage commitment. The milk inside is that perfect shade of white that suggests cows living their best lives. The bottle cap requires just enough effort to open that you feel accomplished when you succeed.',
  keywords: ['milk', 'bottle', 'drink', 'beverage'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.5,
  value: 2,
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
    healAmount: 5,
    flavorText: 'cold, creamy, and refreshing'
  }
};
