/**
 * Corpse System Unit Tests
 *
 * Tests for TimerManager and CorpseManager
 * Verifies event-driven architecture and core functionality
 */

const TimerManager = require('../src/systems/corpses/TimerManager');
const CorpseManager = require('../src/systems/corpses/CorpseManager');

// Mock world for testing
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

// Utility function to wait
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test suite
async function runTests() {
  console.log('=== Corpse System Unit Tests ===\n');

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
      failedTests++;
    }
  }

  // ===== TIMER MANAGER TESTS =====
  console.log('--- TimerManager Tests ---\n');

  await test('TimerManager should schedule a timer', async () => {
    let fired = false;
    TimerManager.schedule('test1', 50, () => { fired = true; });

    if (!TimerManager.has('test1')) {
      throw new Error('Timer was not created');
    }

    await sleep(60);

    if (!fired) {
      throw new Error('Timer did not fire');
    }

    if (TimerManager.has('test1')) {
      throw new Error('Timer was not cleaned up after firing');
    }
  });

  await test('TimerManager should cancel a timer', async () => {
    let fired = false;
    TimerManager.schedule('test2', 50, () => { fired = true; });

    const canceled = TimerManager.cancel('test2');

    if (!canceled) {
      throw new Error('Timer was not canceled');
    }

    await sleep(60);

    if (fired) {
      throw new Error('Canceled timer still fired');
    }
  });

  await test('TimerManager should return correct remaining time', async () => {
    TimerManager.schedule('test3', 1000, () => {});

    const remaining = TimerManager.getRemainingTime('test3');

    if (remaining <= 0 || remaining > 1000) {
      throw new Error(`Invalid remaining time: ${remaining}`);
    }

    TimerManager.cancel('test3');
  });

  await test('TimerManager should pass data to callback', async () => {
    let receivedData = null;

    TimerManager.schedule('test4', 50, (data) => {
      receivedData = data;
    }, { foo: 'bar', type: 'test' });

    await sleep(60);

    if (!receivedData || receivedData.foo !== 'bar') {
      throw new Error('Data was not passed to callback correctly');
    }
  });

  await test('TimerManager should export state correctly', async () => {
    TimerManager.schedule('test5', 5000, () => {}, { type: 'test', data: 'value' });

    const state = TimerManager.exportState();

    if (state.length === 0) {
      throw new Error('Export state is empty');
    }

    const timer = state.find(t => t.id === 'test5');
    if (!timer) {
      throw new Error('Timer not found in export state');
    }

    if (timer.data.data !== 'value') {
      throw new Error('Timer data not exported correctly');
    }

    TimerManager.cancel('test5');
  });

  await test('TimerManager should restore active timers', async () => {
    let restored = false;

    const futureTime = Date.now() + 100;
    const state = [{
      id: 'restore_test',
      expiresAt: futureTime,
      data: { type: 'test', value: 'restored' }
    }];

    TimerManager.restoreState(state, {
      'test': (data) => { restored = true; }
    });

    if (!TimerManager.has('restore_test')) {
      throw new Error('Timer was not restored');
    }

    await sleep(120);

    if (!restored) {
      throw new Error('Restored timer did not fire');
    }
  });

  await test('TimerManager should execute expired timers immediately', async () => {
    let executed = false;

    const pastTime = Date.now() - 1000;
    const state = [{
      id: 'expired_test',
      expiresAt: pastTime,
      data: { type: 'test_expired' }
    }];

    TimerManager.restoreState(state, {
      'test_expired': (data) => { executed = true; }
    });

    if (!executed) {
      throw new Error('Expired timer was not executed immediately');
    }
  });

  await test('TimerManager should get active timer count', async () => {
    TimerManager.clearAll();

    TimerManager.schedule('count1', 5000, () => {});
    TimerManager.schedule('count2', 5000, () => {});

    const count = TimerManager.getActiveTimerCount();

    if (count !== 2) {
      throw new Error(`Expected 2 active timers, got ${count}`);
    }

    TimerManager.clearAll();
  });

  // ===== CORPSE MANAGER TESTS =====
  console.log('\n--- CorpseManager Tests ---\n');

  await test('CorpseManager should create an NPC corpse', async () => {
    const world = new MockWorld();

    const npc = {
      id: 'goblin',
      name: 'Goblin Warrior',
      size: 'medium',
      level: 1,
      challengeRating: 1,
      lootTables: ['trash_loot']
    };

    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', 'TestPlayer', world);

    if (!corpse) {
      throw new Error('Corpse was not created');
    }

    if (corpse.npcId !== 'goblin') {
      throw new Error('Corpse has incorrect npcId');
    }

    if (!corpse.description.includes('Killed by TestPlayer')) {
      throw new Error('Killer name not in description');
    }

    if (!corpse.isPickupable) {
      throw new Error('Corpse is not pickupable');
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  await test('CorpseManager should add corpse to room.items', async () => {
    const world = new MockWorld();

    const npc = {
      id: 'orc',
      name: 'Orc',
      size: 'large',
      level: 2,
      challengeRating: 2,
      lootTables: ['common_loot']
    };

    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', 'TestPlayer', world);

    const room = world.getRoom('test_room');
    const corpseInRoom = room.items.find(item => item.id === corpse.id);

    if (!corpseInRoom) {
      throw new Error('Corpse not found in room.items');
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  await test('CorpseManager should calculate weight based on NPC size', async () => {
    const world = new MockWorld();

    const tinyNPC = {
      id: 'rat',
      name: 'Rat',
      size: 'tiny',
      level: 1,
      challengeRating: 0,
      lootTables: ['trash_loot']
    };

    const corpse1 = CorpseManager.createNPCCorpse(tinyNPC, 'test_room', null, world);

    if (corpse1.weight !== 10) {
      throw new Error(`Expected tiny corpse weight 10, got ${corpse1.weight}`);
    }

    const hugeNPC = {
      id: 'giant',
      name: 'Giant',
      size: 'huge',
      level: 10,
      challengeRating: 5,
      lootTables: ['boss_drops']
    };

    const corpse2 = CorpseManager.createNPCCorpse(hugeNPC, 'test_room', null, world);

    if (corpse2.weight !== 500) {
      throw new Error(`Expected huge corpse weight 500, got ${corpse2.weight}`);
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse1.id, world);
    CorpseManager.destroyCorpse(corpse2.id, world);
  });

  await test('CorpseManager should track active corpses', async () => {
    const world = new MockWorld();

    const npc = {
      id: 'skeleton',
      name: 'Skeleton',
      size: 'medium',
      level: 1,
      challengeRating: 1,
      lootTables: ['trash_loot']
    };

    if (CorpseManager.hasActiveCorpse('skeleton')) {
      throw new Error('NPC should not have active corpse before creation');
    }

    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', null, world);

    if (!CorpseManager.hasActiveCorpse('skeleton')) {
      throw new Error('NPC should have active corpse after creation');
    }

    const foundCorpse = CorpseManager.getCorpseByNPC('skeleton');
    if (!foundCorpse || foundCorpse.id !== corpse.id) {
      throw new Error('Could not retrieve corpse by NPC ID');
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);

    if (CorpseManager.hasActiveCorpse('skeleton')) {
      throw new Error('NPC should not have active corpse after destruction');
    }
  });

  await test('CorpseManager should schedule decay timer', async () => {
    const world = new MockWorld();

    const npc = {
      id: 'zombie',
      name: 'Zombie',
      size: 'medium',
      level: 1,
      challengeRating: 1,
      lootTables: ['trash_loot']
    };

    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', null, world);
    const timerId = `corpse_decay_${corpse.id}`;

    if (!TimerManager.has(timerId)) {
      throw new Error('Decay timer was not scheduled');
    }

    const remaining = TimerManager.getRemainingTime(timerId);
    if (remaining <= 0) {
      throw new Error('Decay timer has invalid remaining time');
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  await test('CorpseManager should decay corpse after timer', async () => {
    // Override decay time for testing
    const config = require('../src/config/itemsConfig');
    const originalDecayTime = config.corpses.npc.decayTime;
    config.corpses.npc.decayTime = 100; // 100ms for test

    const world = new MockWorld();

    const npc = {
      id: 'imp',
      name: 'Imp',
      size: 'small',
      level: 1,
      challengeRating: 1,
      lootTables: ['trash_loot']
    };

    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', null, world);

    if (!CorpseManager.hasActiveCorpse('imp')) {
      throw new Error('Corpse should exist before decay');
    }

    // Wait for decay
    await sleep(150);

    if (CorpseManager.hasActiveCorpse('imp')) {
      throw new Error('Corpse should not exist after decay');
    }

    const room = world.getRoom('test_room');
    const corpseInRoom = room.items.find(item => item.id === corpse.id);

    if (corpseInRoom) {
      throw new Error('Corpse should be removed from room after decay');
    }

    // Restore original decay time
    config.corpses.npc.decayTime = originalDecayTime;
  });

  await test('CorpseManager should emit corpseDecayed event', async () => {
    // Override decay time for testing
    const config = require('../src/config/itemsConfig');
    const originalDecayTime = config.corpses.npc.decayTime;
    config.corpses.npc.decayTime = 100; // 100ms for test

    const world = new MockWorld();

    let eventFired = false;
    let eventData = null;

    CorpseManager.on('corpseDecayed', (data) => {
      eventFired = true;
      eventData = data;
    });

    const npc = {
      id: 'wraith',
      name: 'Wraith',
      size: 'medium',
      level: 3,
      challengeRating: 3,
      lootTables: ['common_loot']
    };

    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', null, world);

    // Wait for decay
    await sleep(150);

    if (!eventFired) {
      throw new Error('corpseDecayed event was not emitted');
    }

    if (!eventData || eventData.npcId !== 'wraith') {
      throw new Error('Event data is incorrect');
    }

    if (eventData.roomId !== 'test_room') {
      throw new Error('Event data has incorrect roomId');
    }

    // Restore original decay time
    config.corpses.npc.decayTime = originalDecayTime;
  });

  await test('CorpseManager should export and restore state', async () => {
    const world = new MockWorld();

    const npc = {
      id: 'dragon',
      name: 'Dragon',
      size: 'gargantuan',
      level: 15,
      challengeRating: 5,
      lootTables: ['boss_drops']
    };

    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', 'DragonSlayer', world);

    // Export state
    const state = CorpseManager.exportState();

    if (state.length === 0) {
      throw new Error('Export state is empty');
    }

    const savedCorpse = state.find(c => c.id === corpse.id);
    if (!savedCorpse) {
      throw new Error('Corpse not found in export state');
    }

    if (savedCorpse.killerName !== 'DragonSlayer') {
      throw new Error('Killer name not preserved in export state');
    }

    // Clear and restore
    CorpseManager.destroyCorpse(corpse.id, world);
    world.rooms.test_room.items = [];

    CorpseManager.restoreState(state, world);

    if (!CorpseManager.hasActiveCorpse('dragon')) {
      throw new Error('Corpse was not restored');
    }

    const room = world.getRoom('test_room');
    const restoredCorpse = room.items.find(item => item.id === corpse.id);

    if (!restoredCorpse) {
      throw new Error('Restored corpse not found in room');
    }

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  });

  await test('CorpseManager should get debug info', async () => {
    const world = new MockWorld();

    const npc = {
      id: 'demon',
      name: 'Demon',
      size: 'large',
      level: 5,
      challengeRating: 4,
      lootTables: ['epic_loot']
    };

    CorpseManager.createNPCCorpse(npc, 'test_room', 'TestHero', world);

    const debugInfo = CorpseManager.getDebugInfo();

    if (debugInfo.activeCorpses === 0) {
      throw new Error('Debug info shows no active corpses');
    }

    if (debugInfo.corpses.length === 0) {
      throw new Error('Debug info corpse list is empty');
    }

    const demonCorpse = debugInfo.corpses.find(c => c.npcId === 'demon');
    if (!demonCorpse) {
      throw new Error('Demon corpse not found in debug info');
    }

    if (demonCorpse.killerName !== 'TestHero') {
      throw new Error('Killer name not in debug info');
    }

    // Cleanup
    const corpseId = CorpseManager.getCorpseByNPC('demon').id;
    CorpseManager.destroyCorpse(corpseId, world);
  });

  // Final cleanup
  TimerManager.clearAll();

  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Total:  ${passedTests + failedTests}`);

  if (failedTests === 0) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
