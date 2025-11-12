/**
 * Container System - isCloseable Property Test
 *
 * Tests that containers with isCloseable: false cannot be closed
 */

const logger = require('../src/logger');
const colors = require('../src/colors');
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');

logger.log('\n' + colors.success('='.repeat(80)));
logger.log(colors.success('Container System - isCloseable Property Test'));
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

logger.log(colors.info('\n--- Test Suite 1: isCloseable Property ---\n'));

// Test 1: Register a closeable container (default behavior)
const closeableContainer = {
  id: 'test_chest',
  name: 'a test chest',
  description: 'A chest that can be closed',
  keywords: ['chest', 'test'],
  isRoomContainer: true,
  isOpen: true
};

assert(
  RoomContainerManager.registerDefinition(closeableContainer),
  'Register closeable container definition'
);

// Test 2: Create closeable container instance
const closeableInstance = RoomContainerManager.createContainerInstance('test_chest', 'test_room_1');
assert(
  closeableInstance !== null,
  'Create closeable container instance'
);

// Test 3: Close the closeable container (should succeed)
const closeResult1 = RoomContainerManager.closeContainer(closeableInstance.id, { username: 'test_user' });
assert(
  closeResult1.success === true,
  'Can close a closeable container'
);

// Test 4: Register a non-closeable container (like furniture)
const nonCloseableContainer = {
  id: 'test_rack',
  name: 'a test equipment rack',
  description: 'A rack that cannot be closed',
  keywords: ['rack', 'equipment'],
  isRoomContainer: true,
  isOpen: true,
  isCloseable: false
};

assert(
  RoomContainerManager.registerDefinition(nonCloseableContainer),
  'Register non-closeable container definition'
);

// Test 5: Create non-closeable container instance
const nonCloseableInstance = RoomContainerManager.createContainerInstance('test_rack', 'test_room_2');
assert(
  nonCloseableInstance !== null,
  'Create non-closeable container instance'
);

// Test 6: Try to close the non-closeable container (should fail)
const closeResult2 = RoomContainerManager.closeContainer(nonCloseableInstance.id, { username: 'test_user' });
assert(
  closeResult2.success === false,
  'Cannot close a non-closeable container'
);

// Test 7: Verify error message is appropriate
assert(
  closeResult2.message.includes('cannot be closed'),
  'Error message indicates container cannot be closed'
);

// Test 8: Verify non-closeable container stays open
const container = RoomContainerManager.getContainer(nonCloseableInstance.id);
assert(
  container.isOpen === true,
  'Non-closeable container remains open after close attempt'
);

// Test 9: Verify closeable container with explicit isCloseable: true
const explicitCloseableContainer = {
  id: 'test_explicit_chest',
  name: 'a test explicit chest',
  description: 'A chest explicitly marked as closeable',
  keywords: ['chest', 'explicit'],
  isRoomContainer: true,
  isOpen: true,
  isCloseable: true
};

assert(
  RoomContainerManager.registerDefinition(explicitCloseableContainer),
  'Register explicitly closeable container definition'
);

const explicitCloseableInstance = RoomContainerManager.createContainerInstance('test_explicit_chest', 'test_room_3');
const closeResult3 = RoomContainerManager.closeContainer(explicitCloseableInstance.id, { username: 'test_user' });
assert(
  closeResult3.success === true,
  'Can close container with explicit isCloseable: true'
);

// Test 10: Verify container with undefined isCloseable (should default to closeable)
const undefinedCloseableContainer = {
  id: 'test_undefined_chest',
  name: 'a test undefined chest',
  description: 'A chest with undefined isCloseable',
  keywords: ['chest', 'undefined'],
  isRoomContainer: true,
  isOpen: true
  // isCloseable intentionally omitted
};

assert(
  RoomContainerManager.registerDefinition(undefinedCloseableContainer),
  'Register container with undefined isCloseable'
);

const undefinedCloseableInstance = RoomContainerManager.createContainerInstance('test_undefined_chest', 'test_room_4');
const closeResult4 = RoomContainerManager.closeContainer(undefinedCloseableInstance.id, { username: 'test_user' });
assert(
  closeResult4.success === true,
  'Container with undefined isCloseable defaults to closeable'
);

// Summary
logger.log('\n' + colors.success('='.repeat(80)));
logger.log(colors.info(`Tests Run: ${testsRun}`));
logger.log(colors.success(`Tests Passed: ${testsPassed}`));
if (testsFailed > 0) {
  logger.error(`Tests Failed: ${testsFailed}`);
} else {
  logger.log(colors.success(`Tests Failed: ${testsFailed}`));
}
logger.log(colors.success('='.repeat(80)) + '\n');

// Exit with appropriate code
process.exit(testsFailed > 0 ? 1 : 0);
