/**
 * Console Command Binding
 * Provides console/REPL interface for admin commands
 */

const readline = require('readline');
const {
  kickCommand,
  banCommand,
  unbanCommand,
  addlevelCommand,
  removelevelCommand,
  killCommand,
  spawnCommand,
  promoteCommand,
  demoteCommand
} = require('./commands');

/**
 * Create a mock player object for console commands
 * Console commands are executed with Creator privileges
 */
function createConsolePlayer() {
  const messages = [];

  return {
    username: 'CONSOLE',
    role: 'Creator',
    send: (msg) => {
      const cleaned = msg.replace(/\x1b\[[0-9;]*m/g, ''); // Strip ANSI codes
      console.log(cleaned);
      messages.push(cleaned);
    },
    socket: {
      remoteAddress: '127.0.0.1'
    },
    messages: messages
  };
}

/**
 * Initialize console interface for admin commands
 * @param {Object} context - Command context
 */
function initConsoleInterface(context) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'admin> '
  });

  console.log('\n=== Admin Console Interface ===');
  console.log('Type "help" for available commands, "exit" to quit\n');
  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      rl.prompt();
      return;
    }

    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      console.log('Exiting console interface...');
      rl.close();
      return;
    }

    // Parse command
    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const consolePlayer = createConsolePlayer();

    // Command map
    const commandMap = {
      'kick': kickCommand,
      'ban': banCommand,
      'unban': unbanCommand,
      'addlevel': addlevelCommand,
      'removelevel': removelevelCommand,
      'kill': killCommand,
      'spawn': spawnCommand,
      'promote': promoteCommand,
      'demote': demoteCommand,
      'help': async (player, args, context) => {
        console.log('\nAvailable Console Commands:');
        console.log('  kick <player> [reason]');
        console.log('  ban <player|ip> [hours] [reason]');
        console.log('  unban <player|ip>');
        console.log('  addlevel <player> <delta>');
        console.log('  removelevel <player> <levels>');
        console.log('  kill <player|npc>');
        console.log('  spawn <itemId> [qty]');
        console.log('  promote <player> <role>');
        console.log('  demote <player> [role]');
        console.log('  bans - List all active bans');
        console.log('  roles - List all player roles');
        console.log('  exit - Exit console interface\n');
      },
      'bans': async (player, args, context) => {
        const bans = context.adminService.listBans();
        if (bans.length === 0) {
          console.log('\nNo active bans.\n');
        } else {
          console.log('\nActive Bans:');
          console.log('============');
          for (const ban of bans) {
            const target = ban.playerName || ban.playerID || ban.ip;
            const expires = ban.expiresAt ? new Date(ban.expiresAt).toLocaleString() : 'Never';
            console.log(`  ${target}`);
            console.log(`    Reason: ${ban.reason}`);
            console.log(`    Issuer: ${ban.issuerName || ban.issuer}`);
            console.log(`    Expires: ${expires}`);
            console.log('');
          }
        }
      },
      'roles': async (player, args, context) => {
        const roles = context.adminService.roles;
        const roleList = Object.entries(roles).sort((a, b) => {
          const rankOrder = { Creator: 3, Sheriff: 2, Admin: 1, Player: 0 };
          return (rankOrder[b[1].role] || 0) - (rankOrder[a[1].role] || 0);
        });

        if (roleList.length === 0) {
          console.log('\nNo assigned roles.\n');
        } else {
          console.log('\nAssigned Roles:');
          console.log('===============');
          for (const [playerID, roleData] of roleList) {
            console.log(`  ${roleData.lastKnownName || playerID} (${playerID})`);
            console.log(`    Role: ${roleData.role}`);
            console.log(`    Granted by: ${roleData.grantedBy || 'Unknown'}`);
            console.log(`    Granted at: ${new Date(roleData.grantedAt).toLocaleString()}`);
            console.log('');
          }
        }
      }
    };

    const handler = commandMap[command];

    if (handler) {
      try {
        await handler(consolePlayer, args, context);
      } catch (err) {
        console.error(`Error executing command '${command}':`, err);
      }
    } else {
      console.log(`Unknown command: ${command}`);
      console.log('Type "help" for available commands.\n');
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nConsole interface closed.');
  });

  return rl;
}

/**
 * Execute a single console command (for programmatic use)
 * @param {string} commandLine - Command line to execute
 * @param {Object} context - Command context
 */
async function executeConsoleCommand(commandLine, context) {
  const parts = commandLine.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  const consolePlayer = createConsolePlayer();

  const commandMap = {
    'kick': kickCommand,
    'ban': banCommand,
    'unban': unbanCommand,
    'addlevel': addlevelCommand,
    'removelevel': removelevelCommand,
    'kill': killCommand,
    'spawn': spawnCommand,
    'promote': promoteCommand,
    'demote': demoteCommand
  };

  const handler = commandMap[command];

  if (handler) {
    await handler(consolePlayer, args, context);
    return { success: true, messages: consolePlayer.messages };
  } else {
    return { success: false, error: `Unknown command: ${command}` };
  }
}

module.exports = {
  initConsoleInterface,
  executeConsoleCommand,
  createConsolePlayer
};
