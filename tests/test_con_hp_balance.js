/**
 * CON-Based HP Scaling and Combat Balance Test Suite
 * Tests the new HP formula and TTK improvements
 */

const { getModifier } = require('../src/progression/statProgression');
const { rollDice } = require('../src/utils/dice');
const { getDamageDice, rollDamage, rollAttack, applyDamage } = require('../src/combat/combatResolver');

// Test colors
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[36m${text}\x1b[0m`,
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(colors.green('✓') + ' ' + testName);
    testsPassed++;
  } else {
    console.log(colors.red('✗') + ' ' + testName);
    testsFailed++;
  }
}

function assertEquals(actual, expected, testName) {
  if (actual === expected) {
    console.log(colors.green('✓') + ' ' + testName);
    testsPassed++;
  } else {
    console.log(colors.red('✗') + ` ${testName} (expected: ${expected}, got: ${actual})`);
    testsFailed++;
  }
}

function assertRange(value, min, max, testName) {
  if (value >= min && value <= max) {
    console.log(colors.green('✓') + ` ${testName} (value: ${value})`);
    testsPassed++;
  } else {
    console.log(colors.red('✗') + ` ${testName} (expected: ${min}-${max}, got: ${value})`);
    testsFailed++;
  }
}

// Mock Player class for testing
class MockPlayer {
  constructor(level, constitution, strength = 10, dexterity = 10) {
    this.level = level;
    this.constitution = constitution;
    this.strength = strength;
    this.dexterity = dexterity;
    this.socket = {}; // Has socket to enable lastDamageTaken tracking

    // Calculate HP using new formula
    const conMod = Math.floor((this.constitution - 10) / 2);
    this.maxHp = 15 + conMod + (this.level - 1) * Math.max(1, 4 + conMod);
    this.hp = this.maxHp;
    this.resistances = {};
    this.lastDamageTaken = 0;
  }

  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
  }

  isDead() {
    return this.hp <= 0;
  }

  reset() {
    this.hp = this.maxHp;
    this.lastDamageTaken = 0;
  }
}

console.log('\n' + colors.blue('='.repeat(60)));
console.log(colors.blue('CON-Based HP Scaling and Combat Balance Tests'));
console.log(colors.blue('='.repeat(60)) + '\n');

// =========================
// Test 1: Starting HP with CON Modifier
// =========================
console.log(colors.yellow('\n--- Test 1: Starting HP with CON Modifier ---'));

const player_con10 = new MockPlayer(1, 10);
assertEquals(player_con10.maxHp, 15, 'L1 player with CON 10 should have 15 HP');

const player_con14 = new MockPlayer(1, 14);
assertEquals(player_con14.maxHp, 17, 'L1 player with CON 14 should have 17 HP (15 + 2)');

const player_con16 = new MockPlayer(1, 16);
assertEquals(player_con16.maxHp, 18, 'L1 player with CON 16 should have 18 HP (15 + 3)');

const player_con8 = new MockPlayer(1, 8);
assertEquals(player_con8.maxHp, 14, 'L1 player with CON 8 should have 14 HP (15 - 1)');

const player_con6 = new MockPlayer(1, 6);
assertEquals(player_con6.maxHp, 13, 'L1 player with CON 6 should have 13 HP (15 - 2)');

// =========================
// Test 2: HP Gains on Level-Up
// =========================
console.log(colors.yellow('\n--- Test 2: HP Gains on Level-Up ---'));

// L2 with CON 10: 15 + 0 + (2-1) * (4 + 0) = 15 + 4 = 19
const player_l2_con10 = new MockPlayer(2, 10);
assertEquals(player_l2_con10.maxHp, 19, 'L2 player with CON 10 should have 19 HP');

// L2 with CON 14: 15 + 2 + (2-1) * (4 + 2) = 17 + 6 = 23
const player_l2_con14 = new MockPlayer(2, 14);
assertEquals(player_l2_con14.maxHp, 23, 'L2 player with CON 14 should have 23 HP');

// L5 with CON 10: 15 + 0 + (5-1) * (4 + 0) = 15 + 16 = 31
const player_l5_con10 = new MockPlayer(5, 10);
assertEquals(player_l5_con10.maxHp, 31, 'L5 player with CON 10 should have 31 HP');

// L5 with CON 14: 15 + 2 + (5-1) * (4 + 2) = 17 + 24 = 41
const player_l5_con14 = new MockPlayer(5, 14);
assertEquals(player_l5_con14.maxHp, 41, 'L5 player with CON 14 should have 41 HP');

// L10 with CON 10: 15 + 0 + (10-1) * (4 + 0) = 15 + 36 = 51
const player_l10_con10 = new MockPlayer(10, 10);
assertEquals(player_l10_con10.maxHp, 51, 'L10 player with CON 10 should have 51 HP');

// L10 with CON 14: 15 + 2 + (10-1) * (4 + 2) = 17 + 54 = 71
const player_l10_con14 = new MockPlayer(10, 14);
assertEquals(player_l10_con14.maxHp, 71, 'L10 player with CON 14 should have 71 HP');

// =========================
// Test 3: Unarmed Damage (1d4 + STR)
// =========================
console.log(colors.yellow('\n--- Test 3: Unarmed Damage (1d4 + STR) ---'));

const damageDice = getDamageDice({ equippedWeapon: null });
assertEquals(damageDice, '1d4', 'Unarmed attacks should use 1d4 dice');

// Test damage rolls with different STR modifiers
const attacker_str10 = new MockPlayer(1, 10, 10);
const attacker_str14 = new MockPlayer(1, 10, 14);
const attacker_str18 = new MockPlayer(1, 10, 18);

// Run multiple damage rolls to verify range
console.log(colors.blue('\nDamage roll samples (STR 10, 1d4 + 0):'));
for (let i = 0; i < 5; i++) {
  const damage = rollDamage(attacker_str10, '1d4', false);
  assertRange(damage, 1, 4, `  Sample ${i + 1}: damage in range 1-4`);
}

console.log(colors.blue('\nDamage roll samples (STR 14, 1d4 + 2):'));
for (let i = 0; i < 5; i++) {
  const damage = rollDamage(attacker_str14, '1d4', false);
  assertRange(damage, 3, 6, `  Sample ${i + 1}: damage in range 3-6`);
}

// =========================
// Test 4: TTK Simulation
// =========================
console.log(colors.yellow('\n--- Test 4: TTK (Time To Kill) Simulation ---'));

function simulateCombat(attacker, defender, numSimulations = 1000) {
  let totalRounds = 0;
  let totalTime = 0;

  for (let i = 0; i < numSimulations; i++) {
    attacker.reset();
    defender.reset();
    let rounds = 0;

    // Simulate combat until one dies
    while (!defender.isDead() && rounds < 100) {
      rounds++;

      // Roll attack
      const attackResult = rollAttack(attacker, defender);

      if (attackResult.hit) {
        const damageDice = getDamageDice(attacker);
        const damage = rollDamage(attacker, damageDice, attackResult.critical);
        applyDamage(defender, damage, 'physical');
      }
    }

    totalRounds += rounds;
    totalTime += rounds * 3; // 3 seconds per round
  }

  const avgRounds = totalRounds / numSimulations;
  const avgTime = totalTime / numSimulations;

  return { avgRounds, avgTime };
}

// L1 vs L1 (CON 10, STR 10)
console.log(colors.blue('\nL1 vs L1 (CON 10, STR 10):'));
const l1_attacker = new MockPlayer(1, 10, 10, 10);
const l1_defender = new MockPlayer(1, 10, 10, 10);
const l1_result = simulateCombat(l1_attacker, l1_defender);
console.log(`  Average rounds: ${l1_result.avgRounds.toFixed(2)}`);
console.log(`  Average time: ${l1_result.avgTime.toFixed(2)}s`);
assertRange(l1_result.avgRounds, 6, 12, 'L1 vs L1 TTK should be 6-12 rounds');
assertRange(l1_result.avgTime, 18, 36, 'L1 vs L1 time should be 18-36 seconds');

// L5 vs L5 (CON 10, STR 12)
console.log(colors.blue('\nL5 vs L5 (CON 10, STR 12):'));
const l5_attacker = new MockPlayer(5, 10, 12, 10);
const l5_defender = new MockPlayer(5, 10, 12, 10);
const l5_result = simulateCombat(l5_attacker, l5_defender);
console.log(`  Average rounds: ${l5_result.avgRounds.toFixed(2)}`);
console.log(`  Average time: ${l5_result.avgTime.toFixed(2)}s`);
assertRange(l5_result.avgRounds, 6, 14, 'L5 vs L5 TTK should be 6-14 rounds');
assertRange(l5_result.avgTime, 18, 42, 'L5 vs L5 time should be 18-42 seconds');

// L10 vs L10 (CON 10, STR 14)
console.log(colors.blue('\nL10 vs L10 (CON 10, STR 14):'));
const l10_attacker = new MockPlayer(10, 10, 14, 10);
const l10_defender = new MockPlayer(10, 10, 14, 10);
const l10_result = simulateCombat(l10_attacker, l10_defender);
console.log(`  Average rounds: ${l10_result.avgRounds.toFixed(2)}`);
console.log(`  Average time: ${l10_result.avgTime.toFixed(2)}s`);
assertRange(l10_result.avgRounds, 6, 15, 'L10 vs L10 TTK should be 6-15 rounds');
assertRange(l10_result.avgTime, 18, 45, 'L10 vs L10 time should be 18-45 seconds');

// High CON builds (L5, CON 14 vs CON 10)
console.log(colors.blue('\nL5 High CON (CON 14) vs L5 Normal (CON 10):'));
const l5_highcon = new MockPlayer(5, 14, 12, 10);
const l5_normalcon = new MockPlayer(5, 10, 12, 10);
const highcon_result = simulateCombat(l5_normalcon, l5_highcon);
console.log(`  Average rounds to kill high CON: ${highcon_result.avgRounds.toFixed(2)}`);
console.log(`  HP difference: ${l5_highcon.maxHp} vs ${l5_normalcon.maxHp}`);
assert(l5_highcon.maxHp > l5_normalcon.maxHp, 'High CON player should have more HP');
assert(highcon_result.avgRounds > l5_result.avgRounds, 'High CON player should take longer to kill');

// =========================
// Test 5: lastDamageTaken Tracking
// =========================
console.log(colors.yellow('\n--- Test 5: lastDamageTaken Tracking ---'));

const player_damage_tracking = new MockPlayer(1, 10, 10, 10);
assertEquals(player_damage_tracking.lastDamageTaken, 0, 'Initial lastDamageTaken should be 0');

// Apply damage and check timestamp
const beforeTime = Date.now();
applyDamage(player_damage_tracking, 5, 'physical');
const afterTime = Date.now();

assert(
  player_damage_tracking.lastDamageTaken >= beforeTime &&
  player_damage_tracking.lastDamageTaken <= afterTime,
  'lastDamageTaken should be updated with current timestamp'
);

// Player without socket should not track damage time
const npc = {
  hp: 20,
  maxHp: 20,
  resistances: {},
  takeDamage: function(damage) { this.hp -= damage; },
  isDead: function() { return this.hp <= 0; }
};
applyDamage(npc, 5, 'physical');
assert(!npc.lastDamageTaken, 'NPCs without socket should not track lastDamageTaken');

// =========================
// Test Results Summary
// =========================
console.log('\n' + colors.blue('='.repeat(60)));
console.log(colors.blue('Test Results Summary'));
console.log(colors.blue('='.repeat(60)));
console.log(colors.green(`Passed: ${testsPassed}`));
console.log(colors.red(`Failed: ${testsFailed}`));
console.log(colors.blue('='.repeat(60)) + '\n');

if (testsFailed === 0) {
  console.log(colors.green('All tests passed! ✓\n'));
  process.exit(0);
} else {
  console.log(colors.red(`${testsFailed} test(s) failed.\n`));
  process.exit(1);
}
