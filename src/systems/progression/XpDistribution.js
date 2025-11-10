/**
 * XP Distribution System
 *
 * Handles XP award distribution after combat
 * Implements damage threshold and group XP sharing rules
 *
 * Architecture Reference: COMBAT_XP_ARCHITECTURE.md Section 3.2, 6.4
 */

const { getMobXpReward } = require('./XpSystem');

/**
 * Track damage dealt by each participant in combat
 * This should be called from combat resolution when damage is applied
 *
 * @param {Object} combat - Combat instance
 * @param {string} attackerId - Entity ID of attacker
 * @param {number} damageDealt - Damage amount
 */
function recordDamageDealt(combat, attackerId, damageDealt) {
  if (!combat.damageTracking) {
    combat.damageTracking = new Map();
  }

  const currentDamage = combat.damageTracking.get(attackerId) || 0;
  combat.damageTracking.set(attackerId, currentDamage + damageDealt);
}

/**
 * Get total damage dealt by a specific entity
 * @param {Object} combat - Combat instance
 * @param {string} entityId - Entity ID
 * @returns {number} Total damage dealt
 */
function getDamageDealt(combat, entityId) {
  if (!combat.damageTracking) {
    return 0;
  }

  return combat.damageTracking.get(entityId) || 0;
}

/**
 * Get total damage dealt by all participants
 * @param {Object} combat - Combat instance
 * @returns {number} Total damage
 */
function getTotalDamageDealt(combat) {
  if (!combat.damageTracking) {
    return 0;
  }

  let total = 0;
  for (const damage of combat.damageTracking.values()) {
    total += damage;
  }

  return total;
}

/**
 * Calculate XP distribution for a defeated NPC
 * Implements 10% damage threshold for XP eligibility
 *
 * @param {Object} combat - Combat instance
 * @param {Object} defeatedNpc - NPC instance that was defeated
 * @param {number} npcLevel - Level of defeated NPC
 * @param {Function} getEntityFn - Function to retrieve entity by ID
 * @returns {Array<Object>} XP awards: [{ entityId, entityType, xpAmount, playerLevel }]
 */
function calculateXpDistribution(combat, defeatedNpc, npcLevel, getEntityFn) {
  const awards = [];

  // Get all player participants
  const playerParticipants = combat.participants.filter(p => p.entityType === 'player');

  if (playerParticipants.length === 0) {
    // No players participated (shouldn't happen, but handle gracefully)
    return awards;
  }

  // Calculate total damage dealt to NPC
  const totalDamage = getTotalDamageDealt(combat);

  if (totalDamage === 0) {
    // No damage recorded (shouldn't happen)
    console.error('No damage recorded in combat, cannot distribute XP');
    return awards;
  }

  // Calculate 10% threshold
  const damageThreshold = totalDamage * 0.1;

  // Filter players who meet damage threshold
  const eligiblePlayers = playerParticipants.filter(p => {
    const damageDealt = getDamageDealt(combat, p.entityId);
    return damageDealt >= damageThreshold;
  });

  if (eligiblePlayers.length === 0) {
    // No one met threshold (very rare)
    console.warn('No players met 10% damage threshold for XP award');
    return awards;
  }

  // Calculate XP for each eligible player
  for (const participant of eligiblePlayers) {
    const player = getEntityFn(participant.entityId);

    if (!player) {
      console.error(`Player not found: ${participant.entityId}`);
      continue;
    }

    // Calculate scaled XP based on player level vs mob level
    const baseXp = getMobXpReward(npcLevel, player.level);

    // Split XP evenly among eligible participants
    const xpShare = Math.floor(baseXp / eligiblePlayers.length);

    awards.push({
      entityId: player.id,
      entityType: 'player',
      xpAmount: xpShare,
      playerLevel: player.level,
      // Use username for tracking, not display
      playerName: player.username || player.name
    });
  }

  return awards;
}

/**
 * Award XP to players and return results
 * This modifies player objects directly
 *
 * @param {Array<Object>} xpAwards - Awards from calculateXpDistribution
 * @param {Function} getEntityFn - Function to retrieve entity by ID
 * @returns {Array<Object>} Award results with level-up flags
 */
