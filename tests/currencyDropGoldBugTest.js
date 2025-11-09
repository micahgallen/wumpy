/**
 * Integration test for the specific bug:
 * "When I have only 105 copper, if I 'drop gold', 1 gold coin drops,
 * but I then have no money. I should have 5 copper left over."
 */

const CurrencyManager = require('../src/systems/economy/CurrencyManager');
const ItemRegistry = require('../src/items/ItemRegistry');

// Load and register currency items
const currencyItems = require('../world/core/items/currency');
for (const itemDef of currencyItems) {
  ItemRegistry.registerItem(itemDef, 'test');
}

console.log('\n=== Bug Report Test: Drop Gold with Only Copper ===\n');

// Simulate the exact scenario from the bug report
const player = {
  username: 'BugTestPlayer',
  currency: { platinum: 0, gold: 0, silver: 0, copper: 105 }
};

const room = {
  id: 'test_room',
  items: []
};

console.log('Initial state:');
console.log(`  Player wallet: ${CurrencyManager.format(player.currency)} (105 copper)`);
console.log(`  Room items: ${room.items.length}`);
console.log('');

console.log('Action: Player types "drop gold"');
console.log('  Command parses as: drop 1 gold');
console.log('');

// Simulate what the drop command does when you type "drop gold"
const amountToDrop = { platinum: 0, gold: 1, silver: 0, copper: 0 };

console.log('Executing drop...');
const dropResult = CurrencyManager.dropCurrency(player, room, amountToDrop);

if (!dropResult.success) {
  console.error(`✗ FAILED: Drop failed unexpectedly: ${dropResult.message}`);
  process.exit(1);
}

console.log(`  ${dropResult.message}`);
console.log('');

console.log('Result:');
console.log(`  Player wallet: ${CurrencyManager.format(player.currency)}`);
console.log(`  Room items: ${room.items.length}`);

// Check the actual values
const totalCopper = CurrencyManager.toCopper(player.currency);

console.log('');
console.log('Verification:');
console.log(`  Expected remaining: 5 copper (105 - 100 = 5)`);
console.log(`  Actual remaining: ${totalCopper} copper`);

if (totalCopper === 5) {
  console.log('');
  console.log('✓ BUG FIXED! Player correctly has 5 copper remaining.');
  console.log('');
  console.log('The system now properly:');
  console.log('  1. Recognizes player has 105 copper (worth 1g 5c)');
  console.log('  2. "Makes change" by converting 100 copper to drop as 1 gold');
  console.log('  3. Leaves player with the correct 5 copper remainder');
} else if (totalCopper === 0) {
  console.error('');
  console.error('✗ BUG STILL EXISTS! Player has 0 copper (should have 5)');
  console.error('');
  process.exit(1);
} else {
  console.error('');
  console.error(`✗ UNEXPECTED RESULT! Player has ${totalCopper} copper (should have 5)`);
  console.error('');
  process.exit(1);
}

// Also verify the dropped item
console.log('');
console.log('Dropped items verification:');
if (room.items.length !== 1) {
  console.error(`✗ Expected 1 item in room, found ${room.items.length}`);
  process.exit(1);
}

const droppedItem = room.items[0];
console.log(`  Item: ${droppedItem.getDisplayName()}`);
console.log(`  Quantity: ${droppedItem.quantity}`);
console.log(`  Value: ${droppedItem.value} copper each`);

if (droppedItem.definitionId !== 'currency_gold') {
  console.error(`✗ Expected gold coin, got ${droppedItem.definitionId}`);
  process.exit(1);
}

if (droppedItem.quantity !== 1) {
  console.error(`✗ Expected 1 gold coin, got ${droppedItem.quantity}`);
  process.exit(1);
}

console.log('✓ Correct item dropped (1 gold coin worth 100 copper)');

console.log('');
console.log('=== Bug Test Complete: ALL CHECKS PASSED ===\n');
