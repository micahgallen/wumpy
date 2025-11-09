const { rollD20, rollDice } = require('../utils/dice');
const { getModifier, getProficiencyBonus } = require('../progression/statProgression');
const { calculateResistance } = require('./damageTypes');
const EquipmentManager = require('../systems/equipment/EquipmentManager');
const { EquipmentSlot, ItemType } = require('../items/schemas/ItemTypes');
const config = require('../config/itemsConfig');

function getAttackBonus(attacker, damageType, hand = 'main_hand') {
  const proficiency = getProficiencyBonus(attacker.level);

  // Determine ability modifier based on weapon properties or damage type
  let abilityMod = 0;
  let weaponBonus = 0;
  let proficiencyPenalty = 0;
  let armorPenalty = 0;

  // Check for equipped weapon
  const slot = hand === 'off_hand' ? EquipmentSlot.OFF_HAND : EquipmentSlot.MAIN_HAND;
  const weapon = attacker.inventory ? EquipmentManager.getEquippedInSlot(attacker, slot) : null;

  if (weapon && weapon.itemType === ItemType.WEAPON) {
    // Use finesse weapons with DEX if beneficial, otherwise STR
    if (weapon.isFinesse && weapon.isFinesse()) {
      const strMod = getModifier(attacker.stats?.strength || attacker.strength || 10);
      const dexMod = getModifier(attacker.stats?.dexterity || attacker.dexterity || 10);
      abilityMod = Math.max(strMod, dexMod);
    } else if (weapon.isRanged && weapon.isRanged()) {
      // Ranged weapons use DEX
      abilityMod = getModifier(attacker.stats?.dexterity || attacker.dexterity || 10);
    } else {
      // Melee weapons use STR
      abilityMod = getModifier(attacker.stats?.strength || attacker.strength || 10);
    }

    // Get weapon's magical bonus (only applies if attuned when required)
    if (!weapon.requiresAttunement || weapon.isAttuned) {
      const proficiencyCheck = EquipmentManager.checkProficiency(attacker, weapon);
      weaponBonus = weapon.getAttackBonus ? weapon.getAttackBonus(proficiencyCheck.isProficient) : 0;

      // Apply proficiency penalty if not proficient
      if (!proficiencyCheck.isProficient && proficiencyCheck.penalty) {
        proficiencyPenalty = proficiencyCheck.penalty;
      }
    }
  } else {
    // Unarmed: use STR
    abilityMod = getModifier(attacker.stats?.strength || attacker.strength || 10);
  }

  // Check for armor proficiency penalties
  const chestArmor = attacker.inventory ? EquipmentManager.getEquippedInSlot(attacker, EquipmentSlot.CHEST) : null;
  if (chestArmor && chestArmor.itemType === ItemType.ARMOR) {
    const armorProficiency = EquipmentManager.checkProficiency(attacker, chestArmor);
    if (!armorProficiency.isProficient && armorProficiency.penalty) {
      armorPenalty = armorProficiency.penalty;
    }
  }

  return proficiency + abilityMod + weaponBonus + proficiencyPenalty + armorPenalty;
}

function getArmorClass(defender) {
  // Use EquipmentManager's calculateAC if defender has inventory
  if (defender.inventory) {
    const acCalc = EquipmentManager.calculateAC(defender);
    return acCalc.totalAC;
  }

  // Fallback for NPCs without equipment system
  const baseAC = 10;
  const dexMod = getModifier(defender.stats?.dexterity || defender.dexterity || 10);
  return baseAC + dexMod;
}

function rollAttack(attacker, defender, damageType = 'physical') {
  const roll = rollD20();
  const bonus = getAttackBonus(attacker, damageType);
  const total = roll + bonus;
  const targetAC = getArmorClass(defender);

  const critical = (roll === 20);
  const criticalMiss = (roll === 1);
  const hit = !criticalMiss && (critical || total >= targetAC);

  return { hit, critical, criticalMiss, roll, total, targetAC };
}

/**
 * Get the damage dice for an attacker
 * Checks for equipped weapon, otherwise returns unarmed damage
 * @param {Object} attacker - The attacking entity
 * @param {string} hand - 'main_hand' or 'off_hand'
 * @returns {Object} {damageDice: string, weapon: BaseItem|null, isVersatile: boolean}
 */
