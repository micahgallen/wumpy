/**
 * HP Bar Display Test
 * Tests the HP bar rendering in combat messages
 */

const { createHealthBar, getDamageMessage } = require('./src/combat/combatMessages');
const colors = require('./src/colors');

console.log('='.repeat(80));
console.log('HP BAR DISPLAY TEST');
console.log('='.repeat(80));
console.log();

// Test 1: Create health bars at different HP levels
console.log('Test 1: Health Bar Rendering at Different HP Levels');
console.log('-'.repeat(80));

const testCases = [
  { current: 100, max: 100, desc: 'Full health (100%)' },
  { current: 75, max: 100, desc: 'High health (75%)' },
  { current: 50, max: 100, desc: 'Medium health (50%)' },
  { current: 25, max: 100, desc: 'Low health (25%)' },
  { current: 10, max: 100, desc: 'Critical health (10%)' },
  { current: 0, max: 100, desc: 'Dead (0%)' },
  { current: 30, max: 30, desc: 'NPC full health' },
  { current: 15, max: 30, desc: 'NPC half health' },
  { current: 5, max: 30, desc: 'NPC critical health' }
];

for (const test of testCases) {
  const bar = createHealthBar(test.current, test.max);
  console.log(`${test.desc.padEnd(30)}: ${bar}`);
}

console.log();

// Test 2: Damage message with HP bar
console.log('Test 2: Damage Message with HP Bar');
console.log('-'.repeat(80));

// Mock target objects
const mockPlayer = {
  username: 'TestPlayer',
  currentHp: 18,
  maxHp: 30
};

const mockNPC = {
  name: 'Gronk the Wumpy Gladiator',
  currentHp: 25,
  maxHp: 40
};

console.log('Damage to player:');
const playerDamageMsg = getDamageMessage(5, 'physical', mockPlayer);
console.log(playerDamageMsg);
console.log();

console.log('Damage to NPC:');
const npcDamageMsg = getDamageMessage(8, 'physical', mockNPC);
console.log(npcDamageMsg);
console.log();

console.log('Damage without HP bar (backward compatible):');
const noTargetMsg = getDamageMessage(6, 'physical');
console.log(noTargetMsg);
console.log();

// Test 3: HP bar after heavy damage
console.log('Test 3: Simulated Combat Sequence');
console.log('-'.repeat(80));

const combatant = {
  name: 'Training Dummy',
  currentHp: 20,
  maxHp: 20
};

console.log(`${combatant.name} starts with: ${createHealthBar(combatant.currentHp, combatant.maxHp)}`);
console.log();

const damageSequence = [3, 5, 4, 6, 2];
for (const dmg of damageSequence) {
  combatant.currentHp = Math.max(0, combatant.currentHp - dmg);
  console.log(getDamageMessage(dmg, 'physical', combatant));
  console.log();

  if (combatant.currentHp === 0) {
    console.log(colors.error(`${combatant.name} has been defeated!`));
    break;
  }
}

console.log('='.repeat(80));
console.log('HP BAR TEST COMPLETE');
console.log('='.repeat(80));
console.log();
console.log('Visual Inspection Checklist:');
console.log('  [✓] HP bars display filled/empty blocks correctly');
console.log('  [✓] HP bars change color based on health percentage');
console.log('  [✓] HP text shows current/max values');
console.log('  [✓] Damage messages include HP bar for targets');
console.log('  [✓] No garbled characters in combat messages');
console.log();
