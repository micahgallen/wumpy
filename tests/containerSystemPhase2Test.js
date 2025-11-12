/**
 * Container System Phase 2 Tests - Loot System Integration
 *
 * Tests loot spawning, respawning, and timer integration for room containers.
 *
 * Test Coverage:
 * - LootSpawner: guaranteed items, random items, spawn chances
 * - RoomContainerManager: loot initialization, respawn scheduling
 * - TimerManager: respawn timers, timer callbacks
 * - Integration: full loot lifecycle (spawn -> loot -> respawn)
 */

const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const LootSpawner = require('../src/systems/containers/LootSpawner');
const TimerManager = require('../src/systems/corpses/TimerManager');
const ItemRegistry = require('../src/items/ItemRegistry');
const colors = require('../src/colors');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(colors.success(`✓ ${testName}`));
    testsPassed++;
    return true;
  } else {
    console.log(colors.error(`✗ ${testName}`));
    testsFailed++;
    return false;
  }
}

function logSection(title) {
  console.log('\n' + colors.cyan('═'.repeat(70)));
  console.log(colors.cyan(`  ${title}`));
  console.log(colors.cyan('═'.repeat(70)));
}

// Mock item definitions for testing
function registerTestItems() {
  try {
    ItemRegistry.registerItem({
      id: 'test_cookie',
      name: 'a test cookie',
      description: 'A cookie for testing',
      keywords: ['cookie', 'test'],
      itemType: 'consumable',
      rarity: 'common',
      weight: 0.1,
      value: 10,
      isStackable: true,
      spawnable: true,
      lootTables: ['common_loot'],
      spawnTags: ['type:consumable']
    });

    ItemRegistry.registerItem({
      id: 'test_potion',
      name: 'a test potion',
      description: 'A potion for testing',
      keywords: ['potion', 'test'],
      itemType: 'consumable',
      rarity: 'common',
      weight: 0.5,
      value: 50,
      isStackable: true,
      spawnable: true,
      lootTables: ['common_loot'],
      spawnTags: ['type:consumable']
    });

    ItemRegistry.registerItem({
      id: 'test_sword',
      name: 'a test sword',
      description: 'A sword for testing',
      keywords: ['sword', 'test'],
      itemType: 'weapon',
      rarity: 'uncommon',
      weight: 5.0,
      value: 100,
      isStackable: false,
      spawnable: true,
      lootTables: ['common_loot'],
      spawnTags: ['type:weapon']
    });

    console.log(colors.dim('Registered test items'));
  } catch (error) {
    // Items may already be registered, ignore
    console.log(colors.dim('Using existing test items'));
  }
}

// Test container definition
const testContainerDef = {
  id: 'test_loot_chest',
  name: 'a test loot chest',
  description: 'A chest for testing loot spawning',
  keywords: ['chest', 'test'],
  containerType: 'room_container',
  isRoomContainer: true,
  isTakeable: false,
  isExaminable: true,
  isOpen: false,
  isLocked: false,
  capacity: 20,
  lootConfig: {
    spawnOnInit: true,
    respawnOnEmpty: true,
    respawnDelay: 1000, // 1 second for testing
    respawnMode: 'empty',
    maxItems: 10,
    guaranteedItems: [
      {
        itemId: 'test_cookie',
        quantity: 3,
        chance: 100
      },
      {
        itemId: 'test_potion',
        quantity: 1,
        chance: 50
      }
    ],
    randomItems: {
      count: 2,
      lootTable: 'common_loot',
      level: 1,
      allowDuplicates: false,
      includeCurrency: false // Disable currency for predictable tests
    }
  }
};

