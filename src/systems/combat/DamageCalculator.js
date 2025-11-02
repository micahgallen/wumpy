/**
 * Damage Calculator
 *
 * Handles damage rolling, resistances, vulnerabilities, and application
 * Implements D&D 5e damage mechanics
 */

const { rollDamage } = require('../../utils/dice');
const { applyDamageMultiplier } = require('../../utils/modifiers');
const { applyDamage: applyDamageToStats } = require('../../data/CombatStats');
const { getResistanceMultiplier } = require('../../data/CombatStats');

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

  // Get weapon damage
  const weapon = attacker.currentWeapon || {
    damageDice: '1d4',
    damageType: 'physical'
  };

  // Calculate damage
  const damageResult = calculateDamage(
    weapon.damageDice,
    attackResult.critical,
    weapon.damageType,
    target
  );

  // Apply damage to target
  const applicationResult = applyDamageToTarget(
    target,
    damageResult.finalDamage,
    weapon.damageType
  );

  // Return complete result
  return {
    ...attackResult,
    damage: damageResult.finalDamage,
    damageBreakdown: damageResult,
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
  const targetName = target.username || target.name;
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
  formatDamageMessage,
  sumDamage,
  getDamageEffectiveness
};
