/**
 * Phase 3 Code Review Fixes Verification Test
 *
 * This test verifies the fixes for issues identified in the Phase 3 code review:
 * 1. Timer restoration buffer (100ms) for race condition
 * 2. Module require() statements moved to top-level (StateManager)
 * 3. RoomContainerManager initialization check in ServerBootstrap
 */

const logger = require('../src/logger');
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const TimerManager = require('../src/systems/corpses/TimerManager');
const ItemRegistry = require('../src/items/ItemRegistry');

function assert(condition, message) {
  if (!condition) {
    console.error('  FAIL -', message);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log('  PASS -', message);
  }
}

console.log('============================================================');
console.log('PHASE 3 CODE REVIEW FIXES VERIFICATION TEST');
console.log('============================================================\n');

/**
 * Test 1: Timer restoration buffer - edge case near 0ms
 */
async function testTimerRestorationBuffer() {
  console.log('Test 1: Timer restoration buffer (50ms remaining)');

  // Setup
  RoomContainerManager.clearAll();
  TimerManager.clearAll();

  // Register test definition
  RoomContainerManager.registerDefinition({
    id: 'test_buffer_container',
    name: 'Test Container',
    description: 'A test container',
    keywords: ['test', 'container'],
    isRoomContainer: true,
    containerType: 'room_container',
    lootConfig: {
      spawnOnInit: true,
      respawnOnEmpty: true,
      respawnDelay: { min: 5000, max: 5000 },
      guaranteedItems: [
        {
          itemId: 'test_health_potion',
          quantity: 1
        }
      ]
    }
  });

  // Create a state with a timer that has only 50ms remaining
  // This is LESS than the 100ms buffer, so it should respawn immediately
  const now = Date.now();
  const state = {
    savedAt: now - 4950, // Server was down for 4.95s
    containers: {
      test_container_50ms: {
        id: 'test_container_50ms',
        definitionId: 'test_buffer_container',
        roomId: 'test_room',
        isOpen: true,
        isLocked: false,
        inventory: [], // Empty, waiting for respawn
        capacity: 20,
        lastLooted: now - 5000,
        nextRespawn: now + 50, // Only 50ms in the future
        createdAt: now - 10000,
        modifiedAt: now - 5000
      }
    }
  };

  // Restore the state
  const result = RoomContainerManager.restoreState(state);

  // Verify that the container was respawned immediately (not scheduled)
  assert(result.restoredCount === 1, 'Container should be restored');
  assert(result.expiredCount === 1, 'Container with 50ms remaining should be treated as expired (immediate respawn)');

  // Verify the container has loot now
  const container = RoomContainerManager.getContainer('test_container_50ms');
  assert(container !== null, 'Container should exist');
  assert(container.inventory.length === 1, 'Container should have respawned loot');

  // Verify no timer is scheduled
  const hasTimer = TimerManager.has('container_respawn_test_container_50ms');
  assert(!hasTimer, 'No timer should be scheduled for expired container');

  console.log('');
}

/**
 * Test 2: Timer restoration buffer - safe scheduling above buffer
 */
async function testTimerRestorationSafeScheduling() {
  console.log('Test 2: Timer restoration safe scheduling (200ms remaining)');

  // Setup
  RoomContainerManager.clearAll();
  TimerManager.clearAll();

  // Register test definition
  RoomContainerManager.registerDefinition({
    id: 'test_buffer_container',
    name: 'Test Container',
    description: 'A test container',
    keywords: ['test', 'container'],
    isRoomContainer: true,
    containerType: 'room_container',
    lootConfig: {
      spawnOnInit: false,
      respawnOnEmpty: true,
      respawnDelay: { min: 5000, max: 5000 }
    }
  });

  // Create a state with a timer that has 200ms remaining
  // This is MORE than the 100ms buffer, so it should be scheduled normally
  const now = Date.now();
  const state = {
    savedAt: now - 4800, // Server was down for 4.8s
    containers: {
      test_container_200ms: {
        id: 'test_container_200ms',
        definitionId: 'test_buffer_container',
        roomId: 'test_room',
        isOpen: true,
        isLocked: false,
        inventory: [], // Empty, waiting for respawn
        capacity: 20,
        lastLooted: now - 5000,
        nextRespawn: now + 200, // 200ms in the future (> 100ms buffer)
        createdAt: now - 10000,
        modifiedAt: now - 5000
      }
    }
  };

  // Restore the state
  const result = RoomContainerManager.restoreState(state);

  // Verify that the container was NOT respawned immediately
  assert(result.restoredCount === 1, 'Container should be restored');
  assert(result.expiredCount === 0, 'Container with 200ms remaining should be scheduled, not respawned immediately');

  // Verify the container is still empty
  const container = RoomContainerManager.getContainer('test_container_200ms');
  assert(container !== null, 'Container should exist');
  assert(container.inventory.length === 0, 'Container should still be empty (awaiting scheduled respawn)');

  // Verify timer is scheduled
  const hasTimer = TimerManager.has('container_respawn_test_container_200ms');
  assert(hasTimer, 'Timer should be scheduled for container');

  const remainingTime = TimerManager.getRemainingTime('container_respawn_test_container_200ms');
  assert(remainingTime > 0 && remainingTime <= 250, 'Timer should have ~200ms remaining (with some tolerance)');

  console.log('');
}

