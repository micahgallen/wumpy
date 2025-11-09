/**
 * Manual Combat-Corpse Integration Test Script
 *
 * This script provides in-game test scenarios for Phase 2 combat corpse integration.
 *
 * Usage: Run this from the MUD as an admin to verify corpse creation works correctly
 *
 * Test Scenarios:
 * 1. Kill an NPC and verify corpse appears
 * 2. Check corpse description includes killer name
 * 3. Examine corpse loot
 * 4. Wait for corpse decay
 * 5. Verify NPC respawns after corpse decay
 */

const colors = require('../src/colors');
const CorpseManager = require('../src/systems/corpses/CorpseManager');
const TimerManager = require('../src/systems/corpses/TimerManager');

module.exports = {
  name: 'test-combat-corpse',
  description: 'Test combat corpse integration',

  /**
   * Run manual tests for combat corpse integration
   * @param {Object} player - Player running the command
   * @param {Object} world - World instance
   */
  execute(player, args, world) {
    const command = args[0] || 'help';

    switch (command) {
      case 'help':
        return this.showHelp(player);

      case 'status':
        return this.showStatus(player, world);

      case 'list':
        return this.listCorpses(player, world);

      case 'debug':
        return this.showDebugInfo(player);

      case 'decay':
        return this.testRapidDecay(player, args[1], world);

      default:
        player.send(colors.error(`Unknown subcommand: ${command}`));
        return this.showHelp(player);
    }
  },

  showHelp(player) {
    player.send(colors.combat('\n=== Combat-Corpse Integration Test Commands ===\n'));
    player.send(colors.info('Usage: test-combat-corpse <subcommand>\n'));
    player.send(colors.hint('Subcommands:'));
    player.send(colors.hint('  help          - Show this help'));
    player.send(colors.hint('  status        - Show current room corpse status'));
    player.send(colors.hint('  list          - List all active corpses in world'));
    player.send(colors.hint('  debug         - Show CorpseManager debug info'));
    player.send(colors.hint('  decay <id>    - Trigger rapid decay for testing\n'));

    player.send(colors.combat('Manual Test Steps:\n'));
    player.send(colors.hint('1. Go to a room with an NPC'));
    player.send(colors.hint('2. Attack and kill the NPC'));
    player.send(colors.hint('3. Use "look" to see the corpse'));
    player.send(colors.hint('4. Use "examine corpse" to see killer name'));
    player.send(colors.hint('5. Use "test-combat-corpse status" to check timer'));
    player.send(colors.hint('6. Wait 5 minutes or use "test-combat-corpse decay <id>"'));
    player.send(colors.hint('7. Verify corpse disappears and NPC respawns\n'));
  },

  showStatus(player, world) {
    const room = world.getRoom(player.currentRoom);
    if (!room) {
      return player.send(colors.error('Error: Current room not found'));
    }

    player.send(colors.combat('\n=== Current Room Corpse Status ===\n'));
    player.send(colors.info(`Room: ${room.name} (${room.id})\n`));

    // Find corpses in room
    const corpses = (room.items || []).filter(item => item.containerType === 'npc_corpse');

    if (corpses.length === 0) {
      player.send(colors.hint('No corpses in this room.\n'));
      player.send(colors.hint('Kill an NPC to create a corpse!\n'));
    } else {
      player.send(colors.success(`Found ${corpses.length} corpse(s):\n`));

      for (const corpse of corpses) {
        const timerId = `corpse_decay_${corpse.id}`;
        const remainingTime = TimerManager.getRemainingTime(timerId);
        const remainingSec = remainingTime ? Math.floor(remainingTime / 1000) : 0;

        player.send(colors.item(`  ${corpse.name}`));
        player.send(colors.hint(`    - ID: ${corpse.id}`));
        player.send(colors.hint(`    - NPC: ${corpse.npcId}`));
        player.send(colors.hint(`    - Killed by: ${corpse.killerName}`));
        player.send(colors.hint(`    - Weight: ${corpse.weight} lbs`));
        player.send(colors.hint(`    - Loot: ${corpse.inventory.length} items`));
        player.send(colors.hint(`    - Decay in: ${remainingSec}s`));
        player.send('');
      }
    }

    // Show NPCs in room
    if (room.npcs && room.npcs.length > 0) {
      player.send(colors.info(`NPCs in room: ${room.npcs.length}\n`));
      for (const npcId of room.npcs) {
        const npc = world.npcs[npcId];
        if (npc) {
          player.send(colors.hint(`  - ${npc.name} (${npcId})`));
        }
      }
      player.send('');
    }
  },

  listCorpses(player, world) {
    const info = CorpseManager.getDebugInfo();

    player.send(colors.combat('\n=== All Active Corpses in World ===\n'));

    if (info.activeCorpses === 0) {
      player.send(colors.hint('No active corpses in the world.\n'));
      return;
    }

    player.send(colors.success(`Total active corpses: ${info.activeCorpses}\n`));

    for (const corpse of info.corpses) {
      const room = world.getRoom(corpse.roomId);
      const roomName = room ? room.name : 'Unknown Room';

      player.send(colors.item(`${corpse.id}`));
      player.send(colors.hint(`  - NPC: ${corpse.npcId}`));
      player.send(colors.hint(`  - Room: ${roomName} (${corpse.roomId})`));
      player.send(colors.hint(`  - Killed by: ${corpse.killerName}`));
      player.send(colors.hint(`  - Items: ${corpse.itemCount}`));
      player.send(colors.hint(`  - Weight: ${corpse.weight} lbs`));
      player.send(colors.hint(`  - Decay in: ${corpse.remainingSec}s`));
      player.send('');
    }
  },

  showDebugInfo(player) {
    const corpseInfo = CorpseManager.getDebugInfo();
    const timerInfo = TimerManager.getDebugInfo();

    player.send(colors.combat('\n=== CorpseManager Debug Info ===\n'));

    player.send(colors.info('Corpse System:'));
    player.send(colors.hint(`  - Active corpses: ${corpseInfo.activeCorpses}`));
    player.send(colors.hint(`  - Memory usage: ~${Math.round(corpseInfo.activeCorpses * 2)} KB`));
    player.send('');

    player.send(colors.info('Timer System:'));
    player.send(colors.hint(`  - Active timers: ${timerInfo.activeTimers}`));
    player.send(colors.hint(`  - Memory usage: ~${Math.round(timerInfo.activeTimers * 0.2)} KB`));
    player.send('');

    if (corpseInfo.activeCorpses > 0) {
      player.send(colors.info('Next to decay:'));
      const nextCorpse = corpseInfo.corpses[0]; // Already sorted by decay time
      player.send(colors.hint(`  - ${nextCorpse.id}`));
      player.send(colors.hint(`  - Decays in: ${nextCorpse.remainingSec}s`));
      player.send('');
    }

    player.send(colors.success('System Status: OPERATIONAL\n'));
  },

  testRapidDecay(player, corpseId, world) {
    if (!corpseId) {
      player.send(colors.error('Usage: test-combat-corpse decay <corpse_id>\n'));
      player.send(colors.hint('Use "test-combat-corpse list" to see corpse IDs\n'));
      return;
    }

    const corpse = CorpseManager.getCorpse(corpseId);
    if (!corpse) {
      player.send(colors.error(`Corpse not found: ${corpseId}\n`));
      return;
    }

    player.send(colors.combat(`\nTriggering rapid decay for: ${corpse.name}\n`));
    player.send(colors.hint('Original decay time: ' + Math.floor(TimerManager.getRemainingTime(`corpse_decay_${corpseId}`) / 1000) + 's'));
    player.send(colors.hint('New decay time: 5s\n'));

    // Cancel original timer
    const timerId = `corpse_decay_${corpseId}`;
    TimerManager.cancel(timerId);

    // Schedule rapid decay (5 seconds)
    TimerManager.schedule(
      timerId,
      5000,
      (data) => {
        CorpseManager.onCorpseDecay(data.corpseId, world);

        // Notify player
        if (player.currentRoom === corpse.spawnLocation) {
          player.send(colors.combat(`\n${corpse.name} has decayed into dust.\n`));
        }
      },
      {
        type: 'corpse_decay',
        corpseId: corpse.id,
        npcId: corpse.npcId,
        roomId: corpse.spawnLocation
      }
    );

    player.send(colors.success('Rapid decay scheduled! Corpse will decay in 5 seconds.\n'));
    player.send(colors.hint('Watch for the decay message...\n'));
  }
};
