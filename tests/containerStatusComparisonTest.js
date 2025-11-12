/**
 * Comparison test to verify regular containers still show status
 */

const World = require('../src/world');
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const colors = require('../src/colors');

console.log('Testing container status display comparison...\n');

// Initialize world
const world = new World('./world');

// Mock player
const mockPlayer = {
  currentRoom: 'sesame_street_01',
  username: 'testplayer',
  getDisplayName: function() {
    return 'TestPlayer';
  }
};

console.log('=== Regular Container (Treasure Chest) ===');
console.log('Should SHOW status indicators:\n');

const roomOutput = world.formatRoom('sesame_street_01', [mockPlayer], mockPlayer);
console.log(roomOutput);

console.log('\n=== Examine Treasure Chest ===');
const containers = RoomContainerManager.getContainersByRoom('sesame_street_01');
const treasureChest = containers.find(c => c.definitionId === 'treasure_chest_sesame_plaza');

if (treasureChest) {
  const definition = RoomContainerManager.getDefinition('treasure_chest_sesame_plaza');

  let output = [];
  output.push(colors.objectName(definition.name));
  output.push(colors.line(colors.visibleLength(definition.name), '='));

  if (definition.description) {
    output.push(definition.description);
  }

  output.push('');

  // Container type and capacity (should be visible for regular containers)
  if (!definition.hideContainerStatus) {
    output.push(colors.dim(`Type: Container (${treasureChest.capacity} slots)`));
    if (treasureChest.isLocked) {
      output.push(colors.warning('Status: LOCKED'));
    } else if (treasureChest.isOpen) {
      output.push(colors.success('Status: OPEN'));
    } else {
      output.push(colors.info('Status: CLOSED'));
    }
  }

  console.log(output.join('\n'));
}

console.log('\n=== VERIFICATION ===');
console.log('✓ Treasure chest SHOULD show "(locked)" or "(open)" in room listing');
console.log('✓ Treasure chest SHOULD show "Type: Container" and "Status:" in examine');
console.log('');
console.log('Compare this with the equipment rack test to see the difference!');
