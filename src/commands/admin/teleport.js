/**
 * Teleport (Admin Command)
 *
 * Instantly transports the player to a specified room by its path.
 * The path should be relative to the 'world' directory, e.g., 'sesame_street/rooms/oscar.js'.
 * Uses custom messages if they are set via `set telenter` and `set telexit`.
 *
 * Usage: teleport <room_path>
 * Required role: Creator, Sheriff, or Admin
 */

const path = require('path');
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
    player.send(colors.error('You must specify a room path.\n'));
    return;
  }

  const targetPath = args.join(' ');
  const normalizedTargetPath = path.normalize(targetPath).replace(/\\/g, '/');

  let targetRoom = null;
  for (const roomId in world.rooms) {
    const room = world.rooms[roomId];
    if (room.path && room.path === normalizedTargetPath) {
      targetRoom = room;
      break;
    }
  }

  if (!targetRoom) {
    player.send(colors.error(`Room with path "${targetPath}" not found.\n`));
    return;
  }

  const oldRoom = world.getRoom(player.currentRoom);

  const exitMessage = player.customExit || 'dissolves into a shower of sparkling particles.';
  const entranceMessage = player.customEnter ? `${player.getDisplayName()} ${player.customEnter}` : `A shower of sparkling particles coalesces into the form of ${player.getDisplayName()}.`;

  // Broadcast exit message to the old room
  if (oldRoom) {
    world.sendToRoom(oldRoom.id, `\n${player.getDisplayName()} ${exitMessage}\n`, [player.username], allPlayers);
  }

  // Move player
  player.currentRoom = targetRoom.id;

  // Broadcast entrance message to the new room
  world.sendToRoom(targetRoom.id, `\n${entranceMessage}\n`, [player.username], allPlayers);

  // Send confirmation to the player
  player.send(colors.success(`You have been teleported to ${targetRoom.name}.\n`));

  // Show the player the new room
  lookCommand.execute(player, [], context);
}

module.exports = {
  name: 'teleport',
  aliases: ['tele'],
  description: 'Instantly transports you to a specified room by its path (Admin).',
  usage: 'teleport <room_path>',
  guard,
  execute
};