// Test Suite 1: LootSpawner Tests
function testLootSpawner() {
  logSection('LootSpawner Tests');

  // Test 1: Spawn guaranteed items with 100% chance
  const mockContainer1 = { id: 'test1', inventory: [], capacity: 20 };
  const mockDef1 = {
    lootConfig: {
      guaranteedItems: [
        { itemId: 'test_cookie', quantity: 5, chance: 100 }
      ]
    }
  };
  const result1 = LootSpawner.spawnLoot(mockContainer1, mockDef1);
  assert(
    result1.success && result1.items.length >= 1,
    'LootSpawner spawns guaranteed items with 100% chance'
  );

  // Test 2: Guaranteed item quantity is respected
  const cookieItem = result1.items.find(item => item.definitionId === 'test_cookie');
  assert(
    cookieItem && cookieItem.quantity === 5,
    'Guaranteed item quantity is set correctly (uses definitionId, not id)'
  );

  // Test 3: Should respawn when empty and delay passed
  const mockContainer2 = {
    id: 'test2',
    inventory: [],
    lastLooted: Date.now() - 10000 // 10 seconds ago
  };
  const mockDef2 = {
    lootConfig: {
      respawnOnEmpty: true,
      respawnDelay: 5000 // 5 seconds
    }
  };
  const shouldRespawn1 = LootSpawner.shouldRespawn(mockContainer2, mockDef2);
  assert(
    shouldRespawn1.shouldRespawn === true,
    'Container should respawn when empty and delay passed'
  );

  // Test 4: Should not respawn when not empty
  const mockContainer3 = {
    id: 'test3',
    inventory: [{ id: 'item1' }],
    lastLooted: Date.now() - 10000
  };
  const shouldRespawn2 = LootSpawner.shouldRespawn(mockContainer3, mockDef2);
  assert(
    shouldRespawn2.shouldRespawn === false,
    'Container should not respawn when not empty (respawnMode: empty)'
  );

  // Test 5: Should not respawn when delay not met
  const mockContainer4 = {
    id: 'test4',
    inventory: [],
    lastLooted: Date.now() - 1000 // Only 1 second ago
  };
  const shouldRespawn3 = LootSpawner.shouldRespawn(mockContainer4, mockDef2);
  assert(
    shouldRespawn3.shouldRespawn === false,
    'Container should not respawn when delay not met'
  );

  // Test 6: Get respawn delay
  const delay = LootSpawner.getRespawnDelay(mockDef2);
  assert(
    delay === 5000,
    'getRespawnDelay returns correct delay from config'
  );

  // Test 7: Get respawn mode
  const mode = LootSpawner.getRespawnMode(mockDef2);
  assert(
    mode === 'empty',
    'getRespawnMode returns correct mode (default: empty)'
  );

  // Test 8: Should spawn on init when configured
  const shouldSpawnOnInit = LootSpawner.shouldSpawnOnInit(testContainerDef);
  assert(
    shouldSpawnOnInit === true,
    'shouldSpawnOnInit returns true when configured'
  );

  // Test 9: Loot stats calculation
  const testItems = [
    { rarity: 'common', itemType: 'consumable', value: 10, quantity: 1 },
    { rarity: 'uncommon', itemType: 'weapon', value: 100, quantity: 1 }
  ];
  const stats = LootSpawner.getLootStats(testItems);
  assert(
    stats.totalItems === 2 && stats.totalValue === 110,
    'getLootStats calculates correct statistics'
  );
}

// Test Suite 2: RoomContainerManager Loot Integration
function testRoomContainerManagerLoot() {
  logSection('RoomContainerManager Loot Integration Tests');

  // Clean slate
  RoomContainerManager.clearAll();

  // Register test definition
  RoomContainerManager.registerDefinition(testContainerDef);

  // Test 1: Create container and verify loot spawns on init
  const container1 = RoomContainerManager.createContainerInstance('test_loot_chest', 'test_room_1');
  assert(
    container1 !== null,
    'Container instance created successfully'
  );

  // Test 2: Container should have items after creation (spawnOnInit: true)
  assert(
    container1.inventory.length > 0,
    'Container has items after creation (spawnOnInit: true)'
  );

  // Test 3: Should have at least guaranteed items
  const hasCookies = container1.inventory.some(item => item.definitionId === 'test_cookie');
  assert(
    hasCookies,
    'Container has guaranteed items (test_cookie, checks definitionId)'
  );

  // Test 4: Spawn loot manually
  const spawnResult = RoomContainerManager.spawnLoot(container1.id);
  assert(
    spawnResult.success && spawnResult.items.length > 0,
    'Manual spawnLoot() works correctly'
  );

  // Test 5: Initialize loot on existing container
  const container2 = RoomContainerManager.createContainerInstance('test_loot_chest', 'test_room_2');
  container2.inventory = []; // Clear it
  const initResult = RoomContainerManager.initializeLoot(container2.id);
  assert(
    initResult === true && container2.inventory.length > 0,
    'initializeLoot() spawns loot for empty container'
  );

  // Test 6: Get respawn status
  const status1 = RoomContainerManager.getRespawnStatus(container1.id);
  assert(
    status1.exists === true && status1.configured === true,
    'getRespawnStatus() returns correct container info'
  );

  // Test 7: Empty container and verify lastLooted is set
  container1.inventory = [];
  RoomContainerManager.onContainerEmptied(container1.id);
  assert(
    container1.lastLooted !== null,
    'onContainerEmptied() sets lastLooted timestamp'
  );

  // Test 8: Verify respawn timer was scheduled
  const status2 = RoomContainerManager.getRespawnStatus(container1.id);
  assert(
    status2.hasActiveTimer === true,
    'Respawn timer scheduled after container emptied'
  );

  // Test 9: Cancel respawn timer
  const cancelled = RoomContainerManager.cancelRespawn(container1.id);
  assert(
    cancelled === true,
    'cancelRespawn() successfully cancels timer'
  );

  // Test 10: Verify timer was cancelled
  const status3 = RoomContainerManager.getRespawnStatus(container1.id);
  assert(
    status3.hasActiveTimer === false,
    'Respawn timer is no longer active after cancellation'
  );
}

