/**
 * Admin Commands Implementation
 * All admin command handlers with permission checks, validation, and audit logging
 */

const colors = require('../colors');
const { Command, hasPermission, Role, isValidRole } = require('./permissions');
const { writeAuditLog } = require('./audit');

/**
 * Find a player by name or ID in the current game
 * @param {string} target - Target name or ID
 * @param {Set} allPlayers - Set of connected players
 * @param {Object} world - World object (for NPC lookup)
 * @returns {Object|null} Player object or null
 */
function findPlayer(target, allPlayers, world = null) {
  const targetLower = target.toLowerCase();

  // Search online players
  for (const player of allPlayers) {
    if (player.username && player.username.toLowerCase() === targetLower) {
      return player;
    }
  }

  return null;
}

/**
 * Find an NPC by name or ID in the world
 * @param {string} target - Target name or ID
 * @param {Object} world - World object
 * @returns {Object|null} NPC object or null
 */
function findNPC(target, world) {
  const targetLower = target.toLowerCase();

  // Try direct NPC ID lookup
  const npc = world.getNPC(target);
  if (npc) return npc;

  // Search by keywords
  const allNPCs = world.npcs || {};
  for (const [npcId, npc] of Object.entries(allNPCs)) {
    if (npc.keywords && npc.keywords.some(kw => kw.toLowerCase() === targetLower)) {
      return npc;
    }
  }

  return null;
}

/**
 * Parse duration argument (e.g., "24h", "7d", "30m")
 * @param {string} arg - Duration argument
 * @returns {number} Duration in hours
 */
function parseDuration(arg) {
  if (!arg) return 0;

  const match = arg.match(/^(\d+)([hdm])?$/);
  if (!match) return parseInt(arg) || 0;

  const value = parseInt(match[1]);
  const unit = match[2] || 'h';

  switch (unit) {
    case 'm':
      return value / 60;
    case 'h':
      return value;
    case 'd':
      return value * 24;
    default:
      return value;
  }
}

/**
 * Kick command - Disconnect a player
 * Usage: @kick <playerOrId> [reason]
 */
async function kickCommand(player, args, context) {
  const { adminService, allPlayers, rateLimiter } = context;

  // Permission check
  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.KICK)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.KICK,
      args: args,
      result: 'denied',
      reason: 'Insufficient permissions'
    });
    return;
  }

  // Rate limit check
  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  // Validate args
  if (args.length === 0) {
    player.send('\n' + colors.error('Usage: @kick <playerOrId> [reason]\n'));
    return;
  }

  const targetName = args[0];
  const reason = args.slice(1).join(' ') || 'No reason provided';

  // Find target
  const target = findPlayer(targetName, allPlayers);
  if (!target || !target.username) {
    player.send('\n' + colors.error(`Player "${targetName}" not found or not online.\n`));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.KICK,
      args: args,
      result: 'failed',
      reason: 'Target not found'
    });
    return;
  }

  // Cannot kick self
  if (target.username.toLowerCase() === issuer.id) {
    player.send('\n' + colors.error('You cannot kick yourself.\n'));
    return;
  }

  // Execute kick
  target.send('\n' + colors.error(`\n=== You have been kicked ===\n`));
  target.send(colors.error(`Reason: ${reason}\n`));
  target.send(colors.error(`Kicked by: ${player.username}\n\n`));
  target.socket.end();

  player.send('\n' + colors.success(`Kicked ${target.username}. Reason: ${reason}\n`));

  rateLimiter.recordCommand(issuer.id);

  writeAuditLog({
    issuerID: issuer.id,
    issuerRank: issuer.role,
    command: Command.KICK,
    args: [target.username],
    result: 'success',
    reason: reason
  });
}

/**
 * Ban command - Ban a player or IP
 * Usage: @ban <playerOrId|ip> [hours] [reason]
 */
