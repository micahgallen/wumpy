const net = require('net');

const client = new net.Socket();

const HOST = 'localhost';
const PORT = 4000;

const uniqueUsername = `testuser_${Date.now()}`;
const password = 'password';

const gameCommands = [
  'attack big bird',
  'score',
  'attack big bird',
  'score',
  'quit'
];

let gameCommandIndex = 0;
let loginState = 'USERNAME'; // USERNAME, CREATE_CONFIRM, PASSWORD, PLAYING

client.connect(PORT, HOST, () => {
  console.log('Connected to MUD server');
});

client.on('data', (data) => {
  const response = data.toString();
  console.log('Received: ' + response);

  let commandToSend = null;

  switch (loginState) {
    case 'USERNAME':
      if (response.includes('Username:')) {
        commandToSend = uniqueUsername;
        loginState = 'CREATE_CONFIRM';
      }
      break;
    case 'CREATE_CONFIRM':
      if (response.includes('Create it? (yes/no):')) {
        commandToSend = 'yes';
        loginState = 'PASSWORD';
      }
      break;
    case 'PASSWORD':
      if (response.includes('Choose a password:')) {
        commandToSend = password;
        loginState = 'PLAYING';
      }
      break;
    case 'PLAYING':
      if (response.includes('>')) {
        if (gameCommandIndex < gameCommands.length) {
          commandToSend = gameCommands[gameCommandIndex++];
        } else {
          client.destroy();
          return;
        }
      }
      break;
  }

  if (commandToSend !== null) {
    console.log(`Sending: ${commandToSend}`);
    client.write(commandToSend + '\n');
  } else if (loginState === 'PLAYING' && !response.includes('>')) {
    // If in playing state but no prompt, wait for next data chunk
  } else if (loginState !== 'PLAYING') {
    // If not in playing state and no command sent, it means we are waiting for the next prompt
  }
});

client.on('close', () => {
  console.log('Connection closed');
});

client.on('error', (err) => {
  console.error('Connection error: ' + err.stack);
});
