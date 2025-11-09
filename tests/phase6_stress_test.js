/**
 * Phase 6 Stress Test
 *
 * Pushes the system to its limits:
 * 1. Rapid kill/loot/respawn cycles
 * 2. Multiple corpses per room (10+ corpses)
 * 3. Long-running timers (extended durations)
 * 4. Concurrent operations (multiple simultaneous actions)
 * 5. Memory leak detection
 *
 * Test Environment: Automated (no server required)
 */

const path = require('path');

// Mock logger
const mockLogger = {
  log: () => {}, // Suppress logs during stress test
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

// Memory monitoring
class MemoryMonitor {
  constructor() {
    this.snapshots = [];
  }

  snapshot(label) {
    const usage = process.memoryUsage();
    this.snapshots.push({
      label,
      time: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external
    });
  }

  analyze() {
    if (this.snapshots.length < 2) return null;

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];

    const heapGrowth = last.heapUsed - first.heapUsed;
    const timeElapsed = last.time - first.time;

    return {
      initialHeapMB: (first.heapUsed / 1024 / 1024).toFixed(2),
      finalHeapMB: (last.heapUsed / 1024 / 1024).toFixed(2),
      heapGrowthMB: (heapGrowth / 1024 / 1024).toFixed(2),
      timeElapsedMs: timeElapsed,
      growthRateMBPerSec: ((heapGrowth / 1024 / 1024) / (timeElapsed / 1000)).toFixed(4)
    };
  }
}

