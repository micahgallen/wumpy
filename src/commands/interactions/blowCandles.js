/**
 * Blow Candles Command
 * Interactive feature for blowing out birthday cake candles
 */

const colors = require('../../colors');

/**
 * Generate the ASCII confetti celebration message
 * @returns {string} Colorful ASCII art celebration
 */
function getConfettiCelebration() {
  const lines = [
    '',
    colors.colorize('    ✨  ✨  ✨  ✨  ✨  ✨  ✨  ✨  ✨  ✨  ✨  ✨', colors.ANSI.BRIGHT_YELLOW),
    colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN),
    '',
    colors.colorize('  ╦ ╦╔═╗╔═╗╔═╗╦ ╦  ╔╗ ╦╦═╗╔╦╗╦ ╦╔╦╗╔═╗╦ ╦', colors.ANSI.BRIGHT_CYAN),
    colors.colorize('  ╠═╣╠═╣╠═╝╠═╝╚╦╝  ╠╩╗║╠╦╝ ║ ╠═╣ ║║╠═╣╚╦╝', colors.ANSI.BRIGHT_MAGENTA),
    colors.colorize('  ╩ ╩╩ ╩╩  ╩   ╩   ╚═╝╩╩╚═ ╩ ╩ ╩═╩╝╩ ╩ ╩', colors.ANSI.BRIGHT_YELLOW),
    '',
    colors.colorize('           ╔╦╗╔═╗═╗ ╦╔═╗╔╗╔  ┬', colors.ANSI.BRIGHT_RED),
    colors.colorize('            ║ ║╣ ╔╩╦╝╠═╣║║║  │', colors.ANSI.BRIGHT_RED),
    colors.colorize('            ╩ ╚═╝╩ ╚═╩ ╩╝╚╝  o', colors.ANSI.BRIGHT_RED),
    '',
    colors.colorize('  🎂', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  The cake is now 47% less likely to spontaneously ignite!', colors.ANSI.WHITE) + colors.colorize('  🎂', colors.ANSI.BRIGHT_YELLOW),
    colors.colorize('  🔥', colors.ANSI.BRIGHT_RED) + colors.colorize('  Fire safety officers everywhere breathe a sigh of relief.', colors.ANSI.WHITE) + colors.colorize('  🔥', colors.ANSI.BRIGHT_RED),
    colors.colorize('  🍰', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  The ambient temperature drops to merely "sauna-like."', colors.ANSI.WHITE) + colors.colorize('  🍰', colors.ANSI.BRIGHT_MAGENTA),
    '',
    colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  🎊', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  🎉', colors.ANSI.BRIGHT_CYAN),
    colors.colorize('    ✨  ✨  ✨  ✨  ✨  ✨  ✨  ✨  ✨  ✨  ✨  ✨', colors.ANSI.BRIGHT_YELLOW),
    ''
  ];

  return lines.join('\n');
}

/**
 * Get NPC reactions based on who's in the room
 * @param {Object} room - The room object
 * @param {Object} world - The world object
 * @returns {Array<string>} Array of NPC reaction messages
 */
function getNPCReactions(room, world) {
  const reactions = [];

  if (!room.npcs || room.npcs.length === 0) {
    return reactions;
  }

  // Check which NPCs are present and add their reactions
  if (room.npcs.includes('bert_fire_safety')) {
    const bert = world.getNPC('bert_fire_safety');
    if (bert) {
      reactions.push(colors.npcSay(`${bert.name} IMMEDIATELY stops pacing, clutches his clipboard to his chest, and whispers "Thank the Department of Municipal Fire Safety..." with visible tears in his eyes.`));
    }
  }

  if (room.npcs.includes('cookie_monster_helpful')) {
    const cookieMonster = world.getNPC('cookie_monster_helpful');
    if (cookieMonster) {
      reactions.push(colors.npcSay(`${cookieMonster.name} yells "CAKE NOW SAFE TO EAT! ME VOLUNTEER FOR CAKE DISPOSAL!" and lunges toward the cake with alarming speed.`));
    }
  }

  if (room.npcs.includes('ernie_relaxed')) {
    const ernie = world.getNPC('ernie_relaxed');
    if (ernie) {
      reactions.push(colors.npcSay(`${ernie.name} looks disappointed and says "Aww, and I was just about to suggest we add sparklers..." while sadly eating his marshmallow.`));
    }
  }

  if (room.npcs.includes('big_bird')) {
    const bigBird = world.getNPC('big_bird');
    if (bigBird) {
      reactions.push(colors.npcSay(`${bigBird.name} cautiously approaches from the blast radius perimeter, saying "Can someone tell Mr. Snuffleupagus it's safe to come back now?"`));
    }
  }

  return reactions;
}

