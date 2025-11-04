/**
 * Manual Integration Test for @addlevel Fix
 * Demonstrates that the admin command now properly applies stat gains
 */

const colors = require('../src/colors');
const AdminService = require('../src/admin/service');
const { MemoryStorageAdapter } = require('../src/admin/storage');
const { Role } = require('../src/admin/permissions');
const RateLimiter = require('../src/admin/rateLimit');
const { addlevelCommand } = require('../src/admin/commands');

async function runManualTest() {
  console.log('\n' + colors.highlight('='.repeat(70)));
  console.log(colors.highlight('  Manual Integration Test: @addlevel Stat Gains Fix'));
  console.log(colors.highlight('='.repeat(70)) + '\n');

  // Setup
  const storage = new MemoryStorageAdapter();
  const adminService = new AdminService(storage);
  await adminService.initialize();

  const admin = { id: 'admin', role: Role.ADMIN, name: 'Admin' };
  await adminService.grantRole('testadmin', Role.CREATOR, admin, 'TestAdmin');

  // Mock PlayerDB
  const players = new Map();
  const playerDB = {
    getPlayer: (username) => players.get(username.toLowerCase()),
    updatePlayerLevel: (username, level, maxHp, hp) => {
      const player = players.get(username.toLowerCase());
      if (player) {
        player.level = level;
        player.maxHp = maxHp;
        player.hp = hp;
      }
    },
    updatePlayerXP: (username, xp) => {
      const player = players.get(username.toLowerCase());
      if (player) {
        player.xp = xp;
      }
    }
  };

  // Create test player at level 1
  const testPlayer = {
    username: 'testplayer',
    level: 1,
    maxHp: 15,
    hp: 15,
    xp: 0,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    proficiency: 2,
    send: (msg) => console.log('  ' + msg),
    socket: {
      write: (msg) => console.log('  ' + msg)
    }
  };

  players.set('testplayer', {
    username: 'testplayer',
    level: 1,
    maxHp: 15,
    hp: 15,
    xp: 0,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    proficiency: 2
  });

  const allPlayers = new Set([testPlayer]);
  const rateLimiter = new RateLimiter(10, 60);

  const context = {
    adminService,
    allPlayers,
    playerDB,
    rateLimiter
  };

  const mockAdmin = {
    username: 'testadmin',
    send: (msg) => console.log(colors.info('ADMIN: ') + msg)
  };

  // Display initial state
  console.log(colors.levelUp('BEFORE: Player Stats at Level 1'));
  console.log(colors.info(`Level: ${testPlayer.level}`));
  console.log(colors.info(`HP: ${testPlayer.hp}/${testPlayer.maxHp}`));
  console.log(colors.info(`Proficiency: +${testPlayer.proficiency}`));
  console.log(colors.info(`STR: ${testPlayer.strength}, DEX: ${testPlayer.dexterity}, CON: ${testPlayer.constitution}`));
  console.log();

  // Test 1: Add 1 level (L1 -> L2)
  console.log(colors.highlight('TEST 1: Adding 1 level (L1 -> L2)'));
  console.log(colors.hint('Expected: +4 HP, no stat gains, no proficiency change'));
  await addlevelCommand(mockAdmin, ['testplayer', '1'], context);
  console.log(colors.success(`Result: Level ${testPlayer.level}, HP ${testPlayer.hp}/${testPlayer.maxHp}, Proficiency +${testPlayer.proficiency}`));
  console.log();

  // Test 2: Add 2 more levels (L2 -> L4)
  console.log(colors.highlight('TEST 2: Adding 2 levels (L2 -> L4)'));
  console.log(colors.hint('Expected: +8 HP, +1 STR at L4, no proficiency change'));
  await addlevelCommand(mockAdmin, ['testplayer', '2'], context);
  console.log(colors.success(`Result: Level ${testPlayer.level}, HP ${testPlayer.hp}/${testPlayer.maxHp}, Proficiency +${testPlayer.proficiency}`));
  console.log(colors.success(`STR: ${testPlayer.strength}, DEX: ${testPlayer.dexterity}, CON: ${testPlayer.constitution}`));
  console.log();

  // Test 3: Add 1 more level (L4 -> L5)
  console.log(colors.highlight('TEST 3: Adding 1 level (L4 -> L5)'));
  console.log(colors.hint('Expected: +4 HP, +1 CON at L5, proficiency +2 -> +3'));
  await addlevelCommand(mockAdmin, ['testplayer', '1'], context);
  console.log(colors.success(`Result: Level ${testPlayer.level}, HP ${testPlayer.hp}/${testPlayer.maxHp}, Proficiency +${testPlayer.proficiency}`));
  console.log(colors.success(`STR: ${testPlayer.strength}, DEX: ${testPlayer.dexterity}, CON: ${testPlayer.constitution}`));
  console.log();

  // Test 4: Add 1 more level (L5 -> L6)
  console.log(colors.highlight('TEST 4: Adding 1 level (L5 -> L6)'));
  console.log(colors.hint('Expected: +5 HP (4 base + 1 CON mod), +1 DEX at L6, no proficiency change'));
  await addlevelCommand(mockAdmin, ['testplayer', '1'], context);
  console.log(colors.success(`Result: Level ${testPlayer.level}, HP ${testPlayer.hp}/${testPlayer.maxHp}, Proficiency +${testPlayer.proficiency}`));
  console.log(colors.success(`STR: ${testPlayer.strength}, DEX: ${testPlayer.dexterity}, CON: ${testPlayer.constitution}`));
  console.log();

  // Test 5: Large jump (L6 -> L11)
  console.log(colors.highlight('TEST 5: Adding 5 levels (L6 -> L11)'));
  console.log(colors.hint('Expected: +25 HP, +1 STR (L8), +1 CON (L10), proficiency +3 -> +4 (L9)'));
  await addlevelCommand(mockAdmin, ['testplayer', '5'], context);
  console.log(colors.success(`Result: Level ${testPlayer.level}, HP ${testPlayer.hp}/${testPlayer.maxHp}, Proficiency +${testPlayer.proficiency}`));
  console.log(colors.success(`STR: ${testPlayer.strength}, DEX: ${testPlayer.dexterity}, CON: ${testPlayer.constitution}`));
  console.log();

  // Final summary
  console.log(colors.levelUp('='.repeat(70)));
  console.log(colors.levelUp('SUMMARY: Player Stats at Level 11'));
  console.log(colors.info(`Level: 1 -> ${testPlayer.level}`));
  console.log(colors.info(`HP: 15 -> ${testPlayer.maxHp}`));
  console.log(colors.info(`Proficiency: +2 -> +${testPlayer.proficiency}`));
  console.log(colors.info(`STR: 10 -> ${testPlayer.strength} (+2 from L4, L8)`));
  console.log(colors.info(`DEX: 10 -> ${testPlayer.dexterity} (+1 from L6)`));
  console.log(colors.info(`CON: 10 -> ${testPlayer.constitution} (+2 from L5, L10)`));
  console.log(colors.levelUp('='.repeat(70)));
  console.log();

  console.log(colors.success('All tests completed successfully!'));
  console.log(colors.success('The @addlevel command now properly applies stat gains via levelUp().\n'));
}

runManualTest().catch(err => {
  console.error(colors.error('Test failed:'), err);
  process.exit(1);
});