async function banCommand(player, args, context) {
  const { adminService, allPlayers, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.BAN)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.BAN,
      args: args,
      result: 'denied',
      reason: 'Insufficient permissions'
    });
    return;
  }

  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  if (args.length === 0) {
    player.send('\n' + colors.error('Usage: @ban <playerOrId|ip> [hours] [reason]\n'));
    return;
  }

  const targetArg = args[0];
  let hours = 0;
  let reason = 'No reason provided';

  // Parse optional hours and reason
  if (args.length > 1) {
    const hoursArg = parseDuration(args[1]);
    if (hoursArg > 0) {
      hours = hoursArg;
      reason = args.slice(2).join(' ') || reason;
    } else {
      reason = args.slice(1).join(' ');
    }
  }

  // Determine if target is IP or player
  const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(targetArg);
  let targetPlayer = null;
  let targetInfo = {};

  if (isIP) {
    targetInfo = { ip: targetArg, name: targetArg };
  } else {
    targetPlayer = findPlayer(targetArg, allPlayers);
    const targetID = targetArg.toLowerCase();
    targetInfo = {
      playerID: targetID,
      name: targetPlayer?.username || targetArg,
      ip: targetPlayer?.socket?.remoteAddress || null
    };
  }

  // Execute ban
  const result = await adminService.ban(targetInfo, issuer, hours, reason);

  if (result.success) {
    player.send('\n' + colors.success(result.message + '\n'));

    // Disconnect player if online
    if (targetPlayer) {
      targetPlayer.send('\n' + colors.error(`\n=== You have been banned ===\n`));
      targetPlayer.send(colors.error(`Reason: ${reason}\n`));
      targetPlayer.send(colors.error(`Duration: ${hours > 0 ? hours + ' hours' : 'Permanent'}\n\n`));
      targetPlayer.socket.end();
    }
  } else {
    player.send('\n' + colors.error(result.message + '\n'));
  }

  rateLimiter.recordCommand(issuer.id);
}

/**
 * Unban command - Remove a ban
 * Usage: @unban <playerOrId|ip>
 */
async function unbanCommand(player, args, context) {
  const { adminService, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.UNBAN)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.UNBAN,
      args: args,
      result: 'denied',
      reason: 'Insufficient permissions'
    });
    return;
  }

  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  if (args.length === 0) {
    player.send('\n' + colors.error('Usage: @unban <playerOrId|ip>\n'));
    return;
  }

  const target = args[0];
  const result = await adminService.unban(target, issuer);

  if (result.success) {
    player.send('\n' + colors.success(result.message + '\n'));
  } else {
    player.send('\n' + colors.error(result.message + '\n'));
  }

  rateLimiter.recordCommand(issuer.id);
}

/**
 * Addlevel command - Add levels to a player
 * Usage: @addlevel <playerOrId> <delta>
 */
async function addlevelCommand(player, args, context) {
  const { adminService, allPlayers, playerDB, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.ADDLEVEL)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.ADDLEVEL,
      args: args,
      result: 'denied',
      reason: 'Insufficient permissions'
    });
    return;
  }

  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  if (args.length < 2) {
    player.send('\n' + colors.error('Usage: @addlevel <playerOrId> <delta>\n'));
    return;
  }

  const targetName = args[0];
  const delta = parseInt(args[1]);

  if (isNaN(delta) || delta === 0) {
    player.send('\n' + colors.error('Delta must be a non-zero number.\n'));
    return;
  }

  // Find target (must be in database, but doesn't need to be online)
  const targetPlayer = findPlayer(targetName, allPlayers);
  const targetData = playerDB.getPlayer(targetName);

  if (!targetData) {
    player.send('\n' + colors.error(`Player "${targetName}" not found in database.\n`));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.ADDLEVEL,
      args: args,
      result: 'failed',
      reason: 'Target not found in database'
    });
    return;
  }

  const oldLevel = targetData.level || 1;
  const newLevel = Math.max(1, oldLevel + delta);

  // Update in database
  playerDB.updatePlayerLevel(targetData.username, newLevel, targetData.maxHp, targetData.hp);

  // Update online player if present
  if (targetPlayer) {
    targetPlayer.level = newLevel;
    targetPlayer.send('\n' + colors.success(`\n=== Your level has been changed ===\n`));
    targetPlayer.send(colors.success(`Old level: ${oldLevel}\n`));
    targetPlayer.send(colors.success(`New level: ${newLevel}\n`));
    targetPlayer.send(colors.success(`Changed by: ${player.username}\n\n`));
  }

  player.send('\n' + colors.success(`Changed ${targetData.username}'s level from ${oldLevel} to ${newLevel}\n`));

  rateLimiter.recordCommand(issuer.id);

  writeAuditLog({
    issuerID: issuer.id,
    issuerRank: issuer.role,
    command: Command.ADDLEVEL,
    args: [targetData.username, delta],
    result: 'success',
    reason: `Level changed from ${oldLevel} to ${newLevel}`
  });
}

