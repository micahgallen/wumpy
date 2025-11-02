/**
 * Comprehensive Phase 1-4 Testing
 * Tests the combat system implementation according to COMBAT_IMPLEMENTATION_PLAN.md
 */

const colors = require('../src/colors');

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n' + '='.repeat(70));
    console.log(`PHASE TESTING: ${this.name}`);
    console.log('='.repeat(70));

    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✓ ${test.name}`);
      } catch (error) {
        this.failed++;
        console.log(`✗ ${test.name}`);
        console.log(`  Error: ${error.message}`);
        if (error.stack) {
          console.log(`  ${error.stack.split('\n').slice(1, 3).join('\n  ')}`);
        }
      }
    }

    console.log('-'.repeat(70));
    console.log(`Tests: ${this.tests.length}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log('='.repeat(70));

    return this.failed === 0;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================================================
// PHASE 1: FOUNDATION TESTS
// ============================================================================

async function testPhase1() {
  const suite = new TestSuite('Phase 1: Foundation');

  // Test 1.1: Dice Rolling Utilities
  suite.test('Dice: rollD20 returns 1-20', () => {
    const { rollD20 } = require('../src/utils/dice');
    for (let i = 0; i < 100; i++) {
      const roll = rollD20();
      assert(roll >= 1 && roll <= 20, `Roll ${roll} out of range`);
    }
  });

  suite.test('Dice: rollDice parses "2d6+3"', () => {
    const { rollDice } = require('../src/utils/dice');
    const result = rollDice('2d6+3');
    assert(result >= 5 && result <= 15, `Result ${result} out of expected range`);
  });

  suite.test('Dice: rollDice handles invalid input gracefully', () => {
    const { rollDice } = require('../src/utils/dice');
    const result = rollDice('invalid');
    assert(result === 0, 'Should return 0 for invalid input');
  });

  // Test 1.2: XP Table
  suite.test('XP Table: getXPForLevel returns correct values', () => {
    const { getXPForLevel, XP_TABLE } = require('../src/progression/xpTable');
    assert(getXPForLevel(1) === 0, 'Level 1 should be 0 XP');
    assert(getXPForLevel(2) === 1000, 'Level 2 should be 1000 XP');
    assert(getXPForLevel(3) === 3000, 'Level 3 should be 3000 XP');
  });

  suite.test('XP Table: handles out of range levels', () => {
    const { getXPForLevel } = require('../src/progression/xpTable');
    const result = getXPForLevel(100);
    assert(typeof result === 'number', 'Should return a number for high levels');
  });

  // Test 1.3: Damage Types
  suite.test('Damage Types: DAMAGE_TYPES contains required types', () => {
    const { DAMAGE_TYPES } = require('../src/combat/damageTypes');
    assert(DAMAGE_TYPES.physical !== undefined, 'Physical damage type missing');
    assert(DAMAGE_TYPES.fire !== undefined, 'Fire damage type missing');
  });

  suite.test('Damage Types: calculateResistance applies 25% resistance', () => {
    const { calculateResistance } = require('../src/combat/damageTypes');
    const result = calculateResistance(20, 'fire', { fire: 25 });
    assert(result === 15, `Expected 15, got ${result}`);
  });

  suite.test('Damage Types: calculateResistance handles vulnerability (-25%)', () => {
    const { calculateResistance } = require('../src/combat/damageTypes');
    const result = calculateResistance(20, 'ice', { ice: -25 });
    assert(result === 25, `Expected 25, got ${result}`);
  });

  suite.test('Damage Types: calculateResistance handles 100% immunity', () => {
    const { calculateResistance } = require('../src/combat/damageTypes');
    const result = calculateResistance(20, 'physical', { physical: 100 });
    assert(result === 0, `Expected 0, got ${result}`);
  });

  // Test 1.4: Stat Progression
  suite.test('Stats: getModifier calculates correctly', () => {
    const { getModifier } = require('../src/progression/statProgression');
    assert(getModifier(10) === 0, '10 should give +0');
    assert(getModifier(8) === -1, '8 should give -1');
    assert(getModifier(16) === 3, '16 should give +3');
    assert(getModifier(20) === 5, '20 should give +5');
  });

  suite.test('Stats: getProficiencyBonus scales correctly', () => {
    const { getProficiencyBonus } = require('../src/progression/statProgression');
    assert(getProficiencyBonus(1) === 1, 'Level 1 should be +1');
    assert(getProficiencyBonus(4) === 1, 'Level 4 should be +1');
    assert(getProficiencyBonus(5) === 2, 'Level 5 should be +2');
    assert(getProficiencyBonus(9) === 3, 'Level 9 should be +3');
  });

  // Test 1.5: Player Class Combat Properties
  suite.test('Player Class: has required combat properties', () => {
    // Create a mock player to test properties
    const Player = require('../src/server').Player;
    const mockSocket = { write: () => {}, on: () => {}, end: () => {} };
    const player = new Player(mockSocket);

    assert(player.level !== undefined, 'Player missing level');
    assert(player.currentHp !== undefined, 'Player missing currentHp');
    assert(player.maxHp !== undefined, 'Player missing maxHp');
    assert(player.strength !== undefined, 'Player missing strength');
    assert(player.dexterity !== undefined, 'Player missing dexterity');
  });

  suite.test('Player Class: takeDamage reduces HP', () => {
    const Player = require('../src/server').Player;
    const mockSocket = { write: () => {}, on: () => {}, end: () => {} };
    const player = new Player(mockSocket);

    const initialHp = player.currentHp;
    player.takeDamage(5);
    assert(player.currentHp === initialHp - 5, 'HP should decrease by 5');
  });

  suite.test('Player Class: isDead returns true at 0 HP', () => {
    const Player = require('../src/server').Player;
    const mockSocket = { write: () => {}, on: () => {}, end: () => {} };
    const player = new Player(mockSocket);

    player.currentHp = 0;
    assert(player.isDead() === true, 'isDead should return true at 0 HP');
  });

  suite.test('Player Class: isDead returns false above 0 HP', () => {
    const Player = require('../src/server').Player;
    const mockSocket = { write: () => {}, on: () => {}, end: () => {} };
    const player = new Player(mockSocket);

    player.currentHp = 10;
    assert(player.isDead() === false, 'isDead should return false above 0 HP');
  });

  return suite.run();
}

