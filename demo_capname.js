#!/usr/bin/env node

/**
 * Visual demonstration of capname Phase 2 features
 * Shows how capname commands work with color tag parsing
 */

const colors = require('./src/colors');

console.log('\n' + '='.repeat(70));
console.log('CAPNAME PHASE 2 - VISUAL DEMONSTRATION');
console.log('='.repeat(70) + '\n');

// Demonstrate parseColorTags
console.log('1. PARSING COLOR TAGS TO ANSI:\n');
const examples = [
  '<red>RedText</>',
  '<bold>BoldText</>',
  '<red><bold>BoldRed</></red>',
  '<bright_green>BrightGreen</>',
  '<cyan>Cyan</> normal <yellow>Yellow</>',
];

examples.forEach(example => {
  const parsed = colors.parseColorTags(example);
  console.log(`   Input:  ${example}`);
  console.log(`   Output: ${parsed}${colors.ANSI.RESET}`);
  console.log('');
});

// Demonstrate stripColors
console.log('2. STRIPPING COLORS FOR VALIDATION:\n');
const coloredTexts = [
  colors.parseColorTags('<red>TestUser</>'),
  colors.parseColorTags('<bold><cyan>FancyName</></bold>'),
  '\x1b[1;31mCompoundANSI\x1b[0m',
];

coloredTexts.forEach(text => {
  const stripped = colors.stripColors(text);
  console.log(`   Colored: ${text}${colors.ANSI.RESET}`);
  console.log(`   Stripped: "${stripped}"`);
  console.log('');
});

// Demonstrate security validation
console.log('3. SECURITY VALIDATION EXAMPLES:\n');

const validations = [
  {
    input: '<red>testuser</>',
    username: 'testuser',
    description: 'Valid - matches username'
  },
  {
    input: '<red>TestUser</>',
    username: 'testuser',
    description: 'Valid - case-insensitive match'
  },
  {
    input: '<red>wrongname</>',
    username: 'testuser',
    description: 'INVALID - does not match username'
  },
  {
    input: '  <red>testuser</>  ',
    username: 'testuser',
    description: 'Valid - whitespace trimmed'
  },
  {
    input: '<red>' + 'a'.repeat(51) + '</>',
    username: 'testuser',
    description: 'INVALID - exceeds 50 character limit'
  },
];

validations.forEach(v => {
  const parsed = colors.parseColorTags(v.input);
  const stripped = colors.stripColors(parsed).trim();
  const isValid = stripped.toLowerCase() === v.username.toLowerCase() && stripped.length <= 50;

  console.log(`   Input: "${v.input}"`);
  console.log(`   Username: "${v.username}"`);
  console.log(`   Stripped: "${stripped}" (${stripped.length} chars)`);
  console.log(`   Result: ${isValid ? colors.success('✓ VALID') : colors.error('✗ INVALID')} - ${v.description}`);
  console.log('');
});

// Demonstrate unparseColorTags
console.log('4. CONVERTING ANSI BACK TO TAGS (for display):\n');

const ansiTexts = [
  colors.parseColorTags('<red>RedText</>'),
  colors.parseColorTags('<bold>BoldText</>'),
  colors.parseColorTags('<cyan><bold>BoldCyan</></cyan>'),
];

ansiTexts.forEach(text => {
  const unparsed = colors.unparseColorTags(text);
  console.log(`   ANSI stored: ${text}${colors.ANSI.RESET}`);
  console.log(`   Tag display: ${unparsed}`);
  console.log('');
});

console.log('='.repeat(70));
console.log('DEMONSTRATION COMPLETE');
console.log('='.repeat(70) + '\n');

console.log(colors.hint('Try these commands in-game:'));
console.log(colors.hint('  set capname <red>YourName</>'));
console.log(colors.hint('  capname'));
console.log(colors.hint('  who\n'));
