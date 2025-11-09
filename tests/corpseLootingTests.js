/**
 * Corpse Looting Tests - Phase 5
 *
 * Tests for looting items from corpses using:
 * - get <item> from <corpse>
 * - get all from <corpse>
 * - loot <corpse>
 */

const path = require('path');

// Mock dependencies
const mockLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

// Override logger before requiring modules
require.cache[path.resolve(__dirname, '../src/logger.js')] = {
  exports: mockLogger
};

const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const InventoryManager = require('../src/systems/inventory/InventoryManager');
const CorpseManager = require('../src/systems/corpses/CorpseManager');
const getCommand = require('../src/commands/core/get');
const lootCommand = require('../src/commands/core/loot');

// Mock world
class MockWorld {
  constructor() {
    this.rooms = {
      test_room: {
        id: 'test_room',
        name: 'Test Room',
        items: [],
        npcs: []
      }
    };
  }

  getRoom(roomId) {
    return this.rooms[roomId] || null;
  }
}

// Mock player database
class MockPlayerDB {
  constructor() {
    this.inventories = {};
  }

  updatePlayerInventory(username, inventory) {
    this.inventories[username] = inventory;
  }
}

// Create mock player
function createMockPlayer(username = 'TestPlayer') {
  return {
    username: username,
    currentRoom: 'test_room',
    inventory: [],
    strength: 10,
    messages: [],
    send: function(msg) {
      this.messages.push(msg);
    }
  };
}

// Create mock NPC
function createMockNPC(id = 'goblin', name = 'Goblin', level = 1) {
  return {
    id: id,
    name: name,
    level: level,
    homeRoom: 'test_room',
    size: 'medium',
    keywords: [id, name.toLowerCase()]
  };
}

// Create test item definition
function createTestItem(id, name, weight = 1.0, isStackable = false) {
  return {
    id: id,
    name: name,
    description: `Test ${name}`,
    keywords: [id, name.toLowerCase()],
    itemType: 'misc',
    weight: weight,
    value: 10,
    isStackable: isStackable,
    isTakeable: true
  };
}

