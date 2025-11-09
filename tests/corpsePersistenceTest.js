/**
 * Corpse Persistence Test Suite - Phase 4
 *
 * Tests that corpses and timers persist correctly across server restarts.
 *
 * Test Coverage:
 * 1. Save and restore corpses with timers
 * 2. Expired corpses decay immediately on restore
 * 3. Active corpses maintain correct timing
 * 4. Multiple corpses persist correctly
 * 5. NPCs respawn after expired corpses
 * 6. File corruption handling
 */

const TimerManager = require('../src/systems/corpses/TimerManager');
const CorpseManager = require('../src/systems/corpses/CorpseManager');
const RespawnManager = require('../src/systems/corpses/RespawnManager');
const World = require('../src/world');
const fs = require('fs');
const path = require('path');

// Test utilities
const TEST_DATA_DIR = path.join(__dirname, '../data/test');
const TEST_CORPSES_PATH = path.join(TEST_DATA_DIR, 'corpses.json');

// Cleanup test data
function cleanupTestData() {
  if (fs.existsSync(TEST_CORPSES_PATH)) {
    fs.unlinkSync(TEST_CORPSES_PATH);
  }
  if (fs.existsSync(TEST_DATA_DIR) && fs.readdirSync(TEST_DATA_DIR).length === 0) {
    fs.rmdirSync(TEST_DATA_DIR);
  }
}

// Create fresh instances for each test
function resetManagers() {
  // Clear all timers
  TimerManager.clearAll();

  // Clear all corpses
  CorpseManager.corpses.clear();
  CorpseManager.npcCorpseMap.clear();
}

// Mock world for testing
function createMockWorld() {
  const world = {
    rooms: {
      'test_room_1': {
        id: 'test_room_1',
        name: 'Test Room 1',
        description: 'A test room',
        items: [],
        npcs: []
      },
      'test_room_2': {
        id: 'test_room_2',
        name: 'Test Room 2',
        description: 'Another test room',
        items: [],
        npcs: []
      }
    },
    npcs: {
      'goblin_1': {
        id: 'goblin_1',
        name: 'Goblin Warrior',
        maxHp: 30,
        hp: 30,
        homeRoom: 'test_room_1'
      },
      'orc_1': {
        id: 'orc_1',
        name: 'Orc Berserker',
        maxHp: 50,
        hp: 50,
        homeRoom: 'test_room_2'
      }
    },
    getRoom: function(roomId) {
      return this.rooms[roomId];
    },
    getNPC: function(npcId) {
      return this.npcs[npcId];
    }
  };

  return world;
}

// Mock NPC
function createMockNPC(id, name, homeRoom) {
  return {
    id: id,
    name: name,
    maxHp: 30,
    hp: 30,
    homeRoom: homeRoom,
    size: 'medium'
  };
}

console.log('\n=== CORPSE PERSISTENCE TEST SUITE ===\n');

// ============================================================================
// TEST 1: Save and Restore Corpses
// ============================================================================
console.log('TEST 1: Save and Restore Corpses');
console.log('-'.repeat(60));

try {
  resetManagers();
  cleanupTestData();

  const world = createMockWorld();
  const npc = createMockNPC('goblin_1', 'Goblin Warrior', 'test_room_1');

  // Create a corpse with 60-second decay
  const corpse = CorpseManager.createNPCCorpse(npc, 'test_room_1', 'TestPlayer', world);

  if (!corpse) {
    throw new Error('Failed to create corpse');
  }

  console.log(`Created corpse: ${corpse.id}`);
  console.log(`Corpse will decay in: ${Math.floor((corpse.decayTime - Date.now()) / 1000)}s`);

  // Export state
  const corpseState = {
    corpses: CorpseManager.exportState(),
    savedAt: Date.now(),
    version: '1.0'
  };

  console.log(`Exported ${corpseState.corpses.length} corpses`);

  // Save to disk
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(TEST_CORPSES_PATH, JSON.stringify(corpseState, null, 2));
  console.log(`Saved to: ${TEST_CORPSES_PATH}`);

  // Clear memory (simulate server restart)
  console.log('Simulating server restart...');
  resetManagers();

  const freshWorld = createMockWorld();

  // Restore from disk
  const rawData = fs.readFileSync(TEST_CORPSES_PATH, 'utf8');
  const loadedState = JSON.parse(rawData);

  CorpseManager.restoreState(loadedState.corpses, freshWorld);

  // Verify corpse exists
  const restoredCorpse = CorpseManager.getCorpse(corpse.id);

  if (!restoredCorpse) {
    throw new Error('Corpse not restored');
  }

  console.log(`Restored corpse: ${restoredCorpse.id}`);
  console.log(`Corpse name: ${restoredCorpse.name}`);
  console.log(`Corpse items: ${restoredCorpse.inventory.length}`);
  console.log(`Corpse in room: ${freshWorld.rooms['test_room_1'].items.length > 0}`);

  // Verify timer rescheduled
  const timerExists = TimerManager.has(`corpse_decay_${corpse.id}`);
  const remainingTime = TimerManager.getRemainingTime(`corpse_decay_${corpse.id}`);

  console.log(`Timer rescheduled: ${timerExists}`);
  console.log(`Timer remaining: ${Math.floor(remainingTime / 1000)}s`);

  if (!timerExists) {
    throw new Error('Timer not rescheduled');
  }

  console.log('✓ TEST 1 PASSED\n');
} catch (err) {
  console.error('✗ TEST 1 FAILED:', err.message);
  console.log('');
}

