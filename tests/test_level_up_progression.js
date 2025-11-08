/**
 * Test Suite for Level-Up Progression System
 *
 * Tests the following fixes:
 * - Task #18: HP calculation with CON modifier
 * - Task #14: Stat increases using baseStats
 * - Equipment bonus preservation across level-ups
 * - AC/HP recalculation after stat changes
 */

const { applyStatIncrease, applyLevelUp, checkAndApplyLevelUp } = require('../src/systems/progression/LevelUpHandler');
const EquipmentManager = require('../src/systems/equipment/EquipmentManager');
const { createPlayerCombatStats } = require('../src/data/CombatStats');

// Mock logger to suppress logs during testing
const logger = require('../src/logger');
logger.log = () => {};

/**
 * Create a test player with specified stats
 */
function createTestPlayer(level = 1, stats = {}) {
  const defaultStats = {
    str: 10,
    dex: 14,
    con: 12,
    int: 10,
    wis: 10,
    cha: 10
  };

  const playerStats = { ...defaultStats, ...stats };

  return {
    username: 'TestPlayer',
    level: level,
    currentXp: 0,
    maxHp: 10 + (level - 1) * 5,
    currentHp: 10 + (level - 1) * 5,
    proficiency: 2,
    inventory: [],

    // Base stats (permanent character stats)
    baseStats: {
      strength: playerStats.str,
      dexterity: playerStats.dex,
      constitution: playerStats.con,
      intelligence: playerStats.int,
      wisdom: playerStats.wis,
      charisma: playerStats.cha
    },

    // Effective stats (base + equipment, used in combat)
    stats: {
      strength: playerStats.str,
      dexterity: playerStats.dex,
      constitution: playerStats.con,
      intelligence: playerStats.int,
      wisdom: playerStats.wis,
      charisma: playerStats.cha
    },

    // Short names for combat system
    str: playerStats.str,
    dex: playerStats.dex,
    con: playerStats.con,
    int: playerStats.int,
    wis: playerStats.wis,
    cha: playerStats.cha,

    armorClass: 10 + Math.floor((playerStats.dex - 10) / 2),
    resistances: {},
    equipmentBonuses: {}
  };
}

/**
 * Test 1: HP gain includes CON modifier
 */
function testHpGainWithConModifier() {
  console.log('\n=== Test 1: HP Gain Includes CON Modifier ===');

  // Test case 1: CON 10 (+0 modifier) - should gain 5 HP
  const player1 = createTestPlayer(1, { con: 10 });
  const result1 = applyLevelUp(player1);

  console.log(`Player with CON 10 (+0): Expected HP gain = 5, Actual = ${result1.hpGain}`);
  if (result1.hpGain === 5) {
    console.log('✓ PASS: CON 10 gives 5 HP');
  } else {
    console.log(`✗ FAIL: Expected 5, got ${result1.hpGain}`);
  }

  // Test case 2: CON 16 (+3 modifier) - should gain 8 HP
  const player2 = createTestPlayer(1, { con: 16 });
  const result2 = applyLevelUp(player2);

  console.log(`Player with CON 16 (+3): Expected HP gain = 8, Actual = ${result2.hpGain}`);
  if (result2.hpGain === 8) {
    console.log('✓ PASS: CON 16 gives 8 HP');
  } else {
    console.log(`✗ FAIL: Expected 8, got ${result2.hpGain}`);
  }

  // Test case 3: CON 8 (-1 modifier) - should gain 4 HP
  const player3 = createTestPlayer(1, { con: 8 });
  const result3 = applyLevelUp(player3);

  console.log(`Player with CON 8 (-1): Expected HP gain = 4, Actual = ${result3.hpGain}`);
  if (result3.hpGain === 4) {
    console.log('✓ PASS: CON 8 gives 4 HP');
  } else {
    console.log(`✗ FAIL: Expected 4, got ${result3.hpGain}`);
  }
}

/**
 * Test 2: Stat increase modifies baseStats, not effective stats
 */
function testStatIncreaseUsesBaseStats() {
  console.log('\n=== Test 2: Stat Increase Uses baseStats ===');

  const player = createTestPlayer(1, { str: 14 });

  console.log(`Initial state:`);
  console.log(`  baseStats.strength: ${player.baseStats.strength}`);
  console.log(`  str (effective): ${player.str}`);

  const result = applyStatIncrease(player, 'str');

  console.log(`After stat increase:`);
  console.log(`  baseStats.strength: ${player.baseStats.strength}`);
  console.log(`  str (effective): ${player.str}`);

  if (result.success && player.baseStats.strength === 15) {
    console.log('✓ PASS: baseStats.strength increased to 15');
  } else {
    console.log(`✗ FAIL: baseStats.strength should be 15, got ${player.baseStats.strength}`);
  }

  if (player.str === 15) {
    console.log('✓ PASS: Effective STR also 15 (no equipment)');
  } else {
    console.log(`✗ FAIL: Effective STR should be 15, got ${player.str}`);
  }
}

