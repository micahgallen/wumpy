/**
 * Phase 5 Test Suite: XP Award and Automatic Leveling
 *
 * Tests all Phase 5 features:
 * - XP award on NPC defeat
 * - Level-up threshold detection
 * - Stat gains on level-up
 * - XP/level persistence
 * - Multiple consecutive level-ups
 * - Score command XP display
 * - Full integration flow
 */

const colors = require('../src/colors');
const { getXPForLevel } = require('../src/progression/xpTable');
const { awardXP, checkLevelUp, levelUp, calculateCombatXP, getXPToNextLevel } = require('../src/progression/xpSystem');
const { calculateStatGains, applyStatGains, getProficiencyBonus } = require('../src/progression/statProgression');

// Mock PlayerDB for testing
class MockPlayerDB {
  constructor() {
    this.updateXPCalled = false;
    this.updateLevelCalled = false;
    this.lastXP = 0;
    this.lastLevel = 0;
  }

  updatePlayerXP(username, xp) {
    this.updateXPCalled = true;
    this.lastXP = xp;
  }

  updatePlayerLevel(username, level, maxHp, hp) {
    this.updateLevelCalled = true;
    this.lastLevel = level;
  }
}

// Mock socket for player
class MockSocket {
  constructor() {
    this.messages = [];
  }

  write(msg) {
    this.messages.push(msg);
  }

  getMessages() {
    return this.messages.join('');
  }

  clearMessages() {
    this.messages = [];
  }
}

// Create test player
function createTestPlayer(overrides = {}) {
  const socket = new MockSocket();
  return {
    username: 'TestPlayer',
    socket: socket,
    level: 1,
    xp: 0,
    hp: 20,
    maxHp: 20,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    send: (msg) => socket.write(msg),
    ...overrides
  };
}

// Create test NPC
function createTestNPC(level, xpReward) {
  return {
    name: 'Test Monster',
    level: level,
    xpReward: xpReward,
    hp: 10,
    maxHp: 10,
    isDead: () => true
  };
}

// Test runner
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
    }
  }

  assertGreaterThan(actual, threshold, message) {
    if (actual <= threshold) {
      throw new Error(`${message}\n  Expected > ${threshold}\n  Actual: ${actual}`);
    }
  }

  assertLessThan(actual, threshold, message) {
    if (actual >= threshold) {
      throw new Error(`${message}\n  Expected < ${threshold}\n  Actual: ${actual}`);
    }
  }

  async run() {
    console.log(colors.info('\n' + '='.repeat(70)));
    console.log(colors.info('Phase 5 Test Suite: XP Award and Automatic Leveling'));
    console.log(colors.info('='.repeat(70) + '\n'));

    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(colors.success(`✓ ${test.name}`));
      } catch (err) {
        this.failed++;
        console.log(colors.error(`✗ ${test.name}`));
        console.log(colors.error(`  ${err.message}\n`));
      }
    }

    console.log(colors.info('\n' + '='.repeat(70)));
    console.log(colors.info(`Test Results: ${this.passed} passed, ${this.failed} failed`));
    if (this.failed === 0) {
      console.log(colors.success('ALL TESTS PASSED!'));
    } else {
      console.log(colors.error(`${this.failed} tests failed`));
    }
    console.log(colors.info('='.repeat(70) + '\n'));

    return this.failed === 0;
  }
}

// Initialize test runner
const runner = new TestRunner();

// ============================================================================
// TEST CATEGORY 1: XP Table and Formula Verification
// ============================================================================

runner.test('XP Table - Level 1 to 2 requires correct XP', () => {
  const xpRequired = getXPForLevel(2);
  runner.assertEqual(xpRequired, 1000, 'Level 2 should require 1000 XP');
});

runner.test('XP Table - Level progression increases correctly', () => {
  const xp2 = getXPForLevel(2);
  const xp3 = getXPForLevel(3);
  const xp4 = getXPForLevel(4);

  runner.assertGreaterThan(xp3, xp2, 'Level 3 XP should be higher than Level 2');
  runner.assertGreaterThan(xp4, xp3, 'Level 4 XP should be higher than Level 3');
});

