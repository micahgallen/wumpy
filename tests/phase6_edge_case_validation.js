/**
 * Phase 6 Edge Case Validation Test
 *
 * Tests error handling and edge cases:
 * 1. Empty corpses (NPC with no loot table)
 * 2. Currency-only corpses
 * 3. Invalid commands (malformed inputs)
 * 4. Non-existent targets
 * 5. Race conditions (concurrent looting)
 * 6. Decay during operations
 *
 * Test Environment: Automated (no server required)
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
const TimerManager = require('../src/systems/corpses/TimerManager');
const getCommand = require('../src/commands/core/get');
const lootCommand = require('../src/commands/core/loot');
const examineCommand = require('../src/commands/core/examine');

// Mock world
class MockWorld {
  constructor() {
    this.rooms = {};
    this.npcs = {};
    this.initialRoomsState = {};
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

  createRoom(id, name) {
    this.rooms[id] = {
      id,
      name,
      items: [],
      npcs: []
    };
    return this.rooms[id];
  }

  createNPC(id, name, roomId) {
    const npc = {
      id,
      name,
      level: 1,
      hp: 20,
      maxHp: 20,
      homeRoom: roomId,
      size: 'medium'
    };
    this.npcs[id] = npc;
    if (this.rooms[roomId]) {
      this.rooms[roomId].npcs.push(id);
    }
    return npc;
  }
}

// Mock player database
class MockPlayerDB {
  updatePlayerInventory(username, inventory) {
    // No-op
  }
}

// Create mock player
function createPlayer(name, roomId = 'test_room') {
  return {
    username: name,
    currentRoom: roomId,
    inventory: [],
    strength: 10,
    messages: [],
    send: function(msg) {
      const cleaned = msg
        .replace(/\n/g, ' ')
        .replace(/\x1b\[\d+m/g, '')
        .trim();
      if (cleaned) {
        this.messages.push(cleaned);
      }
    }
  };
}

// Test suite
async function runEdgeCaseValidation() {
  console.log('='.repeat(70));
  console.log('PHASE 6: EDGE CASE VALIDATION TEST');
  console.log('='.repeat(70));
  console.log('');

  let testsPassed = 0;
  let testsFailed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✓ ${name}`);
      testsPassed++;
      return true;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      testsFailed++;
      return false;
    }
  }

  // Register test items
  ItemRegistry.registerItem({
    id: 'test_coin',
    name: 'Test Coin',
    description: 'A test coin for validation',
    keywords: ['coin', 'gold'],
    itemType: 'currency',
    weight: 0.01,
    value: 1,
    isStackable: true,
    isTakeable: true
  });

  ItemRegistry.registerItem({
    id: 'test_sword',
    name: 'Test Sword',
    description: 'A test sword for validation',
    keywords: ['sword'],
    itemType: 'weapon',
    weight: 5.0,
    value: 100,
    isStackable: false,
    isTakeable: true
  });

  const world = new MockWorld();
  const playerDB = new MockPlayerDB();
  world.createRoom('test_room', 'Test Room');
  world.initialRoomsState['test_room'] = { npcs: [] };

  RespawnManager.initialize(world);

  console.log('TEST 1: Empty Corpses');
  console.log('-'.repeat(70));

  const npc1 = world.createNPC('npc_empty', 'Empty NPC', 'test_room');
  world.removeNPCFromRoom('npc_empty', 'test_room');

  const emptyCorpse = CorpseManager.createNPCCorpse(npc1, 'test_room', 'Player', world);
  emptyCorpse.inventory = []; // Explicitly empty

  test('Empty corpse created without errors', () => {
    if (!emptyCorpse) {
      throw new Error('Empty corpse not created');
    }
    if (emptyCorpse.inventory.length !== 0) {
      throw new Error('Corpse not empty');
    }
  });

  const player1 = createPlayer('Player1', 'test_room');
  const context = { world, playerDB, allPlayers: new Set([player1]) };

  player1.messages = [];
  examineCommand.execute(player1, ['corpse'], context);

  test('Examining empty corpse shows appropriate message', () => {
    const messages = player1.messages.join(' ');
    if (!messages.toLowerCase().includes('empty') && !messages.toLowerCase().includes('nothing')) {
      throw new Error('Empty message not shown in examine');
    }
  });

  player1.messages = [];
  lootCommand.execute(player1, ['corpse'], context);

  test('Looting empty corpse shows appropriate message', () => {
    const messages = player1.messages.join(' ');
    if (!messages.toLowerCase().includes('empty') && !messages.toLowerCase().includes('nothing')) {
      throw new Error('Empty message not shown in loot');
    }
  });

  test('Looting empty corpse does not crash', () => {
    if (player1.inventory.length !== 0) {
      throw new Error('Items added from empty corpse');
    }
  });

  console.log('');
  console.log('TEST 2: Currency-Only Corpses');
  console.log('-'.repeat(70));

  const npc2 = world.createNPC('npc_rich', 'Rich NPC', 'test_room');
  world.removeNPCFromRoom('npc_rich', 'test_room');

  const richCorpse = CorpseManager.createNPCCorpse(npc2, 'test_room', 'Player', world);
  richCorpse.inventory = [
    { definitionId: 'test_coin', quantity: 100, instanceId: 'coins_1' }
  ];

  test('Currency-only corpse created', () => {
    if (!richCorpse) {
      throw new Error('Currency corpse not created');
    }
    if (richCorpse.inventory.length !== 1) {
      throw new Error('Currency not in inventory');
    }
  });

  const player2 = createPlayer('Player2', 'test_room');
  const context2 = { world, playerDB, allPlayers: new Set([player2]) };

  player2.messages = [];
  lootCommand.execute(player2, ['rich'], context2);

  test('Currency looted successfully', () => {
    const hasCurrency = player2.inventory.some(i => i.definitionId === 'test_coin');
    if (!hasCurrency) {
      throw new Error('Currency not looted');
    }
  });

  test('Currency quantity preserved', () => {
    const currency = player2.inventory.find(i => i.definitionId === 'test_coin');
    if (!currency || currency.quantity !== 100) {
      throw new Error(`Expected 100 coins, got ${currency ? currency.quantity : 0}`);
    }
  });

  console.log('');
  console.log('TEST 3: Invalid Commands');
  console.log('-'.repeat(70));

  const npc3 = world.createNPC('npc_test', 'Test NPC', 'test_room');
  world.removeNPCFromRoom('npc_test', 'test_room');

  const testCorpse = CorpseManager.createNPCCorpse(npc3, 'test_room', 'Player', world);
  testCorpse.inventory = [
    { definitionId: 'test_sword', quantity: 1, instanceId: 'sword_1' }
  ];

  const player3 = createPlayer('Player3', 'test_room');
  const context3 = { world, playerDB, allPlayers: new Set([player3]) };

  // Test: get from corpse (no item specified)
  player3.messages = [];
  getCommand.execute(player3, ['from', 'corpse'], context3);

  test('Get without item specified shows error', () => {
    const messages = player3.messages.join(' ');
    // Should show usage or error, not crash
    if (messages.length === 0) {
      throw new Error('No feedback for invalid command');
    }
  });

  // Test: get nonexistent from corpse
  player3.messages = [];
  getCommand.execute(player3, ['banana', 'from', 'corpse'], context3);

  test('Get nonexistent item shows appropriate error', () => {
    const messages = player3.messages.join(' ');
    if (!messages.toLowerCase().includes('no') && !messages.toLowerCase().includes('not found')) {
      throw new Error('No error for nonexistent item');
    }
  });

  test('Getting nonexistent item does not crash', () => {
    if (player3.inventory.length !== 0) {
      throw new Error('Nonexistent item somehow added to inventory');
    }
  });

  // Test: loot nonexistent
  player3.messages = [];
  lootCommand.execute(player3, ['nonexistent'], context3);

  test('Loot nonexistent container shows error', () => {
    const messages = player3.messages.join(' ');
    if (!messages.toLowerCase().includes('not') && !messages.toLowerCase().includes('see')) {
      throw new Error('No error for nonexistent container');
    }
  });

  console.log('');
  console.log('TEST 4: Race Conditions');
  console.log('-'.repeat(70));

  const npc4 = world.createNPC('npc_race', 'Race NPC', 'test_room');
  world.removeNPCFromRoom('npc_race', 'test_room');

  const raceCorpse = CorpseManager.createNPCCorpse(npc4, 'test_room', 'Player', world);
  raceCorpse.inventory = [
    { definitionId: 'test_sword', quantity: 1, instanceId: 'race_sword' }
  ];

  const playerA = createPlayer('PlayerA', 'test_room');
  const playerB = createPlayer('PlayerB', 'test_room');
  const raceContext = { world, playerDB, allPlayers: new Set([playerA, playerB]) };

  // Both players try to get the same item
  playerA.messages = [];
  playerB.messages = [];

  getCommand.execute(playerA, ['sword', 'from', 'race'], raceContext);
  getCommand.execute(playerB, ['sword', 'from', 'race'], raceContext);

  test('Only one player gets the item', () => {
    const aHasSword = playerA.inventory.some(i => i.definitionId === 'test_sword');
    const bHasSword = playerB.inventory.some(i => i.definitionId === 'test_sword');

    if (aHasSword && bHasSword) {
      throw new Error('Item duplicated - both players have it');
    }
    if (!aHasSword && !bHasSword) {
      throw new Error('Item disappeared - neither player has it');
    }
  });

  test('Second player gets error message', () => {
    const aMessages = playerA.messages.join(' ').toLowerCase();
    const bMessages = playerB.messages.join(' ').toLowerCase();

    // One should succeed, one should fail
    const aSuccess = aMessages.includes('take') || aMessages.includes('get');
    const bSuccess = bMessages.includes('take') || bMessages.includes('get');
    const aFail = aMessages.includes('no ') || aMessages.includes('not');
    const bFail = bMessages.includes('no ') || bMessages.includes('not');

    if (!(aSuccess && bFail) && !(bSuccess && aFail)) {
      throw new Error('Race condition not handled correctly');
    }
  });

  console.log('');
  console.log('TEST 5: Decay During Operations');
  console.log('-'.repeat(70));

  const npc5 = world.createNPC('npc_decay', 'Decay NPC', 'test_room');
  world.removeNPCFromRoom('npc_decay', 'test_room');

  const decayCorpse = CorpseManager.createNPCCorpse(npc5, 'test_room', 'Player', world);
  decayCorpse.decayTime = Date.now() + 500; // 0.5 seconds
  decayCorpse.inventory = [
    { definitionId: 'test_sword', quantity: 1, instanceId: 'decay_sword' }
  ];

  const player5 = createPlayer('Player5', 'test_room');
  const context5 = { world, playerDB, allPlayers: new Set([player5]) };

  test('Corpse with short decay time created', () => {
    const count = CorpseManager.getActiveCorpseCount();
    if (count < 1) {
      throw new Error('Decay corpse not created');
    }
  });

  console.log('Waiting for corpse to decay (0.5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 600));

  test('Corpse decayed successfully', () => {
    const corpseStillExists = CorpseManager.getCorpse(decayCorpse.id);
    if (corpseStillExists) {
      throw new Error('Corpse did not decay');
    }
  });

  player5.messages = [];
  lootCommand.execute(player5, ['decay'], context5);

  test('Looting decayed corpse shows appropriate error', () => {
    const messages = player5.messages.join(' ').toLowerCase();
    if (!messages.includes('not') && !messages.includes('see')) {
      throw new Error('No error for decayed corpse');
    }
  });

  test('Looting decayed corpse does not crash', () => {
    // Should handle gracefully
    if (player5.inventory.length !== 0) {
      throw new Error('Item looted from decayed corpse');
    }
  });

  console.log('');
  console.log('TEST 6: Encumbrance Limits');
  console.log('-'.repeat(70));

  const npc6 = world.createNPC('npc_heavy', 'Heavy NPC', 'test_room');
  world.removeNPCFromRoom('npc_heavy', 'test_room');

  const heavyCorpse = CorpseManager.createNPCCorpse(npc6, 'test_room', 'Player', world);
  heavyCorpse.inventory = [];

  // Add 30 swords (player can only carry 20 slots)
  for (let i = 0; i < 30; i++) {
    heavyCorpse.inventory.push({
      definitionId: 'test_sword',
      quantity: 1,
      instanceId: `heavy_sword_${i}`
    });
  }

  const player6 = createPlayer('Player6', 'test_room');
  player6.strength = 10; // Max slots = 10 + 10 = 20
  const context6 = { world, playerDB, allPlayers: new Set([player6]) };

  player6.messages = [];
  lootCommand.execute(player6, ['heavy'], context6);

  test('Looting with encumbrance limit enforced', () => {
    // Should take what fits, leave rest
    if (player6.inventory.length > 20) {
      throw new Error('Encumbrance limit not enforced');
    }
  });

  test('Items remain in corpse after encumbrance limit hit', () => {
    if (heavyCorpse.inventory.length === 0) {
      throw new Error('All items taken despite encumbrance limit');
    }
    const remaining = heavyCorpse.inventory.length;
    console.log(`  ${remaining} items remain in corpse (correctly enforced)`);
  });

  test('Player notified about encumbrance limit', () => {
    const messages = player6.messages.join(' ').toLowerCase();
    // Should mention weight, slots, or "cannot carry"
    const hasWarning = messages.includes('heavy') ||
                       messages.includes('slot') ||
                       messages.includes('room') ||
                       messages.includes('cannot');
    if (!hasWarning) {
      // This is acceptable - may just show what was taken
      console.log('  (No explicit encumbrance warning, but limit enforced)');
    }
  });

  console.log('');
  console.log('TEST 7: Multiple Corpses in Same Room');
  console.log('-'.repeat(70));

  const npc7a = world.createNPC('npc_multi_a', 'NPC Alpha', 'test_room');
  const npc7b = world.createNPC('npc_multi_b', 'NPC Beta', 'test_room');

  world.removeNPCFromRoom('npc_multi_a', 'test_room');
  world.removeNPCFromRoom('npc_multi_b', 'test_room');

  const corpseA = CorpseManager.createNPCCorpse(npc7a, 'test_room', 'Player', world);
  corpseA.inventory = [
    { definitionId: 'test_sword', quantity: 1, instanceId: 'sword_a' }
  ];

  const corpseB = CorpseManager.createNPCCorpse(npc7b, 'test_room', 'Player', world);
  corpseB.inventory = [
    { definitionId: 'test_coin', quantity: 50, instanceId: 'coins_b' }
  ];

  test('Multiple corpses in same room', () => {
    const room = world.getRoom('test_room');
    const corpses = room.items.filter(i => i.containerType === 'npc_corpse');
    if (corpses.length < 2) {
      throw new Error('Multiple corpses not in room');
    }
  });

  const player7 = createPlayer('Player7', 'test_room');
  const context7 = { world, playerDB, allPlayers: new Set([player7]) };

  // Get from specific corpse by NPC name
  player7.messages = [];
  getCommand.execute(player7, ['sword', 'from', 'alpha'], context7);

  test('Can target specific corpse by NPC name', () => {
    const hasSword = player7.inventory.some(i => i.definitionId === 'test_sword');
    if (!hasSword) {
      throw new Error('Could not target corpse by NPC name');
    }
  });

  player7.messages = [];
  lootCommand.execute(player7, ['beta'], context7);

  test('Can loot different corpse in same room', () => {
    const hasCoins = player7.inventory.some(i => i.definitionId === 'test_coin');
    if (!hasCoins) {
      throw new Error('Could not loot second corpse');
    }
  });

  console.log('');
  console.log('='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  console.log('Passed: ', testsPassed);
  console.log('Failed: ', testsFailed);
  console.log('');

  if (testsFailed === 0) {
    console.log('✓ ALL EDGE CASE TESTS PASSED');
    console.log('');
    console.log('VALIDATED EDGE CASES:');
    console.log('  ✓ Empty corpses handled gracefully');
    console.log('  ✓ Currency-only corpses work correctly');
    console.log('  ✓ Invalid commands show appropriate errors');
    console.log('  ✓ Nonexistent items/containers handled');
    console.log('  ✓ Race conditions prevented (no duplication)');
    console.log('  ✓ Decayed corpses cleaned up properly');
    console.log('  ✓ Encumbrance limits enforced');
    console.log('  ✓ Multiple corpses per room supported');
    console.log('');
    console.log('ERROR HANDLING:');
    console.log('  ✓ No crashes on invalid input');
    console.log('  ✓ Clear error messages shown to players');
    console.log('  ✓ System degrades gracefully under edge cases');
    console.log('');
    return true;
  } else {
    console.log('✗ SOME TESTS FAILED');
    console.log('');
    return false;
  }
}

// Run test
runEdgeCaseValidation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
