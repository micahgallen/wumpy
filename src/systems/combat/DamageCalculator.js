/**
 * Damage Calculator
 *
 * Handles damage rolling, resistances, vulnerabilities, and application
 * Implements D&D 5e damage mechanics
 */

const { rollDamage } = require('../../utils/dice');
const { applyDamageMultiplier, getModifier } = require('../../utils/modifiers');
const { applyDamage: applyDamageToStats } = require('../../data/CombatStats');
const { getResistanceMultiplier } = require('../../data/CombatStats');
const EquipmentManager = require('../equipment/EquipmentManager');
const { ItemType, DamageType } = require('../../items/schemas/ItemTypes');

/**
 * Calculate damage for an attack
 * @param {string} damageDice - Damage dice notation (e.g., "1d6")
 * @param {boolean} isCritical - Whether this is a critical hit
 * @param {string} damageType - Type of damage
 * @param {Object} target - Target entity
 * @returns {Object} Damage result
 */
function calculateDamage(damageDice, isCritical, damageType, target) {
  // 1. Roll damage dice (critical hits roll twice as many dice)
  const baseDamage = rollDamage(damageDice, isCritical);

  // 2. Apply resistance/vulnerability
  const multiplier = getResistanceMultiplier(target, damageType);
  const finalDamage = applyDamageMultiplier(baseDamage, multiplier);

  // 3. Return damage breakdown
  return {
    baseDamage: baseDamage,
    finalDamage: finalDamage,
    damageType: damageType,
    multiplier: multiplier,
    wasResisted: multiplier < 1.0,
    wasVulnerable: multiplier > 1.0
  };
}

/**
 * Apply damage to a target entity
 * @param {Object} target - Target entity
 * @param {number} damage - Damage amount
 * @param {string} damageType - Type of damage
 * @returns {Object} Result with HP changes
 */
function applyDamageToTarget(target, damage, damageType) {
  const previousHp = target.currentHp;

  // Apply damage (updates target.currentHp in place)
  applyDamageToStats(target, damage);

  const actualDamage = previousHp - target.currentHp;

  return {
    previousHp: previousHp,
    currentHp: target.currentHp,
    damageTaken: actualDamage,
    died: target.currentHp <= 0,
    damageType: damageType
  };
}

/**
 * Resolve off-hand attack damage (D&D 5e: no ability modifier)
 * @param {Object} attacker - Attacking entity
 * @param {Object} target - Target entity
 * @param {Object} attackResult - Result from resolveAttackRoll
 * @param {Object} offHandWeapon - Off-hand weapon
 * @returns {Object} Complete attack result with damage
 */
function resolveOffHandDamage(attacker, target, attackResult, offHandWeapon) {
  // If attack missed or fumbled, no damage
  if (!attackResult.hit || attackResult.fumble) {
    return {
      ...attackResult,
      damage: 0,
      damageBreakdown: null
    };
  }

  // Get weapon properties
  const weaponProps = offHandWeapon.weaponProperties;
  const damageDice = weaponProps.damageDice;
  const damageType = weaponProps.damageType;
  const weaponBonus = weaponProps.magicalDamageBonus || 0;

  // D&D 5e: Off-hand attack does NOT add ability modifier to damage
  // (unless character has Two-Weapon Fighting feature, which we don't implement yet)
  const abilityModifier = 0;

  // Calculate damage (dice + weapon bonus only, no ability modifier)
  const damageResult = calculateDamage(
    damageDice,
    attackResult.critical,
    damageType,
    target
  );

  // Add weapon bonus only (no ability modifier per D&D 5e)
  // Minimum 1 damage if attack hits (per D&D 5e rules)
  const totalDamage = Math.max(1, damageResult.finalDamage + weaponBonus);

  // Apply damage to target
  const applicationResult = applyDamageToTarget(
    target,
    totalDamage,
    damageType
  );

  // Return complete result
  return {
    ...attackResult,
    damage: totalDamage,
    damageBreakdown: {
      ...damageResult,
      abilityModifier: 0, // Off-hand gets no ability modifier per D&D 5e
      weaponBonus,
      finalDamage: totalDamage
    },
    hpChange: applicationResult,
    targetDied: applicationResult.died
  };
}

/**
 * Resolve a complete attack with damage
 * @param {Object} attacker - Attacking entity
 * @param {Object} target - Target entity
 * @param {Object} attackResult - Result from resolveAttackRoll
 * @returns {Object} Complete attack result with damage
 */
