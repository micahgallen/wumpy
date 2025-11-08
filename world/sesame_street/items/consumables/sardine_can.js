/**
 * Sardine Can - Oscar's Favorite Trash Delicacy
 *
 * A questionably fresh can of sardines, the kind that might be found
 * in Oscar the Grouch's trash collection. Low quality but it'll do.
 */

const { ItemType, ItemRarity, ConsumableType, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'sardine_can',
  name: 'a dented can of sardines',
  description: 'This tin can has seen better days - probably several decades ago. The label is water-stained and peeling, featuring a jubilant fish that seems inappropriately cheerful given its fate. The pull-tab is rusty but functional. It smells of the sea, regret, and questionable life choices.',
  keywords: ['sardines', 'can', 'tin', 'fish'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.3,
  value: 12,
  rarity: ItemRarity.COMMON,
  isStackable: true,
  spawnable: true,
  lootTables: ['trash_loot', 'vendor_only'],
  spawnTags: [
    SpawnTag.TYPE_CONSUMABLE,
    SpawnTag.CONSUMABLE_FOOD,
    SpawnTag.VENDOR_TRASH,
    SpawnTag.TRASH_MOB,
    SpawnTag.REALM_SESAME_STREET,
    SpawnTag.REALM_GENERIC
  ],
  consumableProperties: {
    consumableType: ConsumableType.FOOD,
    healAmount: 3,
    flavorText: 'fishy and of questionable freshness'
  }
};
