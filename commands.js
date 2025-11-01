/**
 * Commands - Command handlers for the MUD
 * Each command is a function that takes (player, args, world, playerDB)
 */

const colors = require('./colors');

const commands = {
  /**
   * Look command - Display current room information
   */
  look: (player, args, world, playerDB, allPlayers) => {
    let targetName;
    if (args.length > 1 && args[0].toLowerCase() === 'at') {
      targetName = args.slice(1).join(' ').toLowerCase();
    } else if (args.length > 0) {
      targetName = args.join(' ').toLowerCase();
    }

    if (targetName) {
      if (targetName === player.username.toLowerCase()) {
        player.send(`\n${colors.playerName(player.username)}\n${player.description}\n`);
        return;
      }

      for (const p of allPlayers) {
        if (p.username.toLowerCase() === targetName && p.currentRoom === player.currentRoom) {
          player.send(`\n${colors.playerName(p.username)}\n${p.description}\n`);
          return;
        }
      }
      player.send(`\n${colors.error('You don\'t see that person here.')}\n`);
      return;
    }

    const roomDescription = world.formatRoom(player.currentRoom, allPlayers, player);
    player.send('\n' + roomDescription);
  },

  /**
   * Describe command - Set player's description
   */
  describe: (player, args, world, playerDB) => {
    if (args.length === 0) {
      player.send('\n' + colors.error('Describe yourself as what?'));
      return;
    }
    const description = args.join(' ');
    player.description = description;
    playerDB.updatePlayerDescription(player.username, description);
    player.send('\n' + colors.success('You have set your description.'));
  },

  /**
   * Quit command - Disconnect gracefully
   */
  quit: (player, args, world, playerDB) => {
    player.send(colors.system('Farewell! Come back soon.\n'));
    player.socket.end();
  },

  /**
   * Help command - Display available commands
   */
  help: (player, args, world, playerDB) => {
    const helpText = `
${colors.info('Available Commands:')}
${colors.line(19, '-')}
${colors.highlight('Movement:')}
  north, south, east, west - Move in a cardinal direction
  n, s, e, w              - Short aliases for directions
  up, down, u, d          - Move up or down

${colors.highlight('Interaction:')}
  look / l                - Look around the current room
  examine [target]        - Examine an NPC or object in detail
  ex [target]             - Short form of examine
  kick [target]           - Kick a target
  get/take [item]         - Pick up an object
  drop [item]             - Drop an object from inventory
  inventory / i           - Show what you're carrying
  describe [description]  - Set your character description

${colors.highlight('Communication:')}
  say [message]           - Speak to others in the room
  emote [action]          - Perform an emote/action
  : [action]              - Short form of emote

${colors.highlight('Information:')}
  who                     - List online players
  score                   - Show your character stats
  help                    - Show this help message

${colors.highlight('System:')}
  quit                    - Disconnect from the game
`;
    player.send(helpText);
  },

  /**
   * Examine command - Look at NPCs or objects in detail
   */
  examine: (player, args, world, playerDB, allPlayers) => {
    const target = args.join(' ').toLowerCase();
    const room = world.getRoom(player.currentRoom);

    if (!room) {
      player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
      return;
    }

    // Search for players in the current room
    for (const p of allPlayers) {
      if (p.username.toLowerCase() === target && p.currentRoom === player.currentRoom) {
        player.send(`\n${colors.playerName(p.username)}\n${p.description}\n`);
        return;
      }
    }

    // Search NPCs in current room
    if (room.npcs) {
      for (const npcId of room.npcs) {
        const npc = world.getNPC(npcId);
        if (npc && npc.keywords) {
          if (npc.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
            // Found matching NPC
            let output = [];
            output.push(colors.npcName(npc.name) + colors.hint(` (Level ${npc.level})`));

            // Wrap NPC description
            const wrappedDesc = colors.wrap(npc.description, 80);
            output.push(colors.colorize(wrappedDesc, colors.MUD_COLORS.NPC));

            if (npc.dialogue && npc.dialogue.length > 0) {
              output.push('');
              output.push(colors.hint('The ' + npc.name + ' looks like they might have something to say.'));
            }

            if (npc.is_kickable) {
              output.push(colors.hint('This creature looks eminently kickable.'));
            }

            player.send('\n' + output.join('\n') + '\n');
            return;
          }
        }
      }
    }

    // Search objects in current room
    if (room.objects) {
      for (const objId of room.objects) {
        const obj = world.getObject(objId);
        if (obj && obj.keywords) {
          if (obj.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
            // Found matching object
            let output = [];
            output.push(colors.objectName(obj.name));

            // Wrap object description
            const wrappedDesc = colors.wrap(obj.description, 80);
            output.push(colors.colorize(wrappedDesc, colors.MUD_COLORS.OBJECT));

            if (obj.is_container) {
              if (obj.can_be_opened) {
                output.push('');
                if (obj.is_open) {
                  output.push(colors.hint('The container is currently open.'));
                } else {
                  output.push(colors.hint('The container is currently closed.'));
                }
              }
            }

            if (obj.is_usable) {
              output.push(colors.hint('This looks like it might be usable.'));
            }

            if (obj.can_sit_on) {
              output.push(colors.hint('You could probably sit on this.'));
            }

            if (obj.can_sleep_in) {
              output.push(colors.hint('This looks like a comfortable place to sleep.'));
            }

            player.send('\n' + output.join('\n') + '\n');
            return;
          }
        }
      }
    }

    // Search inventory
    if (player.inventory && player.inventory.length > 0) {
      for (const objId of player.inventory) {
        const obj = world.getObject(objId);
        if (obj && obj.keywords) {
          if (obj.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
            let output = [];
            output.push(colors.objectName(obj.name) + colors.hint(' (in your inventory)'));

            // Wrap object description
            const wrappedDesc = colors.wrap(obj.description, 80);
            output.push(colors.colorize(wrappedDesc, colors.MUD_COLORS.OBJECT));

            player.send('\n' + output.join('\n') + '\n');
            return;
          }
        }
      }
    }

    player.send('\n' + colors.error(`You don\'t see "${args.join(' ')}" here.\n`));
  },

  // Alias for examine
  ex: (player, args, world, playerDB, allPlayers) => {
    commands.examine(player, args, world, playerDB, allPlayers);
  },

  /**
   * Kick command - Kick an NPC
   */
  kick: (player, args, world, playerDB, allPlayers, activeInteractions) => {
    if (args.length === 0) {
      player.send('\n' + colors.error('Kick what? Try "kick [target]"\n'));
      return;
    }

    const target = args.join(' ').toLowerCase();
    const room = world.getRoom(player.currentRoom);

    if (!room) {
      player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
      return;
    }

    // Search NPCs in current room
    if (room.npcs) {
      for (const npcId of room.npcs) {
        const npc = world.getNPC(npcId);
        if (npc && npc.keywords) {
          if (npc.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
            // Found matching NPC

            if (npc.is_kickable) {
              const interactionKey = `${player.currentRoom}_${npcId}`;
              if (activeInteractions.has(interactionKey)) {
                player.send('\n' + colors.error(`The ${npc.name} is already busy being kicked by someone else!`));
                return;
              }

              player.send('\n' + colors.action(`You kick the ${npc.name}!` + '\n'));
              const randomResponse = npc.kick_responses[Math.floor(Math.random() * npc.kick_responses.length)];
              player.send(colors.npcSay(`${randomResponse}\n`));

              // Start the apology dialogue sequence
              let dialogueIndex = 0;
              const dialogueInterval = setInterval(() => {
                if (dialogueIndex < npc.apology_dialogue.length) {
                  player.send(colors.npcSay(`The ${npc.name} says, "${npc.apology_dialogue[dialogueIndex++]}"\n`));
                } else {
                  clearInterval(dialogueInterval);
                }
              }, 1000);

              const timer = setTimeout(() => {
                // Wumpy vanishes
                const wumpyIndex = room.npcs.indexOf(npcId);
                if (wumpyIndex > -1) {
                  room.npcs.splice(wumpyIndex, 1);
                }
                player.send('\n' + colors.action(`The ${npc.name} vanishes in a puff of logic!`));
                activeInteractions.delete(interactionKey);
              }, 10000);

              activeInteractions.set(interactionKey, {
                player: player.username,
                timer: timer,
                dialogueInterval: dialogueInterval
              });

              return;
            } else {
              player.send('\n' + colors.error(`You can\'t kick the ${npc.name}. It doesn\'t seem to appreciate that.\n`));
              return;
            }
          }
        }
      }
    }
    player.send('\n' + colors.error(`You don\'t see "${args.join(' ')}" here to kick.\n`));
  },

  /**
   * Inventory command - Show what the player is carrying
   */
  inventory: (player, args, world, playerDB) => {
    if (!player.inventory || player.inventory.length === 0) {
      player.send('\n' + colors.info('You are not carrying anything.\n'));
      return;
    }

    let output = [];
    output.push(colors.info('You are carrying:'));
    output.push(colors.line(18, '-'));

    for (const objId of player.inventory) {
      const obj = world.getObject(objId);
      if (obj) {
        output.push('  ' + colors.objectName(obj.name));
      }
    }

    player.send('\n' + output.join('\n') + '\n');
  },

  // Alias for inventory
  i: (player, args, world, playerDB) => {
    commands.inventory(player, args, world, playerDB);
  },

  /**
   * Get/Take command - Pick up an object
   */
  get: (player, args, world, playerDB) => {
    if (args.length === 0) {
      player.send('\n' + colors.error('Get what? Try "get [item]"\n'));
      return;
    }

    const target = args.join(' ').toLowerCase();
    const room = world.getRoom(player.currentRoom);

    if (!room || !room.objects || room.objects.length === 0) {
      player.send('\n' + colors.error('There is nothing here to take.\n'));
      return;
    }

    // Search for matching object in room
    for (let i = 0; i < room.objects.length; i++) {
      const objId = room.objects[i];
      const obj = world.getObject(objId);

      if (obj && obj.keywords) {
        if (obj.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
          // Found matching object

          // Check if takeable
          if (obj.is_takeable === false) {
            player.send('\n' + colors.error(`You can\'t take ${obj.name}. It\'s too heavy or fixed in place.\n`));
            return;
          }

          // Remove from room
          room.objects.splice(i, 1);

          // Add to inventory
          if (!player.inventory) {
            player.inventory = [];
          }
          player.inventory.push(objId);

          // Save player data
          playerDB.updatePlayerInventory(player.username, player.inventory);

          player.send('\n' + colors.success(`You take ${obj.name}.\n`));
          return;
        }
      }
    }

    player.send('\n' + colors.error(`You don\'t see "${args.join(' ')}" here.\n`));
  },

  // Alias for get
  take: (player, args, world, playerDB) => {
    commands.get(player, args, world, playerDB);
  },

  /**
   * Drop command - Drop an object from inventory
   */
  drop: (player, args, world, playerDB) => {
    if (args.length === 0) {
      player.send('\n' + colors.error('Drop what? Try "drop [item]"\n'));
      return;
    }

    if (!player.inventory || player.inventory.length === 0) {
      player.send('\n' + colors.error('You are not carrying anything to drop.\n'));
      return;
    }

    const target = args.join(' ').toLowerCase();
    const room = world.getRoom(player.currentRoom);

    if (!room) {
      player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
      return;
    }

    // Search for matching object in inventory
    for (let i = 0; i < player.inventory.length; i++) {
      const objId = player.inventory[i];
      const obj = world.getObject(objId);

      if (obj && obj.keywords) {
        if (obj.keywords.some(keyword => keyword.toLowerCase() === target || target.includes(keyword.toLowerCase()))) {
          // Found matching object

          // Remove from inventory
          player.inventory.splice(i, 1);

          // Add to room
          if (!room.objects) {
            room.objects = [];
          }
          room.objects.push(objId);

          // Save player data
          playerDB.updatePlayerInventory(player.username, player.inventory);

          player.send('\n' + colors.success(`You drop ${obj.name}.\n`));
          return;
        }
      }
    }

    player.send('\n' + colors.error(`You are not carrying "${args.join(' ')}".\n`));
  },

  /**
   * Say command - Speak to others in the room
   */
  say: (player, args, world, playerDB, allPlayers) => {
    if (args.length === 0) {
      player.send('\n' + colors.error('Say what? Try "say [message]"\n'));
      return;
    }

    const message = args.join(' ');

    // Send to self
    player.send('\n' + colors.say(`You say, "${message}"\n`));

    // Broadcast to others in the room
    for (const p of allPlayers) {
      if (p.currentRoom === player.currentRoom && p.username !== player.username) {
        p.send('\n' + colors.say(`${player.username} says, "${message}"\n`));
        p.sendPrompt();
      }
    }
  },

  wumpcom: (player, args, world, playerDB, allPlayers) => {
    if (args.length === 0) {
      player.send('\n' + colors.error('Wumpcom what? Try "wumpcom [message]"\n'));
      return;
    }

    const message = args.join(' ');
    const formattedMessage = colors.wumpcom(`[WumpCom] ${player.username}: ${message}`);

    for (const p of allPlayers) {
      if (p.state === 'playing') {
        p.send('\n' + formattedMessage + '\n');
        p.sendPrompt();
      }
    }
  },

  /**
   * Emote command - Perform an action/emote
   */
  emote: (player, args, world, playerDB) => {
    if (args.length === 0) {
      player.send('\n' + colors.error('Emote what? Try "emote [action]"\n'));
      return;
    }

    const action = args.join(' ');

    // Send to self
    player.send('\n' + colors.emote(`${player.username} ${action}\n`));

    // TODO: Broadcast to others in room when multi-player room tracking is implemented
  },

  /**
   * : - Short form of emote
   */
  ':': (player, args, world, playerDB) => {
    commands.emote(player, args, world, playerDB);
  },

  /**
   * Who command - List online players
   */
  who: (player, args, world, playerDB, allPlayers) => {
    if (!allPlayers || allPlayers.size === 0) {
      player.send('\n' + colors.info('No players are currently online.\n'));
      return;
    }

    let output = [];
    output.push(colors.info(`Players Online (${allPlayers.size}):`));
    output.push(colors.line(19, '-'));

    for (const p of allPlayers) {
      if (p.username && p.state === 'playing') {
        const room = world.getRoom(p.currentRoom);
        const roomName = room ? room.name : 'Unknown';
        output.push(`  ${colors.playerName(p.username)} - ${colors.hint(roomName)}`);
      }
    }

    output.push('');
    player.send('\n' + output.join('\n') + '\n');
  },

  'list-players': (player, args, world, playerDB, allPlayers) => {
    if (!allPlayers || allPlayers.size === 0) {
      player.send('\n' + colors.info('No players are currently online.\n'));
      return;
    }

    let output = [];
    output.push(colors.info('Online Players:'));
    output.push(colors.line(78, '-'));
    output.push(
      colors.highlight('Username'.padEnd(20) + 'Realm'.padEnd(20) + 'Level'.padEnd(10) + 'Idle'.padEnd(10))
    );
    output.push(colors.line(78, '-'));

    for (const p of allPlayers) {
      if (p.username && p.state === 'playing') {
        const room = world.getRoom(p.currentRoom);
        const realm = room ? room.realm : 'Unknown';
        const idleTime = Math.floor((Date.now() - p.lastActivity) / 1000);
        const idleString = idleTime > 60 ? `${Math.floor(idleTime / 60)}m` : `${idleTime}s`;

        output.push(
          colors.playerName(p.username.padEnd(20)) +
          colors.colorize(realm.padEnd(20), colors.MUD_COLORS.ROOM_NAME) +
          colors.colorize(p.level.toString().padEnd(10), colors.MUD_COLORS.INFO) +
          colors.hint(idleString.padEnd(10))
        );
      }
    }

    output.push(colors.line(78, '-'));
    output.push(colors.hint(`Total: ${allPlayers.size} player(s)`));

    player.send('\n' + output.join('\n') + '\n');
  },

  /**
   * Score command - Show character stats
   */
  score: (player, args, world, playerDB) => {
    let output = [];
    output.push(colors.info('Character Information'));
    output.push(colors.line(23, '='));
    output.push(`${colors.highlight('Name:')} ${colors.playerName(player.username)}`);
    output.push(`${colors.highlight('Location:')} ${world.getRoom(player.currentRoom)?.name || 'Unknown'}`);

    if (player.inventory && player.inventory.length > 0) {
      output.push(`${colors.highlight('Carrying:')} ${player.inventory.length} item(s)`);
    } else {
      output.push(`${colors.highlight('Carrying:')} nothing`);
    }

    output.push('');
    output.push(colors.hint('You are a fledgling adventurer in The Wumpy and Grift.'));
    output.push(colors.hint('More stats will appear here as you progress...'));

    player.send('\n' + output.join('\n') + '\n');
  },

  /**
   * Movement commands - Handle all movement directions
   */
  north: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'north', world, playerDB, allPlayers),
  south: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'south', world, playerDB, allPlayers),
  east: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'east', world, playerDB, allPlayers),
  west: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'west', world, playerDB, allPlayers),
  up: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'up', world, playerDB, allPlayers),
  down: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'down', world, playerDB, allPlayers),

  // Short aliases for movement
  n: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'north', world, playerDB, allPlayers),
  s: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'south', world, playerDB, allPlayers),
  e: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'east', world, playerDB, allPlayers),
  w: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'west', world, playerDB, allPlayers),
  u: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'up', world, playerDB, allPlayers),
  d: (player, args, world, playerDB, allPlayers) => movePlayer(player, 'down', world, playerDB, allPlayers),

  // Short alias for look
  l: (player, args, world, playerDB, allPlayers) => {
    const roomDescription = world.formatRoom(player.currentRoom, allPlayers, player);
    player.send('\n' + roomDescription);
  },
};

