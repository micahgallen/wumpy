/**
 * Direct test of the deduplication logic in restoreState
 * This test manually creates duplicates and verifies they are removed
 */

const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const fs = require('fs');
const path = require('path');

console.log('=== Container Deduplication Logic Test ===\n');

// Initialize manager
const World = require('../src/world');
const world = new World('./world');

console.log('Step 1: Initial state');
console.log('---------------------');
let arenaContainers = RoomContainerManager.getContainersByRoom('arena_lounge');
console.log(`Arena lounge containers: ${arenaContainers.length}`);

// Manually create a duplicate (simulating what happens during initialization)
console.log('\nStep 2: Manually inject a duplicate container');
console.log('----------------------------------------------');
const duplicateContainer = {
  id: 'equipment_rack_room_arena_lounge_DUPLICATE_TEST',
  definitionId: 'equipment_rack',
  roomId: 'arena_lounge',
  isOpen: true,
  isLocked: false,
  inventory: [],
  capacity: 20,
  lastLooted: null,
  nextRespawn: null,
  createdAt: Date.now(),
  modifiedAt: Date.now(),
  trapState: null
};

// Inject the duplicate directly into the manager
RoomContainerManager.containers.set(duplicateContainer.id, duplicateContainer);
if (!RoomContainerManager.containersByRoom.has('arena_lounge')) {
  RoomContainerManager.containersByRoom.set('arena_lounge', []);
}
RoomContainerManager.containersByRoom.get('arena_lounge').push(duplicateContainer);

arenaContainers = RoomContainerManager.getContainersByRoom('arena_lounge');
console.log(`Arena lounge containers after injection: ${arenaContainers.length}`);
console.log('Container IDs:');
arenaContainers.forEach(c => console.log(`  - ${c.id}`));

// Now restore state (which should remove the duplicate)
console.log('\nStep 3: Restore state from disk');
console.log('--------------------------------');
const containersPath = path.join(__dirname, '../data/containers.json');
const result = RoomContainerManager.loadState(containersPath);

console.log(`\nRestore result:`);
console.log(`  - Restored: ${result.restoredCount}`);
console.log(`  - Duplicates removed: ${result.duplicatesRemoved}`);
console.log(`  - New containers: ${result.newContainerCount}`);

// Check final state
arenaContainers = RoomContainerManager.getContainersByRoom('arena_lounge');
console.log(`\nArena lounge containers after restore: ${arenaContainers.length}`);
console.log('Container IDs:');
arenaContainers.forEach(c => console.log(`  - ${c.id}`));

// Verification
console.log('\n=== VERIFICATION ===');
const tests = [
  { name: 'Duplicate was detected and removed', pass: result.duplicatesRemoved >= 1 },
  { name: 'Final count is 1', pass: arenaContainers.length === 1 },
  { name: 'Duplicate ID no longer exists', pass: !RoomContainerManager.containers.has('equipment_rack_room_arena_lounge_DUPLICATE_TEST') }
];

let allPassed = true;
for (const test of tests) {
  const status = test.pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  if (!test.pass) allPassed = false;
}

console.log('\n' + (allPassed ? '✓ ALL TESTS PASSED - Deduplication logic works!' : '✗ SOME TESTS FAILED'));
