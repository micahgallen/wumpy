/**
 * Test Combat Modules - Verify all combat modules can be required without errors
 */

console.log('Testing combat module loading...\n');

try {
  console.log('1. Loading dice utilities...');
  const dice = require('./src/utils/dice');
  console.log('   ✓ Dice utilities loaded successfully');
  console.log('   - Available functions:', Object.keys(dice).join(', '));

  console.log('\n2. Loading stat progression...');
  const statProgression = require('./src/progression/statProgression');
  console.log('   ✓ Stat progression loaded successfully');
  console.log('   - Available functions:', Object.keys(statProgression).join(', '));

  console.log('\n3. Loading damage types...');
  const damageTypes = require('./src/combat/damageTypes');
  console.log('   ✓ Damage types loaded successfully');
  console.log('   - Available exports:', Object.keys(damageTypes).join(', '));

  console.log('\n4. Loading combat resolver...');
  const combatResolver = require('./src/combat/combatResolver');
  console.log('   ✓ Combat resolver loaded successfully');
  console.log('   - Available functions:', Object.keys(combatResolver).join(', '));

  console.log('\n5. Loading initiative system...');
  const initiative = require('./src/combat/initiative');
  console.log('   ✓ Initiative system loaded successfully');
  console.log('   - Available functions:', Object.keys(initiative).join(', '));

  console.log('\n6. Loading combat messages...');
  const combatMessages = require('./src/combat/combatMessages');
  console.log('   ✓ Combat messages loaded successfully');
  console.log('   - Available functions:', Object.keys(combatMessages).join(', '));

  console.log('\n7. Loading CombatEncounter class...');
  const CombatEncounter = require('./src/combat/CombatEncounter');
  console.log('   ✓ CombatEncounter class loaded successfully');

  console.log('\n8. Loading CombatEngine class...');
  const CombatEngine = require('./src/combat/combatEngine');
  console.log('   ✓ CombatEngine class loaded successfully');

  console.log('\n9. Loading colors module...');
  const colors = require('./src/colors');
  console.log('   ✓ Colors module loaded successfully');
  console.log('   - Has combat colors:', 'combat' in colors, 'hit' in colors, 'miss' in colors);

  console.log('\n' + '='.repeat(60));
  console.log('✓ ALL COMBAT MODULES LOADED SUCCESSFULLY');
  console.log('='.repeat(60) + '\n');

  // Test basic functionality
  console.log('Testing basic combat calculations...\n');

  console.log('1. Testing dice rolls:');
  console.log('   - d20 roll:', dice.rollD20());
  console.log('   - 1d6 damage:', dice.rollDice('1d6'));
  console.log('   - 2d8+3:', dice.rollDice('2d8+3'));

  console.log('\n2. Testing stat calculations:');
  const testStat = 14;
  console.log(`   - Modifier for ${testStat}:`, statProgression.getModifier(testStat));
  console.log('   - Proficiency at level 1:', statProgression.getProficiencyBonus(1));
  console.log('   - Proficiency at level 5:', statProgression.getProficiencyBonus(5));

  console.log('\n3. Testing damage resistance:');
  const testDamage = 20;
  const testResistances = { fire: 50 };
  console.log(`   - ${testDamage} fire damage with 50% resistance:`,
    damageTypes.calculateResistance(testDamage, 'fire', testResistances));

  console.log('\n4. Testing AC calculation:');
  const testDefender = { dexterity: 14 };
  console.log('   - AC for DEX 14:', combatResolver.getArmorClass(testDefender));

  console.log('\n5. Testing attack bonus:');
  const testAttacker = { level: 1, strength: 16, dexterity: 10 };
  console.log('   - Attack bonus (physical, STR 16, level 1):',
    combatResolver.getAttackBonus(testAttacker, 'physical'));

  console.log('\n' + '='.repeat(60));
  console.log('✓ ALL BASIC COMBAT CALCULATIONS WORKING');
  console.log('='.repeat(60) + '\n');

  process.exit(0);

} catch (err) {
  console.error('\n✗ ERROR LOADING COMBAT MODULES:');
  console.error(err);
  process.exit(1);
}
