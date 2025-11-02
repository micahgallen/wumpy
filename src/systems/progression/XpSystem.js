/**
 * XP System
 *
 * Formula-based progression system for character leveling
 * Implements D&D-inspired XP curves with level scaling
 *
 * Architecture Reference: COMBAT_XP_ARCHITECTURE.md Section 3.1-3.2
 */

/**
 * Calculate XP required to reach a specific level
 * Formula: XP(level) = round(800 * level^1.6)
 *
 * This creates a smooth exponential curve where:
 * - Early levels are quick (L1→L2 = 800 XP)
 * - Mid levels moderate (L5→L6 = 8,871 XP)
 * - High levels are long (L49→L50 = 254,175 XP)
 *
 * @param {number} level - Target level (1-50+)
 * @returns {number} XP required to reach that level from previous level
 */
function getXpForLevel(level) {
  if (level < 1) {
    console.error(`Invalid level: ${level}. Must be >= 1.`);
    return 0;
  }

  // Core formula: 800 * level^1.6
  const xp = 800 * Math.pow(level, 1.6);

  // Round to nearest integer (ensures deterministic values)
  return Math.round(xp);
}

/**
 * Calculate total cumulative XP required to reach a level
 * @param {number} level - Target level
 * @returns {number} Total XP from level 1 to target level
 */
function getCumulativeXpForLevel(level) {
  if (level < 1) return 0;

  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += getXpForLevel(i);
  }

  return total;
}

/**
 * Calculate XP reward for killing a mob
 * Base reward: 0.12 * XP(mob_level)
 * Scaled by level difference between mob and player
 *
 * Scaling rules:
 * - Mob 5+ levels higher: +50% (1.5x)
 * - Mob 2-4 levels higher: +20% (1.2x)
 * - Even level: 100% (1.0x)
 * - Mob 2-4 levels lower: -40% (0.6x)
 * - Mob 5+ levels lower: -70% (0.3x)
 *
 * @param {number} mobLevel - Mob's level
 * @param {number} playerLevel - Player's level
 * @returns {number} XP reward for this kill
 */
function getMobXpReward(mobLevel, playerLevel) {
  if (mobLevel < 1 || playerLevel < 1) {
    console.error(`Invalid levels: mob=${mobLevel}, player=${playerLevel}`);
    return 0;
  }

  // Base XP: 12% of what's needed to reach the mob's level
  const baseXp = 0.12 * getXpForLevel(mobLevel);

  // Calculate level difference
  const levelDiff = mobLevel - playerLevel;

  // Determine multiplier based on level difference
  let multiplier = 1.0;

  if (levelDiff >= 5) {
    // Much higher level: challenging, bonus XP
    multiplier = 1.5;
  } else if (levelDiff >= 2) {
    // Higher level: somewhat challenging, slight bonus
    multiplier = 1.2;
  } else if (levelDiff <= -5) {
    // Much lower level: trivial, minimal XP
    multiplier = 0.3;
  } else if (levelDiff <= -2) {
    // Lower level: easy, reduced XP
    multiplier = 0.6;
  }
  // levelDiff -1, 0, +1: multiplier stays 1.0

  // Round final XP to integer
  return Math.round(baseXp * multiplier);
}

/**
 * Calculate XP loss on death
 * Loss percentage varies by level:
 * - L1-10: 5% of XP into current level
 * - L11-30: 3% of XP into current level
 * - L31+: 2% of XP into current level
 *
 * Never drops below current level start XP
 *
 * @param {number} currentLevel - Player's current level
 * @param {number} currentXp - Player's current total XP
 * @returns {number} XP to subtract (always >= 0)
 */
