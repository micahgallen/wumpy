/**
 * Emote System Tests
 * Tests for the modular emote architecture
 */

const { TestRunner } = require('./testRunner');
const createEmote = require('../src/commands/emotes/createEmote');
const { findPlayerInRoom, broadcastEmote } = require('../src/commands/emotes/emoteUtils');
const emoteRegistry = require('../src/commands/emotes/registry');

const runner = new TestRunner('Emote System');

// Test: createEmote factory validation
runner.test('createEmote throws error for missing name', () => {
  try {
    createEmote({});
    throw new Error('Should have thrown error for missing name');
  } catch (err) {
    if (!err.message.includes('must have a name')) {
      throw new Error(`Wrong error message: ${err.message}`);
    }
  }
});

runner.test('createEmote throws error for missing messages', () => {
  try {
    createEmote({ name: 'test' });
    throw new Error('Should have thrown error for missing messages');
  } catch (err) {
    if (!err.message.includes('must have messages.noTarget')) {
      throw new Error(`Wrong error message: ${err.message}`);
    }
  }
});

runner.test('createEmote throws error for incomplete noTarget messages', () => {
  try {
    createEmote({
      name: 'test',
      messages: {
        noTarget: { self: 'test' }
      }
    });
    throw new Error('Should have thrown error for incomplete noTarget');
  } catch (err) {
    if (!err.message.includes('must have \'self\' and \'room\'')) {
      throw new Error(`Wrong error message: ${err.message}`);
    }
  }
});

runner.test('createEmote creates valid command descriptor', () => {
  const emote = createEmote({
    name: 'test',
    messages: {
      noTarget: {
        self: 'You test.',
        room: 'Someone tests.'
      }
    }
  });

  if (emote.name !== 'test') {
    throw new Error('Name not set correctly');
  }
  if (typeof emote.execute !== 'function') {
    throw new Error('Execute function not created');
  }
  if (emote.description !== 'Perform the test emote') {
    throw new Error('Default description not set');
  }
});

runner.test('createEmote accepts custom help text', () => {
  const emote = createEmote({
    name: 'wave',
    help: {
      description: 'Wave at someone',
      usage: 'wave [target]',
      examples: ['wave', 'wave Bob']
    },
    messages: {
      noTarget: {
        self: 'You wave.',
        room: 'Someone waves.'
      }
    }
  });

  if (emote.description !== 'Wave at someone') {
    throw new Error('Custom description not set');
  }
  if (emote.usage !== 'wave [target]') {
    throw new Error('Custom usage not set');
  }
});

// Test: findPlayerInRoom helper
runner.test('findPlayerInRoom finds player by exact name', () => {
  const player1 = { username: 'Alice', currentRoom: 'room1' };
  const player2 = { username: 'Bob', currentRoom: 'room1' };
  const player3 = { username: 'Charlie', currentRoom: 'room2' };
  const allPlayers = new Set([player1, player2, player3]);

  const found = findPlayerInRoom('Bob', player1, allPlayers);
  if (found !== player2) {
    throw new Error('Did not find correct player');
  }
});

runner.test('findPlayerInRoom is case insensitive', () => {
  const player1 = { username: 'Alice', currentRoom: 'room1' };
  const player2 = { username: 'Bob', currentRoom: 'room1' };
  const allPlayers = new Set([player1, player2]);

  const found = findPlayerInRoom('bob', player1, allPlayers);
  if (found !== player2) {
    throw new Error('Case insensitive search failed');
  }
});

runner.test('findPlayerInRoom returns null for different room', () => {
  const player1 = { username: 'Alice', currentRoom: 'room1' };
  const player2 = { username: 'Bob', currentRoom: 'room2' };
  const allPlayers = new Set([player1, player2]);

  const found = findPlayerInRoom('Bob', player1, allPlayers);
  if (found !== null) {
    throw new Error('Should not find player in different room');
  }
});

runner.test('findPlayerInRoom returns null for non-existent player', () => {
  const player1 = { username: 'Alice', currentRoom: 'room1' };
  const allPlayers = new Set([player1]);

  const found = findPlayerInRoom('Nobody', player1, allPlayers);
  if (found !== null) {
    throw new Error('Should return null for non-existent player');
  }
});

// Test: emote registry
runner.test('emote registry loads all emotes', () => {
  if (!Array.isArray(emoteRegistry)) {
    throw new Error('Registry should be an array');
  }
  if (emoteRegistry.length === 0) {
    throw new Error('Registry should not be empty');
  }
});

runner.test('emote registry contains expected emotes', () => {
  const emoteNames = emoteRegistry.map(e => e.name);
  const expectedEmotes = ['bow', 'dance', 'taunt', 'applaud', 'cackle'];

  for (const expected of expectedEmotes) {
    if (!emoteNames.includes(expected)) {
      throw new Error(`Registry missing expected emote: ${expected}`);
    }
  }
});

runner.test('all emotes in registry have required properties', () => {
  for (const emote of emoteRegistry) {
    if (!emote.name || typeof emote.name !== 'string') {
      throw new Error(`Emote missing valid name: ${JSON.stringify(emote)}`);
    }
    if (typeof emote.execute !== 'function') {
      throw new Error(`Emote ${emote.name} missing execute function`);
    }
    if (!emote.description) {
      throw new Error(`Emote ${emote.name} missing description`);
    }
  }
});

runner.test('emote registry has no duplicate names', () => {
  const names = emoteRegistry.map(e => e.name);
  const uniqueNames = new Set(names);

  if (names.length !== uniqueNames.size) {
    throw new Error('Registry contains duplicate emote names');
  }
});

// Test: specific emotes
runner.test('bow emote exists and has correct structure', () => {
  const bow = emoteRegistry.find(e => e.name === 'bow');
  if (!bow) {
    throw new Error('Bow emote not found in registry');
  }
  if (bow.description !== 'Bow gracefully') {
    throw new Error('Bow emote has wrong description');
  }
});

runner.test('taunt emote exists', () => {
  const taunt = emoteRegistry.find(e => e.name === 'taunt');
  if (!taunt) {
    throw new Error('Taunt emote not found in registry');
  }
});

// Run tests
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;
