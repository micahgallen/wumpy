const { rollD20, rollDice } = require('../utils/dice');
const { getModifier, getProficiencyBonus } = require('../progression/statProgression');
const { calculateResistance } = require('./damageTypes');

function getAttackBonus(attacker, damageType) {
  const proficiency = getProficiencyBonus(attacker.level);
  const ability = damageType === 'physical'
    ? getModifier(attacker.strength)
    : getModifier(attacker.dexterity);
  const equipment = 0; // Future: weapon bonus

  return proficiency + ability + equipment;
}

function getArmorClass(defender) {
  const baseAC = 10;
  const dexMod = getModifier(defender.dexterity);
  const armorBonus = 0; // Future: armor equipment

  return baseAC + dexMod + armorBonus;
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
 * @returns {string} Damage dice notation (e.g., '1d8', '1d3')
 */
function getDamageDice(attacker) {
  // Check if attacker has a weapon equipped
  if (attacker.equippedWeapon && attacker.equippedWeapon.damage) {
    return attacker.equippedWeapon.damage;
  }

  // Unarmed damage: 1d3 (will add STR modifier separately)
  return '1d3';
}

/**
 * Roll damage for an attack
 * @param {Object} attacker - The attacking entity
 * @param {string} damageDice - Damage dice notation (e.g., '1d8')
 * @param {boolean} critical - Whether this is a critical hit
 * @returns {number} Final damage amount
 */
function rollDamage(attacker, damageDice, critical = false) {
  let baseDamage = rollDice(damageDice);

  // Add STR modifier for melee/unarmed attacks
  const strModifier = getModifier(attacker.strength || 10);

  // For unarmed attacks (1d3), always add STR
  // For weapons, check if weapon uses STR (melee) or DEX (finesse/ranged)
  const isUnarmed = damageDice === '1d3';
  const weaponUsesStr = !attacker.equippedWeapon ||
                        !attacker.equippedWeapon.finesse; // Future: finesse weapons use DEX

  if (isUnarmed || weaponUsesStr) {
    baseDamage += strModifier;
  }

  // Ensure minimum damage of 1 (even with negative STR)
  baseDamage = Math.max(1, baseDamage);

  // Critical hits double the damage
  const finalDamage = critical ? baseDamage * 2 : baseDamage;

  return finalDamage;
}

function applyDamage(target, rawDamage, damageType) {
  const resistance = target.resistances[damageType] || 0;
  const finalDamage = calculateResistance(rawDamage, damageType, target.resistances);

  target.takeDamage(finalDamage);

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
  getDamageDice
};
