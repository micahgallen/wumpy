/**
 * Visual Test for Score Command XP Progress Bar
 *
 * This script tests the score command display with various XP levels
 */

const colors = require('../src/colors');
const { getXPForLevel } = require('../src/progression/xpTable');

// Mock socket for capturing output
class MockSocket {
  constructor() {
    this.output = '';
  }
  write(msg) {
    this.output += msg;
  }
}

// Create test player at various progress levels
function createTestPlayer(level, xpPercent) {
  const socket = new MockSocket();
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const xpNeeded = nextLevelXP - currentLevelXP;
  const xp = currentLevelXP + Math.floor(xpNeeded * xpPercent);

  return {
    username: 'TestHero',
    socket: socket,
    level: level,
    xp: xp,
    hp: 25,
    maxHp: 30,
    strength: 12,
    dexterity: 14,
    constitution: 11,
    intelligence: 10,
    wisdom: 13,
    charisma: 9,
    inventory: ['sword', 'shield'],
    isGhost: false,
    send: (msg) => socket.write(msg)
  };
}

// Load commands module
const { commands } = require('../src/commands');

console.log(colors.info('\n' + '='.repeat(70)));
console.log(colors.info('Score Command Visual Tests'));
console.log(colors.info('='.repeat(70) + '\n'));

// Test 1: Just started (0% progress)
console.log(colors.highlight('Test 1: Level 1, 0% XP Progress'));
console.log(colors.line(35, '-'));
const player1 = createTestPlayer(1, 0);
commands.score(player1, [], null, null);
console.log(player1.socket.output);

// Test 2: Mid-progress (50%)
console.log(colors.highlight('Test 2: Level 1, 50% XP Progress'));
console.log(colors.line(35, '-'));
const player2 = createTestPlayer(1, 0.5);
commands.score(player2, [], null, null);
console.log(player2.socket.output);

// Test 3: Almost level-up (95%)
console.log(colors.highlight('Test 3: Level 1, 95% XP Progress'));
console.log(colors.line(35, '-'));
const player3 = createTestPlayer(1, 0.95);
commands.score(player3, [], null, null);
console.log(player3.socket.output);

// Test 4: Higher level
console.log(colors.highlight('Test 4: Level 10, 30% XP Progress'));
console.log(colors.line(35, '-'));
const player4 = createTestPlayer(10, 0.3);
commands.score(player4, [], null, null);
console.log(player4.socket.output);

// Test 5: Low HP
console.log(colors.highlight('Test 5: Level 5, Low HP (20%)'));
console.log(colors.line(35, '-'));
const player5 = createTestPlayer(5, 0.6);
player5.hp = 6;
player5.maxHp = 30;
commands.score(player5, [], null, null);
console.log(player5.socket.output);

// Test 6: Ghost status
console.log(colors.highlight('Test 6: Level 3, Ghost Status'));
console.log(colors.line(35, '-'));
const player6 = createTestPlayer(3, 0.4);
player6.isGhost = true;
commands.score(player6, [], null, null);
console.log(player6.socket.output);

console.log(colors.info('='.repeat(70)));
console.log(colors.success('All visual tests displayed successfully!'));
console.log(colors.info('='.repeat(70) + '\n'));
