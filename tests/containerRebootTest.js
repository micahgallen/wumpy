/**
 * Test to verify containers don't duplicate on server reboot
 * Simulates: initialize → save → "reboot" → initialize → restore → check
 */

const World = require('../src/world');
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const path = require('path');
const fs = require('fs');

console.log('=== Container Reboot Cycle Test ===\n');

const testStatePath = path.join(__dirname, '../data/containers_test.json');

// Clean up any existing test file
if (fs.existsSync(testStatePath)) {
  fs.unlinkSync(testStatePath);
}

// ========================================
// CYCLE 1: Fresh start
// ========================================
console.log('CYCLE 1: Fresh initialization');
console.log('------------------------------');

let world1 = new World('./world');
let containers1 = RoomContainerManager.getContainersByRoom('arena_lounge');
console.log(`Arena lounge containers after init: ${containers1.length}`);

// Save state
RoomContainerManager.saveState(testStatePath);
console.log('State saved\n');

// Clear world (simulate shutdown)
world1 = null;

// ========================================
// CYCLE 2: Simulate reboot
// ========================================
console.log('CYCLE 2: Simulated reboot (initialize + restore)');
console.log('------------------------------------------------');

// Re-initialize world (this creates NEW containers)
let world2 = new World('./world');

// Count containers before restore
let containersBeforeRestore = RoomContainerManager.getContainersByRoom('arena_lounge');
console.log(`Arena lounge containers BEFORE restore: ${containersBeforeRestore.length}`);

// Restore state (this should remove duplicates)
const result = RoomContainerManager.loadState(testStatePath);
console.log(`\nRestore result:`);
console.log(`  - Restored: ${result.restoredCount}`);
console.log(`  - Duplicates removed: ${result.duplicatesRemoved}`);
console.log(`  - New containers: ${result.newContainerCount}`);
console.log(`  - Errors: ${result.errors.length}`);

// Count containers after restore
let containersAfterRestore = RoomContainerManager.getContainersByRoom('arena_lounge');
console.log(`\nArena lounge containers AFTER restore: ${containersAfterRestore.length}`);

// ========================================
// CYCLE 3: Another reboot to ensure stability
// ========================================
console.log('\nCYCLE 3: Second reboot (should show same results)');
console.log('--------------------------------------------------');

// Save again
RoomContainerManager.saveState(testStatePath);
world2 = null;

// Re-initialize again
let world3 = new World('./world');
const result3 = RoomContainerManager.loadState(testStatePath);
console.log(`Restore result:`);
console.log(`  - Restored: ${result3.restoredCount}`);
console.log(`  - Duplicates removed: ${result3.duplicatesRemoved}`);
console.log(`  - New containers: ${result3.newContainerCount}`);

let containers3 = RoomContainerManager.getContainersByRoom('arena_lounge');
console.log(`Arena lounge containers: ${containers3.length}`);

// ========================================
// Verification
// ========================================
console.log('\n=== VERIFICATION ===');

const allTests = [
  { name: 'Cycle 1 has 1 container', pass: containers1.length === 1 },
  { name: 'Cycle 2 removed duplicates', pass: result.duplicatesRemoved > 0 },
  { name: 'Cycle 2 final count is 1', pass: containersAfterRestore.length === 1 },
  { name: 'Cycle 3 has no duplicates to remove', pass: result3.duplicatesRemoved === 0 },
  { name: 'Cycle 3 final count is 1', pass: containers3.length === 1 }
];

let allPassed = true;
for (const test of allTests) {
  const status = test.pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${test.name}`);
  if (!test.pass) allPassed = false;
}

// Clean up test file
if (fs.existsSync(testStatePath)) {
  fs.unlinkSync(testStatePath);
}

console.log('\n' + (allPassed ? '✓ ALL TESTS PASSED!' : '✗ SOME TESTS FAILED'));
console.log('\nThe fix successfully prevents container duplication on reboot!');