const oppositeDirection = {
  north: 'the south',
  south: 'the north',
  east: 'the west',
  west: 'the east',
  up: 'below',
  down: 'above'
};

/**
 * Move player in a direction
 * @param {Object} player - Player object
 * @param {string} direction - Direction to move
 * @param {Object} world - World object
 * @param {Object} playerDB - PlayerDB object
 * @param {Set} allPlayers - Set of all connected players
 */
function movePlayer(player, direction, world, playerDB, allPlayers) {
  const originalRoomId = player.currentRoom;
  const destinationRoomId = world.findExit(originalRoomId, direction);

  if (!destinationRoomId) {
    player.send('\n' + colors.error('You cannot go that way.\n'));
    return;
  }

  const destinationRoom = world.getRoom(destinationRoomId);
  if (!destinationRoom) {
    player.send('\n' + colors.error('That exit leads to nowhere. (Room not found)\n'));
    return;
  }

  // Broadcast leave message
  for (const p of allPlayers) {
    if (p.currentRoom === originalRoomId && p.username !== player.username) {
      p.send('\n' + colors.action(`${player.username} leaves heading ${direction}.`) + '\n');
      p.sendPrompt();
    }
  }

  // Move the player
  player.currentRoom = destinationRoomId;
  playerDB.updatePlayerRoom(player.username, destinationRoomId);

  // Broadcast enter message
  for (const p of allPlayers) {
    if (p.currentRoom === destinationRoomId && p.username !== player.username) {
      p.send('\n' + colors.action(`${player.username} arrives from ${oppositeDirection[direction]}.`) + '\n');
      p.sendPrompt();
    }
  }

  // Show the new room to the player who moved
  player.send('\n' + colors.info(`You move ${direction}.\n`));
  commands.look(player, [], world, playerDB, allPlayers);
}

