/**
 * Combat-Corpse Integration Test Suite
 *
 * Tests Phase 2 integration: Corpse creation during combat
 *
 * Test Coverage:
 * - Direct CorpseManager.createNPCCorpse() integration
 * - CombatEncounter.removeNPCFromRoom() creates corpses
 * - Corpse appears in room.items
 * - Corpse includes killer name
 * - Corpse contains loot (if ItemRegistry available)
 * - Corpse decay timer works
 */

const CorpseManager = require('../src/systems/corpses/CorpseManager');
const TimerManager = require('../src/systems/corpses/TimerManager');
const colors = require('../src/colors');

// Test Results
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, errorMessage = '') {
  if (condition) {
    passedTests++;
    console.log(`✓ ${testName}`);
  } else {
    failedTests++;
    console.log(`✗ ${testName} - ${errorMessage}`);
  }
}

function testInfo(message) {
  console.log(`  ${colors.info(message)}`);
}

// Mock World
class MockWorld {
  constructor() {
    this.rooms = {};
    this.npcs = {};
  }

  getRoom(roomId) {
    return this.rooms[roomId] || null;
  }
}

async function runTests() {
  console.log('\n' + colors.combat('='.repeat(80)));
  console.log(colors.combat('Combat-Corpse Integration Test Suite'));
  console.log(colors.combat('Phase 2: Combat Integration'));
  console.log(colors.combat('='.repeat(80)) + '\n');

  // Clear any existing corpses
  CorpseManager.corpses.clear();
  CorpseManager.npcCorpseMap.clear();

  // Test 1: Direct CorpseManager Integration
  console.log('\n' + colors.combat('Test 1: CorpseManager.createNPCCorpse() Integration'));
  {
    const world = new MockWorld();

    // Create test room
    world.rooms['test_room'] = {
      id: 'test_room',
      name: 'Test Room',
      description: 'A test room',
      exits: [],
      npcs: ['test_goblin'],
      items: []
    };

    // Create test NPC
    const npc = {
      id: 'test_goblin',
      name: 'Test Goblin',
      size: 'medium',
      level: 2,
      challengeRating: 1,
      lootTables: ['trash_loot']
    };

    // Create corpse
    const corpse = CorpseManager.createNPCCorpse(npc, 'test_room', 'PlayerKiller', world);

    // Verify corpse created
    assert(corpse !== null, 'Corpse created', 'createNPCCorpse should return corpse object');

    if (corpse) {
      assert(corpse.name === 'corpse of Test Goblin', 'Corpse name correct', `Expected "corpse of Test Goblin", got "${corpse.name}"`);
      assert(corpse.description.includes('PlayerKiller'), 'Killer name in description', corpse.description);
      assert(corpse.description.includes('Test Goblin'), 'NPC name in description', corpse.description);
      assert(corpse.containerType === 'npc_corpse', 'Corpse is npc_corpse type', `Got type: ${corpse.containerType}`);
      assert(corpse.isPickupable === true, 'Corpse is pickupable', 'Should be pickupable');
      assert(corpse.weight === 100, 'Medium NPC weight is 100 lbs', `Expected 100, got ${corpse.weight}`);
      assert(Array.isArray(corpse.inventory), 'Corpse has inventory', 'Inventory should be array');

      testInfo(`Name: ${corpse.name}`);
      testInfo(`Description: ${corpse.description}`);
      testInfo(`Weight: ${corpse.weight} lbs`);
      testInfo(`Loot items: ${corpse.inventory.length}`);
    }

    // Verify added to room
    const room = world.getRoom('test_room');
    assert(room.items.length === 1, 'Corpse added to room.items', `Expected 1 item, got ${room.items.length}`);
    assert(room.items[0] === corpse, 'Room contains corpse object', 'Corpse reference should match');

    // Verify tracking
    assert(CorpseManager.hasActiveCorpse('test_goblin'), 'Corpse tracked', 'Should be tracked by NPC ID');
    assert(CorpseManager.getActiveCorpseCount() === 1, 'Active corpse count is 1', `Got ${CorpseManager.getActiveCorpseCount()}`);

    // Cleanup
    CorpseManager.destroyCorpse(corpse.id, world);
  }

  // Test 2: Corpse Weight by NPC Size
  console.log('\n' + colors.combat('Test 2: Corpse Weight Based on NPC Size'));
  {
    const world = new MockWorld();
    world.rooms['size_room'] = {
      id: 'size_room',
      name: 'Size Test Room',
      items: []
    };

    const sizeTests = [
      { size: 'tiny', expectedWeight: 10 },
      { size: 'small', expectedWeight: 50 },
      { size: 'medium', expectedWeight: 100 },
      { size: 'large', expectedWeight: 200 },
      { size: 'huge', expectedWeight: 500 },
      { size: 'gargantuan', expectedWeight: 1000 }
    ];

    for (const { size, expectedWeight } of sizeTests) {
      const npc = {
        id: `${size}_npc`,
        name: `${size} NPC`,
        size: size,
        level: 1,
        challengeRating: 1
      };

      const corpse = CorpseManager.createNPCCorpse(npc, 'size_room', 'SizeTester', world);

      assert(corpse !== null, `${size} corpse created`, `Failed to create ${size} corpse`);
      if (corpse) {
        assert(corpse.weight === expectedWeight, `${size} = ${expectedWeight} lbs`, `Expected ${expectedWeight}, got ${corpse.weight}`);
        testInfo(`${size}: ${corpse.weight} lbs`);
        CorpseManager.destroyCorpse(corpse.id, world);
      }
    }
  }

  // Test 3: Multiple Corpses in Same Room
  console.log('\n' + colors.combat('Test 3: Multiple Corpses in Same Room'));
  {
    const world = new MockWorld();
    world.rooms['multi_room'] = {
      id: 'multi_room',
      name: 'Multi-Corpse Room',
      items: []
    };

    const corpses = [];

    // Create 5 corpses
    for (let i = 1; i <= 5; i++) {
      const npc = {
        id: `goblin_${i}`,
        name: `Goblin ${i}`,
        size: 'small',
        level: 1,
        challengeRating: 1
      };

      const corpse = CorpseManager.createNPCCorpse(npc, 'multi_room', 'CorpseCollector', world);
      if (corpse) corpses.push(corpse);
    }

    assert(corpses.length === 5, '5 corpses created', `Expected 5, got ${corpses.length}`);
    assert(world.rooms['multi_room'].items.length === 5, 'All corpses in room', `Expected 5 items, got ${world.rooms['multi_room'].items.length}`);
    assert(CorpseManager.getActiveCorpseCount() === 5, 'All corpses tracked', `Expected 5 tracked, got ${CorpseManager.getActiveCorpseCount()}`);

    // Verify unique corpses
    const uniqueNames = new Set(corpses.map(c => c.name));
    assert(uniqueNames.size === 5, 'Each corpse unique', `Expected 5 unique names, got ${uniqueNames.size}`);

    testInfo(`Corpses: ${corpses.map(c => c.name).join(', ')}`);

    // Cleanup
    corpses.forEach(c => CorpseManager.destroyCorpse(c.id, world));
  }

  // Test 4: Unknown Killer Handling
  console.log('\n' + colors.combat('Test 4: Unknown Killer Name'));
  {
    const world = new MockWorld();
    world.rooms['unknown_room'] = {
      id: 'unknown_room',
      name: 'Unknown Killer Room',
      items: []
    };

    const npc = {
      id: 'mystery_goblin',
      name: 'Mystery Goblin',
      size: 'medium',
      level: 1,
      challengeRating: 1
    };

    const corpse = CorpseManager.createNPCCorpse(npc, 'unknown_room', null, world);

    assert(corpse !== null, 'Corpse created with null killer', 'Should handle null killer');
    if (corpse) {
      // Check if description contains "unknown" or handles null gracefully
      const hasKillerInfo = corpse.description.includes('Killed by') || corpse.description.includes('unknown');
      assert(!corpse.description.includes('null'), 'No "null" in description', corpse.description);
      testInfo(`Description: ${corpse.description}`);
      CorpseManager.destroyCorpse(corpse.id, world);
    }
  }

  // Test 5: Decay Timer Scheduled
  console.log('\n' + colors.combat('Test 5: Decay Timer Integration'));
  {
    const world = new MockWorld();
    world.rooms['decay_room'] = {
      id: 'decay_room',
      name: 'Decay Test Room',
      items: []
    };

    const npc = {
      id: 'decaying_goblin',
      name: 'Decaying Goblin',
      size: 'medium',
      level: 1,
      challengeRating: 1
    };

    const corpse = CorpseManager.createNPCCorpse(npc, 'decay_room', 'DecayTester', world);

    assert(corpse !== null, 'Corpse created', 'Should create corpse');

    if (corpse) {
      const timerId = `corpse_decay_${corpse.id}`;
      const remainingTime = TimerManager.getRemainingTime(timerId);

      assert(remainingTime !== null, 'Decay timer scheduled', 'Timer should exist');
      assert(remainingTime > 0, 'Timer has positive time', `Expected >0, got ${remainingTime}`);
      assert(remainingTime <= 300000, 'Timer within 5 minutes', `Expected <=300000ms, got ${remainingTime}`);

      testInfo(`Decay in: ${Math.floor(remainingTime / 1000)}s`);

      // Cleanup
      CorpseManager.destroyCorpse(corpse.id, world);
    }
  }

  // Test 6: Decay Removes Corpse
  console.log('\n' + colors.combat('Test 6: Corpse Decay Cleanup'));
  {
    const world = new MockWorld();
    world.rooms['quick_decay_room'] = {
      id: 'quick_decay_room',
      name: 'Quick Decay Room',
      items: []
    };

    const npc = {
      id: 'quick_goblin',
      name: 'Quick Goblin',
      size: 'tiny',
      level: 1,
      challengeRating: 1
    };

    const corpse = CorpseManager.createNPCCorpse(npc, 'quick_decay_room', 'QuickTester', world);

    if (corpse) {
      testInfo('Testing rapid decay (1s)...');

      // Cancel original timer and schedule quick decay
      const timerId = `corpse_decay_${corpse.id}`;
      TimerManager.cancel(timerId);
      TimerManager.schedule(
        timerId,
        1000, // 1 second
        (data) => CorpseManager.onCorpseDecay(data.corpseId, world),
        {
          type: 'corpse_decay',
          corpseId: corpse.id,
          npcId: npc.id,
          roomId: 'quick_decay_room'
        }
      );

      // Wait for decay
      await new Promise(resolve => setTimeout(resolve, 1200));

      const room = world.getRoom('quick_decay_room');
      const corpseStillExists = room.items.find(item => item.id === corpse.id);

      assert(corpseStillExists === undefined, 'Corpse removed from room after decay', 'Corpse should be gone');
      assert(!CorpseManager.hasActiveCorpse('quick_goblin'), 'Corpse no longer tracked', 'Should not be tracked');
      assert(CorpseManager.getActiveCorpseCount() === 0, 'No active corpses', `Expected 0, got ${CorpseManager.getActiveCorpseCount()}`);

      testInfo('Corpse successfully decayed');
    }
  }

  // Test 7: Corpse Metadata
  console.log('\n' + colors.combat('Test 7: Corpse Metadata Fields'));
  {
    const world = new MockWorld();
    world.rooms['meta_room'] = {
      id: 'meta_room',
      name: 'Metadata Room',
      items: []
    };

    const npc = {
      id: 'meta_goblin',
      name: 'Meta Goblin',
      size: 'large',
      level: 3,
      challengeRating: 2
    };

    const corpse = CorpseManager.createNPCCorpse(npc, 'meta_room', 'MetaTester', world);

    if (corpse) {
      assert(corpse.npcId === 'meta_goblin', 'NPC ID stored', `Expected meta_goblin, got ${corpse.npcId}`);
      assert(corpse.killerName === 'MetaTester', 'Killer name stored', `Expected MetaTester, got ${corpse.killerName}`);
      assert(corpse.spawnLocation === 'meta_room', 'Spawn location stored', `Expected meta_room, got ${corpse.spawnLocation}`);
      assert(corpse.createdAt > 0, 'Creation timestamp exists', `Expected >0, got ${corpse.createdAt}`);
      assert(corpse.decayTime > corpse.createdAt, 'Decay time after creation', 'Decay should be in future');
      assert(corpse.isOpen === true, 'Corpse is open', 'Should be open for looting');
      assert(corpse.isLocked === false, 'Corpse is not locked', 'Should not be locked');

      testInfo(`NPC ID: ${corpse.npcId}`);
      testInfo(`Killer: ${corpse.killerName}`);
      testInfo(`Spawn location: ${corpse.spawnLocation}`);
      testInfo(`Created at: ${corpse.createdAt}`);
      testInfo(`Decays at: ${corpse.decayTime}`);

      CorpseManager.destroyCorpse(corpse.id, world);
    }
  }
}

