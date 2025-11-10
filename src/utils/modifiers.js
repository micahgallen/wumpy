/**
 * Stat Modifiers and Helper Functions
 *
 * D&D 5e style ability score modifiers and calculations
 */

/**
 * Calculate ability modifier from ability score
 * D&D 5e formula: (score - 10) / 2, rounded down
 * @param {number} abilityScore - Ability score (typically 1-30)
 * @returns {number} Ability modifier (e.g., 14 STR = +2)
 */
function getModifier(abilityScore) {
  return Math.floor((abilityScore - 10) / 2);
}

/**
 * Calculate proficiency bonus based on level
 * D&D 5e progression: +2 at L1, +3 at L5, +4 at L9, +5 at L13, etc.
 * @param {number} level - Character level
 * @returns {number} Proficiency bonus
 */
function calculateProficiency(level) {
  // Formula: 2 + floor((level - 1) / 4)
  return 2 + Math.floor((level - 1) / 4);
}

/**
 * Calculate Armor Class (AC)
 * Base AC = 10 + DEX modifier + armor bonus
 * @param {number} dexterity - Dexterity ability score
 * @param {number} armorBonus - Bonus from armor (default 0)
 * @returns {number} Total Armor Class
 */
function calculateArmorClass(dexterity, armorBonus = 0) {
  const dexMod = getModifier(dexterity);
  return 10 + dexMod + armorBonus;
}

/**
 * Calculate attack bonus
 * Attack bonus = ability modifier + proficiency bonus
 * @param {number} abilityScore - Relevant ability (STR for melee, DEX for ranged)
 * @param {number} proficiency - Proficiency bonus
 * @returns {number} Total attack bonus
 */
function calculateAttackBonus(abilityScore, proficiency) {
  const abilityMod = getModifier(abilityScore);
  return abilityMod + proficiency;
}

/**
 * Calculate initiative bonus (DEX modifier)
 * @param {number} dexterity - Dexterity ability score
 * @returns {number} Initiative bonus
 */
function calculateInitiative(dexterity) {
  return getModifier(dexterity);
}

/**
 * Determine if an attack hits based on attack roll vs AC
 * @param {number} attackRoll - Total attack roll (d20 + modifiers)
 * @param {number} targetAC - Target's Armor Class
 * @returns {boolean} True if attack hits
 */
function isHit(attackRoll, targetAC) {
  return attackRoll >= targetAC;
}

/**
 * Check if a natural roll is a critical hit
 * @param {number} naturalRoll - Unmodified d20 roll
 * @returns {boolean} True if natural 20
 */
function isCriticalHit(naturalRoll) {
  return naturalRoll === 20;
}

/**
 * Check if a natural roll is a critical miss (fumble)
 * @param {number} naturalRoll - Unmodified d20 roll
 * @returns {boolean} True if natural 1
 */
function isCriticalMiss(naturalRoll) {
  return naturalRoll === 1;
}

/**
 * Calculate net advantage/disadvantage
 * If counts are equal or both zero, return 'normal'
 * @param {number} advantageCount - Number of advantage sources
 * @param {number} disadvantageCount - Number of disadvantage sources
 * @returns {string} 'advantage', 'disadvantage', or 'normal'
 */
function calculateNetAdvantage(advantageCount, disadvantageCount) {
  const netCount = advantageCount - disadvantageCount;

  if (netCount > 0) {
    return 'advantage';
  } else if (netCount < 0) {
    return 'disadvantage';
  } else {
    return 'normal';
  }
}

/**
 * Apply resistance or vulnerability to damage
 * @param {number} damage - Base damage amount
 * @param {number} multiplier - Damage multiplier (0.5 for resistance, 2.0 for vulnerability)
 * @returns {number} Adjusted damage (rounded)
 */
function applyDamageMultiplier(damage, multiplier) {
  return Math.round(damage * multiplier);
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate ability score is in reasonable range (1-30)
 * @param {number} score - Ability score to validate
 * @returns {boolean} True if valid
 */
function isValidAbilityScore(score) {
  return typeof score === 'number' && score >= 1 && score <= 30;
}

/**
 * Validate level is in reasonable range (1-50)
 * @param {number} level - Level to validate
 * @returns {boolean} True if valid
 */
function isValidLevel(level) {
  return typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 50;
}

/**
 * Calculate maximum HP based on level and constitution
 * Formula: Base HP + (level-1) * HP per level + CON modifier per level
 * - Level 1: 15 + CON_mod
 * - Each level: +4 HP + CON_mod (minimum +1 per level)
 * @param {number} level - Character level
 * @param {number} constitution - Constitution ability score
 * @returns {number} Maximum HP
 */
function calculateMaxHP(level, constitution) {
  const conMod = getModifier(constitution);
  const baseHP = 15; // Starting HP at level 1
  const hpPerLevel = Math.max(1, 4 + conMod); // Minimum 1 HP per level

  return baseHP + conMod + (level - 1) * hpPerLevel;
}

module.exports = {
  getModifier,
  calculateProficiency,
  calculateArmorClass,
  calculateAttackBonus,
  calculateInitiative,
  isHit,
  isCriticalHit,
  isCriticalMiss,
  calculateNetAdvantage,
  applyDamageMultiplier,
  clamp,
  isValidAbilityScore,
  isValidLevel,
  calculateMaxHP
};
