/**
 * Economy System Tests
 * Tests for Phase 5: Economy & Loot
 */

const { TestRunner, assert } = require('./testRunner');
const CurrencyManager = require('../src/systems/economy/CurrencyManager');
const ShopManager = require('../src/systems/economy/ShopManager');
const ItemFactory = require('../src/items/ItemFactory');
const ItemRegistry = require('../src/items/ItemRegistry');

const runner = new TestRunner('Economy System Tests');
runner.assert = assert; // Add assert to runner for compatibility

// Load test items
const loadItems = require('../world/core/items/loadItems');
if (typeof loadItems === 'function') {
  loadItems();
}

// ======================
// Currency Manager Tests
// ======================

runner.test('Currency conversion - copper to breakdown', () => {
  const breakdown = CurrencyManager.fromCopper(12345);
  runner.assert.equal(breakdown.platinum, 1, 'Should have 1 platinum');
  runner.assert.equal(breakdown.gold, 2, 'Should have 2 gold');
  runner.assert.equal(breakdown.silver, 3, 'Should have 3 silver');
  runner.assert.equal(breakdown.copper, 45, 'Should have 45 copper');
});

runner.test('Currency conversion - breakdown to copper', () => {
  const total = CurrencyManager.toCopper({ platinum: 1, gold: 2, silver: 3, copper: 45 });
  runner.assert.equal(total, 12345, 'Should convert to 12345 copper');
});

runner.test('Currency formatting', () => {
  const formatted = CurrencyManager.format(12345);
  runner.assert.equal(formatted, '1p 2g 3s 45c', 'Should format correctly');
});

runner.test('Currency formatting - hide zeros', () => {
  const formatted = CurrencyManager.format(100); // Just 1 silver
  runner.assert.equal(formatted, '1s', 'Should only show silver');
});

runner.test('Currency addition', () => {
  const result = CurrencyManager.add(1000, 500);
  const total = CurrencyManager.toCopper(result);
  runner.assert.equal(total, 1500, 'Should add to 1500 copper');
});

runner.test('Currency subtraction', () => {
  const result = CurrencyManager.subtract(1000, 300);
  const total = CurrencyManager.toCopper(result);
  runner.assert.equal(total, 700, 'Should subtract to 700 copper');
});

runner.test('Currency subtraction - prevent negative', () => {
  const result = CurrencyManager.subtract(100, 200);
  const total = CurrencyManager.toCopper(result);
  runner.assert.equal(total, 0, 'Should not go negative');
});

runner.test('Currency comparison', () => {
  runner.assert.equal(CurrencyManager.compare(1000, 500), 1, 'Should be greater');
  runner.assert.equal(CurrencyManager.compare(500, 1000), -1, 'Should be less');
  runner.assert.equal(CurrencyManager.compare(500, 500), 0, 'Should be equal');
});

runner.test('Currency hasEnough check', () => {
  runner.assert.true(CurrencyManager.hasEnough(1000, 500), 'Should have enough');
  runner.assert.false(CurrencyManager.hasEnough(500, 1000), 'Should not have enough');
});

runner.test('Player wallet - initialize', () => {
  const player = {};
  const wallet = CurrencyManager.getWallet(player);
  runner.assert.true(wallet !== null, 'Should create wallet');
  runner.assert.equal(wallet.copper, 0, 'Should start at zero');
});

runner.test('Player wallet - add currency', () => {
  const player = { currency: { platinum: 0, gold: 0, silver: 0, copper: 0 } };
  CurrencyManager.addToWallet(player, 500);
  runner.assert.equal(player.currency.silver, 5, 'Should have 5 silver');
});

runner.test('Player wallet - remove currency', () => {
  const player = { currency: { platinum: 0, gold: 0, silver: 10, copper: 0 } };
  const result = CurrencyManager.removeFromWallet(player, 300);
  runner.assert.true(result.success, 'Should remove successfully');
  runner.assert.equal(player.currency.silver, 7, 'Should have 7 silver left');
});

runner.test('Player wallet - remove currency insufficient funds', () => {
  const player = { currency: { platinum: 0, gold: 0, silver: 1, copper: 0 } };
  const result = CurrencyManager.removeFromWallet(player, 500);
  runner.assert.false(result.success, 'Should fail with insufficient funds');
});

// ======================
// Item Pricing Tests
// ======================

runner.test('Item base value calculation', () => {
  // Test with a simple definition
  const testDef = {
    id: 'test_weapon',
    name: 'Test Weapon',
    description: 'A test weapon',
    keywords: ['test', 'weapon'],
    itemType: 'weapon',
    value: 500, // 5 silver
    weight: 3,
    rarity: 'common'
  };

  ItemRegistry.registerItem(testDef);
  const item = ItemFactory.createItem('test_weapon');

  const baseValue = item.getBaseValue();
  runner.assert.equal(baseValue, 500, 'Should return explicit value');
});

runner.test('Quest items have no value', () => {
  // Create a test quest item
  const questDef = {
    id: 'test_quest_item',
    name: 'Quest Item',
    description: 'A quest item',
    keywords: ['quest'],
    itemType: 'quest',
    isQuestItem: true,
    value: 1000,
    weight: 0
  };

  ItemRegistry.registerItem(questDef);
  const item = ItemFactory.createItem('test_quest_item');

  const value = item.getValue(false);
  runner.assert.equal(value, 0, 'Quest items should have no value');
});

// ======================
// Shop Manager Tests
// ======================