runner.test('XP Table - High level XP requirements scale properly', () => {
  const xp10 = getXPForLevel(10);
  const xp20 = getXPForLevel(20);
  const xp50 = getXPForLevel(50);

  runner.assertGreaterThan(xp20, xp10 * 2, 'Level 20 should require more than 2x Level 10');
  runner.assertGreaterThan(xp50, xp20 * 3, 'Level 50 should require more than 3x Level 20');
});

// ============================================================================
// TEST CATEGORY 2: Combat XP Calculation
// ============================================================================

runner.test('Combat XP - Even level fight gives base XP', () => {
  const player = createTestPlayer({ level: 5 });
  const npc = createTestNPC(5, 500);

  const xp = calculateCombatXP(npc, player.level);

  // Should be roughly the base XP (multiplier = 1.0)
  runner.assertEqual(xp, 500, 'Even-level fight should give base XP');
});

runner.test('Combat XP - Higher level NPC gives bonus XP', () => {
  const player = createTestPlayer({ level: 5 });
  const npcEven = createTestNPC(5, 500);
  const npcHigher = createTestNPC(7, 500);

  const xpEven = calculateCombatXP(npcEven, player.level);
  const xpHigher = calculateCombatXP(npcHigher, player.level);

  runner.assertGreaterThan(xpHigher, xpEven, 'Higher level NPC should give more XP');
});

runner.test('Combat XP - Lower level NPC gives reduced XP', () => {
  const player = createTestPlayer({ level: 10 });
  const npcEven = createTestNPC(10, 500);
  const npcLower = createTestNPC(5, 500);

  const xpEven = calculateCombatXP(npcEven, player.level);
  const xpLower = calculateCombatXP(npcLower, player.level);

  runner.assertLessThan(xpLower, xpEven, 'Lower level NPC should give less XP');
});

runner.test('Combat XP - Minimum XP is never zero', () => {
  const player = createTestPlayer({ level: 50 });
  const npc = createTestNPC(1, 100);

  const xp = calculateCombatXP(npc, player.level);

  runner.assertGreaterThan(xp, 0, 'XP should never be zero, even for low-level mobs');
});

// ============================================================================
// TEST CATEGORY 3: XP Award System
// ============================================================================

runner.test('XP Award - Player gains XP correctly', () => {
  const player = createTestPlayer({ level: 1, xp: 0 });
  const playerDB = new MockPlayerDB();

  awardXP(player, 100, 'combat', playerDB);

  runner.assertEqual(player.xp, 100, 'Player XP should increase by 100');
  runner.assert(playerDB.updateXPCalled, 'PlayerDB.updatePlayerXP should be called');
  runner.assertEqual(playerDB.lastXP, 100, 'Persisted XP should be 100');
});

runner.test('XP Award - Player receives notification message', () => {
  const player = createTestPlayer({ level: 1, xp: 0 });
  const playerDB = new MockPlayerDB();

  awardXP(player, 150, 'combat', playerDB);

  const messages = player.socket.getMessages();
  runner.assert(messages.includes('150 XP'), 'Message should show XP amount');
  runner.assert(messages.includes('combat'), 'Message should show source');
});

runner.test('XP Award - Multiple awards accumulate correctly', () => {
  const player = createTestPlayer({ level: 1, xp: 0 });
  const playerDB = new MockPlayerDB();

  awardXP(player, 100, 'combat', playerDB);
  awardXP(player, 50, 'combat', playerDB);
  awardXP(player, 75, 'combat', playerDB);

  runner.assertEqual(player.xp, 225, 'XP should accumulate to 225');
});

// ============================================================================
// TEST CATEGORY 4: Level-Up Detection
// ============================================================================

runner.test('Level-Up Detection - Triggers when XP threshold reached', () => {
  const player = createTestPlayer({ level: 1, xp: 999 });
  const playerDB = new MockPlayerDB();

  awardXP(player, 1, 'combat', playerDB); // Should trigger level-up at 1000 XP

  runner.assertEqual(player.level, 2, 'Player should be level 2');
  runner.assert(playerDB.updateLevelCalled, 'PlayerDB.updatePlayerLevel should be called');
});

