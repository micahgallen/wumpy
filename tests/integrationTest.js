/**
 * Integration Test - Complete Combat Sequence
 *
 * Tests a full combat encounter from initiation to resolution
 */

const { TestRunner, assert } = require('./testRunner');
const CombatRegistry = require('../src/systems/combat/CombatRegistry');
const { processCombatRound, endCombat } = require('../src/systems/combat/CombatResolver');
const { createPlayerCombatStats, createNpcCombatStats } = require('../src/data/CombatStats');
const { isAlive } = require('../src/data/CombatStats');

const runner = new TestRunner('Integration Tests - Complete Combat Sequence');

// Helper to create test entities
function createTestPlayer(id, overrides = {}) {
  const base = createPlayerCombatStats(1);
  return {
    id: id,
    username: 'TestPlayer' + id.substring(id.length - 3),
    currentRoom: 'test_room',
    ...base,
    ...overrides
  };
}

function createTestNpc(id, overrides = {}) {
  const npcDef = {
    level: 1,
    maxHp: 8,
    armorClass: 14,
    str: 10,
    dex: 12,
    con: 10,
    int: 8,
    wis: 10,
    cha: 6,
    damageDice: '1d6',
    damageType: 'physical',
    proficiency: 2,
    ...overrides
  };

  const stats = createNpcCombatStats(npcDef);
  return {
    id: id,
    name: 'TestGoblin' + id.substring(id.length - 3),
    roomId: 'test_room',
    ...stats
  };
}

// Mock entity storage
const entities = new Map();

function getEntity(id) {
  return entities.get(id);
}

function sendMessage(entityId, message) {
  // Mock message sending - just store for verification
  const entity = entities.get(entityId);
  if (entity) {
    if (!entity.messages) entity.messages = [];
    entity.messages.push(message);
  }
}

// Integration Test 1: Complete 1v1 Combat
runner.test('Integration - Complete 1v1 combat sequence', () => {
  CombatRegistry.clearAll();
  entities.clear();

  // Create combatants
  const player = createTestPlayer('player_1', {
    str: 14,  // +2 modifier
    proficiency: 2,
    currentHp: 15,
    maxHp: 15,
    currentWeapon: {
      name: 'Sword',
      damageDice: '1d8',
      damageType: 'physical'
    }
  });

  const goblin = createTestNpc('goblin_1', {
    currentHp: 8,
    maxHp: 8
  });

  entities.set(player.id, player);
  entities.set(goblin.id, goblin);

  // Initiate combat
  const combat = CombatRegistry.initiateCombat(player, goblin, 'player', 'npc');

  assert.notNull(combat);
  assert.equal(combat.participants.length, 2);
  assert.true(combat.isActive);

  // Process rounds until combat ends
  let maxRounds = 20; // Safety limit
  let roundCount = 0;
  let lastResult = null;

  while (combat.isActive && roundCount < maxRounds) {
    lastResult = processCombatRound(combat, getEntity, sendMessage);
    roundCount++;

    if (lastResult.ended) {
      break;
    }
  }

  // Verify combat ended
  assert.true(lastResult.ended, 'Combat should have ended');
  assert.true(roundCount > 0, 'At least one round should have been processed');
  assert.true(roundCount < maxRounds, 'Combat should not exceed safety limit');

  // Verify one combatant died
  const playerAlive = isAlive(player);
  const goblinAlive = isAlive(goblin);
  assert.true(playerAlive !== goblinAlive, 'Exactly one combatant should be alive');

  // Verify combat registry state (may still be in if not manually ended)
  // Note: In real implementation, endCombat should be called explicitly

  console.log(`  Combat lasted ${roundCount} rounds`);
  console.log(`  Winner: ${playerAlive ? player.username : goblin.name}`);
});

// Integration Test 2: Multiple Combatants
runner.test('Integration - Multi-participant combat', () => {
  CombatRegistry.clearAll();
  entities.clear();

  // Create combatants
  const player1 = createTestPlayer('player_1', { currentHp: 12, maxHp: 12 });
  const player2 = createTestPlayer('player_2', { currentHp: 12, maxHp: 12 });
  const goblin1 = createTestNpc('goblin_1', { currentHp: 8, maxHp: 8 });
  const goblin2 = createTestNpc('goblin_2', { currentHp: 8, maxHp: 8 });

  entities.set(player1.id, player1);
  entities.set(player2.id, player2);
  entities.set(goblin1.id, goblin1);
  entities.set(goblin2.id, goblin2);

  // Initiate combat with first two
  const combat = CombatRegistry.initiateCombat(player1, goblin1, 'player', 'npc');

  // Add additional participants
  CombatRegistry.addParticipant(combat.id, player2, 'player');
  CombatRegistry.addParticipant(combat.id, goblin2, 'npc');

  assert.equal(combat.participants.length, 4);

  // Process rounds
  let maxRounds = 30;
  let roundCount = 0;

  while (combat.isActive && roundCount < maxRounds) {
    const result = processCombatRound(combat, getEntity, sendMessage);
    roundCount++;

    if (result.ended) {
      break;
    }
  }

  // Verify combat ended
  assert.true(roundCount < maxRounds, 'Combat should end before max rounds');

  console.log(`  Multi-combat lasted ${roundCount} rounds`);
});

