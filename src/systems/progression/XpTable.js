/**
 * XP Table Generation
 *
 * Generates reference tables for XP progression
 * Called at server startup to display progression information
 *
 * Architecture Reference: COMBAT_XP_ARCHITECTURE.md Section 3.5
 */

const { getXpForLevel, getCumulativeXpForLevel, getMobXpReward } = require('./XpSystem');
const { calculateProficiency } = require('../../utils/modifiers');

/**
 * Generate and log complete XP progression table
 * Shows level, XP per level, cumulative XP, and proficiency bonus
 *
 * @param {number} maxLevel - Maximum level to display (default 50)
 */
function generateXpTable(maxLevel = 50) {
  console.log('\n' + '='.repeat(80));
  console.log('XP PROGRESSION TABLE (L1-' + maxLevel + ')');
  console.log('='.repeat(80));
  console.log('Level | XP Required | Cumulative XP | Proficiency | Max HP');
  console.log('------|-------------|---------------|-------------|-------');

  for (let level = 1; level <= maxLevel; level++) {
    const xpNeeded = level === 1 ? 0 : getXpForLevel(level);
    const cumulative = getCumulativeXpForLevel(level);
    const prof = calculateProficiency(level);
    const maxHp = 10 + ((level - 1) * 5); // Starting HP + 5 per level

    const levelStr = level.toString().padStart(5);
    const xpStr = xpNeeded.toString().padStart(11);
    const cumulativeStr = cumulative.toString().padStart(13);
    const profStr = ('+' + prof).padStart(11);
    const hpStr = maxHp.toString().padStart(7);

    console.log(`${levelStr} | ${xpStr} | ${cumulativeStr} | ${profStr} | ${hpStr}`);
  }

  console.log('='.repeat(80));
  console.log('\n');
}

/**
 * Generate XP reward table for mob kills
 * Shows XP gained for killing even-level mobs at each level
 *
 * @param {number} maxLevel - Maximum level to display (default 20)
 */
function generateMobXpTable(maxLevel = 20) {
  console.log('\n' + '='.repeat(60));
  console.log('MOB XP REWARD TABLE (Even-Level Kills)');
  console.log('='.repeat(60));
  console.log('Mob Lvl | Base XP | Solo Kill XP | Kills to Level');
  console.log('--------|---------|--------------|---------------');

  for (let level = 1; level <= maxLevel; level++) {
    const baseXp = getXpForLevel(level);
    const soloKillXp = getMobXpReward(level, level); // Even level fight
    const xpNeededForNextLevel = level < maxLevel ? getXpForLevel(level + 1) : 0;
    const killsNeeded = xpNeededForNextLevel > 0 ? Math.ceil(xpNeededForNextLevel / soloKillXp) : 0;

    const levelStr = level.toString().padStart(7);
    const baseXpStr = baseXp.toString().padStart(7);
    const soloXpStr = soloKillXp.toString().padStart(12);
    const killsStr = killsNeeded.toString().padStart(14);

    console.log(`${levelStr} | ${baseXpStr} | ${soloXpStr} | ${killsStr}`);
  }

  console.log('='.repeat(60));
  console.log('\n');
}

/**
 * Generate level scaling table
 * Shows XP rewards for fighting mobs at different level differences
 *
 * @param {number} playerLevel - Player level to base calculations on
 */
function generateLevelScalingTable(playerLevel = 5) {
  console.log('\n' + '='.repeat(70));
  console.log(`LEVEL SCALING TABLE (Player Level ${playerLevel})`);
  console.log('='.repeat(70));
  console.log('Mob Lvl | Lvl Diff | Multiplier | XP Reward | Notes');
  console.log('--------|----------|------------|-----------|------------------');

  const levels = [
    playerLevel - 7,
    playerLevel - 5,
    playerLevel - 3,
    playerLevel - 2,
    playerLevel - 1,
    playerLevel,
    playerLevel + 1,
    playerLevel + 2,
    playerLevel + 3,
    playerLevel + 5,
    playerLevel + 7
  ].filter(l => l >= 1);

  for (const mobLevel of levels) {
    const levelDiff = mobLevel - playerLevel;
    const xpReward = getMobXpReward(mobLevel, playerLevel);
    const evenLevelXp = getMobXpReward(mobLevel, mobLevel);
    const multiplier = (xpReward / evenLevelXp).toFixed(2);

    let notes = '';
    if (levelDiff >= 5) notes = 'Very challenging';
    else if (levelDiff >= 2) notes = 'Challenging';
    else if (levelDiff >= -1 && levelDiff <= 1) notes = 'Normal';
    else if (levelDiff >= -4) notes = 'Easy';
    else notes = 'Very easy';

    const mobLvlStr = mobLevel.toString().padStart(7);
    const diffStr = (levelDiff >= 0 ? '+' + levelDiff : levelDiff.toString()).padStart(8);
    const multStr = (multiplier + 'x').padStart(10);
    const xpStr = xpReward.toString().padStart(9);

    console.log(`${mobLvlStr} | ${diffStr} | ${multStr} | ${xpStr} | ${notes}`);
  }

  console.log('='.repeat(70));
  console.log('\n');
}