function awardXp(xpAwards, getEntityFn) {
  const results = [];

  for (const award of xpAwards) {
    const player = getEntityFn(award.entityId);

    if (!player) {
      console.error(`Cannot award XP: player ${award.entityId} not found`);
      continue;
    }

    // Store previous values
    const previousXp = player.currentXp;
    const previousLevel = player.level;

    // Award XP
    player.currentXp += award.xpAmount;

    results.push({
      playerId: player.id,
      // Use username for tracking, not display
      playerName: player.username || player.name,
      xpAwarded: award.xpAmount,
      previousXp,
      currentXp: player.currentXp,
      previousLevel,
      currentLevel: player.level, // Will be updated by level-up handler if needed
      readyToLevelUp: false // Will be set by caller after checking
    });
  }

  return results;
}

/**
 * Complete XP award flow for a defeated NPC
 * Calculates distribution and awards XP
 *
 * @param {Object} combat - Combat instance
 * @param {Object} defeatedNpc - NPC instance
 * @param {number} npcLevel - NPC level
 * @param {Function} getEntityFn - Function to get entity by ID
 * @returns {Object} Award summary
 */
function distributeNpcXp(combat, defeatedNpc, npcLevel, getEntityFn) {
  // Calculate distribution
  const xpAwards = calculateXpDistribution(combat, defeatedNpc, npcLevel, getEntityFn);

  if (xpAwards.length === 0) {
    return {
      awarded: false,
      reason: 'No eligible participants',
      results: []
    };
  }

  // Award XP
  const results = awardXp(xpAwards, getEntityFn);

  return {
    awarded: true,
    participantCount: xpAwards.length,
    totalXpAwarded: xpAwards.reduce((sum, award) => sum + award.xpAmount, 0),
    results
  };
}

/**
 * Format XP award message for player
 * @param {Object} awardResult - Result from awardXp
 * @returns {string} Formatted message
 */
function formatXpAwardMessage(awardResult) {
  const { xpAwarded, currentXp, previousXp } = awardResult;

  return `You gain ${xpAwarded} experience points. (${previousXp} -> ${currentXp})`;
}

/**
 * Initialize damage tracking for a new combat
 * Called when combat starts
 *
 * @param {Object} combat - Combat instance
 */
function initializeDamageTracking(combat) {
  combat.damageTracking = new Map();
}

/**
 * Clear damage tracking (cleanup)
 * @param {Object} combat - Combat instance
 */
function clearDamageTracking(combat) {
  if (combat.damageTracking) {
    combat.damageTracking.clear();
  }
}

/**
 * Get damage statistics for a combat
 * Useful for debugging and logs
 *
 * @param {Object} combat - Combat instance
 * @param {Function} getEntityFn - Function to get entity by ID
 * @returns {Array<Object>} Damage stats per entity
 */
function getDamageStatistics(combat, getEntityFn) {
  if (!combat.damageTracking) {
    return [];
  }

  const stats = [];
  const totalDamage = getTotalDamageDealt(combat);

  for (const [entityId, damage] of combat.damageTracking.entries()) {
    const entity = getEntityFn(entityId);
    const percentage = totalDamage > 0 ? ((damage / totalDamage) * 100).toFixed(1) : 0;

    stats.push({
      entityId,
      // This is for logging/debugging - use username for identity tracking
      entityName: entity ? (entity.username || entity.name) : 'Unknown',
      damageDealt: damage,
      percentageOfTotal: parseFloat(percentage)
    });
  }

  // Sort by damage dealt (highest first)
  stats.sort((a, b) => b.damageDealt - a.damageDealt);

  return stats;
}

module.exports = {
  // Damage tracking
  recordDamageDealt,
  getDamageDealt,
  getTotalDamageDealt,
  initializeDamageTracking,
  clearDamageTracking,

  // XP distribution
  calculateXpDistribution,
  awardXp,
  distributeNpcXp,

  // Utility
  formatXpAwardMessage,
  getDamageStatistics
};