/**
 * Removelevel command - Remove levels from a player
 * Usage: @removelevel <playerOrId> <levels>
 */
async function removelevelCommand(player, args, context) {
  const { adminService, allPlayers, playerDB, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.REMOVELEVEL)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.REMOVELEVEL,
      args: args,
      result: 'denied',
      reason: 'Insufficient permissions'
    });
    return;
  }

  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  if (args.length < 2) {
    player.send('\n' + colors.error('Usage: @removelevel <playerOrId> <levels>\n'));
    return;
  }

  const targetName = args[0];
  const levels = parseInt(args[1]);

  if (isNaN(levels) || levels < 1) {
    player.send('\n' + colors.error('Levels must be a positive number.\n'));
    return;
  }

  // Find target (must be in database, but doesn't need to be online)
  const targetPlayer = findPlayer(targetName, allPlayers);
  const targetData = playerDB.getPlayer(targetName);

  if (!targetData) {
    player.send('\n' + colors.error(`Player "${targetName}" not found in database.\n`));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.REMOVELEVEL,
      args: args,
      result: 'failed',
      reason: 'Target not found in database'
    });
    return;
  }

  const oldLevel = targetData.level || 1;
  const newLevel = Math.max(1, oldLevel - levels);
  const actualRemoved = oldLevel - newLevel;

  if (actualRemoved === 0) {
    player.send('\n' + colors.error(`${targetData.username} is already at level 1.\n`));
    return;
  }

  // Calculate HP reduction (proportional to levels removed)
  // Using 10 HP per level as base (consistent with level-up system)
  const hpPerLevel = 10;
  const hpReduction = actualRemoved * hpPerLevel;
  const oldMaxHp = targetData.maxHp || 20;
  const newMaxHp = Math.max(20, oldMaxHp - hpReduction);
  const newHp = Math.min(targetData.hp || 20, newMaxHp);

  // Update in database
  playerDB.updatePlayerLevel(targetData.username, newLevel, newMaxHp, newHp);

  // Update online player if present
  if (targetPlayer) {
    targetPlayer.level = newLevel;
    targetPlayer.maxHp = newMaxHp;
    targetPlayer.hp = newHp;
    targetPlayer.send('\n' + colors.warning(`\n=== Your level has been reduced ===\n`));
    targetPlayer.send(colors.warning(`Old level: ${oldLevel}\n`));
    targetPlayer.send(colors.warning(`New level: ${newLevel}\n`));
    targetPlayer.send(colors.warning(`HP: ${newHp}/${newMaxHp}\n`));
    targetPlayer.send(colors.warning(`Reduced by: ${player.username}\n\n`));
  }

  player.send('\n' + colors.success(`Removed ${actualRemoved} level(s) from ${targetData.username}\n`));
  player.send(colors.success(`Level: ${oldLevel} -> ${newLevel}\n`));
  player.send(colors.success(`HP: ${oldMaxHp} -> ${newMaxHp}\n`));

  rateLimiter.recordCommand(issuer.id);

  writeAuditLog({
    issuerID: issuer.id,
    issuerRank: issuer.role,
    command: Command.REMOVELEVEL,
    args: [targetData.username, actualRemoved],
    result: 'success',
    reason: `Removed ${actualRemoved} level(s) from ${targetData.username} (${oldLevel} -> ${newLevel})`
  });
}

