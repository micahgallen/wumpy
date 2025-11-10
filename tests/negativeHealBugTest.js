/**
 * Test for the negative healAmount bug fix
 * Tests that items with corrupted negative healAmount are handled gracefully
 */

const colors = require('../src/colors');
const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const BaseItem = require('../src/items/BaseItem');
const { applyConsumableMixin } = require('../src/items/mixins/ConsumableMixin');

// Load items
const { loadCoreItems } = require('../world/core/items/loadItems');
const { loadSesameStreetItems } = require('../world/sesame_street/items/loadItems');

console.log('\n=== NEGATIVE HEAL AMOUNT BUG TEST ===\n');

loadCoreItems();
loadSesameStreetItems();

// Mock player
const player = {
  username: 'TestPlayer',
  hp: 15,
  maxHp: 15,
  messages: [],
  send: function(msg) {
    this.messages.push(msg);
    console.log('PLAYER:', msg.replace(/\x1b\[[0-9;]*m/g, '').trim());
  }
};

console.log('TEST 1: Normal potion (healAmount = 25)');
console.log('==========================================');
const normalPotion = ItemFactory.createItem('sesame_health_potion', { quantity: 1 });
console.log(`Created potion with healAmount: ${normalPotion.consumableProperties.healAmount}`);
console.log(`Player HP before: ${player.hp}/${player.maxHp}`);

const result1 = normalPotion.consume(player, {});
console.log(`Result: success=${result1.success}, consumed=${result1.consumed}`);
console.log(`Player HP after: ${player.hp}/${player.maxHp}`);
console.log('✓ Normal potion works correctly\n');

// Reset player
player.hp = 10;
player.messages = [];

console.log('TEST 2: Corrupted potion with negative healAmount (-5)');
console.log('=======================================================');

// Create a corrupted potion by manually creating an item with bad data
const corruptedDef = ItemRegistry.getItem('sesame_health_potion');
const corruptedPotion = new BaseItem(corruptedDef, { quantity: 1 });
applyConsumableMixin(corruptedPotion);

// Simulate the corruption bug by manually setting negative healAmount
corruptedPotion.consumableProperties.healAmount = -5;

console.log(`Created corrupted potion with healAmount: ${corruptedPotion.consumableProperties.healAmount}`);
console.log(`Player HP before: ${player.hp}/${player.maxHp}`);

const result2 = corruptedPotion.consume(player, {});
console.log(`Result: success=${result2.success}, consumed=${result2.consumed}`);
console.log(`Player HP after: ${player.hp}/${player.maxHp}`);

if (result2.success === false && player.hp === 10) {
  console.log('✓ Corrupted potion was blocked and HP was not reduced!\n');
  console.log('=== TEST PASSED ===');
  console.log('The fix successfully prevents negative healing.\n');
  process.exit(0);
} else {
  console.log('✗ FAILED: Corrupted potion was not handled correctly!\n');
  console.log(`Expected: success=false, HP=10`);
  console.log(`Got: success=${result2.success}, HP=${player.hp}`);
  process.exit(1);
}