/**
 * Parse and execute a command
 * @param {string} input - Raw command input from player
 * @param {Object} player - Player object
 * @param {Object} world - World object
 * @param {Object} playerDB - PlayerDB object
 * @param {Set} allPlayers - Set of all connected players (optional)
 * @param {Map} activeInteractions - Map of active interactions (optional)
 */
function parseCommand(input, player, world, playerDB, allPlayers = null, activeInteractions = null) {
  const trimmed = input.trim();
  if (!trimmed) {
    return; // Ignore empty commands
  }

  // Handle "sorry" for wumpy interaction
  if (trimmed.toLowerCase() === 'sorry' || trimmed.toLowerCase() === 'say sorry') {
    const room = world.getRoom(player.currentRoom);
    if (room && room.npcs) {
      for (const npcId of room.npcs) {
        const interactionKey = `${player.currentRoom}_${npcId}`;
        if (activeInteractions && activeInteractions.has(interactionKey)) {
          const interaction = activeInteractions.get(interactionKey);
          if (interaction.player === player.username) {
            clearTimeout(interaction.timer);
            clearInterval(interaction.dialogueInterval);
            activeInteractions.delete(interactionKey);
            const npc = world.getNPC(npcId);
            player.send('\n' + colors.npcSay(`The ${npc.name} says, "Thank you for saying sorry!"\n`));
            return;
          }
        }
      }
    }
  }

  // Split command and arguments
  const parts = trimmed.split(/\s+/);
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Execute command if it exists
  const command = commands[commandName];
  if (command) {
    try {
      command(player, args, world, playerDB, allPlayers, activeInteractions);
    } catch (err) {
      console.error(`Error executing command '${commandName}':`, err);
      player.send('\n' + colors.error('An error occurred while processing that command.\n'));
    }
  } else {
    player.send('\n' + colors.error(`Unknown command: ${commandName}\n`) + colors.hint(`Type 'help' for a list of commands.\n`));
  }
}

module.exports = {
  commands,
  parseCommand
};