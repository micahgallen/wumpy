const { TestRunner, assert } = require('./testRunner');
const chatCommand = require('../src/commands/core/chat');
const colors = require('../src/colors'); // Assuming colors are used for formatting

const runner = new TestRunner('Chat Command Tests');

// Helper to create mock player objects
function createMockPlayer(id, username, capname = null) {
  const player = {
    id: id,
    username: username,
    capname: capname,
    messages: [], // To store messages sent to this player
    send: function(message) {
      this.messages.push(message);
    }
  };
  return player;
}

runner.test('Player sends a global chat message, all players receive it', () => {
  const player1 = createMockPlayer('p1', 'PlayerOne', 'CapPlayerOne');
  const player2 = createMockPlayer('p2', 'PlayerTwo');
  const player3 = createMockPlayer('p3', 'PlayerThree', 'CapPlayerThree');

  const allPlayers = new Set([player1, player2, player3]);
  const context = { allPlayers: allPlayers };

  const testMessage = 'Hello everyone!';
  chatCommand.execute(player1, testMessage.split(' '), context);

  const expectedMessage = colors.info(`[GLOBAL CHAT] ${player1.capname}: ${testMessage}\n`);

  // Assert that all players received the message
  assert.equal(player1.messages.length, 1, 'Player1 should receive their own message');
  assert.equal(player1.messages[0], expectedMessage, 'Player1 received correct message');

  assert.equal(player2.messages.length, 1, 'Player2 should receive the message');
  assert.equal(player2.messages[0], expectedMessage, 'Player2 received correct message');

  assert.equal(player3.messages.length, 1, 'Player3 should receive the message');
  assert.equal(player3.messages[0], expectedMessage, 'Player3 received correct message');
});

runner.test('Player sends an empty global chat message, only sender gets error', () => {
  const player1 = createMockPlayer('p1', 'PlayerOne');
  const player2 = createMockPlayer('p2', 'PlayerTwo');

  const allPlayers = new Set([player1, player2]);
  const context = { allPlayers: allPlayers };

  chatCommand.execute(player1, [], context); // Empty args for empty message

  const expectedErrorMessage = colors.error('What do you want to chat?\n');

  // Assert that only player1 received the error message
  assert.equal(player1.messages.length, 1, 'Player1 should receive an error message');
  assert.equal(player1.messages[0], expectedErrorMessage, 'Player1 received correct error message');

  assert.equal(player2.messages.length, 0, 'Player2 should not receive any message');
});

runner.test('Player with capname sends message, capname is used', () => {
  const player1 = createMockPlayer('p1', 'PlayerOne', 'TheGreatOne');
  const player2 = createMockPlayer('p2', 'PlayerTwo');

  const allPlayers = new Set([player1, player2]);
  const context = { allPlayers: allPlayers };

  const testMessage = 'Behold my glory!';
  chatCommand.execute(player1, testMessage.split(' '), context);

  const expectedMessage = colors.info(`[GLOBAL CHAT] ${player1.capname}: ${testMessage}\n`);

  assert.equal(player1.messages.length, 1);
  assert.equal(player1.messages[0], expectedMessage);
  assert.equal(player2.messages.length, 1);
  assert.equal(player2.messages[0], expectedMessage);
});

runner.test('Player without capname sends message, username is used', () => {
  const player1 = createMockPlayer('p1', 'PlayerOne'); // No capname
  const player2 = createMockPlayer('p2', 'PlayerTwo');

  const allPlayers = new Set([player1, player2]);
  const context = { allPlayers: allPlayers };

  const testMessage = 'Just a regular guy here.';
  chatCommand.execute(player1, testMessage.split(' '), context);

  const expectedMessage = colors.info(`[GLOBAL CHAT] ${player1.username}: ${testMessage}\n`);

  assert.equal(player1.messages.length, 1);
  assert.equal(player1.messages[0], expectedMessage);
  assert.equal(player2.messages.length, 1);
  assert.equal(player2.messages[0], expectedMessage);
});

// Run tests if this is the main module
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;
