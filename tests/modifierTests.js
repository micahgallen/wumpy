/**
 * Unit Tests for Modifier Utilities
 */

const { TestRunner, assert } = require('./testRunner');
const {
  getModifier,
  calculateProficiency,
  calculateArmorClass,
  calculateAttackBonus,
  calculateInitiative,
  isHit,
  isCriticalHit,
  isCriticalMiss,
  calculateNetAdvantage,
  applyDamageMultiplier,
  isValidAbilityScore,
  isValidLevel
} = require('../src/utils/modifiers');

const runner = new TestRunner('Modifier Utilities Tests');

// Test getModifier
runner.test('getModifier - score 10 gives +0', () => {
  assert.equal(getModifier(10), 0);
});

runner.test('getModifier - score 8 gives -1', () => {
  assert.equal(getModifier(8), -1);
});

runner.test('getModifier - score 12 gives +1', () => {
  assert.equal(getModifier(12), 1);
});

runner.test('getModifier - score 14 gives +2', () => {
  assert.equal(getModifier(14), 2);
});

runner.test('getModifier - score 20 gives +5', () => {
  assert.equal(getModifier(20), 5);
});

runner.test('getModifier - score 3 gives -4', () => {
  assert.equal(getModifier(3), -4);
});

// Test calculateProficiency
runner.test('calculateProficiency - level 1 gives +2', () => {
  assert.equal(calculateProficiency(1), 2);
});

runner.test('calculateProficiency - level 4 gives +2', () => {
  assert.equal(calculateProficiency(4), 2);
});

runner.test('calculateProficiency - level 5 gives +3', () => {
  assert.equal(calculateProficiency(5), 3);
});

runner.test('calculateProficiency - level 9 gives +4', () => {
  assert.equal(calculateProficiency(9), 4);
});

runner.test('calculateProficiency - level 13 gives +5', () => {
  assert.equal(calculateProficiency(13), 5);
});

// Test calculateArmorClass
runner.test('calculateArmorClass - base AC with 10 DEX', () => {
  assert.equal(calculateArmorClass(10, 0), 10);
});

runner.test('calculateArmorClass - AC with 14 DEX (+2)', () => {
  assert.equal(calculateArmorClass(14, 0), 12);
});

runner.test('calculateArmorClass - AC with armor bonus', () => {
  assert.equal(calculateArmorClass(14, 3), 15);
});

// Test calculateAttackBonus
runner.test('calculateAttackBonus - STR 14, Prof +2', () => {
  assert.equal(calculateAttackBonus(14, 2), 4); // +2 STR mod + 2 prof
});

runner.test('calculateAttackBonus - STR 10, Prof +2', () => {
  assert.equal(calculateAttackBonus(10, 2), 2); // +0 STR mod + 2 prof
});

// Test calculateInitiative
runner.test('calculateInitiative - DEX 14 gives +2', () => {
  assert.equal(calculateInitiative(14), 2);
});

runner.test('calculateInitiative - DEX 10 gives +0', () => {
  assert.equal(calculateInitiative(10), 0);
});

// Test isHit
runner.test('isHit - attack equals AC is a hit', () => {
  assert.true(isHit(14, 14));
});

runner.test('isHit - attack exceeds AC is a hit', () => {
  assert.true(isHit(15, 14));
});

runner.test('isHit - attack below AC is a miss', () => {
  assert.false(isHit(13, 14));
});

// Test isCriticalHit
runner.test('isCriticalHit - natural 20 is critical', () => {
  assert.true(isCriticalHit(20));
});

runner.test('isCriticalHit - natural 19 is not critical', () => {
  assert.false(isCriticalHit(19));
});

// Test isCriticalMiss
runner.test('isCriticalMiss - natural 1 is critical miss', () => {
  assert.true(isCriticalMiss(1));
});

runner.test('isCriticalMiss - natural 2 is not critical miss', () => {
  assert.false(isCriticalMiss(2));
});

// Test calculateNetAdvantage
runner.test('calculateNetAdvantage - no advantage or disadvantage', () => {
  assert.equal(calculateNetAdvantage(0, 0), 'normal');
});

runner.test('calculateNetAdvantage - advantage only', () => {
  assert.equal(calculateNetAdvantage(1, 0), 'advantage');
});

runner.test('calculateNetAdvantage - disadvantage only', () => {
  assert.equal(calculateNetAdvantage(0, 1), 'disadvantage');
});

runner.test('calculateNetAdvantage - equal counts cancel out', () => {
  assert.equal(calculateNetAdvantage(1, 1), 'normal');
});

runner.test('calculateNetAdvantage - multiple advantage wins', () => {
  assert.equal(calculateNetAdvantage(2, 1), 'advantage');
});

// Test applyDamageMultiplier
runner.test('applyDamageMultiplier - resistance (0.5x)', () => {
  assert.equal(applyDamageMultiplier(10, 0.5), 5);
});

runner.test('applyDamageMultiplier - vulnerability (2x)', () => {
  assert.equal(applyDamageMultiplier(10, 2.0), 20);
});

runner.test('applyDamageMultiplier - normal damage', () => {
  assert.equal(applyDamageMultiplier(10, 1.0), 10);
});

runner.test('applyDamageMultiplier - rounding', () => {
  assert.equal(applyDamageMultiplier(7, 0.5), 4); // Rounds 3.5 to 4
});

// Test isValidAbilityScore
runner.test('isValidAbilityScore - valid scores', () => {
  assert.true(isValidAbilityScore(1));
  assert.true(isValidAbilityScore(10));
  assert.true(isValidAbilityScore(20));
  assert.true(isValidAbilityScore(30));
});

runner.test('isValidAbilityScore - invalid scores', () => {
  assert.false(isValidAbilityScore(0));
  assert.false(isValidAbilityScore(31));
  assert.false(isValidAbilityScore(-1));
});

// Test isValidLevel
runner.test('isValidLevel - valid levels', () => {
  assert.true(isValidLevel(1));
  assert.true(isValidLevel(20));
  assert.true(isValidLevel(50));
});

runner.test('isValidLevel - invalid levels', () => {
  assert.false(isValidLevel(0));
  assert.false(isValidLevel(51));
  assert.false(isValidLevel(1.5)); // Not an integer
});

// Run tests if this is the main module
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;
