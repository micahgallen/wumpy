/**
 * Currency Drop Bug Test
 *
 * Tests the bug where dropping 1 gold when you only have 105 copper
 * would incorrectly zero out all your money instead of leaving you with 5 copper.
 *
 * Bug: When player has only 105 copper and drops "1 gold", they end up with no money
 * Expected: Should have 5 copper remaining (105 - 100 = 5)
 */

const CurrencyManager = require('../src/systems/economy/CurrencyManager');

console.log('\n=== Currency Drop Bug Test ===\n');

// Test 1: Drop gold when only having copper
console.log('Test 1: Player with 105 copper drops 1 gold');
const player1 = {
  username: 'TestPlayer1',
  currency: { platinum: 0, gold: 0, silver: 0, copper: 105 }
};

const amountToDrop = { platinum: 0, gold: 1, silver: 0, copper: 0 };

console.log(`Before: ${CurrencyManager.format(player1.currency)}`);
console.log(`Dropping: ${CurrencyManager.format(amountToDrop)}`);

const removeResult = CurrencyManager.removeFromWallet(player1, amountToDrop, false);

if (!removeResult.success) {
  console.error('✗ FAILED: Could not remove currency');
  console.error(`  Error: ${removeResult.message}`);
  process.exit(1);
}

console.log(`After: ${CurrencyManager.format(player1.currency)}`);

// Verify player has 5 copper left
if (player1.currency.copper !== 5 ||
    player1.currency.silver !== 0 ||
    player1.currency.gold !== 0 ||
    player1.currency.platinum !== 0) {
  console.error('✗ FAILED: Incorrect remaining balance');
  console.error(`  Expected: 5c`);
  console.error(`  Got: ${CurrencyManager.format(player1.currency)}`);
  process.exit(1);
}

console.log('✓ Correctly left with 5c\n');

// Test 2: Drop silver when only having copper
console.log('Test 2: Player with 37 copper drops 3 silver');
const player2 = {
  username: 'TestPlayer2',
  currency: { platinum: 0, gold: 0, silver: 0, copper: 37 }
};

const amountToDrop2 = { platinum: 0, gold: 0, silver: 3, copper: 0 };

console.log(`Before: ${CurrencyManager.format(player2.currency)}`);
console.log(`Dropping: ${CurrencyManager.format(amountToDrop2)}`);

const removeResult2 = CurrencyManager.removeFromWallet(player2, amountToDrop2, false);

if (!removeResult2.success) {
  console.error('✗ FAILED: Could not remove currency');
  console.error(`  Error: ${removeResult2.message}`);
  process.exit(1);
}

console.log(`After: ${CurrencyManager.format(player2.currency)}`);

// Verify player has 7 copper left (37 - 30 = 7)
if (player2.currency.copper !== 7 ||
    player2.currency.silver !== 0 ||
    player2.currency.gold !== 0 ||
    player2.currency.platinum !== 0) {
  console.error('✗ FAILED: Incorrect remaining balance');
  console.error(`  Expected: 7c`);
  console.error(`  Got: ${CurrencyManager.format(player2.currency)}`);
  process.exit(1);
}

console.log('✓ Correctly left with 7c\n');

// Test 3: Drop platinum when only having copper
console.log('Test 3: Player with 2500 copper drops 2 platinum');
const player3 = {
  username: 'TestPlayer3',
  currency: { platinum: 0, gold: 0, silver: 0, copper: 2500 }
};

const amountToDrop3 = { platinum: 2, gold: 0, silver: 0, copper: 0 };

console.log(`Before: ${CurrencyManager.format(player3.currency)}`);
console.log(`Dropping: ${CurrencyManager.format(amountToDrop3)}`);

const removeResult3 = CurrencyManager.removeFromWallet(player3, amountToDrop3, false);

if (!removeResult3.success) {
  console.error('✗ FAILED: Could not remove currency');
  console.error(`  Error: ${removeResult3.message}`);
  process.exit(1);
}

console.log(`After: ${CurrencyManager.format(player3.currency)}`);

// Verify player has 500 copper left (2500 - 2000 = 500)
// 500 copper should auto-convert to 5 gold
const expectedCopper = CurrencyManager.toCopper(player3.currency);
if (expectedCopper !== 500) {
  console.error('✗ FAILED: Incorrect remaining balance');
  console.error(`  Expected total: 500c`);
  console.error(`  Got total: ${expectedCopper}c (${CurrencyManager.format(player3.currency)})`);
  process.exit(1);
}

console.log(`✓ Correctly left with 500c worth (${CurrencyManager.format(player3.currency)})\n`);

// Test 4: Try to drop more than you have (should fail)
console.log('Test 4: Player with 50 copper tries to drop 1 gold (should fail)');
const player4 = {
  username: 'TestPlayer4',
  currency: { platinum: 0, gold: 0, silver: 0, copper: 50 }
};

const amountToDrop4 = { platinum: 0, gold: 1, silver: 0, copper: 0 };

console.log(`Before: ${CurrencyManager.format(player4.currency)}`);
console.log(`Trying to drop: ${CurrencyManager.format(amountToDrop4)}`);

const removeResult4 = CurrencyManager.removeFromWallet(player4, amountToDrop4, false);

if (removeResult4.success) {
  console.error('✗ FAILED: Should not have been able to drop (insufficient funds)');
  process.exit(1);
}

console.log(`After: ${CurrencyManager.format(player4.currency)}`);
console.log(`✓ Correctly rejected (insufficient funds)\n`);

// Verify player still has 50 copper
if (player4.currency.copper !== 50) {
  console.error('✗ FAILED: Currency was changed even though drop should have failed');
  process.exit(1);
}

console.log('=== All Tests Passed! ===\n');
console.log('The currency drop bug has been fixed:');
console.log('✓ Can drop higher denominations when only having copper');
console.log('✓ Correct change is returned');
console.log('✓ Auto-conversion happens properly');
console.log('✓ Insufficient funds are properly detected\n');
