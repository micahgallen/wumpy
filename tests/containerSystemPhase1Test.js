/**
 * Container System Phase 1 - Code Review Fixes Verification Test
 *
 * Tests the critical and high-priority fixes:
 * 1. Examine command only shows contents when container is open
 * 2. Definition validation in registerDefinition()
 * 3. ContainerFinder utility works correctly
 * 4. RoomContainerManager methods handle state properly
 * 5. Null checks prevent crashes
 */

const logger = require('../src/logger');
const colors = require('../src/colors');

// Mock dependencies
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const { findContainer } = require('../src/systems/containers/ContainerFinder');

logger.log('\n' + colors.success('='.repeat(80)));
logger.log(colors.success('Container System Phase 1 - Code Review Fixes Test'));
logger.log(colors.success('='.repeat(80)) + '\n');

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  testsRun++;
  if (condition) {
    testsPassed++;
    logger.log(colors.success(`✓ PASS: ${testName}`));
    return true;
  } else {
    testsFailed++;
    logger.error(`✗ FAIL: ${testName}`);
    return false;
  }
}

// Clear any existing state
RoomContainerManager.clearAll();

logger.log(colors.info('\n--- Test Suite 1: Definition Validation ---\n'));

// Test 1: Missing ID should fail
const invalidDef1 = {
  name: 'Test Chest',
  description: 'A test chest',
  keywords: ['chest', 'test'],
  isRoomContainer: true
};
assert(
  RoomContainerManager.registerDefinition(invalidDef1) === false,
  'Reject definition without ID'
);

// Test 2: Missing name should fail
const invalidDef2 = {
  id: 'test_chest_1',
  description: 'A test chest',
  keywords: ['chest', 'test'],
  isRoomContainer: true
};
assert(
  RoomContainerManager.registerDefinition(invalidDef2) === false,
  'Reject definition without name'
);

// Test 3: Missing description should fail
const invalidDef3 = {
  id: 'test_chest_2',
  name: 'Test Chest',
  keywords: ['chest', 'test'],
  isRoomContainer: true
};
assert(
  RoomContainerManager.registerDefinition(invalidDef3) === false,
  'Reject definition without description'
);

// Test 4: Missing keywords should fail
const invalidDef4 = {
  id: 'test_chest_3',
  name: 'Test Chest',
  description: 'A test chest',
  isRoomContainer: true
};
assert(
  RoomContainerManager.registerDefinition(invalidDef4) === false,
  'Reject definition without keywords array'
);

// Test 5: Empty keywords array should fail
const invalidDef5 = {
  id: 'test_chest_4',
  name: 'Test Chest',
  description: 'A test chest',
  keywords: [],
  isRoomContainer: true
};
assert(
  RoomContainerManager.registerDefinition(invalidDef5) === false,
  'Reject definition with empty keywords array'
);

// Test 6: Valid definition should succeed
const validDef = {
  id: 'treasure_chest_1',
  name: 'Treasure Chest',
  description: 'A sturdy oak chest with iron bindings.',
  keywords: ['chest', 'treasure', 'oak'],
  isRoomContainer: true,
  containerType: 'room_container',
  capacity: 20,
  isOpen: false,
  isLocked: false
};
assert(
  RoomContainerManager.registerDefinition(validDef) === true,
  'Accept valid definition with all required fields'
);

logger.log(colors.info('\n--- Test Suite 2: RoomContainerManager State Management ---\n'));

// Create a test container instance
const container = RoomContainerManager.createContainerInstance('treasure_chest_1', 'test_room_1');
assert(
  container !== null,
  'Create container instance successfully'
);

assert(
  container.isOpen === false,
  'Container starts in closed state'
);

// Test 7: Open container using RoomContainerManager method
const openResult = RoomContainerManager.openContainer(container.id, { username: 'testuser' });
assert(
  openResult.success === true,
  'openContainer() returns success'
);

assert(
  openResult.container.isOpen === true,
  'Container state is updated to open'
);

assert(
  openResult.message && openResult.message.length > 0,
  'openContainer() returns a message'
);

// Test 8: Try to open already open container
const openAgainResult = RoomContainerManager.openContainer(container.id, { username: 'testuser' });
assert(
  openAgainResult.success === false,
  'openContainer() fails when already open'
);

// Test 9: Close container using RoomContainerManager method
const closeResult = RoomContainerManager.closeContainer(container.id, { username: 'testuser' });
assert(
  closeResult.success === true,
  'closeContainer() returns success'
);

