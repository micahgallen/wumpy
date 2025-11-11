/**
 * Test for Blow Candles Command
 * Verifies the command loads and has correct structure
 */

const blowCandlesCommand = require('../../src/commands/interactions/blowCandles');

console.log('Testing Blow Candles Command...\n');

// Test 1: Command structure
console.log('Test 1: Command Structure');
if (!blowCandlesCommand.name) {
  console.error('  ❌ FAIL: Command must have a name');
  process.exit(1);
}
console.log(`  ✓ Command name: ${blowCandlesCommand.name}`);

if (!blowCandlesCommand.execute || typeof blowCandlesCommand.execute !== 'function') {
  console.error('  ❌ FAIL: Command must have an execute function');
  process.exit(1);
}
console.log('  ✓ Execute function exists');

if (!blowCandlesCommand.aliases || !Array.isArray(blowCandlesCommand.aliases)) {
  console.error('  ❌ FAIL: Command must have aliases array');
  process.exit(1);
}
console.log(`  ✓ Aliases: ${blowCandlesCommand.aliases.join(', ')}`);

if (!blowCandlesCommand.help) {
  console.error('  ❌ FAIL: Command must have help object');
  process.exit(1);
}
console.log('  ✓ Help documentation exists');

console.log('\nTest 2: Help Structure');
if (!blowCandlesCommand.help.description) {
  console.error('  ❌ FAIL: Help must have description');
  process.exit(1);
}
console.log(`  ✓ Description: ${blowCandlesCommand.help.description}`);

if (!blowCandlesCommand.help.usage) {
  console.error('  ❌ FAIL: Help must have usage');
  process.exit(1);
}
console.log(`  ✓ Usage: ${blowCandlesCommand.help.usage}`);

if (!blowCandlesCommand.help.examples || blowCandlesCommand.help.examples.length === 0) {
  console.error('  ❌ FAIL: Help must have examples');
  process.exit(1);
}
console.log(`  ✓ Examples: ${blowCandlesCommand.help.examples.length} provided`);

console.log('\n✅ All tests passed!');
console.log('\nCommand Summary:');
console.log(`  Name: ${blowCandlesCommand.name}`);
console.log(`  Aliases: ${blowCandlesCommand.aliases.join(', ')}`);
console.log(`  Description: ${blowCandlesCommand.help.description}`);
console.log(`  Usage: ${blowCandlesCommand.help.usage}`);
console.log('\nReady to blow out some birthday candles! 🎂🔥');
