/**
 * Sample Items Load Test
 *
 * Tests that sample items can be loaded successfully into the registry.
 */

const { TestRunner, assert } = require('./testRunner');
const ItemRegistry = require('../src/items/ItemRegistry');
const { loadCoreItems } = require('../world/core/items/loadItems');

const runner = new TestRunner('Sample Items Load Test');

// Clear registry
runner.test('Setup - clear registry', () => {
  ItemRegistry.clearRegistry();
  assert.true(true, 'Setup complete');
});

// Test loading core items
runner.test('loadCoreItems - load all sample items', () => {
  const result = loadCoreItems();

  assert.true(result.success, 'All items should load successfully');
  assert.true(result.successCount > 0, 'Should have loaded some items');
  assert.equal(result.errorCount, 0, 'Should have no errors');
});

// Test registry after loading
runner.test('Registry - contains expected items', () => {
  const stats = ItemRegistry.getStats();

  assert.true(stats.totalItems > 0, 'Registry should have items');
  assert.true(stats.byType['weapon'] > 0, 'Should have weapons');
  assert.true(stats.byType['armor'] > 0, 'Should have armor');
  assert.true(stats.byType['consumable'] > 0, 'Should have consumables');
});

// Test retrieving specific items
runner.test('Registry - retrieve rusty dagger', () => {
  const item = ItemRegistry.getItem('rusty_dagger');

  assert.notNull(item, 'Should find rusty dagger');
  assert.equal(item.name, 'Rusty Dagger', 'Should have correct name');
  assert.equal(item.itemType, 'weapon', 'Should be a weapon');
});

runner.test('Registry - retrieve flaming sword', () => {
  const item = ItemRegistry.getItem('flaming_sword');

  assert.notNull(item, 'Should find flaming sword');
  assert.equal(item.rarity, 'rare', 'Should be rare');
  assert.true(item.requiresAttunement, 'Should require attunement');
});

runner.test('Registry - retrieve health potion', () => {
  const item = ItemRegistry.getItem('health_potion');

  assert.notNull(item, 'Should find health potion');
  assert.true(item.isStackable, 'Should be stackable');
  assert.equal(item.itemType, 'consumable', 'Should be consumable');
});

runner.test('Registry - keyword search', () => {
  const swords = ItemRegistry.findItemsByKeyword('sword');

  assert.true(swords.length >= 2, 'Should find multiple swords');
});

runner.test('Registry - domain filter', () => {
  const coreItems = ItemRegistry.getItemsByDomain('core');

  assert.true(coreItems.length > 0, 'Should find core items');
  assert.equal(coreItems[0].domain, 'core', 'Items should be in core domain');
});

// Run tests if this is the main module
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;