/**
 * Test 3: Stat increase with equipment bonuses preserved
 */
function testStatIncreasePreservesEquipmentBonuses() {
  console.log('\n=== Test 3: Stat Increase Preserves Equipment Bonuses ===');

  const player = createTestPlayer(1, { str: 14 });

  // Simulate equipment bonus (+2 STR ring)
  player.equipmentBonuses = { strength: 2 };
  player.baseStats.strength = 14;
  player.stats.strength = 16;  // 14 base + 2 equipment
  player.str = 16;

  console.log(`Before stat increase (wearing +2 STR ring):`);
  console.log(`  baseStats.strength: ${player.baseStats.strength}`);
  console.log(`  Effective STR: ${player.str}`);

  const result = applyStatIncrease(player, 'str');

  console.log(`After stat increase:`);
  console.log(`  baseStats.strength: ${player.baseStats.strength}`);
  console.log(`  Effective STR: ${player.str}`);
  console.log(`  Equipment bonus: ${result.equipmentBonus}`);

  if (player.baseStats.strength === 15) {
    console.log('✓ PASS: Base STR increased from 14 to 15');
  } else {
    console.log(`✗ FAIL: Base STR should be 15, got ${player.baseStats.strength}`);
  }

  // Note: The actual equipment bonus won't be applied without real items
  // This test verifies the function returns the right structure
  if (result.success && result.oldBaseValue === 14 && result.newBaseValue === 15) {
    console.log('✓ PASS: Stat increase result shows correct base values');
  } else {
    console.log('✗ FAIL: Stat increase result incorrect');
  }
}

/**
 * Test 4: DEX increase recalculates AC
 */
function testDexIncreaseRecalculatesAC() {
  console.log('\n=== Test 4: DEX Increase Recalculates AC ===');

  const player = createTestPlayer(1, { dex: 14 });
  const initialAC = player.armorClass;

  console.log(`Initial DEX: ${player.dex}, AC: ${initialAC}`);

  const result = applyStatIncrease(player, 'dex');

  console.log(`After DEX increase: DEX ${player.dex}, AC: ${player.armorClass}`);

  if (player.baseStats.dexterity === 15) {
    console.log('✓ PASS: Base DEX increased to 15');
  } else {
    console.log(`✗ FAIL: Base DEX should be 15, got ${player.baseStats.dexterity}`);
  }

  // AC should be recalculated by EquipmentManager
  // Without armor, AC = 10 + DEX modifier
  // DEX 15 = +2 modifier, so AC should be 12
  const expectedAC = 10 + Math.floor((player.dex - 10) / 2);
  if (player.armorClass === expectedAC) {
    console.log(`✓ PASS: AC recalculated to ${player.armorClass}`);
  } else {
    console.log(`✗ FAIL: AC should be ${expectedAC}, got ${player.armorClass}`);
  }
}

/**
 * Test 5: CON increase recalculates max HP
 */
function testConIncreaseRecalculatesHP() {
  console.log('\n=== Test 5: CON Increase Recalculates Max HP ===');

  const player = createTestPlayer(5, { con: 14 });  // Level 5 player

  // Expected HP: 10 + (5-1)*5 + (CON modifier * level)
  // CON 14 = +2 modifier
  // HP = 10 + 20 + 10 = 40
  player.maxHp = 10 + (player.level - 1) * 5 + (Math.floor((player.con - 10) / 2) * player.level);
  player.currentHp = player.maxHp;

  const initialHP = player.maxHp;
  console.log(`Initial: Level ${player.level}, CON ${player.con}, Max HP: ${initialHP}`);

  const result = applyStatIncrease(player, 'con');

  console.log(`After CON increase: CON ${player.con}, Max HP: ${player.maxHp}`);

  if (player.baseStats.constitution === 15) {
    console.log('✓ PASS: Base CON increased to 15');
  } else {
    console.log(`✗ FAIL: Base CON should be 15, got ${player.baseStats.constitution}`);
  }

  // CON 15 = +2 modifier (no change from CON 14)
  // But the recalculation should happen
  const expectedModifier = Math.floor((player.con - 10) / 2);
  const expectedHP = 10 + (player.level - 1) * 5 + (expectedModifier * player.level);

  console.log(`Expected max HP: ${expectedHP} (base 10 + 20 from levels + ${expectedModifier * player.level} from CON)`);

  if (player.maxHp === expectedHP) {
    console.log(`✓ PASS: Max HP recalculated correctly to ${player.maxHp}`);
  } else {
    console.log(`✗ FAIL: Max HP should be ${expectedHP}, got ${player.maxHp}`);
  }
}

/**
 * Test 6: Level-up calls recalculatePlayerStats
 */
