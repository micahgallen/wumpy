/**
 * Level-Up Handler
 *
 * Manages character level progression and bonuses
 * Implements standard level-up mechanics and guild hooks
 *
 * Architecture Reference: COMBAT_XP_ARCHITECTURE.md Section 3.3-3.4
 */

const { shouldLevelUp, getXpForLevel, getCumulativeXpForLevel } = require('./XpSystem');
const { calculateProficiency } = require('../../utils/modifiers');

/**
 * Check if a player should level up and process it
 * Can level up multiple times if enough XP
 *
 * @param {Object} player - Player entity
 * @param {Object} options - Options for level-up processing
 * @returns {Object} Level-up results
 */
function checkAndApplyLevelUp(player, options = {}) {
  const {
    guildHook = null,        // Guild level-up hook (optional)
    messageFn = null,        // Function to send messages to player
    broadcastFn = null,      // Function to broadcast to room
    playerDB = null          // PlayerDB instance for persistence
  } = options;

  const results = {
    leveledUp: false,
    levelsGained: 0,
    startLevel: player.level,
    endLevel: player.level,
    statChoicesNeeded: [],
    guildBonusesApplied: [],
    messages: []
  };

  // Check if player can level up
  while (shouldLevelUp(player.level, player.currentXp)) {
    const oldLevel = player.level;

    // Apply level-up
    const levelUpResult = applyLevelUp(player, guildHook);

    results.leveledUp = true;
    results.levelsGained++;
    results.endLevel = player.level;

    // Collect stat choices needed
    if (levelUpResult.needsStatChoice) {
      results.statChoicesNeeded.push({
        level: player.level,
        autoAssigned: levelUpResult.statAutoAssigned
      });
    }

    // Collect guild bonuses
    if (levelUpResult.guildBonuses) {
      results.guildBonusesApplied.push(...levelUpResult.guildBonuses);
    }

    // Generate messages
    const levelUpMsg = `You have reached level ${player.level}!`;
    results.messages.push(levelUpMsg);

    if (messageFn) {
      messageFn(player.id, levelUpMsg);
    }

    // Broadcast to room
    if (broadcastFn) {
      // Use capname for players, name for NPCs
      const displayName = player.getDisplayName ? player.getDisplayName() : (player.name || player.username);
      const broadcastMsg = `${displayName} glows briefly as they gain a level!`;
      broadcastFn(player.currentRoom, broadcastMsg, [player.id]);
    }

    // Safety check: prevent infinite loop
    if (results.levelsGained >= 10) {
      console.error(`Player ${player.id} leveled up ${results.levelsGained} times - stopping to prevent infinite loop`);
      break;
    }
  }

  // CRITICAL FIX: Save player state after all level-ups complete
  if (results.leveledUp && playerDB && typeof playerDB.savePlayer === 'function') {
    playerDB.savePlayer(player);
  }

  return results;
}

/**
 * Apply a single level-up to a player
 * Called internally by checkAndApplyLevelUp
 *
 * @param {Object} player - Player entity
 * @param {Object} guildHook - Optional guild hook
 * @returns {Object} Level-up details
 */
function applyLevelUp(player, guildHook = null) {
  const result = {
    oldLevel: player.level,
    newLevel: player.level + 1,
    needsStatChoice: false,
    statAutoAssigned: false,
    guildBonuses: []
  };

  // 1. Increment level
  player.level++;

  // 2. Increase Max HP based on CON modifier (D&D 5e: Hit Die avg + CON mod per level)
  // Note: EquipmentManager.recalculatePlayerStats() will be called after to ensure
  // retroactive HP calculation if CON changes from equipment bonuses
  const conModifier = Math.floor((player.con - 10) / 2);
  const hpGain = 5 + conModifier;  // 5 (hit die average) + CON modifier
  player.maxHp += hpGain;

  // Store HP gain for logging
  result.hpGain = hpGain;

  // 3. Full heal
  player.currentHp = player.maxHp;

  // 4. Update proficiency bonus
  player.proficiency = calculateProficiency(player.level);

  // 5. Recalculate all equipment-dependent stats after proficiency changes
  // This ensures AC, HP (retroactive CON calc), and attack bonuses are current
  const EquipmentManager = require('../equipment/EquipmentManager');
  EquipmentManager.recalculatePlayerStats(player);

  // 6. Check for stat choice (every 4th level)
  if (player.level % 4 === 0) {
    result.needsStatChoice = true;

    // Check if guild overrides stat choice
    if (guildHook && typeof guildHook.handleStatChoice === 'function') {
      const handled = guildHook.handleStatChoice(player);

      if (handled) {
        result.statAutoAssigned = true;
        result.needsStatChoice = false;
      }
    }
  }

  // 7. Apply guild-specific bonuses
  if (guildHook && typeof guildHook.applyLevelUpBonuses === 'function') {
    const bonuses = guildHook.applyLevelUpBonuses(player);
    if (bonuses && bonuses.length > 0) {
      result.guildBonuses = bonuses;
    }
  }

  // 8. Grant guild abilities at specific levels
  if (guildHook && typeof guildHook.grantAbilities === 'function') {
    guildHook.grantAbilities(player);
  }

  // 9. CRITICAL FIX: Save player state to database after level-up
  // This ensures level, HP, stats, and proficiency changes persist
  // Note: playerDB must be passed via options or available in scope
  // For now, we'll handle this in the calling code (admin commands, XP handlers)
  // See checkAndApplyLevelUp for playerDB integration

  return result;
}