/**
 * Kill command - Instantly kill a player or NPC
 * Usage: @kill <playerOrId|npcId>
 */
async function killCommand(player, args, context) {
  const { adminService, allPlayers, world, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.KILL)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.KILL,
      args: args,
      result: 'denied',
      reason: 'Insufficient permissions'
    });
    return;
  }

  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  if (args.length === 0) {
    player.send('\n' + colors.error('Usage: @kill <playerOrId|npcId>\n'));
    return;
  }

  const targetName = args[0];

  // Try to find player first
  const targetPlayer = findPlayer(targetName, allPlayers);
  if (targetPlayer) {
    targetPlayer.hp = 0;
    targetPlayer.isGhost = true;

    targetPlayer.send('\n' + colors.error(`\n=== You have been slain by admin power ===\n`));
    targetPlayer.send(colors.error(`Killed by: ${player.username}\n\n`));

    player.send('\n' + colors.success(`Killed ${targetPlayer.username}\n`));

    rateLimiter.recordCommand(issuer.id);

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.KILL,
      args: [targetPlayer.username],
      result: 'success',
      reason: 'Player killed'
    });

    return;
  }

  // Try to find NPC
  const targetNPC = findNPC(targetName, world);
  if (targetNPC) {
    targetNPC.hp = 0;

    player.send('\n' + colors.success(`Killed ${targetNPC.name} (${targetName})\n`));

    rateLimiter.recordCommand(issuer.id);

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.KILL,
      args: [targetName],
      result: 'success',
      reason: 'NPC killed'
    });

    return;
  }

  player.send('\n' + colors.error(`Target "${targetName}" not found (neither player nor NPC).\n`));
  writeAuditLog({
    issuerID: issuer.id,
    issuerRank: issuer.role,
    command: Command.KILL,
    args: args,
    result: 'failed',
    reason: 'Target not found'
  });
}

/**
 * Spawn command - Spawn an item in player's inventory
 * Usage: @spawn <itemId> [qty]
 */
async function spawnCommand(player, args, context) {
  const { adminService, world, playerDB, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.SPAWN)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.SPAWN,
      args: args,
      result: 'denied',
      reason: 'Insufficient permissions'
    });
    return;
  }

  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  if (args.length === 0) {
    player.send('\n' + colors.error('Usage: @spawn <itemId> [qty]\n'));
    return;
  }

  const itemId = args[0];
  const qty = Math.max(1, parseInt(args[1]) || 1);

  // Check if item exists
  const item = world.getObject(itemId);
  if (!item) {
    player.send('\n' + colors.error(`Item "${itemId}" not found in world.\n`));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.SPAWN,
      args: args,
      result: 'failed',
      reason: 'Item not found'
    });
    return;
  }

  // Add to inventory
  for (let i = 0; i < qty; i++) {
    player.inventory.push(itemId);
  }

  playerDB.updatePlayerInventory(player.username, player.inventory);

  player.send('\n' + colors.success(`Spawned ${qty}x ${item.name} (${itemId})\n`));

  rateLimiter.recordCommand(issuer.id);

  writeAuditLog({
    issuerID: issuer.id,
    issuerRank: issuer.role,
    command: Command.SPAWN,
    args: [itemId, qty],
    result: 'success',
    reason: `Spawned ${qty}x ${itemId}`
  });
}

/**
 * Promote command - Promote a player to a higher role
 * Usage: @promote <playerOrId> <role>
 */
