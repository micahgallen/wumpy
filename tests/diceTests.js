/**
 * Unit Tests for Dice Utilities
 */

const { TestRunner, assert } = require('./testRunner');
const {
  parseDiceString,
  rollDie,
  rollD20,
  rollDice,
  rollDamage,
  rollAttack,
  isValidDiceString,
  getAverageDiceValue
} = require('../src/utils/dice');

const runner = new TestRunner('Dice Utilities Tests');

// Test parseDiceString
runner.test('parseDiceString - valid simple dice', () => {
  const result = parseDiceString('1d6');
  assert.notNull(result);
  assert.equal(result.count, 1);
  assert.equal(result.sides, 6);
  assert.equal(result.modifier, 0);
});

runner.test('parseDiceString - valid dice with positive modifier', () => {
  const result = parseDiceString('2d8+3');
  assert.notNull(result);
  assert.equal(result.count, 2);
  assert.equal(result.sides, 8);
  assert.equal(result.modifier, 3);
});

runner.test('parseDiceString - valid dice with negative modifier', () => {
  const result = parseDiceString('1d20-2');
  assert.notNull(result);
  assert.equal(result.count, 1);
  assert.equal(result.sides, 20);
  assert.equal(result.modifier, -2);
});

runner.test('parseDiceString - invalid format', () => {
  const result = parseDiceString('invalid');
  assert.isNull(result);
});

runner.test('parseDiceString - count out of range (too low)', () => {
  const result = parseDiceString('0d6');
  assert.isNull(result);
});

runner.test('parseDiceString - count out of range (too high)', () => {
  const result = parseDiceString('101d6');
  assert.isNull(result);
});

runner.test('parseDiceString - sides out of range', () => {
  const result = parseDiceString('1d1');
  assert.isNull(result);
});

// Test rollDie
runner.test('rollDie - returns value in range', () => {
  for (let i = 0; i < 100; i++) {
    const result = rollDie(6);
    assert.inRange(result, 1, 6);
  }
});

runner.test('rollDie - d20 returns value in range', () => {
  for (let i = 0; i < 100; i++) {
    const result = rollDie(20);
    assert.inRange(result, 1, 20);
  }
});

// Test rollD20
runner.test('rollD20 - returns value between 1 and 20', () => {
  for (let i = 0; i < 100; i++) {
    const result = rollD20();
    assert.inRange(result, 1, 20);
  }
});

// Test rollDice
runner.test('rollDice - simple dice notation', () => {
  const result = rollDice('1d6');
  assert.inRange(result, 1, 6);
});

runner.test('rollDice - multiple dice', () => {
  const result = rollDice('3d6');
  assert.inRange(result, 3, 18);
});

runner.test('rollDice - with modifier', () => {
  const result = rollDice('1d6+5');
  assert.inRange(result, 6, 11);
});

// Test rollDamage
runner.test('rollDamage - normal hit', () => {
  const result = rollDamage('1d6', false);
  assert.inRange(result, 1, 6);
});

runner.test('rollDamage - critical hit doubles dice', () => {
  // Critical should roll 2d6 instead of 1d6
  const result = rollDamage('1d6', true);
  assert.inRange(result, 2, 12);
});

runner.test('rollDamage - minimum 1 damage', () => {
  const result = rollDamage('1d4-10', false);
  assert.equal(result, 1, 'Damage should be at least 1');
});

// Test rollAttack
runner.test('rollAttack - normal roll', () => {
  const result = rollAttack('normal');
  assert.equal(result.rolls.length, 1);
  assert.inRange(result.natural, 1, 20);
  assert.equal(result.total, result.natural);
});

runner.test('rollAttack - advantage rolls twice', () => {
  const result = rollAttack('advantage');
  assert.equal(result.rolls.length, 2);
  assert.inRange(result.natural, 1, 20);
  // Natural should be max of the two rolls
  assert.true(result.natural === Math.max(...result.rolls));
});

runner.test('rollAttack - disadvantage rolls twice', () => {
  const result = rollAttack('disadvantage');
  assert.equal(result.rolls.length, 2);
  assert.inRange(result.natural, 1, 20);
  // Natural should be min of the two rolls
  assert.true(result.natural === Math.min(...result.rolls));
});

// Test isValidDiceString
runner.test('isValidDiceString - valid strings', () => {
  assert.true(isValidDiceString('1d6'));
  assert.true(isValidDiceString('2d8+3'));
  assert.true(isValidDiceString('1d20-2'));
});

runner.test('isValidDiceString - invalid strings', () => {
  assert.false(isValidDiceString('invalid'));
  assert.false(isValidDiceString('1d'));
  assert.false(isValidDiceString('d6'));
});

// Test getAverageDiceValue
runner.test('getAverageDiceValue - 1d6 average is 3.5', () => {
  const result = getAverageDiceValue('1d6');
  assert.equal(result, 3.5);
});

runner.test('getAverageDiceValue - 2d6 average is 7', () => {
  const result = getAverageDiceValue('2d6');
  assert.equal(result, 7);
});

runner.test('getAverageDiceValue - with modifier', () => {
  const result = getAverageDiceValue('1d6+3');
  assert.equal(result, 6.5);
});

// Run tests if this is the main module
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;
