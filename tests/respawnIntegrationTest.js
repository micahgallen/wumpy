/**
 * Respawn Integration Test
 *
 * Tests the complete respawn cycle:
 * 1. NPC death → corpse creation
 * 2. Corpse decay timer
 * 3. Corpse decay event
 * 4. NPC respawn at original location
 * 5. Edge cases and error handling
 *
 * Run with: node tests/respawnIntegrationTest.js
 */

const path = require('path');

// Set up test environment
process.chdir(path.join(__dirname, '..'));

const World = require('../src/world');
const TimerManager = require('../src/systems/corpses/TimerManager');
const CorpseManager = require('../src/systems/corpses/CorpseManager');
const RespawnManager = require('../src/systems/corpses/RespawnManager');
const logger = require('../src/logger');

// Test utilities
const assert = (condition, message, details = '') => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    if (details) console.error(`   Details: ${details}`);
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
};

const testInfo = (message) => {
  console.log(`ℹ️  ${message}`);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test framework
class RespawnTestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('='.repeat(80));
    console.log('RESPAWN INTEGRATION TEST SUITE');
    console.log('='.repeat(80));
    console.log('');

    for (const { name, fn } of this.tests) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`TEST: ${name}`);
      console.log('─'.repeat(80));

      try {
        await fn();
        this.passed++;
        console.log(`✅ PASSED: ${name}\n`);
      } catch (error) {
        this.failed++;
        console.error(`❌ FAILED: ${name}`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}\n`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total: ${this.tests.length}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log('='.repeat(80));

    return this.failed === 0;
  }
}

// Initialize test runner
const runner = new RespawnTestRunner();

// =============================================================================
// TEST 1: Basic Respawn Cycle
// =============================================================================
runner.test('Basic Respawn Cycle', async () => {
  testInfo('Testing: NPC death → corpse → decay → respawn');

  // Initialize systems
  const world = new World();
  RespawnManager.initialize(world);

  // Find a room with an NPC
  let testRoomId = null;
  let testNpcId = null;

  for (const roomId in world.rooms) {
    const room = world.rooms[roomId];
    if (room.npcs && room.npcs.length > 0) {
      testRoomId = roomId;
      testNpcId = room.npcs[0];
      break;
    }
  }

  assert(testRoomId !== null, 'Found test room with NPC');
  assert(testNpcId !== null, 'Found test NPC');

  const room = world.getRoom(testRoomId);
  const npc = world.getNPC(testNpcId);

  testInfo(`Using room: ${testRoomId}`);
  testInfo(`Using NPC: ${testNpcId} (${npc.name})`);

  // Store original state
  const originalNpcCount = room.npcs.length;
  const originalMaxHp = npc.maxHp;

  testInfo(`Original NPC count in room: ${originalNpcCount}`);
  testInfo(`Original NPC maxHP: ${originalMaxHp}`);

  // Step 1: Create corpse (simulates NPC death)
  testInfo('Step 1: Creating corpse (simulating NPC death)...');

  const corpse = CorpseManager.createNPCCorpse(npc, testRoomId, 'TestKiller', world);

  assert(corpse !== null, 'Corpse created successfully');
  assert(corpse.npcId === testNpcId, 'Corpse has correct NPC ID');
  assert(corpse.spawnLocation === testRoomId, 'Corpse has correct spawn location');
  assert(CorpseManager.hasActiveCorpse(testNpcId), 'CorpseManager tracks active corpse');

  testInfo(`Corpse ID: ${corpse.id}`);
  testInfo(`Natural decay time: ${corpse.decayTime - Date.now()}ms remaining`);

  // For testing: Manually trigger decay immediately using TimerManager
  testInfo('Forcing immediate decay for testing...');

  // Cancel the normal timer and reschedule for immediate execution
  const timerId = `corpse_decay_${corpse.id}`;
  TimerManager.cancel(timerId);

  // Schedule decay in 500ms for testing
  TimerManager.schedule(
    timerId,
    500,
    (data) => CorpseManager.onCorpseDecay(data.corpseId, world),
    {
      type: 'corpse_decay',
      corpseId: corpse.id,
      npcId: testNpcId,
      roomId: testRoomId
    }
  );

  testInfo('Decay rescheduled to 500ms for testing');

  // Step 2: Remove NPC from room (simulates combat removal)
  testInfo('Step 2: Removing NPC from room...');

  const npcIndex = room.npcs.indexOf(testNpcId);
  assert(npcIndex !== -1, 'NPC found in room before removal');

  room.npcs.splice(npcIndex, 1);

  assert(!room.npcs.includes(testNpcId), 'NPC removed from room');
  assert(room.npcs.length === originalNpcCount - 1, 'Room NPC count decreased');

  testInfo(`NPC removed from room. New count: ${room.npcs.length}`);

  // Step 3: Damage NPC HP (to test HP reset on respawn)
  testInfo('Step 3: Damaging NPC HP to test reset...');

  npc.hp = Math.floor(npc.maxHp / 2);
  testInfo(`NPC HP damaged: ${npc.hp}/${npc.maxHp}`);

  // Step 4: Wait for corpse to decay
  testInfo('Step 4: Waiting for corpse decay...');

  testInfo(`Waiting 1000ms for decay...`);
  await sleep(1000);

  // Step 5: Verify corpse decayed
  testInfo('Step 5: Verifying corpse decay...');

  assert(!CorpseManager.hasActiveCorpse(testNpcId), 'Corpse no longer active');
  testInfo('Corpse decayed successfully');

  // Step 6: Verify NPC respawned
  testInfo('Step 6: Verifying NPC respawn...');

  assert(room.npcs.includes(testNpcId), 'NPC respawned in room', `NPCs in room: ${room.npcs.join(', ')}`);
  assert(room.npcs.length === originalNpcCount, 'Room NPC count restored', `Expected ${originalNpcCount}, got ${room.npcs.length}`);
  assert(npc.hp === npc.maxHp, 'NPC HP reset to max', `Expected ${npc.maxHp}, got ${npc.hp}`);

  testInfo(`NPC respawned successfully with ${npc.hp}/${npc.maxHp} HP`);
});

// =============================================================================
// TEST 2: Duplicate Prevention
// =============================================================================
runner.test('Duplicate Prevention', async () => {
  testInfo('Testing: Respawn should not create duplicates if NPC already exists');

  // Initialize systems
  const world = new World();
  RespawnManager.initialize(world);

  // Find a room with an NPC
  let testRoomId = null;
  let testNpcId = null;

  for (const roomId in world.rooms) {
    const room = world.rooms[roomId];
    if (room.npcs && room.npcs.length > 0) {
      testRoomId = roomId;
      testNpcId = room.npcs[0];
      break;
    }
  }

  const room = world.getRoom(testRoomId);
  const originalNpcCount = room.npcs.length;

  testInfo(`Room: ${testRoomId}, NPC: ${testNpcId}`);
  testInfo(`Original NPC count: ${originalNpcCount}`);

  // Manually add NPC to room (simulating it's already there)
  room.npcs.push(testNpcId);

  testInfo(`Manually added duplicate NPC. Count: ${room.npcs.length}`);

  // Try to respawn (should skip due to duplicate detection)
  testInfo('Attempting to respawn NPC that already exists...');

  const success = RespawnManager.respawnNPC(testNpcId, testRoomId);

  assert(success === false, 'Respawn correctly failed (duplicate detected)');
  assert(room.npcs.filter(id => id === testNpcId).length === 2, 'Still has 2 instances (manual + original)', `Count: ${room.npcs.filter(id => id === testNpcId).length}`);

  testInfo('Duplicate prevention working correctly');

  // Cleanup - remove the manually added duplicate
  const index = room.npcs.lastIndexOf(testNpcId);
  room.npcs.splice(index, 1);
});

// =============================================================================
// TEST 3: Missing Room Handling
// =============================================================================
runner.test('Missing Room Handling', async () => {
  testInfo('Testing: Graceful error handling when spawn room does not exist');

  // Initialize systems
  const world = new World();
  RespawnManager.initialize(world);

  const fakeRoomId = 'nonexistent_room_12345';
  const fakeNpcId = 'fake_npc_12345';

  testInfo(`Attempting to respawn NPC in non-existent room: ${fakeRoomId}`);

  const success = RespawnManager.respawnNPC(fakeNpcId, fakeRoomId);

  assert(success === false, 'Respawn correctly failed (room not found)');
  testInfo('Missing room handled gracefully without crashing');
});

// =============================================================================
// TEST 4: Corpse Movement (Respawn at Original Location)
// =============================================================================
runner.test('Corpse Movement - Respawn at Original Location', async () => {
  testInfo('Testing: NPC respawns at original location even if corpse moved');

  // Initialize systems
  const world = new World();
  RespawnManager.initialize(world);

  // Find two different rooms
  const roomIds = Object.keys(world.rooms).slice(0, 2);
  assert(roomIds.length >= 2, 'Found at least 2 rooms for testing');

  const roomA = world.getRoom(roomIds[0]);
  const roomB = world.getRoom(roomIds[1]);

  testInfo(`Room A (spawn): ${roomIds[0]}`);
  testInfo(`Room B (corpse moved to): ${roomIds[1]}`);

  // Create a test NPC
  const testNpcId = 'test_npc_movement';
  const testNpc = {
    id: testNpcId,
    name: 'Test Wumpy',
    hp: 20,
    maxHp: 20
  };

  world.npcs[testNpcId] = testNpc;

  // Add NPC to room A
  if (!roomA.npcs) roomA.npcs = [];
  roomA.npcs.push(testNpcId);

  testInfo(`Added NPC to room A. NPCs in A: ${roomA.npcs.length}`);

  // Create corpse in room A
  const corpse = CorpseManager.createNPCCorpse(testNpc, roomIds[0], 'TestKiller', world);

  assert(corpse.spawnLocation === roomIds[0], 'Corpse spawn location is room A');

  // Reschedule decay for immediate testing
  const timerId = `corpse_decay_${corpse.id}`;
  TimerManager.cancel(timerId);
  TimerManager.schedule(
    timerId,
    500,
    (data) => CorpseManager.onCorpseDecay(data.corpseId, world),
    {
      type: 'corpse_decay',
      corpseId: corpse.id,
      npcId: testNpcId,
      roomId: roomIds[0]
    }
  );

  testInfo('Decay rescheduled to 500ms for testing');

  // Remove NPC from room A
  const index = roomA.npcs.indexOf(testNpcId);
  roomA.npcs.splice(index, 1);

  testInfo('NPC removed from room A');

  // SIMULATE CORPSE MOVEMENT: Change corpse's current room to room B
  // (This could happen if a player picks up and drops the corpse elsewhere)
  testInfo('Simulating corpse movement to room B...');

  // In a real scenario, corpse would be moved via inventory system
  // For testing, we'll just verify that spawnLocation is preserved
  const originalSpawnLocation = corpse.spawnLocation;

  testInfo(`Original spawn location preserved: ${originalSpawnLocation}`);

  // Wait for decay
  testInfo('Waiting for corpse to decay...');
  await sleep(1000);

  // Verify NPC respawned in ROOM A (original location), not room B
  assert(roomA.npcs.includes(testNpcId), 'NPC respawned in original room A', `Room A NPCs: ${roomA.npcs.join(', ')}`);
  assert(!roomB.npcs.includes(testNpcId), 'NPC did not respawn in room B', `Room B NPCs: ${roomB.npcs.join(', ')}`);

  testInfo('NPC correctly respawned at original spawn location');

  // Cleanup
  delete world.npcs[testNpcId];
  roomA.npcs = roomA.npcs.filter(id => id !== testNpcId);
});

// =============================================================================
// TEST 5: Multiple Deaths (Last Corpse Wins)
// =============================================================================
runner.test('Multiple Deaths - Single Respawn', async () => {
  testInfo('Testing: Multiple corpses of same NPC → only respawns once');

  // Initialize systems
  const world = new World();
  RespawnManager.initialize(world);

  // Find a room with an NPC
  let testRoomId = null;
  let testNpcId = null;

  for (const roomId in world.rooms) {
    const room = world.rooms[roomId];
    if (room.npcs && room.npcs.length > 0) {
      testRoomId = roomId;
      testNpcId = room.npcs[0];
      break;
    }
  }

  const room = world.getRoom(testRoomId);
  const npc = world.getNPC(testNpcId);

  testInfo(`Room: ${testRoomId}, NPC: ${testNpcId}`);

  // Remove NPC from room
  const index = room.npcs.indexOf(testNpcId);
  room.npcs.splice(index, 1);

  testInfo('NPC removed from room');

  // Create multiple corpses (simulating NPC dying multiple times)
  testInfo('Creating 3 corpses of the same NPC...');

  const corpse1 = CorpseManager.createNPCCorpse(npc, testRoomId, 'Killer1', world);
  await sleep(100);
  const corpse2 = CorpseManager.createNPCCorpse(npc, testRoomId, 'Killer2', world);
  await sleep(100);
  const corpse3 = CorpseManager.createNPCCorpse(npc, testRoomId, 'Killer3', world);

  testInfo(`Created corpses: ${corpse1.id}, ${corpse2.id}, ${corpse3.id}`);

  // Note: CorpseManager uses npcCorpseMap which only tracks ONE corpse per NPC
  // So only the last corpse (corpse3) is tracked
  assert(CorpseManager.hasActiveCorpse(testNpcId), 'NPC has active corpse');

  const trackedCorpse = CorpseManager.getCorpseByNPC(testNpcId);
  testInfo(`Tracked corpse: ${trackedCorpse.id}`);

  // Reschedule all corpses to decay quickly for testing
  for (const corpse of [corpse1, corpse2, corpse3]) {
    const timerId = `corpse_decay_${corpse.id}`;
    TimerManager.cancel(timerId);
    TimerManager.schedule(
      timerId,
      500,
      (data) => CorpseManager.onCorpseDecay(data.corpseId, world),
      {
        type: 'corpse_decay',
        corpseId: corpse.id,
        npcId: testNpcId,
        roomId: testRoomId
      }
    );
  }

  testInfo('All corpse decay timers rescheduled to 500ms for testing');

  // Wait for all corpses to decay
  testInfo('Waiting for corpses to decay...');
  await sleep(1000);

  // Verify NPC respawned only ONCE
  const npcInstances = room.npcs.filter(id => id === testNpcId);
  assert(npcInstances.length === 1, 'NPC respawned exactly once', `Found ${npcInstances.length} instances`);

  testInfo('Multiple deaths correctly handled - single respawn');
});

// =============================================================================
// TEST 6: Manual Respawn Check
// =============================================================================
runner.test('Manual Respawn Check (Startup Recovery)', async () => {
  testInfo('Testing: checkAndRespawnMissing() restores NPCs without corpses');

  // Initialize systems
  const world = new World();
  RespawnManager.initialize(world);

  // Clear any existing corpses from previous tests
  for (const [corpseId, corpse] of CorpseManager.corpses.entries()) {
    CorpseManager.destroyCorpse(corpseId, world);
  }

  testInfo('Cleared all existing corpses');

  // Find a room with NPCs
  let testRoomId = null;

  for (const roomId in world.rooms) {
    const room = world.rooms[roomId];
    if (room.npcs && room.npcs.length > 0) {
      testRoomId = roomId;
      break;
    }
  }

  const room = world.getRoom(testRoomId);
  const originalNpcs = [...room.npcs];

  testInfo(`Room: ${testRoomId}`);
  testInfo(`Original NPCs: ${originalNpcs.join(', ')}`);

  // Remove all NPCs from room (simulating they're missing after restart)
  room.npcs = [];

  testInfo('Removed all NPCs from room');

  // Run manual respawn check
  testInfo('Running checkAndRespawnMissing()...');

  const respawnedCount = RespawnManager.checkAndRespawnMissing();

  testInfo(`Respawned ${respawnedCount} NPCs`);

  // Verify all NPCs were restored
  assert(respawnedCount === originalNpcs.length, 'Respawned correct number of NPCs', `Expected ${originalNpcs.length}, got ${respawnedCount}`);
  assert(room.npcs.length === originalNpcs.length, 'Room NPC count restored', `Expected ${originalNpcs.length}, got ${room.npcs.length}`);

  for (const npcId of originalNpcs) {
    assert(room.npcs.includes(npcId), `NPC ${npcId} restored`);
  }

  testInfo('Manual respawn check successfully restored all missing NPCs');
});

// =============================================================================
// TEST 7: RespawnManager Debug Info
// =============================================================================
runner.test('RespawnManager Debug Info', async () => {
  testInfo('Testing: getDebugInfo() returns accurate state');

  // Initialize systems
  const world = new World();
  RespawnManager.initialize(world);

  const debugInfo = RespawnManager.getDebugInfo();

  testInfo(`Total rooms: ${debugInfo.totalRooms}`);
  testInfo(`Rooms with NPCs: ${debugInfo.roomsWithNPCs}`);
  testInfo(`Total NPCs: ${debugInfo.totalNPCs}`);
  testInfo(`Active corpses: ${debugInfo.activeCorpses}`);
  testInfo(`Missing NPCs: ${debugInfo.missingNPCs.length}`);

  assert(debugInfo.totalRooms > 0, 'Has rooms');
  assert(debugInfo.totalNPCs >= 0, 'Has NPC count');
  assert(Array.isArray(debugInfo.missingNPCs), 'Missing NPCs is array');

  testInfo('Debug info structure is correct');
});

// =============================================================================
// RUN ALL TESTS
// =============================================================================
(async () => {
  const success = await runner.run();

  if (success) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
    process.exit(0);
  } else {
    console.log('\n💥 SOME TESTS FAILED 💥\n');
    process.exit(1);
  }
})();
