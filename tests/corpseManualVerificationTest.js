/**
 * Corpse System Manual Verification Test
 *
 * This test creates a longer combat session to ensure NPC dies,
 * then allows manual verification of corpse presence and looting.
 */

const net = require('net');

const TEST_CONFIG = {
  host: 'localhost',
  port: 4000,
  username: 'testuser_corpse_verify',
  password: 'testpass123',
  timeout: 120000  // 2 minutes
};

class CorpseVerificationTest {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.connected = false;
    this.buffer = '';
    this.state = 'connecting';
    this.currentStep = 0;

    // Extended combat sequence - 20 attacks to guarantee kill
    this.testSteps = [
      { command: 'l', description: 'Starting location', wait: 500 },
      { command: 'givemoney 100 gold', description: 'Get gold', wait: 500 },
      { command: 'east', description: 'Go to shop', wait: 500 },
      { command: 'buy wooden practice sword', description: 'Buy weapon', wait: 500 },
      { command: 'equip wooden practice sword', description: 'Equip weapon', wait: 500 },
      { command: 'west', description: 'Return to plaza', wait: 500 },
      { command: 'south', description: 'Go to Blue Wumpy room', wait: 500 },
      { command: 'l', description: 'Check room', wait: 500 },

      // Extended combat - 20 rounds to ensure death
      ...Array.from({ length: 20 }, (_, i) => ({
        command: 'attack blue wumpy',
        description: `Combat round ${i + 1}`,
        wait: 1200
      })),

      // Verification after combat
      { command: 'l', description: '[VERIFY] Check for corpse', wait: 1500 },
      { command: 'examine corpse', description: '[VERIFY] Examine corpse contents', wait: 1500 },
      { command: 'examine blue', description: '[VERIFY] Try examining by name', wait: 500 },
      { command: 'get all from corpse', description: '[VERIFY] Loot corpse', wait: 1500 },
      { command: 'i', description: '[VERIFY] Check inventory', wait: 500 },
      { command: 'score', description: '[VERIFY] Check currency', wait: 500 },
      { command: 'examine corpse', description: '[VERIFY] Check empty corpse', wait: 500 },
      { command: 'l', description: '[VERIFY] Final room state', wait: 500 },

      { command: 'quit', description: 'Exit', wait: 500 }
    ];
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log('\n' + '='.repeat(80));
      console.log('  CORPSE SYSTEM MANUAL VERIFICATION TEST');
      console.log('='.repeat(80));
      console.log(`\nThis test will kill Blue Wumpy and verify corpse creation/looting.`);
      console.log(`Connecting to ${this.config.host}:${this.config.port}...\n`);

      this.client = new net.Socket();

      this.client.connect(this.config.port, this.config.host, () => {
        console.log('[SUCCESS] Connected');
        this.connected = true;
        resolve();
      });

      this.client.on('data', (data) => {
        this.handleData(data);
      });

      this.client.on('error', (err) => {
        console.error('[ERROR]', err.message);
        reject(err);
      });

      this.client.on('close', () => {
        console.log('\n[INFO] Connection closed');
        this.printResults();
      });

      setTimeout(() => {
        if (this.state !== 'complete') {
          console.error('\n[ERROR] Timeout');
          this.client.destroy();
          process.exit(1);
        }
      }, this.config.timeout);
    });
  }

  handleData(data) {
    const text = data.toString();
    this.buffer += text;

    // Only show important output to reduce noise
    const lower = text.toLowerCase();
    if (lower.includes('corpse') ||
        lower.includes('defeated') ||
        lower.includes('dies') ||
        lower.includes('[verify]') ||
        text.includes('Command:')) {
      process.stdout.write(text);
    }

    // Login state machine (same as before)
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

    // Only log verification steps
    if (step.description.includes('VERIFY')) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`${step.description}`);
      console.log(`Command: ${step.command}`);
      console.log('='.repeat(80));
    }

    this.send(step.command);
    this.currentStep++;

    setTimeout(() => this.runNextTest(), step.wait);
  }

  printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('  TEST COMPLETE - REVIEW OUTPUT ABOVE');
    console.log('='.repeat(80));
    console.log('\nExpected Results:');
    console.log('  1. Blue Wumpy should be defeated after combat');
    console.log('  2. "corpse of Blue Wumpy" should appear in room');
    console.log('  3. Corpse should contain loot items');
    console.log('  4. "get all from corpse" should loot items');
    console.log('  5. Currency should go to wallet');
    console.log('  6. Empty corpse should show appropriate message');
    console.log('\nIf all expected results shown above, corpse system is working correctly.');
    console.log('='.repeat(80) + '\n');
  }
}

async function runTest() {
  const client = new CorpseVerificationTest(TEST_CONFIG);
  try {
    await client.connect();
  } catch (err) {
    console.error('[FATAL]', err);
    process.exit(1);
  }
}

console.log('[INFO] Starting Corpse Verification Test...');
runTest().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
