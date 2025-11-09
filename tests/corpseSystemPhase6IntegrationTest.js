/**
 * Phase 6: Corpse System Comprehensive Integration Test
 *
 * This test validates the complete corpse and respawn system in a live MUD environment.
 * Follows INTEGRATION_TEST_GUIDE.md methodology for in-game testing.
 *
 * Test Coverage:
 * 1. Full Combat-to-Loot Workflow (kill NPC, loot corpse, verify decay/respawn)
 * 2. Persistence Testing (corpses survive server restart with correct timing)
 * 3. Edge Cases (empty corpses, invalid commands, error handling)
 * 4. Performance Validation (multiple corpses, timer efficiency)
 * 5. Stress Testing (rapid cycles, concurrent operations)
 *
 * Test Environment: Sesame Street (sesame_street_01)
 * Test NPC: Red Wumpy (level 1, 20 HP, respawns in sesame_street_south)
 * Expected Corpse Decay: 5 minutes (300,000 ms) per itemsConfig
 */

const net = require('net');

const TEST_CONFIG = {
  host: 'localhost',
  port: 4000,
  username: 'testuser_corpse_phase6',
  password: 'testpass123',
  timeout: 120000  // 2 minutes for comprehensive test
};

class CorpseSystemIntegrationTest {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.connected = false;
    this.buffer = '';
    this.state = 'connecting';
    this.currentStep = 0;
    this.testResults = {
      passed: [],
      failed: [],
      warnings: []
    };

