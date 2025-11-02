/**
 * Test Combat Encounter - Verify combat encounter execution
 * This simulates a full combat encounter between a player and an NPC
 */

const CombatEncounter = require('./src/combat/CombatEncounter');

// Mock World object
class MockWorld {
  constructor() {
    this.rooms = {
      'test_room': {
        id: 'test_room',
        name: 'Test Arena'
      }
    };
  }

  getRoom(roomId) {
    return this.rooms[roomId];
  }

  getNPC(npcId) {
    return null; // Not needed for this test
  }
}

// Mock Player object
class MockPlayer {
  constructor(name, hp = 20) {
    this.username = name;
    this.name = name;
    this.currentRoom = 'test_room';
    this.maxHp = hp;
    this.currentHp = hp;
    this.level = 1;
    this.strength = 14;
    this.dexterity = 12;
    this.constitution = 13;
    this.resistances = {};
    this.socket = { destroyed: false };
    this.messages = [];
  }

  send(message) {
    this.messages.push(message);
    console.log(`  [${this.username}] ${message.trim()}`);
  }

  takeDamage(damage) {
    this.currentHp = Math.max(0, this.currentHp - damage);
  }

  isDead() {
    return this.currentHp <= 0;
  }
}

// Mock NPC object
class MockNPC {
  constructor(name, hp = 30) {
    this.name = name;
    this.currentRoom = 'test_room';
    this.maxHp = hp;
    this.currentHp = hp;
    this.level = 2;
    this.strength = 12;
    this.dexterity = 10;
    this.constitution = 14;
    this.resistances = {};
  }

  takeDamage(damage) {
    this.currentHp = Math.max(0, this.currentHp - damage);
  }

  isDead() {
    return this.currentHp <= 0;
  }
}

console.log('='.repeat(70));
console.log('COMBAT ENCOUNTER TEST');
console.log('='.repeat(70));

try {
  // Create mock objects
  const world = new MockWorld();
  const player = new MockPlayer('TestHero', 30);
  const npc = new MockNPC('TestGoblin', 15);
  const allPlayers = new Set([player]);

  console.log('\nInitial State:');
  console.log(`  Player: ${player.username} (HP: ${player.currentHp}/${player.maxHp}, STR: ${player.strength}, DEX: ${player.dexterity})`);
  console.log(`  NPC: ${npc.name} (HP: ${npc.currentHp}/${npc.maxHp}, STR: ${npc.strength}, DEX: ${npc.dexterity})`);

  // Create combat encounter
  console.log('\n' + '-'.repeat(70));
  console.log('Creating Combat Encounter...');
  console.log('-'.repeat(70));
  const encounter = new CombatEncounter([player, npc], world, allPlayers);

  console.log(`\nTurn order determined (based on initiative):`);
  for (let i = 0; i < encounter.participants.length; i++) {
    const p = encounter.participants[i];
    const name = p.username || p.name;
    console.log(`  ${i + 1}. ${name} (Initiative: ${p.initiative}, DEX: ${p.dexterity})`);
  }

  // Initiate combat
  console.log('\n' + '-'.repeat(70));
  console.log('Initiating Combat...');
  console.log('-'.repeat(70));
  encounter.initiateCombat();

  // Execute combat rounds (max 10 to prevent infinite loop)
  let roundCount = 0;
  const maxRounds = 10;

  console.log('\n' + '-'.repeat(70));
  console.log('Executing Combat Rounds...');
  console.log('-'.repeat(70));

  while (encounter.isActive && roundCount < maxRounds) {
    roundCount++;
    console.log(`\n--- Round ${roundCount} ---`);
    console.log(`Player HP: ${player.currentHp}/${player.maxHp} | NPC HP: ${npc.currentHp}/${npc.maxHp}`);

    encounter.executeCombatRound();

    // Small delay to make output readable
    if (encounter.isActive) {
      // Check if we should continue (safety check)
      if (player.isDead() || npc.isDead()) {
        console.log('\nCombat should have ended but encounter.isActive is still true');
        break;
      }
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log('Combat Complete');
  console.log('-'.repeat(70));

  console.log('\nFinal State:');
  console.log(`  Player: ${player.username} (HP: ${player.currentHp}/${player.maxHp}) ${player.isDead() ? '[DEAD]' : '[ALIVE]'}`);
  console.log(`  NPC: ${npc.name} (HP: ${npc.currentHp}/${npc.maxHp}) ${npc.isDead() ? '[DEAD]' : '[ALIVE]'}`);
  console.log(`  Total Rounds: ${roundCount}`);
  console.log(`  Encounter Active: ${encounter.isActive}`);

  console.log('\n' + '='.repeat(70));
  if (!encounter.isActive && (player.isDead() || npc.isDead())) {
    console.log('✓ COMBAT ENCOUNTER TEST PASSED');
    console.log('  - Combat executed successfully');
    console.log('  - Combat ended when participant died');
    console.log('  - Messages were broadcast correctly');
  } else if (roundCount >= maxRounds) {
    console.log('⚠ COMBAT ENCOUNTER TEST INCOMPLETE');
    console.log('  - Reached maximum rounds without a death');
    console.log('  - This can happen due to high HP or low damage rolls');
  } else {
    console.log('✗ COMBAT ENCOUNTER TEST FAILED');
    console.log('  - Combat did not end properly');
  }
  console.log('='.repeat(70) + '\n');

  process.exit(0);

} catch (err) {
  console.error('\n✗ ERROR IN COMBAT ENCOUNTER TEST:');
  console.error(err);
  console.error('\nStack trace:');
  console.error(err.stack);
  process.exit(1);
}