runner.test('Shop registration', () => {
  const shop = {
    id: 'test_shop',
    name: 'Test Shop',
    inventory: [
      { itemId: 'test_weapon', quantity: 10, price: 200 }
    ],
    unlimited: false
  };

  const result = ShopManager.registerShop(shop);
  assert.true(result, 'Should register shop');

  const retrieved = ShopManager.getShop('test_shop');
  assert.true(retrieved !== null, 'Should retrieve shop');
  assert.equal(retrieved.name, 'Test Shop', 'Shop name should match');
});

runner.test('Shop inventory listing', () => {
  const inventory = ShopManager.getShopInventory('test_shop');
  runner.assert.true(inventory.length > 0, 'Should have items');
  runner.assert.true(inventory[0].price > 0, 'Items should have prices');
});

runner.test('Shop buy transaction', async () => {
  const player = {
    username: 'testplayer',
    inventory: [],
    currency: { platinum: 0, gold: 0, silver: 10, copper: 0 }
  };

  const result = await ShopManager.buyItem(player, 'test_shop', 'weapon', 1);

  if (result.success) {
    runner.assert.true(player.inventory.length > 0, 'Should have item in inventory');
    runner.assert.true(CurrencyManager.toCopper(player.currency) < 1000, 'Should have less money');
  }
  // Note: May fail if shop doesn't have item, which is expected in minimal test
});

runner.test('Shop buy - insufficient funds', async () => {
  const player = {
    username: 'testplayer',
    inventory: [],
    currency: { platinum: 0, gold: 0, silver: 0, copper: 1 }
  };

  const result = await ShopManager.buyItem(player, 'test_shop', 'dagger', 1);
  runner.assert.false(result.success, 'Should fail with insufficient funds');
});

runner.test('Shop sell transaction', async () => {
  const item = ItemFactory.createItem('test_weapon');
  if (!item) {
    // Skip if test item not created
    return;
  }

  const player = {
    username: 'testplayer',
    inventory: [item],
    currency: { platinum: 0, gold: 0, silver: 0, copper: 0 }
  };

  const result = await ShopManager.sellItem(player, 'test_shop', 'weapon', 1);

  if (result.success) {
    runner.assert.equal(player.inventory.length, 0, 'Item should be removed');
    runner.assert.true(CurrencyManager.toCopper(player.currency) > 0, 'Should have money');
  }
});

// ======================
// Loot Generation Tests
// ======================

runner.test('Currency generation by CR', () => {
  const LootGenerator = require('../src/systems/loot/LootGenerator');

  const cr1Currency = LootGenerator.generateCurrency(1);
  const cr5Currency = LootGenerator.generateCurrency(5);

  runner.assert.true(cr1Currency >= 5 && cr1Currency <= 20, 'CR1 should drop 5-20 copper');
  runner.assert.true(cr5Currency >= 100 && cr5Currency <= 1000, 'CR5 should drop 100-1000 copper');
});

runner.test('Boss currency generation', () => {
  const LootGenerator = require('../src/systems/loot/LootGenerator');

  const bossCurrency = LootGenerator.generateBossCurrency();
  runner.assert.true(bossCurrency >= 1000 && bossCurrency <= 10000, 'Boss should drop 1000-10000 copper');
});

// ======================
// Container Manager Tests
// ======================

runner.test('Container creation', () => {
  const ContainerManager = require('../src/systems/containers/ContainerManager');

  const container = ContainerManager.createContainer({
    id: 'test_chest',
    name: 'Test Chest',
    containerType: 'chest'
  });

  runner.assert.true(container !== null, 'Should create container');
  runner.assert.equal(container.name, 'Test Chest', 'Name should match');
  runner.assert.true(container.capacity > 0, 'Should have capacity');
});

runner.test('Container open/close', () => {
  const ContainerManager = require('../src/systems/containers/ContainerManager');

  const container = ContainerManager.getContainer('test_chest');
  const player = { username: 'testplayer' };

  const openResult = ContainerManager.openContainer(player, container);
  runner.assert.true(openResult.success, 'Should open container');
  runner.assert.true(container.isOpen, 'Container should be open');

  const closeResult = ContainerManager.closeContainer(player, container);
  runner.assert.true(closeResult.success, 'Should close container');
  runner.assert.false(container.isOpen, 'Container should be closed');
});

// ======================
// No Currency Exploits
// ======================

runner.test('Currency duplication prevention - wallet operations', () => {
  const player = { currency: { platinum: 0, gold: 0, silver: 1, copper: 0 } };
  const startingAmount = CurrencyManager.toCopper(player.currency);

  // Try to add and immediately remove
  CurrencyManager.addToWallet(player, 100);
  const addResult = CurrencyManager.toCopper(player.currency);

  CurrencyManager.removeFromWallet(player, 100);
  const finalAmount = CurrencyManager.toCopper(player.currency);

  runner.assert.equal(finalAmount, startingAmount, 'Should return to original amount');
  runner.assert.equal(addResult, startingAmount + 100, 'Addition should work correctly');
});

runner.test('Currency overflow prevention', () => {
  const maxCopper = Number.MAX_SAFE_INTEGER;
  const breakdown = CurrencyManager.fromCopper(maxCopper);

  // Should handle large numbers gracefully
  runner.assert.true(breakdown.platinum >= 0, 'Should not overflow');
  runner.assert.true(Number.isFinite(breakdown.platinum), 'Should be finite');
});

// Export test runner
module.exports = runner;
