/**
 * Simple test to see raw server output
 */

const net = require('net');

const client = new net.Socket();

client.connect(4000, '127.0.0.1', () => {
  console.log('=== CONNECTED TO SERVER ===\n');
});

client.on('data', (data) => {
  const text = data.toString();
  console.log('=== RECEIVED DATA ===');
  console.log(text);
  console.log('=== END DATA ===\n');

  // Show raw bytes to debug
  console.log('Raw bytes:', JSON.stringify(text));
  console.log('\n');
});

client.on('close', () => {
  console.log('=== CONNECTION CLOSED ===');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

// Close after 2 seconds
setTimeout(() => {
  client.end();
}, 2000);
