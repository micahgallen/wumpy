/**
 * Container System - Quest Item Storage Restrictions Test
 *
 * Tests that quest items (isDroppable: false) cannot be stored in containers
 * unless the container explicitly allows it with allowQuestItems: true
 */

const logger = require('../src/logger');
const colors = require('../src/colors');
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');

logger.log('\n' + colors.success('='.repeat(80)));
logger.log(colors.success('Container System - Quest Item Storage Restrictions Test'));
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

logger.log(colors.info('\n--- Test Suite 1: Quest Item Restrictions ---\n'));

// Test 1: Register a normal container (no quest items allowed)
const normalContainer = {
  id: 'test_chest_normal',
  name: 'a normal chest',
  description: 'A regular chest that does not accept quest items',
  keywords: ['chest', 'normal'],
  isRoomContainer: true,
  isOpen: true,
  capacity: 20
};

assert(
  RoomContainerManager.registerDefinition(normalContainer),
  'Register normal container definition (no allowQuestItems)'
);

// Test 2: Create normal container instance
const normalInstance = RoomContainerManager.createContainerInstance('test_chest_normal', 'test_room_1');
assert(
  normalInstance !== null,
  'Create normal container instance'
);

// Test 3: Create a quest item (isDroppable: false, isQuestItem: true)
const questItem = {
  instanceId: 'quest_item_1',
  definitionId: 'ancient_key',
  name: 'Ancient Key',
  isQuestItem: true,
  isDroppable: false,
  isTradeable: false,
  quantity: 1
};

// Test 4: Try to add quest item to normal container (should fail)
const addResult1 = RoomContainerManager.addItem(normalInstance.id, questItem);
assert(
  addResult1.success === false,
  'Cannot add quest item to normal container'
);

// Test 5: Verify error message mentions quest items
assert(
  addResult1.message.toLowerCase().includes('quest'),
  'Error message indicates quest item restriction'
);

// Test 6: Register a quest-specific container (allows quest items)
const questContainer = {
  id: 'test_quest_chest',
  name: 'a quest pedestal',
  description: 'A pedestal designed to hold quest items',
  keywords: ['pedestal', 'quest'],
  isRoomContainer: true,
  isOpen: true,
  capacity: 10,
  allowQuestItems: true
};

assert(
  RoomContainerManager.registerDefinition(questContainer),
  'Register quest container definition (allowQuestItems: true)'
);

// Test 7: Create quest container instance
const questInstance = RoomContainerManager.createContainerInstance('test_quest_chest', 'test_room_2');
assert(
  questInstance !== null,
  'Create quest container instance'
);

// Test 8: Add quest item to quest container (should succeed)
const addResult2 = RoomContainerManager.addItem(questInstance.id, questItem);
assert(
  addResult2.success === true,
  'Can add quest item to quest-enabled container'
);

// Test 9: Verify quest item is in container inventory
const questContainerObj = RoomContainerManager.getContainer(questInstance.id);
assert(
  questContainerObj.inventory.length === 1 &&
  questContainerObj.inventory[0].instanceId === 'quest_item_1',
  'Quest item successfully stored in quest-enabled container'
);

logger.log(colors.info('\n--- Test Suite 2: Normal Items Still Work ---\n'));

// Test 10: Create a normal item (isDroppable: true)
const normalItem = {
  instanceId: 'normal_item_1',
  definitionId: 'iron_longsword',
  name: 'Iron Longsword',
  isQuestItem: false,
  isDroppable: true,
  quantity: 1
};

// Test 11: Add normal item to normal container (should succeed)
const addResult3 = RoomContainerManager.addItem(normalInstance.id, normalItem);
assert(
  addResult3.success === true,
  'Can add normal item to normal container'
);

// Test 12: Add normal item to quest container (should succeed)
const normalItem2 = {
  instanceId: 'normal_item_2',
  definitionId: 'health_potion',
  name: 'Health Potion',
  isQuestItem: false,
  isDroppable: true,
  quantity: 1
};

