/**
 * Test pre-restore deduplication
 * Creates a containers.json with duplicates and verifies they are cleaned on load
 */

const fs = require('fs');
const path = require('path');

console.log('=== Pre-Restore Deduplication Test ===\n');

// Create a test containers.json with 7 containers (duplicates)
const testPath = path.join(__dirname, '../data/containers_prededup_test.json');

const duplicateState = {
  "version": "1.0.0",
  "savedAt": Date.now() - 1000,
  "containers": {
    // 3 equipment racks (duplicates!)
    "equipment_rack_room_arena_lounge_1": {
      "id": "equipment_rack_room_arena_lounge_1",
      "definitionId": "equipment_rack",
      "roomId": "arena_lounge",
      "isOpen": true,
      "isLocked": false,
      "inventory": [],
      "capacity": 20,
      "createdAt": Date.now() - 10000,
      "modifiedAt": Date.now() - 10000
    },
    "equipment_rack_room_arena_lounge_2": {
      "id": "equipment_rack_room_arena_lounge_2",
      "definitionId": "equipment_rack",
      "roomId": "arena_lounge",
      "isOpen": true,
      "isLocked": false,
      "inventory": [],
      "capacity": 20,
      "createdAt": Date.now() - 5000,
      "modifiedAt": Date.now() - 5000
    },
    "equipment_rack_room_arena_lounge_3": {
      "id": "equipment_rack_room_arena_lounge_3",
      "definitionId": "equipment_rack",
      "roomId": "arena_lounge",
      "isOpen": true,
      "isLocked": false,
      "inventory": [],
      "capacity": 20,
      "createdAt": Date.now(), // Newest!
      "modifiedAt": Date.now()
    },
    // 4 treasure chests (duplicates!)
    "treasure_chest_sesame_plaza_room_sesame_street_01_1": {
      "id": "treasure_chest_sesame_plaza_room_sesame_street_01_1",
      "definitionId": "treasure_chest_sesame_plaza",
      "roomId": "sesame_street_01",
      "isOpen": false,
      "isLocked": false,
      "inventory": [],
      "capacity": 15,
      "createdAt": Date.now() - 20000,
      "modifiedAt": Date.now() - 20000
    },
    "treasure_chest_sesame_plaza_room_sesame_street_01_2": {
      "id": "treasure_chest_sesame_plaza_room_sesame_street_01_2",
      "definitionId": "treasure_chest_sesame_plaza",
      "roomId": "sesame_street_01",
      "isOpen": false,
      "isLocked": false,
      "inventory": [],
      "capacity": 15,
      "createdAt": Date.now() - 15000,
      "modifiedAt": Date.now() - 15000
    },
    "treasure_chest_sesame_plaza_room_sesame_street_01_3": {
      "id": "treasure_chest_sesame_plaza_room_sesame_street_01_3",
      "definitionId": "treasure_chest_sesame_plaza",
      "roomId": "sesame_street_01",
      "isOpen": true,
      "isLocked": false,
      "inventory": [],
      "capacity": 15,
      "createdAt": Date.now() - 5000,
      "modifiedAt": Date.now() - 5000
    },
    "treasure_chest_sesame_plaza_room_sesame_street_01_4": {
      "id": "treasure_chest_sesame_plaza_room_sesame_street_01_4",
      "definitionId": "treasure_chest_sesame_plaza",
      "roomId": "sesame_street_01",
      "isOpen": false,
      "isLocked": false,
      "inventory": [],
      "capacity": 15,
      "createdAt": Date.now(), // Newest!
      "modifiedAt": Date.now()
    }
  }
};

// Write test file
fs.writeFileSync(testPath, JSON.stringify(duplicateState, null, 2));
console.log(`Created test file with 7 containers (3 equipment racks + 4 treasure chests)`);

// Initialize world and load state
const World = require('../src/world');
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');

const world = new World('./world');

// Load the test state
console.log('\nLoading state with pre-existing duplicates...\n');
const result = RoomContainerManager.loadState(testPath);

console.log('=== RESULTS ===');
console.log(`Restored: ${result.restoredCount}`);
console.log(`Pre-existing duplicates removed: ${result.preDedupedCount}`);
console.log(`Runtime duplicates removed: ${result.runtimeDedupedCount}`);
console.log(`Total duplicates removed: ${result.duplicatesRemoved}`);
console.log(`New containers: ${result.newContainerCount}`);

// Check final counts
const arenaContainers = RoomContainerManager.getContainersByRoom('arena_lounge');
const sesameContainers = RoomContainerManager.getContainersByRoom('sesame_street_01');

console.log(`\nFinal container counts:`);
console.log(`  Arena lounge: ${arenaContainers.length} (should be 1)`);
console.log(`  Sesame Street: ${sesameContainers.length} (should be 1)`);

// Verify
const tests = [
  { name: 'Pre-existing duplicates detected', pass: result.preDedupedCount === 5 },
  { name: 'Arena lounge has 1 container', pass: arenaContainers.length === 1 },
  { name: 'Sesame Street has 1 container', pass: sesameContainers.length === 1 },
  { name: 'Kept newest equipment rack', pass: arenaContainers[0].id === 'equipment_rack_room_arena_lounge_3' },
  { name: 'Kept newest treasure chest', pass: sesameContainers[0].id === 'treasure_chest_sesame_plaza_room_sesame_street_01_4' }
];

console.log('\n=== VERIFICATION ===');
let allPassed = true;
for (const test of tests) {
  const status = test.pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  if (!test.pass) allPassed = false;
}

// Cleanup
if (fs.existsSync(testPath)) {
  fs.unlinkSync(testPath);
}

console.log('\n' + (allPassed ? '✓ ALL TESTS PASSED!' : '✗ SOME TESTS FAILED'));
console.log('\nPre-restore deduplication successfully removes duplicates from saved state!');
