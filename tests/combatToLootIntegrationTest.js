/**
 * Combat-to-Loot Integration Test
 *
 * Tests the complete flow:
 * 1. Player attacks NPC
 * 2. NPC dies, corpse created
 * 3. Player examines corpse
 * 4. Player loots items
 * 5. Corpse decays (or is empty)
 */

const path = require('path');

// Mock logger
const mockLogger = {
  log: (msg) => console.log('[LOG]', msg),
  warn: (msg) => console.warn('[WARN]', msg),
  error: (msg, err) => console.error('[ERROR]', msg, err),
  debug: () => {}
};

require.cache[path.resolve(__dirname, '../src/logger.js')] = {
  exports: mockLogger
};

const ItemRegistry = require('../src/items/ItemRegistry');
const CorpseManager = require('../src/systems/corpses/CorpseManager');
const RespawnManager = require('../src/systems/corpses/RespawnManager');
const getCommand = require('../src/commands/core/get');
const lootCommand = require('../src/commands/core/loot');
const examineCommand = require('../src/commands/core/examine');

// Mock world
class MockWorld {
  constructor() {
    this.rooms = {
      forest: {
        id: 'forest',
        name: 'Dark Forest',
        items: [],
        npcs: ['goblin_1']
      }
    };
    this.npcs = {
      goblin_1: {
        id: 'goblin_1',
        name: 'Goblin Scout',
        level: 2,
        health: 20,
        maxHealth: 20,
        homeRoom: 'forest',
        size: 'small',
        keywords: ['goblin', 'scout']
      }
    };
  }

  getRoom(roomId) {
    return this.rooms[roomId] || null;
  }

  getNPC(npcId) {
    return this.npcs[npcId] || null;
  }

  removeNPCFromRoom(npcId, roomId) {
    const room = this.rooms[roomId];
    if (room && room.npcs) {
      room.npcs = room.npcs.filter(id => id !== npcId);
    }
  }

  addNPCToRoom(npc, roomId) {
    const room = this.rooms[roomId];
    if (room) {
      if (!room.npcs) room.npcs = [];
      room.npcs.push(npc.id);
    }
    this.npcs[npc.id] = npc;
  }
}

// Mock player database
class MockPlayerDB {
  updatePlayerInventory(username, inventory) {
    // No-op for demo
  }
}

