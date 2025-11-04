const colors = require('../colors');
const { getXPForLevel, XP_TABLE } = require('./xpTable');
const { calculateStatGains, applyStatGains, getProficiencyBonus } = require('./statProgression');

/**
 * Award XP to a player
 * @param {Object} player
 * @param {number} xpAmount
 * @param {string} source - 'combat', 'quest', 'discovery'
 * @param {Object} playerDB
 */
function awardXP(player, xpAmount, source, playerDB) {
  player.xp += xpAmount;

  // Ensure XP never goes below 0
  player.xp = Math.max(0, player.xp);

  player.socket.write(colors.xpGain(`You gain ${xpAmount} XP! (${source})
`));

  // Check for level-up
  checkLevelUp(player, playerDB);

  // Persist
  playerDB.updatePlayerXP(player.username, player.xp);
}

/**
 * Check if player should level up and process if so
 * @param {Object} player
 * @param {Object} playerDB
 */
function checkLevelUp(player, playerDB) {
  const nextLevelXP = getXPForLevel(player.level + 1);

  if (player.xp >= nextLevelXP) {
    levelUp(player, playerDB);

    // Check again in case of multi-level gains
    checkLevelUp(player, playerDB);
  }
}

/**
 * Process a level-up
 * @param {Object} player
 * @param {Object} playerDB
 */
function levelUp(player, playerDB) {
  player.level++;

  // Update proficiency bonus based on new level
  player.proficiency = getProficiencyBonus(player.level);

  // Increase stats
  const statGains = calculateStatGains(player);
  applyStatGains(player, statGains);

  // Full heal on level-up
  player.hp = player.maxHp;

  // Notify player
  const levelUpMessage = `
${colors.levelUp('━'.repeat(60))}
${colors.levelUp('LEVEL UP!')} You are now level ${colors.highlight(player.level)}!

${colors.statGain(`Max HP: ${player.maxHp - statGains.hp} → ${player.maxHp} (+${statGains.hp})`)}
${formatStatGains(statGains)}

${colors.hint('You have been fully healed!')}
${colors.levelUp('━'.repeat(60))}
`;

  player.socket.write(levelUpMessage + '\n');

  // Persist
  playerDB.updatePlayerLevel(player.username, player.level, player.maxHp, player.hp);
}

/**
 * Calculate XP reward for defeating an NPC
 * @param {Object} npc
 * @param {number} playerLevel
 * @returns {number}
 */
function calculateCombatXP(npc, playerLevel) {
  const baseXP = npc.xpReward || (npc.level * 50);
  const levelDiff = npc.level - playerLevel;

  // Scale XP based on level difference
  // +20% per level above player, -20% per level below (min 10%)
  let multiplier = 1 + (levelDiff * 0.2);
  multiplier = Math.max(0.1, Math.min(2.0, multiplier));

  return Math.floor(baseXP * multiplier);
}

/**
 * Get XP needed for next level
 * @param {Object} player
 * @returns {number}
 */
function getXPToNextLevel(player) {
  const nextLevelXP = getXPForLevel(player.level + 1);
  return nextLevelXP - player.xp;
}

/**
 * Formats stat gains for the level-up message.
 * @param {object} statGains - The object containing stat gains.
 * @returns {string} - The formatted string.
 */
function formatStatGains(statGains) {
    let message = '';
    for (const stat in statGains) {
        if (stat !== 'hp' && statGains[stat] > 0) {
            message += `${colors.statGain(`${stat.charAt(0).toUpperCase() + stat.slice(1)}: +${statGains[stat]}`)}\n`;
        }
    }
    return message;
}

module.exports = {
  awardXP,
  checkLevelUp,
  levelUp,
  calculateCombatXP,
  getXPForLevel,
  getXPToNextLevel,
};
