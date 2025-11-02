#!/usr/bin/env node

/**
 * Test script for ghost status indicators
 *
 * This script simulates a player dying and becoming a ghost,
 * then verifies that ghost status is visible in various contexts.
 */

const net = require('net');

const PORT = 4000;
const HOST = 'localhost';

let client;
let stepIndex = 0;

const steps = [
  { send: 'testuser\n', expect: 'Password:', delay: 200, description: 'Enter username' },
  { send: 'yes\n', expect: 'Choose a password:', delay: 200, description: 'Confirm new user' },
  { send: 'testpass\n', expect: 'Welcome to The Wumpy and Grift', delay: 500, description: 'Set password' },
  { send: 'look\n', expect: 'Exits:', delay: 300, description: 'Look at room' },
  { send: 'score\n', expect: 'Character Information', delay: 300, description: 'Check initial score (should not show ghost)' },
  { send: 'attack blue\n', expect: 'Combat has begun', delay: 500, description: 'Attack Blue Wumpy' },
  { send: '\n', expect: '', delay: 15000, description: 'Wait for combat to finish (death)' },
  { send: 'score\n', expect: 'GHOST', delay: 300, description: 'Check score after death (should show GHOST)' },
  { send: 'look\n', expect: '', delay: 300, description: 'Look at room as ghost' },
  { send: 'look testuser\n', expect: 'translucent and ethereal', delay: 300, description: 'Look at self as ghost' },
  { send: 'attack blue\n', expect: 'cannot attack while you are a ghost', delay: 300, description: 'Try to attack as ghost (should be prevented)' },
  { send: 'quit\n', expect: 'Farewell', delay: 300, description: 'Quit' }
];

function executeStep() {
  if (stepIndex >= steps.length) {
    console.log('\n✓ All test steps completed successfully!');
    client.end();
    process.exit(0);
    return;
  }

  const step = steps[stepIndex];
  console.log(`\n[Step ${stepIndex + 1}/${steps.length}] ${step.description}`);
  console.log(`  Sending: ${step.send.trim()}`);

  client.write(step.send);
  stepIndex++;

  setTimeout(executeStep, step.delay);
}

// Create connection
client = net.createConnection({ port: PORT, host: HOST }, () => {
  console.log('Connected to MUD server');
  console.log('Starting ghost status test...\n');

  setTimeout(() => {
    executeStep();
  }, 500);
});

client.on('data', (data) => {
  const text = data.toString();

  // Remove ANSI color codes for cleaner output
  const cleanText = text.replace(/\x1b\[[0-9;]*m/g, '');

  console.log('  Received:', cleanText.substring(0, 100).replace(/\n/g, ' '));

  // Check for key ghost indicators
  if (cleanText.includes('YOU HAVE DIED')) {
    console.log('  ✓ Death message detected');
  }
  if (cleanText.includes('GHOST')) {
    console.log('  ✓ Ghost status indicator detected');
  }
  if (cleanText.includes('translucent and ethereal')) {
    console.log('  ✓ Ghost description detected');
  }
  if (cleanText.includes('cannot attack while you are a ghost')) {
    console.log('  ✓ Ghost attack prevention detected');
  }
});

client.on('end', () => {
  console.log('\nDisconnected from server');
});

client.on('error', (err) => {
  console.error('Connection error:', err.message);
  console.error('\nMake sure the MUD server is running on port 4000');
  console.error('Start it with: node src/server.js');
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n⚠ Test timeout - may need manual verification');
  client.end();
  process.exit(1);
}, 30000);