// ============================================================================
// TEST 2: Expired Corpse Handling
// ============================================================================
console.log('TEST 2: Expired Corpse Handling');
console.log('-'.repeat(60));

try {
  resetManagers();
  cleanupTestData();

  const world = createMockWorld();
  const npc = createMockNPC('goblin_1', 'Goblin Warrior', 'test_room_1');

  // Create corpse
  const corpse = CorpseManager.createNPCCorpse(npc, 'test_room_1', 'TestPlayer', world);

  // Export state
  const corpseState = {
    corpses: CorpseManager.exportState(),
    savedAt: Date.now(),
    version: '1.0'
  };

  // Manually set decay time to past (simulate expired corpse)
  corpseState.corpses[0].decayTime = Date.now() - 10000; // 10 seconds ago

  console.log('Created corpse with past decay time (expired during downtime)');

  // Save to disk
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(TEST_CORPSES_PATH, JSON.stringify(corpseState, null, 2));

  // Clear memory
  resetManagers();
  const freshWorld = createMockWorld();

  // Track decay events
  let decayEventFired = false;
  let decayedNpcId = null;

  CorpseManager.on('corpseDecayed', (data) => {
    decayEventFired = true;
    decayedNpcId = data.npcId;
  });

  // Restore from disk
  const rawData = fs.readFileSync(TEST_CORPSES_PATH, 'utf8');
  const loadedState = JSON.parse(rawData);

  console.log('Restoring expired corpse...');
  CorpseManager.restoreState(loadedState.corpses, freshWorld);

  // Verify corpse was NOT restored
  const restoredCorpse = CorpseManager.getCorpse(corpse.id);

  console.log(`Corpse restored: ${restoredCorpse !== null}`);
  console.log(`Decay event fired: ${decayEventFired}`);
  console.log(`Decayed NPC ID: ${decayedNpcId}`);

  if (restoredCorpse !== null) {
    throw new Error('Expired corpse should not be restored');
  }

  if (!decayEventFired) {
    throw new Error('Decay event should fire for expired corpse');
  }

  if (decayedNpcId !== 'goblin_1') {
    throw new Error(`Wrong NPC ID in decay event: ${decayedNpcId}`);
  }

  console.log('✓ TEST 2 PASSED\n');
} catch (err) {
  console.error('✗ TEST 2 FAILED:', err.message);
  console.log('');
}

// ============================================================================
// TEST 3: Active Corpse Timing Precision
// ============================================================================
console.log('TEST 3: Active Corpse Timing Precision');
console.log('-'.repeat(60));