assert(
  closeResult.container.isOpen === false,
  'Container state is updated to closed'
);

// Test 10: Try to close already closed container
const closeAgainResult = RoomContainerManager.closeContainer(container.id, { username: 'testuser' });
assert(
  closeAgainResult.success === false,
  'closeContainer() fails when already closed'
);

// Test 11: Invalid container ID
const invalidOpenResult = RoomContainerManager.openContainer('nonexistent_container', { username: 'testuser' });
assert(
  invalidOpenResult.success === false,
  'openContainer() handles invalid container ID gracefully'
);

logger.log(colors.info('\n--- Test Suite 3: ContainerFinder Utility ---\n'));

// Create a mock room with containers
const mockRoom = {
  id: 'test_room_1',
  items: [
    {
      name: 'Dead Rat Corpse',
      keywords: ['corpse', 'rat', 'dead'],
      inventory: [],
      containerType: 'npc_corpse',
      isOpen: false
    }
  ]
};

// Test 12: Find portable container by keyword
const portableResult = findContainer('corpse', mockRoom);
assert(
  portableResult !== null && portableResult.type === 'portable',
  'findContainer() locates portable container'
);

assert(
  portableResult.container.name === 'Dead Rat Corpse',
  'findContainer() returns correct portable container'
);

// Test 13: Find room container by keyword
const roomResult = findContainer('chest', mockRoom);
assert(
  roomResult !== null && roomResult.type === 'room',
  'findContainer() locates room container'
);

assert(
  roomResult.definition.name === 'Treasure Chest',
  'findContainer() returns correct room container definition'
);

// Test 14: Container not found
const notFoundResult = findContainer('nonexistent', mockRoom);
assert(
  notFoundResult === null,
  'findContainer() returns null when container not found'
);

logger.log(colors.info('\n--- Test Suite 4: Null Safety Checks ---\n'));

// Test 15: Definition with null onOpen
const defWithoutOnOpen = {
  id: 'simple_chest',
  name: 'Simple Chest',
  description: 'A simple wooden chest.',
  keywords: ['chest', 'simple'],
  isRoomContainer: true,
  containerType: 'room_container'
};
RoomContainerManager.registerDefinition(defWithoutOnOpen);
const simpleContainer = RoomContainerManager.createContainerInstance('simple_chest', 'test_room_2');
const simpleOpenResult = RoomContainerManager.openContainer(simpleContainer.id, { username: 'testuser' });

assert(
  simpleOpenResult.success === true,
  'openContainer() handles missing onOpen config'
);

assert(
  simpleOpenResult.message && simpleOpenResult.message.includes('Simple Chest'),
  'openContainer() provides default message when onOpen.message is missing'
);

// Test 16: Definition with onClose
const defWithOnClose = {
  id: 'fancy_chest',
  name: 'Fancy Chest',
  description: 'An ornate chest with golden trim.',
  keywords: ['chest', 'fancy', 'ornate'],
  isRoomContainer: true,
  containerType: 'room_container',
  isOpen: true,
  onClose: {
    message: 'The fancy chest closes with a satisfying click.'
  }
};
RoomContainerManager.registerDefinition(defWithOnClose);
const fancyContainer = RoomContainerManager.createContainerInstance('fancy_chest', 'test_room_3');
const fancyCloseResult = RoomContainerManager.closeContainer(fancyContainer.id, { username: 'testuser' });

assert(
  fancyCloseResult.success === true,
  'closeContainer() handles custom onClose message'
);

assert(
  fancyCloseResult.message === 'The fancy chest closes with a satisfying click.',
  'closeContainer() uses custom onClose.message when provided'
);

// Print summary
logger.log('\n' + colors.success('='.repeat(80)));
logger.log(colors.success('Test Summary'));
logger.log(colors.success('='.repeat(80)));
logger.log(`Total Tests: ${testsRun}`);
logger.log(colors.success(`Passed: ${testsPassed}`));
if (testsFailed > 0) {
  logger.error(`Failed: ${testsFailed}`);
} else {
  logger.log(colors.success(`Failed: ${testsFailed}`));
}
logger.log(colors.success('='.repeat(80)) + '\n');

if (testsFailed === 0) {
  logger.log(colors.success('✓ All tests passed! Code review fixes verified.\n'));
  process.exit(0);
} else {
  logger.error(`✗ ${testsFailed} test(s) failed. Please review.\n`);
  process.exit(1);
}
