/**
 * Container System Phase 3 Integration Test
 *
 * Simulates a complete server restart scenario:
 * 1. Create containers with various states
 * 2. Save state to file
 * 3. Clear all state (simulate server shutdown)
 * 4. Restore state from file (simulate server startup)
 * 5. Verify all state is preserved correctly
 * 6. Test timer restoration with actual time passage
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import managers
const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const TimerManager = require('../src/systems/corpses/TimerManager');
const ItemRegistry = require('../src/items/ItemRegistry');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runIntegrationTest() {
  console.log('='.repeat(70));
  console.log('CONTAINER SYSTEM PHASE 3 - SERVER RESTART INTEGRATION TEST');
  console.log('='.repeat(70));
  console.log('');

  const tempFilePath = path.join(os.tmpdir(), `integration_test_containers_${Date.now()}.json`);

  try {
    // Setup: Register test item
    try {
      ItemRegistry.registerItem({
        id: 'integration_test_potion',
        name: 'integration test potion',
        description: 'A potion for integration testing',
        itemType: 'consumable',
        keywords: ['potion', 'test'],
        weight: 0.5,
        value: 50,
        isStackable: true
      });
    } catch (err) {
      // Item might already be registered
    }

    console.log('PHASE 1: Server Running - Creating Containers');
    console.log('-'.repeat(70));

    // Clear everything first
    RoomContainerManager.clearAll();
    TimerManager.clearAll();

    // Register container definitions
    RoomContainerManager.registerDefinition({
      id: 'treasure_chest_integration',
      name: 'integration test treasure chest',
      description: 'A chest for integration testing',
      keywords: ['chest', 'treasure', 'integration'],
      containerType: 'room_container',
      isRoomContainer: true,
      isTakeable: false,
      capacity: 20,
      isOpen: false,
      isLocked: false,
      lootConfig: {
        spawnOnInit: true,
        respawnOnEmpty: true,
        respawnDelay: 5000, // 5 seconds
        guaranteedItems: [
          { itemId: 'integration_test_potion', quantity: 2, chance: 100 }
        ]
      }
    });

    RoomContainerManager.registerDefinition({
      id: 'locked_safe_integration',
      name: 'integration test safe',
      description: 'A locked safe for integration testing',
      keywords: ['safe', 'locked', 'integration'],
      containerType: 'room_container',
      isRoomContainer: true,
      isTakeable: false,
      capacity: 10,
      isOpen: false,
      isLocked: true
    });

    RoomContainerManager.registerDefinition({
      id: 'barrel_integration',
      name: 'integration test barrel',
      description: 'A barrel for integration testing',
      keywords: ['barrel', 'integration'],
      containerType: 'room_container',
      isRoomContainer: true,
      isTakeable: false,
      capacity: 15,
      isOpen: true,
      isLocked: false
    });

    // Create container instances
    const chest = RoomContainerManager.createContainerInstance('treasure_chest_integration', 'test_tavern');
    const safe = RoomContainerManager.createContainerInstance('locked_safe_integration', 'test_vault');
    const barrel = RoomContainerManager.createContainerInstance('barrel_integration', 'test_storage');

    console.log(`Created 3 containers:`);
    console.log(`  - Chest: ${chest.id} (has ${chest.inventory.length} items initially)`);
    console.log(`  - Safe: ${safe.id} (locked: ${safe.isLocked})`);
    console.log(`  - Barrel: ${barrel.id} (open: ${barrel.isOpen})`);
    console.log('');

    // Modify states to simulate player interaction
    console.log('Simulating player interactions...');

    // Open the chest
    RoomContainerManager.openContainer(chest.id, { username: 'testplayer' });
    console.log(`  - Opened chest`);

    // Remove items from chest to trigger respawn timer
    const itemCount = chest.inventory.length;
    for (let i = itemCount - 1; i >= 0; i--) {
      RoomContainerManager.removeItem(chest.id, i);
    }
    console.log(`  - Emptied chest (removed ${itemCount} items), respawn timer scheduled`);

    // Add custom item to barrel
    barrel.inventory.push({
      definitionId: 'integration_test_potion',
      name: 'integration test potion',
      quantity: 5
    });
    console.log(`  - Added items to barrel`);
    console.log('');

    // Get state snapshot
    const containerCount = RoomContainerManager.getContainerCount();
    const respawnStatus = RoomContainerManager.getRespawnStatus(chest.id);

    console.log('State before save:');
    console.log(`  - Total containers: ${containerCount}`);
    console.log(`  - Chest is open: ${chest.isOpen}`);
    console.log(`  - Chest is empty: ${chest.inventory.length === 0}`);
    console.log(`  - Chest has respawn timer: ${respawnStatus.hasActiveTimer}`);
    console.log(`  - Chest respawn remaining: ${respawnStatus.remainingSec}s`);
    console.log(`  - Safe is locked: ${safe.isLocked}`);
    console.log(`  - Barrel has items: ${barrel.inventory.length}`);
    console.log('');

    // PHASE 2: Save state (simulate server shutdown)
    console.log('PHASE 2: Server Shutting Down - Saving State');
    console.log('-'.repeat(70));

    const saved = RoomContainerManager.saveState(tempFilePath);
    assert.strictEqual(saved, true, 'Save should succeed');
    assert.strictEqual(fs.existsSync(tempFilePath), true, 'Save file should exist');

    const fileSize = fs.statSync(tempFilePath).size;
    console.log(`Saved state to ${tempFilePath} (${fileSize} bytes)`);
    console.log('');

    // Store IDs for verification after restore
    const chestId = chest.id;
    const safeId = safe.id;
    const barrelId = barrel.id;
    const chestRespawnTime = chest.nextRespawn;

    // PHASE 3: Clear state (simulate server stopped)
    console.log('PHASE 3: Server Stopped - Clearing State');
    console.log('-'.repeat(70));

    RoomContainerManager.clearAll();
    TimerManager.clearAll();

    console.log('All state cleared from memory');
    console.log(`  - Container count: ${RoomContainerManager.getContainerCount()}`);
    console.log(`  - Timer count: ${TimerManager.getActiveTimerCount()}`);
    console.log('');

    // Simulate downtime (2 seconds)
    console.log('Simulating server downtime (2 seconds)...');
    await sleep(2000);
    console.log('');

    // Re-register definitions (would happen on server startup)
    RoomContainerManager.registerDefinition({
      id: 'treasure_chest_integration',
      name: 'integration test treasure chest',
      description: 'A chest for integration testing',
      keywords: ['chest', 'treasure', 'integration'],
      containerType: 'room_container',
      isRoomContainer: true,
      isTakeable: false,
      capacity: 20,
      isOpen: false,
      isLocked: false,
      lootConfig: {
        spawnOnInit: true,
        respawnOnEmpty: true,
        respawnDelay: 5000,
        guaranteedItems: [
          { itemId: 'integration_test_potion', quantity: 2, chance: 100 }
        ]
      }
    });

    RoomContainerManager.registerDefinition({
      id: 'locked_safe_integration',
      name: 'integration test safe',
      description: 'A locked safe for integration testing',
      keywords: ['safe', 'locked', 'integration'],
      containerType: 'room_container',
      isRoomContainer: true,
      isTakeable: false,
      capacity: 10,
      isOpen: false,
      isLocked: true
    });

    RoomContainerManager.registerDefinition({
      id: 'barrel_integration',
      name: 'integration test barrel',
      description: 'A barrel for integration testing',
      keywords: ['barrel', 'integration'],
      containerType: 'room_container',
      isRoomContainer: true,
      isTakeable: false,
      capacity: 15,
      isOpen: true,
      isLocked: false
    });

    // PHASE 4: Restore state (simulate server startup)
    console.log('PHASE 4: Server Starting - Restoring State');
    console.log('-'.repeat(70));

    const result = RoomContainerManager.loadState(tempFilePath);

    console.log(`Restore results:`);
    console.log(`  - Containers restored: ${result.restoredCount}`);
    console.log(`  - Containers respawned: ${result.expiredCount}`);
    console.log(`  - Errors: ${result.errors.length}`);
    console.log(`  - Downtime: ${Math.floor(result.downtime / 1000)}s`);
    console.log('');

    // PHASE 5: Verify restored state
    console.log('PHASE 5: Verifying Restored State');
    console.log('-'.repeat(70));

    // Verify containers exist
    const restoredChest = RoomContainerManager.getContainer(chestId);
    const restoredSafe = RoomContainerManager.getContainer(safeId);
    const restoredBarrel = RoomContainerManager.getContainer(barrelId);

    assert(restoredChest, 'Chest should be restored');
    assert(restoredSafe, 'Safe should be restored');
    assert(restoredBarrel, 'Barrel should be restored');
    console.log('All containers restored successfully');

    // Verify chest state
    assert.strictEqual(restoredChest.isOpen, true, 'Chest should still be open');
    console.log('  - Chest open state preserved: YES');

    assert.strictEqual(restoredChest.inventory.length, 0, 'Chest should still be empty');
    console.log('  - Chest empty state preserved: YES');

    const newRespawnStatus = RoomContainerManager.getRespawnStatus(chestId);
    assert.strictEqual(newRespawnStatus.hasActiveTimer, true, 'Chest should have respawn timer');
    console.log(`  - Chest respawn timer restored: YES (${newRespawnStatus.remainingSec}s remaining)`);

    // Verify safe state
    assert.strictEqual(restoredSafe.isLocked, true, 'Safe should still be locked');
    console.log('  - Safe locked state preserved: YES');

    // Verify barrel state
    assert.strictEqual(restoredBarrel.isOpen, true, 'Barrel should still be open');
    assert.strictEqual(restoredBarrel.inventory.length, 1, 'Barrel should still have items');
    console.log('  - Barrel state preserved: YES (has items)');
    console.log('');

    // PHASE 6: Test timer restoration
    console.log('PHASE 6: Testing Timer Restoration');
    console.log('-'.repeat(70));

    console.log('Waiting for chest respawn timer to fire...');
    const waitTime = newRespawnStatus.remainingMs + 500; // Add buffer
    await sleep(waitTime);

    const finalChest = RoomContainerManager.getContainer(chestId);
    assert(finalChest.inventory.length > 0, 'Chest should have loot after timer fires');
    console.log(`  - Timer fired successfully`);
    console.log(`  - Chest now has ${finalChest.inventory.length} items`);
    console.log('');

    // Cleanup
    fs.unlinkSync(tempFilePath);
    console.log('Test file cleaned up');
    console.log('');

    console.log('='.repeat(70));
    console.log('INTEGRATION TEST: PASSED');
    console.log('='.repeat(70));
    console.log('');
    console.log('Summary:');
    console.log('  - State saved successfully');
    console.log('  - State restored after simulated downtime');
    console.log('  - Container properties preserved');
    console.log('  - Respawn timer rescheduled correctly');
    console.log('  - Timer fired and respawned loot');
    console.log('');

    return { success: true };
  } catch (err) {
    console.error('');
    console.error('='.repeat(70));
    console.error('INTEGRATION TEST: FAILED');
    console.error('='.repeat(70));
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // Cleanup on error
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return { success: false, error: err };
  } finally {
    // Final cleanup
    RoomContainerManager.clearAll();
    TimerManager.clearAll();
  }
}

// Run test
if (require.main === module) {
  runIntegrationTest()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Integration test failed with error:', err);
      process.exit(1);
    });
}

module.exports = { runIntegrationTest };
