/**
 * Phase 6 Persistence Validation Test
 *
 * Tests that corpses survive server restarts by:
 * 1. Creating corpses with various items
 * 2. Saving server state (simulating graceful shutdown)
 * 3. Clearing memory (simulating restart)
 * 4. Restoring state
 * 5. Verifying corpses restored with correct decay times
 * 6. Verifying expired corpses trigger immediate respawn
 * 7. Verifying loot intact after restoration
 *
 * Test Environment: Automated (no server required)
 */

const path = require('path');
const fs = require('fs');

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

  addNPCToRoom(npc, roomId) {
    const room = this.rooms[roomId];
    if (room) {
      if (!room.npcs) room.npcs = [];
      room.npcs.push(npc.id);
    }
    this.npcs[npc.id] = npc;
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

  createNPC(id, name, roomId, hp = 20) {
    const npc = {
      id,
      name,
      level: 1,
      hp,
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

// Test suite
async function runPersistenceValidation() {
  console.log('='.repeat(70));
  console.log('PHASE 6: PERSISTENCE VALIDATION TEST');
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
    id: 'test_sword',
    name: 'Test Sword',
    description: 'A test sword for validation',
    keywords: ['sword', 'test'],
    itemType: 'weapon',
    weight: 5.0,
    value: 100,
    isStackable: false,
    isTakeable: true
  });

  ItemRegistry.registerItem({
    id: 'test_potion',
    name: 'Test Potion',
    description: 'A test potion for validation',
    keywords: ['potion', 'test'],
    itemType: 'consumable',
    weight: 0.5,
    value: 25,
    isStackable: true,
    isTakeable: true
  });

  console.log('TEST 1: State Export');
  console.log('-'.repeat(70));

  const world1 = new MockWorld();
  const room = world1.createRoom('test_room', 'Test Room');
  const npc1 = world1.createNPC('npc_1', 'Test NPC 1', 'test_room');
  const npc2 = world1.createNPC('npc_2', 'Test NPC 2', 'test_room');
  const npc3 = world1.createNPC('npc_3', 'Test NPC 3', 'test_room');

  world1.initialRoomsState['test_room'] = { npcs: ['npc_1', 'npc_2', 'npc_3'] };

  RespawnManager.initialize(world1);

  // Create corpses with different decay times
  world1.removeNPCFromRoom('npc_1', 'test_room');
  const corpse1 = CorpseManager.createNPCCorpse(npc1, 'test_room', 'Player1', world1);
  corpse1.decayTime = Date.now() + 10000; // 10 seconds
  corpse1.inventory = [
    { definitionId: 'test_sword', quantity: 1, instanceId: 'sword_1' }
  ];

  world1.removeNPCFromRoom('npc_2', 'test_room');
  const corpse2 = CorpseManager.createNPCCorpse(npc2, 'test_room', 'Player2', world1);
  corpse2.decayTime = Date.now() + 5000; // 5 seconds
  corpse2.inventory = [
    { definitionId: 'test_potion', quantity: 3, instanceId: 'potion_1' }
  ];

  world1.removeNPCFromRoom('npc_3', 'test_room');
  const corpse3 = CorpseManager.createNPCCorpse(npc3, 'test_room', 'Player3', world1);
  corpse3.decayTime = Date.now() - 1000; // Already expired (for expiry test)
  corpse3.inventory = [];

  test('Three corpses created', () => {
    const count = CorpseManager.getActiveCorpseCount();
    if (count !== 3) {
      throw new Error(`Expected 3 corpses, got ${count}`);
    }
  });

  // Export state
  const corpseState = CorpseManager.exportState();
  const timerState = TimerManager.exportState();

  test('Corpse state exported', () => {
    if (corpseState.length !== 3) {
      throw new Error(`Expected 3 corpses in export, got ${corpseState.length}`);
    }
  });

  test('Timer state exported', () => {
    if (timerState.length !== 3) {
      throw new Error(`Expected 3 timers in export, got ${timerState.length}`);
    }
  });

  test('Exported corpses have inventory data', () => {
    const corpseWithSword = corpseState.find(c => c.npcId === 'npc_1');
    if (!corpseWithSword || corpseWithSword.inventory.length === 0) {
      throw new Error('Sword inventory not in export');
    }
  });

  test('Exported timers have decay times', () => {
    const allHaveExpiry = timerState.every(t => t.expiresAt > 0);
    if (!allHaveExpiry) {
      throw new Error('Some timers missing expiry time');
    }
  });

  console.log('');
  console.log('TEST 2: Simulated Server Restart');
  console.log('-'.repeat(70));

  // Clear all in-memory state (simulate server shutdown)
  const clearedTimers = TimerManager.clearAll();
  console.log(`Cleared ${clearedTimers} timers`);

  test('Timers cleared', () => {
    const remaining = TimerManager.getActiveTimerCount();
    if (remaining !== 0) {
      throw new Error(`Expected 0 timers after clear, got ${remaining}`);
    }
  });

  // Create new world instance (simulate fresh server start)
  const world2 = new MockWorld();
  world2.createRoom('test_room', 'Test Room');
  world2.createNPC('npc_1', 'Test NPC 1', 'test_room');
  world2.createNPC('npc_2', 'Test NPC 2', 'test_room');
  world2.createNPC('npc_3', 'Test NPC 3', 'test_room');
  world2.initialRoomsState['test_room'] = { npcs: ['npc_1', 'npc_2', 'npc_3'] };

  // Manually remove NPCs that had corpses
  world2.removeNPCFromRoom('npc_1', 'test_room');
  world2.removeNPCFromRoom('npc_2', 'test_room');
  world2.removeNPCFromRoom('npc_3', 'test_room');

  console.log('');
  console.log('TEST 3: State Restoration');
  console.log('-'.repeat(70));

  // Track events
  let decayEvents = [];
  let respawnEvents = [];

  CorpseManager.on('corpseDecayed', (data) => {
    decayEvents.push(data);
  });

  RespawnManager.initialize(world2);
  RespawnManager.on('roomMessage', (data) => {
    if (data.message && data.message.includes('appears')) {
      respawnEvents.push(data);
    }
  });

  // Restore state
  CorpseManager.restoreState(corpseState, world2);

  test('Non-expired corpses restored', () => {
    const count = CorpseManager.getActiveCorpseCount();
    // corpse3 expired, so only 2 should be restored
    if (count !== 2) {
      throw new Error(`Expected 2 corpses restored, got ${count}`);
    }
  });

  test('Expired corpse triggered decay event', () => {
    // corpse3 should have triggered immediate decay
    const npc3Decay = decayEvents.find(e => e.npcId === 'npc_3');
    if (!npc3Decay) {
      throw new Error('Expired corpse did not trigger decay event');
    }
  });

  test('Corpses restored to correct rooms', () => {
    const room = world2.getRoom('test_room');
    const corpsesInRoom = room.items.filter(i => i.containerType === 'npc_corpse');
    if (corpsesInRoom.length !== 2) {
      throw new Error(`Expected 2 corpses in room, found ${corpsesInRoom.length}`);
    }
  });

  test('Corpse inventory preserved', () => {
    const room = world2.getRoom('test_room');
    const corpseWithSword = room.items.find(i => i.npcId === 'npc_1');
    if (!corpseWithSword) {
      throw new Error('Corpse with sword not found');
    }
    if (corpseWithSword.inventory.length === 0) {
      throw new Error('Sword inventory not preserved');
    }
    if (corpseWithSword.inventory[0].definitionId !== 'test_sword') {
      throw new Error('Wrong item in inventory');
    }
  });

  console.log('');
  console.log('TEST 4: Timer Restoration');
  console.log('-'.repeat(70));

  // Restore timers with callbacks
  const timerCallbacks = {
    'corpse_decay': (data) => CorpseManager.onCorpseDecay(data.corpseId, world2)
  };

  TimerManager.restoreState(timerState, timerCallbacks);

  test('Active timers restored', () => {
    const count = TimerManager.getActiveTimerCount();
    // Only non-expired timers should be restored
    if (count !== 2) {
      throw new Error(`Expected 2 timers restored, got ${count}`);
    }
  });

  test('Expired timer executed immediately', () => {
    // Timer for corpse3 should have executed immediately
    // Check that NPC 3 is back in room (respawned)
    const npc3Respawned = respawnEvents.find(e => e.roomId === 'test_room');
    if (!npc3Respawned) {
      // May not have respawned yet due to timing, check room directly
      const room = world2.getRoom('test_room');
      const hasNpc3 = room.npcs && room.npcs.includes('npc_3');
      if (!hasNpc3) {
        throw new Error('Expired timer did not trigger respawn');
      }
    }
  });

  test('Remaining times calculated correctly', () => {
    const timers = TimerManager.getDebugInfo().timers;
    for (const timer of timers) {
      if (timer.remainingMs <= 0) {
        throw new Error(`Timer ${timer.id} has non-positive remaining time`);
      }
    }
  });

  console.log('Waiting for restored timers to fire (5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 5500));

  test('At least one restored timer fired', () => {
    // corpse2 should have decayed by now (5 second timer)
    const corpse2Decay = decayEvents.find(e => e.npcId === 'npc_2');
    if (!corpse2Decay) {
      throw new Error('Restored timer did not fire for corpse2');
    }
  });

  console.log('');
  console.log('TEST 5: File Persistence');
  console.log('-'.repeat(70));

  const testFilePath = path.join(__dirname, '../data/test_persistence.json');

  // Save to file
  const saveSuccess = TimerManager.saveState(testFilePath);

  test('State saved to file', () => {
    if (!saveSuccess) {
      throw new Error('saveState returned false');
    }
    if (!fs.existsSync(testFilePath)) {
      throw new Error('File not created');
    }
  });

  // Read and validate file
  const savedData = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));

  test('Saved file has valid structure', () => {
    if (!savedData.timers) {
      throw new Error('Missing timers array');
    }
    if (!savedData.savedAt) {
      throw new Error('Missing savedAt timestamp');
    }
    if (!savedData.version) {
      throw new Error('Missing version');
    }
  });

  test('Saved file contains timer data', () => {
    const hasData = savedData.timers.every(t => t.id && t.expiresAt && t.data);
    if (!hasData) {
      throw new Error('Timer data incomplete');
    }
  });

  // Load from file
  TimerManager.clearAll();
  const loadSuccess = TimerManager.loadState(testFilePath, timerCallbacks);

  test('State loaded from file', () => {
    if (!loadSuccess) {
      throw new Error('loadState returned false');
    }
  });

  // Cleanup
  fs.unlinkSync(testFilePath);
  console.log('Cleaned up test file');

  console.log('');
  console.log('='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  console.log('Passed: ', testsPassed);
  console.log('Failed: ', testsFailed);
  console.log('');

  if (testsFailed === 0) {
    console.log('✓ ALL PERSISTENCE TESTS PASSED');
    console.log('');
    console.log('VALIDATED FEATURES:');
    console.log('  ✓ Corpse state export/restore');
    console.log('  ✓ Timer state export/restore');
    console.log('  ✓ Inventory preservation across restarts');
    console.log('  ✓ Decay time recalculation');
    console.log('  ✓ Expired corpse handling during downtime');
    console.log('  ✓ File-based persistence (save/load)');
    console.log('  ✓ Respawn triggers for expired corpses');
    console.log('');
    console.log('CONCLUSION:');
    console.log('  - Server restarts will NOT lose corpse state');
    console.log('  - Decay timers resume correctly after restart');
    console.log('  - Player loot is safe across restarts');
    console.log('  - System handles server downtime gracefully');
    console.log('');
    return true;
  } else {
    console.log('✗ SOME TESTS FAILED');
    console.log('');
    return false;
  }
}

// Run test
runPersistenceValidation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
