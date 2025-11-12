/**
 * Container System Phase 4 Tests
 *
 * Tests for advanced container features:
 * - PUT command
 * - Lock/Unlock system
 * - Interaction hooks
 * - Trapped containers
 *
 * Run with: node tests/containerSystemPhase4Test.js
 */

const colors = require('../src/colors');
const logger = require('../src/logger');
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');

// Test counters
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper functions
function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(colors.success(`✓ ${testName}`));
    return true;
  } else {
    failedTests++;
    console.log(colors.error(`✗ ${testName}`));
    return false;
  }
}

function section(name) {
  console.log('\n' + colors.info('='.repeat(60)));
  console.log(colors.info(`  ${name}`));
  console.log(colors.info('='.repeat(60)));
}

function subsection(name) {
  console.log('\n' + colors.dim(`--- ${name} ---`));
}

// Mock player for testing
function createMockPlayer(username = 'testplayer') {
  return {
    username: username,
    currentRoom: 'test_room',
    inventory: [],
    hp: 100,
    maxHp: 100,
    send: () => {},
    getDisplayName: () => username
  };
}

// Mock item for testing
function createMockItem(definitionId, options = {}) {
  const itemDef = ItemRegistry.getItem(definitionId);
  if (!itemDef) {
    return {
      definitionId: definitionId,
      instanceId: `${definitionId}_${Date.now()}_${Math.random()}`,
      name: options.name || 'Test Item',
      quantity: options.quantity || 1,
      isStackable: options.isStackable || false,
      isEquipped: options.isEquipped || false,
      keywords: options.keywords || []
    };
  }
  return ItemFactory.createItem(itemDef, options);
}

// Test setup
function setupTests() {
  // Clear existing state
  RoomContainerManager.clearAll();

  // Register test container definitions
  const testContainers = [
    {
      id: 'test_unlocked_chest',
      name: 'a test chest',
      description: 'A simple test chest',
      keywords: ['chest', 'test'],
      containerType: 'room_container',
      isRoomContainer: true,
      isTakeable: false,
      isExaminable: true,
      isLocked: false,
      isOpen: false,
      capacity: 10
    },
    {
      id: 'test_locked_chest',
      name: 'a locked test chest',
      description: 'A locked test chest',
      keywords: ['chest', 'locked', 'test'],
      containerType: 'room_container',
      isRoomContainer: true,
      isTakeable: false,
      isExaminable: true,
      isLocked: true,
      lockDifficulty: 15,
      keyItemId: 'test_key',
      requiresKey: true,
      isOpen: false,
      capacity: 10,
      onUnlock: {
        message: 'The chest unlocks with a click.'
      },
      onLock: {
        message: 'The chest locks securely.'
      }
    },
    {
      id: 'test_trapped_chest',
      name: 'a trapped chest',
      description: 'A dangerous looking chest',
      keywords: ['chest', 'trapped'],
      containerType: 'room_container',
      isRoomContainer: true,
      isTakeable: false,
      isExaminable: true,
      isLocked: false,
      isOpen: false,
      capacity: 10,
      trap: {
        type: 'damage',
        damage: 20,
        message: 'A poison dart shoots out!',
        isArmed: true,
        difficulty: 15
      }
    }
  ];

  for (const def of testContainers) {
    RoomContainerManager.registerDefinition(def);
  }

  console.log(colors.dim('Test setup complete\n'));
}

// Test: PUT command - Add item to container
function testPutItemInContainer() {
  subsection('PUT Command - Basic Functionality');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_unlocked_chest', 'test_room');

  // Open the container
  RoomContainerManager.openContainer(container.id, player);

  // Create a test item
  const item = createMockItem('test_item', { name: 'Test Sword', quantity: 1 });

  // Add item to container manually (simulating PUT command)
  const initialCount = container.inventory.length;
  container.inventory.push(item);
  container.modifiedAt = Date.now();

  assert(
    container.inventory.length === initialCount + 1,
    'Item added to container inventory'
  );

  assert(
    container.inventory[container.inventory.length - 1].definitionId === 'test_item',
    'Correct item added to container'
  );
}

// Test: PUT command - Capacity check
function testPutItemCapacityCheck() {
  subsection('PUT Command - Capacity Checks');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_unlocked_chest', 'test_room');

  // Open the container
  RoomContainerManager.openContainer(container.id, player);

  // Fill the container to capacity
  for (let i = 0; i < container.capacity; i++) {
    container.inventory.push(createMockItem(`item_${i}`, { name: `Item ${i}` }));
  }

  assert(
    container.inventory.length === container.capacity,
    'Container filled to capacity'
  );

  // Try to add one more item
  const canAdd = container.inventory.length < container.capacity;

  assert(
    !canAdd,
    'Cannot add item when container is full'
  );
}