const addResult4 = RoomContainerManager.addItem(questInstance.id, normalItem2);
assert(
  addResult4.success === true,
  'Can add normal item to quest-enabled container'
);

logger.log(colors.info('\n--- Test Suite 3: Non-Droppable Non-Quest Items ---\n'));

// Test 13: Create a non-droppable item that's not a quest item
const nonDroppableItem = {
  instanceId: 'bound_item_1',
  definitionId: 'soulbound_amulet',
  name: 'Soulbound Amulet',
  isQuestItem: false,
  isDroppable: false,
  quantity: 1
};

// Test 14: Try to add non-droppable item to normal container (should fail)
const addResult5 = RoomContainerManager.addItem(normalInstance.id, nonDroppableItem);
assert(
  addResult5.success === false,
  'Cannot add non-droppable item to normal container'
);

// Test 15: Add non-droppable item to quest container (should succeed - allowQuestItems covers all isDroppable: false)
const addResult6 = RoomContainerManager.addItem(questInstance.id, nonDroppableItem);
assert(
  addResult6.success === true,
  'Can add non-droppable item to quest-enabled container'
);

logger.log(colors.info('\n--- Test Suite 4: Container State Checks ---\n'));

// Test 16: Quest items cannot be added to closed containers
const closedContainer = {
  id: 'test_closed_quest_chest',
  name: 'a closed quest chest',
  description: 'A closed chest for quest items',
  keywords: ['chest', 'closed'],
  isRoomContainer: true,
  isOpen: false,
  capacity: 10,
  allowQuestItems: true
};

RoomContainerManager.registerDefinition(closedContainer);
const closedInstance = RoomContainerManager.createContainerInstance('test_closed_quest_chest', 'test_room_3');

const questItem2 = {
  instanceId: 'quest_item_2',
  definitionId: 'ancient_scroll',
  name: 'Ancient Scroll',
  isQuestItem: true,
  isDroppable: false,
  quantity: 1
};

const addResult7 = RoomContainerManager.addItem(closedInstance.id, questItem2);
assert(
  addResult7.success === false && addResult7.message.toLowerCase().includes('closed'),
  'Cannot add items (including quest items) to closed containers'
);

// Test 17: Open the container and try again
RoomContainerManager.openContainer(closedInstance.id, { username: 'test_user' });
const addResult8 = RoomContainerManager.addItem(closedInstance.id, questItem2);
assert(
  addResult8.success === true,
  'Can add quest item to open quest-enabled container'
);

logger.log(colors.info('\n--- Test Suite 5: Default Behavior ---\n'));

// Test 18: Container without explicit allowQuestItems should default to false
const defaultContainer = {
  id: 'test_default_chest',
  name: 'a default chest',
  description: 'A chest without explicit allowQuestItems',
  keywords: ['chest', 'default'],
  isRoomContainer: true,
  isOpen: true,
  capacity: 20
  // allowQuestItems intentionally omitted
};

RoomContainerManager.registerDefinition(defaultContainer);
const defaultInstance = RoomContainerManager.createContainerInstance('test_default_chest', 'test_room_4');

const questItem3 = {
  instanceId: 'quest_item_3',
  definitionId: 'mysterious_orb',
  name: 'Mysterious Orb',
  isQuestItem: true,
  isDroppable: false,
  quantity: 1
};

const addResult9 = RoomContainerManager.addItem(defaultInstance.id, questItem3);
assert(
  addResult9.success === false,
  'Quest items rejected by container with undefined allowQuestItems (defaults to false)'
);

// Test 19: Normal items should still work with default container
const normalItem3 = {
  instanceId: 'normal_item_3',
  definitionId: 'rusty_dagger',
  name: 'Rusty Dagger',
  isDroppable: true,
  quantity: 1
};

const addResult10 = RoomContainerManager.addItem(defaultInstance.id, normalItem3);
assert(
  addResult10.success === true,
  'Normal items work with default container'
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
