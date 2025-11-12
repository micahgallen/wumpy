const { TestRunner, assert } = require('./testRunner');
const wumpcomCommand = require('../src/commands/core/wumpcom');
const colors = require('../src/colors');

const runner = new TestRunner('WumpCom Command Tests');

// Helper to create mock player objects
function createMockPlayer(id, username, capname = null) {
  const player = {
    id: id,
    username: username,
    capname: capname,
    state: 'playing', // Active player state
    messages: [], // To store messages sent to this player
    send: function(message) {
      this.messages.push(message);
    },
    sendPrompt: function() {
      // Mock prompt function
    },
    getDisplayName: function() {
      return this.capname || this.username;
    }
  };
  return player;
}

runner.test('Player sends a global wumpcom message, all active players receive it', () => {
  const player1 = createMockPlayer('p1', 'PlayerOne', 'CapPlayerOne');
  const player2 = createMockPlayer('p2', 'PlayerTwo');
  const player3 = createMockPlayer('p3', 'PlayerThree', 'CapPlayerThree');

  const allPlayers = new Set([player1, player2, player3]);
  const context = { allPlayers: allPlayers };

  const testMessage = 'Hello everyone!';
  wumpcomCommand.execute(player1, testMessage.split(' '), context);

  // When capname differs from username, wumpcom shows both for moderation
  const expectedMessage = '\n' + colors.wumpcom(`[WumpCom] CapPlayerOne (@PlayerOne): ${testMessage}`) + '\n';

  // Assert that all players received the message
  assert.equal(player1.messages.length, 1, 'Player1 should receive their own message');
  assert.equal(player1.messages[0], expectedMessage, 'Player1 received correct message');

  assert.equal(player2.messages.length, 1, 'Player2 should receive the message');
  assert.equal(player2.messages[0], expectedMessage, 'Player2 received correct message');

  assert.equal(player3.messages.length, 1, 'Player3 should receive the message');
  assert.equal(player3.messages[0], expectedMessage, 'Player3 received correct message');
});

runner.test('Player sends empty wumpcom message, only sender gets error', () => {
  const player1 = createMockPlayer('p1', 'PlayerOne');
  const player2 = createMockPlayer('p2', 'PlayerTwo');

  const allPlayers = new Set([player1, player2]);
  const context = { allPlayers: allPlayers };

  wumpcomCommand.execute(player1, [], context); // Empty args for empty message

  const expectedErrorMessage = '\n' + colors.error('Wumpcom what? Try "wumpcom [message]"\n');

  // Assert that only player1 received the error message
  assert.equal(player1.messages.length, 1, 'Player1 should receive an error message');
  assert.equal(player1.messages[0], expectedErrorMessage, 'Player1 received correct error message');

  assert.equal(player2.messages.length, 0, 'Player2 should not receive any message');
});

runner.test('Player with capname sends message, capname is displayed with username', () => {
  const player1 = createMockPlayer('p1', 'PlayerOne', 'TheGreatOne');
  const player2 = createMockPlayer('p2', 'PlayerTwo');

  const allPlayers = new Set([player1, player2]);
  const context = { allPlayers: allPlayers };

  const testMessage = 'Behold my glory!';
  wumpcomCommand.execute(player1, testMessage.split(' '), context);

  // When capname differs from username, both are shown for moderation
  const expectedMessage = '\n' + colors.wumpcom(`[WumpCom] TheGreatOne (@PlayerOne): ${testMessage}`) + '\n';

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
  wumpcomCommand.execute(player1, testMessage.split(' '), context);

  const expectedMessage = '\n' + colors.wumpcom(`[WumpCom] ${player1.username}: ${testMessage}`) + '\n';

  assert.equal(player1.messages.length, 1);
  assert.equal(player1.messages[0], expectedMessage);
  assert.equal(player2.messages.length, 1);
  assert.equal(player2.messages[0], expectedMessage);
});

runner.test('Only players in "playing" state receive wumpcom messages', () => {
  const player1 = createMockPlayer('p1', 'PlayerOne');
  const player2 = createMockPlayer('p2', 'PlayerTwo');
  const player3 = createMockPlayer('p3', 'PlayerThree');

  // Set player3 to non-playing state
  player3.state = 'connecting';

  const allPlayers = new Set([player1, player2, player3]);
  const context = { allPlayers: allPlayers };

  const testMessage = 'Hello active players!';
  wumpcomCommand.execute(player1, testMessage.split(' '), context);

  // Only player1 and player2 (playing state) should receive the message
  assert.equal(player1.messages.length, 1, 'Player1 (playing) should receive message');
  assert.equal(player2.messages.length, 1, 'Player2 (playing) should receive message');
  assert.equal(player3.messages.length, 0, 'Player3 (connecting) should NOT receive message');
});

runner.test('Player with capname shows both display name and username for moderation', () => {
  const player1 = createMockPlayer('p1', 'realuser123', 'FancyName');
  const player2 = createMockPlayer('p2', 'PlayerTwo');

  const allPlayers = new Set([player1, player2]);
  const context = { allPlayers: allPlayers };

  const testMessage = 'Testing attribution!';
  wumpcomCommand.execute(player1, testMessage.split(' '), context);

  // Should show "FancyName (@realuser123)" for moderation purposes
  const expectedMessage = '\n' + colors.wumpcom(`[WumpCom] FancyName (@realuser123): ${testMessage}`) + '\n';

  assert.equal(player1.messages[0], expectedMessage, 'Should show capname with username attribution');
});

// Run tests if this is the main module
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;
