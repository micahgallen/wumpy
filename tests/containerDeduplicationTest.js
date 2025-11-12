/**
 * Test to verify container deduplication fix
 * Ensures containers are not duplicated on server restart
 */

const World = require('../src/world');
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const colors = require('../src/colors');

console.log('=== Container Deduplication Test ===\n');

// Simulate server restart by loading world (which restores state and initializes containers)
const world = new World('./world');

// Mock player
const mockPlayer = {
  currentRoom: 'arena_lounge',
  username: 'testplayer',
  getDisplayName: function() {
    return 'TestPlayer';
  }
};

// Test 1: Check arena_lounge has only ONE equipment rack
console.log('TEST 1: Arena Lounge Equipment Rack');
const arenaContainers = RoomContainerManager.getContainersByRoom('arena_lounge');
console.log(`Containers in arena_lounge: ${arenaContainers.length}`);

const equipmentRacks = arenaContainers.filter(c => c.definitionId === 'equipment_rack');
console.log(`Equipment racks found: ${equipmentRacks.length}`);

if (equipmentRacks.length === 1) {
  console.log('✓ PASS: Only one equipment rack exists\n');
} else {
  console.log(`✗ FAIL: Expected 1 equipment rack, found ${equipmentRacks.length}\n`);
}

// Test 2: Check sesame_street_01 has only ONE treasure chest
console.log('TEST 2: Sesame Street Treasure Chest');
const sesameContainers = RoomContainerManager.getContainersByRoom('sesame_street_01');
console.log(`Containers in sesame_street_01: ${sesameContainers.length}`);

const treasureChests = sesameContainers.filter(c => c.definitionId === 'treasure_chest_sesame_plaza');
console.log(`Treasure chests found: ${treasureChests.length}`);

if (treasureChests.length === 1) {
  console.log('✓ PASS: Only one treasure chest exists\n');
} else {
  console.log(`✗ FAIL: Expected 1 treasure chest, found ${treasureChests.length}\n`);
}

// Test 3: Verify room display shows only one container listing
console.log('TEST 3: Room Display');
const roomOutput = world.formatRoom('arena_lounge', [mockPlayer], mockPlayer);
// Count only the "You see X here" lines, not description mentions
const containerListingLines = roomOutput.split('\n').filter(line =>
  line.includes('You see') && line.includes('equipment rack') && line.includes('here')
);
console.log(`Container listing lines: ${containerListingLines.length}`);

if (containerListingLines.length === 1) {
  console.log('✓ PASS: Room display shows only one equipment rack listing');
  console.log(`  "${containerListingLines[0].trim()}"`);
} else {
  console.log(`✗ FAIL: Room display shows ${containerListingLines.length} equipment rack listings`);
  containerListingLines.forEach((line, i) => {
    console.log(`  [${i + 1}] "${line.trim()}"`);
  });
}

console.log('\n=== Test Summary ===');
const allPassed = equipmentRacks.length === 1 && treasureChests.length === 1 && containerListingLines.length === 1;
if (allPassed) {
  console.log('✓ ALL TESTS PASSED - Deduplication fix is working!');
} else {
  console.log('✗ SOME TESTS FAILED - Check output above');
}
