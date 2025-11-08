/**
 * Leather Cap - Basic Head Protection
 *
 * A simple leather cap sold at Hooper's Store.
 * Affordable starter armor for new adventurers.
 */

const { ItemType, ItemRarity, EquipmentSlot, ArmorClass, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'leather_cap',
  name: 'a leather cap',
  description: 'This is a sensible leather cap of the sort worn by people who have accepted that head injuries are a real possibility in their line of work. The leather is supple and well-maintained, with a slight sheen that suggests someone actually cares about its upkeep. It provides minimal protection but has the advantage of not making you look ridiculous - a rare quality in protective headgear. The interior is lined with what might be felt, or possibly the hopes and dreams of whoever made it.',
  keywords: ['cap', 'leather', 'hat', 'head', 'armor'],
  itemType: ItemType.ARMOR,
  subType: 'light',
  weight: 1,
  value: 100,
  rarity: ItemRarity.COMMON,
  isEquippable: true,
  slot: EquipmentSlot.HEAD,
  spawnable: true,
  spawnTags: [
    SpawnTag.TYPE_ARMOR,
    SpawnTag.ARMOR_LIGHT,
    SpawnTag.STARTER_GEAR,
    SpawnTag.MUNDANE,
    SpawnTag.REALM_SESAME_STREET,
    SpawnTag.REALM_GENERIC
  ],
  armorProperties: {
    baseAC: 1,
    armorClass: ArmorClass.LIGHT,
    armorType: 'light',
    stealthDisadvantage: false
  },
  durability: 100,
  maxDurability: 100
};