// Test Suite 3: Timer Integration
function testTimerIntegration() {
  logSection('Timer Integration Tests');

  // Clean slate
  RoomContainerManager.clearAll();
  TimerManager.clearAll();

  // Register test definition
  RoomContainerManager.registerDefinition(testContainerDef);

  // Test 1: Schedule respawn timer
  const container = RoomContainerManager.createContainerInstance('test_loot_chest', 'test_room_3');
  container.inventory = [];
  container.lastLooted = Date.now();

  const scheduled = RoomContainerManager.scheduleRespawn(container.id);
  assert(
    scheduled === true,
    'scheduleRespawn() successfully creates timer'
  );

  // Test 2: Verify timer exists in TimerManager
  const timerId = `container_respawn_${container.id}`;
  const timerExists = TimerManager.has(timerId);
  assert(
    timerExists === true,
    'Timer exists in TimerManager'
  );

  // Test 3: Get remaining time
  const remaining = TimerManager.getRemainingTime(timerId);
  assert(
    remaining > 0 && remaining <= 1000,
    'Timer has remaining time within expected range'
  );

  // Test 4: Verify timer data
  const timerData = TimerManager.getTimerData(timerId);
  assert(
    timerData && timerData.type === 'container_respawn' && timerData.containerId === container.id,
    'Timer data contains correct container information'
  );
}

// Test Suite 4: Full Loot Lifecycle (Async)
async function testFullLootLifecycle() {
  logSection('Full Loot Lifecycle Tests (Async)');

  // Clean slate
  RoomContainerManager.clearAll();
  TimerManager.clearAll();

  // Register test definition with very short respawn
  const quickRespawnDef = {
    ...testContainerDef,
    id: 'test_quick_respawn_chest',
    lootConfig: {
      ...testContainerDef.lootConfig,
      respawnDelay: 500 // 500ms for quick testing
    }
  };
  RoomContainerManager.registerDefinition(quickRespawnDef);

  // Test 1: Create container with initial loot
  const container = RoomContainerManager.createContainerInstance('test_quick_respawn_chest', 'test_room_4');
  const initialItemCount = container.inventory.length;
  assert(
    initialItemCount > 0,
    'Container starts with loot'
  );

  // Test 2: Empty the container
  container.inventory = [];
  RoomContainerManager.onContainerEmptied(container.id);
  assert(
    container.inventory.length === 0,
    'Container is empty after removing all items'
  );

  // Test 3: Wait for respawn timer to fire
  console.log(colors.dim('  Waiting for respawn timer (500ms)...'));
  await new Promise(resolve => setTimeout(resolve, 600));

  // Test 4: Verify container has been refilled
  assert(
    container.inventory.length > 0,
    'Container automatically respawned with loot after delay'
  );

  // Test 5: Verify respawn timer is no longer active
  const status = RoomContainerManager.getRespawnStatus(container.id);
  assert(
    status.hasActiveTimer === false,
    'Respawn timer is removed after firing'
  );

  // Test 6: Verify lastLooted was reset
  assert(
    container.lastLooted === null,
    'lastLooted timestamp reset after respawn'
  );
}