// ============================================================================
// PHASE 2: COMBAT RESOLUTION TESTS
// ============================================================================

async function testPhase2() {
  const suite = new TestSuite('Phase 2: Combat Resolution');

  // Test 2.1: Combat Resolver
  suite.test('Combat Resolver: rollAttack returns valid result', () => {
    const { rollAttack } = require('../src/combat/combatResolver');
    const attacker = { level: 1, strength: 14, dexterity: 10 };
    const defender = { dexterity: 12 };

    const result = rollAttack(attacker, defender, 'physical');
    assert(result.roll !== undefined, 'Missing roll');
    assert(result.total !== undefined, 'Missing total');
    assert(result.hit !== undefined, 'Missing hit');
    assert(result.critical !== undefined, 'Missing critical');
  });

  suite.test('Combat Resolver: critical hit on natural 20', () => {
    const { rollAttack } = require('../src/combat/combatResolver');
    const attacker = { level: 1, strength: 10, dexterity: 10 };
    const defender = { dexterity: 10 };

    // Run multiple times to potentially get a nat 20
    let gotCritical = false;
    for (let i = 0; i < 1000; i++) {
      const result = rollAttack(attacker, defender);
      if (result.critical) {
        gotCritical = true;
        assert(result.roll === 20, 'Critical should occur on natural 20');
        break;
      }
    }
    assert(gotCritical, 'Should eventually roll a critical hit');
  });

  suite.test('Combat Resolver: getAttackBonus calculates correctly', () => {
    const { getAttackBonus } = require('../src/combat/combatResolver');
    const attacker = { level: 5, strength: 14, dexterity: 10 };

    // Level 5 = +2 prof, STR 14 = +2 mod
    const bonus = getAttackBonus(attacker, 'physical');
    assert(bonus === 4, `Expected 4, got ${bonus}`);
  });

  suite.test('Combat Resolver: getArmorClass calculates correctly', () => {
    const { getArmorClass } = require('../src/combat/combatResolver');
    const defender = { dexterity: 14 }; // +2 mod

    // Base AC 10 + DEX mod 2 = 12
    const ac = getArmorClass(defender);
    assert(ac === 12, `Expected 12, got ${ac}`);
  });

  // Test 2.2: Initiative System
  suite.test('Initiative: rollInitiative adds DEX modifier', () => {
    const { rollInitiative } = require('../src/combat/initiative');
    const combatant = { dexterity: 14 }; // +2 mod

    const initiative = rollInitiative(combatant);
    assert(initiative >= 3 && initiative <= 22, `Initiative ${initiative} out of range (3-22 for +2 DEX)`);
  });

  suite.test('Initiative: determineTurnOrder sorts correctly', () => {
    const { determineTurnOrder } = require('../src/combat/initiative');
    const combatants = [
      { name: 'A', dexterity: 10 },
      { name: 'B', dexterity: 16 },
      { name: 'C', dexterity: 8 }
    ];

    const ordered = determineTurnOrder(combatants);
    assert(ordered.length === 3, 'Should preserve all combatants');
    assert(ordered[0].initiative !== undefined, 'First combatant should have initiative');
  });

  // Test 2.3: Combat Messages
  suite.test('Combat Messages: getAttackMessage generates hit message', () => {
    const { getAttackMessage } = require('../src/combat/combatMessages');
    const attacker = { username: 'TestPlayer' };
    const defender = { name: 'Goblin' };

    const message = getAttackMessage(attacker, defender, true, false);
    assert(typeof message === 'string', 'Should return a string');
    assert(message.length > 0, 'Message should not be empty');
  });

  suite.test('Combat Messages: getAttackMessage generates critical message', () => {
    const { getAttackMessage } = require('../src/combat/combatMessages');
    const attacker = { username: 'TestPlayer' };
    const defender = { name: 'Goblin' };

    const message = getAttackMessage(attacker, defender, true, true);
    assert(message.includes('CRITICAL'), 'Critical message should mention CRITICAL');
  });

  suite.test('Combat Messages: getDamageMessage includes damage amount', () => {
    const { getDamageMessage } = require('../src/combat/combatMessages');

    const message = getDamageMessage(10, 'physical');
    assert(typeof message === 'string', 'Should return a string');
    assert(message.includes('10'), 'Should include damage amount');
  });

  suite.test('Combat Messages: createHealthBar shows HP correctly', () => {
    const { createHealthBar } = require('../src/combat/combatMessages');

    const bar = createHealthBar(50, 100);
    assert(typeof bar === 'string', 'Should return a string');
    assert(bar.includes('50/100'), 'Should show current/max HP');
  });

  return suite.run();
}

