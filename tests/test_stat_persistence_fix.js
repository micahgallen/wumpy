/**
 * Test Suite: Player Stat Persistence Fix
 *
 * Validates the critical bug fixes for player stat persistence across server restarts
 *
 * Tests:
 * 1. Stats persist after server restart (load/save cycle)
 * 2. baseStats initialized on first load (migration)
 * 3. Equipment bonuses properly calculated and don't persist to baseStats
 * 4. Level-up stat gains persist
 * 5. Admin addlevel command updates stats correctly
 */

const PlayerDB = require('../src/playerdb');
const EquipmentManager = require('../src/systems/equipment/EquipmentManager');
const { applyStatIncrease } = require('../src/systems/progression/LevelUpHandler');
const { applyStatGains } = require('../src/progression/statProgression');
const fs = require('fs');
const path = require('path');

// Test database path
const TEST_DB_PATH = path.join(__dirname, 'test_persistence.json');

/**
 * Clean up test database
 */
function cleanup() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

/**
 * Create a mock player for testing
 */
function createMockPlayer(username, level = 1, stats = {}) {
  return {
    username,
    level,
    xp: 0,
    hp: 20,
    currentHp: 20,
    maxHp: 20,
    currentRoom: 'test_room',
    description: 'A test character',
    inventory: [],
    currency: { platinum: 0, gold: 0, silver: 0, copper: 100 },
    isGhost: false,
    baseStats: {
      strength: stats.str || 10,
      dexterity: stats.dex || 10,
      constitution: stats.con || 10,
      intelligence: stats.int || 10,
      wisdom: stats.wis || 10,
      charisma: stats.cha || 10
    },
    str: stats.str || 10,
    dex: stats.dex || 10,
    con: stats.con || 10,
    int: stats.int || 10,
    wis: stats.wis || 10,
    cha: stats.cha || 10,
    resistances: {
      physical: 1.0, fire: 1.0, ice: 1.0, lightning: 1.0,
      poison: 1.0, necrotic: 1.0, radiant: 1.0, psychic: 1.0
    }
  };
}

/**
 * Test 1: Basic stat persistence (save/load cycle)
 */
function testBasicStatPersistence() {
  console.log('\n=== Test 1: Basic Stat Persistence ===');

  cleanup();
  const playerDB = new PlayerDB(TEST_DB_PATH);

  // Create player with custom stats
  playerDB.createPlayer('testuser', 'password');

  // Modify stats manually
  const player = createMockPlayer('testuser', 1, { str: 12, dex: 14, con: 13 });

  // Save player with custom stats
  playerDB.savePlayer(player);

  // Reload database from disk
  const playerDB2 = new PlayerDB(TEST_DB_PATH);
  const loaded = playerDB2.authenticate('testuser', 'password');

  console.log('Original stats:', { str: 12, dex: 14, con: 13 });
  console.log('Loaded stats:', { str: loaded.str, dex: loaded.dex, con: loaded.con });
  console.log('Loaded baseStats:', loaded.baseStats);

  const passed = loaded.str === 12 && loaded.dex === 14 && loaded.con === 13 &&
                 loaded.baseStats.strength === 12 &&
                 loaded.baseStats.dexterity === 14 &&
                 loaded.baseStats.constitution === 13;

  console.log(passed ? '✓ PASS: Stats persisted correctly' : '✗ FAIL: Stats did not persist');

  cleanup();
  return passed;
}

/**
 * Test 2: baseStats migration on first load
 */
function testBaseStatsMigration() {
  console.log('\n=== Test 2: baseStats Migration ===');

  cleanup();
  const playerDB = new PlayerDB(TEST_DB_PATH);

  // Create player (simulating old save format without baseStats)
  playerDB.createPlayer('oldplayer', 'password');

  // Manually remove baseStats from saved data to simulate old format
  const saved = playerDB.getPlayer('oldplayer');
  delete saved.baseStats;
  playerDB.players['oldplayer'] = saved;
  playerDB.save();

  // Reload and authenticate (should trigger migration)
  const playerDB2 = new PlayerDB(TEST_DB_PATH);
  const loaded = playerDB2.authenticate('oldplayer', 'password');

  console.log('Loaded player (migrated):');
  console.log('  stats:', loaded.stats);
  console.log('  baseStats:', loaded.baseStats);
  console.log('  short names:', { str: loaded.str, dex: loaded.dex, con: loaded.con });

  const passed = loaded.baseStats &&
                 loaded.baseStats.strength === 10 &&
                 loaded.str === 10 &&
                 loaded.stats.strength === 10;

  console.log(passed ? '✓ PASS: baseStats migrated correctly' : '✗ FAIL: Migration failed');

  cleanup();
  return passed;
}

