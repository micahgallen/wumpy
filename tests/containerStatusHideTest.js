/**
 * Integration test for hideContainerStatus flag
 * Tests that furniture-like containers can hide status indicators
 */

const World = require('../src/world');
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const colors = require('../src/colors');

console.log('Testing hideContainerStatus feature...\n');

// Initialize world
const world = new World('./world');

// Mock player for testing
const mockPlayer = {
  currentRoom: 'arena_lounge',
  username: 'testplayer',
  send: function(msg) {
    console.log(msg);
  },
  getDisplayName: function() {
    return 'TestPlayer';
  }
};

// Test 1: Room listing should not show "(open)" for equipment rack
console.log('=== TEST 1: Room Listing ===');
console.log('Equipment rack (hideContainerStatus: true) should NOT show (open):');
const roomOutput = world.formatRoom('arena_lounge', [mockPlayer], mockPlayer);
console.log(roomOutput);
console.log('');

// Test 2: Examine equipment rack - should NOT show Type/Status
console.log('\n=== TEST 2: Examine Equipment Rack ===');
console.log('Should NOT show "Type: Container" or "Status:" lines:');
const containers = RoomContainerManager.getContainersByRoom('arena_lounge');
const equipmentRack = containers.find(c => c.definitionId === 'equipment_rack');
if (equipmentRack) {
  const definition = RoomContainerManager.getDefinition('equipment_rack');

  let output = [];
  output.push(colors.objectName(definition.name));
  output.push(colors.line(colors.visibleLength(definition.name), '='));

  // Description
  if (definition.description) {
    output.push(definition.description);
  }

  output.push('');

  // Container type and capacity (should be hidden)
  if (!definition.hideContainerStatus) {
    output.push(colors.dim(`Type: Container (${equipmentRack.capacity} slots)`));
    if (equipmentRack.isOpen) {
      output.push(colors.success('Status: OPEN'));
    }
  }

  // Contents (should still show)
  if (equipmentRack.isOpen && equipmentRack.inventory && equipmentRack.inventory.length > 0) {
    output.push('');
    output.push(colors.info('Contents:'));
    const ItemRegistry = require('../src/items/ItemRegistry');
    for (const item of equipmentRack.inventory) {
      const itemDef = ItemRegistry.getItem(item.definitionId);
      if (itemDef) {
        output.push(`  - ${itemDef.name}`);
      }
    }
  }

  console.log(output.join('\n'));
}

// Test 3: Compare with a regular container (e.g., corpse or regular container)
console.log('\n=== TEST 3: Regular Container Comparison ===');
console.log('Regular containers should STILL show status info.');
console.log('(This would be tested with a treasure chest or other container without hideContainerStatus)');

console.log('\n=== VERIFICATION ===');
console.log('✓ Equipment rack should appear as: "You see a battered equipment rack here."');
console.log('✗ Should NOT see: "You see a battered equipment rack (open) here."');
console.log('✓ Examine should show description and contents');
console.log('✗ Examine should NOT show "Type: Container" or "Status: OPEN"');
console.log('\nTest complete!');
