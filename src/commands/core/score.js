/**
 * Score command - Show character stats
 */

const colors = require('../../colors');

/**
 * Execute score command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments (unused)
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  try {
    const { getXPToNextLevel, getXPForLevel } = require('../../progression/xpSystem');

    // Calculate XP progress
    const currentLevelXP = getXPForLevel(player.level);
    const nextLevelXP = getXPForLevel(player.level + 1);
    const xpIntoLevel = player.xp - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    const xpProgress = Math.max(0, Math.min(1, xpIntoLevel / xpNeededForLevel));

    // Create XP progress bar (30 characters wide) - using ASCII-safe characters
    const barWidth = 30;
    const filledWidth = Math.floor(xpProgress * barWidth);
    const emptyWidth = barWidth - filledWidth;
    const progressBar = colors.xpGain('='.repeat(filledWidth)) + colors.dim('-'.repeat(emptyWidth));
    const percentComplete = Math.floor(xpProgress * 100);

    // Create HP bar (20 characters wide) - using ASCII-safe characters
    const hpBarWidth = 20;
    const hpProgress = Math.max(0, Math.min(1, player.hp / player.maxHp));
    const hpFilledWidth = Math.floor(hpProgress * hpBarWidth);
    const hpEmptyWidth = hpBarWidth - hpFilledWidth;
    const hpBar = colors.success('='.repeat(hpFilledWidth)) + colors.dim('-'.repeat(hpEmptyWidth));
    const hpPercent = Math.floor(hpProgress * 100);

    let output = [];
    output.push(colors.info('Character Information'));
    output.push(colors.line(23, '='));
    output.push(`${colors.highlight('Name:')} ${colors.playerName(player.username)}`);
    output.push(`${colors.highlight('Level:')} ${player.level}`);
    output.push('');

    // XP with progress bar
    output.push(`${colors.highlight('Experience:')}`);
    output.push(`  [${progressBar}] ${percentComplete}%`);
    output.push(`  ${colors.dim(`${xpIntoLevel} / ${xpNeededForLevel} XP (${getXPToNextLevel(player)} to next level)`)}`);
    output.push('');

    // HP with progress bar
    output.push(`${colors.highlight('Health:')}`);
    output.push(`  [${hpBar}] ${hpPercent}%`);
    output.push(`  ${colors.dim(`${player.hp} / ${player.maxHp} HP`)}`);
    output.push('');

    // Stats
    output.push(colors.highlight('Attributes:'));

    // Helper to format stat with equipment bonus
    const formatStat = (statName, value, bonuses) => {
      const bonus = bonuses?.[statName.toLowerCase()] || 0;
      if (bonus > 0) {
        return `${value} ${colors.success(`(+${bonus})`)}`;
      } else if (bonus < 0) {
        return `${value} ${colors.error(`(${bonus})`)}`;
      }
      return `${value}`;
    };

    const bonuses = player.equipmentBonuses || {};
    output.push(`  ${colors.dim('STR:')} ${formatStat('strength', player.str, bonuses)}  ${colors.dim('DEX:')} ${formatStat('dexterity', player.dex, bonuses)}  ${colors.dim('CON:')} ${formatStat('constitution', player.con, bonuses)}`);
    output.push(`  ${colors.dim('INT:')} ${formatStat('intelligence', player.int, bonuses)}  ${colors.dim('WIS:')} ${formatStat('wisdom', player.wis, bonuses)}  ${colors.dim('CHA:')} ${formatStat('charisma', player.cha, bonuses)}`);

    // Show ghost status prominently if applicable
    if (player.isGhost) {
      output.push('');
      output.push(`${colors.highlight('Status:')} ${colors.error('GHOST')}`);
      output.push(colors.hint('  You are currently a ghost and cannot attack.'));
    }

    // Inventory
    output.push('');
    if (player.inventory && player.inventory.length > 0) {
      output.push(`${colors.highlight('Carrying:')} ${player.inventory.length} item(s)`);
    } else {
      output.push(`${colors.highlight('Carrying:')} nothing`);
    }

    player.send('\n' + output.join('\n') + '\n');
  } catch (error) {
    player.send('\n' + colors.error(`Error in score command: ${error.message}\n`));
  }
}

module.exports = {
  name: 'score',
  aliases: [],
  execute,
  help: {
    description: 'Show your character stats and progress',
    usage: 'score',
    examples: ['score']
  }
};
