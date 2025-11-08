/**
 * Wooden Practice Sword - Starter Weapon
 *
 * A basic training weapon sold at Hooper's Store.
 * Perfect for testing repair mechanics and basic combat.
 */

const { ItemType, ItemRarity, EquipmentSlot, WeaponClass, DamageType, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'wooden_practice_sword',
  name: 'a wooden practice sword',
  description: 'This wooden training sword has clearly seen extensive use. The blade (if you can call it that) bears the telltale marks of countless practice sessions - dents, scratches, and what might be tooth marks from someone who got a bit too enthusiastic. Despite its battered appearance, it maintains a certain dignity, like a retired athlete who can still show you the moves. Perfect for beginners who need something between "unarmed" and "actually dangerous".',
  keywords: ['sword', 'wooden', 'practice', 'training', 'weapon'],
  itemType: ItemType.WEAPON,
  subType: 'sword',
  weight: 3,
  value: 50,
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
    damageType: DamageType.BLUDGEONING,
    weaponClass: WeaponClass.SIMPLE_MELEE,
    isTwoHanded: false,
    isRanged: false,
    isLight: true,
    isFinesse: false,

    // Non-magical weapon bonuses
    magicalAttackBonus: 0,
    magicalDamageBonus: 0,
    versatileDamageDice: null
  },
  durability: 75,
  maxDurability: 100
};
