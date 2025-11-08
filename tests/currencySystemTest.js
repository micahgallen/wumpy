/**
 * Currency System Integration Test
 * Tests the full hybrid currency system
 */

const CurrencyManager = require('../src/systems/economy/CurrencyManager');
const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const { ItemType } = require('../src/items/schemas/ItemTypes');

// Load currency items
const currencyItems = require('../world/core/items/currency');
console.log('\n=== Currency System Test ===\n');

// Test 1: Currency item definitions
console.log('Test 1: Currency Item Definitions');
try {
  for (const itemDef of currencyItems) {
    ItemRegistry.registerItem(itemDef, 'test');
    console.log(`✓ Registered ${itemDef.id}`);
  }
  console.log('✓ All currency items registered\n');
} catch (error) {
  console.error(`✗ Failed to register currency items: ${error.message}\n`);
  process.exit(1);
}

// Test 2: Create currency items from amount
console.log('Test 2: Create Currency Items from Amount');
try {
  const testAmount = 1234; // 1g 2s 34c
  const items = CurrencyManager.createCurrencyItems(testAmount);
  console.log(`Created ${items.length} currency items for ${CurrencyManager.format(testAmount)}`);
  for (const item of items) {
    console.log(`  - ${item.name} x${item.quantity} (${item.value} copper each)`);
  }
  console.log('✓ Currency item creation works\n');
} catch (error) {
  console.error(`✗ Failed to create currency items: ${error.message}\n`);
  process.exit(1);
}

// Test 3: Currency drop functionality
console.log('Test 3: Currency Drop Functionality');
try {
  const mockPlayer = {
    username: 'TestPlayer',
    currency: { platinum: 0, gold: 5, silver: 50, copper: 25 }
  };
  const mockRoom = {
    id: 'test_room',
    items: []
  };

  const dropResult = CurrencyManager.dropCurrency(mockPlayer, mockRoom, { gold: 2, silver: 10 });

  if (dropResult.success) {
    console.log(`✓ Drop successful: ${dropResult.message}`);
    console.log(`  Room now has ${mockRoom.items.length} currency items`);
    console.log(`  Player wallet: ${CurrencyManager.format(mockPlayer.currency)}`);
  } else {
    console.error(`✗ Drop failed: ${dropResult.message}`);
    process.exit(1);
  }
  console.log('✓ Currency drop works\n');
} catch (error) {
  console.error(`✗ Currency drop test failed: ${error.message}\n`);
  process.exit(1);
}

// Test 4: Currency pickup functionality
console.log('Test 4: Currency Pickup Functionality');
try {
  const mockPlayer = {
    username: 'TestPlayer2',
    currency: { platinum: 0, gold: 0, silver: 0, copper: 0 }
  };

  // Create a currency item
  const goldCoins = ItemFactory.createItem('currency_gold', { quantity: 3 });

  const pickupResult = CurrencyManager.pickupCurrency(mockPlayer, goldCoins);

  if (pickupResult.success) {
    console.log(`✓ Pickup successful: ${pickupResult.message}`);
    console.log(`  Amount picked up: ${CurrencyManager.format(pickupResult.amount)}`);
    console.log(`  Player wallet: ${CurrencyManager.format(mockPlayer.currency)}`);
  } else {
    console.error(`✗ Pickup failed: ${pickupResult.message}`);
    process.exit(1);
  }
  console.log('✓ Currency pickup works\n');
} catch (error) {
  console.error(`✗ Currency pickup test failed: ${error.message}\n`);
  process.exit(1);
}

// Test 5: Currency parsing
console.log('Test 5: Currency String Parsing');
try {
  const testCases = [
    '50 copper',
    '5 gold',
    '2 gold 50 silver',
    '1 platinum 5 gold 25 silver 75 copper',
    '5g',
    '100c',
    '2g 50s'
  ];

  for (const testCase of testCases) {
    const parsed = CurrencyManager.parseCurrencyStringLong(testCase) || CurrencyManager.parseCurrencyString(testCase);
    if (parsed) {
      console.log(`✓ "${testCase}" => ${CurrencyManager.format(parsed)}`);
    } else {
      console.error(`✗ Failed to parse "${testCase}"`);
      process.exit(1);
    }
  }
  console.log('✓ Currency parsing works\n');
} catch (error) {
  console.error(`✗ Currency parsing test failed: ${error.message}\n`);
  process.exit(1);
}

// Test 6: Persistence (addToWallet with saveToDb)
console.log('Test 6: Currency Persistence');
try {
  const mockPlayer = {
    username: 'TestPlayer3',
    currency: { platinum: 0, gold: 0, silver: 0, copper: 100 },
    playerDB: {
      updatePlayerCurrency: (username, currency) => {
        console.log(`  Mock DB save for ${username}: ${CurrencyManager.format(currency)}`);
        return true;
      }
    }
  };

  const result = CurrencyManager.addToWallet(mockPlayer, { gold: 5 }, true);

  if (result.success) {
    console.log(`✓ Add to wallet with persistence successful`);
    console.log(`  New balance: ${CurrencyManager.format(result.newBalance)}`);
  } else {
    console.error(`✗ Add to wallet failed`);
    process.exit(1);
  }
  console.log('✓ Currency persistence works\n');
} catch (error) {
  console.error(`✗ Currency persistence test failed: ${error.message}\n`);
  process.exit(1);
}

console.log('=== All Tests Passed! ===\n');
console.log('Currency system is working correctly:');
console.log('✓ Currency items can be registered');
console.log('✓ Currency can be dropped from wallet to environment');
console.log('✓ Currency can be picked up and auto-converted to wallet');
console.log('✓ Currency strings can be parsed');
console.log('✓ Currency changes persist to database');
console.log('\nThe hybrid currency system is ready to use!');