/**
 * Generate time estimation table
 * Shows estimated time to level at various kill rates
 *
 * @param {number} playerLevel - Player level
 */
function generateTimeEstimateTable(playerLevel = 1) {
  console.log('\n' + '='.repeat(70));
  console.log(`TIME TO LEVEL ESTIMATES (Level ${playerLevel} -> ${playerLevel + 1})`);
  console.log('='.repeat(70));

  const xpNeeded = getXpForLevel(playerLevel + 1);
  const evenLevelXp = getMobXpReward(playerLevel, playerLevel);

  console.log(`XP Needed: ${xpNeeded}`);
  console.log(`XP per Kill (even-level): ${evenLevelXp}`);
  console.log(`Kills Needed: ${Math.ceil(xpNeeded / evenLevelXp)}`);
  console.log('');
  console.log('Kills/Min | Minutes | Hours | Notes');
  console.log('----------|---------|-------|---------------------------');

  const killRates = [
    { rate: 0.5, note: 'Very slow (1 kill per 2 min)' },
    { rate: 1, note: 'Slow (1 kill per min)' },
    { rate: 2, note: 'Moderate (2 kills per min)' },
    { rate: 3, note: 'Fast (3 kills per min)' },
    { rate: 4, note: 'Very fast (4 kills per min)' }
  ];

  for (const { rate, note } of killRates) {
    const minutes = (Math.ceil(xpNeeded / evenLevelXp) / rate);
    const hours = (minutes / 60).toFixed(2);

    const rateStr = rate.toFixed(1).padStart(9);
    const minStr = Math.round(minutes).toString().padStart(7);
    const hrStr = hours.padStart(5);

    console.log(`${rateStr} | ${minStr} | ${hrStr} | ${note}`);
  }

  console.log('='.repeat(70));
  console.log('\n');
}

/**
 * Generate all tables at server startup
 */
function generateAllTables() {
  console.log('\n\n');
  console.log('#'.repeat(80));
  console.log('#' + ' '.repeat(78) + '#');
  console.log('#' + '  XP & LEVELING SYSTEM REFERENCE TABLES'.padEnd(78) + '#');
  console.log('#' + ' '.repeat(78) + '#');
  console.log('#'.repeat(80));

  // Main progression table
  generateXpTable(50);

  // Mob XP rewards
  generateMobXpTable(20);

  // Level scaling examples
  generateLevelScalingTable(1);
  generateLevelScalingTable(5);
  generateLevelScalingTable(10);

  // Time estimates for early levels
  generateTimeEstimateTable(1);
  generateTimeEstimateTable(2);
  generateTimeEstimateTable(3);
  generateTimeEstimateTable(4);

  console.log('\n' + '#'.repeat(80));
  console.log('#' + ' '.repeat(78) + '#');
  console.log('#' + '  END OF REFERENCE TABLES'.padEnd(78) + '#');
  console.log('#' + ' '.repeat(78) + '#');
  console.log('#'.repeat(80));
  console.log('\n\n');
}

/**
 * Get XP table data as array (for programmatic use)
 * @param {number} maxLevel - Maximum level
 * @returns {Array<Object>} Array of level data
 */
function getXpTableData(maxLevel = 50) {
  const table = [];

  for (let level = 1; level <= maxLevel; level++) {
    table.push({
      level,
      xpRequired: level === 1 ? 0 : getXpForLevel(level),
      cumulativeXp: getCumulativeXpForLevel(level),
      proficiency: calculateProficiency(level),
      maxHp: 10 + ((level - 1) * 5)
    });
  }

  return table;
}

module.exports = {
  generateXpTable,
  generateMobXpTable,
  generateLevelScalingTable,
  generateTimeEstimateTable,
  generateAllTables,
  getXpTableData
};
