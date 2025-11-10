/**
 * Attunement Manager
 *
 * Manages item attunement for players.
 * Enforces attunement slot limits and tracks attuned items per player.
 *
 * Design:
 * - Each player has a maximum number of attunement slots (default 3)
 * - Items requiring attunement cannot provide bonuses unless attuned
 * - Attunement breaks when item is unequipped or traded
 * - Future: Rest requirement for attunement
 */

const config = require('../../config/itemsConfig');
const logger = require('../../logger');

/**
 * Attunement storage
 * Map<playerId, Set<itemInstanceId>>
 */
const playerAttunements = new Map();

/**
 * Get maximum attunement slots for a player
 * @param {Object} player - Player object
 * @returns {number} Maximum attunement slots
 */
function getMaxAttunementSlots(player) {
  // Future: Could be modified by player level, class, or items
  return config.attunement.maxSlots;
}

/**
 * Get current attunement slots used by a player
 * @param {string} playerId - Player ID
 * @returns {number} Number of attunement slots used
 */
function getAttunementSlotsUsed(playerId) {
  const attunements = playerAttunements.get(playerId);
  return attunements ? attunements.size : 0;
}

/**
 * Get remaining attunement slots for a player
 * @param {Object} player - Player object
 * @returns {number} Number of available attunement slots
 */
function getAvailableAttunementSlots(player) {
  const maxSlots = getMaxAttunementSlots(player);
  const usedSlots = getAttunementSlotsUsed(player.username);
  return maxSlots - usedSlots;
}

/**
 * Check if player can attune to an item
 * @param {Object} player - Player object
 * @param {Object} item - Item instance
 * @returns {Object} { canAttune: boolean, reason: string|null }
 */
function canAttuneToItem(player, item) {
  // Check if item requires attunement
  if (!item.requiresAttunement) {
    return {
      canAttune: false,
      reason: 'This item does not require attunement.'
    };
  }

  // Check if already attuned to this item
  if (item.isAttuned && item.attunedTo === player.username) {
    return {
      canAttune: false,
      reason: 'You are already attuned to this item.'
    };
  }

  // Check if already attuned to someone else
  if (item.isAttuned && item.attunedTo !== player.username) {
    return {
      canAttune: false,
      reason: 'This item is attuned to someone else.'
    };
  }

  // Check available slots
  const availableSlots = getAvailableAttunementSlots(player);
  if (availableSlots <= 0) {
    return {
      canAttune: false,
      reason: `You have no available attunement slots. (${getMaxAttunementSlots(player)} maximum)`
    };
  }

  // Check level requirement
  if (item.requiredLevel && player.level < item.requiredLevel) {
    return {
      canAttune: false,
      reason: `You must be level ${item.requiredLevel} to attune to this item.`
    };
  }

  // Check class requirement
  if (item.requiredClass && !item.requiredClass.includes(player.class)) {
    return {
      canAttune: false,
      reason: `Only ${item.requiredClass.join(', ')} can attune to this item.`
    };
  }

  return { canAttune: true, reason: null };
}

/**
 * Attune a player to an item
 * @param {Object} player - Player object
 * @param {Object} item - Item instance
 * @returns {Object} { success: boolean, message: string }
 */
function attuneToItem(player, item) {
  // Validate attunement
  const validation = canAttuneToItem(player, item);
  if (!validation.canAttune) {
    return {
      success: false,
      message: validation.reason
    };
  }

  // Initialize player attunements if needed
  if (!playerAttunements.has(player.username)) {
    playerAttunements.set(player.username, new Set());
  }

  // Add to attunement tracking
  playerAttunements.get(player.username).add(item.instanceId);

  // Update item state
  const attuneSuccess = item.onAttune(player);

  if (!attuneSuccess) {
    // Rollback if item rejected attunement
    playerAttunements.get(player.username).delete(item.instanceId);
    return {
      success: false,
      message: 'Failed to attune to item.'
    };
  }

  // TODO(capname): Use player.getDisplayName() in logs when available
  logger.log(`Player ${player.username} attuned to item ${item.name} (${item.instanceId})`);

  return {
    success: true,
    message: `You have attuned to ${item.getDisplayName()}.`
  };
}

