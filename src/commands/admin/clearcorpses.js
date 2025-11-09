/**
 * ClearCorpses Command (Admin)
 *
 * Manually decay all active corpses and trigger respawns
 * Use for cleanup or recovering from timer bugs
 * Usage: clearcorpses [confirm]
 */

const colors = require('../../colors');
const logger = require('../../logger');

function execute(player, args, context) {
  const { world } = context;
  const CorpseManager = require('../../systems/corpses/CorpseManager');

  const corpses = CorpseManager.getAllCorpses();
  const count = corpses.length;

  if (count === 0) {
    player.send('\n' + colors.info('No active corpses to clear.\n'));
    return;
  }

  // Require confirmation
  if (args.length === 0 || args[0].toLowerCase() !== 'confirm') {
    player.send('\n' + colors.warning(`Found ${count} active corpse${count === 1 ? '' : 's'}.\n`));
    player.send(colors.info('This will:\n'));
    player.send(colors.info(`  - Decay all ${count} corpse${count === 1 ? '' : 's'}\n`));
    player.send(colors.info(`  - Trigger ${count} respawn event${count === 1 ? '' : 's'}\n`));
    player.send(colors.info('  - Cannot be undone\n\n'));
    player.send(colors.warning('Type: clearcorpses confirm\n'));
    return;
  }

  // Clear all corpses
  player.send('\n' + colors.info(`Clearing ${count} corpse${count === 1 ? '' : 's'}...\n\n`));

  let cleared = 0;
  let failed = 0;

  for (const corpse of corpses) {
    try {
      const success = CorpseManager.destroyCorpse(corpse.id, world);

      if (success) {
        player.send(colors.success(`  ✓ Cleared: ${corpse.name} (${corpse.spawnLocation})\n`));
        cleared++;
      } else {
        player.send(colors.error(`  ✗ Failed: ${corpse.name} (not found)\n`));
        failed++;
      }
    } catch (error) {
      player.send(colors.error(`  ✗ Error: ${corpse.name} - ${error.message}\n`));
      failed++;
      logger.error(`Failed to clear corpse ${corpse.id}:`, error);
    }
  }

  player.send('\n');
  player.send(colors.header('═'.repeat(50)) + '\n');
  player.send(colors.success(`  Cleared: ${cleared}\n`));
  if (failed > 0) {
    player.send(colors.error(`  Failed: ${failed}\n`));
  }
  player.send(colors.info(`  Respawn events triggered: ${cleared}\n`));
  player.send(colors.header('═'.repeat(50)) + '\n\n');

  logger.log(`Admin ${player.username} cleared ${cleared} corpses (${failed} failed)`);
}

module.exports = {
  name: 'clearcorpses',
  aliases: ['clearall', 'purgecorpses'],
  description: 'Manually decay all corpses and trigger respawns (admin)',
  usage: 'clearcorpses [confirm]',
  examples: [
    'clearcorpses - Show confirmation prompt',
    'clearcorpses confirm - Execute corpse cleanup',
    'clearall confirm - Execute using alias'
  ],
  execute
};
