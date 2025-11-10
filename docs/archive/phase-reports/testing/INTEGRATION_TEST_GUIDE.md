# MUD Integration Testing Guide

This guide explains how to write automated integration tests that connect to the live MUD server and execute commands to verify system behavior.

## Overview

Integration tests simulate real player interactions by:
1. Connecting to the MUD server via TCP socket
2. Automating the login/character creation process
3. Executing a sequence of commands
4. Capturing and displaying output for verification

## Basic Template

```javascript
const net = require('net');

const TEST_CONFIG = {
  host: 'localhost',
  port: 4000,
  username: 'testuser_systemname',  // Use descriptive test usernames
  password: 'testpass123',
  timeout: 30000  // Milliseconds (30 seconds default)
};

class MudTestClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.connected = false;
    this.buffer = '';
    this.state = 'connecting';
    this.currentStep = 0;

    // Define your test sequence
    this.testSteps = [
      { command: 'command1', description: 'What this tests', wait: 500 },
      { command: 'command2', description: 'What this tests', wait: 500 },
      { command: 'quit', description: 'Exit test', wait: 500 }
    ];
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`\n=== Your Test Name ===`);
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
    process.stdout.write(text);  // Show all server output

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
        console.log('\n✓ Logged in successfully\n');
        this.state = 'logged_in';
        setTimeout(() => this.runNextTest(), 1000);
      }
    } else if (this.state === 'confirm_password' || this.state === 'enter_password') {
      if (text.includes('Welcome') || text.includes('Exits:') || text.includes('> ')) {
        console.log('\n✓ Logged in successfully\n');
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

    console.log(`\n[Test ${this.currentStep + 1}/${this.testSteps.length}] ${step.description}`);
    console.log(`Command: ${step.command}`);
    console.log('─'.repeat(60));

    this.send(step.command);
    this.currentStep++;

    setTimeout(() => this.runNextTest(), step.wait);
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\nPlease review the output above to verify:');
    console.log('  1. [Expected behavior]');
    console.log('  2. [Expected behavior]');
    console.log('\nIf all expected behaviors shown, test PASSED ✓');
    console.log('='.repeat(60) + '\n');
  }
}

async function runTest() {
  const client = new MudTestClient(TEST_CONFIG);
  try {
    await client.connect();
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

console.log('Starting integration test...');
runTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

## Key Components

### 1. Test Configuration
```javascript
const TEST_CONFIG = {
  host: 'localhost',
  port: 4000,
  username: 'testuser_combat',     // Descriptive name
  password: 'testpass123',
  timeout: 30000                   // Adjust for long test sequences
};
```

### 2. Test Step Sequence
```javascript
this.testSteps = [
  { command: 'command', description: 'Explanation', wait: 500 }
];
```

**Wait times:**
- 200-500ms: Between most commands
- 1000ms+: After commands that generate lots of output
- Commands run sequentially with specified delays

### 3. State Machine for Login

The login flow handles:
- New account creation (auto-responds "yes")
- Password entry (single or double entry)
- Detection of successful login (looks for "Welcome", "Exits:", or ">")

**Critical patterns to detect:**
- `'Username:'` - Initial prompt
- `'Create it?'` / `'does not exist'` - New account
- `'Password:'` / `'Choose a password'` - Password prompt
- `'Re-enter'` / `'Confirm'` - Password confirmation
- `'Welcome'` / `'Exits:'` / `'> '` - Login success

### 4. Output Handling

```javascript
process.stdout.write(text);  // Show all server output in real-time
```

This allows manual verification of test results by reviewing the output.

## Testing Different Systems

### Combat System Test
```javascript
this.testSteps = [
  { command: 'givemoney 100 gold', description: 'Get gold for equipment', wait: 500 },
  { command: 'e', description: 'Go to shop', wait: 500 },
  { command: 'buy longsword', description: 'Buy weapon', wait: 500 },
  { command: 'equip longsword', description: 'Equip weapon', wait: 500 },
  { command: 'w', description: 'Return to plaza', wait: 500 },
  { command: 'attack big bird', description: 'Initiate combat', wait: 1000 },
  { command: 'attack big bird', description: 'Continue combat', wait: 1000 },
  { command: 'score', description: 'Check health/stats', wait: 500 },
  { command: 'quit', description: 'Exit', wait: 500 }
];
```

### Shop System Test
```javascript
this.testSteps = [
  { command: 'givemoney 500 copper', description: 'Get starting money', wait: 500 },
  { command: 'e', description: 'Enter shop', wait: 500 },
  { command: 'list', description: 'View shop inventory', wait: 500 },
  { command: 'buy cookie', description: 'Buy item', wait: 500 },
  { command: 'i', description: 'Check bought item', wait: 500 },
  { command: 'sell cookie', description: 'Sell item back', wait: 500 },
  { command: 'i', description: 'Verify sold', wait: 500 },
  { command: 'list', description: 'Check shop has item', wait: 500 },
  { command: 'quit', description: 'Exit', wait: 500 }
];
```

### Currency System Test
```javascript
this.testSteps = [
  { command: 'givemoney 10 platinum', description: 'Give platinum', wait: 500 },
  { command: 'drop platinum', description: 'Drop 1 platinum', wait: 500 },
  { command: 'l', description: 'Check dropped', wait: 500 },
  { command: 'drop platinum', description: 'Drop another (test stacking)', wait: 500 },
  { command: 'l', description: 'Verify stacked (should show x2)', wait: 500 },
  { command: 'take platinum', description: 'Pick up 1', wait: 500 },
  { command: 'i', description: 'Check wallet', wait: 500 },
  { command: 'quit', description: 'Exit', wait: 500 }
];
```

### Inventory/Equipment Test
```javascript
this.testSteps = [
  { command: 'givemoney 1000 gold', description: 'Get gold', wait: 500 },
  { command: 'e', description: 'Go to shop', wait: 500 },
  { command: 'buy dagger', description: 'Buy weapon', wait: 500 },
  { command: 'buy helmet', description: 'Buy armor', wait: 500 },
  { command: 'i', description: 'Check inventory', wait: 500 },
  { command: 'equip dagger', description: 'Equip weapon', wait: 500 },
  { command: 'equip helmet', description: 'Equip armor', wait: 500 },
  { command: 'eq', description: 'Check equipment slots', wait: 500 },
  { command: 'unequip dagger', description: 'Unequip weapon', wait: 500 },
  { command: 'drop dagger', description: 'Drop item', wait: 500 },
  { command: 'i', description: 'Verify dropped', wait: 500 },
  { command: 'quit', description: 'Exit', wait: 500 }
];
```

## Best Practices

### 1. Descriptive Test Names
```javascript
// Good
username: 'testuser_combat_melee'
username: 'testuser_shop_buyback'