try {
  resetManagers();
  cleanupTestData();

  const world = createMockWorld();
  const npc = createMockNPC('goblin_1', 'Goblin Warrior', 'test_room_1');

  // Create corpse
  const corpse = CorpseManager.createNPCCorpse(npc, 'test_room_1', 'TestPlayer', world);
  const originalDecayTime = corpse.decayTime;
  const originalRemaining = originalDecayTime - Date.now();

  console.log(`Original decay time: ${new Date(originalDecayTime).toISOString()}`);
  console.log(`Original remaining: ${Math.floor(originalRemaining / 1000)}s`);

  // Export state
  const corpseState = {
    corpses: CorpseManager.exportState(),
    savedAt: Date.now(),
    version: '1.0'
  };

  // Save to disk
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(TEST_CORPSES_PATH, JSON.stringify(corpseState, null, 2));

  // Simulate 2-second downtime
  console.log('Simulating 2-second server downtime...');
  const sleepMs = 2000;
  const sleepStart = Date.now();
  while (Date.now() - sleepStart < sleepMs) {
    // Busy wait
  }

  // Clear memory
  resetManagers();
  const freshWorld = createMockWorld();

  // Restore from disk
  const rawData = fs.readFileSync(TEST_CORPSES_PATH, 'utf8');
  const loadedState = JSON.parse(rawData);
  const actualDowntime = Date.now() - loadedState.savedAt;

  console.log(`Actual downtime: ${Math.floor(actualDowntime / 1000)}s`);

  CorpseManager.restoreState(loadedState.corpses, freshWorld);

  // Check timer precision
  const restoredRemaining = TimerManager.getRemainingTime(`corpse_decay_${corpse.id}`);
  const expectedRemaining = originalRemaining - actualDowntime;
  const timingError = Math.abs(restoredRemaining - expectedRemaining);

  console.log(`Expected remaining: ${Math.floor(expectedRemaining / 1000)}s`);
  console.log(`Actual remaining: ${Math.floor(restoredRemaining / 1000)}s`);
  console.log(`Timing error: ${timingError}ms`);

  // Allow 1-second margin of error (1000ms)
  if (timingError > 1000) {
    throw new Error(`Timing error too large: ${timingError}ms (expected < 1000ms)`);
  }

  console.log('✓ TEST 3 PASSED\n');
} catch (err) {
  console.error('✗ TEST 3 FAILED:', err.message);
  console.log('');
}

// ============================================================================
// TEST 4: Multiple Corpses
// ============================================================================
console.log('TEST 4: Multiple Corpses Persistence');
console.log('-'.repeat(60));

try {
  resetManagers();
  cleanupTestData();

  const world = createMockWorld();

  // Create 3 corpses
  const npc1 = createMockNPC('goblin_1', 'Goblin Warrior', 'test_room_1');
  const npc2 = createMockNPC('goblin_2', 'Goblin Archer', 'test_room_1');
  const npc3 = createMockNPC('orc_1', 'Orc Berserker', 'test_room_2');

  const corpse1 = CorpseManager.createNPCCorpse(npc1, 'test_room_1', 'Player1', world);
  const corpse2 = CorpseManager.createNPCCorpse(npc2, 'test_room_1', 'Player2', world);
  const corpse3 = CorpseManager.createNPCCorpse(npc3, 'test_room_2', 'Player3', world);

  console.log('Created 3 corpses:');
  console.log(`  1. ${corpse1.id} in ${corpse1.spawnLocation}`);
  console.log(`  2. ${corpse2.id} in ${corpse2.spawnLocation}`);
  console.log(`  3. ${corpse3.id} in ${corpse3.spawnLocation}`);

  // Export and save
  const corpseState = {
    corpses: CorpseManager.exportState(),
    savedAt: Date.now(),
    version: '1.0'
  };

  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(TEST_CORPSES_PATH, JSON.stringify(corpseState, null, 2));

  // Clear memory
  resetManagers();
  const freshWorld = createMockWorld();

  // Restore
  const rawData = fs.readFileSync(TEST_CORPSES_PATH, 'utf8');
  const loadedState = JSON.parse(rawData);

  CorpseManager.restoreState(loadedState.corpses, freshWorld);

  // Verify all corpses restored
  const restored1 = CorpseManager.getCorpse(corpse1.id);
  const restored2 = CorpseManager.getCorpse(corpse2.id);
  const restored3 = CorpseManager.getCorpse(corpse3.id);

  console.log('Restored corpses:');
  console.log(`  1. ${restored1 ? restored1.id : 'MISSING'}`);
  console.log(`  2. ${restored2 ? restored2.id : 'MISSING'}`);
  console.log(`  3. ${restored3 ? restored3.id : 'MISSING'}`);

  if (!restored1 || !restored2 || !restored3) {
    throw new Error('Not all corpses restored');
  }

  // Verify all timers scheduled
  const timer1 = TimerManager.has(`corpse_decay_${corpse1.id}`);
  const timer2 = TimerManager.has(`corpse_decay_${corpse2.id}`);
  const timer3 = TimerManager.has(`corpse_decay_${corpse3.id}`);

  console.log('Timers rescheduled:');
  console.log(`  1. ${timer1}`);
  console.log(`  2. ${timer2}`);
  console.log(`  3. ${timer3}`);

  if (!timer1 || !timer2 || !timer3) {
    throw new Error('Not all timers rescheduled');
  }

  // Verify room placement
  const room1Items = freshWorld.rooms['test_room_1'].items.length;
  const room2Items = freshWorld.rooms['test_room_2'].items.length;

  console.log('Room placement:');
  console.log(`  Room 1: ${room1Items} items (expected 2)`);
  console.log(`  Room 2: ${room2Items} items (expected 1)`);

  if (room1Items !== 2 || room2Items !== 1) {
    throw new Error('Corpses not placed in correct rooms');
  }

  console.log('✓ TEST 4 PASSED\n');
} catch (err) {
  console.error('✗ TEST 4 FAILED:', err.message);
  console.log('');
}

