/**
 * Help command - Display available commands
 */

const colors = require('../../colors');
const emoteRegistry = require('../emotes/registry');

/**
 * Execute help command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length > 0 && args[0].toLowerCase() === 'emote') {
    const emoteNames = emoteRegistry.map(e => e.name).sort().join(', ');
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
}

module.exports = {
  name: 'help',
  aliases: [],
  execute,
  help: {
    description: 'Display available commands',
    usage: 'help [topic]',
    examples: ['help', 'help emote']
  }
};
