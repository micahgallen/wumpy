const { TestRunner, assert } = require('./testRunner');
const { Role } = require('../src/admin/permissions');
const gotoCommand = require('../src/commands/admin/goto');
const lookCommand = require('../src/commands/core/look');

const runner = new TestRunner('goto command');

// Helper to create a mock player
const createMockPlayer = (username, role, currentRoom) => ({
  username,
  role,
  currentRoom,
  sent: [],
  send: function(msg) { this.sent.push(msg); },
  getDisplayName: () => username,
});

// Stash original look command execute
const originalLookExecute = lookCommand.execute;
let lookCalled = false;

runner.test('should allow an admin to teleport to a player', () => {
  const admin = createMockPlayer('Admin', Role.ADMIN, 'roomA');
  const player1 = createMockPlayer('Player1', Role.PLAYER, 'roomB');
  
  const roomA = { id: 'roomA', name: 'Room A', players: [admin] };
  const roomB = { id: 'roomB', name: 'Room B', players: [player1] };
  
  const world = {
    getRoom: (roomId) => (roomId === 'roomA' ? roomA : roomB),
    sendToRoom: () => {},
    rooms: { roomA, roomB },
  };
  
  const allPlayers = [admin, player1];
  lookCommand.execute = () => { lookCalled = true; };
  
  const context = { world, allPlayers };

  gotoCommand.execute(admin, ['Player1'], context);

  assert.equal(admin.currentRoom, 'roomB', 'Admin should be in player1s room');
  assert.true(admin.sent.some(msg => msg.includes('You have been teleported to Player1\'s location')), 'Admin did not receive confirmation');
  assert.true(player1.sent.some(msg => msg.includes('Admin has teleported to your location')), 'Player1 was not notified');
  assert.true(lookCalled, 'Look command was not called');
  
  // Reset for next test
  lookCalled = false;
  lookCommand.execute = originalLookExecute;
});

runner.test('should not allow a non-admin to use the command', () => {
  const player1 = createMockPlayer('Player1', Role.PLAYER, 'roomB');
  const result = gotoCommand.guard(player1);
  assert.false(result.allowed, 'Guard should have denied access');
  assert.equal(result.reason, 'You do not have permission to use this command.', 'Guard reason is incorrect');
});

runner.test('should return an error if the target player does not exist', () => {
  const admin = createMockPlayer('Admin', Role.ADMIN, 'roomA');
  const context = { allPlayers: [admin] };

  gotoCommand.execute(admin, ['NonExistent'], context);

  assert.true(admin.sent.some(msg => msg.includes('Player "NonExistent" not found or is not online.')), 'Error message not sent for non-existent player');
  assert.equal(admin.currentRoom, 'roomA', 'Admin should not have moved');
});

runner.test('should return an error if no player name is provided', () => {
  const admin = createMockPlayer('Admin', Role.ADMIN, 'roomA');
  gotoCommand.execute(admin, [], {});
  assert.true(admin.sent.some(msg => msg.includes('You must specify a player to go to.')), 'Error message not sent for missing argument');
});

runner.test('should return an error when trying to goto self', () => {
  const admin = createMockPlayer('Admin', Role.ADMIN, 'roomA');
  const context = { allPlayers: [admin] };
  gotoCommand.execute(admin, ['Admin'], context);
  assert.true(admin.sent.some(msg => msg.includes('You are already at your own location.')), 'Error message not sent for self-goto');
});

runner.test('should return an error if admin is already in target player\'s room', () => {
  const admin = createMockPlayer('Admin', Role.ADMIN, 'roomA');
  const player1 = createMockPlayer('Player1', Role.PLAYER, 'roomA'); // Player1 is in the same room as admin
  
  const roomA = { id: 'roomA', name: 'Room A', players: [admin, player1] };
  
  const world = {
    getRoom: (roomId) => (roomId === 'roomA' ? roomA : null),
    sendToRoom: () => {},
    rooms: { roomA },
  };
  
  const allPlayers = [admin, player1];
  const context = { world, allPlayers };

  gotoCommand.execute(admin, ['Player1'], context);

  assert.true(admin.sent.some(msg => msg.includes('You are already in Player1\'s location: Room A.')), 'Error message not sent for already in room');
  assert.equal(admin.currentRoom, 'roomA', 'Admin should not have moved');
});

// Export the runner to be used by a master test script
module.exports = runner;

if (require.main === module) {
  runner.run();
}