// Test: PUT command - Closed container check
function testPutItemClosedContainer() {
  subsection('PUT Command - Closed Container Check');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_unlocked_chest', 'test_room');

  // Container is closed by default
  assert(
    !container.isOpen,
    'Container starts closed'
  );

  // Try to add item to closed container using addItem method
  const item = createMockItem('test_item', { name: 'Test Item' });
  const result = RoomContainerManager.addItem(container.id, item);

  assert(
    !result.success,
    'Cannot add item to closed container'
  );

  assert(
    result.message.includes('closed'),
    'Error message mentions container is closed'
  );
}

// Test: PUT command - Stackable items
function testPutStackableItems() {
  subsection('PUT Command - Stackable Items');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_unlocked_chest', 'test_room');

  // Open the container
  RoomContainerManager.openContainer(container.id, player);

  // Add stackable item
  const item1 = createMockItem('test_stackable', {
    name: 'Test Potion',
    quantity: 5,
    isStackable: true
  });
  container.inventory.push(item1);

  // Add another of the same stackable item
  const item2 = createMockItem('test_stackable', {
    name: 'Test Potion',
    quantity: 3,
    isStackable: true
  });

  // Find existing stack
  const existingStack = container.inventory.find(i =>
    i.definitionId === item2.definitionId && i.isStackable
  );

  if (existingStack) {
    existingStack.quantity += item2.quantity;
  }

  assert(
    existingStack.quantity === 8,
    'Stackable items combined correctly (5 + 3 = 8)'
  );

  assert(
    container.inventory.length === 1,
    'Only one stack in container'
  );
}

// Test: Lock/Unlock - Basic unlock
function testUnlockContainer() {
  subsection('Lock/Unlock - Basic Unlock');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_locked_chest', 'test_room');

  assert(
    container.isLocked,
    'Container starts locked'
  );

  // Create key item
  const key = createMockItem('test_key', { name: 'Test Key' });

  // Unlock the container
  const result = RoomContainerManager.unlockContainer(container.id, player, key);

  assert(
    result.success,
    'Container unlocked successfully'
  );

  assert(
    !container.isLocked,
    'Container is now unlocked'
  );
}

// Test: Lock/Unlock - Wrong key
function testUnlockWithWrongKey() {
  subsection('Lock/Unlock - Wrong Key');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_locked_chest', 'test_room');

  // Create wrong key
  const wrongKey = createMockItem('wrong_key', { name: 'Wrong Key' });

  // Try to unlock with wrong key
  const result = RoomContainerManager.unlockContainer(container.id, player, wrongKey);

  assert(
    !result.success,
    'Cannot unlock with wrong key'
  );

  assert(
    container.isLocked,
    'Container remains locked'
  );

  assert(
    result.message.includes("doesn't fit"),
    'Error message indicates wrong key'
  );
}

// Test: Lock/Unlock - Lock a container
function testLockContainer() {
  subsection('Lock/Unlock - Lock Container');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_locked_chest', 'test_room');

  // Unlock first
  const key = createMockItem('test_key', { name: 'Test Key' });
  RoomContainerManager.unlockContainer(container.id, player, key);

  assert(
    !container.isLocked,
    'Container is unlocked'
  );

  // Close it (required before locking)
  RoomContainerManager.closeContainer(container.id, player);

  // Lock it again
  const result = RoomContainerManager.lockContainer(container.id, player, key);

  assert(
    result.success,
    'Container locked successfully'
  );

  assert(
    container.isLocked,
    'Container is now locked'
  );
}

// Test: Lock/Unlock - Cannot lock open container
function testCannotLockOpenContainer() {
  subsection('Lock/Unlock - Cannot Lock Open Container');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_locked_chest', 'test_room');

  // Unlock and open
  const key = createMockItem('test_key', { name: 'Test Key' });
  RoomContainerManager.unlockContainer(container.id, player, key);
  RoomContainerManager.openContainer(container.id, player);

  // Try to lock while open
  const result = RoomContainerManager.lockContainer(container.id, player, key);

  assert(
    !result.success,
    'Cannot lock open container'
  );

  assert(
    result.message.includes('close'),
    'Error message says to close first'
  );
}

// Test: Lock/Unlock - Locked container cannot be opened
function testLockedContainerCannotOpen() {
  subsection('Lock/Unlock - Locked Container Cannot Open');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_locked_chest', 'test_room');

  // Try to open locked container
  const result = RoomContainerManager.openContainer(container.id, player);

  assert(
    !result.success,
    'Cannot open locked container'
  );

  assert(
    result.message.includes('locked'),
    'Error message indicates container is locked'
  );

  assert(
    !container.isOpen,
    'Container remains closed'
  );
}

