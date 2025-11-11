/**
 * Goto (Admin Command)
 *
 * Instantly transports an admin to a player's current room.
 * Uses the same custom messages as the teleport command.
 *
 * Usage: goto <player_name>
 * Required role: Creator, Sheriff, or Admin
 */

const colors = require('../../colors');
const { Role, getRankValue } = require('../../admin/permissions');
const lookCommand = require('../core/look');

function guard(player) {
  const requiredRank = getRankValue(Role.CREATOR);
  const playerRank = getRankValue(player.role);

  if (playerRank >= requiredRank) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'You do not have permission to use this command.'
  };
}

function execute(player, args, context) {
  const { world, allPlayers } = context;

  if (args.length < 1) {
    player.send(colors.error('You must specify a player to go to.\n'));
    return;
  }

  const targetPlayerName = args[0].toLowerCase();

  let targetPlayer = null;
  for (const p of allPlayers) {
    if (p.username.toLowerCase() === targetPlayerName) {
      targetPlayer = p;
      break;
    }
  }

  if (!targetPlayer) {
    player.send(colors.error(`Player "${args[0]}" not found or is not online.\n`));
    return;
  }

  if (targetPlayer === player) {
    player.send(colors.error('You are already at your own location.\n'));
    return;
  }

  const targetRoom = world.getRoom(targetPlayer.currentRoom);
  if (!targetRoom) {
    // This should theoretically not happen if the player is in a valid room.
    player.send(colors.error('Could not find the room the target player is in.\n'));
    return;
  }

  if (player.currentRoom === targetRoom.id) {
    player.send(colors.error(`You are already in ${targetPlayer.getDisplayName()}'s location: ${targetRoom.name}.\n`));
    return;
  }

  const oldRoom = world.getRoom(player.currentRoom);

  const exitMessage = player.customExit || 'dissolves into a shower of sparkling particles.';
  const entranceMessage = player.customEnter ? `${player.getDisplayName()} ${player.customEnter}` : `A shower of sparkling particles coalesces into the form of ${player.getDisplayName()}.`;

  // Broadcast exit message to the old room
  if (oldRoom) {
    world.sendToRoom(oldRoom.id, `
${player.getDisplayName()} ${exitMessage}
`, [player.username], allPlayers);
  }

  // Move player
  player.currentRoom = targetRoom.id;

  // Broadcast entrance message to the new room
  world.sendToRoom(targetRoom.id, `
${entranceMessage}
`, [player.username, targetPlayer.username], allPlayers);
  
  // Also notify the target player privately
  targetPlayer.send(colors.cyan(`
${player.getDisplayName()} has teleported to your location.\n`));

  // Send confirmation to the admin
  player.send(colors.success(`You have been teleported to ${targetPlayer.getDisplayName()}'s location: ${targetRoom.name}.\n`));

  // Show the player the new room
  lookCommand.execute(player, [], context);
}

module.exports = {
  name: 'goto',
  aliases: [],
  description: 'Instantly transports you to a player\'s location (Admin).',
  usage: 'goto <player_name>',
  guard,
  execute
};
