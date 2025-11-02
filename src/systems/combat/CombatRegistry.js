/**
 * Combat Registry - Singleton Pattern
 *
 * Centralized combat state management to prevent desyncs
 * Maintains all active combats and entity-to-combat mappings
 * Phase 2: Integrated damage tracking for XP distribution
 */

const { createCombat, createParticipant } = require('../../data/Combat');
const { initializeDamageTracking, clearDamageTracking } = require('../progression/XpDistribution');

/**
 * Combat Registry Singleton
 * Manages all active combat instances and provides lookup functions
 */
class CombatRegistry {
  constructor() {
    if (CombatRegistry.instance) {
      return CombatRegistry.instance;
    }

    // Store all active combats by combat ID
    this.combats = new Map();

    // Map entity IDs to combat IDs for quick lookup
    this.entityToCombat = new Map();

    CombatRegistry.instance = this;
  }

  /**
   * Initiate combat between two entities
   * @param {Object} attacker - Attacking entity
   * @param {Object} defender - Defending entity
   * @param {string} attackerType - 'player' or 'npc'
   * @param {string} defenderType - 'player' or 'npc'
   * @returns {Object} Created combat instance
   */
  initiateCombat(attacker, defender, attackerType, defenderType) {
    // Check if either entity is already in combat
    if (this.isInCombat(attacker.id)) {
      // Add defender to existing combat
      const existingCombat = this.getCombatForEntity(attacker.id);
      this.addParticipant(existingCombat.id, defender, defenderType);
      return existingCombat;
    }

    if (this.isInCombat(defender.id)) {
      // Add attacker to existing combat
      const existingCombat = this.getCombatForEntity(defender.id);
      this.addParticipant(existingCombat.id, attacker, attackerType);
      return existingCombat;
    }

    // Create new combat
    const participants = [
      createParticipant(attacker, attackerType),
      createParticipant(defender, defenderType)
    ];

    const combat = createCombat(participants);

    // Phase 2: Initialize damage tracking for XP distribution
    initializeDamageTracking(combat);

    // Register combat
    this.combats.set(combat.id, combat);
    this.entityToCombat.set(attacker.id, combat.id);
    this.entityToCombat.set(defender.id, combat.id);

    console.log(`Combat initiated: ${combat.id} (${attacker.id} vs ${defender.id})`);

    return combat;
  }

  /**
   * Add a participant to an existing combat
   * @param {string} combatId - Combat ID
   * @param {Object} entity - Entity to add
   * @param {string} entityType - 'player' or 'npc'
   */
  addParticipant(combatId, entity, entityType) {
    const combat = this.combats.get(combatId);
    if (!combat) {
      console.error(`Cannot add participant: Combat ${combatId} not found`);
      return;
    }

    // Check if entity is already in this combat
    const existing = combat.participants.find(p => p.entityId === entity.id);
    if (existing) {
      console.warn(`Entity ${entity.id} already in combat ${combatId}`);
      return;
    }

    const participant = createParticipant(entity, entityType);
    combat.participants.push(participant);
    this.entityToCombat.set(entity.id, combatId);

    console.log(`Added ${entity.id} to combat ${combatId}`);
  }

  /**
   * Remove a participant from combat
   * @param {string} combatId - Combat ID
   * @param {string} entityId - Entity ID to remove
   */
  removeParticipant(combatId, entityId) {
    const combat = this.combats.get(combatId);
    if (!combat) {
      console.error(`Cannot remove participant: Combat ${combatId} not found`);
      return;
    }

    combat.participants = combat.participants.filter(p => p.entityId !== entityId);
    this.entityToCombat.delete(entityId);

    console.log(`Removed ${entityId} from combat ${combatId}`);

    // If only one or zero participants remain, end combat
    if (combat.participants.length <= 1) {
      this.endCombat(combatId);
    }
  }

  /**
   * End a combat instance
   * Phase 2: Now clears damage tracking data
   *
   * @param {string} combatId - Combat ID to end
   */
  endCombat(combatId) {
    const combat = this.combats.get(combatId);
    if (!combat) {
      console.error(`Cannot end combat: Combat ${combatId} not found`);
      return;
    }

    combat.isActive = false;

    // Phase 2: Clear damage tracking
    clearDamageTracking(combat);

    // Remove all entity mappings
    for (const participant of combat.participants) {
      this.entityToCombat.delete(participant.entityId);
    }

    // Remove combat from registry
    this.combats.delete(combatId);

    console.log(`Combat ended: ${combatId}`);
  }

  /**
   * Get combat instance by ID
   * @param {string} combatId - Combat ID
   * @returns {Object|null} Combat instance or null
   */
  getCombat(combatId) {
    return this.combats.get(combatId) || null;
  }

  /**
   * Get combat instance for a specific entity
   * @param {string} entityId - Entity ID
   * @returns {Object|null} Combat instance or null
   */
  getCombatForEntity(entityId) {
    const combatId = this.entityToCombat.get(entityId);
    if (!combatId) {
      return null;
    }
    return this.combats.get(combatId) || null;
  }

  /**
   * Check if an entity is in combat
   * @param {string} entityId - Entity ID
   * @returns {boolean} True if in combat
   */
  isInCombat(entityId) {
    return this.entityToCombat.has(entityId);
  }

  /**
   * Get participant object from combat
   * @param {string} combatId - Combat ID
   * @param {string} entityId - Entity ID
   * @returns {Object|null} Participant object or null
   */
  getParticipant(combatId, entityId) {
    const combat = this.combats.get(combatId);
    if (!combat) {
      return null;
    }

    return combat.participants.find(p => p.entityId === entityId) || null;
  }

  /**
   * Get all active combats
   * @returns {Array<Object>} Array of combat instances
   */
  getAllCombats() {
    return Array.from(this.combats.values());
  }

  /**
   * Clear all combats (for server restart/crash recovery)
   */
  clearAll() {
    console.log(`Clearing ${this.combats.size} active combats`);
    this.combats.clear();
    this.entityToCombat.clear();
  }

  /**
   * Get combat statistics (for debugging/monitoring)
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      activeCombats: this.combats.size,
      entitiesInCombat: this.entityToCombat.size,
      combats: Array.from(this.combats.values()).map(c => ({
        id: c.id,
        participantCount: c.participants.length,
        currentTurn: c.currentTurn,
        duration: Date.now() - c.startedAt
      }))
    };
  }
}

// Export singleton instance
const instance = new CombatRegistry();
Object.freeze(instance);

module.exports = instance;