function calculateXpLoss(currentLevel, currentXp) {
  if (currentLevel < 1 || currentXp < 0) {
    console.error(`Invalid XP loss params: level=${currentLevel}, xp=${currentXp}`);
    return 0;
  }

  // Calculate XP at start of current level
  const currentLevelXp = getCumulativeXpForLevel(currentLevel);

  // Calculate how much XP player has earned into current level
  const xpIntoLevel = currentXp - currentLevelXp;

  if (xpIntoLevel <= 0) {
    // Already at level start, no loss
    return 0;
  }

  // Determine loss percentage based on level
  let lossPercent;
  if (currentLevel <= 10) {
    lossPercent = 0.05; // 5%
  } else if (currentLevel <= 30) {
    lossPercent = 0.03; // 3%
  } else {
    lossPercent = 0.02; // 2%
  }

  // Calculate loss (floor to integer)
  const loss = Math.floor(xpIntoLevel * lossPercent);

  return loss;
}

/**
 * Check if player should level up
 * @param {number} currentLevel - Player's current level
 * @param {number} currentXp - Player's total XP
 * @returns {boolean} True if player has enough XP to level up
 */
function shouldLevelUp(currentLevel, currentXp) {
  const xpRequiredForNextLevel = getCumulativeXpForLevel(currentLevel + 1);
  return currentXp >= xpRequiredForNextLevel;
}

/**
 * Get player's current level based on total XP
 * Useful for recalculating level after XP changes
 *
 * @param {number} totalXp - Player's total cumulative XP
 * @returns {number} Current level (minimum 1)
 */
function getLevelFromXp(totalXp) {
  if (totalXp < 0) return 1;

  let level = 1;
  let cumulativeXp = 0;

  // Find highest level player has reached
  while (true) {
    const xpForNextLevel = getXpForLevel(level + 1);
    if (cumulativeXp + xpForNextLevel > totalXp) {
      break;
    }
    cumulativeXp += xpForNextLevel;
    level++;
  }

  return level;
}

/**
 * Get XP progress information for a player
 * @param {number} currentLevel - Player's level
 * @param {number} currentXp - Player's total XP
 * @returns {Object} XP progress details
 */
function getXpProgress(currentLevel, currentXp) {
  const levelStartXp = getCumulativeXpForLevel(currentLevel);
  const nextLevelXp = getCumulativeXpForLevel(currentLevel + 1);
  const xpIntoLevel = currentXp - levelStartXp;
  const xpNeededForNextLevel = nextLevelXp - currentXp;
  const xpRequiredForLevel = getXpForLevel(currentLevel + 1);

  const progressPercent = (xpIntoLevel / xpRequiredForLevel) * 100;

  return {
    currentLevel,
    currentXp,
    xpIntoLevel,
    xpNeededForNextLevel,
    xpRequiredForLevel,
    progressPercent: Math.floor(progressPercent),
    levelStartXp,
    nextLevelXp
  };
}

/**
 * Calculate estimated time to level based on mob kills
 * @param {number} currentLevel - Player's current level
 * @param {number} currentXp - Player's current total XP
 * @param {number} averageMobLevel - Average level of mobs being fought
 * @param {number} killsPerMinute - Estimated kill rate
 * @returns {Object} Time estimate
 */
function estimateTimeToLevel(currentLevel, currentXp, averageMobLevel, killsPerMinute = 1) {
  const xpNeeded = getCumulativeXpForLevel(currentLevel + 1) - currentXp;
  const xpPerKill = getMobXpReward(averageMobLevel, currentLevel);

  if (xpPerKill <= 0 || killsPerMinute <= 0) {
    return {
      xpNeeded,
      xpPerKill,
      killsNeeded: 0,
      minutesEstimate: Infinity
    };
  }

  const killsNeeded = Math.ceil(xpNeeded / xpPerKill);
  const minutesEstimate = killsNeeded / killsPerMinute;

  return {
    xpNeeded,
    xpPerKill,
    killsNeeded,
    minutesEstimate: Math.round(minutesEstimate)
  };
}

module.exports = {
  // Core formula
  getXpForLevel,
  getCumulativeXpForLevel,

  // XP rewards
  getMobXpReward,

  // XP loss
  calculateXpLoss,

  // Level checks
  shouldLevelUp,
  getLevelFromXp,

  // Utility
  getXpProgress,
  estimateTimeToLevel
};
