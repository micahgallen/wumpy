/**
 * Health Potion - Standard Healing Consumable
 *
 * A proper health potion for testing the economy system.
 * Higher value than cookies but still affordable.
 */

const { ItemType, ItemRarity, ConsumableType, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'sesame_health_potion',
  name: 'a health potion',
  description: 'This small glass vial contains a liquid of aggressive redness. The potion swirls with inner light suggesting powerful magic or questionable additives. It smells of raspberries, mint, and wellness. The cork is sealed with red wax bearing an apothecary mark.',
  keywords: ['potion', 'health', 'healing', 'red', 'vial'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.5,
  value: 50,
  rarity: ItemRarity.COMMON,
  isStackable: true,
  spawnable: true,
  lootTables: ['common_loot', 'vendor_only'],
  spawnTags: [
    SpawnTag.TYPE_CONSUMABLE,
    SpawnTag.CONSUMABLE_HEALING,
    SpawnTag.VENDOR_TRASH,
    SpawnTag.REALM_SESAME_STREET,
    SpawnTag.REALM_GENERIC
  ],
  consumableProperties: {
    consumableType: ConsumableType.POTION,
    healAmount: 25,
    flavorText: 'warm, sweet, and powerfully restorative'
  }
};
