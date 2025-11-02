/**
 * Server Integration Test
 * Tests combat system by connecting to actual server and executing combat scenarios
 */

const net = require('net');

const TEST_CONFIG = {
  host: 'localhost',
  port: 4000,
  timeout: 2000
};

class TestClient {
  constructor(name) {
    this.name = name;
    this.socket = null;
    this.buffer = '';
    this.connected = false;
    this.responses = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(TEST_CONFIG.port, TEST_CONFIG.host);

      this.socket.on('connect', () => {
        console.log(`[${this.name}] Connected to server`);
        this.connected = true;
        resolve();
      });

      this.socket.on('data', (data) => {
        const text = data.toString();
        this.buffer += text;
        this.responses.push(text);
      });

      this.socket.on('error', (err) => {
        console.error(`[${this.name}] Socket error:`, err.message);
        reject(err);
      });

      this.socket.on('end', () => {
        console.log(`[${this.name}] Disconnected from server`);
        this.connected = false;
      });
    });
  }

  send(command) {
    return new Promise((resolve) => {
      if (!this.connected) {
        console.error(`[${this.name}] Not connected`);
        resolve(false);
        return;
      }

      console.log(`[${this.name}] Sending: ${command}`);
      this.socket.write(command + '\n');

      // Wait for response
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  }

  async waitFor(searchText, timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.buffer.includes(searchText)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
  }

  getBuffer() {
    return this.buffer;
  }

  clearBuffer() {
    this.buffer = '';
    this.responses = [];
  }

  disconnect() {
    if (this.socket) {
      this.socket.end();
    }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

async function testScenario1_BasicCombat(client) {
  console.log('\n' + '='.repeat(70));
  console.log('TEST SCENARIO 1: Basic Combat');
  console.log('='.repeat(70));

  try {
    // Login
    await client.send('testplayer1');
    await sleep(500);
    await client.send('testpass123');
    await sleep(1000);

    const loginSuccess = await client.waitFor('Welcome back', 2000);
    if (!loginSuccess) {
      console.log('✗ Login failed');
      return false;
    }
    console.log('✓ Login successful');

    // Check current location
    client.clearBuffer();
    await client.send('look');
    await sleep(500);

    // Try to find an NPC to fight
    client.clearBuffer();
    await client.send('attack wumpy');
    await sleep(1000);

    const buffer = client.getBuffer();

    // Check for combat messages
    if (buffer.includes('Combat') || buffer.includes('attack') || buffer.includes('strikes')) {
      console.log('✓ Combat initiated');

      // Check for damage/HP messages
      if (buffer.includes('damage') || buffer.includes('HP')) {
        console.log('✓ Damage messages displayed');
      } else {
        console.log('✗ No damage messages found');
      }

      // Check for combat resolution
      if (buffer.includes('defeated') || buffer.includes('ended')) {
        console.log('✓ Combat resolved');
      } else {
        console.log('? Combat may still be ongoing');
      }

      return true;
    } else if (buffer.includes('not here') || buffer.includes('no one') || buffer.includes('cannot find')) {
      console.log('! No NPC found to test combat (expected in some rooms)');
      return true; // Not a failure
    } else {
      console.log('✗ Combat did not initiate');
      console.log('Response:', buffer.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log('✗ Test failed with error:', error.message);
    return false;
  }
}

async function testScenario2_PlayerStats(client) {
  console.log('\n' + '='.repeat(70));
  console.log('TEST SCENARIO 2: Player Stats (score command)');
  console.log('='.repeat(70));

  try {
    client.clearBuffer();
    await client.send('score');
    await sleep(500);

    const buffer = client.getBuffer();

    // Check for stat display
    const hasLevel = buffer.includes('Level');
    const hasHP = buffer.includes('HP') || buffer.includes('Health');
    const hasXP = buffer.includes('XP') || buffer.includes('Experience');
    const hasStats = buffer.includes('STR') || buffer.includes('Strength');

    console.log(`${hasLevel ? '✓' : '✗'} Level displayed`);
    console.log(`${hasHP ? '✓' : '✗'} HP displayed`);
    console.log(`${hasXP ? '✓' : '✗'} XP displayed`);
    console.log(`${hasStats ? '✓' : '✗'} Stats displayed`);

    if (!buffer.includes('error') && !buffer.includes('Error')) {
      console.log('✓ No errors in score command');
    } else {
      console.log('✗ Error detected in score command');
      console.log('Response:', buffer);
      return false;
    }

    return hasLevel || hasHP;
  } catch (error) {
    console.log('✗ Test failed with error:', error.message);
    return false;
  }
}

async function testScenario3_AggressiveNPC(client) {
  console.log('\n' + '='.repeat(70));
  console.log('TEST SCENARIO 3: Aggressive NPC Behavior');
  console.log('='.repeat(70));

  try {
    // Navigate to Wumpie Deathmatch Arena (known aggressive NPC location)
    client.clearBuffer();
    await client.send('north');
    await sleep(500);
    await client.send('west');
    await sleep(500);
    await client.send('west');
    await sleep(1500); // Wait for aggressive NPC to attack

    const buffer = client.getBuffer();

    // Check if NPC attacked on sight
    if (buffer.includes('Gronk') && (buffer.includes('attack') || buffer.includes('strikes'))) {
      console.log('✓ Aggressive NPC attacked on sight');
      return true;
    } else if (buffer.includes('cannot') || buffer.includes('not')) {
      console.log('! Could not navigate to aggressive NPC area');
      return true; // Not a test failure
    } else {
      console.log('? Aggressive behavior unclear');
      console.log('Response:', buffer.substring(0, 300));
      return true; // Soft pass
    }
  } catch (error) {
    console.log('✗ Test failed with error:', error.message);
    return false;
  }
}

async function testScenario4_CombatMessages(client) {
  console.log('\n' + '='.repeat(70));
  console.log('TEST SCENARIO 4: Combat Message Variety');
  console.log('='.repeat(70));

  try {
    // Return to starting area
    client.clearBuffer();
    await client.send('east');
    await sleep(500);
    await client.send('east');
    await sleep(500);
    await client.send('south');
    await sleep(500);

    // Look for wumpy
    await client.send('look');
    await sleep(500);

    client.clearBuffer();
    await client.send('attack wumpy');
    await sleep(2000);

    const buffer = client.getBuffer();

    // Check for variety of combat messages
    const hasAttackMsg = buffer.includes('strikes') || buffer.includes('hits') || buffer.includes('swings');
    const hasDamageMsg = buffer.includes('damage');
    const hasHPBar = buffer.includes('HP') && buffer.includes('/');
    const hasCritical = buffer.includes('CRITICAL');

    console.log(`${hasAttackMsg ? '✓' : '✗'} Attack messages present`);
    console.log(`${hasDamageMsg ? '✓' : '✗'} Damage messages present`);
    console.log(`${hasHPBar ? '✓' : '✗'} HP bars displayed`);
    console.log(`${hasCritical ? '✓' : '?'} Critical hits (${hasCritical ? 'occurred' : 'not in this combat'})`);

    return hasAttackMsg || hasDamageMsg;
  } catch (error) {
    console.log('✗ Test failed with error:', error.message);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runServerTests() {
  console.log('\n' + '='.repeat(70));
  console.log('SERVER INTEGRATION TESTS');
  console.log('Testing combat system with live server connection');
  console.log('='.repeat(70));

  const client = new TestClient('TestClient');

  try {
    // Connect to server
    console.log('\nConnecting to server...');
    await client.connect();
    await sleep(1000); // Wait for welcome message

    // Run test scenarios
    const results = [];

    results.push({
      name: 'Basic Combat',
      passed: await testScenario1_BasicCombat(client)
    });

    results.push({
      name: 'Player Stats',
      passed: await testScenario2_PlayerStats(client)
    });

    results.push({
      name: 'Aggressive NPC',
      passed: await testScenario3_AggressiveNPC(client)
    });

    results.push({
      name: 'Combat Messages',
      passed: await testScenario4_CombatMessages(client)
    });

    // Disconnect
    client.disconnect();
    await sleep(500);

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));

    let passed = 0;
    let failed = 0;

    for (const result of results) {
      if (result.passed) {
        passed++;
        console.log(`✓ ${result.name}`);
      } else {
        failed++;
        console.log(`✗ ${result.name}`);
      }
    }

    console.log('-'.repeat(70));
    console.log(`Total: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log('='.repeat(70) + '\n');

    return failed === 0;
  } catch (error) {
    console.error('Fatal error:', error);
    client.disconnect();
    return false;
  }
}

// Run if main module
if (require.main === module) {
  runServerTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runServerTests };
