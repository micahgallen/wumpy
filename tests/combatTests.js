/**
 * Unit Tests for Combat Systems
 */

const { TestRunner, assert } = require('./testRunner');
const CombatRegistry = require('../src/systems/combat/CombatRegistry');
const { createPlayerCombatStats, createNpcCombatStats } = require('../src/data/CombatStats');

const runner = new TestRunner('Combat System Tests');

// Helper to create test player
function createTestPlayer(overrides = {}) {
  const base = createPlayerCombatStats(1);
  return {
    id: 'player_test_' + Math.random().toString(36).substring(7),
    username: 'TestPlayer',
    currentRoom: 'test_room',
    ...base,
    ...overrides
  };
}

// Helper to create test NPC
function createTestNpc(overrides = {}) {
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
    id: 'npc_test_' + Math.random().toString(36).substring(7),
    name: 'TestGoblin',
    roomId: 'test_room',
    ...stats
  };
}

// Test Combat Registry
runner.test('CombatRegistry - initiate combat creates new combat', () => {
  CombatRegistry.clearAll();

  const player = createTestPlayer();
  const npc = createTestNpc();

  const combat = CombatRegistry.initiateCombat(player, npc, 'player', 'npc');

  assert.notNull(combat);
  assert.equal(combat.participants.length, 2);
  assert.true(combat.isActive);
});

runner.test('CombatRegistry - can find combat for entity', () => {
  CombatRegistry.clearAll();

  const player = createTestPlayer();
  const npc = createTestNpc();

  CombatRegistry.initiateCombat(player, npc, 'player', 'npc');

  const foundCombat = CombatRegistry.getCombatForEntity(player.id);
  assert.notNull(foundCombat);
});

runner.test('CombatRegistry - isInCombat returns true for combatants', () => {
  CombatRegistry.clearAll();

  const player = createTestPlayer();
  const npc = createTestNpc();

  CombatRegistry.initiateCombat(player, npc, 'player', 'npc');

  assert.true(CombatRegistry.isInCombat(player.id));
  assert.true(CombatRegistry.isInCombat(npc.id));
});

runner.test('CombatRegistry - removeParticipant removes entity', () => {
  CombatRegistry.clearAll();

  const player = createTestPlayer();
  const npc = createTestNpc();

  const combat = CombatRegistry.initiateCombat(player, npc, 'player', 'npc');
  CombatRegistry.removeParticipant(combat.id, player.id);

  assert.false(CombatRegistry.isInCombat(player.id));
});

runner.test('CombatRegistry - removing second-to-last participant ends combat', () => {
  CombatRegistry.clearAll();

  const player = createTestPlayer();
  const npc = createTestNpc();

  const combat = CombatRegistry.initiateCombat(player, npc, 'player', 'npc');
  const combatId = combat.id;

  CombatRegistry.removeParticipant(combatId, player.id);

  // Combat should be ended and removed
  assert.isNull(CombatRegistry.getCombat(combatId));
  assert.false(CombatRegistry.isInCombat(npc.id));
});

runner.test('CombatRegistry - addParticipant adds to existing combat', () => {
  CombatRegistry.clearAll();

  const player1 = createTestPlayer();
  const player2 = createTestPlayer();
  const npc = createTestNpc();

  const combat = CombatRegistry.initiateCombat(player1, npc, 'player', 'npc');
  CombatRegistry.addParticipant(combat.id, player2, 'player');

  assert.equal(combat.participants.length, 3);
  assert.true(CombatRegistry.isInCombat(player2.id));
});

runner.test('CombatRegistry - getParticipant returns participant data', () => {
  CombatRegistry.clearAll();

  const player = createTestPlayer();
  const npc = createTestNpc();

  const combat = CombatRegistry.initiateCombat(player, npc, 'player', 'npc');
  const participant = CombatRegistry.getParticipant(combat.id, player.id);

  assert.notNull(participant);
  assert.equal(participant.entityId, player.id);
  assert.equal(participant.entityType, 'player');
});

runner.test('CombatRegistry - clearAll removes all combats', () => {
  CombatRegistry.clearAll();

  const player1 = createTestPlayer();
  const player2 = createTestPlayer();
  const npc1 = createTestNpc();
  const npc2 = createTestNpc();

  CombatRegistry.initiateCombat(player1, npc1, 'player', 'npc');
  CombatRegistry.initiateCombat(player2, npc2, 'player', 'npc');

  const statsBefore = CombatRegistry.getStats();
  assert.equal(statsBefore.activeCombats, 2);

  CombatRegistry.clearAll();

  const statsAfter = CombatRegistry.getStats();
  assert.equal(statsAfter.activeCombats, 0);
  assert.equal(statsAfter.entitiesInCombat, 0);
});

// Test Attack Roll
const { resolveAttackRoll, grantAdvantage, grantDisadvantage } = require('../src/systems/combat/AttackRoll');