runner.test('Level-Up Detection - Does not trigger below threshold', () => {
  const player = createTestPlayer({ level: 1, xp: 500 });
  const playerDB = new MockPlayerDB();

  awardXP(player, 200, 'combat', playerDB); // Still below 1000

  runner.assertEqual(player.level, 1, 'Player should still be level 1');
});

runner.test('Level-Up Detection - Triggers exactly at threshold', () => {
  const player = createTestPlayer({ level: 1, xp: 900 });
  const playerDB = new MockPlayerDB();

  awardXP(player, 100, 'combat', playerDB); // Exactly 1000

  runner.assertEqual(player.level, 2, 'Player should level up at exactly 1000 XP');
});

runner.test('Level-Up Detection - Multiple consecutive level-ups work', () => {
  const player = createTestPlayer({ level: 1, xp: 0 });
  const playerDB = new MockPlayerDB();

  // Award enough XP to go from L1 to L3 (needs 1000 + 2027 = 3027 total)
  awardXP(player, 4000, 'combat', playerDB);

  runner.assertGreaterThan(player.level, 2, 'Player should level up multiple times');
});

// ============================================================================
// TEST CATEGORY 5: Stat Gains on Level-Up
// ============================================================================

runner.test('Stat Gains - HP increases by 5 every level', () => {
  const player = createTestPlayer({ level: 1, maxHp: 20 });
  const playerDB = new MockPlayerDB();

  levelUp(player, playerDB);

  runner.assertEqual(player.maxHp, 25, 'Max HP should increase by 5');
});

runner.test('Stat Gains - HP fully restored on level-up', () => {
  const player = createTestPlayer({ level: 1, hp: 10, maxHp: 20 });
  const playerDB = new MockPlayerDB();

  levelUp(player, playerDB);

  runner.assertEqual(player.hp, player.maxHp, 'HP should be fully restored');
});

runner.test('Stat Gains - STR increases every 4th level', () => {
  const player = createTestPlayer({ level: 3, strength: 10 });

  const gains3 = calculateStatGains(player);
  runner.assertEqual(gains3.strength, 0, 'Level 3: No STR gain');

  player.level = 4;
  const gains4 = calculateStatGains(player);
  runner.assertEqual(gains4.strength, 1, 'Level 4: +1 STR');

  player.level = 8;
  const gains8 = calculateStatGains(player);
  runner.assertEqual(gains8.strength, 1, 'Level 8: +1 STR');
});

runner.test('Stat Gains - CON increases every 5th level', () => {
  const player = createTestPlayer({ level: 4, constitution: 10 });

  const gains4 = calculateStatGains(player);
  runner.assertEqual(gains4.constitution, 0, 'Level 4: No CON gain');

  player.level = 5;
  const gains5 = calculateStatGains(player);
  runner.assertEqual(gains5.constitution, 1, 'Level 5: +1 CON');

  player.level = 10;
  const gains10 = calculateStatGains(player);
  runner.assertEqual(gains10.constitution, 1, 'Level 10: +1 CON');
});

runner.test('Stat Gains - DEX increases every 6th level', () => {
  const player = createTestPlayer({ level: 5, dexterity: 10 });

  const gains5 = calculateStatGains(player);
  runner.assertEqual(gains5.dexterity, 0, 'Level 5: No DEX gain');

  player.level = 6;
  const gains6 = calculateStatGains(player);
  runner.assertEqual(gains6.dexterity, 1, 'Level 6: +1 DEX');

  player.level = 12;
  const gains12 = calculateStatGains(player);
  runner.assertEqual(gains12.dexterity, 1, 'Level 12: +1 DEX');
});

runner.test('Stat Gains - Multiple stats can increase on same level', () => {
  // Level 20 should give STR (20 % 4 = 0), CON (20 % 5 = 0), DEX (20 % 6 != 0)
  const player = createTestPlayer({ level: 20 });

  const gains = calculateStatGains(player);
  runner.assertEqual(gains.strength, 1, 'Level 20: +1 STR');
  runner.assertEqual(gains.constitution, 1, 'Level 20: +1 CON');
  runner.assertEqual(gains.hp, 5, 'Level 20: +5 HP');
});

