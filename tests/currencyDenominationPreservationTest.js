/**
 * Currency Denomination Preservation Test
 * Tests that picking up currency preserves denominations instead of auto-converting
 */

const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const CurrencyManager = require('../src/systems/economy/CurrencyManager');

// Load currency items
const currencyItems = require('../world/core/items/currency');
console.log('\n=== Currency Denomination Preservation Test ===\n');

// Register currency items
for (const itemDef of currencyItems) {
  ItemRegistry.registerItem(itemDef, 'test');
}

// Create mock player
const mockPlayer = {
  username: 'testplayer',
  currency: { platinum: 950, gold: 9, silver: 0, copper: 51 },
  playerDB: null // No DB for test
};

console.log('Initial wallet: 950p 9g 51c');

// Simulate dropping 15 copper
const dropResult = CurrencyManager.removeFromWallet(mockPlayer, { copper: 15 }, false);
console.log(`After dropping 15 copper: ${CurrencyManager.format(mockPlayer.currency)}`);

if (mockPlayer.currency.copper !== 36) {
  console.error(`✗ FAILED: Expected 36 copper after drop, got ${mockPlayer.currency.copper}`);
  process.exit(1);
}

console.log('✓ Drop preserved denominations correctly\n');

// Simulate picking up 1 copper coin
const copperCoin = ItemFactory.createItem('currency_copper', { quantity: 1 });
const itemDef = ItemRegistry.getItem('currency_copper');

// This simulates what happens in get.js + currency.js onPickup
const currencyToAdd = {
  platinum: 0,
  gold: 0,
  silver: 0,
  copper: 1
};

CurrencyManager.addToWalletExact(mockPlayer, currencyToAdd, false);

console.log(`After picking up 1 copper: ${CurrencyManager.format(mockPlayer.currency)}`);

// Verify the wallet
const expected = { platinum: 950, gold: 9, silver: 0, copper: 37 };
const actual = mockPlayer.currency;

if (actual.platinum !== expected.platinum ||
    actual.gold !== expected.gold ||
    actual.silver !== expected.silver ||
    actual.copper !== expected.copper) {
  console.error(`\n✗ FAILED: Denomination auto-conversion bug detected!`);
  console.error(`  Expected: ${CurrencyManager.format(expected)}`);
  console.error(`  Got:      ${CurrencyManager.format(actual)}`);
  console.error(`  Breakdown: ${actual.platinum}p ${actual.gold}g ${actual.silver}s ${actual.copper}c`);
  process.exit(1);
}

console.log('\n✓ Denomination preservation works correctly!');
console.log('✓ Wallet correctly shows 950p 9g 37c (not auto-converted to 3s 7c)');
console.log('\n=== All Denomination Preservation Tests Passed! ===');
