/**
 * Container System Phase 3 Tests - Persistence
 *
 * Tests container state persistence across server restarts:
 * - Export/restore container state
 * - Timer restoration with elapsed time calculations
 * - Handle missing definitions gracefully
 * - Handle new containers not in save file
 * - State file operations (save/load)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import managers
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const TimerManager = require('../src/systems/corpses/TimerManager');
const ItemRegistry = require('../src/items/ItemRegistry');

// Test utilities
function createTestDefinition(id, options = {}) {
  return {
    id: id,
    name: options.name || `Test Container ${id}`,
    description: options.description || 'A test container for persistence testing',
    keywords: options.keywords || ['test', 'container', id],
    containerType: 'room_container',
    isRoomContainer: true,
    isTakeable: false,
    capacity: options.capacity || 10,
    isOpen: options.isOpen !== undefined ? options.isOpen : false,
    isLocked: options.isLocked !== undefined ? options.isLocked : false,
    lootConfig: options.lootConfig || null
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test suite
async function runTests() {
  console.log('='.repeat(60));
  console.log('CONTAINER SYSTEM PHASE 3 TESTS - PERSISTENCE');
  console.log('='.repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;

  // Setup: Register a test item in ItemRegistry
  try {
    ItemRegistry.registerItem({
      id: 'test_health_potion',
      name: 'test health potion',
      description: 'A test health potion',
      itemType: 'consumable',
      keywords: ['test', 'potion', 'health'],
      weight: 0.5,
      value: 50,
      isStackable: true
    });
  } catch (err) {
    // Item might already be registered from previous tests
  }

  // Test 1: Export state with no containers
  console.log('Test 1: Export state with no containers');
  try {
    RoomContainerManager.clearAll();
    const state = RoomContainerManager.exportState();

    assert.strictEqual(typeof state, 'object', 'State should be an object');
    assert.strictEqual(state.version, '1.0.0', 'Should have version field');
    assert.strictEqual(typeof state.savedAt, 'number', 'Should have savedAt timestamp');
    assert.strictEqual(typeof state.containers, 'object', 'Should have containers object');
    assert.strictEqual(Object.keys(state.containers).length, 0, 'Should have no containers');

    console.log('  PASS - Empty state exported correctly');
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 2: Export state with containers
  console.log('Test 2: Export state with containers');
  try {
    RoomContainerManager.clearAll();

    // Register definition and create instance
    const def = createTestDefinition('test_chest_export', { isOpen: true, capacity: 15 });
    RoomContainerManager.registerDefinition(def);
    const container = RoomContainerManager.createContainerInstance('test_chest_export', 'test_room_001');

    // Add some state
    container.lastLooted = 1699800000000;
    container.nextRespawn = 1699803600000;

    const state = RoomContainerManager.exportState();

    assert.strictEqual(Object.keys(state.containers).length, 1, 'Should have 1 container');
    const exportedContainer = state.containers[container.id];
    assert.strictEqual(exportedContainer.definitionId, 'test_chest_export', 'Should preserve definitionId');
    assert.strictEqual(exportedContainer.roomId, 'test_room_001', 'Should preserve roomId');
    assert.strictEqual(exportedContainer.isOpen, true, 'Should preserve isOpen state');
    assert.strictEqual(exportedContainer.capacity, 15, 'Should preserve capacity');
    assert.strictEqual(exportedContainer.lastLooted, 1699800000000, 'Should preserve lastLooted');
    assert.strictEqual(exportedContainer.nextRespawn, 1699803600000, 'Should preserve nextRespawn');

    console.log('  PASS - Container state exported correctly');
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 3: Restore state with valid containers
  console.log('Test 3: Restore state with valid containers');
  try {
    RoomContainerManager.clearAll();

    // Register definition first
    const def = createTestDefinition('test_chest_restore', { capacity: 20 });
    RoomContainerManager.registerDefinition(def);

    // Create mock state
    const mockState = {
      version: '1.0.0',
      savedAt: Date.now() - 5000, // 5 seconds ago
      containers: {
        'test_container_id_123': {
          id: 'test_container_id_123',
          definitionId: 'test_chest_restore',
          roomId: 'test_room_002',
          isOpen: true,
          isLocked: false,
          inventory: [],
          capacity: 20,
          lastLooted: Date.now() - 10000,
          nextRespawn: null,
          createdAt: Date.now() - 60000,
          modifiedAt: Date.now() - 5000
        }
      }
    };

    const result = RoomContainerManager.restoreState(mockState);

    assert.strictEqual(result.restoredCount, 1, 'Should restore 1 container');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors');

    const restored = RoomContainerManager.getContainer('test_container_id_123');
    assert(restored, 'Container should exist in memory');
    assert.strictEqual(restored.definitionId, 'test_chest_restore', 'Should restore definitionId');
    assert.strictEqual(restored.roomId, 'test_room_002', 'Should restore roomId');
    assert.strictEqual(restored.isOpen, true, 'Should restore isOpen state');
    assert.strictEqual(restored.capacity, 20, 'Should restore capacity');

    console.log('  PASS - Container state restored correctly');
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 4: Handle missing definition gracefully
  console.log('Test 4: Handle missing definition gracefully');
  try {
    RoomContainerManager.clearAll();

    const mockState = {
      version: '1.0.0',
      savedAt: Date.now(),
      containers: {
        'missing_def_container': {
          id: 'missing_def_container',
          definitionId: 'nonexistent_definition',
          roomId: 'test_room_003',
          isOpen: false,
          isLocked: false,
          inventory: [],
          capacity: 10,
          lastLooted: null,
          nextRespawn: null,
          createdAt: Date.now(),
          modifiedAt: Date.now()
        }
      }
    };

    const result = RoomContainerManager.restoreState(mockState);

    assert.strictEqual(result.restoredCount, 0, 'Should not restore container with missing definition');
    assert.strictEqual(result.errors.length, 1, 'Should have 1 error');
    assert(result.errors[0].reason.includes('not found'), 'Error should mention definition not found');

    const notRestored = RoomContainerManager.getContainer('missing_def_container');
    assert.strictEqual(notRestored, null, 'Container should not exist in memory');

    console.log('  PASS - Missing definition handled gracefully');
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 5: Timer restoration - active timer
  console.log('Test 5: Timer restoration - active timer (reschedule)');
  try {
    RoomContainerManager.clearAll();
    TimerManager.clearAll();

    // Register definition with respawn config
    const def = createTestDefinition('test_chest_timer', {
      lootConfig: {
        spawnOnInit: false,
        respawnOnEmpty: true,
        respawnDelay: 10000 // 10 seconds
      }
    });
    RoomContainerManager.registerDefinition(def);

    // Create state with active timer (5 seconds remaining)
    const now = Date.now();
    const mockState = {
      version: '1.0.0',
      savedAt: now - 5000,
      containers: {
        'test_timer_container': {
          id: 'test_timer_container',
          definitionId: 'test_chest_timer',
          roomId: 'test_room_004',
          isOpen: false,
          isLocked: false,
          inventory: [],
          capacity: 10,
          lastLooted: now - 15000,
          nextRespawn: now + 5000, // Still 5 seconds in the future
          createdAt: now - 60000,
          modifiedAt: now - 15000
        }
      }
    };

    const result = RoomContainerManager.restoreState(mockState);

    assert.strictEqual(result.restoredCount, 1, 'Should restore container');
    assert.strictEqual(result.expiredCount, 0, 'Should not respawn immediately');

    // Check that timer was rescheduled
    const timerId = 'container_respawn_test_timer_container';
    const hasTimer = TimerManager.has(timerId);
    assert.strictEqual(hasTimer, true, 'Timer should be rescheduled');

    const remainingTime = TimerManager.getRemainingTime(timerId);
    assert(remainingTime > 0, 'Timer should have remaining time');
    assert(remainingTime <= 5000, 'Remaining time should be approximately 5 seconds or less');

    console.log(`  PASS - Active timer rescheduled (${Math.floor(remainingTime / 1000)}s remaining)`);
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 6: Timer restoration - expired timer
  console.log('Test 6: Timer restoration - expired timer (immediate respawn)');
  try {
    RoomContainerManager.clearAll();
    TimerManager.clearAll();

    // Register definition with respawn config and guaranteed loot
    const def = createTestDefinition('test_chest_expired', {
      lootConfig: {
        spawnOnInit: false,
        respawnOnEmpty: true,
        respawnDelay: 10000,
        guaranteedItems: [
          { itemId: 'test_health_potion', quantity: 1, chance: 100 }
        ]
      }
    });
    RoomContainerManager.registerDefinition(def);

    // Create state with expired timer (should respawn immediately)
    const now = Date.now();
    const mockState = {
      version: '1.0.0',
      savedAt: now - 20000, // 20 seconds ago
      containers: {
        'test_expired_container': {
          id: 'test_expired_container',
          definitionId: 'test_chest_expired',
          roomId: 'test_room_005',
          isOpen: false,
          isLocked: false,
          inventory: [],
          capacity: 10,
          lastLooted: now - 30000,
          nextRespawn: now - 10000, // Expired 10 seconds ago
          createdAt: now - 60000,
          modifiedAt: now - 30000
        }
      }
    };

    const result = RoomContainerManager.restoreState(mockState);

    assert.strictEqual(result.restoredCount, 1, 'Should restore container');
    assert.strictEqual(result.expiredCount, 1, 'Should respawn immediately due to expired timer');

    // Check that container has loot
    const container = RoomContainerManager.getContainer('test_expired_container');
    assert(container, 'Container should exist');
    assert(container.inventory.length > 0, 'Container should have loot after respawn');

    // Check that timer is NOT active (respawn completed)
    const timerId = 'container_respawn_test_expired_container';
    const hasTimer = TimerManager.has(timerId);
    assert.strictEqual(hasTimer, false, 'Timer should not exist after immediate respawn');

    console.log('  PASS - Expired timer triggered immediate respawn');
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 7: Save and load from file
  console.log('Test 7: Save and load from file');
  try {
    RoomContainerManager.clearAll();
    TimerManager.clearAll();

    // Create temporary file path
    const tempDir = os.tmpdir();
    const testFilePath = path.join(tempDir, `test_containers_${Date.now()}.json`);

    // Register definition and create container
    const def = createTestDefinition('test_chest_file', { isOpen: true });
    RoomContainerManager.registerDefinition(def);
    const container = RoomContainerManager.createContainerInstance('test_chest_file', 'test_room_006');

    // Save to file
    const saved = RoomContainerManager.saveState(testFilePath);
    assert.strictEqual(saved, true, 'Save should succeed');
    assert.strictEqual(fs.existsSync(testFilePath), true, 'File should exist');

    // Clear manager
    RoomContainerManager.clearAll();
    assert.strictEqual(RoomContainerManager.getContainerCount(), 0, 'Manager should be empty');

    // Load from file
    const result = RoomContainerManager.loadState(testFilePath);
    assert.strictEqual(result.restoredCount, 1, 'Should restore 1 container');

    const restored = RoomContainerManager.getContainer(container.id);
    assert(restored, 'Container should be restored');
    assert.strictEqual(restored.definitionId, 'test_chest_file', 'Definition should match');
    assert.strictEqual(restored.isOpen, true, 'State should be preserved');

    // Cleanup
    fs.unlinkSync(testFilePath);

    console.log('  PASS - Save/load from file works correctly');
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 8: Handle missing file gracefully
  console.log('Test 8: Handle missing file gracefully');
  try {
    RoomContainerManager.clearAll();

    const nonexistentPath = path.join(os.tmpdir(), 'nonexistent_containers.json');
    const result = RoomContainerManager.loadState(nonexistentPath);

    assert.strictEqual(result.restoredCount, 0, 'Should restore 0 containers');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors');

    console.log('  PASS - Missing file handled gracefully');
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 9: Downtime calculation
  console.log('Test 9: Downtime calculation');
  try {
    RoomContainerManager.clearAll();

    const def = createTestDefinition('test_chest_downtime');
    RoomContainerManager.registerDefinition(def);

    const savedAt = Date.now() - 120000; // 2 minutes ago
    const mockState = {
      version: '1.0.0',
      savedAt: savedAt,
      containers: {
        'test_downtime': {
          id: 'test_downtime',
          definitionId: 'test_chest_downtime',
          roomId: 'test_room_007',
          isOpen: false,
          isLocked: false,
          inventory: [],
          capacity: 10,
          lastLooted: null,
          nextRespawn: null,
          createdAt: savedAt,
          modifiedAt: savedAt
        }
      }
    };

    const result = RoomContainerManager.restoreState(mockState);

    assert(result.downtime >= 120000, 'Downtime should be at least 2 minutes');
    assert(result.downtime < 125000, 'Downtime should be less than 2 minutes + 5 seconds buffer');

    console.log(`  PASS - Downtime calculated correctly (${Math.floor(result.downtime / 1000)}s)`);
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 10: Multiple containers with mixed states
  console.log('Test 10: Multiple containers with mixed states');
  try {
    RoomContainerManager.clearAll();
    TimerManager.clearAll();

    // Register definitions
    const def1 = createTestDefinition('test_multi_1');
    const def2 = createTestDefinition('test_multi_2', {
      lootConfig: {
        spawnOnInit: false,
        respawnOnEmpty: true,
        respawnDelay: 5000
      }
    });
    RoomContainerManager.registerDefinition(def1);
    RoomContainerManager.registerDefinition(def2);

    const now = Date.now();
    const mockState = {
      version: '1.0.0',
      savedAt: now - 10000,
      containers: {
        'multi_container_1': {
          id: 'multi_container_1',
          definitionId: 'test_multi_1',
          roomId: 'test_room_008',
          isOpen: true,
          isLocked: false,
          inventory: [],
          capacity: 10,
          lastLooted: null,
          nextRespawn: null,
          createdAt: now - 60000,
          modifiedAt: now - 10000
        },
        'multi_container_2': {
          id: 'multi_container_2',
          definitionId: 'test_multi_2',
          roomId: 'test_room_008',
          isOpen: false,
          isLocked: true,
          inventory: [],
          capacity: 15,
          lastLooted: now - 20000,
          nextRespawn: now + 5000, // Active timer
          createdAt: now - 60000,
          modifiedAt: now - 20000
        }
      }
    };

    const result = RoomContainerManager.restoreState(mockState);

    assert.strictEqual(result.restoredCount, 2, 'Should restore 2 containers');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors');

    const container1 = RoomContainerManager.getContainer('multi_container_1');
    const container2 = RoomContainerManager.getContainer('multi_container_2');

    assert(container1, 'Container 1 should exist');
    assert(container2, 'Container 2 should exist');
    assert.strictEqual(container1.isOpen, true, 'Container 1 should be open');
    assert.strictEqual(container2.isLocked, true, 'Container 2 should be locked');

    // Check timer was rescheduled for container 2
    const timerId = 'container_respawn_multi_container_2';
    assert.strictEqual(TimerManager.has(timerId), true, 'Container 2 should have active timer');

    console.log('  PASS - Multiple containers with mixed states restored');
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 11: Restore with invalid state object
  console.log('Test 11: Restore with invalid state object');
  try {
    RoomContainerManager.clearAll();

    // Test null
    let result = RoomContainerManager.restoreState(null);
    assert.strictEqual(result.restoredCount, 0, 'Should handle null gracefully');

    // Test undefined
    result = RoomContainerManager.restoreState(undefined);
    assert.strictEqual(result.restoredCount, 0, 'Should handle undefined gracefully');

    // Test empty object
    result = RoomContainerManager.restoreState({});
    assert.strictEqual(result.restoredCount, 0, 'Should handle empty object gracefully');

    console.log('  PASS - Invalid state objects handled gracefully');
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Test 12: Async timer restoration integration test
  console.log('Test 12: Async timer restoration integration test');
  try {
    RoomContainerManager.clearAll();
    TimerManager.clearAll();

    // Register definition with short respawn delay
    const def = createTestDefinition('test_async_timer', {
      lootConfig: {
        spawnOnInit: false,
        respawnOnEmpty: true,
        respawnDelay: 2000, // 2 seconds
        guaranteedItems: [
          { itemId: 'test_health_potion', quantity: 1, chance: 100 }
        ]
      }
    });
    RoomContainerManager.registerDefinition(def);

    // Create state with timer that will fire in 1 second
    const now = Date.now();
    const mockState = {
      version: '1.0.0',
      savedAt: now,
      containers: {
        'test_async': {
          id: 'test_async',
          definitionId: 'test_async_timer',
          roomId: 'test_room_009',
          isOpen: false,
          isLocked: false,
          inventory: [],
          capacity: 10,
          lastLooted: now - 5000,
          nextRespawn: now + 1000, // 1 second from now
          createdAt: now - 60000,
          modifiedAt: now - 5000
        }
      }
    };

    const result = RoomContainerManager.restoreState(mockState);
    assert.strictEqual(result.restoredCount, 1, 'Should restore container');

    const container = RoomContainerManager.getContainer('test_async');
    assert.strictEqual(container.inventory.length, 0, 'Container should be empty initially');

    // Wait for timer to fire
    await sleep(1500);

    // Check that loot was spawned
    const updatedContainer = RoomContainerManager.getContainer('test_async');
    assert(updatedContainer.inventory.length > 0, 'Container should have loot after timer fires');

    console.log('  PASS - Async timer fires and respawns loot correctly');
    passed++;
  } catch (err) {
    console.log('  FAIL -', err.message);
    failed++;
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log(`PHASE 3 TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  // Cleanup
  RoomContainerManager.clearAll();
  TimerManager.clearAll();

  return { passed, failed, total: passed + failed };
}

// Run tests
if (require.main === module) {
  runTests()
    .then(results => {
      if (results.failed === 0) {
        console.log('\nAll Phase 3 tests passed!');
        process.exit(0);
      } else {
        console.log(`\n${results.failed} Phase 3 test(s) failed.`);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Test suite failed with error:', err);
      process.exit(1);
    });
}

module.exports = { runTests };
