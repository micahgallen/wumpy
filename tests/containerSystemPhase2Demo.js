/**
 * Container System Phase 2 - Interactive Demonstration
 *
 * Demonstrates loot spawning and respawning functionality with
 * detailed output showing the complete lifecycle.
 */

const RoomContainerManager = require('../src/systems/containers/RoomContainerManager');
const LootSpawner = require('../src/systems/containers/LootSpawner');
const TimerManager = require('../src/systems/corpses/TimerManager');
const ItemRegistry = require('../src/items/ItemRegistry');
const colors = require('../src/colors');

// Utility to wait
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility to print section headers
function section(title) {
  console.log('\n' + colors.cyan('═'.repeat(70)));
  console.log(colors.cyan(`  ${title}`));
  console.log(colors.cyan('═'.repeat(70)));
}

// Utility to print item inventory
function displayInventory(container, definition) {
  if (container.inventory.length === 0) {
    console.log(colors.dim('  [Empty]'));
    return;
  }

  console.log(colors.info(`  ${container.inventory.length} items:`));
  const itemCounts = {};

  for (const item of container.inventory) {
    const name = item.name || 'Unknown Item';
    const qty = item.quantity || 1;
    if (itemCounts[name]) {
      itemCounts[name] += qty;
    } else {
      itemCounts[name] = qty;
    }
  }

  for (const [name, count] of Object.entries(itemCounts)) {
    console.log(colors.dim(`    • ${name} x${count}`));
  }
}

// Register test items
function registerTestItems() {
  try {
    ItemRegistry.registerItem({
      id: 'demo_cookie',
      name: 'a demonstration cookie',
      description: 'A cookie for demo purposes',
      keywords: ['cookie', 'demo'],
      itemType: 'consumable',
      rarity: 'common',
      weight: 0.1,
      value: 10,
      isStackable: true,
      spawnable: true,
      lootTables: ['common_loot'],
      spawnTags: ['type:consumable']
    });

    ItemRegistry.registerItem({
      id: 'demo_potion',
      name: 'a demonstration potion',
      description: 'A potion for demo purposes',
      keywords: ['potion', 'demo'],
      itemType: 'consumable',
      rarity: 'common',
      weight: 0.5,
      value: 50,
      isStackable: true,
      spawnable: true,
      lootTables: ['common_loot'],
      spawnTags: ['type:consumable']
    });

    console.log(colors.dim('Registered demo items'));
  } catch (error) {
    console.log(colors.dim('Using existing demo items'));
  }
}

