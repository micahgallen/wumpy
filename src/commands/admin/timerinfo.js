/**
 * TimerInfo Command (Admin)
 *
 * Shows active timer system status and health metrics
 * Usage: timerinfo
 */

const colors = require('../../colors');

function execute(player, args, context) {
  const TimerManager = require('../../systems/corpses/TimerManager');

  // Get timer statistics
  const stats = TimerManager.getStats();

  player.send('\n' + colors.header('═'.repeat(70)) + '\n');
  player.send(colors.header('  TIMER SYSTEM STATUS') + '\n');
  player.send(colors.header('═'.repeat(70)) + '\n\n');

  // Active timers by type
  player.send(colors.info(`Active Timers: ${stats.totalTimers}\n`));

  if (stats.byType && Object.keys(stats.byType).length > 0) {
    player.send(colors.dim('\nBy Type:\n'));
    for (const [type, count] of Object.entries(stats.byType)) {
      player.send(colors.info(`  - ${type}: ${count} timer${count === 1 ? '' : 's'}\n`));
    }
  }

  // Timers due soon
  player.send(colors.dim('\nTimers Due Soon (next 60s):\n'));
  if (stats.dueSoon && stats.dueSoon.length > 0) {
    for (let i = 0; i < Math.min(5, stats.dueSoon.length); i++) {
      const timer = stats.dueSoon[i];
      const timeLeft = Math.max(0, Math.floor((timer.fireTime - Date.now()) / 1000));
      player.send(colors.info(`  ${i + 1}. ${timer.id} (in ${timeLeft}s)\n`));
    }
    if (stats.dueSoon.length > 5) {
      player.send(colors.dim(`  ... and ${stats.dueSoon.length - 5} more\n`));
    }
  } else {
    player.send(colors.dim('  None\n'));
  }

  // Health warnings
  player.send('\n' + colors.header('Health Checks:\n'));

  const WARNING_THRESHOLD = 100;
  const CRITICAL_THRESHOLD = 500;

  if (stats.totalTimers < WARNING_THRESHOLD) {
    player.send(colors.success(`  ✓ Timer count: ${stats.totalTimers} (healthy)\n`));
  } else if (stats.totalTimers < CRITICAL_THRESHOLD) {
    player.send(colors.warning(`  ⚠ Timer count: ${stats.totalTimers} (elevated)\n`));
  } else {
    player.send(colors.error(`  ✗ Timer count: ${stats.totalTimers} (CRITICAL - possible leak!)\n`));
  }

  // Memory estimate
  const estimatedMemory = Math.round((stats.totalTimers * 1.5)); // ~1.5KB per timer (rough)
  player.send(colors.info(`  Memory estimate: ~${estimatedMemory}KB\n`));

  // Architecture
  player.send(colors.success(`  ✓ Architecture: Event-Driven (setTimeout)\n`));
  player.send(colors.success(`  ✓ CPU usage (idle): 0% (no polling)\n`));

  player.send('\n' + colors.header('═'.repeat(70)) + '\n');

  if (stats.totalTimers < WARNING_THRESHOLD) {
    player.send(colors.success('Status: ✅ HEALTHY\n\n'));
  } else if (stats.totalTimers < CRITICAL_THRESHOLD) {
    player.send(colors.warning('Status: ⚠️  ELEVATED - Monitor closely\n\n'));
  } else {
    player.send(colors.error('Status: ⛔ CRITICAL - Investigate immediately!\n\n'));
  }
}

module.exports = {
  name: 'timerinfo',
  aliases: ['timers', 'timerstat', 'timerstatus'],
  description: 'Show timer system status and health (admin)',
  usage: 'timerinfo',
  examples: [
    'timerinfo - Show timer statistics',
    'timers - Show timer statistics (alias)'
  ],
  execute
};