function getDamageDice(attacker, hand = 'main_hand') {
  // Check for equipped weapon in new equipment system
  if (attacker.inventory) {
    const slot = hand === 'off_hand' ? EquipmentSlot.OFF_HAND : EquipmentSlot.MAIN_HAND;
    const weapon = EquipmentManager.getEquippedInSlot(attacker, slot);

    if (weapon && weapon.itemType === ItemType.WEAPON && weapon.weaponProperties) {
      // Check if two-handing a versatile weapon
      const offHand = EquipmentManager.getEquippedInSlot(attacker, EquipmentSlot.OFF_HAND);
      const isTwoHanding = !offHand &&
                          (weapon.isVersatile?.() || weapon.weaponProperties?.isTwoHanded);

      return {
        damageDice: weapon.weaponProperties.damageDice,
        weapon: weapon,
        isVersatile: isTwoHanding
      };
    }
  }

  // Legacy support: Check if attacker has old equippedWeapon property
  if (attacker.equippedWeapon && attacker.equippedWeapon.damage) {
    return {
      damageDice: attacker.equippedWeapon.damage,
      weapon: null,
      isVersatile: false
    };
  }

  // Unarmed damage: 1d1 (always rolls 1, per design doc)
  return {
    damageDice: '1d1',
    weapon: null,
    isVersatile: false
  };
}

/**
 * Roll damage for an attack
 * @param {Object} attacker - The attacking entity
 * @param {Object} damageInfo - Object from getDamageDice with {damageDice, weapon, isVersatile}
 * @param {boolean} critical - Whether this is a critical hit
 * @param {string} hand - 'main_hand' or 'off_hand'
 * @returns {number} Final damage amount
 */
function rollDamage(attacker, damageInfo, critical = false, hand = 'main_hand') {
  const { damageDice, weapon, isVersatile } = damageInfo;

  // Use weapon's rollDamage method if available
  if (weapon && weapon.rollDamage) {
    // Check if attunement is required and item is not attuned
    if (weapon.requiresAttunement && !weapon.isAttuned) {
      // Don't apply magical bonuses, use base damage only
      const baseDice = weapon.weaponProperties.damageDice;
      let damage = rollDice(baseDice);

      // Add ability modifier
      const abilityMod = getAbilityModifierForWeapon(attacker, weapon);
      damage += abilityMod;

      // Critical hits double the dice (not the modifier)
      if (critical) {
        damage += rollDice(baseDice);
      }

      return Math.max(1, damage);
    }

    // Use weapon's method for full damage calculation
    let damage = weapon.rollDamage(critical, isVersatile);

    // Add ability modifier
    const abilityMod = getAbilityModifierForWeapon(attacker, weapon);

    // Off-hand attacks don't add ability modifier to damage (unless specific feat)
    if (hand === 'off_hand' && config.dualWield.offHandDamageMultiplier === 0.5) {
      // Don't add ability modifier for off-hand
      damage = Math.max(1, damage);
    } else {
      damage += abilityMod;
    }

    return Math.max(1, damage);
  }

  // Legacy/unarmed damage calculation
  let baseDamage = rollDice(damageDice);

  // Add STR modifier for melee/unarmed attacks
  const strModifier = getModifier(attacker.stats?.strength || attacker.strength || 10);
  baseDamage += strModifier;

  // Ensure minimum damage of 1 (even with negative STR)
  baseDamage = Math.max(1, baseDamage);

  // Critical hits double the damage
  const finalDamage = critical ? baseDamage * 2 : baseDamage;

  return finalDamage;
}

/**
 * Get ability modifier for weapon damage
 * @param {Object} attacker - The attacking entity
 * @param {BaseItem} weapon - The weapon being used
 * @returns {number} Ability modifier
 */
function getAbilityModifierForWeapon(attacker, weapon) {
  if (!weapon) {
    return getModifier(attacker.stats?.strength || attacker.strength || 10);
  }

  // Finesse weapons can use DEX or STR (player's choice, we use higher)
  if (weapon.isFinesse && weapon.isFinesse()) {
    const strMod = getModifier(attacker.stats?.strength || attacker.strength || 10);
    const dexMod = getModifier(attacker.stats?.dexterity || attacker.dexterity || 10);
    return Math.max(strMod, dexMod);
  }

  // Ranged weapons use DEX
  if (weapon.isRanged && weapon.isRanged()) {
    return getModifier(attacker.stats?.dexterity || attacker.dexterity || 10);
  }

  // Melee weapons use STR
  return getModifier(attacker.stats?.strength || attacker.strength || 10);
}

function applyDamage(target, rawDamage, damageType) {
  const resistance = target.resistances[damageType] || 0;
  const finalDamage = calculateResistance(rawDamage, damageType, target.resistances);

  target.takeDamage(finalDamage);

  // Track damage timestamp for rest system (only for players with sockets)
  if (target.socket) {
    target.lastDamageTaken = Date.now();
  }

  return {
    rawDamage,
    resistance,
    finalDamage,
    dead: target.isDead()
  };
}

module.exports = {
  getAttackBonus,
  getArmorClass,
  rollAttack,
  rollDamage,
  applyDamage,
  getDamageDice,
  getAbilityModifierForWeapon
};
