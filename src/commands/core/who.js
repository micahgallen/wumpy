/**
 * Who command - List online players
 */

const colors = require('../../colors');
const { Role } = require('../../admin/permissions');

/**
 * Execute who command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments (unused)
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { world, allPlayers, adminSystem } = context;
  const adminService = adminSystem?.adminService;

  if (!allPlayers || allPlayers.size === 0) {
    player.send('\n' + colors.info('No players are currently online.\n'));
    return;
  }

  let output = [];
  const totalWidth = 95;
  output.push(colors.info('Online Players:'));
  output.push(colors.line(totalWidth, '-'));
  output.push(
    colors.highlight(
      'Username'.padEnd(20) +
      'Role'.padEnd(12) +
      'Realm'.padEnd(25) +
      'Level'.padEnd(8) +
      'Status'.padEnd(12) +
      'Idle'.padEnd(10)
    )
  );
  output.push(colors.line(totalWidth, '-'));

  for (const p of allPlayers) {
    if (p.username && p.state === 'playing') {
      const room = world.getRoom(p.currentRoom);
      const realm = room ? room.realm : 'Unknown';
      const idleTime = Math.floor((Date.now() - p.lastActivity) / 1000);
      const idleString = idleTime > 60 ? `${Math.floor(idleTime / 60)}m` : `${idleTime}s`;

      // Get player's role
      const playerRole = adminService ? adminService.getRole(p.username) : Role.PLAYER;
      const roleDisplay = playerRole !== Role.PLAYER ? colors.adminRole(playerRole) : '---';

      // Build status string with ghost indicator
      const statusText = p.isGhost ? 'Ghost' : 'Active';

      // Pad the visible text before colorizing to maintain alignment
      const paddedStatus = statusText.padEnd(12);
      const coloredStatus = p.isGhost ?
        colors.hint(paddedStatus) :
        colors.colorize(paddedStatus, colors.MUD_COLORS.SUCCESS);

      const rolePadding = 12 - colors.visibleLength(roleDisplay);
      const paddedRole = roleDisplay + ' '.repeat(Math.max(0, rolePadding));

      output.push(
        colors.playerName(p.username.padEnd(20)) +
        paddedRole +
        colors.colorize(realm.padEnd(25), colors.MUD_COLORS.ROOM_NAME) +
        colors.colorize((p.level || 1).toString().padEnd(8), colors.MUD_COLORS.INFO) +
        coloredStatus +
        colors.hint(idleString.padEnd(10))
      );
    }
  }

  output.push(colors.line(totalWidth, '-'));
  output.push(colors.hint(`Total: ${allPlayers.size} player(s)`));

  player.send('\n' + output.join('\n') + '\n');
}

module.exports = {
  name: 'who',
  aliases: [],
  execute,
  help: {
    description: 'List all players currently online',
    usage: 'who',
    examples: ['who']
  }
};
