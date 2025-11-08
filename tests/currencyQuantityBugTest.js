/**
 * Currency Quantity Bug Test
 * Reproduces the "take 49 copper" bug
 */

const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');

// Load currency items
const currencyItems = require('../world/core/items/currency');
console.log('\n=== Currency Quantity Bug Test ===\n');

// Register currency items
for (const itemDef of currencyItems) {
  ItemRegistry.registerItem(itemDef, 'test');
}

// Simulate the exact scenario
const item = {
  definitionId: 'currency_copper',
  quantity: 49,
  instanceId: 'test-instance'
};

const quantity = 49; // User typed "take 49 copper"
const pickupQuantity = 49;

console.log('Simulating: take 49 copper');
console.log(`Room has: ${item.quantity} copper coins`);
console.log(`Requested quantity: ${quantity}`);
console.log(`Pickup quantity: ${pickupQuantity}`);

// This is what the get command does
const itemToPickup = { ...item, quantity: pickupQuantity };

console.log('\nAfter spread operator:');
console.log(`itemToPickup.quantity: ${itemToPickup.quantity}`);
console.log(`itemToPickup.definitionId: ${itemToPickup.definitionId}`);

// Get item definition
const itemDef = ItemRegistry.getItem(item.definitionId);

// Restore item instance
const itemInstance = ItemFactory.restoreItem(itemToPickup, itemDef);

console.log('\nAfter ItemFactory.restoreItem:');
console.log(`itemInstance.quantity: ${itemInstance.quantity}`);
console.log(`itemInstance.value: ${itemInstance.value}`);

// Calculate copper amount (what onPickup does)
const copperAmount = (itemInstance.quantity || 1) * itemInstance.value;

console.log('\nCopper calculation:');
console.log(`(${itemInstance.quantity} || 1) * ${itemInstance.value} = ${copperAmount}`);

if (copperAmount === 49) {
  console.log('\n✓ Quantity is preserved correctly!');
  console.log('✓ Should pick up 49 copper');
} else {
  console.error(`\n✗ BUG FOUND!`);
  console.error(`  Expected: 49 copper`);
  console.error(`  Got: ${copperAmount} copper`);
  console.error(`  itemInstance.quantity = ${itemInstance.quantity}`);
  process.exit(1);
}
