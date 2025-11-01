/**
 * Test gameplay flow and UX improvements
 */

const net = require('net');

const client = new net.Socket();
let commandsSent = 0;

const commands = [
  'testuser2',     // Username
  'y',             // Create account
  'test123',       // Password
  'look',          // Look at room
  'i',             // Inventory
  'quit'           // Quit
];

function sendNextCommand() {
  if (commandsSent < commands.length) {
    const cmd = commands[commandsSent];
    console.log(`\n>>> Sending: ${cmd}`);
    client.write(cmd + '\n');
    commandsSent++;
  }
}

client.connect(4000, '127.0.0.1', () => {
  console.log('=== CONNECTED TO MUD ===\n');
});

client.on('data', (data) => {
  const text = data.toString();
  console.log(text);

  // Auto-send next command after brief delay
  setTimeout(() => {
    sendNextCommand();
  }, 200);
});

client.on('close', () => {
  console.log('\n=== SESSION ENDED ===');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});
