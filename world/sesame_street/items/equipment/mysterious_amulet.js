/**
 * Mysterious Amulet - Unidentified Magic Item
 *
 * A mysterious amulet that requires identification.
 * Perfect for testing the identify service at shops.
 */

const { ItemType, ItemRarity, EquipmentSlot, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'mysterious_amulet',
  name: 'a mysterious amulet',
  description: 'This peculiar amulet pulses with faint energy that makes you uncomfortable. The metal is neither gold nor silver but something in between. Strange symbols cover its surface in patterns that almost make sense. It might be magical, cursed, or just an elaborate paperweight. Only identification will tell.',
  keywords: ['amulet', 'mysterious', 'necklace', 'jewelry', 'magic'],
  itemType: ItemType.JEWELRY,
  subType: 'amulet',
  weight: 0.3,
  value: 250,
  rarity: ItemRarity.UNCOMMON,
  isEquippable: true,
  slot: EquipmentSlot.NECK,
  spawnable: true,
  isIdentified: false,
  requiresIdentification: true,
  spawnTags: [
    SpawnTag.TYPE_JEWELRY,
    SpawnTag.MAGICAL,
    SpawnTag.REALM_SESAME_STREET,
    SpawnTag.REALM_GENERIC
  ],
  statModifiers: {
    wis: 2,
    int: 1
  }
};