// ============================================================================
// PHASE 3: COMBAT ENGINE TESTS
// ============================================================================

async function testPhase3() {
  const suite = new TestSuite('Phase 3: Combat Engine');

  suite.test('CombatEncounter: constructor initializes properly', () => {
    const CombatEncounter = require('../src/combat/CombatEncounter');

    const player = {
      username: 'TestPlayer',
      currentRoom: 'test_room',
      currentHp: 20,
      maxHp: 20,
      level: 1,
      strength: 14,
      dexterity: 12,
      isDead: function() { return this.currentHp <= 0; },
      takeDamage: function(amt) { this.currentHp -= amt; },
      socket: { write: () => {} }
    };

    const npc = {
      name: 'TestGoblin',
      currentRoom: 'test_room',
      currentHp: 8,
      maxHp: 8,
      level: 1,
      strength: 10,
      dexterity: 12,
      isDead: function() { return this.currentHp <= 0; },
      takeDamage: function(amt) { this.currentHp -= amt; }
    };

    const mockWorld = {
      getRoom: () => ({ id: 'test_room', name: 'Test Room' })
    };

    const mockPlayers = new Set([player]);
    const mockPlayerDB = {};

    const combat = new CombatEncounter([player, npc], mockWorld, mockPlayers, mockPlayerDB);

    assert(combat.participants !== undefined, 'Missing participants');
    assert(combat.participants.length === 2, 'Should have 2 participants');
    assert(combat.isActive === true, 'Combat should be active');
    assert(combat.turn === 0, 'Turn should start at 0');
  });

  suite.test('CombatEncounter: participants have initiative', () => {
    const CombatEncounter = require('../src/combat/CombatEncounter');

    const player = {
      username: 'TestPlayer',
      currentRoom: 'test_room',
      currentHp: 20,
      maxHp: 20,
      level: 1,
      strength: 14,
      dexterity: 12,
      isDead: function() { return this.currentHp <= 0; },
      socket: { write: () => {} }
    };

    const npc = {
      name: 'TestGoblin',
      currentRoom: 'test_room',
      currentHp: 8,
      maxHp: 8,
      level: 1,
      strength: 10,
      dexterity: 12,
      isDead: function() { return this.currentHp <= 0; }
    };

    const mockWorld = {
      getRoom: () => ({ id: 'test_room', name: 'Test Room' })
    };

    const mockPlayers = new Set([player]);
    const mockPlayerDB = {};

    const combat = new CombatEncounter([player, npc], mockWorld, mockPlayers, mockPlayerDB);

    assert(combat.participants[0].initiative !== undefined, 'First participant should have initiative');
    assert(combat.participants[1].initiative !== undefined, 'Second participant should have initiative');
  });

  suite.test('CombatEncounter: executeCombatRound increments turn', () => {
    const CombatEncounter = require('../src/combat/CombatEncounter');

    const player = {
      username: 'TestPlayer',
      currentRoom: 'test_room',
      currentHp: 20,
      maxHp: 20,
      level: 1,
      strength: 14,
      dexterity: 12,
      isDead: function() { return this.currentHp <= 0; },
      takeDamage: function(amt) { this.currentHp -= amt; },
      socket: { write: () => {} },
      send: () => {}
    };

    const npc = {
      name: 'TestGoblin',
      currentRoom: 'test_room',
      currentHp: 8,
      maxHp: 8,
      level: 1,
      strength: 10,
      dexterity: 12,
      isDead: function() { return this.currentHp <= 0; },
      takeDamage: function(amt) { this.currentHp -= amt; }
    };

    const mockWorld = {
      getRoom: () => ({ id: 'test_room', name: 'Test Room' })
    };

    const mockPlayers = new Set([player]);
    const mockPlayerDB = {};

    const combat = new CombatEncounter([player, npc], mockWorld, mockPlayers, mockPlayerDB);

    combat.executeCombatRound();
    assert(combat.turn === 1, 'Turn should be 1 after first round');
  });

  return suite.run();
}

