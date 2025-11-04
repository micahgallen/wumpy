/**
 * Admin Commands Implementation
 * All admin command handlers with permission checks, validation, and audit logging
 */

const colors = require('../colors');
const { Command, hasPermission, Role, isValidRole } = require('./permissions');
const { writeAuditLog } = require('./audit');
const { getXPForLevel, levelUp } = require('../progression/xpSystem');
const { getProficiencyBonus, getModifier } = require('../progression/statProgression');

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
 * Find an NPC by name or ID, prioritizing the current room
 * @param {string} target - Target name or ID
 * @param {Object} player - Player object (for current room)
 * @param {Object} world - World object
 * @returns {Object|null} NPC object or null
 */
function findNPCInRoom(target, player, world) {
  const targetLower = target.toLowerCase();
  const currentRoom = world.getRoom(player.currentRoom);

  // First, search NPCs in current room
  if (currentRoom && currentRoom.npcs) {
    for (const npcId of currentRoom.npcs) {
      const npc = world.getNPC(npcId);
      if (npc) {
        // Check if NPC ID matches
        if (npcId.toLowerCase() === targetLower) {
          return npc;
        }
        // Check if any keyword matches
        if (npc.keywords && npc.keywords.some(kw => kw.toLowerCase() === targetLower)) {
          return npc;
        }
      }
    }
  }

  // If not found in room, fall back to global search
  return findNPC(target, world);
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
  const levelsToApply = newLevel - oldLevel;

  // Update online player if present
  if (targetPlayer) {
    if (levelsToApply > 0) {
      // Leveling up: call levelUp() multiple times to apply all stat gains
      for (let i = 0; i < levelsToApply; i++) {
        levelUp(targetPlayer, playerDB);
      }

      targetPlayer.send('\n' + colors.success(`\n=== Your level has been increased ===\n`));
      targetPlayer.send(colors.success(`Old level: ${oldLevel}\n`));
      targetPlayer.send(colors.success(`New level: ${newLevel}\n`));
      targetPlayer.send(colors.success(`Applied ${levelsToApply} level-up(s) with full stat gains!\n`));
      targetPlayer.send(colors.success(`HP: ${targetPlayer.hp}/${targetPlayer.maxHp}\n`));
      targetPlayer.send(colors.success(`Proficiency: +${targetPlayer.proficiency}\n`));
      targetPlayer.send(colors.success(`Changed by: ${player.username}\n\n`));
    } else if (levelsToApply < 0) {
      // Leveling down: recalculate stats based on new level
      // Note: This is complex because we need to reverse stat gains
      // For admin commands, we'll recalculate HP and proficiency

      targetPlayer.level = newLevel;
      targetPlayer.xp = getXPForLevel(newLevel);

      // Recalculate max HP based on new level
      // Base HP (15) + CON modifier + (level-1) * (4 + CON modifier)
      const conMod = getModifier(targetPlayer.constitution);
      const baseHp = 15 + conMod;
      const levelHp = (newLevel - 1) * Math.max(1, 4 + conMod);
      targetPlayer.maxHp = baseHp + levelHp;
      targetPlayer.hp = Math.min(targetPlayer.hp, targetPlayer.maxHp);

      // Update proficiency
      targetPlayer.proficiency = getProficiencyBonus(newLevel);

      // Update database
      playerDB.updatePlayerLevel(targetPlayer.username, newLevel, targetPlayer.maxHp, targetPlayer.hp);
      playerDB.updatePlayerXP(targetPlayer.username, targetPlayer.xp);

      targetPlayer.send('\n' + colors.warning(`\n=== Your level has been reduced ===\n`));
      targetPlayer.send(colors.warning(`Old level: ${oldLevel}\n`));
      targetPlayer.send(colors.warning(`New level: ${newLevel}\n`));
      targetPlayer.send(colors.warning(`HP recalculated: ${targetPlayer.hp}/${targetPlayer.maxHp}\n`));
      targetPlayer.send(colors.warning(`Proficiency: +${targetPlayer.proficiency}\n`));
      targetPlayer.send(colors.warning(`Note: Stat gains (STR/DEX/CON) not reversed - manual adjustment needed\n`));
      targetPlayer.send(colors.warning(`Changed by: ${player.username}\n\n`));
    }
  } else {
    // Offline player: update database with new level and XP
    // They will get stat recalculation on next login if there's a migration system
    const newXP = getXPForLevel(newLevel);
    playerDB.updatePlayerLevel(targetData.username, newLevel, targetData.maxHp, targetData.hp);
    playerDB.updatePlayerXP(targetData.username, newXP);
  }

  player.send('\n' + colors.success(`Changed ${targetData.username}'s level from ${oldLevel} to ${newLevel}\n`));
  if (levelsToApply > 0 && targetPlayer) {
    player.send(colors.success(`Applied ${levelsToApply} level-up(s) with full stat gains\n`));
    player.send(colors.success(`New HP: ${targetPlayer.hp}/${targetPlayer.maxHp}, Proficiency: +${targetPlayer.proficiency}\n`));
  } else if (levelsToApply < 0 && targetPlayer) {
    player.send(colors.warning(`Reduced level by ${Math.abs(levelsToApply)} - HP and proficiency recalculated\n`));
  } else if (!targetPlayer) {
    player.send(colors.info(`Player is offline - level/XP updated in database\n`));
  }

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

  // Set XP to the minimum for the new level to avoid negative XP display
  const newXP = getXPForLevel(newLevel);

  // Update in database
  playerDB.updatePlayerLevel(targetData.username, newLevel, newMaxHp, newHp);
  playerDB.updatePlayerXP(targetData.username, newXP);

  // Update online player if present
  if (targetPlayer) {
    targetPlayer.level = newLevel;
    targetPlayer.maxHp = newMaxHp;
    targetPlayer.hp = newHp;
    targetPlayer.xp = newXP;
    targetPlayer.send('\n' + colors.warning(`\n=== Your level has been reduced ===\n`));
    targetPlayer.send(colors.warning(`Old level: ${oldLevel}\n`));
    targetPlayer.send(colors.warning(`New level: ${newLevel}\n`));
    targetPlayer.send(colors.warning(`HP: ${newHp}/${newMaxHp}\n`));
    targetPlayer.send(colors.warning(`XP set to: ${newXP}\n`));
    targetPlayer.send(colors.warning(`Reduced by: ${player.username}\n\n`));
  }

  player.send('\n' + colors.success(`Removed ${actualRemoved} level(s) from ${targetData.username}\n`));
  player.send(colors.success(`Level: ${oldLevel} -> ${newLevel}\n`));
  player.send(colors.success(`HP: ${oldMaxHp} -> ${newMaxHp}\n`));
  player.send(colors.success(`XP set to: ${newXP} (minimum for level ${newLevel})\n`));

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
 * Slay command - Instantly kill a player or NPC (prioritizes current room)
 * Usage: @slay <playerOrId|npcId>
 */
async function slayCommand(player, args, context) {
  const { adminService, allPlayers, world, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.SLAY)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.SLAY,
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
    player.send('\n' + colors.error('Usage: @slay <playerOrId|npcId>\n'));
    return;
  }

  const targetName = args[0];

  // Try to find player first
  const targetPlayer = findPlayer(targetName, allPlayers);
  if (targetPlayer) {
    targetPlayer.hp = 0;
    targetPlayer.isGhost = true;

    targetPlayer.send('\n' + colors.error(`\n=== You have been slain by admin power ===\n`));
    targetPlayer.send(colors.error(`Slain by: ${player.username}\n\n`));

    player.send('\n' + colors.success(`Slain ${targetPlayer.username}\n`));

    rateLimiter.recordCommand(issuer.id);

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.SLAY,
      args: [targetPlayer.username],
      result: 'success',
      reason: 'Player slain'
    });

    return;
  }

  // Try to find NPC (prioritizes current room)
  const targetNPC = findNPCInRoom(targetName, player, world);
  if (targetNPC) {
    targetNPC.hp = 0;

    player.send('\n' + colors.success(`Slain ${targetNPC.name}\n`));

    rateLimiter.recordCommand(issuer.id);

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.SLAY,
      args: [targetNPC.name],
      result: 'success',
      reason: 'NPC slain'
    });

    return;
  }

  player.send('\n' + colors.error(`Target "${targetName}" not found (neither player nor NPC).\n`));
  writeAuditLog({
    issuerID: issuer.id,
    issuerRank: issuer.role,
    command: Command.SLAY,
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
    { cmd: Command.SLAY, usage: '@slay <player|npc>', desc: 'Instantly kill target (room priority)', minRole: Role.CREATOR },
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
  slayCommand,
  spawnCommand,
  promoteCommand,
  demoteCommand,
  adminhelpCommand,
  reviveCommand,
  findPlayer,
  findNPC,
  findNPCInRoom
};