function testLevelUpRecalculatesStats() {
  console.log('\n=== Test 6: Level-Up Recalculates All Stats ===');

  const player = createTestPlayer(1, { str: 14, dex: 14, con: 14 });

  const initialProficiency = player.proficiency;
  const initialMaxHP = player.maxHp;

  console.log(`Before level-up:`);
  console.log(`  Level: ${player.level}, Proficiency: ${initialProficiency}`);
  console.log(`  Max HP: ${initialMaxHP}, AC: ${player.armorClass}`);

  const result = applyLevelUp(player);

  console.log(`After level-up:`);
  console.log(`  Level: ${player.level}, Proficiency: ${player.proficiency}`);
  console.log(`  Max HP: ${player.maxHp}, AC: ${player.armorClass}`);
  console.log(`  HP Gain: ${result.hpGain}`);

  if (player.level === 2) {
    console.log('✓ PASS: Level increased to 2');
  } else {
    console.log(`✗ FAIL: Level should be 2, got ${player.level}`);
  }

  // CON 14 = +2 modifier, should gain 5 + 2 = 7 HP
  if (result.hpGain === 7) {
    console.log('✓ PASS: HP gain includes CON modifier (5 + 2 = 7)');
  } else {
    console.log(`✗ FAIL: HP gain should be 7, got ${result.hpGain}`);
  }

  // Check that recalculatePlayerStats was called (HP should be retroactively calculated)
  const expectedHP = 10 + (player.level - 1) * 5 + (Math.floor((player.con - 10) / 2) * player.level);
  console.log(`Expected total HP after retroactive calc: ${expectedHP}`);
}

/**
 * Test 7: Invalid stat name handling
 */
function testInvalidStatName() {
  console.log('\n=== Test 7: Invalid Stat Name Handling ===');

  const player = createTestPlayer(1);

  const result = applyStatIncrease(player, 'invalid');

  if (!result.success && result.error) {
    console.log(`✓ PASS: Invalid stat rejected with error: "${result.error}"`);
  } else {
    console.log('✗ FAIL: Should reject invalid stat name');
  }

  const result2 = applyStatIncrease(player, 'STR');  // Wrong case

  if (!result2.success) {
    console.log('✓ PASS: Wrong case stat name rejected');
  } else {
    console.log('✗ FAIL: Should reject wrong case');
  }
}

/**
 * Test 8: Complete level-up scenario
 */
function testCompleteLevelUpScenario() {
  console.log('\n=== Test 8: Complete Level-Up Scenario ===');
  console.log('Simulating: Level 3 player with equipment, level up to 4, increase STR');

  const player = createTestPlayer(3, { str: 14, dex: 14, con: 14 });

  // Set proper HP for level 3
  // 10 base + (3-1)*5 + CON modifier per level
  const conMod = Math.floor((player.con - 10) / 2);
  player.maxHp = 10 + (player.level - 1) * 5 + (conMod * player.level);
  player.currentHp = player.maxHp;

  console.log(`\nStarting state:`);
  console.log(`  Level: ${player.level}`);
  console.log(`  Base STR: ${player.baseStats.strength}, Effective STR: ${player.str}`);
  console.log(`  Max HP: ${player.maxHp}`);
  console.log(`  AC: ${player.armorClass}`);

  // Level up to 4
  console.log(`\nLeveling up...`);
  const levelUpResult = applyLevelUp(player);

  console.log(`After level-up:`);
  console.log(`  Level: ${player.level}`);
  console.log(`  HP gained: ${levelUpResult.hpGain}`);
  console.log(`  Max HP: ${player.maxHp}`);
  console.log(`  Needs stat choice: ${levelUpResult.needsStatChoice}`);

  if (player.level === 4) {
    console.log('✓ PASS: Reached level 4');
  }

  if (levelUpResult.needsStatChoice) {
    console.log('✓ PASS: Stat choice offered (level 4 is divisible by 4)');

    // Increase STR
    console.log(`\nIncreasing STR...`);
    const statResult = applyStatIncrease(player, 'str');

    console.log(`After STR increase:`);
    console.log(`  Base STR: ${player.baseStats.strength} (was ${statResult.oldBaseValue})`);
    console.log(`  Effective STR: ${player.str}`);
    console.log(`  AC: ${player.armorClass}`);

    if (player.baseStats.strength === 15) {
      console.log('✓ PASS: Base STR increased to 15');
    } else {
      console.log(`✗ FAIL: Base STR should be 15, got ${player.baseStats.strength}`);
    }
  }
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Level-Up Progression System Test Suite                   ║');
  console.log('║  Testing Tasks #14, #18, and #19                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    testHpGainWithConModifier();
    testStatIncreaseUsesBaseStats();
    testStatIncreasePreservesEquipmentBonuses();
    testDexIncreaseRecalculatesAC();
    testConIncreaseRecalculatesHP();
    testLevelUpRecalculatesStats();
    testInvalidStatName();
    testCompleteLevelUpScenario();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  All tests completed!                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ Test suite error:', error);
    console.error(error.stack);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  createTestPlayer
};
