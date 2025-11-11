/**
 * Light Candles Command
 * Interactive feature for relighting birthday cake candles
 * Because some people just want to watch the world burn. Again.
 */

const colors = require('../../colors');

/**
 * Generate the ASCII fire warning message
 * @returns {string} Colorful ASCII art showing the renewed inferno
 */
function getFireWarning() {
  const lines = [
    '',
    colors.colorize('    🔥  🔥  🔥  🔥  🔥  🔥  🔥  🔥  🔥  🔥  🔥  🔥', colors.ANSI.BRIGHT_RED),
    colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED) + colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED) + colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED) + colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED) + colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED) + colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED),
    '',
    colors.colorize('  ███████╗██╗██████╗ ███████╗  ██╗', colors.ANSI.BRIGHT_RED),
    colors.colorize('  ██╔════╝██║██╔══██╗██╔════╝  ██║', colors.ANSI.BRIGHT_RED),
    colors.colorize('  █████╗  ██║██████╔╝█████╗    ██║', colors.ANSI.BRIGHT_YELLOW),
    colors.colorize('  ██╔══╝  ██║██╔══██╗██╔══╝    ╚═╝', colors.ANSI.BRIGHT_YELLOW),
    colors.colorize('  ██║     ██║██║  ██║███████╗  ██╗', colors.ANSI.BRIGHT_RED),
    colors.colorize('  ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝  ╚═╝', colors.ANSI.BRIGHT_RED),
    '',
    colors.colorize('           ╔═╗╔═╗╔═╗╦╔╗╔  ┬', colors.ANSI.BRIGHT_YELLOW),
    colors.colorize('           ╠═╣║ ╦╠═╣║║║║  │', colors.ANSI.BRIGHT_YELLOW),
    colors.colorize('           ╩ ╩╚═╝╩ ╩╩╝╚╝  o', colors.ANSI.BRIGHT_YELLOW),
    '',
    colors.colorize('  🔥', colors.ANSI.BRIGHT_RED) + colors.colorize('  All FORTY candles have been reignited!', colors.ANSI.WHITE) + colors.colorize('  🔥', colors.ANSI.BRIGHT_RED),
    colors.colorize('  🌡️', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  The ambient temperature rises to "Arizona summer in a sauna."', colors.ANSI.WHITE) + colors.colorize('  🌡️', colors.ANSI.BRIGHT_YELLOW),
    colors.colorize('  📈', colors.ANSI.BRIGHT_MAGENTA) + colors.colorize('  Fire insurance premiums immediately skyrocket.', colors.ANSI.WHITE) + colors.colorize('  📈', colors.ANSI.BRIGHT_MAGENTA),
    colors.colorize('  🚒', colors.ANSI.BRIGHT_CYAN) + colors.colorize('  The fire marshal begins pre-filling out incident reports.', colors.ANSI.WHITE) + colors.colorize('  🚒', colors.ANSI.BRIGHT_CYAN),
    '',
    colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED) + colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED) + colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED) + colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED) + colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED) + colors.colorize('  💥', colors.ANSI.BRIGHT_YELLOW) + colors.colorize('  ⚠️', colors.ANSI.BRIGHT_RED),
    colors.colorize('    🔥  🔥  🔥  🔥  🔥  🔥  🔥  🔥  🔥  🔥  🔥  🔥', colors.ANSI.BRIGHT_RED),
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
      reactions.push(colors.npcSay(`${bert.name} lets out a sound that can only be described as "soul-leaving-body shriek." He clutches his clipboard so hard it cracks, stammering "NO! WHO DID THIS?! WE WERE SAFE! WE WERE FINALLY SAFE!" His eye twitches so violently that his unibrow does a little dance. He immediately begins pacing again, this time muttering about "arsonists" and "why won't they let me have this ONE THING."`));
    }
  }

  if (room.npcs.includes('cookie_monster_helpful')) {
    const cookieMonster = world.getNPC('cookie_monster_helpful');
    if (cookieMonster) {
      reactions.push(colors.npcSay(`${cookieMonster.name} was literally mid-lunge toward the safe cake when the flames erupted. He freezes in place, one fuzzy blue arm still extended, his googly eyes going wide. "But... but... me was SO CLOSE to cake!" He slowly backs away, devastated, and slumps against a wall. "Me wait so long. SO LONG." A single cookie tear rolls down his fuzzy cheek.`));
    }
  }

  if (room.npcs.includes('ernie_relaxed')) {
    const ernie = world.getNPC('ernie_relaxed');
    if (ernie) {
      reactions.push(colors.npcSay(`${ernie.name} IMMEDIATELY perks up, dropping his disappointment like a hot potato. "OH BOY! IT'S BACK! THE FIRE IS BACK!" He starts applauding enthusiastically. "This is the BEST birthday party EVER! Can we do this all day? I bet we can toast marshmallows again!" He's already pulling another marshmallow out of somewhere. "Hey Bert, want to see how close I can get without singing my eyebrows?"`));
    }
  }

  if (room.npcs.includes('big_bird')) {
    const bigBird = world.getNPC('big_bird');
    if (bigBird) {
      reactions.push(colors.npcSay(`${bigBird.name} was halfway through his cautious approach when the candles reignited. His eyes go wide and he IMMEDIATELY retreats back to the blast radius perimeter, feathers ruffled. "I KNEW IT! I TOLD MR. SNUFFLEUPAGUS IT WASN'T SAFE!" He positions himself behind a conveniently placed pillar. "This is exactly like that time with the bottle rockets in 1972! Nobody listened then either!"`));
    }
  }

  return reactions;
}

