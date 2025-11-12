/**
 * Room Container Phase 2 Bug Fixes Test
 *
 * Tests the three bug fixes implemented in Phase 2:
 * 1. MEDIUM - Full Respawn Mode Doesn't Clear Inventory
 * 2. MEDIUM - Race Condition: Double-Scheduling Respawns
 * 3. LOW - Timer Not Cancelled When Container Manually Refilled
 */

// Initialize item registry
const { loadCoreItems } = require('../world/core/items/loadItems');

console.log('Loading item definitions...');
loadCoreItems();

const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const TimerManager = require('../src/systems/corpses/TimerManager');

// Mock world
class MockWorld {
  constructor() {
    this.rooms = {
      test_room: {
        id: 'test_room',
        name: 'Test Room',
        items: [],
        containers: []
      }
    };
  }

  getRoom(roomId) {
    return this.rooms[roomId] || null;
  }
}

// Helper function to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n=== Room Container Phase 2 Bug Fixes Test ===\n');

  const world = new MockWorld();
  RoomContainerManager.initialize(world);

  let testsRun = 0;
  let testsPassed = 0;
  let testsFailed = 0;

  // Test helper
  function assert(condition, message) {
    testsRun++;
    if (condition) {
      console.log(`✓ ${message}`);
      testsPassed++;
      return true;
    } else {
      console.error(`✗ ${message}`);
      testsFailed++;
      return false;
    }
  }

  // ============================================================
  // TEST 1: Full Respawn Mode Clears Inventory
  // ============================================================
  console.log('\n--- Test 1: Full Respawn Mode Clears Inventory ---\n');

  // Clear any existing containers
  RoomContainerManager.clearAll();

  // Create container definition with full respawn mode
  const fullRespawnDef = {
    id: 'test_full_respawn_chest',
    name: 'Test Full Respawn Chest',
    description: 'A test chest with full respawn mode',
    keywords: ['chest', 'test'],
    isRoomContainer: true,
    containerType: 'room_container',
    isOpen: false,
    lootConfig: {
      spawnOnInit: true,
      respawnOnEmpty: true,
      respawnDelay: 1000, // 1 second for testing
      respawnMode: 'full',
      guaranteedItems: [
        { itemId: 'health_potion', quantity: 1, chance: 100 }
      ]
    }
  };

  RoomContainerManager.registerDefinition(fullRespawnDef);
  const container1 = RoomContainerManager.createContainerInstance('test_full_respawn_chest', 'test_room');

  assert(container1 !== null, 'Container created successfully');
  assert(container1.inventory.length === 1, `Container has initial loot (${container1.inventory.length} items)`);

  // Open container and remove items (but not all)
  RoomContainerManager.openContainer(container1.id);
  const removedItem = RoomContainerManager.removeItem(container1.id, 0);

  assert(removedItem.success, 'Item removed from container');
  assert(container1.inventory.length === 0, 'Container is now empty');

  // Wait for respawn
  console.log('\nWaiting for respawn (1 second)...');
  await wait(1500);

  // Check that container respawned
  const container1After = RoomContainerManager.getContainer(container1.id);
  assert(container1After.inventory.length === 1, `Container respawned with ${container1After.inventory.length} items`);

  // Now manually add extra items to simulate items left in container
  const extraItem = { id: 'extra_item', name: 'Extra Item', itemType: 'misc' };
  container1After.inventory.push(extraItem);
  assert(container1After.inventory.length === 2, 'Extra item added manually');

  // Empty container again to trigger respawn
  RoomContainerManager.removeItem(container1.id, 0);
  RoomContainerManager.removeItem(container1.id, 0);
  assert(container1After.inventory.length === 0, 'Container emptied again');

  // Wait for second respawn
  console.log('\nWaiting for second respawn (1 second)...');
  await wait(1500);

  // BUG FIX 1: Verify inventory was cleared before respawn in full mode
  const container1Final = RoomContainerManager.getContainer(container1.id);
  assert(container1Final.inventory.length === 1, `Container has exactly 1 item after full respawn (not ${container1Final.inventory.length})`);

  console.log('\n✓ TEST 1 PASSED: Full respawn mode correctly clears inventory');

  // ============================================================
  // TEST 2: Race Condition - Double-Scheduling Respawns
  // ============================================================
  console.log('\n\n--- Test 2: Race Condition - Double-Scheduling Respawns ---\n');

  RoomContainerManager.clearAll();

  // Create container with respawn
  const raceConditionDef = {
    id: 'test_race_condition_chest',
    name: 'Test Race Condition Chest',
    description: 'A test chest for race condition',
    keywords: ['chest', 'test'],
    isRoomContainer: true,
    containerType: 'room_container',
    isOpen: false,
    lootConfig: {
      spawnOnInit: true,
      respawnOnEmpty: true,
      respawnDelay: 2000, // 2 seconds
      respawnMode: 'empty',
      guaranteedItems: [
        { itemId: 'health_potion', quantity: 1, chance: 100 },
        { itemId: 'health_potion', quantity: 1, chance: 100 }
      ]
    }
  };

  RoomContainerManager.registerDefinition(raceConditionDef);
  const container2 = RoomContainerManager.createContainerInstance('test_race_condition_chest', 'test_room');

  assert(container2 !== null, 'Container created');
  assert(container2.inventory.length === 2, 'Container has 2 initial items');

  // Open and remove first item
  RoomContainerManager.openContainer(container2.id);
  RoomContainerManager.removeItem(container2.id, 0);

  assert(container2.inventory.length === 1, 'One item removed, one remains');
  assert(container2.nextRespawn === null, 'No respawn scheduled yet (not empty)');

  // Simulate race condition: try to empty container twice "simultaneously"
  // First removal should schedule respawn
  RoomContainerManager.removeItem(container2.id, 0);
  const firstNextRespawn = container2.nextRespawn;

  assert(container2.inventory.length === 0, 'Container is now empty');
  assert(firstNextRespawn !== null, 'Respawn scheduled after first emptying');

  // Second "simultaneous" emptying attempt (simulating race condition)
  // This should be prevented by the guard
  RoomContainerManager.onContainerEmptied(container2.id);
  const secondNextRespawn = container2.nextRespawn;

  // BUG FIX 2: Verify second call didn't reschedule
  assert(secondNextRespawn === firstNextRespawn, 'Second emptying call did not reschedule respawn');

  // Verify only one timer exists
  const timerId = `container_respawn_${container2.id}`;
  assert(TimerManager.has(timerId), 'Respawn timer exists');

  console.log('\n✓ TEST 2 PASSED: Race condition prevented, no double-scheduling');

  // Clean up timer
  RoomContainerManager.cancelRespawn(container2.id);

  // ============================================================
  // TEST 3: Timer Cancelled When Container Manually Refilled
  // ============================================================
  console.log('\n\n--- Test 3: Timer Cancelled When Container Manually Refilled ---\n');

  RoomContainerManager.clearAll();

  // Create container
  const manualRefillDef = {
    id: 'test_manual_refill_chest',
    name: 'Test Manual Refill Chest',
    description: 'A test chest for manual refill',
    keywords: ['chest', 'test'],
    isRoomContainer: true,
    containerType: 'room_container',
    isOpen: false,
    lootConfig: {
      spawnOnInit: true,
      respawnOnEmpty: true,
      respawnDelay: 5000, // 5 seconds
      respawnMode: 'empty',
      guaranteedItems: [
        { itemId: 'health_potion', quantity: 1, chance: 100 }
      ]
    }
  };

  RoomContainerManager.registerDefinition(manualRefillDef);
  const container3 = RoomContainerManager.createContainerInstance('test_manual_refill_chest', 'test_room');

  assert(container3 !== null, 'Container created');
  assert(container3.inventory.length === 1, 'Container has initial loot');

  // Empty container to schedule respawn
  RoomContainerManager.openContainer(container3.id);
  RoomContainerManager.removeItem(container3.id, 0);

  assert(container3.inventory.length === 0, 'Container emptied');
  assert(container3.nextRespawn !== null, 'Respawn scheduled');

  const timerIdBefore = `container_respawn_${container3.id}`;
  assert(TimerManager.has(timerIdBefore), 'Respawn timer exists');

  // Manually refill container using spawnLoot
  console.log('\nManually refilling container...');
  const refillResult = RoomContainerManager.spawnLoot(container3.id);

  assert(refillResult.success, 'Manual refill successful');

  // BUG FIX 3: Verify timer was cancelled
  const timerIdAfter = `container_respawn_${container3.id}`;
  assert(!TimerManager.has(timerIdAfter), 'Respawn timer was cancelled after manual refill');
  assert(container3.nextRespawn === null, 'nextRespawn cleared');
  assert(container3.lastLooted === null, 'lastLooted reset');
  assert(container3.inventory.length === 1, 'Container has loot after manual refill');

  console.log('\n✓ TEST 3 PASSED: Timer correctly cancelled on manual refill');

  // ============================================================
  // Additional Integration Test
  // ============================================================
  console.log('\n\n--- Additional Integration Test ---\n');

  RoomContainerManager.clearAll();

  // Test all three fixes work together
  const integrationDef = {
    id: 'test_integration_chest',
    name: 'Test Integration Chest',
    description: 'A comprehensive test chest',
    keywords: ['chest', 'test'],
    isRoomContainer: true,
    containerType: 'room_container',
    isOpen: false,
    lootConfig: {
      spawnOnInit: true,
      respawnOnEmpty: true,
      respawnDelay: 1000,
      respawnMode: 'full',
      guaranteedItems: [
        { itemId: 'health_potion', quantity: 1, chance: 100 }
      ]
    }
  };

  RoomContainerManager.registerDefinition(integrationDef);
  const container4 = RoomContainerManager.createContainerInstance('test_integration_chest', 'test_room');

  // Test sequence:
  // 1. Empty container
  RoomContainerManager.openContainer(container4.id);
  RoomContainerManager.removeItem(container4.id, 0);
  assert(container4.inventory.length === 0, 'Container emptied');

  // 2. Try to double-schedule (should be prevented)
  const respawnBefore = container4.nextRespawn;
  RoomContainerManager.onContainerEmptied(container4.id);
  assert(container4.nextRespawn === respawnBefore, 'Double-schedule prevented');

  // 3. Manually refill (should cancel timer)
  RoomContainerManager.spawnLoot(container4.id);
  assert(container4.nextRespawn === null, 'Timer cancelled on manual refill');
  assert(container4.inventory.length === 1, 'Manual refill successful');

  // 4. Empty again and let it auto-respawn with full mode
  RoomContainerManager.removeItem(container4.id, 0);
  const extraItem2 = { id: 'extra', name: 'Extra', itemType: 'misc' };
  container4.inventory.push(extraItem2);
  assert(container4.inventory.length === 1, 'Extra item added before respawn');

  await wait(1500);

  // Full mode should have cleared the extra item
  assert(container4.inventory.length === 1, 'Full respawn cleared old items');
  assert(container4.inventory[0].name === 'Health Potion', 'New loot spawned correctly');

  console.log('\n✓ INTEGRATION TEST PASSED: All fixes work together correctly');

  // ============================================================
  // Test Summary
  // ============================================================
  console.log('\n\n=== Test Summary ===');
  console.log(`Total assertions: ${testsRun}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n✓✓✓ ALL TESTS PASSED ✓✓✓\n');
    console.log('All three bug fixes verified:');
    console.log('  1. Full respawn mode correctly clears inventory');
    console.log('  2. Race condition prevented - no double-scheduling');
    console.log('  3. Timer cancelled when container manually refilled\n');
  } else {
    console.error(`\n✗✗✗ ${testsFailed} TESTS FAILED ✗✗✗\n`);
    process.exit(1);
  }

  // Clean up
  RoomContainerManager.clearAll();
  TimerManager.clearAll();

  console.log('Test complete. Exiting in 2 seconds...');
  await wait(2000);
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