function resolveAttackDamage(attacker, target, attackResult) {
  // If attack missed or fumbled, no damage
  if (!attackResult.hit || attackResult.fumble) {
    return {
      ...attackResult,
      damage: 0,
      damageBreakdown: null
    };
  }

  // Get equipped weapon from EquipmentManager (replaces legacy currentWeapon)
  const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');
  const offHand = EquipmentManager.getEquippedInSlot(attacker, 'off_hand');

  let damageDice, damageType, weaponBonus;

  if (!weapon || weapon.itemType !== ItemType.WEAPON) {
    // Unarmed strike (D&D 5e: 1 + STR modifier bludgeoning damage)
    damageDice = '1d4';
    damageType = DamageType.BLUDGEONING;
    weaponBonus = 0;
  } else {
    // Get weapon properties
    const weaponProps = weapon.weaponProperties;

    // Check for versatile weapon wielded two-handed
    if (weaponProps.versatileDamageDice && !offHand) {
      damageDice = weaponProps.versatileDamageDice;
    } else {
      damageDice = weaponProps.damageDice;
    }

    damageType = weaponProps.damageType;
    weaponBonus = weaponProps.magicalDamageBonus || 0;
  }

  // Calculate ability modifier for damage
  let abilityModifier;
  if (weapon?.weaponProperties?.isFinesse) {
    // Finesse: use higher of STR or DEX
    const strMod = getModifier(attacker.str);
    const dexMod = getModifier(attacker.dex);
    abilityModifier = Math.max(strMod, dexMod);
  } else if (weapon?.weaponProperties?.isRanged) {
    // Ranged: always DEX
    abilityModifier = getModifier(attacker.dex);
  } else {
    // Melee: STR
    abilityModifier = getModifier(attacker.str);
  }

  // Calculate damage
  const damageResult = calculateDamage(
    damageDice,
    attackResult.critical,
    damageType,
    target
  );

  // Add ability modifier and weapon bonus (D&D 5e: added once, not doubled on crit)
  // Minimum 1 damage if attack hits (negative modifiers can't reduce to 0)
  const totalDamage = Math.max(1, damageResult.finalDamage + abilityModifier + weaponBonus);

  // Apply damage to target
  const applicationResult = applyDamageToTarget(
    target,
    totalDamage,
    damageType
  );

  // Return complete result
  return {
    ...attackResult,
    damage: totalDamage,
    damageBreakdown: {
      ...damageResult,
      abilityModifier,
      weaponBonus,
      finalDamage: totalDamage
    },
    hpChange: applicationResult,
    targetDied: applicationResult.died
  };
}

/**
 * Format damage message for display
 * @param {Object} target - Target entity
 * @param {Object} damageResult - Damage calculation result
 * @returns {string} Formatted message
 */
function formatDamageMessage(target, damageResult) {
  // Use capname for players, name for NPCs
  const targetName = target.getDisplayName ? target.getDisplayName() : target.name;
  let msg = '';

  if (damageResult.finalDamage > 0) {
    msg += `${targetName} takes ${damageResult.finalDamage} ${damageResult.damageType} damage`;

    if (damageResult.wasResisted) {
      msg += ' (resisted)';
    } else if (damageResult.wasVulnerable) {
      msg += ' (vulnerable!)';
    }

    msg += '.';
  } else {
    msg += `${targetName} takes no damage.`;
  }

  return msg;
}

/**
 * Calculate total damage from multiple hits (for simulation/testing)
 * @param {Array<Object>} damageResults - Array of damage results
 * @returns {number} Total damage
 */
function sumDamage(damageResults) {
  return damageResults.reduce((total, result) => total + (result.finalDamage || 0), 0);
}

/**
 * Get damage type effectiveness (for UI/feedback)
 * @param {Object} target - Target entity
 * @param {string} damageType - Type of damage
 * @returns {string} 'vulnerable', 'resistant', or 'normal'
 */
function getDamageEffectiveness(target, damageType) {
  const multiplier = getResistanceMultiplier(target, damageType);

  if (multiplier > 1.0) {
    return 'vulnerable';
  } else if (multiplier < 1.0) {
    return 'resistant';
  } else {
    return 'normal';
  }
}

module.exports = {
  calculateDamage,
  applyDamageToTarget,
  resolveAttackDamage,
  resolveOffHandDamage,
  formatDamageMessage,
  sumDamage,
  getDamageEffectiveness
};