async function promoteCommand(player, args, context) {
  const { adminService, allPlayers, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.PROMOTE)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.PROMOTE,
      args: args,
      result: 'denied',
      reason: 'Insufficient permissions'
    });
    return;
  }

  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  if (args.length < 2) {
    player.send('\n' + colors.error('Usage: @promote <playerOrId> <role>\n'));
    player.send(colors.hint('Valid roles: Admin, Sheriff, Creator\n'));
    return;
  }

  const targetName = args[0];
  const newRole = args[1].charAt(0).toUpperCase() + args[1].slice(1).toLowerCase();

  if (!isValidRole(newRole)) {
    player.send('\n' + colors.error(`Invalid role: ${newRole}\n`));
    player.send(colors.hint('Valid roles: Admin, Sheriff, Creator\n'));
    return;
  }

  const targetID = targetName.toLowerCase();
  const targetPlayer = findPlayer(targetName, allPlayers);

  const target = {
    id: targetID,
    role: adminService.getRole(targetID),
    name: targetPlayer?.username || targetName
  };

  const result = await adminService.promote(targetID, newRole, issuer, target);

  if (result.success) {
    player.send('\n' + colors.success(result.message + '\n'));

    // Notify target if online
    if (targetPlayer) {
      targetPlayer.send('\n' + colors.success(`\n=== You have been promoted ===\n`));
      targetPlayer.send(colors.success(`New role: ${newRole}\n`));
      targetPlayer.send(colors.success(`Promoted by: ${player.username}\n\n`));
    }
  } else {
    player.send('\n' + colors.error(result.message + '\n'));
  }

  rateLimiter.recordCommand(issuer.id);
}

/**
 * Demote command - Demote a player to a lower role
 * Usage: @demote <playerOrId> [role]
 */
async function demoteCommand(player, args, context) {
  const { adminService, allPlayers, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.DEMOTE)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.DEMOTE,
      args: args,
      result: 'denied',
      reason: 'Insufficient permissions'
    });
    return;
  }

  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  if (args.length === 0) {
    player.send('\n' + colors.error('Usage: @demote <playerOrId> [role]\n'));
    player.send(colors.hint('If role is omitted, player will be demoted one step.\n'));
    return;
  }

  const targetName = args[0];
  let newRole = null;

  if (args.length > 1) {
    newRole = args[1].charAt(0).toUpperCase() + args[1].slice(1).toLowerCase();
    if (!isValidRole(newRole)) {
      player.send('\n' + colors.error(`Invalid role: ${newRole}\n`));
      return;
    }
  }

  const targetID = targetName.toLowerCase();
  const targetPlayer = findPlayer(targetName, allPlayers);

  const target = {
    id: targetID,
    role: adminService.getRole(targetID),
    name: targetPlayer?.username || targetName
  };

  const result = await adminService.demote(targetID, newRole, issuer, target);

  if (result.success) {
    player.send('\n' + colors.success(result.message + '\n'));

    // Notify target if online
    if (targetPlayer) {
      targetPlayer.send('\n' + colors.error(`\n=== You have been demoted ===\n`));
      targetPlayer.send(colors.error(`Demoted by: ${player.username}\n\n`));
    }
  } else {
    player.send('\n' + colors.error(result.message + '\n'));
  }

  rateLimiter.recordCommand(issuer.id);
}

/**
 * Adminhelp command - Show available admin commands
 * Usage: @adminhelp
 */
