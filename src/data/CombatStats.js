/**
 * Combat Stats Extensions for Player/NPC
 *
 * Defines the combat-related statistics structure
 */

const { calculateProficiency, calculateArmorClass } = require('../utils/modifiers');

/**
 * Create default combat stats for a new player
 * @param {number} level - Character level (default 1)
 * @returns {Object} Combat stats object
 */
function createPlayerCombatStats(level = 1) {
  return {
    // Core Stats
    level: level,
    currentXp: 0,
    maxHp: 10,
    currentHp: 10,
    resource: 100,          // Mana/energy (guild-specific)
    maxResource: 100,

    // Attributes (D&D ability scores)
    str: 10,
    dex: 12,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,

    // Derived Stats
    proficiency: calculateProficiency(level),
    armorClass: calculateArmorClass(12, 0), // 10 + 1 (DEX mod) + 0 (no armor)

    // Current Weapon (default unarmed)
    currentWeapon: {
      name: 'Fists',
      damageDice: '1d4',
      damageType: 'physical'
    },

    // Combat State
    isGhost: false,
    isDead: false,
    lastDamageTaken: 0,
    lastDefeatedBy: new Set(),

    // Cooldowns
    pvpCooldownUntil: null,
    fleeCooldownUntil: null
  };
}

/**
 * Create combat stats for an NPC
 * @param {Object} npcDef - NPC definition object
 * @returns {Object} NPC combat stats
 */
function createNpcCombatStats(npcDef) {
  return {
    level: npcDef.level,
    maxHp: npcDef.maxHp,
    currentHp: npcDef.maxHp,
    armorClass: npcDef.armorClass,

    // Attributes
    str: npcDef.str,
    dex: npcDef.dex,
    con: npcDef.con,
    int: npcDef.int,
    wis: npcDef.wis,
    cha: npcDef.cha,

    // Combat
    proficiency: npcDef.proficiency,
    currentWeapon: {
      name: npcDef.name,
      damageDice: npcDef.damageDice,
      damageType: npcDef.damageType
    },

    // Resistances/Vulnerabilities
    resistances: npcDef.resistances || {},
    vulnerabilities: npcDef.vulnerabilities || []
  };
}

/**
 * Update player stats after level up
 * @param {Object} stats - Player combat stats
 * @returns {Object} Updated stats
 */
function applyLevelUp(stats) {
  stats.level++;
  stats.maxHp += 5;
  stats.currentHp = stats.maxHp; // Full heal on level up
  stats.proficiency = calculateProficiency(stats.level);

  return stats;
}

/**
 * Apply damage to an entity
 * @param {Object} entity - Entity with combat stats
 * @param {number} damage - Damage to apply
 * @returns {Object} Updated entity
 */
function applyDamage(entity, damage) {
  entity.currentHp = Math.max(0, entity.currentHp - damage);
  entity.lastDamageTaken = Date.now();

  return entity;
}

/**
 * Heal an entity
 * @param {Object} entity - Entity with combat stats
 * @param {number} amount - HP to restore
 * @returns {Object} Updated entity
 */
function applyHealing(entity, amount) {
  entity.currentHp = Math.min(entity.maxHp, entity.currentHp + amount);
  return entity;
}

/**
 * Check if entity is alive
 * @param {Object} entity - Entity with combat stats
 * @returns {boolean} True if alive
 */
function isAlive(entity) {
  return entity.currentHp > 0;
}

/**
 * Check if entity is dead
 * @param {Object} entity - Entity with combat stats
 * @returns {boolean} True if dead
 */
function isDead(entity) {
  return entity.currentHp <= 0;
}

/**
 * Get resistance multiplier for a damage type
 * @param {Object} entity - Entity with resistances
 * @param {string} damageType - Type of damage
 * @returns {number} Damage multiplier (1.0 = normal, 0.5 = resistant, 2.0 = vulnerable)
 */
function getResistanceMultiplier(entity, damageType) {
  // Check for vulnerability (takes 2x damage)
  if (entity.vulnerabilities && entity.vulnerabilities.includes(damageType)) {
    return 2.0;
  }

  // Check for resistance (takes reduced damage)
  if (entity.resistances && entity.resistances[damageType]) {
    return entity.resistances[damageType];
  }

  // Normal damage
  return 1.0;
}

module.exports = {
  createPlayerCombatStats,
  createNpcCombatStats,
  applyLevelUp,
  applyDamage,
  applyHealing,
  isAlive,
  isDead,
  getResistanceMultiplier
};
