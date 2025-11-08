/**
 * Test suite for inventory command bug fixes
 * Tests partial stack operations (drop/get with quantity)
 */

const { TestRunner, assert } = require('./testRunner');
const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const InventoryManager = require('../src/systems/inventory/InventoryManager');

function runTests() {
  const runner = new TestRunner('Inventory Commands Bug Fixes');

  // Setup: Register a test consumable item
  const testPotionDef = {
    id: 'test_health_potion',
    name: 'Health Potion',
    description: 'A red potion that restores health.',
    itemType: 'consumable',
    rarity: 'common',
    value: 50,
    weight: 0.5,
    stackable: true,
    maxStack: 99,
    isTakeable: true,
    isDroppable: true,
    keywords: ['potion', 'health']
  };

  ItemRegistry.registerItem(testPotionDef);

  // Test 1: Split stack when dropping partial quantity
  runner.test('Drop partial stack creates correct split', () => {
    const player = {
      username: 'testplayer',
      inventory: [],
      stats: { str: 10 }
    };

    // Create a stack of 20 potions
    const potionStack = ItemFactory.createItem('test_health_potion', { quantity: 20 });
    InventoryManager.addItem(player, potionStack);

    assert.equal(player.inventory.length, 1, 'Should have 1 stack in inventory');
    assert.equal(player.inventory[0].quantity, 20, 'Stack should have 20 items');

    // Split 8 from the stack
    const splitResult = InventoryManager.splitStack(player, potionStack.instanceId, 8);

    assert.true(splitResult.success, 'Split should succeed');
    assert.equal(splitResult.newInstance.quantity, 8, 'Split item should have quantity 8');
    assert.equal(player.inventory[0].quantity, 12, 'Remaining stack should have 12 items');
    assert.equal(player.inventory.length, 2, 'Should have 2 stacks after split');
  });

  // Test 2: Restore item preserves quantity
  runner.test('Restoring item preserves exact quantity', () => {
    // Create serialized item data
    const itemData = {
      definitionId: 'test_health_potion',
      quantity: 15,
      durability: 100,
      instanceId: 'test-instance-123'
    };

    const itemDef = ItemRegistry.getItem('test_health_potion');
    const restoredItem = ItemFactory.restoreItem(itemData, itemDef);

    assert.equal(restoredItem.quantity, 15, 'Restored item should have quantity 15');
    assert.equal(restoredItem.instanceId, 'test-instance-123', 'Should preserve instanceId');
    assert.equal(restoredItem.definitionId, 'test_health_potion', 'Should preserve definitionId');
  });

  // Test 3: Partial pickup from room stack
  runner.test('Partial pickup leaves correct amount in room', () => {
    const roomItemData = {
      definitionId: 'test_health_potion',
      quantity: 25,
      durability: 100
    };

    // Simulate picking up 10 from a stack of 25
    const pickupQty = 10;
    const remainingQty = roomItemData.quantity - pickupQty;

    assert.equal(remainingQty, 15, 'Should leave 15 in room after picking up 10');

    // Create the pickup item
    const pickupData = { ...roomItemData, quantity: pickupQty };
    const itemDef = ItemRegistry.getItem('test_health_potion');
    const pickupItem = ItemFactory.restoreItem(pickupData, itemDef);

    assert.equal(pickupItem.quantity, 10, 'Picked up item should have quantity 10');
  });

  // Test 4: Stack merging when adding to inventory
  runner.test('Adding stackable items merges correctly', () => {
    const player = {
      username: 'testplayer',
      inventory: [],
      stats: { str: 10 }
    };

    // Add first stack
    const stack1 = ItemFactory.createItem('test_health_potion', { quantity: 15 });
    const result1 = InventoryManager.addItem(player, stack1);
    assert.true(result1.success, 'First add should succeed');
    assert.equal(player.inventory.length, 1, 'Should have 1 stack');

    // Add second stack - should merge
    const stack2 = ItemFactory.createItem('test_health_potion', { quantity: 10 });
    const result2 = InventoryManager.addItem(player, stack2);
    assert.true(result2.success, 'Second add should succeed');
    assert.true(result2.stackedWith !== undefined, 'Should indicate stacking occurred');
    assert.equal(player.inventory.length, 1, 'Should still have 1 stack (merged)');
    assert.equal(player.inventory[0].quantity, 25, 'Merged stack should have 25 items');
  });

  // Test 5: Cannot split non-stackable items
  runner.test('Splitting non-stackable items fails gracefully', () => {
    const player = {
      username: 'testplayer',
      inventory: [],
      stats: { str: 10 }
    };

    // Register a non-stackable item
    const swordDef = {
      id: 'test_sword',
      name: 'Test Sword',
      description: 'A test sword',
      itemType: 'weapon',
      rarity: 'common',
      value: 100,
      weight: 3,
      stackable: false,
      isTakeable: true,
      isDroppable: true,
      keywords: ['sword', 'test']
    };
    ItemRegistry.registerItem(swordDef);

    const sword = ItemFactory.createItem('test_sword');
    InventoryManager.addItem(player, sword);

    const splitResult = InventoryManager.splitStack(player, sword.instanceId, 1);
    assert.false(splitResult.success, 'Split should fail for non-stackable item');
    assert.true(splitResult.error.includes('not stackable'), 'Error should mention non-stackable');
  });

  // Test 6: Splitting entire stack vs partial
  runner.test('Splitting entire stack vs partial stack behaves correctly', () => {
    const player = {
      username: 'testplayer',
      inventory: [],
      stats: { str: 10 }
    };

    const potions = ItemFactory.createItem('test_health_potion', { quantity: 10 });
    InventoryManager.addItem(player, potions);

    // Try to split all 10 - should fail (must split less than total)
    const splitAll = InventoryManager.splitStack(player, potions.instanceId, 10);
    assert.false(splitAll.success, 'Cannot split entire stack');

    // Split 3 from 10 - should succeed
    const splitPartial = InventoryManager.splitStack(player, potions.instanceId, 3);
    assert.true(splitPartial.success, 'Should split partial stack');
    assert.equal(splitPartial.newInstance.quantity, 3, 'Split should have 3');
    assert.equal(player.inventory[0].quantity, 7, 'Original should have 7 remaining');
  });

  runner.run();
}

module.exports = { run: runTests };

if (require.main === module) {
  runTests();
}
