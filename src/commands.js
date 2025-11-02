/**
 * Commands - Command handlers for the MUD
 * Each command is a function that takes (player, args, world, playerDB)
 */

const colors = require('./colors');

const taunts = [
  'I don\'t want to talk to you no more, you empty-headed animal food trough water! ',
  'I fart in your general direction! Your mother was a hamster and your father smelt of elderberries!',
  'Go and boil your bottoms, sons of a silly person!',
  'I wave my private parts at your aunties, you cheesy lot of second-hand electric donkey-bottom biters!',
  'Go away or I shall taunt you again!'
];

const commands = {
  attack: (player, args, world, playerDB, allPlayers, activeInteractions, combatEngine) => {
    // Check if player is a ghost
    if (player.isGhost) {
      player.send('\n' + colors.error('You cannot attack while you are a ghost!'));
      player.send('\n' + colors.hint('Your ethereal form passes through the world without substance.\n'));
      return;
    }

    if (args.length === 0) {
      player.send('\n' + colors.error('Attack what? Try "attack [target]"\n'));
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
            combatEngine.initiateCombat([player, npc]);
            return;
          }
        }
      }
    }
    player.send('\n' + colors.error(`You don\'t see "${args.join(' ')}" here to attack.\n`));
  },

  kill: (player, args, world, playerDB, allPlayers, activeInteractions, combatEngine) => {
    commands.attack(player, args, world, playerDB, allPlayers, activeInteractions, combatEngine);
  },

  taunt: (player, args, world, playerDB, allPlayers) => {
    const messages = getEmoteMessages('taunt', player);
    broadcastEmote(player, null, allPlayers, messages.self, null, messages.room);
    player.tauntIndex = (player.tauntIndex + 1) % taunts.length;
  },
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
      // Check self
      if (targetName === player.username.toLowerCase()) {
        let output = `\n${colors.playerName(player.username)}`;
        if (player.isGhost) {
          output += colors.hint(' (ghost)');
        }
        output += `\n${player.description}`;
        if (player.isGhost) {
          output += `\n${colors.hint('Your form is translucent and ethereal.')}`;
        }
        player.send(output + '\n');
        return;
      }

      // Check other players
      for (const p of allPlayers) {
        if (p.username.toLowerCase() === targetName && p.currentRoom === player.currentRoom) {
          let output = `\n${colors.playerName(p.username)}`;
          if (p.isGhost) {
            output += colors.hint(' (ghost)');
          }
          output += `\n${p.description}`;
          if (p.isGhost) {
            output += `\n${colors.hint('Their form is translucent and ethereal, barely visible in this world.')}`;
          }
          player.send(output + '\n');
          return;
        }
      }

      // Check NPCs - delegate to examine command for consistent behavior
      const room = world.getRoom(player.currentRoom);
      if (room && room.npcs) {
        for (const npcId of room.npcs) {
          const npc = world.getNPC(npcId);
          if (npc && npc.keywords) {
            if (npc.keywords.some(keyword => keyword.toLowerCase() === targetName || targetName.includes(keyword.toLowerCase()))) {
              // Found matching NPC - use examine logic
              commands.examine(player, args, world, playerDB, allPlayers);
              return;
            }
          }
        }
      }

      // Check objects - delegate to examine command
      if (room && room.objects) {
        for (const objId of room.objects) {
          const obj = world.getObject(objId);
          if (obj && obj.keywords) {
            if (obj.keywords.some(keyword => keyword.toLowerCase() === targetName || targetName.includes(keyword.toLowerCase()))) {
              // Found matching object - use examine logic
              commands.examine(player, args, world, playerDB, allPlayers);
              return;
            }
          }
        }
      }

      player.send(`\n${colors.error('You don\'t see that here.')}\n`);
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
    if (args.length > 0 && args[0].toLowerCase() === 'emote') {
      const emoteNames = Object.keys(emoteDefinitions).sort().join(', ');
      const emoteHelpText = `
${colors.info('Available Emotes:')}
${colors.line(19, '-')}
  ${emoteNames}
`;
      player.send(emoteHelpText);
      return;
    }

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
  help emote              - Show the full list of emotes

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
        let output = `\n${colors.playerName(p.username)}`;
        if (p.isGhost) {
          output += colors.hint(' (ghost)');
        }
        output += `\n${p.description}`;
        if (p.isGhost) {
          output += `\n${colors.hint('Their form is translucent and ethereal, barely visible in this world.')}`;
        }
        player.send(output + '\n');
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
    emote: (player, args, world, playerDB, allPlayers) => {
      if (args.length === 0) {
        player.send('\n' + colors.error('Emote what? Try "emote [action]"\n'));
        return;
      }
  
      const action = args.join(' ');
      const message = `${player.username} ${action}`;
      broadcastEmote(player, null, allPlayers, `You ${action}`, null, message);
    },  
    /**
     * Emote commands
     */
        applaud: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('applaud', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  bow: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('bow', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  cackle: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('cackle', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  cheer: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('cheer', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  chuckle: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('chuckle', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  cry: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('cry', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  dance: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('dance', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  fart: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('fart', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  flex: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('flex', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  giggle: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('giggle', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  groan: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('groan', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  growl: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('growl', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  hiccup: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('hiccup', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  grin: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('grin', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  kiss: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('kiss', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  pinch: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('pinch', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  tip: (player, args, world, playerDB, allPlayers) => {
    const targetName = args.join(' ');
    const targetPlayer = targetName ? findPlayerInRoom(targetName, player, allPlayers) : null;

    if (targetName && !targetPlayer) {
      player.send(`\n${colors.error(`You don't see "${targetName}" here.`)}\n`);
      return;
    }

    const messages = getEmoteMessages('tip', player, targetPlayer);
    broadcastEmote(player, targetPlayer, allPlayers, messages.self, messages.target, messages.room);
  },
  
    /**
     * : - Short form of emote
     */
  ':': (player, args, world, playerDB, allPlayers) => {
    commands.emote(player, args, world, playerDB, allPlayers);
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

    // Show ghost status prominently if applicable
    if (player.isGhost) {
      output.push(`${colors.highlight('Status:')} ${colors.error('GHOST')}`);
      output.push(colors.hint('  You are currently a ghost and cannot attack.'));
    }

    if (player.inventory && player.inventory.length > 0) {
      output.push(`${colors.highlight('Carrying:')} ${player.inventory.length} item(s)`);
    } else {
      output.push(`${colors.highlight('Carrying:')} nothing`);
    }

    output.push('');
    if (player.isGhost) {
      output.push(colors.hint('You are a ghostly spirit in The Wumpy and Grift.'));
      output.push(colors.hint('Your translucent form drifts through the world...'));
    } else {
      output.push(colors.hint('You are a fledgling adventurer in The Wumpy and Grift.'));
      output.push(colors.hint('More stats will appear here as you progress...'));
    }

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

function findPlayerInRoom(playerName, player, allPlayers) {
  for (const p of allPlayers) {
    if (p.username.toLowerCase() === playerName.toLowerCase() && p.currentRoom === player.currentRoom) {
      return p;
    }
  }
  return null;
}

const oppositeDirection = {
  north: 'the south',
  south: 'the north',
  east: 'the west',
  west: 'the east',
  up: 'below',
  down: 'above'
};

const emoteDefinitions = {
  applaud: {
    noTarget: (player) => ({
      self: 'You applaud with the enthusiasm of someone who just saw a dog walk on its hind legs.',
      room: `${player.username} applauds with the enthusiasm of someone who just saw a dog walk on its hind legs.`,
    }),
    withTarget: (player, target) => ({
      self: `You applaud ${target.username}.`,
      target: `${player.username} applauds you.`,
      room: `${player.username} applauds ${target.username}.`,
    }),
  },
  bow: {
    noTarget: (player) => ({
      self: 'You bow with the grace of a penguin on a skateboard.',
      room: `${player.username} bows with the grace of a penguin on a skateboard.`,
    }),
    withTarget: (player, target) => ({
      self: `You bow to ${target.username}.`,
      target: `${player.username} bows to you.`,
      room: `${player.username} bows to ${target.username}.`,
    }),
  },
  cackle: {
    noTarget: (player) => ({
      self: 'You cackle like a villain who just remembered they left the oven on.',
      room: `${player.username} cackles like a villain who just remembered they left the oven on.`,
    }),
    withTarget: (player, target) => ({
      self: `You cackle maniacally at ${target.username}.`,
      target: `${player.username} cackles maniacally at you.`,
      room: `${player.username} cackles maniacally at ${target.username}.`,
    }),
  },
  cheer: {
    noTarget: (player) => ({
      self: 'You cheer with the force of a thousand suns, or at least a very excited hamster.',
      room: `${player.username} cheers with the force of a thousand suns, or at least a very excited hamster.`,
    }),
    withTarget: (player, target) => ({
      self: `You cheer for ${target.username}.`,
      target: `${player.username} cheers for you.`,
      room: `${player.username} cheers for ${target.username}.`,
    }),
  },
  chuckle: {
    noTarget: (player) => ({
      self: 'You chuckle softly, like a grandfather who just told a terrible joke.',
      room: `${player.username} chuckles softly, like a grandfather who just told a terrible joke.`,
    }),
    withTarget: (player, target) => ({
      self: `You chuckle at ${target.username}.`,
      target: `${player.username} chuckles at you.`,
      room: `${player.username} chuckles at ${target.username}.`,
    }),
  },
  cry: {
    noTarget: (player) => ({
      self: 'You cry a single, dramatic tear. It\'s probably not real.',
      room: `${player.username} cries a single, dramatic tear. It\'s probably not real.`,
    }),
    withTarget: (player, target) => ({
      self: `You cry on ${target.username}\'s shoulder.`,
      target: `${player.username} cries on your shoulder.`,
      room: `${player.username} cries on ${target.username}\'s shoulder.`,
    }),
  },
  dance: {
    noTarget: (player) => ({
      self: 'You dance the dance of your people. It\'s... something.',
      room: `${player.username} dances the dance of their people. It\'s... something.`,
    }),
    withTarget: (player, target) => ({
      self: `You dance with ${target.username}.`,
      target: `${player.username} dances with you.`,
      room: `${player.username} dances with ${target.username}.`,
    }),
  },
  fart: {
    noTarget: (player) => ({
      self: 'You let out a small, apologetic toot.',
      room: `${player.username} lets out a small, apologetic toot.`,
    }),
    withTarget: (player, target) => ({
      self: `You fart in ${target.username}\'s general direction.`,
      target: `${player.username} farts in your general direction.`,
      room: `${player.username} farts in ${target.username}\'s general direction.`,
    }),
  },
  flex: {
    noTarget: (player) => ({
      self: 'You flex your muscles, which are surprisingly well-defined for a text-based adventurer.',
      room: `${player.username} flexes their muscles, which are surprisingly well-defined for a text-based adventurer.`,
    }),
    withTarget: (player, target) => ({
      self: `You flex for ${target.username}.`,
      target: `${player.username} flexes for you.`,
      room: `${player.username} flexes for ${target.username}.`,
    }),
  },
  giggle: {
    noTarget: (player) => ({
      self: 'You giggle like a schoolgirl who just passed a note in class.',
      room: `${player.username} giggles like a schoolgirl who just passed a note in class.`,
    }),
    withTarget: (player, target) => ({
      self: `You giggle at ${target.username}.`,
      target: `${player.username} giggles at you.`,
      room: `${player.username} giggles at ${target.username}.`,
    }),
  },
  groan: {
    noTarget: (player) => ({
      self: 'You groan with the weight of the world on your shoulders, or maybe you just ate too much cheese.',
      room: `${player.username} groans with the weight of the world on their shoulders, or maybe you just ate too much cheese.`,
    }),
    withTarget: (player, target) => ({
      self: `You groan at ${target.username}.`,
      target: `${player.username} groans at you.`,
      room: `${player.username} groans at ${target.username}.`,
    }),
  },
  growl: {
    noTarget: (player) => ({
      self: 'You growl menacingly, or maybe you\'re just hungry.',
      room: `${player.username} growls menacingly, or maybe they\'re just hungry.`,
    }),
    withTarget: (player, target) => ({
      self: `You growl at ${target.username}.`,
      target: `${player.username} growls at you.`,
      room: `${player.username} growls at ${target.username}.`,
    }),
  },
  hiccup: {
    noTarget: (player) => ({
      self: 'You hiccup with a tiny, adorable squeak.',
      room: `${player.username} hiccups with a tiny, adorable squeak.`,
    }),
    withTarget: (player, target) => ({
      self: `You hiccup at ${target.username}.`,
      target: `${player.username} hiccups at you.`,
      room: `${player.username} hiccups at ${target.username}.`,
    }),
  },
  grin: {
    noTarget: (player) => ({
      self: 'You grin like a Cheshire cat who just got away with something.',
      room: `${player.username} grins like a Cheshire cat who just got away with something.`,
    }),
    withTarget: (player, target) => ({
      self: `You grin at ${target.username}.`,
      target: `${player.username} grins at you.`,
      room: `${player.username} grins at ${target.username}.`,
    }),
  },
  kiss: {
    noTarget: (player) => ({
      self: 'You blow a kiss into the air. It lands on someone\'s cheek with a soft *smack*.',
      room: `${player.username} blows a kiss into the air. It lands on someone\'s cheek with a soft *smack*.`,
    }),
    withTarget: (player, target) => ({
      self: `You blow a kiss to ${target.username}.`,
      target: `${player.username} blows a kiss to you.`,
      room: `${player.username} blows a kiss to ${target.username}.`,
    }),
  },
  pinch: {
    noTarget: (player) => ({
      self: 'You pinch yourself to make sure you\'re not dreaming. Nope, still here.',
      room: `${player.username} pinches themselves to make sure they\'re not dreaming. Nope, still here.`,
    }),
    withTarget: (player, target) => ({
      self: `You pinch ${target.username} playfully.`,
      target: `${player.username} pinches you playfully.`,
      room: `${player.username} pinches ${target.username} playfully.`,
    }),
  },
  tip: {
    noTarget: (player) => ({
      self: 'You tip your hat politely.',
      room: `${player.username} tips their hat politely.`,
    }),
    withTarget: (player, target) => ({
      self: `You tip your hat to ${target.username}.`,
      target: `${player.username} tips their hat to you.`,
      room: `${player.username} tips their hat to ${target.username}.`,
    }),
  },
  taunt: {
    noTarget: (player) => {
      const currentTaunt = taunts[player.tauntIndex];
      return {
        self: `You taunt, "${currentTaunt}"`,
        room: `${player.username} taunts, "${currentTaunt}"`,
      };
    },
  },
};

function getEmoteMessages(emoteName, player, target = null) {
  const def = emoteDefinitions[emoteName];
  if (!def) {
    return null;
  }

  if (target) {
    return def.withTarget(player, target);
  } else {
    return def.noTarget(player);
  }
}

function broadcastEmote(player, target, allPlayers, selfMessage, targetMessage, roomMessage) {
  if (target) {
    player.send(`\n${colors.emote(selfMessage)}\n`);
    target.send(`\n${colors.emote(targetMessage)}\n`);
    for (const p of allPlayers) {
      if (p.currentRoom === player.currentRoom && p.username !== player.username && p.username !== target.username) {
        p.send(`\n${colors.emote(roomMessage)}\n`);
        p.sendPrompt();
      }
    }
  } else {
    for (const p of allPlayers) {
      if (p.currentRoom === player.currentRoom) {
        if (p.username === player.username) {
          p.send(`\n${colors.emote(selfMessage)}\n`);
        } else {
          p.send(`\n${colors.emote(roomMessage)}\n`);
        }
        p.sendPrompt();
      }
    }
  }
}

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
function parseCommand(input, player, world, playerDB, allPlayers = null, activeInteractions = null, combatEngine = null) {
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
      command(player, args, world, playerDB, allPlayers, activeInteractions, combatEngine);
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