/**
 * Test 3: Equipment bonuses don't persist to baseStats
 */
function testEquipmentBonusesNotPersisted() {
  console.log('\n=== Test 3: Equipment Bonuses Not Persisted to baseStats ===');

  cleanup();
  const playerDB = new PlayerDB(TEST_DB_PATH);
  playerDB.createPlayer('geartest', 'password');

  const player = createMockPlayer('geartest', 1, { str: 10 });

  // Add mock item with +2 STR bonus
  const mockRing = {
    instanceId: 'ring_001',
    isEquipped: true,
    equippedSlot: 'ring_1',
    requiresAttunement: false,
    isAttuned: false,
    statModifiers: { strength: 2 }
  };

  player.inventory = [mockRing];

  // Recalculate stats with equipment (should update effective stats but not baseStats)
  EquipmentManager.recalculatePlayerStats(player, playerDB);

  console.log('Before save:');
  console.log('  baseStats.strength:', player.baseStats.strength, '(should be 10)');
  console.log('  str (effective):', player.str, '(should be 12)');

  // Reload from disk
  const playerDB2 = new PlayerDB(TEST_DB_PATH);
  const loaded = playerDB2.authenticate('geartest', 'password');

  console.log('After reload:');
  console.log('  stats.strength:', loaded.stats.strength, '(should be 10)');
  console.log('  baseStats.strength:', loaded.baseStats.strength, '(should be 10)');
  console.log('  str:', loaded.str, '(should be 10, equipment not loaded yet)');

  const passed = loaded.stats.strength === 10 &&
                 loaded.baseStats.strength === 10 &&
                 loaded.str === 10;

  console.log(passed ? '✓ PASS: Equipment bonuses not persisted to base stats' : '✗ FAIL: Equipment bonus leaked into base stats');

  cleanup();
  return passed;
}

/**
 * Test 4: Level-up stat gains persist
 */
function testLevelUpStatGainsPersist() {
  console.log('\n=== Test 4: Level-Up Stat Gains Persist ===');

  cleanup();
  const playerDB = new PlayerDB(TEST_DB_PATH);
  playerDB.createPlayer('leveltest', 'password');

  const player = createMockPlayer('leveltest', 3, { str: 10, dex: 10, con: 10 });

  console.log('Initial stats:', { str: player.str, dex: player.dex, con: player.con });

  // Level up to 4 and apply stat increase (every 4th level gets +1 stat)
  player.level = 4;
  const result = applyStatIncrease(player, 'str');

  console.log('After +1 STR:');
  console.log('  baseStats.strength:', player.baseStats.strength, '(should be 11)');
  console.log('  str:', player.str, '(should be 11)');

  // Save
  playerDB.savePlayer(player);

  // Reload
  const playerDB2 = new PlayerDB(TEST_DB_PATH);
  const loaded = playerDB2.authenticate('leveltest', 'password');

  console.log('After reload:');
  console.log('  stats.strength:', loaded.stats.strength, '(should be 11)');
  console.log('  baseStats.strength:', loaded.baseStats.strength, '(should be 11)');
  console.log('  str:', loaded.str, '(should be 11)');

  const passed = loaded.stats.strength === 11 &&
                 loaded.baseStats.strength === 11 &&
                 loaded.str === 11;

  console.log(passed ? '✓ PASS: Level-up stat gains persisted' : '✗ FAIL: Stat gains did not persist');

  cleanup();
  return passed;
}

/**
 * Test 5: applyStatGains updates baseStats correctly
 */