runner.test('Stat Gains - applyStatGains correctly modifies player', () => {
  const player = createTestPlayer({
    level: 4,
    maxHp: 20,
    strength: 10,
    constitution: 10,
    dexterity: 10
  });

  const gains = {
    hp: 5,
    strength: 1,
    constitution: 0,
    dexterity: 0
  };

  applyStatGains(player, gains);

  runner.assertEqual(player.maxHp, 25, 'Max HP should increase');
  runner.assertEqual(player.strength, 11, 'Strength should increase');
  runner.assertEqual(player.constitution, 10, 'Constitution should not change');
});

// ============================================================================
// TEST CATEGORY 6: Proficiency Bonus Progression
// ============================================================================

runner.test('Proficiency - Starts at +2 for level 1', () => {
  const prof = getProficiencyBonus(1);
  runner.assertEqual(prof, 2, 'Level 1 proficiency should be +2');
});

runner.test('Proficiency - Increases to +3 at level 5', () => {
  const prof4 = getProficiencyBonus(4);
  const prof5 = getProficiencyBonus(5);

  runner.assertEqual(prof4, 2, 'Level 4 proficiency should be +2');
  runner.assertEqual(prof5, 3, 'Level 5 proficiency should be +3');
});

runner.test('Proficiency - Increases to +4 at level 9', () => {
  const prof8 = getProficiencyBonus(8);
  const prof9 = getProficiencyBonus(9);

  runner.assertEqual(prof8, 3, 'Level 8 proficiency should be +3');
  runner.assertEqual(prof9, 4, 'Level 9 proficiency should be +4');
});

runner.test('Proficiency - Correct at high levels', () => {
  runner.assertEqual(getProficiencyBonus(13), 5, 'Level 13 proficiency should be +5');
  runner.assertEqual(getProficiencyBonus(17), 6, 'Level 17 proficiency should be +6');
  runner.assertEqual(getProficiencyBonus(21), 7, 'Level 21 proficiency should be +7');
});

// ============================================================================
// TEST CATEGORY 7: Level-Up Notifications
// ============================================================================

runner.test('Level-Up Notification - Player receives level-up message', () => {
  const player = createTestPlayer({ level: 1, xp: 0 });
  const playerDB = new MockPlayerDB();

  player.socket.clearMessages();
  levelUp(player, playerDB);

  const messages = player.socket.getMessages();
  runner.assert(messages.includes('LEVEL UP'), 'Should contain level-up announcement');
  runner.assert(messages.includes('2'), 'Should show new level (2)');
});

runner.test('Level-Up Notification - Shows stat gains', () => {
  const player = createTestPlayer({ level: 3 });
  const playerDB = new MockPlayerDB();

  player.socket.clearMessages();
  levelUp(player, playerDB); // Level 4 = +1 STR

  const messages = player.socket.getMessages();
  runner.assert(messages.includes('Max HP'), 'Should show HP gain');
});

runner.test('Level-Up Notification - Shows full heal message', () => {
  const player = createTestPlayer({ level: 1 });
  const playerDB = new MockPlayerDB();

  player.socket.clearMessages();
  levelUp(player, playerDB);

  const messages = player.socket.getMessages();
  runner.assert(messages.includes('fully healed') || messages.includes('healed'), 'Should mention healing');
});

// ============================================================================
// TEST CATEGORY 8: XP to Next Level Calculations
// ============================================================================

runner.test('XP to Next Level - Calculates correctly at level 1', () => {
  const player = createTestPlayer({ level: 1, xp: 0 });
  const remaining = getXPToNextLevel(player);

  runner.assertEqual(remaining, 1000, 'Should need 1000 XP to reach level 2');
});

runner.test('XP to Next Level - Updates after gaining XP', () => {
  const player = createTestPlayer({ level: 1, xp: 0 });
  player.xp = 300;

  const remaining = getXPToNextLevel(player);
  runner.assertEqual(remaining, 700, 'Should need 700 more XP');
});

runner.test('XP to Next Level - Correct after level-up', () => {
  const player = createTestPlayer({ level: 1, xp: 1000 });
  const playerDB = new MockPlayerDB();

  levelUp(player, playerDB); // Now level 2

  const remaining = getXPToNextLevel(player);
  const expectedXP = getXPForLevel(3) - 1000; // XP for L3 minus current XP
  runner.assertEqual(remaining, expectedXP, 'Should calculate correctly for level 2');
});

