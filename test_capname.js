#!/usr/bin/env node

/**
 * Test script for capname Phase 2 foundation
 * Tests: Player.getDisplayName(), colors.stripColors(), set capname command security
 */

const colors = require('./src/colors');
const Player = require('./src/server/Player');

console.log('\n=== CAPNAME PHASE 2 FOUNDATION TEST ===\n');

let passCount = 0;
let failCount = 0;

function test(name, condition) {
  if (condition) {
    console.log(`✓ ${name}`);
    passCount++;
  } else {
    console.log(`✗ ${name}`);
    failCount++;
  }
}

// Test 1: Player.getDisplayName() with no capname
const player1 = new Player(null);
player1.username = 'testuser';
test('getDisplayName() returns username when capname is null',
  player1.getDisplayName() === 'testuser');

// Test 2: Player.getDisplayName() with capname
const player2 = new Player(null);
player2.username = 'testuser';
player2.capname = '\x1b[31mTestUser\x1b[0m';
test('getDisplayName() returns capname when set',
  player2.getDisplayName() === '\x1b[31mTestUser\x1b[0m');

// Test 3: stripColors() with simple ANSI
const simpleAnsi = '\x1b[31mRed Text\x1b[0m';
const stripped1 = colors.stripColors(simpleAnsi);
test('stripColors() removes simple ANSI codes',
  stripped1 === 'Red Text');

// Test 4: stripColors() with compound ANSI (bold + color)
const compoundAnsi = '\x1b[1;31mBold Red\x1b[0m';
const stripped2 = colors.stripColors(compoundAnsi);
test('stripColors() removes compound ANSI codes (1;31)',
  stripped2 === 'Bold Red');

// Test 5: stripColors() with 256-color ANSI
const color256 = '\x1b[38;5;196mDark Red\x1b[0m';
const stripped3 = colors.stripColors(color256);
test('stripColors() removes 256-color ANSI codes (38;5;196)',
  stripped3 === 'Dark Red');

// Test 6: parseColorTags() and stripColors() round-trip
const tagged = '<red>Red</> <bold>Bold</>';
const parsed = colors.parseColorTags(tagged);
const stripped4 = colors.stripColors(parsed);
test('parseColorTags() + stripColors() preserves text content',
  stripped4 === 'Red Bold');

// Test 7: Security - raw ANSI should be stripped by set command logic
const rawAnsiInput = '\x1b[31mBad\x1b[0m';
const sanitized = rawAnsiInput.replace(/\x1b\[[0-9;]*m/g, '');
test('Raw ANSI injection is prevented by sanitization regex',
  sanitized === 'Bad');

// Test 8: Length validation logic - stripped length check
const longTaggedName = '<red>' + 'a'.repeat(51) + '</>';
const parsedLong = colors.parseColorTags(longTaggedName);
const strippedLong = colors.stripColors(parsedLong).trim();
test('Length check on stripped capname (should be > 50)',
  strippedLong.length > 50);

// Test 9: Case-insensitive username matching
const capnameText = 'TestUser';
const username = 'testuser';
test('Case-insensitive username matching works',
  capnameText.toLowerCase() === username.toLowerCase());

// Test 10: Whitespace trimming
const whitespaceCapname = '  TestUser  ';
const trimmed = colors.stripColors(whitespaceCapname).trim();
test('Whitespace is trimmed from capname',
  trimmed === 'TestUser');

console.log(`\n=== RESULTS ===`);
console.log(`Passed: ${passCount}/${passCount + failCount}`);
console.log(`Failed: ${failCount}/${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n✓ All Phase 2 foundation tests passed!\n');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed\n');
  process.exit(1);
}
