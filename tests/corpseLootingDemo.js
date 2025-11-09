/**
 * Corpse Looting Demo - Phase 5
 *
 * Demonstrates complete corpse looting workflow:
 * 1. Kill an NPC (corpse created with loot)
 * 2. Examine the corpse to see contents
 * 3. Loot specific items
 * 4. Loot all remaining items
 */

const path = require('path');

// Setup logger before loading modules
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
const getCommand = require('../src/commands/core/get');
const lootCommand = require('../src/commands/core/loot');
const examineCommand = require('../src/commands/core/examine');

// Mock world
class MockWorld {
  constructor() {
    this.rooms = {
      dungeon: {
        id: 'dungeon',
        name: 'Dark Dungeon',
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
  updatePlayerInventory(username, inventory) {
    // No-op for demo
  }
}

// Create mock player
function createPlayer(name) {
  return {
    username: name,
    currentRoom: 'dungeon',
    inventory: [],
    strength: 10,
    messages: [],
    send: function(msg) {
      // Clean up message
      const cleaned = msg
        .replace(/\n/g, '')
        .replace(/\x1b\[\d+m/g, ''); // Strip ANSI colors
      if (cleaned.trim()) {
        console.log(`  [${this.username}] ${cleaned.trim()}`);
      }
    }
  };
}

// Create mock NPC
function createNPC() {
  return {
    id: 'goblin_warrior',
    name: 'Goblin Warrior',
    level: 3,
    homeRoom: 'dungeon',
    size: 'medium',
    keywords: ['goblin', 'warrior']
  };
}

// Register test items
function setupTestItems() {
  ItemRegistry.registerItem({
    id: 'rusty_sword',
    name: 'Rusty Sword',
    description: 'A worn but serviceable blade',
    keywords: ['sword', 'rusty', 'blade'],
    itemType: 'weapon',
    weight: 5.0,
    value: 15,
    isStackable: false,
    isTakeable: true
  });

  ItemRegistry.registerItem({
    id: 'health_potion',
    name: 'Health Potion',
    description: 'A red potion that restores health',
    keywords: ['potion', 'health', 'red'],
    itemType: 'consumable',
    weight: 0.5,
    value: 25,
    isStackable: true,
    isTakeable: true
  });

  ItemRegistry.registerItem({
    id: 'copper_coin',
    name: 'Copper Coins',
    description: 'Common copper currency',
    keywords: ['coins', 'copper', 'money'],
    itemType: 'currency',
    weight: 0.01,
    value: 1,
    isStackable: true,
    isTakeable: true
  });
}

// Main demo
async function runDemo() {
  console.log('===========================================');
  console.log('  CORPSE LOOTING DEMO - Phase 5');
  console.log('===========================================\n');

  setupTestItems();

  const world = new MockWorld();
  const playerDB = new MockPlayerDB();
  const player = createPlayer('Adventurer');
  const npc = createNPC();
  const context = { world, playerDB, allPlayers: new Set([player]) };

  console.log('SCENARIO: Adventurer defeats a Goblin Warrior\n');

  // Step 1: Kill NPC - create corpse with loot
  console.log('1. Creating corpse with loot...');
  const corpse = CorpseManager.createNPCCorpse(npc, 'dungeon', player.username, world);

  // Manually set loot for demo (in real game, LootGenerator does this)
  corpse.inventory = [
    { definitionId: 'rusty_sword', quantity: 1, instanceId: 'sword_1' },
    { definitionId: 'health_potion', quantity: 3, instanceId: 'potion_1' },
    { definitionId: 'copper_coin', quantity: 50, instanceId: 'coins_1' }
  ];

  console.log(`   Created: ${corpse.name}`);
  console.log(`   Contents: ${corpse.inventory.length} item types\n`);

  // Step 2: Examine corpse
  console.log('2. Examining corpse...');
  examineCommand.execute(player, ['corpse'], context);
  console.log('');

  // Step 3: Get specific item
  console.log('3. Taking specific item (sword)...');
  getCommand.execute(player, ['sword', 'from', 'corpse'], context);
  console.log('');

  // Step 4: Get some stackable items
  console.log('4. Taking partial stack (2 potions)...');
  getCommand.execute(player, ['2', 'potion', 'from', 'corpse'], context);
  console.log('');

  // Step 5: Get all remaining potions
  console.log('5. Taking all remaining potions...');
  getCommand.execute(player, ['all', 'potion', 'from', 'corpse'], context);
  console.log('');

  // Step 6: Examine corpse again
  console.log('6. Examining corpse again...');
  examineCommand.execute(player, ['corpse'], context);
  console.log('');

  // Step 7: Loot everything else
  console.log('7. Looting all remaining items...');
  lootCommand.execute(player, ['corpse'], context);
  console.log('');

  // Step 8: Try to loot empty corpse
  console.log('8. Attempting to loot empty corpse...');
  lootCommand.execute(player, ['corpse'], context);
  console.log('');

  // Show final inventory
  console.log('===========================================');
  console.log('FINAL INVENTORY:');
  console.log('===========================================');
  for (const item of player.inventory) {
    const def = ItemRegistry.getItem(item.definitionId);
    const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
    console.log(`  - ${def.name}${qty}`);
  }
  console.log('');

  // Calculate totals
  const totalItems = player.inventory.reduce((sum, i) => sum + (i.quantity || 1), 0);
  console.log(`Total items looted: ${totalItems}`);
  console.log(`Inventory slots used: ${player.inventory.length}/20`);

  // Cleanup
  CorpseManager.destroyCorpse(corpse.id, world);

  console.log('\n===========================================');
  console.log('  DEMO COMPLETE');
  console.log('===========================================\n');

  console.log('Phase 5 Features Demonstrated:');
  console.log('  ✓ get <item> from <corpse>');
  console.log('  ✓ get <qty> <item> from <corpse>');
  console.log('  ✓ get all <item> from <corpse>');
  console.log('  ✓ loot <corpse> (quick-loot)');
  console.log('  ✓ examine <corpse> (shows contents)');
  console.log('  ✓ Item stacking');
  console.log('  ✓ Empty corpse handling');
  console.log('  ✓ Room messages to other players\n');
}

// Run demo
runDemo().catch(err => {
  console.error('Demo error:', err);
  process.exit(1);
});
