/**
 * Integration Test for Blow Candles Feature
 * Tests command loading and registration
 */

console.log('='.repeat(70));
console.log('BLOW CANDLES FEATURE - INTEGRATION TEST');
console.log('='.repeat(70));
console.log();

// Test 1: Load the command module
console.log('Test 1: Loading blowCandles command module...');
try {
  const blowCandlesCommand = require('../../src/commands/interactions/blowCandles');
  console.log('  ✓ Command module loaded successfully');
  console.log(`  ✓ Command name: "${blowCandlesCommand.name}"`);
  console.log(`  ✓ Aliases: [${blowCandlesCommand.aliases.join(', ')}]`);
} catch (err) {
  console.error('  ❌ FAIL: Could not load command module');
  console.error('  Error:', err.message);
  process.exit(1);
}

// Test 2: Load the command registry
console.log('\nTest 2: Loading command registry...');
try {
  const registry = require('../../src/commands/registry');
  console.log('  ✓ Command registry loaded successfully');
} catch (err) {
  console.error('  ❌ FAIL: Could not load command registry');
  console.error('  Error:', err.message);
  process.exit(1);
}

// Test 3: Load main commands file (registers all commands)
console.log('\nTest 3: Loading main commands file...');
try {
  // Clear the require cache to ensure fresh load
  delete require.cache[require.resolve('../../src/commands')];
  delete require.cache[require.resolve('../../src/commands/registry')];

  const commands = require('../../src/commands');
  console.log('  ✓ Commands file loaded successfully');
} catch (err) {
  console.error('  ❌ FAIL: Could not load commands file');
  console.error('  Error:', err.message);
  console.error('  Stack:', err.stack);
  process.exit(1);
}

// Test 4: Verify command is registered
console.log('\nTest 4: Verifying command registration...');
try {
  const registry = require('../../src/commands/registry');

  const blowCommand = registry.getCommand('blow');
  if (!blowCommand) {
    console.error('  ❌ FAIL: "blow" command not found in registry');
    process.exit(1);
  }
  console.log('  ✓ "blow" command found in registry');

  const blowoutCommand = registry.getCommand('blowout');
  if (!blowoutCommand) {
    console.error('  ❌ FAIL: "blowout" alias not found in registry');
    process.exit(1);
  }
  console.log('  ✓ "blowout" alias found in registry');

  if (blowCommand !== blowoutCommand) {
    console.error('  ❌ FAIL: Alias does not point to same command');
    process.exit(1);
  }
  console.log('  ✓ Alias correctly points to main command');

} catch (err) {
  console.error('  ❌ FAIL: Error checking command registration');
  console.error('  Error:', err.message);
  process.exit(1);
}

// Test 5: Check dependencies
console.log('\nTest 5: Checking dependencies...');
try {
  const colors = require('../../src/colors');
  console.log('  ✓ Colors module loaded');

  // Verify required color functions exist
  const requiredFunctions = [
    'colorize', 'success', 'error', 'info', 'hint', 'emote',
    'npcSay', 'subtle', 'ANSI'
  ];

  for (const func of requiredFunctions) {
    if (!colors[func]) {
      console.error(`  ❌ FAIL: Colors module missing "${func}"`);
      process.exit(1);
    }
  }
  console.log('  ✓ All required color functions available');

} catch (err) {
  console.error('  ❌ FAIL: Error loading dependencies');
  console.error('  Error:', err.message);
  process.exit(1);
}

// Test 6: Check world objects
console.log('\nTest 6: Checking world objects...');
try {
  const World = require('../../src/world');
  const world = new World('./world');

  // Check if birthday cake exists
  const cake = world.getObject('texan_birthday_cake');
  if (!cake) {
    console.error('  ❌ FAIL: Birthday cake object not found');
    process.exit(1);
  }
  console.log('  ✓ Birthday cake object found');
  console.log(`  ✓ Cake name: "${cake.name}"`);

  // Check if cake is in the room
  const room = world.getRoom('sesame_street_01');
  if (!room) {
    console.error('  ❌ FAIL: Birthday party room not found');
    process.exit(1);
  }
  console.log('  ✓ Birthday party room found');

  if (!room.objects || !room.objects.includes('texan_birthday_cake')) {
    console.error('  ❌ FAIL: Cake not in birthday party room');
    process.exit(1);
  }
  console.log('  ✓ Cake is present in birthday party room');

  // Check NPCs
  const npcIds = ['bert_fire_safety', 'cookie_monster_helpful', 'ernie_relaxed', 'big_bird'];
  let foundNpcs = 0;
  for (const npcId of npcIds) {
    if (room.npcs && room.npcs.includes(npcId)) {
      foundNpcs++;
    }
  }
  console.log(`  ✓ Found ${foundNpcs}/4 expected NPCs in room`);

} catch (err) {
  console.error('  ❌ FAIL: Error checking world objects');
  console.error('  Error:', err.message);
  process.exit(1);
}

// Summary
console.log();
console.log('='.repeat(70));
console.log('✅ ALL INTEGRATION TESTS PASSED!');
console.log('='.repeat(70));
console.log();
console.log('The blow candles feature is ready to use!');
console.log();
console.log('To test in-game:');
console.log('  1. Start the MUD server');
console.log('  2. Navigate to Sesame Street (sesame_street_01)');
console.log('  3. Type: blow candles');
console.log('  4. Watch the magic happen! 🎂🔥✨');
console.log();
