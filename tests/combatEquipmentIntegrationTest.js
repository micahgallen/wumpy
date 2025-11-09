/**
 * Comprehensive Combat & Equipment Integration Test
 *
 * Tests all aspects of the equipment and combat systems:
 * 1. Equipment Stats Impact - Test how adding/removing armor and weapons impacts player stats
 * 2. Equipment Slots & AC - Test how the equipment slot system impacts AC calculations
 * 3. Combat Modifiers - Test how equipment modifiers affect combat results
 * 4. Identify & Attunement - Test identify command and attunement mechanics
 *
 * This test connects to a live MUD server and executes commands to verify behavior.
 */

const net = require('net');

const TEST_CONFIG = {
  host: 'localhost',
  port: 4000,
  username: 'testuser_combat_equip',
  password: 'testpass123',
  timeout: 120000  // 2 minutes for comprehensive testing
};

class MudTestClient {
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

    // Comprehensive test sequence
    this.testSteps = [
      // ===== PHASE 1: Setup and Baseline =====
      { command: 'score', description: 'Record baseline stats (no equipment)', wait: 1000 },
      { command: 'i', description: 'Check starting inventory', wait: 500 },

      // ===== PHASE 2: Equipment Stats Impact Testing =====
      { command: 'givemoney 500 gold', description: 'Get gold for purchasing equipment', wait: 500 },
      { command: 'e', description: 'Enter shop (east)', wait: 500 },
      { command: 'list', description: 'View available equipment', wait: 1000 },

      // Buy basic equipment for testing
      { command: 'buy sword', description: 'Purchase wooden practice sword (weapon)', wait: 500 },
      { command: 'buy cap', description: 'Purchase leather cap (armor)', wait: 500 },
      { command: 'buy amulet', description: 'Purchase mysterious amulet (jewelry)', wait: 500 },

      { command: 'w', description: 'Return to plaza', wait: 500 },
      { command: 'i', description: 'Verify purchased items in inventory', wait: 500 },

      // Test weapon equipping and stat changes
      { command: 'score', description: 'Check stats BEFORE equipping weapon', wait: 1000 },
      { command: 'equip sword', description: 'Equip wooden practice sword', wait: 500 },
      { command: 'score', description: 'Check stats AFTER equipping weapon (verify damage)', wait: 1000 },
      { command: 'equipment', description: 'View equipment slots (verify weapon in main_hand)', wait: 1000 },

      // Test armor equipping and AC changes
      { command: 'equip cap', description: 'Equip leather cap', wait: 500 },
      { command: 'score', description: 'Check AC AFTER equipping cap (should increase by +1)', wait: 1000 },
      { command: 'equipment', description: 'View equipment slots (verify cap in head slot)', wait: 1000 },

      // Test unequipping and stat reversal
      { command: 'unequip sword', description: 'Unequip weapon', wait: 500 },
      { command: 'score', description: 'Verify stats return to baseline (no weapon damage)', wait: 1000 },
      { command: 'equipment', description: 'Verify weapon slot is empty', wait: 500 },

      // ===== PHASE 3: Jewelry and Stat Modifiers =====
      { command: 'identify amulet', description: 'Identify mysterious amulet (test identify command)', wait: 1000 },
      { command: 'equip amulet', description: 'Equip identified amulet', wait: 500 },
      { command: 'score', description: 'Verify stat bonuses from amulet (+2 WIS, +1 INT)', wait: 1000 },
      { command: 'equipment', description: 'Verify amulet in neck slot', wait: 500 },

      // ===== PHASE 4: Multiple Equipment Pieces and AC Aggregation =====
      { command: 'equip sword', description: 'Re-equip weapon for combat testing', wait: 500 },
      { command: 'score', description: 'Verify full equipment stat bonuses (weapon + armor + jewelry)', wait: 1000 },
      { command: 'equipment', description: 'Show complete equipment layout', wait: 1000 },

      // ===== PHASE 5: Combat with Equipment Testing =====
      // Record stats before combat
      { command: 'score', description: 'Record stats with full equipment BEFORE combat', wait: 1000 },

      // Find and attack an NPC to test combat modifiers
      { command: 'look', description: 'Check for NPCs in current room', wait: 1000 },
      { command: 'n', description: 'Move to find NPC for combat test', wait: 500 },
      { command: 'look', description: 'Check for NPCs', wait: 500 },
      { command: 's', description: 'Return to plaza', wait: 500 },
      { command: 'w', description: 'Try another direction for NPCs', wait: 500 },
      { command: 'look', description: 'Check for NPCs (Cookie Monster should be here)', wait: 1000 },

      // Initiate combat to test equipment bonuses in action
      { command: 'attack cookie', description: 'Attack Cookie Monster (test weapon damage in combat)', wait: 2000 },
      { command: '', description: 'Wait for combat round (observe attack roll with weapon bonus)', wait: 3000 },
      { command: '', description: 'Wait for combat round (observe damage with weapon dice)', wait: 3000 },
      { command: '', description: 'Wait for combat round (observe AC from equipment)', wait: 3000 },

      // Check post-combat stats
      { command: 'score', description: 'Check HP and stats after combat', wait: 1000 },

      // ===== PHASE 6: Unequip All and Verify Stat Reset =====
      { command: 'e', description: 'Move to safe location', wait: 500 },
      { command: 'unequip sword', description: 'Remove weapon', wait: 500 },
      { command: 'unequip cap', description: 'Remove armor', wait: 500 },
      { command: 'unequip amulet', description: 'Remove jewelry', wait: 500 },
      { command: 'score', description: 'Verify all stats return to baseline', wait: 1000 },
      { command: 'equipment', description: 'Verify all slots empty', wait: 1000 },

      // ===== PHASE 7: Edge Case Testing =====
      // Test equipping to wrong slot
      { command: 'equip sword off_hand', description: 'Try equipping weapon to off-hand', wait: 500 },
      { command: 'equipment', description: 'Verify weapon placement', wait: 500 },

      // Test dual wielding (if another light weapon available)
      { command: 'w', description: 'Return to shop', wait: 500 },
      { command: 'buy dagger', description: 'Try to buy dagger for dual wield test (if available)', wait: 500 },
      { command: 'equip dagger', description: 'Equip dagger to test dual wield', wait: 500 },
      { command: 'equipment', description: 'Check dual wield configuration', wait: 1000 },

      // ===== PHASE 8: Final Summary =====
      { command: 'score', description: 'Final stats check', wait: 1000 },
      { command: 'i', description: 'Final inventory check', wait: 500 },
      { command: 'equipment', description: 'Final equipment check', wait: 1000 },

      { command: 'quit', description: 'Exit test', wait: 500 }
    ];
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`COMBAT & EQUIPMENT INTEGRATION TEST`);
      console.log(`${'='.repeat(80)}`);
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

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`[Test ${this.currentStep + 1}/${this.testSteps.length}] ${step.description}`);
    if (step.command) {
      console.log(`Command: ${step.command}`);
    }
    console.log('─'.repeat(80));

    if (step.command) {
      this.send(step.command);
    }

    this.currentStep++;

    setTimeout(() => this.runNextTest(), step.wait);
  }

  printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETE - MANUAL VERIFICATION REQUIRED');
    console.log('='.repeat(80));
    console.log('\nPlease review the output above to verify:');
    console.log('\n1. EQUIPMENT STATS IMPACT:');
    console.log('   ✓ Baseline stats recorded without equipment');
    console.log('   ✓ Stats change when equipping weapon (damage dice appears)');
    console.log('   ✓ AC increases when equipping armor (+1 from leather cap)');
    console.log('   ✓ Stats revert when unequipping items');
    console.log('   ✓ Stat bonuses apply from jewelry (+2 WIS, +1 INT from amulet)');

    console.log('\n2. EQUIPMENT SLOTS & AC CALCULATIONS:');
    console.log('   ✓ Equipment command shows correct slot assignments');
    console.log('   ✓ Weapon appears in main_hand slot');
    console.log('   ✓ Armor appears in head slot');
    console.log('   ✓ Jewelry appears in neck slot');
    console.log('   ✓ AC calculation is correct (base 10 + DEX mod + armor bonuses)');

    console.log('\n3. COMBAT MODIFIERS:');
    console.log('   ✓ Attack rolls use weapon bonuses');
    console.log('   ✓ Damage rolls use weapon damage dice (1d4 for wooden sword)');
    console.log('   ✓ Defender AC includes equipped armor');
    console.log('   ✓ Combat messages reflect equipped weapons');

    console.log('\n4. IDENTIFY & ATTUNEMENT:');
    console.log('   ✓ Identify command reveals item properties');
    console.log('   ✓ Amulet stat bonuses displayed after identification');
    console.log('   ✓ Items can be equipped after identification');

    console.log('\n5. EDGE CASES:');
    console.log('   ✓ Can specify equipment slot (e.g., off_hand)');
    console.log('   ✓ Dual wielding works (if light weapons)');
    console.log('   ✓ All equipment can be removed');
    console.log('   ✓ Stats return to baseline when all equipment removed');

    console.log('\n' + '='.repeat(80));
    console.log('EXPECTED BEHAVIOR SUMMARY:');
    console.log('='.repeat(80));

    console.log('\n• BASELINE (no equipment):');
    console.log('  - AC: 10 + DEX modifier');
    console.log('  - Damage: 1 (unarmed)');
    console.log('  - Stats: Base stats only');

    console.log('\n• WITH WOODEN PRACTICE SWORD:');
    console.log('  - Damage: 1d4 + STR modifier');
    console.log('  - Attack bonus: Prof + STR + weapon bonus (0 for non-magical)');

    console.log('\n• WITH LEATHER CAP:');
    console.log('  - AC: Previous AC + 1');
    console.log('  - AC breakdown should show +1 from leather cap');

    console.log('\n• WITH MYSTERIOUS AMULET (identified):');
    console.log('  - WIS: Base WIS + 2');
    console.log('  - INT: Base INT + 1');
    console.log('  - Should see stat changes in score');

    console.log('\n• COMBAT:');
    console.log('  - Attack messages should reference equipped weapon');
    console.log('  - Damage should use weapon dice (1d4), not unarmed (1)');
    console.log('  - AC should reflect all equipped armor pieces');

    console.log('\n' + '='.repeat(80));
    console.log('\nIf all expected behaviors match actual output: TEST PASSED ✓');
    console.log('If any discrepancies found: TEST FAILED ✗');
    console.log('='.repeat(80) + '\n');
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

console.log('Starting comprehensive combat & equipment integration test...');
runTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