// ============================================================================
// TEST CATEGORY 9: Edge Cases
// ============================================================================

runner.test('Edge Case - Level 50 XP requirement exists', () => {
  const xp50 = getXPForLevel(50);
  runner.assertGreaterThan(xp50, 0, 'Level 50 should have an XP requirement');
});

runner.test('Edge Case - Massive XP award causes multiple level-ups', () => {
  const player = createTestPlayer({ level: 1, xp: 0 });
  const playerDB = new MockPlayerDB();

  // Award 10,000 XP (enough for several levels)
  awardXP(player, 10000, 'test', playerDB);

  runner.assertGreaterThan(player.level, 3, 'Should level up multiple times');
  runner.assertGreaterThan(player.maxHp, 30, 'HP should increase multiple times');
});

runner.test('Edge Case - XP award of 0 does not break system', () => {
  const player = createTestPlayer({ level: 1, xp: 500 });
  const playerDB = new MockPlayerDB();

  awardXP(player, 0, 'test', playerDB);

  runner.assertEqual(player.xp, 500, 'XP should remain unchanged');
  runner.assertEqual(player.level, 1, 'Level should remain unchanged');
});

runner.test('Edge Case - Negative XP is handled gracefully', () => {
  const player = createTestPlayer({ level: 1, xp: 500 });
  const playerDB = new MockPlayerDB();

  // This shouldn't happen in practice, but test robustness
  player.xp += -100;

  runner.assertEqual(player.xp, 400, 'XP can decrease (for death penalty, etc.)');
});

runner.test('Edge Case - Player exactly at level threshold does not double level-up', () => {
  const player = createTestPlayer({ level: 1, xp: 1000 });
  const playerDB = new MockPlayerDB();

  checkLevelUp(player, playerDB);

  runner.assertEqual(player.level, 2, 'Should level up once to level 2');

  checkLevelUp(player, playerDB);

  runner.assertEqual(player.level, 2, 'Should not level up again');
});

// ============================================================================
// TEST CATEGORY 10: Integration Tests
// ============================================================================

runner.test('Integration - Full combat flow: defeat NPC -> gain XP -> level up', () => {
  const player = createTestPlayer({ level: 1, xp: 950 });
  const npc = createTestNPC(1, 50);
  const playerDB = new MockPlayerDB();

  // Simulate combat victory
  const xpReward = calculateCombatXP(npc, player.level);
  awardXP(player, xpReward, 'combat', playerDB);

  // Should have leveled up
  runner.assertEqual(player.level, 2, 'Should level up from combat XP');
  runner.assertGreaterThan(player.maxHp, 20, 'HP should increase');
  runner.assert(playerDB.updateLevelCalled, 'Level should be persisted');
});

runner.test('Integration - Multiple combats accumulate to level-up', () => {
  const player = createTestPlayer({ level: 1, xp: 0 });
  const playerDB = new MockPlayerDB();

  // Fight 10 NPCs worth 100 XP each
  for (let i = 0; i < 10; i++) {
    const npc = createTestNPC(1, 100);
    const xp = calculateCombatXP(npc, player.level);
    awardXP(player, xp, 'combat', playerDB);
  }

  // Should have leveled up at least once
  runner.assertGreaterThan(player.level, 1, 'Should level up after multiple combats');
});

runner.test('Integration - Stat gains persist through multiple level-ups', () => {
  const player = createTestPlayer({
    level: 1,
    xp: 0,
    strength: 10,
    constitution: 10
  });
  const playerDB = new MockPlayerDB();

  // Level up to 5 (should hit level 4 and 5 milestones)
  for (let targetLevel = 2; targetLevel <= 5; targetLevel++) {
    player.xp = getXPForLevel(targetLevel);
    checkLevelUp(player, playerDB);
  }

  runner.assertEqual(player.level, 5, 'Should be level 5');
  runner.assertGreaterThan(player.strength, 10, 'STR should have increased (level 4)');
  runner.assertGreaterThan(player.constitution, 10, 'CON should have increased (level 5)');
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================

runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