// ============================================================================
// TEST 5: Respawn Integration
// ============================================================================
console.log('TEST 5: Respawn Integration After Expired Corpse');
console.log('-'.repeat(60));

try {
  resetManagers();
  cleanupTestData();

  // Create mock world with initial state
  const world = createMockWorld();
  world.initialRoomsState = {
    'test_room_1': {
      npcs: ['goblin_1']
    }
  };

  // Initialize RespawnManager
  RespawnManager.initialize(world);

  // Remove NPC from room (simulate death)
  world.rooms['test_room_1'].npcs = [];

  const npc = createMockNPC('goblin_1', 'Goblin Warrior', 'test_room_1');

  // Create corpse
  const corpse = CorpseManager.createNPCCorpse(npc, 'test_room_1', 'TestPlayer', world);

  // Export with past decay time
  const corpseState = {
    corpses: CorpseManager.exportState(),
    savedAt: Date.now(),
    version: '1.0'
  };

  corpseState.corpses[0].decayTime = Date.now() - 5000; // Expired 5 seconds ago

  console.log('Created expired corpse (will trigger respawn on restore)');

  // Save to disk
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(TEST_CORPSES_PATH, JSON.stringify(corpseState, null, 2));

  // Clear memory
  resetManagers();
  const freshWorld = createMockWorld();
  freshWorld.initialRoomsState = {
    'test_room_1': {
      npcs: ['goblin_1']
    }
  };
  freshWorld.rooms['test_room_1'].npcs = []; // NPC is dead

  // Reinitialize RespawnManager
  RespawnManager.initialize(freshWorld);

  // Restore corpse state (should trigger decay event -> respawn)
  const rawData = fs.readFileSync(TEST_CORPSES_PATH, 'utf8');
  const loadedState = JSON.parse(rawData);

  console.log('Restoring expired corpse...');
  CorpseManager.restoreState(loadedState.corpses, freshWorld);

  // Check if NPC respawned
  console.log('Checking for NPC respawn...');
  const respawnedCount = RespawnManager.checkAndRespawnMissing();

  const npcInRoom = freshWorld.rooms['test_room_1'].npcs.includes('goblin_1');

  console.log(`NPC in room after restore: ${npcInRoom}`);
  console.log(`Manual respawn check spawned: ${respawnedCount} NPCs`);

  if (!npcInRoom) {
    throw new Error('NPC should have respawned after expired corpse');
  }

  // Verify no corpse exists
  const corpseExists = CorpseManager.getCorpse(corpse.id) !== null;

  console.log(`Corpse still exists: ${corpseExists}`);

  if (corpseExists) {
    throw new Error('Expired corpse should not exist after respawn');
  }

  console.log('✓ TEST 5 PASSED\n');
} catch (err) {
  console.error('✗ TEST 5 FAILED:', err.message);
  console.log('');
}

// ============================================================================
// TEST 6: Corrupted File Handling
// ============================================================================
console.log('TEST 6: Corrupted File Handling');
console.log('-'.repeat(60));