/**
 * Execute the light candles command
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
    player.send('\n' + colors.error('There are no candles to light here.\n'));
    player.send(colors.hint('Maybe look for a birthday cake?\n'));
    return;
  }

  // Get the cake object to check its state
  const cake = world.getObject('texan_birthday_cake');

  if (!cake) {
    player.send('\n' + colors.error('Something went wrong with the cake.\n'));
    return;
  }

  // Check if candles are already lit
  if (!cake.candlesBlownOut) {
    player.send('\n' + colors.info('The candles are already blazing magnificently.\n'));
    player.send(colors.hint('In fact, they\'re creating what local fire codes would classify as "a situation."\n'));
    player.send(colors.subtle('Bert is already having a nervous breakdown. Please don\'t make it worse.\n'));
    return;
  }

  // LIGHT THE CANDLES!

  // Send the chaos to the player who lit the candles
  player.send('\n' + colors.success('You produce a lighter and methodically relight all FORTY candles!\n'));
  player.send(colors.warning('What have you DONE?\n'));
  player.send('\n' + getFireWarning() + '\n');

  // Get NPC reactions
  const npcReactions = getNPCReactions(room, world);
  if (npcReactions.length > 0) {
    player.send('\n' + npcReactions.join('\n\n') + '\n');
  }

  // Broadcast to everyone else in the room
  const broadcastMessage = [
    '',
    colors.emote(`${player.getDisplayName()} produces a lighter and begins methodically relighting all FORTY candles!`),
    '',
    colors.warning('🔥 The flames spring back to life with enthusiastic vengeance!'),
    colors.warning('🌡️  The ambient temperature rises approximately 15 degrees in seconds!'),
    colors.warning('📈 Local fire insurance companies detect the disturbance in the Force.'),
    colors.warning('🚨 Somewhere, a fire marshal\'s phone begins ringing.'),
    colors.error('💀 The cake has returned to "controlled inferno" status!'),
    ''
  ].join('\n');

  world.sendToRoom(player.currentRoom, broadcastMessage, [player.username], allPlayers);

  // Send NPC reactions to other players too
  if (npcReactions.length > 0) {
    world.sendToRoom(player.currentRoom, '\n' + npcReactions.join('\n\n') + '\n', [player.username], allPlayers);
  }

  // Mark the candles as LIT again
  cake.candlesBlownOut = false;

  // Restore the original cake description (the blazing inferno version)
  cake.description = "A massive three-tier birthday cake sits here, crowned with FORTY blazing candles that have collectively achieved what can only be described as 'controlled inferno' status. The frosting reads 'Happy 40th Birthday Texan!' in cheerful blue icing that's beginning to melt at an alarming rate. The cake itself appears to be chocolate, though it's hard to tell through the shimmering heat waves. Several nearby Muppets are maintaining what fire safety professionals would call 'a healthy respect distance.' You're fairly certain you can feel your eyebrows warming up just standing here.";

  cake.examine_text = "Upon closer inspection (and frankly, you're braver than most), this is clearly a professionally-made cake that someone has weaponized with FORTY candles. Each candle burns with the enthusiasm of a small sun. The frosting has developed several concerning drip patterns, and you notice scorch marks on the cake plate. A small fire extinguisher has been strategically placed nearby, presumably as a statement piece. The number '4-0' is emblazoned on the top tier in what might be silver fondant or might be melted aluminum - it's hard to tell at this temperature. You estimate the total thermal output at approximately 'one Swedish sauna' or 'half a dragon sneeze.'";
}

module.exports = {
  name: 'light',
  aliases: ['relight', 'ignite'],
  execute,
  help: {
    description: 'Light candles on a birthday cake',
    usage: 'light candles',
    examples: [
      'light candles - Relight birthday candles',
      'light - Works the same way',
      'relight candles - Also relights the candles',
      'ignite candles - Because you\'re that kind of person'
    ]
  }
};