runner.test('AttackRoll - resolveAttackRoll returns result object', () => {
  const attacker = createTestPlayer({ str: 14, proficiency: 2 });
  const defender = createTestNpc({ armorClass: 14 });

  CombatRegistry.clearAll();
  const combat = CombatRegistry.initiateCombat(attacker, defender, 'player', 'npc');
  const attackerParticipant = CombatRegistry.getParticipant(combat.id, attacker.id);

  const result = resolveAttackRoll(attacker, defender, attackerParticipant);

  assert.notNull(result);
  assert.true('hit' in result);
  assert.true('critical' in result);
  assert.true('fumble' in result);
  assert.true('rolls' in result);
  assert.true('total' in result);
});

runner.test('AttackRoll - grantAdvantage increases advantage count', () => {
  const attacker = createTestPlayer();
  const defender = createTestNpc();

  CombatRegistry.clearAll();
  const combat = CombatRegistry.initiateCombat(attacker, defender, 'player', 'npc');
  const participant = CombatRegistry.getParticipant(combat.id, attacker.id);

  assert.equal(participant.advantageCount, 0);

  grantAdvantage(participant, 'test', 1);

  assert.equal(participant.advantageCount, 1);
  assert.equal(participant.effects.length, 1);
});

runner.test('AttackRoll - grantDisadvantage increases disadvantage count', () => {
  const attacker = createTestPlayer();
  const defender = createTestNpc();

  CombatRegistry.clearAll();
  const combat = CombatRegistry.initiateCombat(attacker, defender, 'player', 'npc');
  const participant = CombatRegistry.getParticipant(combat.id, attacker.id);

  assert.equal(participant.disadvantageCount, 0);

  grantDisadvantage(participant, 'test', 1);

  assert.equal(participant.disadvantageCount, 1);
  assert.equal(participant.effects.length, 1);
});

// Test Damage Calculator
const { calculateDamage, applyDamageToTarget } = require('../src/systems/combat/DamageCalculator');

runner.test('DamageCalculator - calculateDamage returns damage result', () => {
  const target = createTestNpc();
  const result = calculateDamage('1d6', false, 'physical', target);

  assert.notNull(result);
  assert.true('baseDamage' in result);
  assert.true('finalDamage' in result);
  assert.true('damageType' in result);
  assert.inRange(result.baseDamage, 1, 6);
});

runner.test('DamageCalculator - resistance reduces damage', () => {
  const target = createTestNpc({
    resistances: { fire: 0.5 }
  });

  const result = calculateDamage('2d6', false, 'fire', target);

  assert.true(result.wasResisted);
  assert.equal(result.multiplier, 0.5);
  assert.true(result.finalDamage <= result.baseDamage);
});

runner.test('DamageCalculator - vulnerability increases damage', () => {
  const target = createTestNpc({
    vulnerabilities: ['fire']
  });

  const result = calculateDamage('1d6', false, 'fire', target);

  assert.true(result.wasVulnerable);
  assert.equal(result.multiplier, 2.0);
  assert.equal(result.finalDamage, result.baseDamage * 2);
});

runner.test('DamageCalculator - applyDamageToTarget reduces HP', () => {
  const target = createTestNpc({ currentHp: 10, resistances: {}, vulnerabilities: [] });
  const previousHp = target.currentHp;

  const result = applyDamageToTarget(target, 5, 'physical');

  assert.true(result.damageTaken > 0, 'Should take damage');
  assert.true(target.currentHp < previousHp, 'HP should decrease');
  assert.false(result.died);
});

runner.test('DamageCalculator - applyDamageToTarget detects death', () => {
  const target = createTestNpc({ currentHp: 5 });

  const result = applyDamageToTarget(target, 10, 'physical');

  assert.equal(target.currentHp, 0);
  assert.true(result.died);
});

// Test Combat Stats
const { isAlive, isDead, applyDamage, applyHealing } = require('../src/data/CombatStats');

runner.test('CombatStats - isAlive returns true for living entities', () => {
  const entity = createTestPlayer({ currentHp: 10 });
  assert.true(isAlive(entity));
});

runner.test('CombatStats - isAlive returns false for dead entities', () => {
  const entity = createTestPlayer({ currentHp: 0 });
  assert.false(isAlive(entity));
});

runner.test('CombatStats - applyDamage reduces HP', () => {
  const entity = createTestPlayer({ currentHp: 10 });
  applyDamage(entity, 5);
  assert.equal(entity.currentHp, 5);
});

runner.test('CombatStats - applyHealing restores HP', () => {
  const entity = createTestPlayer({ currentHp: 5, maxHp: 10 });
  applyHealing(entity, 3);
  assert.equal(entity.currentHp, 8);
});

runner.test('CombatStats - applyHealing caps at maxHp', () => {
  const entity = createTestPlayer({ currentHp: 8, maxHp: 10 });
  applyHealing(entity, 5);
  assert.equal(entity.currentHp, 10);
});

// Run tests if this is the main module
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;