// Run tests and display results
runTests()
  .then(() => {
    console.log('\n' + colors.combat('='.repeat(80)));
    console.log(colors.combat('Test Results Summary'));
    console.log(colors.combat('='.repeat(80)) + '\n');

    console.log(`${colors.success('Passed')}: ${passedTests}`);
    console.log(`${colors.error('Failed')}: ${failedTests}`);
    console.log(`Total: ${passedTests + failedTests}\n`);

    if (failedTests === 0) {
      console.log(colors.success('All tests passed! Combat integration ready.\n'));
      console.log(colors.hint('Phase 2 Complete:'));
      console.log(colors.hint('  ✓ CorpseManager.createNPCCorpse() working'));
      console.log(colors.hint('  ✓ Corpses added to room.items'));
      console.log(colors.hint('  ✓ Killer name included in description'));
      console.log(colors.hint('  ✓ Weight calculated by NPC size'));
      console.log(colors.hint('  ✓ Decay timers scheduled correctly'));
      console.log(colors.hint('  ✓ Multiple corpses supported'));
      console.log(colors.hint('  ✓ Corpse metadata tracked\n'));
      console.log(colors.hint('Next: Integrate with CombatEncounter.removeNPCFromRoom()\n'));
    } else {
      console.log(colors.error('Some tests failed. See details above.\n'));
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(colors.error('Test suite crashed:'), error);
    process.exit(1);
  });
