/**
 * Currency Stacking Test
 * Tests that dropped currency items stack properly in rooms
 */

const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const CurrencyManager = require('../src/systems/economy/CurrencyManager');

// Load currency items
const currencyItems = require('../world/core/items/currency');
console.log('\n=== Currency Stacking Test ===\n');

// Register currency items
for (const itemDef of currencyItems) {
  ItemRegistry.registerItem(itemDef, 'test');
}

// Create mock player and room
const mockPlayer = {
  username: 'testplayer',
  currency: { platinum: 100, gold: 0, silver: 0, copper: 0 },
  playerDB: null
};

const mockRoom = {
  id: 'test_room',
  items: []
};

console.log('Test 1: Drop 1 platinum three times - should create single stack of 3');
console.log('─'.repeat(60));

// Drop 1 platinum
CurrencyManager.dropCurrency(mockPlayer, mockRoom, { platinum: 1, gold: 0, silver: 0, copper: 0 });
console.log(`After 1st drop: ${mockRoom.items.length} item(s) in room`);
if (mockRoom.items.length === 1 && mockRoom.items[0].quantity === 1) {
  console.log(`  ✓ Platinum stack: x${mockRoom.items[0].quantity}`);
} else {
  console.error(`  ✗ Expected 1 item with quantity 1`);
  process.exit(1);
}

// Drop another 1 platinum - should stack
CurrencyManager.dropCurrency(mockPlayer, mockRoom, { platinum: 1, gold: 0, silver: 0, copper: 0 });
console.log(`After 2nd drop: ${mockRoom.items.length} item(s) in room`);
if (mockRoom.items.length === 1 && mockRoom.items[0].quantity === 2) {
  console.log(`  ✓ Platinum stack: x${mockRoom.items[0].quantity}`);
} else {
  console.error(`  ✗ Expected 1 item with quantity 2, got ${mockRoom.items.length} items`);
  if (mockRoom.items.length > 0) {
    console.error(`    First item quantity: ${mockRoom.items[0].quantity}`);
  }
  process.exit(1);
}

// Drop another 1 platinum - should stack again
CurrencyManager.dropCurrency(mockPlayer, mockRoom, { platinum: 1, gold: 0, silver: 0, copper: 0 });
console.log(`After 3rd drop: ${mockRoom.items.length} item(s) in room`);
if (mockRoom.items.length === 1 && mockRoom.items[0].quantity === 3) {
  console.log(`  ✓ Platinum stack: x${mockRoom.items[0].quantity}`);
} else {
  console.error(`  ✗ Expected 1 item with quantity 3`);
  process.exit(1);
}

console.log('\n✓ Test 1 passed: Sequential drops stack correctly\n');

console.log('Test 2: Drop 5 platinum at once - should add to existing stack');
console.log('─'.repeat(60));

CurrencyManager.dropCurrency(mockPlayer, mockRoom, { platinum: 5, gold: 0, silver: 0, copper: 0 });
console.log(`After dropping 5 platinum: ${mockRoom.items.length} item(s) in room`);
if (mockRoom.items.length === 1 && mockRoom.items[0].quantity === 8) {
  console.log(`  ✓ Platinum stack: x${mockRoom.items[0].quantity}`);
} else {
  console.error(`  ✗ Expected 1 item with quantity 8`);
  process.exit(1);
}

console.log('\n✓ Test 2 passed: Bulk drop stacks correctly\n');

console.log('Test 3: Drop mixed currency - should create separate stacks');
console.log('─'.repeat(60));

// Reset room and player
mockRoom.items = [];
mockPlayer.currency = { platinum: 0, gold: 50, silver: 50, copper: 50 };

CurrencyManager.dropCurrency(mockPlayer, mockRoom, { platinum: 0, gold: 10, silver: 10, copper: 10 });
console.log(`After dropping mixed currency: ${mockRoom.items.length} item(s) in room`);

// Should have 3 stacks (gold, silver, copper)
const goldStack = mockRoom.items.find(i => i.definitionId === 'currency_gold');
const silverStack = mockRoom.items.find(i => i.definitionId === 'currency_silver');
const copperStack = mockRoom.items.find(i => i.definitionId === 'currency_copper');

if (goldStack && goldStack.quantity === 10 &&
    silverStack && silverStack.quantity === 10 &&
    copperStack && copperStack.quantity === 10) {
  console.log(`  ✓ Gold stack: x${goldStack.quantity}`);
  console.log(`  ✓ Silver stack: x${silverStack.quantity}`);
  console.log(`  ✓ Copper stack: x${copperStack.quantity}`);
} else {
  console.error(`  ✗ Expected 3 separate stacks`);
  process.exit(1);
}

console.log('\n✓ Test 3 passed: Mixed currency creates correct stacks\n');

console.log('=== All Currency Stacking Tests Passed! ===');
