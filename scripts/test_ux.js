/**
 * Test script for UX improvements
 * Tests text wrapping, prompts, and banner display
 */

const net = require('net');

const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'test123';

// Track test results
const tests = {
  banner: { name: 'ASCII Banner Display', passed: false },
  wrapping: { name: 'Text Wrapping', passed: false },
  prompt: { name: 'Clear Command Prompt', passed: false },
  spacing: { name: 'Blank Line Spacing', passed: false }
};

let receivedData = '';
let currentTest = 0;

const client = new net.Socket();

const commands = [
  TEST_USERNAME,      // Login username
  TEST_PASSWORD,      // Login password or create confirmation
  TEST_PASSWORD,      // Password if creating new account
  'look',             // Test room description wrapping
  'examine wumpy',    // Test NPC description wrapping
  'help',             // Test help text spacing
  'inventory',        // Test inventory spacing
  'quit'              // Exit
];

client.connect(4000, '127.0.0.1', () => {
  console.log('Connected to MUD server');
  console.log('Testing UX improvements...\n');
});

client.on('data', (data) => {
  const text = data.toString();
  receivedData += text;

  // Check for ASCII banner
  if (text.includes('The Wumpy and Grift') && text.includes('satirical MUD')) {
    if (text.includes('_') || text.includes('\\')) {
      tests.banner.passed = true;
      console.log('✓ ASCII banner detected');
    }
  }

  // Check for command prompt
  if (text.includes('\n> ')) {
    tests.prompt.passed = true;
    console.log('✓ Command prompt (>) detected');
  }

  // Check for text wrapping (lines shouldn't be too long)
  const lines = text.split('\n');
  let hasReasonableLineLength = true;
  for (const line of lines) {
    // Strip ANSI codes for length check
    const strippedLine = line.replace(/\x1b\[\d+m/g, '');
    if (strippedLine.length > 90 && !strippedLine.includes('=')) {
      hasReasonableLineLength = false;
      break;
    }
  }
  if (lines.length > 2 && hasReasonableLineLength) {
    tests.wrapping.passed = true;
  }

  // Check for blank line spacing after command output
  if (text.includes('\n\n') && currentTest > 3) {
    tests.spacing.passed = true;
    console.log('✓ Blank line spacing detected');
  }

  // Send next command after a brief delay
  if (currentTest < commands.length) {
    setTimeout(() => {
      const cmd = commands[currentTest];
      console.log(`Sending: ${cmd === TEST_PASSWORD ? '[password]' : cmd}`);
      client.write(cmd + '\n');
      currentTest++;

      // Close after last command
      if (currentTest >= commands.length) {
        setTimeout(() => {
          client.end();
        }, 500);
      }
    }, 300);
  }
});

client.on('close', () => {
  console.log('\n=== Test Results ===');
  let passCount = 0;
  let totalTests = Object.keys(tests).length;

  for (const [key, test] of Object.entries(tests)) {
    const status = test.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${test.name}`);
    if (test.passed) passCount++;
  }

  console.log(`\nPassed: ${passCount}/${totalTests}`);

  if (passCount === totalTests) {
    console.log('\n🎉 All UX improvements working correctly!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review the implementation.');
    process.exit(1);
  }
});

client.on('error', (err) => {
  console.error('Connection error:', err);
  process.exit(1);
});
