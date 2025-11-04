/**
 * Unit tests for attack command
 */

const { TestRunner, assert } = require('../../testRunner');
const attackCommand = require('../../../src/commands/combat/attack');

const runner = new TestRunner('Attack Command Tests');

/**
 * Test utilities
 */
function createMockPlayer(overrides = {}) {
  const messages = [];
  return {
    username: 'testplayer',
    currentRoom: 'room_1',
    isGhost: false,
    hp: 20,
    maxHp: 20,
    level: 1,
    send: (msg) => messages.push(msg),
    messages,
    ...overrides
  };
}

function createMockNPC(overrides = {}) {
  return {
    id: 'npc_1',
    name: 'Goblin',
    keywords: ['goblin'],
    hp: 10,
    maxHp: 10,
    level: 1,
    aggressive: false,
    timidity: 0.5,
    isDead: () => false,
    ...overrides
  };
}

function createMockWorld(npcs = []) {
  const npcsMap = new Map();
  npcs.forEach(npc => npcsMap.set(npc.id, npc));

  return {
    getRoom: (roomId) => ({
      id: roomId,
      name: 'Test Room',
      npcs: npcs.map(npc => npc.id)
    }),
    getNPC: (npcId) => npcsMap.get(npcId)
  };
}

function createMockCombatEngine() {
  const combats = [];
  return {
    initiateCombat: (participants) => combats.push(participants),
    combats
  };
}

// Test: Command descriptor structure
runner.test('attack command has correct descriptor structure', () => {
  assert.equal(attackCommand.name, 'attack', 'Command name should be "attack"');
  assert.true(Array.isArray(attackCommand.aliases), 'Aliases should be an array');
  assert.true(attackCommand.aliases.includes('kill'), 'Aliases should include "kill"');
  assert.equal(typeof attackCommand.execute, 'function', 'Execute should be a function');
  assert.equal(typeof attackCommand.guard, 'function', 'Guard should be a function');
  assert.true(attackCommand.help !== null, 'Help metadata should exist');
});

// Test: Guard function blocks ghosts
runner.test('guard blocks ghost players', () => {
  const ghostPlayer = createMockPlayer({ isGhost: true });
  const result = attackCommand.guard(ghostPlayer, [], {});
  assert.false(result.allowed, 'Ghost should not be allowed to attack');
  assert.true(result.reason.includes('ghost'), 'Reason should mention ghost');
});

// Test: Guard function allows living players
runner.test('guard allows living players', () => {
  const player = createMockPlayer({ isGhost: false });
  const result = attackCommand.guard(player, [], {});
  assert.true(result.allowed, 'Living player should be allowed to attack');
});

// Test: Attack with no arguments
runner.test('attack with no arguments shows error', () => {
  const player = createMockPlayer();
  const context = { world: createMockWorld([]), combatEngine: createMockCombatEngine() };

  attackCommand.execute(player, [], context);

  assert.equal(player.messages.length, 1, 'Should send one message');
  assert.true(player.messages[0].includes('Attack what?'), 'Should prompt for target');
});

// Test: Attack in invalid room
runner.test('attack in invalid room shows error', () => {
  const player = createMockPlayer({ currentRoom: 'invalid_room' });
  const world = { getRoom: () => null };
  const context = { world, combatEngine: createMockCombatEngine() };

  attackCommand.execute(player, ['goblin'], context);

  assert.equal(player.messages.length, 1, 'Should send one message');
  assert.true(player.messages[0].includes('nowhere'), 'Should indicate invalid room');
});

// Test: Attack non-existent target
runner.test('attack non-existent target shows error', () => {
  const player = createMockPlayer();
  const npc = createMockNPC();
  const world = createMockWorld([npc]);
  const context = { world, combatEngine: createMockCombatEngine() };

  attackCommand.execute(player, ['dragon'], context);

  assert.equal(player.messages.length, 1, 'Should send one message');
  assert.true(player.messages[0].includes('don\'t see'), 'Should indicate target not found');
  assert.true(player.messages[0].includes('dragon'), 'Should echo the target name');
});

// Test: Attack dead NPC
runner.test('attack dead NPC shows error', () => {
  const player = createMockPlayer();
  const deadNpc = createMockNPC({ isDead: () => true });
  const world = createMockWorld([deadNpc]);
  const context = { world, combatEngine: createMockCombatEngine() };

  attackCommand.execute(player, ['goblin'], context);

  assert.equal(player.messages.length, 1, 'Should send one message');
  assert.true(player.messages[0].includes('already dead'), 'Should indicate NPC is dead');
});

