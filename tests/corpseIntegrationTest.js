/**
 * Corpse System Integration Test
 *
 * Tests corpse system with full ItemRegistry and LootGenerator integration
 */

// Initialize item registry
const { loadCoreItems } = require('../world/core/items/loadItems');
const { loadSesameStreetItems } = require('../world/sesame_street/items/loadItems');

console.log('Loading item definitions...');
loadCoreItems();
loadSesameStreetItems();

const CorpseManager = require('../src/systems/corpses/CorpseManager');
const TimerManager = require('../src/systems/corpses/TimerManager');

// Mock world
class MockWorld {
  constructor() {
    this.rooms = {
      test_room: {
        id: 'test_room',
        name: 'Test Room',
        items: [],
        npcs: []
      }
    };
  }

  getRoom(roomId) {
    return this.rooms[roomId] || null;
  }
}

async function runIntegrationTest() {
  console.log('\n=== Corpse System Integration Test ===\n');

  const world = new MockWorld();

  // Test NPC with full loot generation
  const testNPC = {
    id: 'test_goblin',
    name: 'Test Goblin',
    size: 'medium',
    level: 2,
    challengeRating: 1,
    lootTables: ['trash_loot', 'common_loot'],
    isBoss: false
  };

  console.log('Creating corpse with full loot generation...');
  const corpse = CorpseManager.createNPCCorpse(testNPC, 'test_room', 'IntegrationTester', world);

  if (!corpse) {
    console.error('✗ Failed to create corpse');
    process.exit(1);
  }

  console.log(`✓ Corpse created: ${corpse.name}`);
  console.log(`  - ID: ${corpse.id}`);
  console.log(`  - Weight: ${corpse.weight} lbs`);
  console.log(`  - Capacity: ${corpse.capacity} slots`);
  console.log(`  - Items: ${corpse.inventory.length}`);
  console.log(`  - Pickupable: ${corpse.isPickupable}`);
  console.log(`  - Description: ${corpse.description}`);

  // Verify killer name
  if (corpse.description.includes('Killed by IntegrationTester')) {
    console.log('✓ Killer name in description');
  } else {
    console.error('✗ Killer name missing from description');
    process.exit(1);
  }

  // Verify in room
  const room = world.getRoom('test_room');
  const corpseInRoom = room.items.find(item => item.id === corpse.id);

  if (corpseInRoom) {
    console.log('✓ Corpse added to room.items');
  } else {
    console.error('✗ Corpse not in room.items');
    process.exit(1);
  }

  // Verify decay timer scheduled
  const timerId = `corpse_decay_${corpse.id}`;
  if (TimerManager.has(timerId)) {
    const remaining = TimerManager.getRemainingTime(timerId);
    console.log(`✓ Decay timer scheduled (${Math.floor(remaining / 1000)}s remaining)`);
  } else {
    console.error('✗ Decay timer not scheduled');
    process.exit(1);
  }

  // Check loot items
  console.log(`\nLoot items (${corpse.inventory.length}):`);
  for (const item of corpse.inventory) {
    console.log(`  - ${item.quantity || 1}x ${item.name} (${item.itemType})`);
  }

  // Verify corpse tracking
  if (CorpseManager.hasActiveCorpse(testNPC.id)) {
    console.log('\n✓ Corpse tracked by NPC ID');
  } else {
    console.error('\n✗ Corpse not tracked');
    process.exit(1);
  }

  // Test export/restore
  console.log('\nTesting persistence...');
  const exportedState = CorpseManager.exportState();
  console.log(`✓ Exported ${exportedState.length} corpse(s)`);

  // Verify exported data completeness
  const exported = exportedState[0];
  if (exported.killerName === 'IntegrationTester' &&
      exported.inventory.length > 0 &&
      exported.weight === 100) {
    console.log('✓ Export state contains complete data');
  } else {
    console.error('✗ Export state incomplete');
    process.exit(1);
  }

  // Test debug info
  const debugInfo = CorpseManager.getDebugInfo();
  console.log(`\nDebug info:`);
  console.log(`  - Active corpses: ${debugInfo.activeCorpses}`);
  console.log(`  - First corpse: ${debugInfo.corpses[0].npcId}`);

  // Cleanup
  CorpseManager.destroyCorpse(corpse.id, world);
  console.log('\n✓ Corpse destroyed successfully');

  if (!CorpseManager.hasActiveCorpse(testNPC.id)) {
    console.log('✓ Corpse tracking cleaned up');
  } else {
    console.error('✗ Corpse still tracked after destruction');
    process.exit(1);
  }

  TimerManager.clearAll();

  console.log('\n=== Integration Test Complete ===');
  console.log('✓ All integration tests passed!\n');
}

runIntegrationTest().catch(error => {
  console.error('Integration test failed:', error);
  process.exit(1);
});