// Create mock player
function createPlayer(name) {
  return {
    username: name,
    currentRoom: 'forest',
    inventory: [],
    strength: 10,
    messages: [],
    send: function(msg) {
      const cleaned = msg
        .replace(/\n/g, '')
        .replace(/\x1b\[\d+m/g, '');
      if (cleaned.trim()) {
        this.messages.push(cleaned.trim());
      }
    }
  };
}

// Register test items
function setupTestItems() {
  ItemRegistry.registerItem({
    id: 'crude_dagger',
    name: 'Crude Dagger',
    description: 'A poorly made dagger',
    keywords: ['dagger', 'crude', 'knife'],
    itemType: 'weapon',
    weight: 2.0,
    value: 10,
    isStackable: false,
    isTakeable: true
  });

  ItemRegistry.registerItem({
    id: 'minor_health_potion',
    name: 'Minor Health Potion',
    description: 'A weak healing potion',
    keywords: ['potion', 'health', 'minor'],
    itemType: 'consumable',
    weight: 0.3,
    value: 15,
    isStackable: true,
    isTakeable: true
  });
}

// Simulate combat death
function simulateCombatDeath(npc, player, world) {
  console.log(`\n${player.username} defeats ${npc.name}!`);

  // Remove NPC from room
  world.removeNPCFromRoom(npc.id, npc.homeRoom);

  // Create corpse
  const corpse = CorpseManager.createNPCCorpse(npc, npc.homeRoom, player.username, world);

  // Add test loot
  corpse.inventory = [
    { definitionId: 'crude_dagger', quantity: 1, instanceId: 'dagger_1' },
    { definitionId: 'minor_health_potion', quantity: 2, instanceId: 'potion_1' }
  ];

  console.log(`Corpse created: ${corpse.name}`);
  return corpse;
}

// Main test
async function runIntegrationTest() {
  console.log('===========================================');
  console.log('  COMBAT-TO-LOOT INTEGRATION TEST');
  console.log('===========================================\n');

  setupTestItems();

  const world = new MockWorld();
  const playerDB = new MockPlayerDB();
  const player = createPlayer('Hero');
  const npc = world.getNPC('goblin_1');
  const context = { world, playerDB, allPlayers: new Set([player]) };

  let testsPassed = 0;
  let testsFailed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✓ ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      testsFailed++;
    }
  }

  console.log('SCENARIO: Complete combat-to-loot workflow\n');

  // Test 1: Combat creates corpse
  console.log('1. Simulating combat...');
  const corpse = simulateCombatDeath(npc, player, world);

  test('Corpse should be created', () => {
    if (!corpse) throw new Error('No corpse created');
    if (!corpse.inventory) throw new Error('Corpse has no inventory');
  });

  test('Corpse should be in room', () => {
    const room = world.getRoom('forest');
    const foundCorpse = room.items.find(i => i.id === corpse.id);
    if (!foundCorpse) throw new Error('Corpse not in room.items');
  });

  test('NPC should be removed from room', () => {
    const room = world.getRoom('forest');
    const npcStillThere = room.npcs.includes('goblin_1');
    if (npcStillThere) throw new Error('NPC still in room after death');
  });

  console.log('');

  // Test 2: Examine corpse
  console.log('2. Examining corpse...');
  player.messages = [];
  examineCommand.execute(player, ['corpse'], context);

  test('Examine should show corpse contents', () => {
    const messages = player.messages.join(' ');
    if (!messages.includes('Crude Dagger')) throw new Error('Dagger not shown in examine');
    if (!messages.includes('Minor Health Potion')) throw new Error('Potion not shown in examine');
    if (!messages.includes('x2')) throw new Error('Quantity not shown');
  });

  console.log('');

  // Test 3: Get specific item
  console.log('3. Getting dagger from corpse...');
  player.messages = [];
  const initialCorpseItems = corpse.inventory.length;
  getCommand.execute(player, ['dagger', 'from', 'corpse'], context);

  test('Get should transfer item to inventory', () => {
    if (player.inventory.length !== 1) throw new Error(`Expected 1 item, got ${player.inventory.length}`);
    if (player.inventory[0].definitionId !== 'crude_dagger') throw new Error('Wrong item in inventory');
  });

  test('Get should remove item from corpse', () => {
    if (corpse.inventory.length !== initialCorpseItems - 1) {
      throw new Error(`Corpse should have ${initialCorpseItems - 1} items, has ${corpse.inventory.length}`);
    }
  });

  console.log('');

  // Test 4: Loot remaining items
  console.log('4. Looting all remaining items...');
  player.messages = [];
  lootCommand.execute(player, ['corpse'], context);

  test('Loot should take all remaining items', () => {
    const potionCount = player.inventory.filter(i => i.definitionId === 'minor_health_potion').length;
    if (potionCount === 0) throw new Error('No potions looted');
  });

  test('Corpse should be empty after looting', () => {
    if (corpse.inventory.length !== 0) {
      throw new Error(`Corpse should be empty, has ${corpse.inventory.length} items`);
    }
  });

  test('Empty message should be shown', () => {
    const messages = player.messages.join(' ');
    if (!messages.toLowerCase().includes('empty')) {
      throw new Error('No empty corpse message shown');
    }
  });

  console.log('');

  // Test 5: Try to loot again (should fail gracefully)
  console.log('5. Attempting to loot empty corpse...');
  player.messages = [];
  lootCommand.execute(player, ['corpse'], context);

  test('Looting empty corpse should show appropriate message', () => {
    const messages = player.messages.join(' ');
    if (!messages.toLowerCase().includes('empty')) {
      throw new Error('Expected empty corpse message');
    }
  });

  console.log('');

  // Test 6: Verify final inventory
  console.log('6. Verifying final inventory...');

  test('Player should have both items', () => {
    const hasDagger = player.inventory.some(i => i.definitionId === 'crude_dagger');
    const hasPotion = player.inventory.some(i => i.definitionId === 'minor_health_potion');
    if (!hasDagger) throw new Error('Missing dagger');
    if (!hasPotion) throw new Error('Missing potion');
  });

  test('Potion stack should have correct quantity', () => {
    const potion = player.inventory.find(i => i.definitionId === 'minor_health_potion');
    if (!potion) throw new Error('No potion in inventory');
    if (potion.quantity !== 2) throw new Error(`Expected 2 potions, got ${potion.quantity}`);
  });

  console.log('');

  // Cleanup
  CorpseManager.destroyCorpse(corpse.id, world);

  // Results
  console.log('===========================================');
  console.log('TEST RESULTS');
  console.log('===========================================');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total:  ${testsPassed + testsFailed}`);
  console.log('');

  if (testsFailed > 0) {
    console.log('INTEGRATION TEST FAILED ✗\n');
    process.exit(1);
  } else {
    console.log('ALL INTEGRATION TESTS PASSED ✓\n');
    console.log('The complete combat-to-loot flow is working correctly!');
    console.log('');
    process.exit(0);
  }
}

// Run test
runIntegrationTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