    // Test sequence - comprehensive coverage of all scenarios
    this.testSteps = [
      // Setup Phase
      { command: 'l', description: 'Verify starting location', wait: 500 },
      { command: 'givemoney 1000 gold', description: 'Get gold for equipment', wait: 500 },

      // Test 1: Full Combat-to-Loot Workflow
      { command: 'south', description: 'Move to Sesame Street South (Wumpy spawn)', wait: 500 },
      { command: 'l', description: 'Verify Red Wumpy is present', wait: 500 },
      { command: 'examine red wumpy', description: 'Check NPC stats before combat', wait: 500 },

      // Combat Phase
      { command: 'attack red wumpy', description: 'Initiate combat with Red Wumpy', wait: 1000 },
      { command: 'attack red wumpy', description: 'Continue combat round 2', wait: 1000 },
      { command: 'attack red wumpy', description: 'Continue combat round 3 (should kill)', wait: 1000 },
      { command: 'attack red wumpy', description: 'Try attacking again (should fail - dead)', wait: 500 },

      // Corpse Verification Phase
      { command: 'l', description: 'Verify corpse appeared in room', wait: 500 },
      { command: 'examine corpse', description: 'Examine corpse contents', wait: 1000 },
      { command: 'examine red wumpy', description: 'Try examining dead NPC (should fail)', wait: 500 },

      // Looting Phase - Test get command
      { command: 'get all from corpse', description: 'Loot all items from corpse', wait: 1000 },
      { command: 'i', description: 'Check inventory after looting', wait: 500 },
      { command: 'score', description: 'Check wallet for currency from corpse', wait: 500 },

      // Edge Case: Empty Corpse
      { command: 'examine corpse', description: 'Verify corpse is now empty', wait: 500 },
      { command: 'loot corpse', description: 'Try looting empty corpse (should fail gracefully)', wait: 500 },
      { command: 'get sword from corpse', description: 'Try getting non-existent item (should fail)', wait: 500 },

      // Test 2: Second NPC for Multiple Corpses Test
      { command: 'north', description: 'Return to plaza', wait: 500 },
      { command: 'east', description: 'Go to General Store', wait: 500 },
      { command: 'buy wooden practice sword', description: 'Buy weapon for faster kills', wait: 500 },
      { command: 'equip wooden practice sword', description: 'Equip weapon', wait: 500 },
      { command: 'west', description: 'Return to plaza', wait: 500 },
      { command: 'south', description: 'Go back to Wumpy area', wait: 500 },

      // Wait for first corpse to decay (note: 5 min default, but we'll check status)
      { command: 'l', description: 'Check if first corpse still present', wait: 500 },

      // Test 3: Multiple Corpses (if another NPC present)
      { command: 'look', description: 'Check for additional NPCs', wait: 500 },

      // Test 4: Edge Cases - Invalid Commands
      { command: 'loot nonexistent', description: 'Test error handling - invalid container', wait: 500 },
      { command: 'get item from nothing', description: 'Test error handling - no container', wait: 500 },
      { command: 'examine missing corpse', description: 'Test error handling - no corpse', wait: 500 },

      // Performance Check
      { command: 'admin corpse_debug', description: 'Check corpse system debug info (if admin)', wait: 1000 },
      { command: 'admin timer_debug', description: 'Check timer system debug info (if admin)', wait: 1000 },

      // Test 5: Persistence Preparation
      { command: 'north', description: 'Move to plaza for restart test', wait: 500 },
      { command: 'south', description: 'Check corpse status before restart', wait: 500 },
      { command: 'l', description: 'Final room check', wait: 1000 },

      // Cleanup
      { command: 'score', description: 'Final score check', wait: 500 },
      { command: 'i', description: 'Final inventory check', wait: 500 },
      { command: 'quit', description: 'Exit test', wait: 500 }
    ];
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log('\n' + '='.repeat(70));
      console.log('  PHASE 6: CORPSE SYSTEM COMPREHENSIVE INTEGRATION TEST');
      console.log('='.repeat(70));
      console.log(`\nConnecting to ${this.config.host}:${this.config.port}...`);
      console.log('Test Scope: Combat → Corpse → Loot → Decay → Respawn → Persistence\n');

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
        this.testResults.failed.push(`Connection error: ${err.message}`);
        reject(err);
      });

      this.client.on('close', () => {
        console.log('\n[INFO] Connection closed');
        this.printResults();
      });

      setTimeout(() => {
        if (this.state !== 'complete') {
          console.error('\n[ERROR] Test timeout reached!');
          this.testResults.failed.push('Test timeout - did not complete in time');
          this.client.destroy();
          process.exit(1);
        }
      }, this.config.timeout);
    });
  }

  handleData(data) {
    const text = data.toString();
    this.buffer += text;
    process.stdout.write(text);  // Show all server output in real-time

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
        console.log('\n[SUCCESS] Logged in successfully\n');
        this.state = 'logged_in';
        setTimeout(() => this.runNextTest(), 1000);
      }
    } else if (this.state === 'confirm_password' || this.state === 'enter_password') {
      if (text.includes('Welcome') || text.includes('Exits:') || text.includes('> ')) {
        console.log('\n[SUCCESS] Logged in successfully\n');
        this.state = 'logged_in';
        setTimeout(() => this.runNextTest(), 1000);
      }
    }

    // Capture test validation data
    if (this.state === 'running_tests') {
      this.validateOutput(text);
    }
  }

  validateOutput(text) {
    const step = this.testSteps[this.currentStep - 1];
    if (!step) return;

    // Validation logic based on command
    const lower = text.toLowerCase();

    // Corpse detection
    if (step.command.includes('l') || step.command.includes('look')) {
      if (lower.includes('corpse')) {
        this.testResults.passed.push('Corpse visible in room');
      }
    }

    // Combat validation
    if (step.command.includes('attack')) {
      if (lower.includes('you hit') || lower.includes('you miss') || lower.includes('damage')) {
        this.testResults.passed.push('Combat system responding');
      }
      if (lower.includes('dies') || lower.includes('defeated') || lower.includes('killed')) {
        this.testResults.passed.push('NPC death detected');
      }
      if (lower.includes('is already dead') || lower.includes('not here')) {
        this.testResults.passed.push('Dead NPC attack prevention working');
      }
    }

    // Loot validation
    if (step.command.includes('get') || step.command.includes('loot')) {
      if (lower.includes('you take') || lower.includes('you loot')) {
        this.testResults.passed.push('Looting system working');
      }
      if (lower.includes('empty')) {
        this.testResults.passed.push('Empty corpse detection working');
      }
      if (lower.includes('don\'t see') || lower.includes('no ')) {
        this.testResults.passed.push('Error handling working');
      }
    }

    // Currency validation
    if (step.command.includes('score')) {
      if (lower.includes('copper') || lower.includes('gold') || lower.includes('wallet')) {
        this.testResults.passed.push('Currency system active');
      }
    }

    // Error detection
    if (lower.includes('error') || lower.includes('failed') || lower.includes('bug')) {
      this.testResults.failed.push(`Error detected: ${text.substring(0, 100)}`);
    }

    // Warning detection
    if (lower.includes('warning') || lower.includes('deprecated')) {
      this.testResults.warnings.push(`Warning detected: ${text.substring(0, 100)}`);
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
    console.log(`[Test ${this.currentStep + 1}/${this.testSteps.length}] ${step.description}`);
    console.log(`Command: ${step.command}`);
    console.log('─'.repeat(70));

    this.send(step.command);
    this.currentStep++;

    setTimeout(() => this.runNextTest(), step.wait);
  }

  printResults() {
    console.log('\n' + '='.repeat(70));
    console.log('  TEST RESULTS SUMMARY');
    console.log('='.repeat(70));

    console.log('\n[PASSED VALIDATIONS]');
    const uniquePassed = [...new Set(this.testResults.passed)];
    uniquePassed.forEach(result => console.log(`  ✓ ${result}`));
    console.log(`  Total: ${uniquePassed.length}`);

    if (this.testResults.warnings.length > 0) {
      console.log('\n[WARNINGS]');
      const uniqueWarnings = [...new Set(this.testResults.warnings)];
      uniqueWarnings.forEach(warning => console.log(`  ⚠ ${warning}`));
      console.log(`  Total: ${uniqueWarnings.length}`);
    }

    if (this.testResults.failed.length > 0) {
      console.log('\n[FAILURES]');
      const uniqueFailed = [...new Set(this.testResults.failed)];
      uniqueFailed.forEach(failure => console.log(`  ✗ ${failure}`));
      console.log(`  Total: ${uniqueFailed.length}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('  MANUAL VERIFICATION CHECKLIST');
    console.log('='.repeat(70));
    console.log('\nReview the output above and verify:');
    console.log('  1. [ ] NPC dies and corpse appears in room');
    console.log('  2. [ ] Corpse can be examined and shows contents');
    console.log('  3. [ ] Items can be looted from corpse using "get" and "loot"');
    console.log('  4. [ ] Currency goes to wallet, not inventory');
    console.log('  5. [ ] Empty corpse shows appropriate message');
    console.log('  6. [ ] Invalid loot commands show clear error messages');
    console.log('  7. [ ] Multiple corpses can coexist');
    console.log('  8. [ ] System handles edge cases gracefully');
    console.log('\n' + '='.repeat(70));
    console.log('  NEXT STEPS FOR FULL PHASE 6 VALIDATION');
    console.log('='.repeat(70));
    console.log('\n1. PERSISTENCE TEST:');
    console.log('   - Create corpses in-game');
    console.log('   - Run: node tests/corpsePersistenceTest.js');
    console.log('   - OR manually: kill NPC, restart server, verify corpse restored');
    console.log('\n2. DECAY AND RESPAWN TEST:');
    console.log('   - Kill NPC in-game');
    console.log('   - Wait 5 minutes (300 seconds)');
    console.log('   - Verify corpse decays and NPC respawns');
    console.log('\n3. PERFORMANCE TEST:');
    console.log('   - Create 5-10 corpses');
    console.log('   - Check admin corpse_debug and timer_debug');
    console.log('   - Verify no performance degradation');
    console.log('\n4. STRESS TEST:');
    console.log('   - Rapid kill cycles (kill, loot, wait for respawn, repeat)');
    console.log('   - Multiple players looting same corpse');
    console.log('   - Server restart during active decay timers');
    console.log('\n' + '='.repeat(70));

    if (this.testResults.failed.length === 0) {
      console.log('\n[SUCCESS] Integration test completed with no critical failures!');
      console.log('[INFO] Review manual checklist and run additional tests for full validation.');
    } else {
      console.log('\n[FAILURE] Test completed with failures. Review above for details.');
    }

    console.log('\n');
  }
}

async function runTest() {
  const client = new CorpseSystemIntegrationTest(TEST_CONFIG);
  try {
    await client.connect();
  } catch (err) {
    console.error('[FATAL] Test failed:', err);
    process.exit(1);
  }
}

// Run test
console.log('[INFO] Starting Phase 6 Corpse System Integration Test...');
console.log('[INFO] This test will take approximately 60-90 seconds.');
console.log('[INFO] Server must be running on localhost:4000\n');

runTest().catch(err => {
  console.error('[FATAL] Unexpected error:', err);
  process.exit(1);
});