/**
 * Break attunement between player and item
 * @param {Object} player - Player object
 * @param {Object} item - Item instance
 * @returns {Object} { success: boolean, message: string }
 */
function breakAttunement(player, item) {
  // Check if player has attunement to this item
  const playerAttuned = playerAttunements.get(player.username);
  if (!playerAttuned || !playerAttuned.has(item.instanceId)) {
    return {
      success: false,
      message: 'You are not attuned to this item.'
    };
  }

  // Remove from tracking
  playerAttuned.delete(item.instanceId);
  if (playerAttuned.size === 0) {
    playerAttunements.delete(player.username);
  }

  // Update item state
  item.onUnattune(player);

  // TODO(capname): Use player.getDisplayName() in logs when available
  logger.log(`Player ${player.username} broke attunement with item ${item.name} (${item.instanceId})`);

  return {
    success: true,
    message: `You have broken attunement with ${item.getDisplayName()}.`
  };
}

/**
 * Get all items a player is attuned to
 * @param {string} playerId - Player ID
 * @returns {Set<string>} Set of item instance IDs
 */
function getAttunedItems(playerId) {
  return playerAttunements.get(playerId) || new Set();
}

/**
 * Check if player is attuned to a specific item
 * @param {string} playerId - Player ID
 * @param {string} itemInstanceId - Item instance ID
 * @returns {boolean} True if attuned
 */
function isAttunedTo(playerId, itemInstanceId) {
  const attunements = playerAttunements.get(playerId);
  return attunements ? attunements.has(itemInstanceId) : false;
}

/**
 * Get attunement status for a player
 * @param {Object} player - Player object
 * @returns {Object} Attunement status
 */
function getAttunementStatus(player) {
  const maxSlots = getMaxAttunementSlots(player);
  const usedSlots = getAttunementSlotsUsed(player.username);
  const availableSlots = maxSlots - usedSlots;
  const attunedItemIds = Array.from(getAttunedItems(player.username));

  return {
    maxSlots,
    usedSlots,
    availableSlots,
    attunedItemIds
  };
}

/**
 * Clear all attunements for a player
 * Used when player logs out or dies (depending on rules)
 * @param {string} playerId - Player ID
 */
function clearPlayerAttunements(playerId) {
  playerAttunements.delete(playerId);
  logger.log(`Cleared all attunements for player ${playerId}`);
}

/**
 * Handle player death - optionally break attunements
 * @param {Object} player - Player object
 * @param {Array<Object>} items - Array of item instances to check
 */
function handlePlayerDeath(player, items) {
  // Current design: Attunement persists through death
  // Future: Could break attunement on death based on config
  // TODO(capname): Use player.getDisplayName() in logs when available
  logger.log(`Player ${player.username} died - attunements preserved`);
}

/**
 * Handle item trade - automatically break attunement
 * @param {Object} item - Item being traded
 * @param {Object} oldOwner - Previous owner
 */
function handleItemTrade(item, oldOwner) {
  if (item.isAttuned && item.attunedTo === oldOwner.username) {
    breakAttunement(oldOwner, item);
    // TODO(capname): Use player.getDisplayName() in logs when available
    logger.log(`Item ${item.name} trade broke attunement with ${oldOwner.username}`);
  }
}

/**
 * Get statistics about attunements
 * @returns {Object} Statistics
 */
function getStats() {
  let totalPlayers = playerAttunements.size;
  let totalAttunements = 0;

  for (const attunements of playerAttunements.values()) {
    totalAttunements += attunements.size;
  }

  return {
    totalPlayers,
    totalAttunements,
    averageAttunements: totalPlayers > 0 ? (totalAttunements / totalPlayers).toFixed(2) : 0
  };
}

/**
 * Clear all attunements (for testing)
 */
function clearAllAttunements() {
  playerAttunements.clear();
  logger.log('Cleared all attunements');
}

module.exports = {
  getMaxAttunementSlots,
  getAttunementSlotsUsed,
  getAvailableAttunementSlots,
  canAttuneToItem,
  attuneToItem,
  breakAttunement,
  getAttunedItems,
  isAttunedTo,
  getAttunementStatus,
  clearPlayerAttunements,
  handlePlayerDeath,
  handleItemTrade,
  getStats,
  clearAllAttunements
};