// Bad
username: 'test1'
username: 'bob'
```

### 2. Clear Descriptions
```javascript
// Good
{ command: 'attack goblin', description: 'Initiate combat with low-level enemy', wait: 1000 }

// Bad
{ command: 'attack goblin', description: 'Test', wait: 1000 }
```

### 3. Appropriate Wait Times
- Fast commands: 200-500ms
- Commands with output: 500-1000ms
- Combat/long output: 1000-2000ms
- If output is truncated, increase wait time

### 4. Verification Steps
Include "check" commands after actions:
```javascript
{ command: 'buy sword', description: 'Purchase weapon', wait: 500 },
{ command: 'i', description: 'Verify sword in inventory', wait: 500 },
```

### 5. Clean Exit
Always end with:
```javascript
{ command: 'quit', description: 'Exit test', wait: 500 }
```

### 6. Test Isolation
Each test should:
- Use a unique test username
- Not depend on previous test runs
- Use `givemoney` or other admin commands to set up state
- Clean up after itself (or accept persistent test data)

## Running Tests

```bash
# Make sure server is running
node src/server.js &

# Wait for server to start (2-3 seconds)
sleep 3

# Run test
node tests/yourIntegrationTest.js

# Or run with output filtering
node tests/yourIntegrationTest.js 2>&1 | grep -A 100 "Logged in"
```

## Debugging Tests

### Timeout Issues
- Increase `timeout` in TEST_CONFIG
- Check if server is running
- Verify port 4000 is not blocked

### Login Failures
- Check detection patterns in `handleData()`
- Add debug logging: `console.log('State:', this.state, 'Text:', text.substring(0, 50));`
- Verify MUD server login prompts haven't changed

### Commands Not Executing
- Increase `wait` times between steps
- Check command spelling/syntax
- Verify character is in correct location for command

### Unexpected Output
- Review full output (don't filter)
- Check if previous command is still processing
- Increase wait times

## Examples

See existing integration tests:
- `tests/currencyIntegrationTest.js` - Currency system (drop, pickup, stacking)
- `tests/combatIntegrationTests.js` - Combat system (if exists)
- `tests/shopIntegrationTest.js` - Shop transactions (if exists)

## Advanced Patterns

### Testing Error Conditions
```javascript
{ command: 'buy nonexistent', description: 'Try to buy invalid item', wait: 500 },
{ command: 'drop 999 gold', description: 'Try to drop more than owned', wait: 500 },
```

### Testing Sequences
```javascript
// Test that doing A then B then C produces expected final state
{ command: 'drop 50 copper', description: 'Step 1', wait: 500 },
{ command: 'take copper', description: 'Step 2', wait: 500 },
{ command: 'i', description: 'Final state check', wait: 500 },
```

### Multi-Location Tests
```javascript
{ command: 'n', description: 'Move north', wait: 500 },
{ command: 'l', description: 'Verify new location', wait: 500 },
{ command: 's', description: 'Return south', wait: 500 },
```

## Common Pitfalls

1. **Not waiting long enough** - Server needs time to process and respond
2. **Assuming output format** - Tests verify behavior, not exact output formatting
3. **Hard-coded paths** - Use relative commands (n, s, e, w) not absolute room IDs
4. **Ignoring state** - Commands may fail if character is in wrong state (combat, wrong room, etc.)
5. **Race conditions** - Always wait between commands, don't send too fast

## Summary

Integration tests provide high-confidence verification that systems work correctly in the live MUD environment. They catch issues that unit tests miss, such as:
- Command parsing bugs
- State management issues
- Integration between systems
- User-facing output problems
- Race conditions and timing issues

Use them liberally to ensure quality and catch regressions early.
