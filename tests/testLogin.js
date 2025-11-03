/**
 * Quick test to verify login flow doesn't crash with ban enforcement
 */

const AdminService = require('../src/admin/service');
const { MemoryStorageAdapter } = require('../src/admin/storage');

async function testLoginFlow() {
  console.log('Testing login flow with ban enforcement...\n');

  // Create admin service with memory storage
  const storage = new MemoryStorageAdapter();
  const adminService = new AdminService(storage);
  await adminService.initialize();

  // Simulate player object during login sequence
  const player = {
    socket: {
      remoteAddress: '127.0.0.1'
    },
    tempUsername: 'testplayer',  // Username during login
    username: null                // Not set yet
  };

  console.log('1. Testing ban enforcement with tempUsername (before login completes)...');
  let banResult = adminService.enforceBanOnConnect(player);
  console.log(`   Result: ${banResult ? 'BANNED' : 'Not banned'} ✓`);

  // Simulate successful login
  player.username = player.tempUsername;

  console.log('\n2. Testing ban enforcement with username (after login completes)...');
  banResult = adminService.enforceBanOnConnect(player);
  console.log(`   Result: ${banResult ? 'BANNED' : 'Not banned'} ✓`);

  // Test with banned player
  console.log('\n3. Banning testplayer...');
  await adminService.ban(
    { playerID: 'testplayer', name: 'testplayer', ip: '127.0.0.1' },
    { id: 'admin', role: 'Admin', name: 'Admin' },
    0,
    'Test ban'
  );
  console.log('   Player banned ✓');

  console.log('\n4. Testing ban enforcement on banned player...');
  banResult = adminService.enforceBanOnConnect(player);
  console.log(`   Result: ${banResult ? 'BANNED ✓' : 'ERROR: Should be banned!'}`);
  if (!banResult) {
    console.error('   BAN CHECK FAILED! Player should be banned but was allowed in.');
    process.exit(1);
  }

  // Test with no username
  console.log('\n5. Testing ban enforcement with no username...');
  const emptyPlayer = {
    socket: { remoteAddress: '127.0.0.1' },
    username: null,
    tempUsername: null
  };
  banResult = adminService.enforceBanOnConnect(emptyPlayer);
  console.log(`   Result: ${banResult === null ? 'Correctly returned null ✓' : 'ERROR!'}`);

  console.log('\n✅ All login flow tests passed!');
}

testLoginFlow().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