/**
 * Test 3: StateManager module imports at top level
 */
function testStateManagerModuleImports() {
  console.log('Test 3: StateManager module imports are at top level');

  const fs = require('fs');
  const path = require('path');

  const stateManagerPath = path.join(__dirname, '../src/server/StateManager.js');
  const content = fs.readFileSync(stateManagerPath, 'utf8');

  // Check that require statements are at the top of the file (before class definition)
  const timerManagerImportMatch = content.match(/const TimerManager = require\(['"]\.\.\/systems\/corpses\/TimerManager['"]\)/);
  const corpseManagerImportMatch = content.match(/const CorpseManager = require\(['"]\.\.\/systems\/corpses\/CorpseManager['"]\)/);
  const roomContainerManagerImportMatch = content.match(/const RoomContainerManager = require\(['"]\.\.\/systems\/containers\/RoomContainerManager['"]\)/);

  assert(timerManagerImportMatch !== null, 'TimerManager should be imported at top level');
  assert(corpseManagerImportMatch !== null, 'CorpseManager should be imported at top level');
  assert(roomContainerManagerImportMatch !== null, 'RoomContainerManager should be imported at top level');

  // Check that require is NOT called inside saveAllState method
  const saveAllStateMatch = content.match(/saveAllState\(\)[^}]*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);
  if (saveAllStateMatch) {
    const saveAllStateBody = saveAllStateMatch[1];
    assert(!saveAllStateBody.includes('require('), 'saveAllState() should not contain any require() calls');
  }

  console.log('');
}

/**
 * Test 4: ServerBootstrap initialization check
 */
function testServerBootstrapInitCheck() {
  console.log('Test 4: ServerBootstrap initialization check');

  const fs = require('fs');
  const path = require('path');

  const bootstrapPath = path.join(__dirname, '../src/server/ServerBootstrap.js');
  const content = fs.readFileSync(bootstrapPath, 'utf8');

  // Check that restoreContainerState includes an initialization check
  const restoreContainerStateMatch = content.match(/static restoreContainerState\([^)]*\)[^{]*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);

  assert(restoreContainerStateMatch !== null, 'restoreContainerState method should exist');

  const methodBody = restoreContainerStateMatch[1];
  assert(methodBody.includes('RoomContainerManager.world'), 'Should check RoomContainerManager.world');
  assert(methodBody.includes('not initialized') || methodBody.includes('Cannot restore'), 'Should have initialization error message');
  assert(methodBody.includes('return'), 'Should return early if not initialized');

  console.log('');
}

/**
 * Test 5: Buffer constant is properly defined
 */
function testBufferConstantDefined() {
  console.log('Test 5: RESPAWN_BUFFER_MS constant is defined');

  const fs = require('fs');
  const path = require('path');

  const managerPath = path.join(__dirname, '../src/systems/containers/RoomContainerManager.js');
  const content = fs.readFileSync(managerPath, 'utf8');

  // Check that RESPAWN_BUFFER_MS is defined in the file
  assert(content.includes('RESPAWN_BUFFER_MS'), 'RESPAWN_BUFFER_MS constant should be defined');
  assert(content.includes('RESPAWN_BUFFER_MS = 100'), 'Buffer should be 100ms');
  assert(content.includes('remaining <= RESPAWN_BUFFER_MS'), 'Buffer should be used in expiry check');

  // Check it's in the context of restoreState
  const restoreStateIndex = content.indexOf('restoreState(');
  const bufferIndex = content.indexOf('RESPAWN_BUFFER_MS');
  assert(bufferIndex > restoreStateIndex, 'Buffer constant should be defined after restoreState method declaration');

  console.log('');
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Register test item
    ItemRegistry.registerItem({
      id: 'test_health_potion',
      name: 'test health potion',
      keywords: ['potion', 'health'],
      description: 'A test health potion.',
      weight: 0.5,
      value: 50,
      stackable: true,
      itemType: 'consumable'
    });

    await testTimerRestorationBuffer();
    await testTimerRestorationSafeScheduling();
    testStateManagerModuleImports();
    testServerBootstrapInitCheck();
    testBufferConstantDefined();

    console.log('============================================================');
    console.log('ALL TESTS PASSED: 5/5');
    console.log('============================================================');

    // Cleanup
    RoomContainerManager.clearAll();
    TimerManager.clearAll();

    process.exit(0);
  } catch (error) {
    console.error('\n============================================================');
    console.error('TEST FAILED:', error.message);
    console.error('============================================================');

    // Cleanup
    RoomContainerManager.clearAll();
    TimerManager.clearAll();

    process.exit(1);
  }
}

// Run tests
runTests();
