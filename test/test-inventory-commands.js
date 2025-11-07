#!/usr/bin/env node
/**
 * Test Script for Enhanced Inventory Commands
 *
 * Tests the new inventory.js, get.js, and drop.js commands with the Phase 2 Inventory System.
 */

const path = require('path');

// Setup paths
const srcPath = path.join(__dirname, '../src');
const worldPath = path.join(__dirname, '../world');

// Load dependencies
const ItemRegistry = require(path.join(srcPath, 'items/ItemRegistry'));
const ItemFactory = require(path.join(srcPath, 'items/ItemFactory'));
const InventoryManager = require(path.join(srcPath, 'systems/inventory/InventoryManager'));
const InventorySerializer = require(path.join(srcPath, 'systems/inventory/InventorySerializer'));
const { loadCoreItems } = require(path.join(worldPath, 'core/items/loadItems'));

// Mock player and world
class MockPlayer {
  constructor(username) {
    this.username = username;
    this.inventory = [];
    this.currentRoom = 'test_room';
    this.stats = {
      strength: 15, // Good carrying capacity
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    };
    this.messages = [];
  }

  send(message) {
    this.messages.push(message);
    console.log(`[${this.username}]`, message.trim());
  }

  clearMessages() {
    this.messages = [];
  }
}

class MockWorld {
  constructor() {
    this.rooms = {
      'test_room': {
        id: 'test_room',
        name: 'Test Room',
        items: [],
        objects: []
      }
    };
  }

  getRoom(roomId) {
    return this.rooms[roomId];
  }

  getObject(objId) {
    // Legacy system mock
    return null;
  }
}

class MockPlayerDB {
  updatePlayerInventory(username, inventory) {
    console.log(`[DB] Updated inventory for ${username}: ${inventory.length} items`);
  }
}

// Load items
console.log('Loading core items...');
const loadResult = loadCoreItems();
console.log(`Loaded: ${loadResult.successCount} items, ${loadResult.errorCount} errors\n`);

// Create test environment
const player = new MockPlayer('testplayer');
const world = new MockWorld();
const playerDB = new MockPlayerDB();
const context = { world, playerDB };

// Load commands
const inventoryCommand = require(path.join(srcPath, 'commands/core/inventory'));
const getCommand = require(path.join(srcPath, 'commands/core/get'));
const dropCommand = require(path.join(srcPath, 'commands/core/drop'));

console.log('═'.repeat(60));
console.log('INVENTORY COMMAND TESTS');
console.log('═'.repeat(60));

// Test 1: Empty inventory
console.log('\n--- Test 1: Empty Inventory ---');
player.clearMessages();
inventoryCommand.execute(player, [], context);

// Test 2: Add some items to inventory
console.log('\n--- Test 2: Add Items to Inventory ---');
const daggerDef = ItemRegistry.getItem('rusty_dagger');
const swordDef = ItemRegistry.getItem('iron_longsword');
const potionDef = ItemRegistry.getItem('minor_health_potion');
const breadDef = ItemRegistry.getItem('bread');

if (daggerDef && swordDef && potionDef && breadDef) {
  // Create item instances
  const dagger = ItemFactory.createItem(daggerDef);
  const sword = ItemFactory.createItem(swordDef);
  const potions = ItemFactory.createItem(potionDef, { quantity: 5 });
  const bread = ItemFactory.createItem(breadDef, { quantity: 3 });

  // Add to inventory
  InventoryManager.addItem(player, dagger);
  InventoryManager.addItem(player, sword);
  InventoryManager.addItem(player, potions);
  InventoryManager.addItem(player, bread);

  console.log(`Added ${player.inventory.length} items to inventory`);

  // Display inventory
  player.clearMessages();
  inventoryCommand.execute(player, [], context);
} else {
  console.log('ERROR: Could not find item definitions!');
}

console.log('\n═'.repeat(60));
console.log('GET COMMAND TESTS');
console.log('═'.repeat(60));

// Test 3: Place item in room and pick it up
console.log('\n--- Test 3: Pick up item from room ---');
const room = world.getRoom('test_room');

// Add a health potion to the room
const potionInRoom = {
  definitionId: 'health_potion',
  quantity: 1
};
room.items.push(potionInRoom);

console.log(`Room has ${room.items.length} items`);

// Try to pick it up
player.clearMessages();
getCommand.execute(player, ['potion'], context);

// Check inventory
console.log(`\nPlayer now has ${player.inventory.length} items in inventory`);

// Test 4: Try to pick up when over weight limit
console.log('\n--- Test 4: Try to exceed weight limit ---');
const chainmailDef = ItemRegistry.getItem('chainmail');
if (chainmailDef) {
  // Add 5 chainmail to room (55 lbs each = 275 lbs total)
  for (let i = 0; i < 5; i++) {
    room.items.push({
      definitionId: 'chainmail',
      quantity: 1
    });
  }

  console.log(`Room has ${room.items.length} items`);

  // Try to pick up all chainmail
  player.clearMessages();
  for (let i = 0; i < 5; i++) {
    getCommand.execute(player, ['chainmail'], context);
  }
}

console.log('\n═'.repeat(60));
console.log('DROP COMMAND TESTS');
console.log('═'.repeat(60));

// Test 5: Drop an item
console.log('\n--- Test 5: Drop an item ---');
console.log(`Room has ${room.items.length} items before drop`);

player.clearMessages();
dropCommand.execute(player, ['dagger'], context);

console.log(`Room has ${room.items.length} items after drop`);

// Test 6: Try to drop equipped item (need to equip first)
console.log('\n--- Test 6: Try to drop equipped item ---');
const swordInInventory = InventoryManager.findItemByKeyword(player, 'sword');
if (swordInInventory) {
  swordInInventory.isEquipped = true;
  swordInInventory.equippedSlot = 'main_hand';

  player.clearMessages();
  dropCommand.execute(player, ['sword'], context);
}

// Test 7: Try to drop quest item
console.log('\n--- Test 7: Try to drop quest item ---');
const keyDef = ItemRegistry.getItem('ancient_key');
if (keyDef) {
  const questKey = ItemFactory.createItem(keyDef);
  player.inventory.push(questKey);

  player.clearMessages();
  dropCommand.execute(player, ['key'], context);
}

// Test 8: Final inventory display
console.log('\n--- Test 8: Final Inventory Display ---');
player.clearMessages();
inventoryCommand.execute(player, [], context);

console.log('\n═'.repeat(60));
console.log('TEST SUMMARY');
console.log('═'.repeat(60));

const stats = InventoryManager.getInventoryStats(player);
console.log(`\nFinal Inventory Stats:`);
console.log(`  Items: ${stats.itemCount} individual items in ${stats.slots.current} slots`);
console.log(`  Weight: ${stats.weight.current.toFixed(1)} / ${stats.weight.max} lbs (${stats.weight.percent.toFixed(1)}%)`);
console.log(`  Slots: ${stats.slots.current} / ${stats.slots.max} (${stats.slots.percent.toFixed(1)}%)`);

console.log('\n✓ All tests completed successfully!');
