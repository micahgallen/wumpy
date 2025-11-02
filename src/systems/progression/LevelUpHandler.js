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
    broadcastFn = null       // Function to broadcast to room
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
      const broadcastMsg = `${player.username || player.name} glows briefly as they gain a level!`;
      broadcastFn(player.currentRoom, broadcastMsg, [player.id]);
    }

    // Safety check: prevent infinite loop
    if (results.levelsGained >= 10) {
      console.error(`Player ${player.id} leveled up ${results.levelsGained} times - stopping to prevent infinite loop`);
      break;
    }
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

  // 2. Increase Max HP by 5
  player.maxHp += 5;

  // 3. Full heal
  player.currentHp = player.maxHp;

  // 4. Update proficiency bonus
  player.proficiency = calculateProficiency(player.level);

  // 5. Check for stat choice (every 4th level)
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

  // 6. Apply guild-specific bonuses
  if (guildHook && typeof guildHook.applyLevelUpBonuses === 'function') {
    const bonuses = guildHook.applyLevelUpBonuses(player);
    if (bonuses && bonuses.length > 0) {
      result.guildBonuses = bonuses;
    }
  }

  // 7. Grant guild abilities at specific levels
  if (guildHook && typeof guildHook.grantAbilities === 'function') {
    guildHook.grantAbilities(player);
  }

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

  const oldValue = player[statName];
  player[statName]++;

  // Recalculate AC if DEX was increased
  if (statName === 'dex') {
    const { calculateArmorClass, getModifier } = require('../../utils/modifiers');
    const armorBonus = player.equippedArmor ? player.equippedArmor.armorBonus : 0;
    player.armorClass = calculateArmorClass(player.dex, armorBonus);
  }

  return {
    success: true,
    statName,
    oldValue,
    newValue: player[statName],
    message: `${statName.toUpperCase()} increased: ${oldValue} -> ${player[statName]}`
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
