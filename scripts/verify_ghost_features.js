#!/usr/bin/env node

/**
 * Simple script to verify ghost features are implemented
 * This doesn't test actual death, but verifies the code paths exist
 */

const fs = require('fs');
const path = require('path');

console.log('Ghost Status Implementation Verification');
console.log('='.repeat(60));

const checks = [
  {
    file: 'src/server.js',
    pattern: /this\.isGhost\s*=\s*false/,
    description: 'Player class has isGhost property'
  },
  {
    file: 'src/combat/CombatEncounter.js',
    pattern: /target\.isGhost\s*=\s*true/,
    description: 'Death handler sets isGhost to true'
  },
  {
    file: 'src/combat/CombatEncounter.js',
    pattern: /YOU HAVE DIED/,
    description: 'Death message sent to player'
  },
  {
    file: 'src/combat/CombatEncounter.js',
    pattern: /You are now a GHOST/,
    description: 'Ghost notification sent'
  },
  {
    file: 'src/commands.js',
    pattern: /if\s*\(\s*player\.isGhost\s*\)/,
    description: 'Attack command checks ghost status'
  },
  {
    file: 'src/commands.js',
    pattern: /cannot attack while you are a ghost/,
    description: 'Ghost attack prevention message'
  },
  {
    file: 'src/commands.js',
    pattern: /translucent and ethereal/,
    description: 'Ghost description in look command'
  },
  {
    file: 'src/commands.js',
    pattern: /Status:.*GHOST/,
    description: 'Ghost status in score command'
  },
  {
    file: 'world.js',
    pattern: /\(ghost\)/,
    description: 'Ghost indicator in room listing'
  }
];

let passed = 0;
let failed = 0;

checks.forEach((check, index) => {
  const filePath = path.join(__dirname, '..', check.file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (check.pattern.test(content)) {
      console.log(`✓ ${index + 1}. ${check.description}`);
      passed++;
    } else {
      console.log(`✗ ${index + 1}. ${check.description}`);
      failed++;
    }
  } catch (err) {
    console.log(`✗ ${index + 1}. ${check.description} (file error: ${err.message})`);
    failed++;
  }
});

console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\n✓ All ghost status features are implemented!\n');
  console.log('To test in-game:');
  console.log('1. Connect to server: telnet localhost 4000');
  console.log('2. Navigate to Arena: north, west, north, east');
  console.log('3. Attack Gronk: attack gronk');
  console.log('4. Wait for death');
  console.log('5. Try commands: score, look, attack gronk\n');
  process.exit(0);
} else {
  console.log('\n✗ Some features are missing or incorrectly implemented\n');
  process.exit(1);
}