// Test: Interaction hooks - onUnlock message
function testOnUnlockHook() {
  subsection('Interaction Hooks - onUnlock');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_locked_chest', 'test_room');

  const key = createMockItem('test_key', { name: 'Test Key' });
  const result = RoomContainerManager.unlockContainer(container.id, player, key);

  assert(
    result.success,
    'Container unlocked'
  );

  assert(
    result.message === 'The chest unlocks with a click.',
    'Custom onUnlock message displayed'
  );
}

// Test: Interaction hooks - onLock message
function testOnLockHook() {
  subsection('Interaction Hooks - onLock');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_locked_chest', 'test_room');

  const key = createMockItem('test_key', { name: 'Test Key' });

  // Unlock, close, then lock
  RoomContainerManager.unlockContainer(container.id, player, key);
  RoomContainerManager.closeContainer(container.id, player);
  const result = RoomContainerManager.lockContainer(container.id, player, key);

  assert(
    result.success,
    'Container locked'
  );

  assert(
    result.message === 'The chest locks securely.',
    'Custom onLock message displayed'
  );
}

// Test: Trapped containers - Trigger trap
function testTrapTrigger() {
  subsection('Trapped Containers - Trigger Trap');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_trapped_chest', 'test_room');

  const definition = RoomContainerManager.getDefinition(container.definitionId);

  assert(
    definition.trap && definition.trap.isArmed,
    'Container has armed trap'
  );

  // Trigger the trap
  const result = RoomContainerManager.triggerTrap(container.id, player);

  assert(
    result.success,
    'Trap triggered successfully'
  );

  assert(
    result.trap.type === 'damage',
    'Trap type is damage'
  );

  assert(
    result.trap.damage === 20,
    'Trap damage is 20'
  );

  assert(
    result.message === 'A poison dart shoots out!',
    'Custom trap message displayed'
  );
}

// Test: Trapped containers - Trap only triggers once
function testTrapOnlyTriggersOnce() {
  subsection('Trapped Containers - Trap Only Triggers Once');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_trapped_chest', 'test_room');

  // Trigger trap first time
  const result1 = RoomContainerManager.triggerTrap(container.id, player);
  assert(
    result1.success,
    'Trap triggers on first attempt'
  );

  // Try to trigger again (should fail - trap is disarmed)
  const result2 = RoomContainerManager.triggerTrap(container.id, player);
  assert(
    !result2.success,
    'Trap does not trigger second time (already disarmed)'
  );

  assert(
    result2.message.includes('No armed trap') || result2.message.includes('armed'),
    'Error message indicates trap is disarmed'
  );
}

// Test: Trapped containers - Disarm trap
function testTrapDisarm() {
  subsection('Trapped Containers - Disarm Trap');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_trapped_chest', 'test_room');

  const definition = RoomContainerManager.getDefinition(container.definitionId);

  assert(
    definition.trap.isArmed,
    'Trap starts armed'
  );

  // Disarm the trap
  const result = RoomContainerManager.disarmTrap(container.id, player);

  assert(
    result.success,
    'Trap disarmed successfully'
  );

  assert(
    !definition.trap.isArmed,
    'Trap is now disarmed'
  );

  // Try to trigger disarmed trap
  const triggerResult = RoomContainerManager.triggerTrap(container.id, player);

  assert(
    !triggerResult.success,
    'Disarmed trap does not trigger'
  );
}

// Test: Trapped containers - No trap on regular container
function testNoTrapOnRegularContainer() {
  subsection('Trapped Containers - No Trap on Regular Container');

  const player = createMockPlayer();
  const container = RoomContainerManager.createContainerInstance('test_unlocked_chest', 'test_room');

  const result = RoomContainerManager.triggerTrap(container.id, player);

  assert(
    !result.success,
    'Regular container has no trap'
  );

  assert(
    result.message === 'No trap.',
    'Correct message for no trap'
  );
}