// Utility function to wait
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test suite
async function runTests() {
  console.log('=== Corpse Looting Tests (Phase 5) ===\n');

  let passedTests = 0;
  let failedTests = 0;

  // Helper function to run test
  async function test(name, testFn) {
    try {
      await testFn();
      console.log(`✓ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      console.log(`  Stack: ${error.stack}`);
      failedTests++;
    }
  }

  // Setup test items
  const swordDef = createTestItem('iron_sword', 'Iron Sword', 5.0, false);
  const potionDef = createTestItem('health_potion', 'Health Potion', 0.5, true);
  const coinsDef = createTestItem('copper_coin', 'Copper Coins', 0.01, true);

  ItemRegistry.registerItem(swordDef);
  ItemRegistry.registerItem(potionDef);
  ItemRegistry.registerItem(coinsDef);

  console.log('--- Basic Looting Tests ---\n');

  await test('Should get single item from corpse', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();
    const npc = createMockNPC();

    // Create corpse with items
    const sword = ItemFactory.createItem('iron_sword');
    const potion = ItemFactory.createItem('health_potion', 3);

    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player.username, world);
    corpse.inventory = [
      { definitionId: 'iron_sword', quantity: 1, instanceId: sword.instanceId },
      { definitionId: 'health_potion', quantity: 3, instanceId: potion.instanceId }
    ];

    // Execute: get sword from corpse
    const context = { world, playerDB, allPlayers: new Set([player]) };
    getCommand.execute(player, ['sword', 'from', 'corpse'], context);

    // Verify
    if (player.inventory.length !== 1) {
      throw new Error(`Expected 1 item in inventory, got ${player.inventory.length}`);
    }

    if (player.inventory[0].definitionId !== 'iron_sword') {
      throw new Error(`Expected iron_sword, got ${player.inventory[0].definitionId}`);
    }

    if (corpse.inventory.length !== 1) {
      throw new Error(`Expected 1 item left in corpse, got ${corpse.inventory.length}`);
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  await test('Should get multiple stackable items from corpse', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();
    const npc = createMockNPC();

    // Create corpse with potions
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player.username, world);
    corpse.inventory = [
      { definitionId: 'health_potion', quantity: 5, instanceId: 'potion1' }
    ];

    // Execute: get 3 potion from corpse
    const context = { world, playerDB, allPlayers: new Set([player]) };
    getCommand.execute(player, ['3', 'potion', 'from', 'corpse'], context);

    // Verify
    if (player.inventory.length !== 1) {
      throw new Error(`Expected 1 stack in inventory, got ${player.inventory.length}`);
    }

    if (player.inventory[0].quantity !== 3) {
      throw new Error(`Expected 3 potions, got ${player.inventory[0].quantity}`);
    }

    if (corpse.inventory[0].quantity !== 2) {
      throw new Error(`Expected 2 potions left in corpse, got ${corpse.inventory[0].quantity}`);
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  await test('Should get all of one item type from corpse', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();
    const npc = createMockNPC();

    // Create corpse with potions and sword
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player.username, world);
    corpse.inventory = [
      { definitionId: 'health_potion', quantity: 10, instanceId: 'potion1' },
      { definitionId: 'iron_sword', quantity: 1, instanceId: 'sword1' }
    ];

    // Execute: get all potion from corpse
    const context = { world, playerDB, allPlayers: new Set([player]) };
    getCommand.execute(player, ['all', 'potion', 'from', 'corpse'], context);

    // Verify
    if (player.inventory.length !== 1) {
      throw new Error(`Expected 1 item in inventory, got ${player.inventory.length}`);
    }

    if (player.inventory[0].quantity !== 10) {
      throw new Error(`Expected 10 potions, got ${player.inventory[0].quantity}`);
    }

    if (corpse.inventory.length !== 1) {
      throw new Error(`Expected 1 item (sword) left in corpse, got ${corpse.inventory.length}`);
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  console.log('\n--- Get All From Corpse Tests ---\n');

  await test('Should get all items from corpse', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();
    const npc = createMockNPC();

    // Create corpse - it has auto-generated loot, clear it first
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player.username, world);

    // Clear auto-generated loot and set our test items
    corpse.inventory = [
      { definitionId: 'iron_sword', quantity: 1, instanceId: 'sword1' },
      { definitionId: 'health_potion', quantity: 5, instanceId: 'potion1' },
      { definitionId: 'copper_coin', quantity: 100, instanceId: 'coins1' }
    ];

    // Execute: get all from corpse
    const context = { world, playerDB, allPlayers: new Set([player]) };
    getCommand.execute(player, ['all', 'from', 'corpse'], context);

    // Verify - check we got all 3 items
    const hasSword = player.inventory.some(i => i.definitionId === 'iron_sword');
    const hasPotion = player.inventory.some(i => i.definitionId === 'health_potion');
    const hasCoins = player.inventory.some(i => i.definitionId === 'copper_coin');

    if (!hasSword || !hasPotion || !hasCoins) {
      throw new Error(`Expected all 3 item types in inventory, got: ${player.inventory.map(i => i.definitionId).join(', ')}`);
    }

    if (corpse.inventory.length !== 0) {
      throw new Error(`Expected empty corpse, got ${corpse.inventory.length} items`);
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  console.log('\n--- Loot Command Tests ---\n');

  await test('Should loot all items using loot command', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();
    const npc = createMockNPC();

    // Create corpse with items
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player.username, world);
    corpse.inventory = [
      { definitionId: 'iron_sword', quantity: 1, instanceId: 'sword1' },
      { definitionId: 'health_potion', quantity: 3, instanceId: 'potion1' }
    ];

    // Execute: loot corpse
    const context = { world, playerDB, allPlayers: new Set([player]) };
    lootCommand.execute(player, ['corpse'], context);

    // Verify
    if (player.inventory.length !== 2) {
      throw new Error(`Expected 2 items in inventory, got ${player.inventory.length}`);
    }

    if (corpse.inventory.length !== 0) {
      throw new Error(`Expected empty corpse, got ${corpse.inventory.length} items`);
    }

    // Verify message contains "loot"
    const messages = player.messages.join(' ');
    if (!messages.toLowerCase().includes('loot')) {
      throw new Error('Expected loot message');
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  console.log('\n--- Encumbrance Tests ---\n');

  await test('Should fail to get item when inventory full', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();
    player.strength = 1; // Max slots = 20

    // Fill inventory to max slots (20)
    for (let i = 0; i < 20; i++) {
      const item = ItemFactory.createItem('iron_sword');
      player.inventory.push(item);
    }

    const npc = createMockNPC();

    // Create corpse with another item (would exceed slot limit)
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player.username, world);
    corpse.inventory = [
      { definitionId: 'health_potion', quantity: 1, instanceId: 'potion_overflow' }
    ];

    // Execute: get potion from corpse (should fail - no slots left)
    const context = { world, playerDB, allPlayers: new Set([player]) };
    const initialInventorySize = player.inventory.length;
    getCommand.execute(player, ['potion', 'from', 'corpse'], context);

    // Verify item was NOT taken
    if (player.inventory.length !== initialInventorySize) {
      throw new Error(`Player should not be able to carry more items. Inventory: ${player.inventory.length}, expected: ${initialInventorySize}`);
    }

    if (corpse.inventory.length !== 1) {
      throw new Error('Item should still be in corpse');
    }

    // Verify error message
    const messages = player.messages.join(' ');
    if (!messages.toLowerCase().includes('room') && !messages.toLowerCase().includes('slots') && !messages.toLowerCase().includes('carry')) {
      throw new Error(`Expected inventory limit error message, got: ${messages}`);
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  console.log('\n--- Edge Case Tests ---\n');

  await test('Should handle empty corpse gracefully', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();
    const npc = createMockNPC();

    // Create empty corpse
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player.username, world);
    corpse.inventory = [];

    // Execute: get sword from corpse
    const context = { world, playerDB, allPlayers: new Set([player]) };
    getCommand.execute(player, ['sword', 'from', 'corpse'], context);

    // Verify
    if (player.inventory.length !== 0) {
      throw new Error('Should not get anything from empty corpse');
    }

    // Verify message
    const messages = player.messages.join(' ');
    if (!messages.toLowerCase().includes('empty')) {
      throw new Error('Expected empty corpse message');
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  await test('Should handle non-existent item in corpse', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();
    const npc = createMockNPC();

    // Create corpse with potion
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player.username, world);
    corpse.inventory = [
      { definitionId: 'health_potion', quantity: 1, instanceId: 'potion1' }
    ];

    // Execute: get sword from corpse (sword not there)
    const context = { world, playerDB, allPlayers: new Set([player]) };
    getCommand.execute(player, ['sword', 'from', 'corpse'], context);

    // Verify
    if (player.inventory.length !== 0) {
      throw new Error('Should not get item that is not in corpse');
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  await test('Should handle non-existent corpse', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();

    // No corpse in room

    // Execute: get sword from corpse
    const context = { world, playerDB, allPlayers: new Set([player]) };
    getCommand.execute(player, ['sword', 'from', 'corpse'], context);

    // Verify
    if (player.inventory.length !== 0) {
      throw new Error('Should not get anything when corpse does not exist');
    }
  });

  await test('Should find corpse by NPC name keyword', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();
    const npc = createMockNPC('goblin_chief', 'Goblin Chief');

    // Create corpse
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player.username, world);
    corpse.inventory = [
      { definitionId: 'iron_sword', quantity: 1, instanceId: 'sword1' }
    ];

    // Execute: get sword from goblin (using NPC name as keyword)
    const context = { world, playerDB, allPlayers: new Set([player]) };
    getCommand.execute(player, ['sword', 'from', 'goblin'], context);

    // Verify
    if (player.inventory.length !== 1) {
      throw new Error('Should find corpse by NPC name keyword');
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  console.log('\n--- Item Stacking Tests ---\n');

  await test('Should stack items when looting from corpse', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player = createMockPlayer();
    const npc = createMockNPC();

    // Give player some potions
    const existingPotion = ItemFactory.createItem('health_potion');
    existingPotion.quantity = 5; // Set quantity manually after creation
    player.inventory.push(existingPotion);

    // Create corpse and clear auto-generated loot
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player.username, world);
    // Clear any auto-generated items and add only our test potion
    corpse.inventory = [
      { definitionId: 'health_potion', quantity: 3, instanceId: 'potion2' }
    ];

    // Execute: get all potion from corpse (to get the full stack of 3)
    const context = { world, playerDB, allPlayers: new Set([player]) };
    getCommand.execute(player, ['all', 'potion', 'from', 'corpse'], context);

    // Verify stacking occurred (should have 8 total potions in 1 stack)
    const potionStacks = player.inventory.filter(i => i.definitionId === 'health_potion');
    const totalPotions = potionStacks.reduce((sum, i) => sum + (i.quantity || 1), 0);

    if (totalPotions !== 8) {
      throw new Error(`Expected 8 total potions (5+3), got ${totalPotions} across ${potionStacks.length} stacks`);
    }

    if (potionStacks.length !== 1) {
      throw new Error(`Expected 1 stack (stacking should have occurred), got ${potionStacks.length} stacks`);
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  console.log('\n--- Multiple Players Looting Tests ---\n');

  await test('Should handle concurrent looting (first player wins)', async () => {
    const world = new MockWorld();
    const playerDB = new MockPlayerDB();
    const player1 = createMockPlayer('Player1');
    const player2 = createMockPlayer('Player2');
    const npc = createMockNPC();

    // Create corpse with one sword
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', player1.username, world);
    corpse.inventory = [
      { definitionId: 'iron_sword', quantity: 1, instanceId: 'sword1' }
    ];

    // Both players try to loot the sword
    const context1 = { world, playerDB, allPlayers: new Set([player1, player2]) };
    const context2 = { world, playerDB, allPlayers: new Set([player1, player2]) };

    getCommand.execute(player1, ['sword', 'from', 'corpse'], context1);
    getCommand.execute(player2, ['sword', 'from', 'corpse'], context2);

    // Verify: player1 got it, player2 didn't
    if (player1.inventory.length !== 1) {
      throw new Error('Player1 should have the sword');
    }

    if (player2.inventory.length !== 0) {
      throw new Error('Player2 should not have gotten the sword');
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Total:  ${passedTests + failedTests}\n`);

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