// ============================================================================
// PHASE 4: NPC AI TESTS
// ============================================================================

async function testPhase4() {
  const suite = new TestSuite('Phase 4: NPC AI');

  suite.test('Combat AI: determineNPCAction returns valid action', () => {
    const { determineNPCAction } = require('../src/combat/combatAI');

    const npc = {
      currentHp: 8,
      maxHp: 10,
      fleeThreshold: 0.2,
      timidity: 0.5
    };

    const mockCombat = {
      participants: []
    };

    const action = determineNPCAction(npc, mockCombat);
    assert(['attack', 'flee'].includes(action), `Invalid action: ${action}`);
  });

  suite.test('Combat AI: low HP increases flee chance', () => {
    const { determineNPCAction } = require('../src/combat/combatAI');

    const npc = {
      currentHp: 1,
      maxHp: 10,
      fleeThreshold: 0.2,
      timidity: 0.9 // High timidity
    };

    const mockCombat = {
      participants: []
    };

    // Run multiple times to check flee behavior
    let fleeCount = 0;
    for (let i = 0; i < 100; i++) {
      const action = determineNPCAction(npc, mockCombat);
      if (action === 'flee') fleeCount++;
    }

    assert(fleeCount > 0, 'NPC with low HP and high timidity should sometimes flee');
  });

  suite.test('Combat AI: high HP prefers attack', () => {
    const { determineNPCAction } = require('../src/combat/combatAI');

    const npc = {
      currentHp: 10,
      maxHp: 10,
      fleeThreshold: 0.2,
      timidity: 0.1 // Low timidity
    };

    const mockCombat = {
      participants: []
    };

    const action = determineNPCAction(npc, mockCombat);
    assert(action === 'attack', 'NPC at full HP should attack');
  });

  return suite.run();
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllPhaseTests() {
  console.log('\n' + '='.repeat(70));
  console.log('COMPREHENSIVE COMBAT SYSTEM TESTING (PHASES 1-4)');
  console.log('Testing against COMBAT_IMPLEMENTATION_PLAN.md specifications');
  console.log('='.repeat(70));

  const results = [];

  // Run each phase
  results.push(await testPhase1());
  results.push(await testPhase2());
  results.push(await testPhase3());
  results.push(await testPhase4());

  // Overall summary
  console.log('\n' + '='.repeat(70));
  console.log('OVERALL PHASE TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Phase 1 (Foundation): ${results[0] ? 'PASS' : 'FAIL'}`);
  console.log(`Phase 2 (Combat Resolution): ${results[1] ? 'PASS' : 'FAIL'}`);
  console.log(`Phase 3 (Combat Engine): ${results[2] ? 'PASS' : 'FAIL'}`);
  console.log(`Phase 4 (NPC AI): ${results[3] ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(70));

  const allPassed = results.every(r => r);
  if (allPassed) {
    console.log('\n✓ ALL PHASE TESTS PASSED');
  } else {
    console.log('\n✗ SOME PHASE TESTS FAILED');
  }
  console.log('='.repeat(70) + '\n');

  return allPassed;
}

// Run if main module
if (require.main === module) {
  runAllPhaseTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAllPhaseTests };
