/**
 * Currency Integration Test
 * Connects to the MUD server and tests currency drop/pickup in a real game environment
 */

const net = require('net');
const readline = require('readline');

const TEST_CONFIG = {
  host: 'localhost',
  port: 4000,
  username: 'currencytest',
  password: 'testpass123',
  timeout: 30000 // 30 second timeout
};

class MudTestClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.connected = false;
    this.buffer = '';
    this.state = 'connecting';
    this.testResults = [];
    this.currentStep = 0;

    // Test sequence
    this.testSteps = [
      { command: 'givemoney 50 copper', description: 'Give self 50 copper', wait: 500 },
      { command: 'givemoney 10 platinum', description: 'Give self 10 platinum', wait: 500 },
      { command: 'i', description: 'Check inventory', wait: 500 },
      { command: 'drop 15 copper', description: 'Drop 15 copper', wait: 500 },
      { command: 'i', description: 'Check inventory (should have 35c)', wait: 500 },
      { command: 'l', description: 'Look at room (should see 15 copper)', wait: 500 },
      { command: 'take copper', description: 'Pick up 1 copper', wait: 500 },
      { command: 'i', description: 'Check inventory (should have 36c, NOT 3s 6c)', wait: 500 },
      { command: 'l', description: 'Look at room (should see 14 copper left)', wait: 500 },
      { command: 'take 14 copper', description: 'Pick up remaining 14 copper', wait: 500 },
      { command: 'i', description: 'Check inventory (should have 50c)', wait: 500 },
      { command: 'drop platinum', description: 'Drop 1 platinum (test stacking #1)', wait: 500 },
      { command: 'l', description: 'Look (should see 1 platinum)', wait: 500 },
      { command: 'drop platinum', description: 'Drop 1 platinum again (test stacking #2)', wait: 500 },
      { command: 'l', description: 'Look (should see x2 platinum, NOT 2 separate stacks)', wait: 500 },
      { command: 'drop 5 platinum', description: 'Drop 5 platinum (test stacking #3)', wait: 500 },
      { command: 'l', description: 'Look (should see x7 platinum in ONE stack)', wait: 1000 },
      { command: 'quit', description: 'Quit and end test', wait: 500 }
    ];
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`\n=== Currency Integration Test ===`);
      console.log(`Connecting to ${this.config.host}:${this.config.port}...\n`);

      this.client = new net.Socket();

      this.client.connect(this.config.port, this.config.host, () => {
        console.log('✓ Connected to MUD server');
        this.connected = true;
        resolve();
      });

      this.client.on('data', (data) => {
        this.handleData(data);
      });

      this.client.on('error', (err) => {
        console.error('Connection error:', err.message);
        reject(err);
      });

      this.client.on('close', () => {
        console.log('\n✓ Connection closed');
        this.printResults();
      });

      // Timeout
      setTimeout(() => {
        if (this.state !== 'complete') {
          console.error('\n✗ Test timeout!');
          this.client.destroy();
          process.exit(1);
        }
      }, this.config.timeout);
    });
  }

  handleData(data) {
    const text = data.toString();
    this.buffer += text;

    // Print server output
    process.stdout.write(text);

    // State machine for login
    if (this.state === 'connecting') {
      if (text.includes('Username:') || text.includes('Enter your username')) {
        this.state = 'enter_username';
        setTimeout(() => this.send(this.config.username), 200);
      }
    } else if (this.state === 'enter_username') {
      if (text.includes('Password:') || text.includes('Enter your password')) {
        this.state = 'enter_password';
        setTimeout(() => this.send(this.config.password), 200);
      } else if (text.includes('Create it?') || text.includes('Create a new character') || text.includes('not found') || text.includes('does not exist')) {
        this.state = 'create_character';
        setTimeout(() => this.send('yes'), 200);
      }
    } else if (this.state === 'create_character') {
      if (text.includes('Password:') || text.includes('Choose a password') || text.includes('Enter your password') || text.includes('password for')) {
        this.state = 'set_password';
        setTimeout(() => this.send(this.config.password), 200);
      }
    } else if (this.state === 'set_password') {
      // After setting password, either asks to confirm OR directly logs in
      if (text.includes('Re-enter') || text.includes('Confirm') || text.includes('again')) {
        this.state = 'confirm_password';
        setTimeout(() => this.send(this.config.password), 200);
      } else if (text.includes('Welcome') ||
                 text.includes('> ') ||
                 text.includes('Exits:') ||
                 text.includes('Sesame Street')) {
        console.log('\n✓ Logged in successfully\n');
        this.state = 'logged_in';
        setTimeout(() => this.runNextTest(), 1000);
      }
    } else if (this.state === 'confirm_password' || this.state === 'enter_password') {
      // Look for signs we're logged in: prompt, room description, or welcome message
      if (text.includes('Welcome') ||
          text.includes('> ') ||
          text.includes('Exits:') ||
          text.includes('Sesame Street') ||
          text.includes('You are at')) {
        console.log('\n✓ Logged in successfully\n');
        this.state = 'logged_in';
        setTimeout(() => this.runNextTest(), 1000);
      }
    } else if (this.state === 'logged_in' || this.state === 'running_tests') {
      // Already running tests, data handled by test logic
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

    console.log(`\n[Test ${this.currentStep + 1}/${this.testSteps.length}] ${step.description}`);
    console.log(`Command: ${step.command}`);
    console.log('─'.repeat(60));

    this.send(step.command);
    this.currentStep++;

    // Wait before next command
    setTimeout(() => this.runNextTest(), step.wait);
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\nPlease review the output above to verify:');
    console.log('  1. After dropping 15 copper, wallet shows 35c');
    console.log('  2. After picking up 1 copper, wallet shows 36c');
    console.log('  3. Wallet does NOT auto-convert to "3s 6c"');
    console.log('  4. After picking up remaining 14, wallet shows 50c');
    console.log('  5. After dropping platinum 3 times, room shows ONE stack "x7"');
    console.log('  6. Room does NOT show separate platinum stacks');
    console.log('\nIf all tests show correct behavior, test PASSED ✓');
    console.log('='.repeat(60) + '\n');
  }
}

// Run the test
async function runTest() {
  const client = new MudTestClient(TEST_CONFIG);

  try {
    await client.connect();
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

// Start test
console.log('Starting MUD currency integration test...');
console.log('This will create a test character and run automated commands.\n');

runTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
