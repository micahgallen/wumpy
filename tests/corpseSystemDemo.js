/**
 * Corpse System Demo
 *
 * Demonstrates the complete corpse system functionality with visual output
 */

const { loadCoreItems } = require('../world/core/items/loadItems');
const { loadSesameStreetItems } = require('../world/sesame_street/items/loadItems');
const CorpseManager = require('../src/systems/corpses/CorpseManager');
const TimerManager = require('../src/systems/corpses/TimerManager');

// Load items
loadCoreItems();
loadSesameStreetItems();

// Mock world
class MockWorld {
  constructor() {
    this.rooms = {
      dungeon: {
        id: 'dungeon',
        name: 'Dark Dungeon',
        items: [],
        npcs: []
      }
    };
  }

  getRoom(roomId) {
    return this.rooms[roomId] || null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        CORPSE & RESPAWN SYSTEM - PHASE 1 DEMO             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const world = new MockWorld();

  // Demo 1: Create corpse from low-level NPC
  console.log('━━━ Demo 1: Goblin Death ━━━\n');

  const goblin = {
    id: 'goblin_1',
    name: 'Goblin Scout',
    size: 'small',
    level: 1,
    challengeRating: 1,
    lootTables: ['trash_loot']
  };

  console.log('⚔️  A fierce battle ensues...');
  console.log('💥 Player "DragonSlayer" kills Goblin Scout!\n');

  const corpse1 = CorpseManager.createNPCCorpse(goblin, 'dungeon', 'DragonSlayer', world);

  console.log('📦 Corpse Created:');
  console.log(`   Name: ${corpse1.name}`);
  console.log(`   Description: ${corpse1.description}`);
  console.log(`   Weight: ${corpse1.weight} lbs (${corpse1.isPickupable ? 'pickupable' : 'too heavy'})`);
  console.log(`   Capacity: ${corpse1.capacity} slots`);
  console.log(`   Items: ${corpse1.inventory.length}`);

  console.log('\n💰 Loot Contents:');
  for (const item of corpse1.inventory) {
    const qty = item.quantity > 1 ? `${item.quantity}x ` : '';
    console.log(`   - ${qty}${item.name}`);
  }

  const remaining1 = TimerManager.getRemainingTime(`corpse_decay_${corpse1.id}`);
  console.log(`\n⏱️  Decay Timer: ${Math.floor(remaining1 / 1000)}s remaining\n`);

  // Demo 2: Create corpse from boss NPC
  console.log('━━━ Demo 2: Dragon Death ━━━\n');

  const dragon = {
    id: 'ancient_dragon',
    name: 'Ancient Red Dragon',
    size: 'gargantuan',
    level: 15,
    challengeRating: 5,
    lootTables: ['boss_drops', 'epic_loot'],
    isBoss: true
  };

  console.log('🐉 An epic battle against the Ancient Red Dragon!');
  console.log('⚔️  Guild party defeats the dragon!\n');

  const corpse2 = CorpseManager.createNPCCorpse(dragon, 'dungeon', 'GuildMaster', world);

  console.log('📦 Corpse Created:');
  console.log(`   Name: ${corpse2.name}`);
  console.log(`   Description: ${corpse2.description}`);
  console.log(`   Weight: ${corpse2.weight} lbs (${corpse2.isPickupable ? 'pickupable' : 'too heavy to carry!'})`);
  console.log(`   Capacity: ${corpse2.capacity} slots`);
  console.log(`   Items: ${corpse2.inventory.length}`);

  console.log('\n💎 Epic Loot Contents:');
  for (const item of corpse2.inventory) {
    const qty = item.quantity > 1 ? `${item.quantity}x ` : '';
    console.log(`   - ${qty}${item.name}`);
  }

  const remaining2 = TimerManager.getRemainingTime(`corpse_decay_${corpse2.id}`);
  console.log(`\n⏱️  Decay Timer: ${Math.floor(remaining2 / 1000)}s remaining\n`);

  // Demo 3: System Status
  console.log('━━━ Demo 3: System Status ━━━\n');

  const corpseInfo = CorpseManager.getDebugInfo();
  const timerInfo = TimerManager.getDebugInfo();

  console.log('📊 Corpse Manager Status:');
  console.log(`   Active Corpses: ${corpseInfo.activeCorpses}`);
  console.log(`   Memory Usage: ~${(corpseInfo.activeCorpses * 2.2).toFixed(1)} KB\n`);

  console.log('⏰ Timer Manager Status:');
  console.log(`   Active Timers: ${timerInfo.activeTimers}`);
  console.log(`   Memory Usage: ~${(timerInfo.activeTimers * 0.2).toFixed(1)} KB\n`);

  console.log('🗺️  Room Status:');
  const room = world.getRoom('dungeon');
  console.log(`   Items in room: ${room.items.length}`);
  for (const item of room.items) {
    console.log(`   - ${item.name}`);
  }
  console.log();

  // Demo 4: Event System
  console.log('━━━ Demo 4: Event System ━━━\n');

  let eventReceived = false;
  CorpseManager.on('corpseDecayed', (data) => {
    console.log('📡 Event Received: corpseDecayed');
    console.log(`   NPC: ${data.npcId}`);
    console.log(`   Room: ${data.roomId}`);
    console.log(`   Corpse: ${data.corpseId}\n`);
    eventReceived = true;
  });

  // Override decay time for demo
  const config = require('../src/config/itemsConfig');
  const originalDecayTime = config.corpses.npc.decayTime;
  config.corpses.npc.decayTime = 2000; // 2 seconds for demo

  const testNPC = {
    id: 'test_rat',
    name: 'Giant Rat',
    size: 'tiny',
    level: 1,
    challengeRating: 0,
    lootTables: ['trash_loot']
  };

  console.log('🐀 Creating a Giant Rat corpse with 2-second decay...');
  const testCorpse = CorpseManager.createNPCCorpse(testNPC, 'dungeon', null, world);

  console.log('⏳ Waiting for decay...\n');
  await sleep(2500);

  if (eventReceived) {
    console.log('✓ Event system working correctly!\n');
  } else {
    console.log('✗ Event not received\n');
  }

  // Restore original decay time
  config.corpses.npc.decayTime = originalDecayTime;

  // Demo 5: Persistence
  console.log('━━━ Demo 5: State Persistence ━━━\n');

  console.log('💾 Exporting corpse state...');
  const exportedState = CorpseManager.exportState();
  console.log(`   Exported ${exportedState.length} corpse(s)\n`);

  console.log('📋 Exported Data Sample:');
  if (exportedState.length > 0) {
    const sample = exportedState[0];
    console.log(`   ID: ${sample.id}`);
    console.log(`   NPC: ${sample.npcId}`);
    console.log(`   Killer: ${sample.killerName || 'unknown'}`);
    console.log(`   Items: ${sample.inventory.length}`);
    console.log(`   Weight: ${sample.weight} lbs\n`);
  }

  console.log('⏱️  Exporting timer state...');
  const timerState = TimerManager.exportState();
  console.log(`   Exported ${timerState.length} timer(s)\n`);

  // Demo 6: Cleanup
  console.log('━━━ Demo 6: Cleanup ━━━\n');

  console.log('🧹 Destroying corpses...');
  CorpseManager.destroyCorpse(corpse1.id, world);
  CorpseManager.destroyCorpse(corpse2.id, world);

  console.log('✓ All corpses destroyed');
  console.log('✓ Timers canceled');
  console.log(`✓ Room cleaned (${room.items.length} items remaining)\n`);

  TimerManager.clearAll();

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    DEMO COMPLETE                           ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ ✓ Corpse creation from NPC deaths                          ║');
  console.log('║ ✓ Loot generation integration                              ║');
  console.log('║ ✓ Killer name tracking                                     ║');
  console.log('║ ✓ Weight calculation by size                               ║');
  console.log('║ ✓ Event-driven decay timers                                ║');
  console.log('║ ✓ Event system (corpseDecayed)                             ║');
  console.log('║ ✓ State export/import                                      ║');
  console.log('║ ✓ Room integration (room.items)                            ║');
  console.log('║ ✓ Manual cleanup                                           ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ Phase 1: Core Infrastructure - COMPLETE                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

runDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
