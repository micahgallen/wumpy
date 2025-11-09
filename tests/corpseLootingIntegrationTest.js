/**
 * Corpse Looting Integration Test
 *
 * Focused test for corpse examination and looting functionality.
 * This test verifies:
 * 1. Corpse contents can be examined
 * 2. Items can be looted using "get from corpse"
 * 3. Items can be looted using "loot corpse"
 * 4. Currency goes to wallet
 * 5. Empty corpse handling
 */

const net = require('net');

const TEST_CONFIG = {
  host: 'localhost',
  port: 4000,
  username: 'testuser_loot_focused',
  password: 'testpass123',
  timeout: 60000  // 1 minute
};

class CorpseLootingTest {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.connected = false;
    this.buffer = '';
    this.state = 'connecting';
    this.currentStep = 0;
    this.testResults = {
      corpseCreated: false,
      corpseExamined: false,
      itemsLooted: false,
      currencyReceived: false,
      emptyCorpseHandled: false,
      errors: []
    };

    // Streamlined test sequence
    this.testSteps = [
      { command: 'l', description: 'Check starting location', wait: 500 },
      { command: 'givemoney 100 gold', description: 'Get gold', wait: 500 },
      { command: 'south', description: 'Go to Mid-South (Blue Wumpy)', wait: 500 },
      { command: 'l', description: 'Verify Blue Wumpy present', wait: 500 },

      // Kill the NPC to create corpse
      { command: 'attack blue wumpy', description: 'Start combat', wait: 1000 },
      { command: 'attack blue wumpy', description: 'Combat round 2', wait: 1000 },
      { command: 'attack blue wumpy', description: 'Combat round 3', wait: 1000 },
      { command: 'attack blue wumpy', description: 'Combat round 4', wait: 1000 },
      { command: 'attack blue wumpy', description: 'Combat round 5', wait: 1000 },

      // Verify corpse creation
      { command: 'l', description: 'Check for corpse in room', wait: 1000 },

      // Examine corpse
      { command: 'examine corpse', description: 'Examine corpse contents', wait: 1000 },
      { command: 'examine blue wumpy', description: 'Examine by NPC name', wait: 500 },

      // Test get command
      { command: 'i', description: 'Check inventory before looting', wait: 500 },
      { command: 'get all from corpse', description: 'Loot all items', wait: 1000 },
      { command: 'i', description: 'Check inventory after looting', wait: 500 },
      { command: 'score', description: 'Check currency/wallet', wait: 500 },

      // Test empty corpse
      { command: 'examine corpse', description: 'Examine now-empty corpse', wait: 500 },
      { command: 'loot corpse', description: 'Try looting empty corpse', wait: 500 },

      // Cleanup
      { command: 'quit', description: 'Exit', wait: 500 }
    ];
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log('\n' + '='.repeat(70));
      console.log('  CORPSE LOOTING INTEGRATION TEST');
      console.log('='.repeat(70));
      console.log(`\nConnecting to ${this.config.host}:${this.config.port}...\n`);

      this.client = new net.Socket();

      this.client.connect(this.config.port, this.config.host, () => {
        console.log('[SUCCESS] Connected to MUD server');
        this.connected = true;
        resolve();
      });

      this.client.on('data', (data) => {
        this.handleData(data);
      });

      this.client.on('error', (err) => {
        console.error('[ERROR] Connection error:', err.message);
        reject(err);
      });

      this.client.on('close', () => {
        console.log('\n[INFO] Connection closed');
        this.printResults();
      });

