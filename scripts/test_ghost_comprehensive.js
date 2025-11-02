#!/usr/bin/env node

/**
 * Comprehensive test script for ghost status indicators
 */

const net = require('net');

const PORT = 4000;
const HOST = 'localhost';

let client;
let stepIndex = 0;
let receivedData = '';

const steps = [
  { send: 'ghosttest\n', expect: 'Password:', delay: 200, description: 'Enter username' },
  { send: 'yes\n', expect: 'Choose a password:', delay: 200, description: 'Confirm new user' },
  { send: 'testpass\n', expect: 'Welcome', delay: 500, description: 'Set password' },
  { send: 'south\n', expect: 'You move south', delay: 300, description: 'Move south to find wumpy' },
  { send: 'look\n', expect: '', delay: 300, description: 'Look at room' },
  { send: 'score\n', expect: '', delay: 300, description: 'Check initial score (not ghost)' },
  { send: 'attack wumpy\n', expect: 'Combat', delay: 500, description: 'Attack wumpy' },
  { send: '\n', expect: '', delay: 20000, description: 'Wait for death' },
  { send: 'score\n', expect: '', delay: 300, description: 'Check score after death' },
  { send: 'look\n', expect: '', delay: 300, description: 'Look at room as ghost' },
  { send: 'look ghosttest\n', expect: '', delay: 300, description: 'Look at self' },
  { send: 'attack wumpy\n', expect: '', delay: 300, description: 'Try to attack as ghost' },
  { send: 'quit\n', expect: 'Farewell', delay: 300, description: 'Quit' }
];

let testResults = {
  deathMessage: false,
  ghostStatusInScore: false,
  ghostDescription: false,
  attackPrevention: false
};

function executeStep() {
  if (stepIndex >= steps.length) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS:');
    console.log('='.repeat(60));
    console.log(`✓ Death message:               ${testResults.deathMessage ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Ghost status in score:       ${testResults.ghostStatusInScore ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Ghost description:           ${testResults.ghostDescription ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Ghost attack prevention:     ${testResults.attackPrevention ? 'PASS' : 'FAIL'}`);
    console.log('='.repeat(60));

    const allPassed = Object.values(testResults).every(v => v);
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!\n');
    } else {
      console.log('\n⚠ SOME TESTS FAILED - see above\n');
    }

    client.end();
    process.exit(allPassed ? 0 : 1);
    return;
  }

  const step = steps[stepIndex];
  console.log(`\n[${stepIndex + 1}/${steps.length}] ${step.description}`);

  client.write(step.send);
  stepIndex++;

  setTimeout(executeStep, step.delay);
}

// Create connection
client = net.createConnection({ port: PORT, host: HOST }, () => {
  console.log('Connected to MUD server\n');
  console.log('Testing ghost status indicators...');

  setTimeout(() => {
    executeStep();
  }, 500);
});

client.on('data', (data) => {
  const text = data.toString();
  receivedData += text;

  // Remove ANSI codes for pattern matching
  const cleanText = text.replace(/\x1b\[[0-9;]*m/g, '');

  // Check for test conditions
  if (cleanText.includes('YOU HAVE DIED')) {
    testResults.deathMessage = true;
    console.log('  ✓ Death message detected');
  }
  if (cleanText.includes('You are now a GHOST')) {
    console.log('  ✓ Ghost status notification');
  }
  if (cleanText.match(/Status:.*GHOST/)) {
    testResults.ghostStatusInScore = true;
    console.log('  ✓ Ghost status in score command');
  }
  if (cleanText.includes('translucent and ethereal')) {
    testResults.ghostDescription = true;
    console.log('  ✓ Ghost description detected');
  }
  if (cleanText.includes('cannot attack while you are a ghost')) {
    testResults.attackPrevention = true;
    console.log('  ✓ Ghost attack prevention message');
  }
  if (cleanText.includes('(ghost)')) {
    console.log('  ✓ Ghost indicator in room/look');
  }
});

client.on('end', () => {
  console.log('\nDisconnected from server');
});

client.on('error', (err) => {
  console.error('Connection error:', err.message);
  console.error('\nMake sure the MUD server is running on port 4000');
  process.exit(1);
});

setTimeout(() => {
  console.log('\n⚠ Test timeout');
  client.end();
  process.exit(1);
}, 35000);
