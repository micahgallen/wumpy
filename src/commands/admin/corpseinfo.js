/**
 * CorpseInfo Command (Admin)
 *
 * Lists all active corpses in the world with details
 * Usage: corpseinfo
 */

const colors = require('../../colors');

function execute(player, args, context) {
  const { world } = context;
  const CorpseManager = require('../../systems/corpses/CorpseManager');

  const corpses = CorpseManager.getAllCorpses();
  const count = corpses.length;

  player.send('\n' + colors.header('═'.repeat(70)) + '\n');
  player.send(colors.header(`  ACTIVE CORPSES (${count})`) + '\n');
  player.send(colors.header('═'.repeat(70)) + '\n\n');

  if (count === 0) {
    player.send(colors.info('  No active corpses.\n\n'));
    return;
  }

  for (const corpse of corpses) {
    const now = Date.now();
    const age = Math.floor((now - corpse.createdAt) / 1000);
    const remaining = Math.max(0, Math.floor((corpse.decayTime - now) / 1000));

    const ageStr = formatTime(age);
    const remainingStr = formatTime(remaining);

    // Get room name
    const room = world.getRoom(corpse.spawnLocation);
    const roomName = room ? room.name : corpse.spawnLocation;

    // Count items and currency
    const itemCount = corpse.inventory ? corpse.inventory.length : 0;
    const currencyItems = corpse.inventory?.filter(item =>
      item.definitionId && item.definitionId.includes('_coin')
    ) || [];
    const hasCurrency = currencyItems.length > 0;

    player.send(colors.warning(`ID: ${corpse.id}\n`));
    player.send(colors.info(`  NPC: ${corpse.npcType} (${corpse.npcId})\n`));
    player.send(colors.info(`  Room: ${corpse.spawnLocation} (${roomName})\n`));
    player.send(colors.info(`  Created: ${ageStr} ago\n`));
    player.send(colors.info(`  Decays in: ${remainingStr}\n`));
    player.send(colors.info(`  Items: ${itemCount}`));
    if (hasCurrency) {
      player.send(colors.success(` (includes currency)`));
    }
    player.send('\n');
    if (corpse.killerName) {
      player.send(colors.dim(`  Killed by: ${corpse.killerName}\n`));
    }
    player.send('\n');
  }

  player.send(colors.header('═'.repeat(70)) + '\n');
  player.send(colors.info(`Total: ${count} active corpse${count === 1 ? '' : 's'}\n`));

  // Calculate total memory (rough estimate)
  const avgCorpseSize = 100; // KB per corpse (rough estimate)
  const totalMemory = count * avgCorpseSize;
  player.send(colors.dim(`Memory: ~${totalMemory}KB\n\n`));
}

/**
 * Format seconds into human-readable time
 * @param {number} seconds - Seconds to format
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
}

module.exports = {
  name: 'corpseinfo',
  aliases: ['corpses', 'listcorpses'],
  description: 'List all active corpses with details (admin)',
  usage: 'corpseinfo',
  examples: [
    'corpseinfo - Show all corpses',
    'corpses - Show all corpses (alias)'
  ],
  execute
};