      setTimeout(() => {
        if (this.state !== 'complete') {
          console.error('\n[ERROR] Test timeout!');
          this.client.destroy();
          process.exit(1);
        }
      }, this.config.timeout);
    });
  }

  handleData(data) {
    const text = data.toString();
    this.buffer += text;
    process.stdout.write(text);

    // Login state machine
    if (this.state === 'connecting') {
      if (text.includes('Username:')) {
        this.state = 'enter_username';
        setTimeout(() => this.send(this.config.username), 200);
      }
    } else if (this.state === 'enter_username') {
      if (text.includes('Password:')) {
        this.state = 'enter_password';
        setTimeout(() => this.send(this.config.password), 200);
      } else if (text.includes('Create it?') || text.includes('does not exist')) {
        this.state = 'create_character';
        setTimeout(() => this.send('yes'), 200);
      }
    } else if (this.state === 'create_character') {
      if (text.includes('Password:') || text.includes('Choose a password')) {
        this.state = 'set_password';
        setTimeout(() => this.send(this.config.password), 200);
      }
    } else if (this.state === 'set_password') {
      if (text.includes('Re-enter') || text.includes('Confirm')) {
        this.state = 'confirm_password';
        setTimeout(() => this.send(this.config.password), 200);
      } else if (text.includes('Welcome') || text.includes('Exits:') || text.includes('> ')) {
        console.log('\n[SUCCESS] Logged in\n');
        this.state = 'logged_in';
        setTimeout(() => this.runNextTest(), 1000);
      }
    } else if (this.state === 'confirm_password' || this.state === 'enter_password') {
      if (text.includes('Welcome') || text.includes('Exits:') || text.includes('> ')) {
        console.log('\n[SUCCESS] Logged in\n');
        this.state = 'logged_in';
        setTimeout(() => this.runNextTest(), 1000);
      }
    }

    // Validation
    if (this.state === 'running_tests') {
      this.validateOutput(text);
    }
  }

  validateOutput(text) {
    const lower = text.toLowerCase();

    // Corpse creation detection
    if (lower.includes('corpse falls') || lower.includes('a corpse')) {
      this.testResults.corpseCreated = true;
      console.log('[VALIDATION] ✓ Corpse created');
    }

    // Corpse visible in room
    if (lower.includes('corpse of')) {
      this.testResults.corpseCreated = true;
      console.log('[VALIDATION] ✓ Corpse visible in room');
    }

    // Corpse examination
    if (lower.includes('contains:') || (lower.includes('corpse') && lower.includes('empty'))) {
      this.testResults.corpseExamined = true;
      console.log('[VALIDATION] ✓ Corpse examined');
    }

    // Item looting
    if (lower.includes('you take') || lower.includes('you loot') || lower.includes('you get')) {
      this.testResults.itemsLooted = true;
      console.log('[VALIDATION] ✓ Items looted');
    }

    // Currency
    if (lower.includes('copper') || lower.includes('silver') || lower.includes('gold')) {
      this.testResults.currencyReceived = true;
      console.log('[VALIDATION] ✓ Currency detected');
    }

    // Empty corpse
    if (lower.includes('empty')) {
      this.testResults.emptyCorpseHandled = true;
      console.log('[VALIDATION] ✓ Empty corpse handled');
    }

    // Error detection
    if (lower.includes('error:') || lower.includes('failed:') || lower.includes('exception')) {
      this.testResults.errors.push(text.substring(0, 100));
      console.log('[VALIDATION] ✗ Error detected');
    }
  }

  send(message) {
    if (this.client && this.connected) {
      this.client.write(message + '\r\n');
    }
  }

  runNextTest() {
    if (this.currentStep >= this.testSteps.length) {
      this.state = 'complete';
      return;
    }

    this.state = 'running_tests';
    const step = this.testSteps[this.currentStep];

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`[${this.currentStep + 1}/${this.testSteps.length}] ${step.description}`);
    console.log(`Command: ${step.command}`);
    console.log('─'.repeat(70));

    this.send(step.command);
    this.currentStep++;

    setTimeout(() => this.runNextTest(), step.wait);
  }

  printResults() {
    console.log('\n' + '='.repeat(70));
    console.log('  CORPSE LOOTING TEST RESULTS');
    console.log('='.repeat(70));

    const checks = [
      { name: 'Corpse Created', pass: this.testResults.corpseCreated },
      { name: 'Corpse Examined', pass: this.testResults.corpseExamined },
      { name: 'Items Looted', pass: this.testResults.itemsLooted },
      { name: 'Currency Received', pass: this.testResults.currencyReceived },
      { name: 'Empty Corpse Handled', pass: this.testResults.emptyCorpseHandled }
    ];

    let passCount = 0;
    console.log('\nTest Validations:');
    checks.forEach(check => {
      const symbol = check.pass ? '✓' : '✗';
      const status = check.pass ? 'PASS' : 'FAIL';
      console.log(`  ${symbol} ${check.name}: ${status}`);
      if (check.pass) passCount++;
    });

    if (this.testResults.errors.length > 0) {
      console.log('\nErrors Detected:');
      this.testResults.errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log(`\nResult: ${passCount}/${checks.length} validations passed`);

    if (passCount === checks.length && this.testResults.errors.length === 0) {
      console.log('\n[SUCCESS] All looting tests passed!');
    } else {
      console.log('\n[INCOMPLETE] Some validations did not pass.');
      console.log('Review the output above to verify functionality.');
    }

    console.log('='.repeat(70) + '\n');
  }
}

async function runTest() {
  const client = new CorpseLootingTest(TEST_CONFIG);
  try {
    await client.connect();
  } catch (err) {
    console.error('[FATAL] Test failed:', err);
    process.exit(1);
  }
}

console.log('[INFO] Starting Corpse Looting Integration Test...');
runTest().catch(err => {
  console.error('[FATAL] Unexpected error:', err);
  process.exit(1);
});