async function adminhelpCommand(player, args, context) {
  const { adminService } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  let output = [];
  output.push(colors.info('Admin Commands:'));
  output.push(colors.line(19, '-'));

  const commandList = [
    { cmd: Command.KICK, usage: '@kick <player> [reason]', desc: 'Disconnect a player', minRole: Role.SHERIFF },
    { cmd: Command.BAN, usage: '@ban <player|ip> [hours] [reason]', desc: 'Ban a player or IP', minRole: Role.SHERIFF },
    { cmd: Command.UNBAN, usage: '@unban <player|ip>', desc: 'Remove a ban', minRole: Role.SHERIFF },
    { cmd: Command.ADDLEVEL, usage: '@addlevel <player> <delta>', desc: 'Add levels to player', minRole: Role.CREATOR },
    { cmd: Command.REMOVELEVEL, usage: '@removelevel <player> <levels>', desc: 'Remove levels from player', minRole: Role.CREATOR },
    { cmd: Command.KILL, usage: '@kill <player|npc>', desc: 'Instantly kill target', minRole: Role.CREATOR },
    { cmd: Command.REVIVE, usage: '@revive <player>', desc: 'Revive a dead player', minRole: Role.CREATOR },
    { cmd: Command.SPAWN, usage: '@spawn <itemId> [qty]', desc: 'Spawn items', minRole: Role.CREATOR },
    { cmd: Command.PROMOTE, usage: '@promote <player> <role>', desc: 'Promote a player', minRole: Role.ADMIN },
    { cmd: Command.DEMOTE, usage: '@demote <player> [role]', desc: 'Demote a player', minRole: Role.ADMIN }
  ];

  for (const cmdInfo of commandList) {
    if (hasPermission(issuer, cmdInfo.cmd)) {
      output.push(colors.highlight(`  ${cmdInfo.usage}`));
      output.push(colors.dim(`    ${cmdInfo.desc} (${cmdInfo.minRole}+)`));
      output.push('');
    }
  }

  output.push(colors.hint(`Your current rank: ${issuer.role}`));

  player.send('\n' + output.join('\n') + '\n');
}

/**
 * Revive command - Revive a dead player (remove ghost status and restore HP)
 * Usage: @revive <playerOrId>
 */
async function reviveCommand(player, args, context) {
  const { adminService, allPlayers, playerDB, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.REVIVE)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.REVIVE,
      args: args,
      result: 'denied',
      reason: 'Insufficient permissions'
    });
    return;
  }

  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  if (args.length === 0) {
    player.send('\n' + colors.error('Usage: @revive <playerOrId>\n'));
    return;
  }

  const targetName = args[0];

  // Find target (must be in database, but doesn't need to be online)
  const targetPlayer = findPlayer(targetName, allPlayers);
  const targetData = playerDB.getPlayer(targetName);

  if (!targetData) {
    player.send('\n' + colors.error(`Player "${targetName}" not found in database.\n`));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.REVIVE,
      args: args,
      result: 'failed',
      reason: 'Target not found in database'
    });
    return;
  }

  // Revive the player
  const newHP = targetData.maxHp || 20;

  // Update in database
  playerDB.updatePlayerGhostStatus(targetData.username, false);
  playerDB.updatePlayerHP(targetData.username, newHP);

  // Update online player if present
  if (targetPlayer) {
    targetPlayer.isGhost = false;
    targetPlayer.hp = newHP;
    targetPlayer.send('\n' + colors.success(`\n=== You have been revived! ===\n`));
    targetPlayer.send(colors.success(`Your spirit returns to your body.\n`));
    targetPlayer.send(colors.success(`HP restored to: ${newHP}\n`));
    targetPlayer.send(colors.success(`Revived by: ${player.username}\n\n`));
  }

  player.send('\n' + colors.success(`Revived ${targetData.username} and restored HP to ${newHP}\n`));

  rateLimiter.recordCommand(issuer.id);

  writeAuditLog({
    issuerID: issuer.id,
    issuerRank: issuer.role,
    command: Command.REVIVE,
    args: [targetData.username],
    result: 'success',
    reason: `Revived player and restored HP to ${newHP}`
  });
}

module.exports = {
  kickCommand,
  banCommand,
  unbanCommand,
  addlevelCommand,
  removelevelCommand,
  killCommand,
  spawnCommand,
  promoteCommand,
  demoteCommand,
  adminhelpCommand,
  reviveCommand,
  findPlayer,
  findNPC
};