// Main demo
async function runDemo() {
  console.log(colors.cyan('\n╔════════════════════════════════════════════════════════════════════╗'));
  console.log(colors.cyan('║         Container System Phase 2 - Interactive Demo               ║'));
  console.log(colors.cyan('║              Loot Spawning & Respawning System                     ║'));
  console.log(colors.cyan('╚════════════════════════════════════════════════════════════════════╝\n'));

  // Setup
  registerTestItems();
  RoomContainerManager.clearAll();
  TimerManager.clearAll();

  // Define a demo container
  const demoContainerDef = {
    id: 'demo_treasure_chest',
    name: 'a demonstration treasure chest',
    description: 'A magical chest that demonstrates the loot system',
    keywords: ['chest', 'treasure', 'demo'],
    containerType: 'room_container',
    isRoomContainer: true,
    isTakeable: false,
    isExaminable: true,
    isOpen: false,
    isLocked: false,
    capacity: 20,
    lootConfig: {
      spawnOnInit: true,
      respawnOnEmpty: true,
      respawnDelay: 2000, // 2 seconds for demo
      respawnMode: 'empty',
      maxItems: 8,
      guaranteedItems: [
        {
          itemId: 'demo_cookie',
          quantity: 5,
          chance: 100
        },
        {
          itemId: 'demo_potion',
          quantity: 2,
          chance: 75
        }
      ],
      randomItems: {
        count: 2,
        lootTable: 'common_loot',
        level: 1,
        allowDuplicates: false,
        includeCurrency: false
      }
    }
  };

  RoomContainerManager.registerDefinition(demoContainerDef);

  // Step 1: Create container with initial loot
  section('Step 1: Container Creation with Automatic Loot Spawning');
  console.log(colors.info('  Creating a new treasure chest...'));

  const container = RoomContainerManager.createContainerInstance('demo_treasure_chest', 'demo_room');

  console.log(colors.success(`  ✓ Container created: ${container.id}`));
  console.log(colors.info('  Configuration:'));
  console.log(colors.dim(`    • Spawn on init: ${demoContainerDef.lootConfig.spawnOnInit}`));
  console.log(colors.dim(`    • Respawn when empty: ${demoContainerDef.lootConfig.respawnOnEmpty}`));
  console.log(colors.dim(`    • Respawn delay: ${demoContainerDef.lootConfig.respawnDelay / 1000} seconds`));
  console.log(colors.dim(`    • Max items: ${demoContainerDef.lootConfig.maxItems}`));

  console.log(colors.info('\n  Initial inventory:'));
  displayInventory(container, demoContainerDef);

  // Step 2: Check respawn status
  section('Step 2: Query Respawn Status');
  const status1 = RoomContainerManager.getRespawnStatus(container.id);
  console.log(colors.info('  Respawn configuration:'));
  console.log(colors.dim(`    • Respawn configured: ${status1.configured}`));
  console.log(colors.dim(`    • Has active timer: ${status1.hasActiveTimer}`));
  console.log(colors.dim(`    • Container is empty: ${status1.isEmpty}`));
  console.log(colors.dim(`    • Last looted: ${status1.lastLooted || 'Never'}`));

  // Step 3: Manually spawn loot
  section('Step 3: Manual Loot Spawning (Override)');
  console.log(colors.info('  Manually spawning new loot (replaces current inventory)...'));

  const spawnResult = RoomContainerManager.spawnLoot(container.id);

  console.log(colors.success(`  ✓ Spawned ${spawnResult.items.length} new items`));
  console.log(colors.info('  New inventory:'));
  displayInventory(container, demoContainerDef);

  // Step 4: Empty the container
  section('Step 4: Empty Container and Trigger Respawn Timer');
  console.log(colors.info('  Removing all items from the container...'));

  const itemCount = container.inventory.length;
  container.inventory = [];
  RoomContainerManager.onContainerEmptied(container.id);

  console.log(colors.success(`  ✓ Removed ${itemCount} items`));
  console.log(colors.info('  Container is now empty:'));
  displayInventory(container, demoContainerDef);

  const status2 = RoomContainerManager.getRespawnStatus(container.id);
  console.log(colors.info('\n  Respawn status:'));
  console.log(colors.dim(`    • Has active timer: ${status2.hasActiveTimer}`));
  console.log(colors.dim(`    • Time remaining: ${status2.remainingSec} seconds`));
  console.log(colors.dim(`    • Next respawn at: ${new Date(status2.nextRespawn).toLocaleTimeString()}`));

  // Step 5: Wait for respawn
  section('Step 5: Automatic Respawn After Delay');
  console.log(colors.info('  Waiting for respawn timer to fire...'));

  const timerId = `container_respawn_${container.id}`;
  const remainingMs = TimerManager.getRemainingTime(timerId);

  // Show countdown
  const startTime = Date.now();
  const totalWait = remainingMs + 100; // Add 100ms buffer

  for (let i = 0; i < 5; i++) {
    await sleep(totalWait / 5);
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, totalWait - elapsed);
    process.stdout.write(colors.dim(`\r  Countdown: ${Math.ceil(remaining / 1000)}s remaining...`));
  }

  console.log(colors.success('\n  ✓ Respawn timer fired!'));
  console.log(colors.info('  Container inventory after respawn:'));
  displayInventory(container, demoContainerDef);

  const status3 = RoomContainerManager.getRespawnStatus(container.id);
  console.log(colors.info('\n  Respawn status:'));
  console.log(colors.dim(`    • Has active timer: ${status3.hasActiveTimer}`));
  console.log(colors.dim(`    • Last looted: ${status3.lastLooted || 'Never (reset after respawn)'}`));

  // Step 6: Cancel respawn timer
  section('Step 6: Cancel Respawn Timer (Manual Control)');
  console.log(colors.info('  Emptying container again...'));

  container.inventory = [];
  RoomContainerManager.onContainerEmptied(container.id);

  console.log(colors.info('  Respawn timer scheduled.'));

  const status4 = RoomContainerManager.getRespawnStatus(container.id);
  console.log(colors.dim(`    • Has active timer: ${status4.hasActiveTimer}`));
  console.log(colors.dim(`    • Time remaining: ${status4.remainingSec} seconds`));

  console.log(colors.info('\n  Cancelling respawn timer...'));
  const cancelled = RoomContainerManager.cancelRespawn(container.id);

  console.log(colors.success(`  ✓ Timer cancelled: ${cancelled}`));

  const status5 = RoomContainerManager.getRespawnStatus(container.id);
  console.log(colors.dim(`    • Has active timer: ${status5.hasActiveTimer}`));

  // Step 7: Demonstrate loot statistics
  section('Step 7: Loot Statistics and Analysis');
  console.log(colors.info('  Spawning a fresh batch of loot for analysis...'));

  const freshResult = RoomContainerManager.spawnLoot(container.id);
  const stats = LootSpawner.getLootStats(freshResult.items);

  console.log(colors.info('  Loot statistics:'));
  console.log(colors.dim(`    • Total items: ${stats.totalItems}`));
  console.log(colors.dim(`    • Total value: ${stats.totalValue} copper`));
  console.log(colors.info('  By rarity:'));
  for (const [rarity, count] of Object.entries(stats.byRarity)) {
    console.log(colors.dim(`    • ${rarity}: ${count}`));
  }
  console.log(colors.info('  By type:'));
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(colors.dim(`    • ${type}: ${count}`));
  }

  // Summary
  section('Demo Complete - Summary');
  console.log(colors.success('  ✓ Created container with automatic loot spawning'));
  console.log(colors.success('  ✓ Queried respawn status and configuration'));
  console.log(colors.success('  ✓ Manually spawned loot (override)'));
  console.log(colors.success('  ✓ Triggered automatic respawn on empty'));
  console.log(colors.success('  ✓ Observed respawn timer countdown'));
  console.log(colors.success('  ✓ Verified automatic loot replenishment'));
  console.log(colors.success('  ✓ Cancelled respawn timer manually'));
  console.log(colors.success('  ✓ Analyzed loot statistics'));

  console.log(colors.info('\n  Phase 2 Features Demonstrated:'));
  console.log(colors.dim('    • Guaranteed item spawning with chances'));
  console.log(colors.dim('    • Random loot from loot tables'));
  console.log(colors.dim('    • Automatic loot initialization'));
  console.log(colors.dim('    • Respawn timer scheduling'));
  console.log(colors.dim('    • Empty container detection'));
  console.log(colors.dim('    • Automatic loot replenishment'));
  console.log(colors.dim('    • Timer cancellation'));
  console.log(colors.dim('    • Respawn status queries'));
  console.log(colors.dim('    • Loot statistics generation'));

  // Cleanup
  console.log('\n' + colors.dim('Cleaning up...'));
  RoomContainerManager.clearAll();
  TimerManager.clearAll();

  console.log(colors.cyan('\n╔════════════════════════════════════════════════════════════════════╗'));
  console.log(colors.cyan('║                    Demo Complete!                                  ║'));
  console.log(colors.cyan('╚════════════════════════════════════════════════════════════════════╝\n'));
}

// Run the demo
runDemo().catch(error => {
  console.error(colors.error('\nDemo crashed:'), error);
  process.exit(1);
});
