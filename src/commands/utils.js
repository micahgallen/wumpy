/**
 * Command Utilities
 * Shared helper functions used across multiple commands
 * Extracted from src/commands.js to support modular command architecture
 */

const colors = require('../colors');

/**
 * Monty Python taunts used by the taunt emote
 */
const taunts = [
  'I don\'t want to talk to you no more, you empty-headed animal food trough water! ',
  'I fart in your general direction! Your mother was a hamster and your father smelt of elderberries!',
  'Go and boil your bottoms, sons of a silly person!',
  'I wave my private parts at your aunties, you cheesy lot of second-hand electric donkey-bottom biters!',
  'Go away or I shall taunt you again!'
];

/**
 * Mapping of directions to their opposite for arrival messages
 */
const oppositeDirection = {
  north: 'the south',
  south: 'the north',
  east: 'the west',
  west: 'the east',
  up: 'below',
  down: 'above'
};

/**
 * Emote definitions with message templates
 * Each emote has noTarget and optionally withTarget functions
 */
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

/**
 * Find a player in the same room by name
 * @param {string} playerName - Name to search for
 * @param {Object} player - The player doing the search
 * @param {Set} allPlayers - Set of all connected players
 * @returns {Object|null} Player object or null if not found
 */
function findPlayerInRoom(playerName, player, allPlayers) {
  for (const p of allPlayers) {
    if (p.username.toLowerCase() === playerName.toLowerCase() && p.currentRoom === player.currentRoom) {
      return p;
    }
  }
  return null;
}

/**
 * Get emote messages for a given emote name
 * @param {string} emoteName - Name of the emote
 * @param {Object} player - Player performing the emote
 * @param {Object|null} target - Target player (optional)
 * @returns {Object|null} Message object with self/target/room messages or null if emote not found
 */
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

/**
 * Broadcast an emote to player, target, and room
 * @param {Object} player - Player performing the emote
 * @param {Object|null} target - Target player (optional)
 * @param {Set} allPlayers - Set of all connected players
 * @param {string} selfMessage - Message shown to the player
 * @param {string|null} targetMessage - Message shown to target (if target exists)
 * @param {string} roomMessage - Message shown to others in room
 */
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
 * Check for aggressive NPCs in player's room and initiate combat if needed
 * @param {Object} player - Player object
 * @param {Object} world - World object
 * @param {Object} combatEngine - CombatEngine instance
 */
function checkAggressiveNPCs(player, world, combatEngine) {
  const room = world.getRoom(player.currentRoom);
  if (room && room.npcs) {
    for (const npcId of room.npcs) {
      const npc = world.getNPC(npcId);
      if (npc && npc.aggressive) {
        const isPlayerInCombat = combatEngine.activeCombats.some(c => c.participants.some(p => p.username === player.username));
        if (!isPlayerInCombat) {
          combatEngine.initiateCombat([npc, player]);
          break; // For now, only one NPC attacks
        }
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
 * @param {Object} combatEngine - CombatEngine instance
 */
function movePlayer(player, direction, world, playerDB, allPlayers, combatEngine) {
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

  // Call look command from registry to show the new room
  const registry = require('./registry');
  const lookCommand = registry.getCommand('look');
  if (lookCommand) {
    lookCommand.execute(player, [], { world, playerDB: playerDB, allPlayers });
  }

  // Check for aggressive NPCs
  checkAggressiveNPCs(player, world, combatEngine);
}

module.exports = {
  taunts,
  oppositeDirection,
  emoteDefinitions,
  findPlayerInRoom,
  getEmoteMessages,
  broadcastEmote,
  checkAggressiveNPCs,
  movePlayer
};
