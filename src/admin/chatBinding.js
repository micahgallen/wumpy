/**
 * Chat Command Binding
 * Binds @ commands to the admin command handlers
 */

const {
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
  createemoteCommand
} = require('./commands');

/**
 * List of admin command names
 */
const adminCommands = [
  'kick', 'ban', 'unban', 'addlevel', 'removelevel',
  'slay', 'spawn', 'spawn_full', 'promote', 'demote', 'adminhelp', 'revive', 'createemote'
];

/**
 * Check if input is an admin command (starts with @ or matches admin command name)
 * @param {string} input - User input
 * @returns {boolean}
 */
function isAdminCommand(input) {
  const trimmed = input.trim();

  // Check for @ prefix
  if (trimmed.startsWith('@')) {
    return true;
  }

  // Check if the first word matches an admin command
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  return adminCommands.includes(firstWord);
}

/**
 * Parse admin command from input
 * @param {string} input - User input (e.g., "@kick player1 reason" or "kick player1 reason")
 * @returns {Object} { command: string, args: Array<string> }
 */
function parseAdminCommand(input) {
  let trimmed = input.trim();

  // Remove @ prefix if present
  if (trimmed.startsWith('@')) {
    trimmed = trimmed.substring(1);
  }

  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  return { command, args };
}

/**
 * Execute admin command
 * @param {string} input - Raw command input
 * @param {Object} player - Player object
 * @param {Object} context - Command context
 */
async function executeAdminCommand(input, player, context) {
  const { command, args } = parseAdminCommand(input);

  const commandMap = {
    'kick': kickCommand,
    'ban': banCommand,
    'unban': unbanCommand,
    'addlevel': addlevelCommand,
    'removelevel': removelevelCommand,
    'slay': slayCommand,
    'spawn': spawnCommand,
    'spawn_full': spawnFullCommand,
    'promote': promoteCommand,
    'demote': demoteCommand,
    'adminhelp': adminhelpCommand,
    'help': adminhelpCommand,
    'revive': reviveCommand,
    'createemote': createemoteCommand
  };

  const handler = commandMap[command];

  if (handler) {
    try {
      await handler(player, args, context);
    } catch (err) {
      console.error(`Error executing admin command '${command}':`, err);
      player.send('\nAn error occurred while executing that command.\n');
    }
  } else {
    player.send(`\nUnknown admin command: @${command}\n`);
    player.send('Type @adminhelp for a list of available commands.\n');
  }
}

module.exports = {
  isAdminCommand,
  parseAdminCommand,
  executeAdminCommand
};