try {
  resetManagers();
  cleanupTestData();

  // Create corrupted JSON file
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(TEST_CORPSES_PATH, '{ corrupted json data ');

  console.log('Created corrupted corpse state file');

  const world = createMockWorld();

  // Try to load corrupted file
  let errorCaught = false;

  try {
    const rawData = fs.readFileSync(TEST_CORPSES_PATH, 'utf8');
    const loadedState = JSON.parse(rawData);
    CorpseManager.restoreState(loadedState.corpses, world);
  } catch (err) {
    errorCaught = true;
    console.log(`Error caught: ${err.message}`);
  }

  if (!errorCaught) {
    throw new Error('Should have thrown error for corrupted file');
  }

  // Verify system still works (graceful degradation)
  const corpseCount = CorpseManager.getActiveCorpseCount();
  console.log(`Active corpses after error: ${corpseCount}`);

  if (corpseCount !== 0) {
    throw new Error('Should have zero corpses after failed load');
  }

  console.log('✓ TEST 6 PASSED\n');
} catch (err) {
  console.error('✗ TEST 6 FAILED:', err.message);
  console.log('');
}

// ============================================================================
// TEST 7: Mixed Active and Expired Corpses
// ============================================================================
console.log('TEST 7: Mixed Active and Expired Corpses');
console.log('-'.repeat(60));

try {
  resetManagers();
  cleanupTestData();

  const world = createMockWorld();
  world.initialRoomsState = {
    'test_room_1': {
      npcs: ['goblin_1', 'goblin_2']
    }
  };

  RespawnManager.initialize(world);

  // Create 2 corpses
  const npc1 = createMockNPC('goblin_1', 'Goblin Warrior', 'test_room_1');
  const npc2 = createMockNPC('goblin_2', 'Goblin Archer', 'test_room_1');

  world.rooms['test_room_1'].npcs = [];

  const corpse1 = CorpseManager.createNPCCorpse(npc1, 'test_room_1', 'Player1', world);
  const corpse2 = CorpseManager.createNPCCorpse(npc2, 'test_room_1', 'Player2', world);

  // Export state
  const corpseState = {
    corpses: CorpseManager.exportState(),
    savedAt: Date.now(),
    version: '1.0'
  };

  // Make corpse1 expired, keep corpse2 active
  corpseState.corpses[0].decayTime = Date.now() - 5000; // Expired
  corpseState.corpses[1].decayTime = Date.now() + 60000; // Still active

  console.log('Created 2 corpses: 1 expired, 1 active');

  // Save to disk
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(TEST_CORPSES_PATH, JSON.stringify(corpseState, null, 2));

  // Clear memory
  resetManagers();
  const freshWorld = createMockWorld();
  freshWorld.initialRoomsState = {
    'test_room_1': {
      npcs: ['goblin_1', 'goblin_2']
    }
  };
  freshWorld.rooms['test_room_1'].npcs = [];

  RespawnManager.initialize(freshWorld);

  // Restore
  const rawData = fs.readFileSync(TEST_CORPSES_PATH, 'utf8');
  const loadedState = JSON.parse(rawData);

  CorpseManager.restoreState(loadedState.corpses, freshWorld);

  // Check results
  const restored1 = CorpseManager.getCorpse(corpse1.id);
  const restored2 = CorpseManager.getCorpse(corpse2.id);

  console.log(`Expired corpse restored: ${restored1 !== null} (should be false)`);
  console.log(`Active corpse restored: ${restored2 !== null} (should be true)`);

  if (restored1 !== null) {
    throw new Error('Expired corpse should not be restored');
  }

  if (restored2 === null) {
    throw new Error('Active corpse should be restored');
  }

  // Check respawn
  const respawnedCount = RespawnManager.checkAndRespawnMissing();
  const npc1InRoom = freshWorld.rooms['test_room_1'].npcs.includes('goblin_1');
  const npc2InRoom = freshWorld.rooms['test_room_1'].npcs.includes('goblin_2');

  console.log(`NPC1 (expired corpse) respawned: ${npc1InRoom} (should be true)`);
  console.log(`NPC2 (active corpse) respawned: ${npc2InRoom} (should be false)`);
  console.log(`Manual respawn spawned: ${respawnedCount} NPCs`);

  if (!npc1InRoom) {
    throw new Error('NPC1 should have respawned (expired corpse)');
  }

  if (npc2InRoom) {
    throw new Error('NPC2 should NOT have respawned (active corpse)');
  }

  console.log('✓ TEST 7 PASSED\n');
} catch (err) {
  console.error('✗ TEST 7 FAILED:', err.message);
  console.log('');
}

// Final cleanup
cleanupTestData();

console.log('='.repeat(60));
console.log('CORPSE PERSISTENCE TEST SUITE COMPLETE');
console.log('='.repeat(60));
