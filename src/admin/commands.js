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

      // CRITICAL FIX: Ensure final state is saved after all level-ups
      // levelUp() calls updatePlayerLevel but not savePlayer (which saves stats)
      playerDB.savePlayer(targetPlayer);

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

      // Update database (use savePlayer for comprehensive save)
      playerDB.savePlayer(targetPlayer);

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

    // Create player corpse
    const CorpseManager = require('../systems/corpses/CorpseManager');
    const corpse = CorpseManager.createPlayerCorpse(
      targetPlayer,
      targetPlayer.currentRoom,
      player, // Admin who slayed them is the killer
      world
    );

    // Update player in database
    if (context.playerDB) {
      context.playerDB.updatePlayer(targetPlayer.username, {
        hp: 0,
        isGhost: true
      });
    }

    targetPlayer.send('\n' + colors.error(`\n=== You have been slain by admin power ===\n`));
    targetPlayer.send(colors.error(`Slain by: ${player.username}\n`));
    if (corpse) {
      targetPlayer.send(colors.info(`Your belongings have fallen into your corpse.\n`));
      targetPlayer.send(colors.hint(`Type 'look' to see it in the room.\n\n`));
    }

    player.send('\n' + colors.success(`Slain ${targetPlayer.username} (corpse created)\n`));

    // Notify room
    world.sendToRoom(
      targetPlayer.currentRoom,
      `\n${colors.error(`${targetPlayer.getDisplayName()} has been slain by divine wrath!`)}\n`,
      [player.username, targetPlayer.username],
      allPlayers
    );

    rateLimiter.recordCommand(issuer.id);

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.SLAY,
      args: [targetPlayer.username],
      result: 'success',
      reason: 'Player slain with corpse generation'
    });

    return;
  }

  // Try to find NPC (prioritizes current room)
  const targetNPC = findNPCInRoom(targetName, player, world);
  if (targetNPC) {
    const npcName = targetNPC.name;
    const npcId = targetNPC.id;

    // Get the room the NPC is in
    const npcRoom = world.getRoom(player.currentRoom);

    // Create corpse using CorpseManager
    const CorpseManager = require('../systems/corpses/CorpseManager');
    const corpse = CorpseManager.createNPCCorpse(targetNPC, player.currentRoom, player, world);

    // Remove NPC from room
    if (npcRoom && npcRoom.npcs) {
      const npcIndex = npcRoom.npcs.findIndex(id => id === npcId);
      if (npcIndex !== -1) {
        npcRoom.npcs.splice(npcIndex, 1);
      }
    }

    // Notify room
    world.sendToRoom(
      player.currentRoom,
      colors.combat(`${npcName} has been slain by divine wrath!`),
      [player.username],
      allPlayers
    );

    if (corpse) {
      world.sendToRoom(
        player.currentRoom,
        colors.combat(`A corpse falls to the ground.`),
        [player.username],
        allPlayers
      );
    }

    player.send('\n' + colors.success(`Slain ${npcName} (corpse created, will respawn)\n`));

    rateLimiter.recordCommand(issuer.id);

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.SLAY,
      args: [targetNPC.name],
      result: 'success',
      reason: 'NPC slain with corpse generation'
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
 * Spawn Full command - Spawn a complete test set of equipment for all slots
 * Usage: @spawn_full
 */
async function spawnFullCommand(player, args, context) {
  const { adminService, rateLimiter } = context;

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
      args: ['spawn_full'],
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

  const ItemRegistry = require('../items/ItemRegistry');
  const ItemFactory = require('../items/ItemFactory');
  const InventoryManager = require('../systems/inventory/InventoryManager');

  // Define test equipment set (one item for EVERY equipment slot)
  const testEquipmentSet = [
    // Weapons (for dual-wield testing)
    { id: 'test_iron_dagger', name: 'Iron Dagger (main hand)' },
    { id: 'test_steel_dagger', name: 'Steel Dagger (off hand)' },
    // Head slot (with variety)
    { id: 'test_iron_helmet', name: 'Iron Helmet (medium armor)' },
    { id: 'test_steel_greathelm', name: 'Steel Greathelm (heavy armor)' },
    // Armor - ALL slots
    { id: 'test_amulet_of_health', name: 'Amulet of Health (neck)' },
    { id: 'test_leather_pauldrons', name: 'Leather Pauldrons (shoulders)' },
    { id: 'test_chainmail_shirt', name: 'Chainmail Shirt (chest)' },
    { id: 'test_travelers_cloak', name: 'Traveler\'s Cloak (back)' },
    { id: 'test_iron_bracers', name: 'Iron Bracers (wrists)' },
    { id: 'test_leather_gloves', name: 'Leather Gloves (hands)' },
    { id: 'test_studded_belt', name: 'Studded Belt (waist)' },
    { id: 'test_iron_greaves', name: 'Iron Greaves (legs)' },
    { id: 'test_leather_boots', name: 'Leather Boots (feet)' },
    // Jewelry - ALL slots
    { id: 'test_silver_ring', name: 'Silver Ring (ring 1)' },
    { id: 'test_copper_ring', name: 'Copper Ring (ring 2)' },
    { id: 'test_lucky_charm', name: 'Lucky Charm (trinket 1)' },
    { id: 'test_pocket_watch', name: 'Pocket Watch (trinket 2)' },
    // Consumable for testing
    { id: 'health_potion', name: 'Health Potion' }
  ];

  player.send('\n' + colors.info('Spawning complete equipment test set...\n'));
  player.send(colors.line(50, '-') + '\n');

  let successCount = 0;
  let failCount = 0;
  const failed = [];

  for (const item of testEquipmentSet) {
    if (ItemRegistry.hasItem(item.id)) {
      try {
        const itemInstance = ItemFactory.createItem(item.id);
        const result = InventoryManager.addItem(player, itemInstance);

        if (result.success) {
          player.send(colors.success(`✓ ${item.name}\n`));
          successCount++;
        } else {
          player.send(colors.error(`✗ ${item.name}: ${result.reason}\n`));
          failCount++;
          failed.push({ item: item.name, reason: result.reason });
        }
      } catch (error) {
        player.send(colors.error(`✗ ${item.name}: ${error.message}\n`));
        failCount++;
        failed.push({ item: item.name, reason: error.message });
      }
    } else {
      player.send(colors.dim(`⊝ ${item.name}: Not found in registry\n`));
      failCount++;
      failed.push({ item: item.name, reason: 'Not found in registry' });
    }
  }

  player.send(colors.line(50, '-') + '\n');
  player.send(colors.info(`Spawned ${successCount} items successfully`));
  if (failCount > 0) {
    player.send(colors.warning(`, ${failCount} failed`));
  }
  player.send('\n\n');

  // Show inventory stats
  const stats = InventoryManager.getInventoryStats(player);
  player.send(colors.info(`Weight: ${stats.weight.current.toFixed(1)}/${stats.weight.max} lbs\n`));
  player.send(colors.info(`Slots: ${stats.slots.current}/${stats.slots.max}\n`));

  if (successCount > 0) {
    player.send('\n' + colors.hint('Test the equipment system with:\n'));
    player.send(colors.hint('  examine dagger           - See equipment stats\n'));
    player.send(colors.hint('  equip dagger main        - Equip in main hand\n'));
    player.send(colors.hint('  equip dagger offhand     - Equip in off-hand\n'));
    player.send(colors.hint('  equip helmet             - Auto-equip to head\n'));
    player.send(colors.hint('  equip ring               - Auto-equip to ring_1\n'));
    player.send(colors.hint('  equipment                - View all equipped items\n'));
    player.send(colors.hint('  unequip dagger           - Remove equipped item\n'));
  }

  rateLimiter.recordCommand(issuer.id);

  writeAuditLog({
    issuerID: issuer.id,
    issuerRank: issuer.role,
    command: Command.SPAWN,
    args: ['spawn_full'],
    result: 'success',
    reason: `Spawned ${successCount}/${testEquipmentSet.length} test items`
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
    player.send('\nAvailable items:\n');

    const ItemRegistry = require('../items/ItemRegistry');
    const items = ItemRegistry.getAllItems();
    if (items.length > 0) {
      items.forEach(item => {
        player.send(`  ${colors.info(item.id)} - ${item.name} (${item.rarity})\n`);
      });
    } else {
      player.send(colors.dim('  No items loaded. Check server startup logs.\n'));
    }
    return;
  }

  const itemId = args[0].toLowerCase();

  // Try new item system first
  const ItemRegistry = require('../items/ItemRegistry');
  const ItemFactory = require('../items/ItemFactory');
  const InventoryManager = require('../systems/inventory/InventoryManager');

  // Parse quantity (no artificial cap - will be broken into max-stack chunks)
  let qty = Math.max(1, parseInt(args[1]) || 1);

  if (ItemRegistry.hasItem(itemId)) {
    try {
      const def = ItemRegistry.getItem(itemId);

      // Determine max stack size for this item
      const maxStackSize = InventoryManager.getMaxStackSize(def);

      let remainingQty = qty;
      let totalAdded = 0;
      let stacksCreated = 0;
      let failureReason = null;

      // Add items in max-stack-sized chunks
      while (remainingQty > 0) {
        const chunkSize = Math.min(remainingQty, maxStackSize);
        const itemInstance = ItemFactory.createItem(itemId, { quantity: chunkSize });

        const result = InventoryManager.addItem(player, itemInstance);

        if (result.success) {
          totalAdded += chunkSize;
          remainingQty -= chunkSize;
          stacksCreated++;
        } else {
          // Failed to add - stop trying
          failureReason = result.reason;
          break;
        }
      }

      if (totalAdded > 0) {
        const stackMsg = stacksCreated > 1 ? ` (${stacksCreated} stacks)` : '';
        player.send('\n' + colors.success(`✓ Spawned ${totalAdded}x ${def.name}${stackMsg}\n`));

        if (remainingQty > 0) {
          player.send(colors.warning(`  Could not add remaining ${remainingQty}x: ${failureReason}\n`));
        }

        // Show inventory stats
        const stats = InventoryManager.getInventoryStats(player);
        player.send(`  Weight: ${stats.weight.current.toFixed(1)}/${stats.weight.max} lbs\n`);
        player.send(`  Slots: ${stats.slots.current}/${stats.slots.max}\n`);

        rateLimiter.recordCommand(issuer.id);

        writeAuditLog({
          issuerID: issuer.id,
          issuerRank: issuer.role,
          command: Command.SPAWN,
          args: [itemId, totalAdded],
          result: 'success',
          reason: `Spawned ${totalAdded}x ${itemId} in ${stacksCreated} stacks (requested ${qty})`
        });
      } else {
        player.send('\n' + colors.error(`Failed to spawn item: ${failureReason}\n`));
        writeAuditLog({
          issuerID: issuer.id,
          issuerRank: issuer.role,
          command: Command.SPAWN,
          args: args,
          result: 'failed',
          reason: failureReason
        });
      }
      return;
    } catch (error) {
      player.send('\n' + colors.error(`Error spawning item: ${error.message}\n`));
      writeAuditLog({
        issuerID: issuer.id,
        issuerRank: issuer.role,
        command: Command.SPAWN,
        args: args,
        result: 'failed',
        reason: `Exception: ${error.message}`
      });
      return;
    }
  }

  // Fall back to old object system for backward compatibility
  const item = world.getObject(itemId);
  if (!item) {
    player.send('\n' + colors.error(`Item "${itemId}" not found in ItemRegistry or world objects.\n`));
    player.send(colors.hint('Use @spawn with no arguments to see available items.\n'));
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

  // Old system: Add to inventory
  for (let i = 0; i < qty; i++) {
    player.inventory.push(itemId);
  }

  playerDB.updatePlayerInventory(player.username, player.inventory);

  player.send('\n' + colors.success(`Spawned ${qty}x ${item.name} (${itemId}) [legacy]\n`));

  rateLimiter.recordCommand(issuer.id);

  writeAuditLog({
    issuerID: issuer.id,
    issuerRank: issuer.role,
    command: Command.SPAWN,
    args: [itemId, qty],
    result: 'success',
    reason: `Spawned ${qty}x ${itemId} (legacy system)`
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
    { cmd: Command.SLAY, usage: '@slay <player|npc>', desc: 'Kill target, creating corpse (will respawn)', minRole: Role.CREATOR },
    { cmd: Command.DESTROY, usage: '@destroy <npc|item|corpse>', desc: 'Destroy target without corpse/respawn', minRole: Role.CREATOR },
    { cmd: Command.REVIVE, usage: '@revive <player>', desc: 'Revive a dead player', minRole: Role.CREATOR },
    { cmd: Command.SPAWN, usage: '@spawn <itemId> [qty]', desc: 'Spawn items', minRole: Role.CREATOR },
    { cmd: Command.SPAWN, usage: '@spawn_full', desc: 'Spawn complete equipment test set', minRole: Role.CREATOR },
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

/**
 * Create Emote command - Generate a new emote template file
 * Usage: @createemote <name> [description]
 */
async function createemoteCommand(player, args, context) {
  const fs = require('fs');
  const path = require('path');
  const { adminService, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.CREATEEMOTE)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.CREATEEMOTE,
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
    player.send('\n' + colors.error('Usage: @createemote <name> [description]\n'));
    player.send(colors.hint('Example: @createemote wave "Wave at someone"\n'));
    return;
  }

  const emoteName = args[0].toLowerCase();
  const description = args.slice(1).join(' ') || `Perform the ${emoteName} emote`;

  // Validate emote name (alphanumeric only)
  if (!/^[a-z][a-z0-9]*$/.test(emoteName)) {
    player.send('\n' + colors.error('Emote name must start with a letter and contain only lowercase letters and numbers.\n'));
    return;
  }

  // Check if emote already exists
  const emoteFilePath = path.join(__dirname, '../commands/emotes', `${emoteName}.js`);
  if (fs.existsSync(emoteFilePath)) {
    player.send('\n' + colors.error(`Emote "${emoteName}" already exists.\n`));
    player.send(colors.hint('Use a different name or edit the existing file directly.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.CREATEEMOTE,
      args: args,
      result: 'failed',
      reason: 'Emote already exists'
    });
    return;
  }

  // Generate emote template
  const template = `/**
 * ${emoteName.charAt(0).toUpperCase() + emoteName.slice(1)} Emote
 * ${description}
 *
 * Created by: ${player.username}
 */

const createEmote = require('./createEmote');

module.exports = createEmote({
  name: '${emoteName}',
  aliases: [],
  help: {
    description: '${description}',
    usage: '${emoteName} [target]',
    examples: [
      '${emoteName}',
      '${emoteName} PlayerName'
    ]
  },
  messages: {
    noTarget: {
      self: 'TODO: Message shown to you when you ${emoteName}.',
      room: (player) => \`TODO: Message shown to room when \${player.username} ${emoteName}s.\`
    },
    withTarget: {
      self: (player, target) => \`TODO: Message shown to you when you ${emoteName} at \${target.username}.\`,
      target: (player) => \`TODO: Message shown to \${player.username} when they are ${emoteName}ed at.\`,
      room: (player, target) => \`TODO: Message shown to room when \${player.username} ${emoteName}s at \${target.username}.\`
    }
  }
});
`;

  try {
    // Write the file
    fs.writeFileSync(emoteFilePath, template, 'utf8');

    player.send('\n' + colors.success(`Created emote template: ${emoteFilePath}\n`));
    player.send(colors.info('\nNext steps:\n'));
    player.send(colors.info(`1. Edit ${emoteFilePath}\n`));
    player.send(colors.info('2. Replace all TODO messages with actual emote text\n'));
    player.send(colors.info('3. Optionally remove "withTarget" section if emote has no target\n'));
    player.send(colors.info('4. Add the emote to src/commands/emotes/registry.js\n'));
    player.send(colors.info('5. Restart the server to load the new emote\n\n'));
    player.send(colors.hint(`Usage after setup: ${emoteName} [target]\n`));

    rateLimiter.recordCommand(issuer.id);

    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.CREATEEMOTE,
      args: [emoteName, description],
      result: 'success',
      reason: `Created emote template: ${emoteName}.js`
    });
  } catch (err) {
    player.send('\n' + colors.error(`Failed to create emote file: ${err.message}\n`));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.CREATEEMOTE,
      args: args,
      result: 'failed',
      reason: `File write error: ${err.message}`
    });
  }
}

/**
 * Destroy command - Remove NPC or item without corpse or respawn
 * Usage: @destroy <target>
 */
async function destroyCommand(player, args, context) {
  const { adminService, world, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.DESTROY)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: Command.DESTROY,
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
    player.send('\n' + colors.error('Usage: @destroy <target>\n'));
    return;
  }

  const targetName = args.join(' ');
  const room = world.getRoom(player.currentRoom);

  // Try to find and destroy NPC first (use same lookup as slay command)
  const targetNPC = findNPCInRoom(targetName, player, world);
  if (targetNPC) {
    const npcName = targetNPC.name;
    const npcId = targetNPC.id;

    // Remove from room.npcs array
    if (room && room.npcs) {
      const npcIndex = room.npcs.findIndex(id => id === npcId);
      if (npcIndex !== -1) {
        room.npcs.splice(npcIndex, 1);
      }
    }

    // End combat if in combat
    const CombatRegistry = require('../systems/combat/CombatRegistry');
    if (CombatRegistry.isInCombat(npcId)) {
      const combat = CombatRegistry.getCombatForEntity(npcId);
      if (combat) {
        CombatRegistry.endCombat(combat.id);
      }
    }

    player.send('\n' + colors.success(`Destroyed ${npcName} (no corpse, no respawn)\n`));

    world.sendToRoom(
      player.currentRoom,
      colors.dim(`${npcName} vanishes in a puff of admin magic.`),
      [player.username],
      context.allPlayers
    );

    rateLimiter.recordCommand(issuer.id);
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: 'DESTROY',
      args: [npcName],
      result: 'success',
      reason: 'NPC destroyed without corpse'
    });
    return;
  }

  // Try to find and destroy item/corpse
  const targetNameLower = targetName.toLowerCase();

  if (!room) {
    player.send('\n' + colors.error(`Error: Cannot find current room.\n`));
    return;
  }

  if (!room.items || room.items.length === 0) {
    player.send('\n' + colors.error(`Target "${args.join(' ')}" not found (no items in room).\n`));
    return;
  }

  // Debug: log room items for troubleshooting
  const logger = require('../logger');
  logger.log(`Destroy command searching for "${targetNameLower}" in room with ${room.items.length} items`);
  room.items.forEach((item, idx) => {
    logger.log(`  Item ${idx}: name="${item.name}", id="${item.id}", keywords=${JSON.stringify(item.keywords)}`);
  });

  const itemIndex = room.items.findIndex(item =>
    (item.name && item.name.toLowerCase().includes(targetNameLower)) ||
    (item.id && item.id.toLowerCase().includes(targetNameLower)) ||
    (item.definitionId && item.definitionId.toLowerCase().includes(targetNameLower)) ||
    (item.keywords && item.keywords.some(kw => kw && kw.toLowerCase().includes(targetNameLower)))
  );

  logger.log(`Search result: itemIndex = ${itemIndex}`);

  if (itemIndex !== -1) {
    const item = room.items[itemIndex];
    const itemName = item.name || item.id;

    // Check if it's a corpse
    const isCorpse = item.containerType === 'npc_corpse' || item.containerType === 'player_corpse';

    if (isCorpse) {
      // Handle corpse destruction via CorpseManager
      const CorpseManager = require('../systems/corpses/CorpseManager');
      const destroyed = CorpseManager.destroyCorpse(item.id, world);

      // ALWAYS remove from current room.items manually
      // CorpseManager removes from corpse.spawnLocation, which might be different
      // from the current room if the corpse was moved or player moved
      room.items.splice(itemIndex, 1);

      player.send('\n' + colors.success(`Destroyed corpse: ${itemName}\n`));
      player.send(colors.dim(`(${item.inventory?.length || 0} items destroyed with it)\n`));

      world.sendToRoom(
        player.currentRoom,
        colors.dim(`${itemName} vanishes in a puff of admin magic.`),
        [player.username],
        context.allPlayers
      );

      rateLimiter.recordCommand(issuer.id);
      writeAuditLog({
        issuerID: issuer.id,
        issuerRank: issuer.role,
        command: 'DESTROY',
        args: [itemName],
        result: 'success',
        reason: `Corpse destroyed (${item.containerType}, ${item.inventory?.length || 0} items)${destroyed ? '' : ' - orphaned'}`
      });
      return;
    }

    // Regular item destruction
    // Remove from room
    room.items.splice(itemIndex, 1);

    player.send('\n' + colors.success(`Destroyed item: ${itemName}\n`));

    world.sendToRoom(
      player.currentRoom,
      colors.dim(`${itemName} vanishes in a puff of admin magic.`),
      [player.username],
      context.allPlayers
    );

    rateLimiter.recordCommand(issuer.id);
    writeAuditLog({
      issuerID: issuer.id,
      issuerRank: issuer.role,
      command: 'DESTROY',
      args: [itemName],
      result: 'success',
      reason: 'Item destroyed'
    });
    return;
  }

  player.send('\n' + colors.error(`Target "${args.join(' ')}" not found (neither NPC, item, nor corpse).\n`));
}