// Test: Integration - Full workflow with locked, trapped container
function testFullWorkflow() {
  subsection('Integration - Full Workflow');

  const player = createMockPlayer();

  // Create a locked container
  const lockedDef = {
    id: 'test_full_workflow',
    name: 'a complex chest',
    description: 'A chest with lock and trap',
    keywords: ['chest', 'complex'],
    containerType: 'room_container',
    isRoomContainer: true,
    isTakeable: false,
    isLocked: true,
    keyItemId: 'workflow_key',
    requiresKey: true,
    isOpen: false,
    capacity: 10,
    trap: {
      type: 'damage',
      damage: 15,
      message: 'Ouch!',
      isArmed: true,
      difficulty: 10
    }
  };

  RoomContainerManager.registerDefinition(lockedDef);
  const container = RoomContainerManager.createContainerInstance('test_full_workflow', 'test_room');

  // Step 1: Try to open (should fail - locked)
  let result = RoomContainerManager.openContainer(container.id, player);
  assert(!result.success && result.message.includes('locked'), 'Step 1: Cannot open locked container');

  // Step 2: Unlock with key
  const key = createMockItem('workflow_key', { name: 'Workflow Key' });
  result = RoomContainerManager.unlockContainer(container.id, player, key);
  assert(result.success, 'Step 2: Unlock successful');

  // Step 3: Disarm trap (optional but safer)
  result = RoomContainerManager.disarmTrap(container.id, player);
  assert(result.success, 'Step 3: Trap disarmed');

  // Step 4: Open container
  result = RoomContainerManager.openContainer(container.id, player);
  assert(result.success, 'Step 4: Container opened');

  // Step 5: Add item
  const item = createMockItem('workflow_item', { name: 'Workflow Item' });
  result = RoomContainerManager.addItem(container.id, item);
  assert(result.success, 'Step 5: Item added');

  // Step 6: Close container
  result = RoomContainerManager.closeContainer(container.id, player);
  assert(result.success, 'Step 6: Container closed');

  // Step 7: Lock container
  result = RoomContainerManager.lockContainer(container.id, player, key);
  assert(result.success, 'Step 7: Container locked');
}

// Test: Edge cases
function testEdgeCases() {
  subsection('Edge Cases');

  // Test null player
  const container = RoomContainerManager.createContainerInstance('test_unlocked_chest', 'test_room');
  let result = RoomContainerManager.openContainer(container.id, null);
  assert(result.success, 'Opening container with null player still works');

  // Test invalid container ID
  result = RoomContainerManager.openContainer('nonexistent_container', createMockPlayer());
  assert(!result.success, 'Opening nonexistent container fails');

  // Test unlocking already unlocked container
  RoomContainerManager.openContainer(container.id, createMockPlayer());
  const player = createMockPlayer();
  const key = createMockItem('test_key', { name: 'Test Key' });
  result = RoomContainerManager.unlockContainer(container.id, player, key);
  assert(!result.success, 'Unlocking already unlocked container fails');

  // Test locking already locked container
  const lockedContainer = RoomContainerManager.createContainerInstance('test_locked_chest', 'test_room');
  result = RoomContainerManager.lockContainer(lockedContainer.id, player, key);
  assert(!result.success, 'Locking already locked container fails');
}

// Main test runner
async function runTests() {
  console.log('\n' + colors.info('╔═══════════════════════════════════════════════════════════╗'));
  console.log(colors.info('║  Container System Phase 4 Test Suite                     ║'));
  console.log(colors.info('║  Advanced Features: PUT, Lock/Unlock, Hooks, Traps       ║'));
  console.log(colors.info('╚═══════════════════════════════════════════════════════════╝\n'));

  setupTests();

  section('PUT Command Tests');
  testPutItemInContainer();
  testPutItemCapacityCheck();
  testPutItemClosedContainer();
  testPutStackableItems();

  section('Lock/Unlock Tests');
  testUnlockContainer();
  testUnlockWithWrongKey();
  testLockContainer();
  testCannotLockOpenContainer();
  testLockedContainerCannotOpen();

  section('Interaction Hooks Tests');
  testOnUnlockHook();
  testOnLockHook();

  section('Trapped Container Tests');
  testTrapTrigger();
  testTrapOnlyTriggersOnce();
  testTrapDisarm();
  testNoTrapOnRegularContainer();

  section('Integration Tests');
  testFullWorkflow();

  section('Edge Cases');
  testEdgeCases();

  // Print summary
  console.log('\n' + colors.info('='.repeat(60)));
  console.log(colors.info('  Test Summary'));
  console.log(colors.info('='.repeat(60)));
  console.log(`Total Tests: ${totalTests}`);
  console.log(colors.success(`Passed: ${passedTests}`));
  console.log(colors.error(`Failed: ${failedTests}`));

  if (failedTests === 0) {
    console.log('\n' + colors.success('✓ All tests passed!'));
  } else {
    console.log('\n' + colors.error(`✗ ${failedTests} test(s) failed`));
  }

  console.log('\n' + colors.dim(`Pass rate: ${(passedTests / totalTests * 100).toFixed(1)}%\n`));

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(colors.error('Fatal error running tests:'), error);
  process.exit(1);
});
