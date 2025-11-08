/**
 * Currency Drop Command Test
 * Tests the drop command currency detection logic
 */

const CurrencyManager = require('../src/systems/economy/CurrencyManager');

console.log('\n=== Currency Drop Pattern Tests ===\n');

// Test patterns
const testCases = [
  { input: 'birdseed', shouldBeCurrency: false, expectedAmount: null, description: 'Regular item' },
  { input: 'battleaxe', shouldBeCurrency: false, expectedAmount: null, description: 'Regular item' },
  { input: 'copper', shouldBeCurrency: true, expectedAmount: '1c', description: 'Drop 1 copper (default)' },
  { input: 'gold', shouldBeCurrency: true, expectedAmount: '1g', description: 'Drop 1 gold (default)' },
  { input: 'all copper', shouldBeCurrency: true, expectedAmount: '500c', description: 'Drop all copper (explicit)' },
  { input: '50 copper', shouldBeCurrency: true, expectedAmount: '50c', description: 'Drop 50 copper' },
  { input: '5g', shouldBeCurrency: true, expectedAmount: '5g', description: 'Drop 5 gold (short)' },
  { input: '2g 50s', shouldBeCurrency: true, expectedAmount: '2g 50s', description: 'Drop 2g 50s' },
  { input: 'c', shouldBeCurrency: true, expectedAmount: '1c', description: 'Drop 1 copper (short)' },
  { input: 'g', shouldBeCurrency: true, expectedAmount: '1g', description: 'Drop 1 gold (short)' },
  { input: 'all g', shouldBeCurrency: true, expectedAmount: '50g', description: 'Drop all gold (short explicit)' }
];

// Mock player with currency
const mockPlayer = {
  username: 'TestPlayer',
  currency: { platinum: 10, gold: 50, silver: 100, copper: 500 }
};

for (const testCase of testCases) {
  const fullInput = testCase.input;

  // Simulate the drop command logic
  let currencyAmount = null;

  // Check for "drop all <currency>" (drops all of that type)
  const dropAllCurrencyMatch = fullInput.match(/^all\s+(platinum|gold|silver|copper|p|g|s|c)$/i);
  if (dropAllCurrencyMatch) {
    const currencyType = dropAllCurrencyMatch[1].toLowerCase();
    const wallet = CurrencyManager.getWallet(mockPlayer);

    // Map short forms to full names
    const typeMap = { p: 'platinum', g: 'gold', s: 'silver', c: 'copper' };
    const fullType = typeMap[currencyType] || currencyType;

    const amount = wallet[fullType] || 0;
    if (amount > 0) {
      currencyAmount = { platinum: 0, gold: 0, silver: 0, copper: 0 };
      currencyAmount[fullType] = amount;
    }
  }
  // Check for "drop <currency>" without number (drops 1)
  else if (fullInput.match(/^(platinum|gold|silver|copper|p|g|s|c)$/i)) {
    const currencyType = fullInput.toLowerCase();
    const typeMap = { p: 'platinum', g: 'gold', s: 'silver', c: 'copper' };
    const fullType = typeMap[currencyType] || currencyType;

    currencyAmount = { platinum: 0, gold: 0, silver: 0, copper: 0 };
    currencyAmount[fullType] = 1; // Drop 1 of this type
  }
  // Otherwise try parsing as currency with amounts
  else {
    // Try parsing as currency with full names first
    currencyAmount = CurrencyManager.parseCurrencyStringLong(fullInput);

    // If not successful, try short format
    if (!currencyAmount) {
      currencyAmount = CurrencyManager.parseCurrencyString(fullInput);
    }
  }

  // Check if we actually have a valid currency amount
  const hasValidCurrencyAmount = currencyAmount &&
    (currencyAmount.platinum > 0 || currencyAmount.gold > 0 ||
     currencyAmount.silver > 0 || currencyAmount.copper > 0);

  const isCurrency = hasValidCurrencyAmount;

  const amountStr = currencyAmount ? CurrencyManager.format(currencyAmount) : 'N/A';

  if (isCurrency === testCase.shouldBeCurrency) {
    // Also check the amount if currency
    if (isCurrency && testCase.expectedAmount && amountStr !== testCase.expectedAmount) {
      console.error(`✗ FAILED: "${testCase.input}" - ${testCase.description}`);
      console.error(`  Expected amount: ${testCase.expectedAmount}, Got: ${amountStr}`);
      process.exit(1);
    }

    console.log(`✓ "${testCase.input}" - ${testCase.description}`);
    console.log(`  Currency: ${isCurrency ? 'YES' : 'NO'}, Amount: ${amountStr}`);
  } else {
    console.error(`✗ FAILED: "${testCase.input}" - ${testCase.description}`);
    console.error(`  Expected currency: ${testCase.shouldBeCurrency}, Got: ${isCurrency}`);
    process.exit(1);
  }
}

console.log('\n=== All Pattern Tests Passed! ===\n');
console.log('The drop command correctly identifies:');
console.log('✓ Regular items (not intercepted by currency parser)');
console.log('✓ Currency drop commands with amounts');
console.log('✓ Currency drop without amount (drops 1, matching stackable item behavior)');
console.log('✓ "drop all <currency>" (drops all of that type)');