// Test: Successful attack initiates combat
runner.test('successful attack initiates combat', () => {
  const player = createMockPlayer();
  const npc = createMockNPC();
  const world = createMockWorld([npc]);
  const combatEngine = createMockCombatEngine();
  const context = { world, combatEngine };

  attackCommand.execute(player, ['goblin'], context);

  assert.equal(combatEngine.combats.length, 1, 'Should initiate one combat');
  assert.equal(combatEngine.combats[0].length, 2, 'Combat should have two participants');
  assert.equal(combatEngine.combats[0][0], player, 'First participant should be player');
  assert.equal(combatEngine.combats[0][1], npc, 'Second participant should be NPC');
});

// Test: Keyword matching (exact match)
runner.test('attack with exact keyword match', () => {
  const player = createMockPlayer();
  const npc = createMockNPC({ keywords: ['goblin', 'warrior'] });
  const world = createMockWorld([npc]);
  const combatEngine = createMockCombatEngine();
  const context = { world, combatEngine };

  attackCommand.execute(player, ['warrior'], context);

  assert.equal(combatEngine.combats.length, 1, 'Should initiate combat with keyword match');
});

// Test: Keyword matching (partial match)
runner.test('attack with partial keyword match', () => {
  const player = createMockPlayer();
  const npc = createMockNPC({ keywords: ['goblin'] });
  const world = createMockWorld([npc]);
  const combatEngine = createMockCombatEngine();
  const context = { world, combatEngine };

  attackCommand.execute(player, ['big', 'goblin'], context);

  assert.equal(combatEngine.combats.length, 1, 'Should initiate combat with partial match');
});

// Test: NPC retaliation - becomes aggressive
runner.test('NPC with low timidity becomes aggressive', () => {
  const player = createMockPlayer();
  const npc = createMockNPC({ timidity: 0.01 }); // Very likely to retaliate
  const world = createMockWorld([npc]);
  const combatEngine = createMockCombatEngine();
  const context = { world, combatEngine };

  // Run multiple times to increase probability
  let becameAggressive = false;
  for (let i = 0; i < 10; i++) {
    npc.aggressive = false;
    player.messages = [];
    attackCommand.execute(player, ['goblin'], context);
    if (npc.aggressive) {
      becameAggressive = true;
      break;
    }
  }

  assert.true(becameAggressive, 'NPC with low timidity should become aggressive');
});

// Test: NPC retaliation - already aggressive
runner.test('already aggressive NPC does not trigger message', () => {
  const player = createMockPlayer();
  const npc = createMockNPC({ aggressive: true });
  const world = createMockWorld([npc]);
  const combatEngine = createMockCombatEngine();
  const context = { world, combatEngine };

  attackCommand.execute(player, ['goblin'], context);

  // Should not see "becomes aggressive" message
  const hasAggressiveMessage = player.messages.some(msg => msg.includes('becomes aggressive'));
  assert.false(hasAggressiveMessage, 'Should not show aggressive message for already-aggressive NPC');
});

// Test: Default timidity value
runner.test('NPC without timidity uses default 0.5', () => {
  const player = createMockPlayer();
  const npc = createMockNPC();
  delete npc.timidity;
  const world = createMockWorld([npc]);
  const combatEngine = createMockCombatEngine();
  const context = { world, combatEngine };

  // Should still work without errors
  attackCommand.execute(player, ['goblin'], context);

  assert.equal(combatEngine.combats.length, 1, 'Should initiate combat with default timidity');
});

// Test: Multiple NPCs in room - target correct one
runner.test('attack targets correct NPC when multiple present', () => {
  const player = createMockPlayer();
  const goblin = createMockNPC({ id: 'npc_goblin', name: 'Goblin', keywords: ['goblin'] });
  const orc = createMockNPC({ id: 'npc_orc', name: 'Orc', keywords: ['orc'] });
  const world = createMockWorld([goblin, orc]);
  const combatEngine = createMockCombatEngine();
  const context = { world, combatEngine };

  attackCommand.execute(player, ['orc'], context);

  assert.equal(combatEngine.combats.length, 1, 'Should initiate one combat');
  assert.equal(combatEngine.combats[0][1], orc, 'Should target the orc, not goblin');
});

// Test: Case insensitive matching
runner.test('attack with different case matches keyword', () => {
  const player = createMockPlayer();
  const npc = createMockNPC({ keywords: ['goblin'] });
  const world = createMockWorld([npc]);
  const combatEngine = createMockCombatEngine();
  const context = { world, combatEngine };

  attackCommand.execute(player, ['GOBLIN'], context);

  assert.equal(combatEngine.combats.length, 1, 'Should match case-insensitively');
});

// Test: kill alias works through registry
runner.test('kill alias is registered', () => {
  assert.true(attackCommand.aliases.includes('kill'), 'kill should be registered as an alias');
});

// Run tests if this is the main module
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;