/**
 * Apply a stat increase to a player
 * Called when player chooses which stat to increase (every 4th level)
 *
 * @param {Object} player - Player entity
 * @param {string} statName - Stat to increase (str, dex, con, int, wis, cha)
 * @returns {Object} Result with validation
 */
function applyStatIncrease(player, statName) {
  const validStats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  if (!validStats.includes(statName)) {
    return {
      success: false,
      error: `Invalid stat: ${statName}. Must be one of: ${validStats.join(', ')}`
    };
  }

  // Map short names to baseStats properties
  const statMap = {
    str: 'strength',
    dex: 'dexterity',
    con: 'constitution',
    int: 'intelligence',
    wis: 'wisdom',
    cha: 'charisma'
  };

  const fullStatName = statMap[statName];
  if (!fullStatName) {
    return {
      success: false,
      error: `Invalid stat name: ${statName}`
    };
  }

  // Initialize baseStats if not present (backward compatibility)
  if (!player.baseStats) {
    const EquipmentManager = require('../equipment/EquipmentManager');
    EquipmentManager.recalculatePlayerStats(player);
  }

  const oldBaseValue = player.baseStats[fullStatName];
  const oldEffectiveValue = player[statName];

  // Increase the BASE stat (not the effective stat)
  player.baseStats[fullStatName]++;

  // Recalculate ALL stats (including equipment bonuses, AC, HP)
  const EquipmentManager = require('../equipment/EquipmentManager');
  EquipmentManager.recalculatePlayerStats(player);

  const newBaseValue = player.baseStats[fullStatName];
  const newEffectiveValue = player[statName];

  return {
    success: true,
    statName: fullStatName,
    shortName: statName,
    oldBaseValue,
    newBaseValue,
    oldEffectiveValue,
    newEffectiveValue,
    equipmentBonus: newEffectiveValue - newBaseValue,
    message: `${statName.toUpperCase()} increased: ${oldBaseValue} -> ${newBaseValue} (${newEffectiveValue} with equipment)`
  };
}

/**
 * Get level-up summary for display
 * Shows what happened during level-up
 *
 * @param {Object} levelUpResult - Result from checkAndApplyLevelUp
 * @returns {string} Formatted summary
 */
function formatLevelUpSummary(levelUpResult) {
  if (!levelUpResult.leveledUp) {
    return 'No level-up occurred.';
  }

  const lines = [];

  lines.push(`\n${'='.repeat(50)}`);
  lines.push(`LEVEL UP! ${levelUpResult.startLevel} -> ${levelUpResult.endLevel}`);
  lines.push('='.repeat(50));

  if (levelUpResult.levelsGained > 1) {
    lines.push(`Gained ${levelUpResult.levelsGained} levels!`);
  }

  lines.push('Bonuses gained:');
  lines.push(`  - Max HP increased by ${levelUpResult.levelsGained * 5}`);
  lines.push('  - Fully healed');

  if (levelUpResult.statChoicesNeeded.length > 0) {
    for (const choice of levelUpResult.statChoicesNeeded) {
      if (choice.autoAssigned) {
        lines.push(`  - Stat automatically increased (guild bonus) at level ${choice.level}`);
      } else {
        lines.push(`  - You may choose +1 to any stat at level ${choice.level}`);
      }
    }
  }

  if (levelUpResult.guildBonusesApplied.length > 0) {
    lines.push('Guild bonuses:');
    for (const bonus of levelUpResult.guildBonusesApplied) {
      lines.push(`  - ${bonus}`);
    }
  }

  lines.push('='.repeat(50) + '\n');

  return lines.join('\n');
}

/**
 * Calculate HP gained from leveling up multiple levels
 * @param {number} startLevel - Starting level
 * @param {number} endLevel - Ending level
 * @returns {number} Total HP gained
 */
function calculateHpGained(startLevel, endLevel) {
  const levelsGained = endLevel - startLevel;
  return levelsGained * 5;
}

/**
 * Preview next level bonuses
 * Shows player what they'll get at next level
 *
 * @param {Object} player - Player entity
 * @returns {Object} Next level preview
 */
function previewNextLevel(player) {
  const nextLevel = player.level + 1;
  const xpNeeded = getCumulativeXpForLevel(nextLevel) - player.currentXp;

  const preview = {
    nextLevel,
    xpNeeded,
    bonuses: {
      maxHp: player.maxHp + 5,
      hpGain: 5,
      proficiency: calculateProficiency(nextLevel)
    }
  };

  // Check if stat choice at next level
  if (nextLevel % 4 === 0) {
    preview.bonuses.statChoice = true;
  }

  return preview;
}

/**
 * Validate level-up eligibility
 * @param {Object} player - Player entity
 * @returns {Object} Validation result
 */
function validateLevelUpEligibility(player) {
  if (!player.level || !player.currentXp) {
    return {
      eligible: false,
      reason: 'Player missing level or XP data'
    };
  }

  const xpRequired = getCumulativeXpForLevel(player.level + 1);

  if (player.currentXp < xpRequired) {
    return {
      eligible: false,
      reason: 'Not enough XP',
      currentXp: player.currentXp,
      xpRequired,
      xpNeeded: xpRequired - player.currentXp
    };
  }

  return {
    eligible: true,
    currentXp: player.currentXp,
    xpRequired
  };
}

module.exports = {
  // Main functions
  checkAndApplyLevelUp,
  applyLevelUp,
  applyStatIncrease,

  // Utility
  formatLevelUpSummary,
  calculateHpGained,
  previewNextLevel,
  validateLevelUpEligibility
};
