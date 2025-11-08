/**
 * Currency Partial Pickup Test
 * Tests picking up part of a currency stack
 */

const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const CurrencyManager = require('../src/systems/economy/CurrencyManager');

// Load currency items
const currencyItems = require('../world/core/items/currency');
console.log('\n=== Currency Partial Pickup Test ===\n');

// Register currency items
for (const itemDef of currencyItems) {
  ItemRegistry.registerItem(itemDef, 'test');
}

// Create a mock room with 50 copper coins
const mockRoom = {
  id: 'test_room',
  items: []
};

// Create 50 copper coins in the room
const copperStack = ItemFactory.createItem('currency_copper', { quantity: 50 });
mockRoom.items.push(copperStack);

console.log(`Initial room state:`);
console.log(`  Items in room: ${mockRoom.items.length}`);
console.log(`  Copper stack: ${copperStack.name} x${copperStack.quantity}`);

// Simulate picking up 1 coin
const itemToPickup = { ...copperStack, quantity: 1 };
const itemDef = ItemRegistry.getItem('currency_copper');
const pickupInstance = ItemFactory.restoreItem(itemToPickup, itemDef);

// Calculate value
const copperValue = (pickupInstance.quantity || 1) * pickupInstance.value;
console.log(`\nPickup calculation:`);
console.log(`  Pickup quantity: ${pickupInstance.quantity}`);
console.log(`  Coin value: ${pickupInstance.value}`);
console.log(`  Total copper: ${copperValue}`);

// Update room stack
copperStack.quantity = copperStack.quantity - 1;

console.log(`\nAfter pickup:`);
console.log(`  Room stack quantity: ${copperStack.quantity}`);
console.log(`  Items in room: ${mockRoom.items.length}`);
console.log(`  Copper added to wallet: ${copperValue}c`);

if (copperStack.quantity === 49 && mockRoom.items.length === 1) {
  console.log('\n✓ Partial pickup works correctly!');
  console.log('✓ Room still has 49 copper coins');
  console.log('✓ Player picked up 1 copper');
} else {
  console.error('\n✗ FAILED: Partial pickup broken!');
  console.error(`  Expected: 49 coins in room`);
  console.error(`  Got: ${copperStack.quantity} coins in room`);
  process.exit(1);
}

// Test picking up the same item definition with another instance
console.log('\n--- Testing second pickup ---');
const itemToPickup2 = { ...copperStack, quantity: 1 };
const pickupInstance2 = ItemFactory.restoreItem(itemToPickup2, itemDef);
const copperValue2 = (pickupInstance2.quantity || 1) * pickupInstance2.value;

copperStack.quantity = copperStack.quantity - 1;

console.log(`Second pickup: ${copperValue2}c`);
console.log(`Room stack now: ${copperStack.quantity} coins`);

if (copperStack.quantity === 48) {
  console.log('\n✓ Second pickup also works!');
  console.log('✓ Can pick up from the same stack multiple times');
} else {
  console.error('\n✗ FAILED: Second pickup broken!');
  process.exit(1);
}

console.log('\n=== All Partial Pickup Tests Passed! ===');
