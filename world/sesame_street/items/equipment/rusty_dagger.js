/**
 * Rusty Dagger - Basic Weapon
 *
 * A simple, worn dagger found in the arena weapons rack.
 * Better than nothing, but not by much.
 */

const { ItemType, ItemRarity, EquipmentSlot, WeaponClass, DamageType, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'rusty_dagger',
  name: 'a rusty dagger',
  description: 'This dagger has seen better days - possibly better decades. The blade is pitted with rust and oxidation, giving it a mottled orange-brown appearance that suggests it spent quality time in a damp cellar. The edge is dull enough that you could probably run your thumb along it without incident (though that would still be inadvisable). The leather-wrapped handle is cracked and peeling, but maintains a grip that says "I may be past my prime, but I can still poke things." Perfect for adventurers who need a backup weapon or are on a very tight budget.',
  keywords: ['dagger', 'rusty', 'knife', 'blade', 'weapon'],
  itemType: ItemType.WEAPON,
  subType: 'dagger',
  weight: 1,
  value: 20,
  rarity: ItemRarity.COMMON,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  spawnable: true,
  spawnTags: [
    SpawnTag.TYPE_WEAPON,
    SpawnTag.WEAPON_MELEE,
    SpawnTag.WEAPON_SIMPLE,
    SpawnTag.STARTER_GEAR,
    SpawnTag.MUNDANE,
    SpawnTag.REALM_SESAME_STREET,
    SpawnTag.REALM_GENERIC
  ],
  weaponProperties: {
    damageDice: '1d4',
    damageType: DamageType.PIERCING,
    weaponClass: WeaponClass.SIMPLE_MELEE,
    isTwoHanded: false,
    isRanged: false,
    isLight: true,
    isFinesse: true,

    // Non-magical weapon bonuses
    magicalAttackBonus: 0,
    magicalDamageBonus: 0,
    versatileDamageDice: null
  },
  durability: 50,
  maxDurability: 100
};