// Integration Test 3: Advantage/Disadvantage System
runner.test('Integration - Advantage/Disadvantage mechanics', () => {
  CombatRegistry.clearAll();
  entities.clear();

  const { grantAdvantage, grantDisadvantage } = require('../src/systems/combat/AttackRoll');

  const player = createTestPlayer('player_1', { currentHp: 20, maxHp: 20 });
  const goblin = createTestNpc('goblin_1', { currentHp: 15, maxHp: 15 });

  entities.set(player.id, player);
  entities.set(goblin.id, goblin);

  const combat = CombatRegistry.initiateCombat(player, goblin, 'player', 'npc');
  const playerParticipant = CombatRegistry.getParticipant(combat.id, player.id);

  // Grant advantage to player
  grantAdvantage(playerParticipant, 'flanking', 2);

  assert.equal(playerParticipant.advantageCount, 1);
  assert.equal(playerParticipant.effects.length, 1);

  // Process a round
  const result = processCombatRound(combat, getEntity, sendMessage);

  assert.true(result.actions.length > 0);

  // Check that advantage was applied (rolls should have 2 dice)
  const playerAction = result.actions.find(a => a.attackerId === player.id);
  if (playerAction) {
    assert.equal(playerAction.result.rolls.length, 2, 'Should roll twice with advantage');
  }

  console.log(`  Advantage mechanics working correctly`);
});

// Integration Test 4: Resistance and Vulnerability
runner.test('Integration - Damage resistance and vulnerability', () => {
  CombatRegistry.clearAll();
  entities.clear();

  const player = createTestPlayer('player_1', {
    currentHp: 20,
    maxHp: 20,
    currentWeapon: {
      name: 'Flaming Sword',
      damageDice: '1d8',
      damageType: 'fire'
    }
  });

  const fireResistantGoblin = createTestNpc('goblin_1', {
    currentHp: 15,
    maxHp: 15,
    resistances: { fire: 0.5 }
  });

  entities.set(player.id, player);
  entities.set(fireResistantGoblin.id, fireResistantGoblin);

  const combat = CombatRegistry.initiateCombat(player, fireResistantGoblin, 'player', 'npc');

  // Process one round
  const result = processCombatRound(combat, getEntity, sendMessage);

  // Find player's attack
  const playerAttack = result.actions.find(a => a.attackerId === player.id);

  if (playerAttack && playerAttack.result.hit && playerAttack.result.damage > 0) {
    // Verify resistance was applied
    const damageBreakdown = playerAttack.result.damageBreakdown;
    if (damageBreakdown) {
      assert.true(damageBreakdown.wasResisted, 'Damage should be resisted');
      assert.equal(damageBreakdown.multiplier, 0.5);
      console.log(`  Resistance applied: ${damageBreakdown.baseDamage} -> ${damageBreakdown.finalDamage}`);
    }
  }
});

// Integration Test 5: Combat Round Statistics
runner.test('Integration - Combat round produces valid statistics', () => {
  CombatRegistry.clearAll();
  entities.clear();

  const player = createTestPlayer('player_1');
  const goblin = createTestNpc('goblin_1');

  entities.set(player.id, player);
  entities.set(goblin.id, goblin);

  const combat = CombatRegistry.initiateCombat(player, goblin, 'player', 'npc');

  // Process multiple rounds and collect stats
  const stats = {
    totalRounds: 0,
    totalHits: 0,
    totalMisses: 0,
    totalCriticals: 0,
    totalFumbles: 0,
    totalDamage: 0
  };

  for (let i = 0; i < 10; i++) {
    if (!combat.isActive) break;

    const result = processCombatRound(combat, getEntity, sendMessage);
    stats.totalRounds++;

    for (const action of result.actions) {
      if (action.result.hit) stats.totalHits++;
      if (!action.result.hit && !action.result.fumble) stats.totalMisses++;
      if (action.result.critical) stats.totalCriticals++;
      if (action.result.fumble) stats.totalFumbles++;
      if (action.result.damage) stats.totalDamage += action.result.damage;
    }

    if (result.ended) break;
  }

  console.log(`  Combat statistics:`, stats);
  assert.true(stats.totalRounds > 0);
  assert.true(stats.totalHits + stats.totalMisses + stats.totalFumbles > 0);
});

// Run tests if this is the main module
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;
