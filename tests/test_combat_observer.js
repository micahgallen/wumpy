/**
 * Test Combat Observer Functionality
 * Verifies that players in the same room who are not participating in combat
 * can observe the combat messages (bug fix verification)
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
  constructor(name, hp = 10) {
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
console.log('COMBAT OBSERVER TEST - Bug Fix Verification');
console.log('='.repeat(70));

try {
  // Create mock objects
  const world = new MockWorld();
  const fighter1 = new MockPlayer('Fighter1', 30);
  const fighter2 = new MockPlayer('Fighter2', 30);
  const observer1 = new MockPlayer('Observer1', 20);
  const observer2 = new MockPlayer('Observer2', 20);

  // All players are in the same room
  const allPlayers = new Set([fighter1, fighter2, observer1, observer2]);

  console.log('\nTest Setup:');
  console.log(`  Combatants: ${fighter1.username}, ${fighter2.username}`);
  console.log(`  Observers: ${observer1.username}, ${observer2.username}`);
  console.log(`  All players in room: test_room`);

  // Create combat encounter between fighter1 and fighter2
  console.log('\n' + '-'.repeat(70));
  console.log('Creating Combat Encounter...');
  console.log('-'.repeat(70));
  const encounter = new CombatEncounter([fighter1, fighter2], world, allPlayers);

  // Clear messages from setup
  fighter1.messages = [];
  fighter2.messages = [];
  observer1.messages = [];
  observer2.messages = [];

  // Initiate combat
  console.log('\nInitiating Combat...');
  encounter.initiateCombat();

  // Check that all players received the "Combat has begun!" message
  console.log('\nVerifying "Combat has begun!" message:');
  const verifyMessage = (player, expectedCount, role) => {
    const count = player.messages.length;
    const status = count === expectedCount ? '✓' : '✗';
    console.log(`  ${status} ${player.username} (${role}): received ${count} message(s)`);
    return count === expectedCount;
  };

  let allPassed = true;
  allPassed &= verifyMessage(fighter1, 1, 'combatant');
  allPassed &= verifyMessage(fighter2, 1, 'combatant');
  allPassed &= verifyMessage(observer1, 1, 'observer');
  allPassed &= verifyMessage(observer2, 1, 'observer');

  // Clear messages and execute one combat round
  fighter1.messages = [];
  fighter2.messages = [];
  observer1.messages = [];
  observer2.messages = [];

  console.log('\n' + '-'.repeat(70));
  console.log('Executing One Combat Round...');
  console.log('-'.repeat(70));
  encounter.executeCombatRound();

  // Check that all players received combat action messages
  console.log('\nVerifying Combat Action Messages:');

  const checkObserverMessages = (player, role) => {
    const count = player.messages.length;
    const hasMessages = count > 0;
    const status = hasMessages ? '✓' : '✗';
    console.log(`  ${status} ${player.username} (${role}): received ${count} message(s)`);

    if (count > 0) {
      console.log(`      Sample messages:`);
      player.messages.slice(0, 2).forEach((msg, idx) => {
        const preview = msg.trim().substring(0, 60);
        console.log(`        ${idx + 1}. ${preview}...`);
      });
    }

    return hasMessages;
  };

  console.log('\n  Combatants:');
  const combatant1HasMessages = checkObserverMessages(fighter1, 'combatant');
  const combatant2HasMessages = checkObserverMessages(fighter2, 'combatant');

  console.log('\n  Observers (CRITICAL - these should receive messages):');
  const observer1HasMessages = checkObserverMessages(observer1, 'observer');
  const observer2HasMessages = checkObserverMessages(observer2, 'observer');

  // Final verification
  console.log('\n' + '='.repeat(70));
  const observersReceivedMessages = observer1HasMessages && observer2HasMessages;
  const combatantsReceivedMessages = combatant1HasMessages && combatant2HasMessages;

  if (observersReceivedMessages && combatantsReceivedMessages && allPassed) {
    console.log('✓ COMBAT OBSERVER TEST PASSED');
    console.log('  - Combatants received combat messages');
    console.log('  - Observers in the same room received combat messages');
    console.log('  - Bug fix successful: All players in room see combat dialogue');
  } else {
    console.log('✗ COMBAT OBSERVER TEST FAILED');
    if (!combatantsReceivedMessages) {
      console.log('  - ERROR: Combatants did not receive messages');
    }
    if (!observersReceivedMessages) {
      console.log('  - ERROR: Observers did not receive combat messages');
      console.log('  - This is the bug we are trying to fix!');
    }
    if (!allPassed) {
      console.log('  - ERROR: Not all players received initial combat message');
    }
  }
  console.log('='.repeat(70) + '\n');

  process.exit(observersReceivedMessages && combatantsReceivedMessages && allPassed ? 0 : 1);

} catch (err) {
  console.error('\n✗ ERROR IN COMBAT OBSERVER TEST:');
  console.error(err);
  console.error('\nStack trace:');
  console.error(err.stack);
  process.exit(1);
}