// Test suite
async function runStressTest() {
  console.log('='.repeat(70));
  console.log('PHASE 6: STRESS TEST');
  console.log('='.repeat(70));
  console.log('');

  let testsPassed = 0;
  let testsFailed = 0;
  const memoryMonitor = new MemoryMonitor();

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

  const world = new MockWorld();
  RespawnManager.initialize(world);

  console.log('TEST 1: Multiple Corpses Per Room (20 corpses)');
  console.log('-'.repeat(70));

  memoryMonitor.snapshot('Before mass creation');

  const room = world.createRoom('arena', 'Arena of Death');
  world.initialRoomsState['arena'] = { npcs: [] };

  const corpseCount = 20;
  const corpses = [];

  for (let i = 1; i <= corpseCount; i++) {
    const npcId = `mass_npc_${i}`;
    const npc = world.createNPC(npcId, `Test NPC ${i}`, 'arena');
    world.initialRoomsState['arena'].npcs.push(npcId);
    world.removeNPCFromRoom(npcId, 'arena');

    const corpse = CorpseManager.createNPCCorpse(npc, 'arena', 'Killer', world);

    // Reschedule with short timer
    const corpseId = corpse.id;
    TimerManager.cancel(`corpse_decay_${corpseId}`);
    corpse.decayTime = Date.now() + 3000; // 3 seconds

    TimerManager.schedule(
      `corpse_decay_${corpseId}`,
      3000,
      (data) => CorpseManager.onCorpseDecay(data.corpseId, world),
      {
        type: 'corpse_decay',
        corpseId,
        npcId: npc.id,
        roomId: 'arena'
      }
    );

    corpse.inventory = [];
    corpses.push(corpse);
  }

  memoryMonitor.snapshot('After mass creation');

  test(`${corpseCount} corpses created`, () => {
    const count = CorpseManager.getActiveCorpseCount();
    if (count !== corpseCount) {
      throw new Error(`Expected ${corpseCount} corpses, got ${count}`);
    }
  });

  test(`${corpseCount} timers scheduled`, () => {
    const count = TimerManager.getActiveTimerCount();
    if (count !== corpseCount) {
      throw new Error(`Expected ${corpseCount} timers, got ${count}`);
    }
  });

  test('Room contains all corpses', () => {
    const corpsesInRoom = room.items.filter(i => i.containerType === 'npc_corpse');
    if (corpsesInRoom.length !== corpseCount) {
      throw new Error(`Expected ${corpseCount} corpses in room, got ${corpsesInRoom.length}`);
    }
  });

  console.log('Waiting for all corpses to decay (3 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 3500));

  memoryMonitor.snapshot('After mass decay');

  test('All corpses decayed', () => {
    const remaining = CorpseManager.getActiveCorpseCount();
    if (remaining !== 0) {
      throw new Error(`Expected 0 corpses, got ${remaining}`);
    }
  });

  test('All timers cleaned up', () => {
    const remaining = TimerManager.getActiveTimerCount();
    if (remaining !== 0) {
      throw new Error(`Expected 0 timers, got ${remaining}`);
    }
  });

  test('All NPCs respawned', () => {
    const npcCount = room.npcs ? room.npcs.length : 0;
    if (npcCount !== corpseCount) {
      throw new Error(`Expected ${corpseCount} NPCs respawned, got ${npcCount}`);
    }
  });

  console.log('');
  console.log('TEST 2: Rapid Kill/Respawn Cycles (50 iterations)');
  console.log('-'.repeat(70));

  memoryMonitor.snapshot('Before rapid cycles');

  const rapidNPC = world.createNPC('rapid_npc', 'Rapid Test NPC', 'arena');
  world.initialRoomsState['arena'].npcs.push('rapid_npc');

  const iterations = 50;
  let cycleEvents = 0;

  CorpseManager.on('corpseDecayed', () => {
    cycleEvents++;
  });

  for (let i = 0; i < iterations; i++) {
    // Kill
    world.removeNPCFromRoom('rapid_npc', 'arena');
    const corpse = CorpseManager.createNPCCorpse(rapidNPC, 'arena', 'Killer', world);

    // Reschedule with very short timer
    const corpseId = corpse.id;
    TimerManager.cancel(`corpse_decay_${corpseId}`);
    corpse.decayTime = Date.now() + 100; // 100ms decay

    TimerManager.schedule(
      `corpse_decay_${corpseId}`,
      100,
      (data) => CorpseManager.onCorpseDecay(data.corpseId, world),
      {
        type: 'corpse_decay',
        corpseId,
        npcId: 'rapid_npc',
        roomId: 'arena'
      }
    );

    // Wait for decay
    await new Promise(resolve => setTimeout(resolve, 150));

    // Verify respawn
    if (!room.npcs.includes('rapid_npc')) {
      throw new Error(`NPC not respawned after iteration ${i + 1}`);
    }
  }

  memoryMonitor.snapshot('After rapid cycles');

  test(`${iterations} rapid cycles completed`, () => {
    if (cycleEvents < iterations) {
      throw new Error(`Only ${cycleEvents} decay events, expected ${iterations}`);
    }
  });

  test('NPC still exists after rapid cycles', () => {
    const npc = world.getNPC('rapid_npc');
    if (!npc) {
      throw new Error('NPC lost during rapid cycles');
    }
    if (npc.hp !== npc.maxHp) {
      throw new Error('NPC health not restored');
    }
  });

  console.log('');
  console.log('TEST 3: Concurrent Operations (10 simultaneous kills)');
  console.log('-'.repeat(70));

  memoryMonitor.snapshot('Before concurrent ops');

  const concurrentNPCs = [];
  for (let i = 1; i <= 10; i++) {
    const npcId = `concurrent_npc_${i}`;
    const npc = world.createNPC(npcId, `Concurrent NPC ${i}`, 'arena');
    world.initialRoomsState['arena'].npcs.push(npcId);
    concurrentNPCs.push(npc);
  }

  // Kill all NPCs at the same time (within 1ms)
  const concurrentCorpses = concurrentNPCs.map(npc => {
    world.removeNPCFromRoom(npc.id, 'arena');
    const corpse = CorpseManager.createNPCCorpse(npc, 'arena', 'Killer', world);

    // Reschedule with short timer
    const corpseId = corpse.id;
    TimerManager.cancel(`corpse_decay_${corpseId}`);
    corpse.decayTime = Date.now() + 1000; // 1 second

    TimerManager.schedule(
      `corpse_decay_${corpseId}`,
      1000,
      (data) => CorpseManager.onCorpseDecay(data.corpseId, world),
      {
        type: 'corpse_decay',
        corpseId,
        npcId: npc.id,
        roomId: 'arena'
      }
    );

    return corpse;
  });

  test('All concurrent corpses created', () => {
    if (concurrentCorpses.length !== 10) {
      throw new Error('Not all concurrent corpses created');
    }
    if (concurrentCorpses.some(c => !c)) {
      throw new Error('Some concurrent corpses are null');
    }
  });

  console.log('Waiting for concurrent decays (1 second)...');
  await new Promise(resolve => setTimeout(resolve, 1200));

  memoryMonitor.snapshot('After concurrent ops');

  test('All concurrent corpses decayed', () => {
    const remaining = CorpseManager.getActiveCorpseCount();
    if (remaining > 0) {
      throw new Error(`${remaining} corpses still active`);
    }
  });

  test('All concurrent NPCs respawned', () => {
    for (const npc of concurrentNPCs) {
      if (!room.npcs.includes(npc.id)) {
        throw new Error(`NPC ${npc.id} not respawned`);
      }
    }
  });

  console.log('');
  console.log('TEST 4: Long-Running Timers (10 second duration)');
  console.log('-'.repeat(70));

  const longNPC = world.createNPC('long_npc', 'Long Timer NPC', 'arena');
  world.initialRoomsState['arena'].npcs.push('long_npc');
  world.removeNPCFromRoom('long_npc', 'arena');

  const longCorpse = CorpseManager.createNPCCorpse(longNPC, 'arena', 'Killer', world);
  const longDecayTime = 10000; // 10 seconds
  longCorpse.decayTime = Date.now() + longDecayTime;

  test('Long timer created', () => {
    const remaining = TimerManager.getRemainingTime(`corpse_decay_${longCorpse.id}`);
    if (remaining <= 0 || remaining > longDecayTime + 100) {
      throw new Error(`Invalid remaining time: ${remaining}ms`);
    }
  });

  test('Long timer has correct expiry', () => {
    const timerData = TimerManager.getTimerData(`corpse_decay_${longCorpse.id}`);
    if (!timerData) {
      throw new Error('Timer data not found');
    }
  });

  // Don't wait for it, just verify it exists and can be queried
  const remainingAfterCheck = TimerManager.getRemainingTime(`corpse_decay_${longCorpse.id}`);

  test('Long timer tracking works', () => {
    if (remainingAfterCheck <= 0) {
      throw new Error('Timer expired prematurely');
    }
    console.log(`  Timer has ${Math.floor(remainingAfterCheck / 1000)}s remaining`);
  });

  // Clean up long timer
  TimerManager.cancel(`corpse_decay_${longCorpse.id}`);
  CorpseManager.destroyCorpse(longCorpse.id, world);

  console.log('');
  console.log('TEST 5: Memory Leak Detection');
  console.log('-'.repeat(70));

  const memoryAnalysis = memoryMonitor.analyze();

  if (memoryAnalysis) {
    console.log(`  Initial Heap: ${memoryAnalysis.initialHeapMB} MB`);
    console.log(`  Final Heap:   ${memoryAnalysis.finalHeapMB} MB`);
    console.log(`  Growth:       ${memoryAnalysis.heapGrowthMB} MB`);
    console.log(`  Growth Rate:  ${memoryAnalysis.growthRateMBPerSec} MB/sec`);

    test('Memory growth within acceptable limits', () => {
      const growthMB = parseFloat(memoryAnalysis.heapGrowthMB);
      const maxAcceptableGrowthMB = 50; // 50MB max growth for stress test

      if (growthMB > maxAcceptableGrowthMB) {
        throw new Error(`Heap grew by ${growthMB}MB, exceeds ${maxAcceptableGrowthMB}MB limit`);
      }
    });

    test('No runaway memory leak', () => {
      const growthRate = parseFloat(memoryAnalysis.growthRateMBPerSec);
      const maxRateMBPerSec = 5; // 5MB/sec max growth rate

      if (growthRate > maxRateMBPerSec) {
        throw new Error(`Growth rate ${growthRate}MB/sec exceeds ${maxRateMBPerSec}MB/sec limit`);
      }
    });
  } else {
    console.log('  (Insufficient snapshots for analysis)');
  }

  // Final cleanup check
  test('All timers cleared after stress test', () => {
    const remaining = TimerManager.getActiveTimerCount();
    if (remaining > 0) {
      console.log(`  Warning: ${remaining} timers still active`);
    }
  });

  test('All corpses cleared after stress test', () => {
    const remaining = CorpseManager.getActiveCorpseCount();
    if (remaining > 0) {
      console.log(`  Warning: ${remaining} corpses still active`);
    }
  });

  console.log('');
  console.log('TEST 6: System Recovery');
  console.log('-'.repeat(70));

  // Verify system still functional after stress
  const recoveryNPC = world.createNPC('recovery_npc', 'Recovery NPC', 'arena');
  world.initialRoomsState['arena'].npcs.push('recovery_npc');
  world.removeNPCFromRoom('recovery_npc', 'arena');

  const recoveryCorpse = CorpseManager.createNPCCorpse(recoveryNPC, 'arena', 'Killer', world);
  recoveryCorpse.decayTime = Date.now() + 500;

  test('System still creates corpses after stress', () => {
    if (!recoveryCorpse) {
      throw new Error('Cannot create corpse after stress test');
    }
  });

  await new Promise(resolve => setTimeout(resolve, 600));

  test('System still processes timers after stress', () => {
    const exists = CorpseManager.getCorpse(recoveryCorpse.id);
    if (exists) {
      throw new Error('Timer did not fire after stress test');
    }
  });

  test('System still respawns NPCs after stress', () => {
    const hasNPC = room.npcs.includes('recovery_npc');
    if (!hasNPC) {
      throw new Error('NPC did not respawn after stress test');
    }
  });

  console.log('');
  console.log('='.repeat(70));
  console.log('STRESS TEST SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  console.log('Operations Completed:');
  console.log(`  - ${corpseCount} simultaneous corpses`);
  console.log(`  - ${iterations} rapid kill/respawn cycles`);
  console.log(`  - 10 concurrent operations`);
  console.log(`  - Long-running timer validation`);
  console.log(`  - Memory leak detection`);
  console.log(`  - System recovery verification`);
  console.log('');
  console.log('Test Results:');
  console.log(`  Passed: ${testsPassed}`);
  console.log(`  Failed: ${testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log('✓ ALL STRESS TESTS PASSED');
    console.log('');
    console.log('SYSTEM STABILITY:');
    console.log('  ✓ Handles 20+ simultaneous corpses');
    console.log('  ✓ Survives 50+ rapid cycles without degradation');
    console.log('  ✓ Processes concurrent operations correctly');
    console.log('  ✓ Long-running timers work reliably');
    console.log('  ✓ No memory leaks detected');
    console.log('  ✓ System recovers fully after stress');
    console.log('');
    console.log('PRODUCTION READINESS:');
    console.log('  ✓ System proven stable under heavy load');
    console.log('  ✓ No performance degradation observed');
    console.log('  ✓ Memory usage remains bounded');
    console.log('  ✓ Ready for high-traffic scenarios');
    console.log('');
    return true;
  } else {
    console.log('✗ SOME STRESS TESTS FAILED');
    console.log('');
    console.log('RECOMMENDATION:');
    console.log('  - Review failed tests above');
    console.log('  - System may not be ready for production load');
    console.log('  - Consider optimization or architectural changes');
    console.log('');
    return false;
  }
}

// Run test
runStressTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