/**
 * Respawn command - Force NPC to respawn immediately
 * Usage: @respawn <npc_id> [here]
 */
async function respawnCommand(player, args, context) {
  const { adminService, world, rateLimiter } = context;

  const issuer = {
    id: player.username.toLowerCase(),
    role: adminService.getRole(player.username),
    name: player.username
  };

  if (!hasPermission(issuer, Command.SPAWN)) {
    player.send('\n' + colors.error('You do not have permission to use this command.\n'));
    return;
  }

  const rateLimit = rateLimiter.checkLimit(issuer.id);
  if (!rateLimit.allowed) {
    player.send('\n' + colors.error(`Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.\n`));
    return;
  }

  if (args.length === 0) {
    player.send('\n' + colors.error('Usage: @respawn <npc_id> [here]\n'));
    player.send(colors.hint('Examples: @respawn purple_wumpy, @respawn big_bird here\n'));
    return;
  }

  const npcId = args[0].toLowerCase();
  const spawnHere = args.length > 1 && args[1].toLowerCase() === 'here';

  const RespawnManager = require('../systems/corpses/RespawnManager');
  const CorpseManager = require('../systems/corpses/CorpseManager');

  // Check for active corpse and decay it
  if (CorpseManager.hasActiveCorpse(npcId)) {
    const corpse = CorpseManager.getCorpseByNPC(npcId);
    player.send('\n' + colors.info(`Decaying active corpse first...\n`));
    CorpseManager.destroyCorpse(corpse.id, world);
  }

  // Determine spawn location
  const spawnRoomId = spawnHere ? player.currentRoom : null;

  try {
    const spawned = RespawnManager.respawnNPC(npcId, spawnRoomId, world);

    if (spawned) {
      const location = spawnRoomId || 'home room';
      player.send('\n' + colors.success(`Respawned ${npcId} in ${location}\n`));

      rateLimiter.recordCommand(issuer.id);
      writeAuditLog({
        issuerID: issuer.id,
        issuerRank: issuer.role,
        command: 'RESPAWN',
        args: [npcId, location],
        result: 'success',
        reason: `Forced respawn in ${location}`
      });
    } else {
      player.send('\n' + colors.error(`Failed to respawn ${npcId}. Check logs.\n`));
    }
  } catch (error) {
    player.send('\n' + colors.error(`Error: ${error.message}\n`));
  }
}

module.exports = {
  kickCommand,
  banCommand,
  unbanCommand,
  addlevelCommand,
  removelevelCommand,
  slayCommand,
  spawnCommand,
  spawnFullCommand,
  promoteCommand,
  demoteCommand,
  adminhelpCommand,
  reviveCommand,
  createemoteCommand,
  destroyCommand,
  respawnCommand,
  findPlayer,
  findNPC,
  findNPCInRoom
};
