/**
 * Currency Pickup Value Test
 * Tests that picking up currency items calculates the correct copper value
 */

const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const CurrencyManager = require('../src/systems/economy/CurrencyManager');

// Load currency items
const currencyItems = require('../world/core/items/currency');
console.log('\n=== Currency Pickup Value Test ===\n');

// Register currency items
for (const itemDef of currencyItems) {
  ItemRegistry.registerItem(itemDef, 'test');
}

// Test each currency type
const testCases = [
  { id: 'currency_copper', quantity: 1, expectedCopper: 1, expectedFormat: '1c' },
  { id: 'currency_copper', quantity: 50, expectedCopper: 50, expectedFormat: '50c' },
  { id: 'currency_silver', quantity: 1, expectedCopper: 10, expectedFormat: '10c' },
  { id: 'currency_silver', quantity: 5, expectedCopper: 50, expectedFormat: '50c' },
  { id: 'currency_gold', quantity: 1, expectedCopper: 100, expectedFormat: '1s' },
  { id: 'currency_gold', quantity: 5, expectedCopper: 500, expectedFormat: '5s' },
  { id: 'currency_platinum', quantity: 1, expectedCopper: 1000, expectedFormat: '1g' },
  { id: 'currency_platinum', quantity: 5, expectedCopper: 5000, expectedFormat: '5g' },
];

for (const testCase of testCases) {
  const item = ItemFactory.createItem(testCase.id, { quantity: testCase.quantity });

  // Calculate copper value using the same logic as onPickup
  const copperAmount = (item.quantity || 1) * item.value;

  if (copperAmount === testCase.expectedCopper) {
    console.log(`✓ ${item.name} x${testCase.quantity} = ${copperAmount}c (${CurrencyManager.format(copperAmount)})`);
  } else {
    console.error(`✗ FAILED: ${item.name} x${testCase.quantity}`);
    console.error(`  Expected: ${testCase.expectedCopper}c, Got: ${copperAmount}c`);
    console.error(`  Item value: ${item.value}, Quantity: ${item.quantity}`);
    process.exit(1);
  }
}

console.log('\n=== All Currency Value Tests Passed! ===\n');
console.log('Currency items correctly calculate copper values:');
console.log('✓ Copper: 1 copper per coin');
console.log('✓ Silver: 10 copper per coin');
console.log('✓ Gold: 100 copper per coin');
console.log('✓ Platinum: 1000 copper per coin');