// Test Suite 5: Edge Cases and Error Handling
function testEdgeCases() {
  logSection('Edge Cases and Error Handling');

  // Clean slate
  RoomContainerManager.clearAll();

  // Test 1: Spawn loot for non-existent container
  const result1 = RoomContainerManager.spawnLoot('non_existent_container');
  assert(
    result1.success === false,
    'spawnLoot() handles non-existent container gracefully'
  );

  // Test 2: Schedule respawn for non-existent container
  const result2 = RoomContainerManager.scheduleRespawn('non_existent_container');
  assert(
    result2 === false,
    'scheduleRespawn() handles non-existent container gracefully'
  );

  // Test 3: Cancel respawn for non-existent timer
  const result3 = RoomContainerManager.cancelRespawn('non_existent_container');
  assert(
    result3 === false,
    'cancelRespawn() handles non-existent timer gracefully'
  );

  // Test 4: Container with no loot config
  const noLootDef = {
    id: 'test_no_loot',
    name: 'a container without loot',
    description: 'No loot here',
    keywords: ['test'],
    containerType: 'room_container',
    isRoomContainer: true,
    isTakeable: false,
    capacity: 10
    // No lootConfig
  };
  RoomContainerManager.registerDefinition(noLootDef);
  const container = RoomContainerManager.createContainerInstance('test_no_loot', 'test_room_5');
  assert(
    container.inventory.length === 0,
    'Container without lootConfig has no items'
  );

  // Test 5: Container with invalid item ID in guaranteed items
  const badItemDef = {
    id: 'test_bad_item',
    name: 'a container with bad items',
    description: 'Bad items here',
    keywords: ['test'],
    containerType: 'room_container',
    isRoomContainer: true,
    isTakeable: false,
    capacity: 10,
    lootConfig: {
      spawnOnInit: true,
      guaranteedItems: [
        { itemId: 'non_existent_item', quantity: 1, chance: 100 }
      ]
    }
  };
  RoomContainerManager.registerDefinition(badItemDef);
  const container2 = RoomContainerManager.createContainerInstance('test_bad_item', 'test_room_6');
  // Should not crash, just log warning
  assert(
    true,
    'Container with invalid item IDs does not crash'
  );

  // Test 6: Respawn with respawnOnEmpty disabled
  const noRespawnDef = {
    id: 'test_no_respawn',
    name: 'a container without respawn',
    description: 'No respawn here',
    keywords: ['test'],
    containerType: 'room_container',
    isRoomContainer: true,
    isTakeable: false,
    capacity: 10,
    lootConfig: {
      spawnOnInit: true,
      respawnOnEmpty: false,
      guaranteedItems: [
        { itemId: 'test_cookie', quantity: 1, chance: 100 }
      ]
    }
  };
  RoomContainerManager.registerDefinition(noRespawnDef);
  const container3 = RoomContainerManager.createContainerInstance('test_no_respawn', 'test_room_7');
  container3.inventory = [];
  RoomContainerManager.onContainerEmptied(container3.id);
  const status = RoomContainerManager.getRespawnStatus(container3.id);
  assert(
    status.hasActiveTimer === false,
    'Container with respawnOnEmpty: false does not schedule timer'
  );
}

// Main test runner
async function runAllTests() {
  console.log(colors.cyan('\n╔════════════════════════════════════════════════════════════════════╗'));
  console.log(colors.cyan('║   Container System Phase 2 Tests - Loot System Integration       ║'));
  console.log(colors.cyan('╚════════════════════════════════════════════════════════════════════╝\n'));

  // Register test items
  registerTestItems();

  // Run test suites
  testLootSpawner();
  testRoomContainerManagerLoot();
  testTimerIntegration();
  await testFullLootLifecycle();
  testEdgeCases();

  // Print summary
  console.log('\n' + colors.cyan('═'.repeat(70)));
  console.log(colors.cyan('  Test Summary'));
  console.log(colors.cyan('═'.repeat(70)));
  console.log(colors.success(`  Passed: ${testsPassed}`));
  if (testsFailed > 0) {
    console.log(colors.error(`  Failed: ${testsFailed}`));
  } else {
    console.log(colors.dim(`  Failed: ${testsFailed}`));
  }
  console.log(colors.cyan('═'.repeat(70)));

  const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
  console.log(colors.cyan(`  Success Rate: ${successRate}%\n`));

  // Cleanup
  RoomContainerManager.clearAll();
  TimerManager.clearAll();

  if (testsFailed === 0) {
    console.log(colors.success('✓ All Phase 2 tests passed!\n'));
    process.exit(0);
  } else {
    console.log(colors.error('✗ Some tests failed. Please review.\n'));
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error(colors.error('Test suite crashed:'), error);
  process.exit(1);
});