function testApplyStatGainsUpdatesBaseStats() {
  console.log('\n=== Test 5: applyStatGains Updates baseStats ===');

  cleanup();
  const playerDB = new PlayerDB(TEST_DB_PATH);
  playerDB.createPlayer('gaintest', 'password');

  const player = createMockPlayer('gaintest', 1, { str: 10, con: 10 });

  console.log('Initial baseStats:', player.baseStats);

  // Apply stat gains (simulating level 4 gains)
  const gains = {
    hp: 5,
    strength: 1,  // +1 STR at level 4
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0
  };

  applyStatGains(player, gains);

  console.log('After applyStatGains:');
  console.log('  baseStats.strength:', player.baseStats.strength, '(should be 11)');
  console.log('  strength:', player.strength, '(should be 11)');
  console.log('  str:', player.str, '(should be 11)');

  // Save and reload
  playerDB.savePlayer(player);
  const playerDB2 = new PlayerDB(TEST_DB_PATH);
  const loaded = playerDB2.authenticate('gaintest', 'password');

  console.log('After reload:');
  console.log('  stats.strength:', loaded.stats.strength, '(should be 11)');
  console.log('  baseStats.strength:', loaded.baseStats.strength, '(should be 11)');

  const passed = loaded.stats.strength === 11 &&
                 loaded.baseStats.strength === 11;

  console.log(passed ? '✓ PASS: applyStatGains updated baseStats correctly' : '✗ FAIL: baseStats not updated');

  cleanup();
  return passed;
}

/**
 * Test 6: Full integration test - level up, equip, logout, login
 */
function testFullIntegration() {
  console.log('\n=== Test 6: Full Integration Test ===');

  cleanup();
  const playerDB = new PlayerDB(TEST_DB_PATH);
  playerDB.createPlayer('integration', 'password');

  // Session 1: Create player, level up, save
  {
    const player = createMockPlayer('integration', 3, { str: 10, dex: 10, con: 10 });
    player.level = 4;

    // Apply stat increase
    applyStatIncrease(player, 'str');
    console.log('Session 1 - After level up: STR =', player.str, '(should be 11)');

    // Add equipment
    const mockRing = {
      instanceId: 'ring_001',
      isEquipped: true,
      equippedSlot: 'ring_1',
      requiresAttunement: false,
      isAttuned: false,
      statModifiers: { strength: 2 }
    };
    player.inventory = [mockRing];

    EquipmentManager.recalculatePlayerStats(player, playerDB);
    console.log('Session 1 - With +2 STR ring: effective STR =', player.str, '(should be 13)');
    console.log('Session 1 - baseStats.strength =', player.baseStats.strength, '(should be 11)');

    // Save happens automatically via recalculatePlayerStats now
  }

  // Session 2: Reload player, verify stats
  {
    const playerDB2 = new PlayerDB(TEST_DB_PATH);
    const player = playerDB2.authenticate('integration', 'password');

    console.log('Session 2 - After reload:');
    console.log('  stats.strength:', player.stats.strength, '(should be 11)');
    console.log('  baseStats.strength:', player.baseStats.strength, '(should be 11)');
    console.log('  str (before equipment recalc):', player.str, '(should be 11)');

    // Equipment would be loaded from inventory and recalculated during session init
    // For this test, we're just verifying the base stats persisted correctly

    const passed = player.stats.strength === 11 &&
                   player.baseStats.strength === 11 &&
                   player.str === 11;

    console.log(passed ? '✓ PASS: Full integration test passed' : '✗ FAIL: Integration test failed');

    cleanup();
    return passed;
  }
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  CRITICAL FIX TEST SUITE: Player Stat Persistence         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = [
    testBasicStatPersistence(),
    testBaseStatsMigration(),
    testEquipmentBonusesNotPersisted(),
    testLevelUpStatGainsPersist(),
    testApplyStatGainsUpdatesBaseStats(),
    testFullIntegration()
  ];

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed}/${total} tests passed                             ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (passed === total) {
    console.log('✓ ALL TESTS PASSED - Stat persistence fixes are working correctly!');
    process.exit(0);
  } else {
    console.log('✗ SOME TESTS FAILED - Please review the output above');
    process.exit(1);
  }
}

// Run tests
runAllTests();
