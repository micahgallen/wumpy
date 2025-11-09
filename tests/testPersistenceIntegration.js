/**
 * Quick integration test for Phase 4 persistence
 * Tests that server startup code can load without errors
 */

console.log('Testing Phase 4 Persistence Integration...\n');

try {
  // Test 1: Verify TimerManager has persistence methods
  const TimerManager = require('../src/systems/corpses/TimerManager');

  console.log('✓ TimerManager loaded');

  if (typeof TimerManager.saveState !== 'function') {
    throw new Error('TimerManager.saveState() not found');
  }
  console.log('✓ TimerManager.saveState() exists');

  if (typeof TimerManager.loadState !== 'function') {
    throw new Error('TimerManager.loadState() not found');
  }
  console.log('✓ TimerManager.loadState() exists');

  // Test 2: Verify CorpseManager has persistence methods
  const CorpseManager = require('../src/systems/corpses/CorpseManager');

  console.log('✓ CorpseManager loaded');

  if (typeof CorpseManager.exportState !== 'function') {
    throw new Error('CorpseManager.exportState() not found');
  }
  console.log('✓ CorpseManager.exportState() exists');

  if (typeof CorpseManager.restoreState !== 'function') {
    throw new Error('CorpseManager.restoreState() not found');
  }
  console.log('✓ CorpseManager.restoreState() exists');

  // Test 3: Test export/restore cycle
  const mockWorld = {
    rooms: {
      test_room: {
        id: 'test_room',
        items: []
      }
    },
    getRoom: function(id) {
      return this.rooms[id];
    }
  };

  const mockNPC = {
    id: 'test_npc',
    name: 'Test NPC',
    homeRoom: 'test_room',
    size: 'medium'
  };

  // Create a corpse
  const corpse = CorpseManager.createNPCCorpse(mockNPC, 'test_room', 'Tester', mockWorld);
  console.log('✓ Created test corpse');

  // Export state
  const state = CorpseManager.exportState();
  console.log(`✓ Exported ${state.length} corpse(s)`);

  // Clear and restore
  CorpseManager.corpses.clear();
  CorpseManager.npcCorpseMap.clear();
  mockWorld.rooms.test_room.items = [];

  CorpseManager.restoreState(state, mockWorld);
  console.log('✓ Restored corpse state');

  // Verify restoration
  const restored = CorpseManager.getCorpse(corpse.id);
  if (!restored) {
    throw new Error('Corpse not restored');
  }
  console.log('✓ Corpse successfully restored');

  // Cleanup
  TimerManager.clearAll();
  CorpseManager.corpses.clear();
  CorpseManager.npcCorpseMap.clear();

  console.log('\n=== ALL INTEGRATION TESTS PASSED ===\n');
  console.log('Phase 4 Persistence is working correctly!');

} catch (err) {
  console.error('\n✗ TEST FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
}