/**
 * Execute the blow candles command
 * @param {Object} player - Player object
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { world, allPlayers } = context;

  // Check if player is in a room with the birthday cake
  const room = world.getRoom(player.currentRoom);
  if (!room) {
    player.send('\n' + colors.error('You are nowhere.\n'));
    return;
  }

  // Check if the birthday cake is in this room
  const hasCake = room.objects && room.objects.includes('texan_birthday_cake');

  if (!hasCake) {
    player.send('\n' + colors.error('There are no candles to blow out here.\n'));
    player.send(colors.hint('Maybe look for a birthday cake?\n'));
    return;
  }

  // Get the cake object to check its state
  const cake = world.getObject('texan_birthday_cake');

  if (!cake) {
    player.send('\n' + colors.error('Something went wrong with the cake.\n'));
    return;
  }

  // Check if candles are already blown out
  if (cake.candlesBlownOut) {
    player.send('\n' + colors.info('The candles have already been blown out.\n'));
    player.send(colors.hint('The cake sits there peacefully, no longer a fire hazard.\n'));
    player.send(colors.subtle('Cookie Monster is eyeing it with increasing urgency.\n'));
    return;
  }

  // BLOW OUT THE CANDLES!

  // Send the celebration to the player who blew the candles
  player.send('\n' + colors.success('You take a deep breath and blow out all FORTY candles in one mighty exhale!\n'));
  player.send('\n' + getConfettiCelebration() + '\n');

  // Get NPC reactions
  const npcReactions = getNPCReactions(room, world);
  if (npcReactions.length > 0) {
    player.send('\n' + npcReactions.join('\n\n') + '\n');
  }

  // Broadcast to everyone else in the room
  const broadcastMessage = [
    '',
    colors.emote(`${player.getDisplayName()} takes a deep breath and BLOWS OUT ALL FORTY CANDLES in a single, heroic exhale!`),
    '',
    colors.info('💨 The force of wind is impressive. Several streamers flutter dramatically.'),
    colors.info('🔥 Forty tiny flames surrender simultaneously to the power of human lungs.'),
    colors.info('🌡️  The ambient temperature drops approximately 15 degrees.'),
    colors.info('📉 Local fire insurance premiums immediately decrease.'),
    colors.success('✨ The cake is now safe! (Relatively speaking.)'),
    ''
  ].join('\n');

  world.sendToRoom(player.currentRoom, broadcastMessage, [player.username], allPlayers);

  // Send NPC reactions to other players too
  if (npcReactions.length > 0) {
    world.sendToRoom(player.currentRoom, '\n' + npcReactions.join('\n\n') + '\n', [player.username], allPlayers);
  }

  // Mark the candles as blown out
  cake.candlesBlownOut = true;

  // Update the cake description
  cake.description = "A massive three-tier birthday cake sits here, slightly less alarming now that someone has heroically extinguished its FORTY candles. The frosting still reads 'Happy 40th Birthday Texan!' in cheerful blue icing, though it's developed some interesting melt patterns. The cake itself appears to be chocolate and is now at a temperature that might actually be safe for human consumption. Several nearby Muppets have visibly relaxed. You notice Cookie Monster circling the cake like a fuzzy blue shark. The scorch marks on the cake plate serve as a memorial to the brief but intense thermal event that was 'forty candles at once.'";

  cake.examine_text = "Upon closer inspection, this is clearly a professionally-made cake that survived its own weaponization. The forty candles stand like defeated soldiers - waxy, slightly melted, but no longer a threat to regional power grids. The frosting has permanent drip patterns that tell the story of thermal chaos. The number '4-0' is still emblazoned on the top tier, now looking less like a threat warning and more like a achievement badge. The fire extinguisher remains strategically placed nearby, though it seems less urgent now. You estimate the current thermal output at approximately 'room temperature cake' or 'one Cookie Monster appetite.'";
}

module.exports = {
  name: 'blow',
  aliases: ['blowout'],
  execute,
  help: {
    description: 'Blow out candles on a birthday cake',
    usage: 'blow candles',
    examples: [
      'blow candles - Blow out birthday candles',
      'blow - Works the same way'
    ]
  }
};
