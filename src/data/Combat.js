/**
 * Combat Data Structures
 *
 * Defines the core data structures for combat state management
 */

const { v4: uuidv4 } = require('crypto');

/**
 * Generate a unique combat ID
 * @returns {string} Unique combat identifier
 */
function generateCombatId() {
  // Use timestamp + random for uniqueness without external dependencies
  return `combat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new combat instance
 * @param {Array<Object>} participants - Array of participant objects
 * @returns {Object} Combat instance
 */
function createCombat(participants = []) {
  return {
    id: generateCombatId(),
    participants: participants,
    currentTurn: 0,
    startedAt: Date.now(),
    isActive: true,
    pendingActions: new Map()
  };
}

/**
 * Create a participant entry for combat
 * @param {Object} entity - Player or NPC entity
 * @param {string} entityType - 'player' or 'npc'
 * @returns {Object} Participant object
 */
function createParticipant(entity, entityType) {
  return {
    entityId: entity.id,
    entityType: entityType,
    initialHp: entity.currentHp,
    initialRoomId: entity.currentRoom || entity.roomId,
    effects: [],
    advantageCount: 0,
    disadvantageCount: 0
  };
}

/**
 * Create a status effect
 * @param {string} type - Effect type identifier
 * @param {number} durationRounds - How many rounds it lasts
 * @param {string} source - Source of the effect
 * @param {Object} options - Additional options
 * @returns {Object} Status effect object
 */
function createStatusEffect(type, durationRounds, source, options = {}) {
  return {
    type: type,
    durationRounds: durationRounds,
    source: source,
    grantAdvantage: options.grantAdvantage || false,
    grantDisadvantage: options.grantDisadvantage || false,
    ...options
  };
}

/**
 * Create a combat action
 * @param {string} actionType - Type of action ('attack', 'spell', 'flee', etc.)
 * @param {string} targetId - Target entity ID (if applicable)
 * @param {Object} data - Additional action data
 * @returns {Object} Combat action object
 */
function createCombatAction(actionType, targetId = null, data = {}) {
  return {
    type: actionType,
    targetId: targetId,
    timestamp: Date.now(),
    ...data
  };
}

/**
 * Create an attack result object
 * @param {boolean} hit - Whether the attack hit
 * @param {boolean} critical - Whether it was a critical hit
 * @param {boolean} fumble - Whether it was a critical miss
 * @param {Array<number>} rolls - Dice rolls made
 * @param {number} total - Total attack roll
 * @param {number} damage - Damage dealt
 * @returns {Object} Attack result
 */
function createAttackResult(hit, critical, fumble, rolls, total, damage) {
  return {
    hit: hit,
    critical: critical,
    fumble: fumble,
    rolls: rolls,
    total: total,
    damage: damage
  };
}

module.exports = {
  generateCombatId,
  createCombat,
  createParticipant,
  createStatusEffect,
  createCombatAction,
  createAttackResult
};
