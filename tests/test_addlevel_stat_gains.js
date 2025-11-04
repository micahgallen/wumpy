/**
 * Test Suite for Admin @addlevel Command - Stat Gains Fix
 * Verifies that the @addlevel command properly applies stat gains via levelUp()
 */

const assert = require('assert');
const { describe, it, beforeEach } = require('node:test');
const AdminService = require('../src/admin/service');
const { MemoryStorageAdapter } = require('../src/admin/storage');
const { Role } = require('../src/admin/permissions');
const RateLimiter = require('../src/admin/rateLimit');
const { addlevelCommand } = require('../src/admin/commands');

describe('Admin @addlevel Command - Stat Gains Fix', () => {
  let adminService;
  let storage;
  let playerDB;
  let rateLimiter;
  let allPlayers;
  let context;
  let mockOnlinePlayer;
  let messages;

  beforeEach(async () => {
    storage = new MemoryStorageAdapter();
    adminService = new AdminService(storage);
    await adminService.initialize();

    // Grant Creator role to test admin
    const admin = { id: 'admin', role: Role.ADMIN, name: 'Admin' };
    await adminService.grantRole('testadmin', Role.CREATOR, admin, 'TestAdmin');

    // Mock PlayerDB
    const players = new Map();
    playerDB = {
      getPlayer: (username) => {
        return players.get(username.toLowerCase());
      },
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

    // Add test player to database with level 1 stats
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

    allPlayers = new Set();
    messages = [];

    // Create mock online player
    mockOnlinePlayer = {
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
      send: (msg) => messages.push(msg),
      socket: {
        write: (msg) => messages.push(msg)
      }
    };

    rateLimiter = new RateLimiter(10, 60);

    context = {
      adminService,
      allPlayers,
      playerDB,
      rateLimiter
    };
  });

  describe('Single Level Increase', () => {
    it('should apply proper HP gain for 1 level', async () => {
      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '1'], context);

      // Level 1 -> 2: +4 HP (base) + 0 (CON mod) = +4 HP
      assert.strictEqual(mockOnlinePlayer.level, 2, 'Level should increase to 2');
      assert.strictEqual(mockOnlinePlayer.maxHp, 19, 'Max HP should be 19 (15 + 4)');
      assert.strictEqual(mockOnlinePlayer.hp, 19, 'HP should be full (full heal on level-up)');
    });

    it('should update proficiency bonus at level 5', async () => {
      // Set player to level 4
      mockOnlinePlayer.level = 4;
      mockOnlinePlayer.proficiency = 2;
      playerDB.updatePlayerLevel('testplayer', 4, 30, 30);

      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '1'], context);

      // Level 4 -> 5: proficiency should increase from +2 to +3
      assert.strictEqual(mockOnlinePlayer.level, 5, 'Level should increase to 5');
      assert.strictEqual(mockOnlinePlayer.proficiency, 3, 'Proficiency should increase to +3');
    });

    it('should apply stat gain at level 4', async () => {
      // Set player to level 3
      mockOnlinePlayer.level = 3;
      mockOnlinePlayer.strength = 10;
      playerDB.updatePlayerLevel('testplayer', 3, 25, 25);

      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '1'], context);

      // Level 3 -> 4: should gain +1 STR (every 4th level)
      assert.strictEqual(mockOnlinePlayer.level, 4, 'Level should increase to 4');
      assert.strictEqual(mockOnlinePlayer.strength, 11, 'Strength should increase to 11');
    });

    it('should apply stat gain at level 5', async () => {
      // Set player to level 4
      mockOnlinePlayer.level = 4;
      mockOnlinePlayer.constitution = 10;
      playerDB.updatePlayerLevel('testplayer', 4, 30, 30);

      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '1'], context);

      // Level 4 -> 5: should gain +1 CON (every 5th level)
      assert.strictEqual(mockOnlinePlayer.level, 5, 'Level should increase to 5');
      assert.strictEqual(mockOnlinePlayer.constitution, 11, 'Constitution should increase to 11');
    });

    it('should apply stat gain at level 6', async () => {
      // Set player to level 5
      mockOnlinePlayer.level = 5;
      mockOnlinePlayer.dexterity = 10;
      playerDB.updatePlayerLevel('testplayer', 5, 35, 35);

      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '1'], context);

      // Level 5 -> 6: should gain +1 DEX (every 6th level)
      assert.strictEqual(mockOnlinePlayer.level, 6, 'Level should increase to 6');
      assert.strictEqual(mockOnlinePlayer.dexterity, 11, 'Dexterity should increase to 11');
    });
  });

  describe('Multiple Level Increases', () => {
    it('should apply proper HP gains for 5 levels', async () => {
      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '5'], context);

      // Level 1 -> 6: +4 HP per level * 5 = +20 HP
      assert.strictEqual(mockOnlinePlayer.level, 6, 'Level should increase to 6');
      assert.strictEqual(mockOnlinePlayer.maxHp, 35, 'Max HP should be 35 (15 + 20)');
      assert.strictEqual(mockOnlinePlayer.hp, 35, 'HP should be full');
    });

    it('should apply all stat gains across multiple levels', async () => {
      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '6'], context);

      // Level 1 -> 7
      // Level 4: +1 STR
      // Level 5: +1 CON
      // Level 6: +1 DEX
      assert.strictEqual(mockOnlinePlayer.level, 7, 'Level should increase to 7');
      assert.strictEqual(mockOnlinePlayer.strength, 11, 'Strength should increase to 11 (level 4)');
      assert.strictEqual(mockOnlinePlayer.constitution, 11, 'Constitution should increase to 11 (level 5)');
      assert.strictEqual(mockOnlinePlayer.dexterity, 11, 'Dexterity should increase to 11 (level 6)');
    });

    it('should update proficiency bonus at correct breakpoints', async () => {
      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '8'], context);

      // Level 1 -> 9: proficiency should be +4 (+2 base + 2 from (9-1)/4 = 2)
      assert.strictEqual(mockOnlinePlayer.level, 9, 'Level should increase to 9');
      assert.strictEqual(mockOnlinePlayer.proficiency, 4, 'Proficiency should increase to +4');
    });

    it('should apply full heal on each level-up', async () => {
      // Set player with damaged HP
      mockOnlinePlayer.hp = 5;
      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '1'], context);

      // After level-up, HP should be full
      assert.strictEqual(mockOnlinePlayer.hp, mockOnlinePlayer.maxHp, 'HP should be full after level-up');
    });

    it('should handle large level jumps correctly', async () => {
      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '10'], context);

      // Level 1 -> 11
      // Multiple stat gains should be applied
      assert.strictEqual(mockOnlinePlayer.level, 11, 'Level should increase to 11');
      // Level 4, 8: +2 STR total
      assert.strictEqual(mockOnlinePlayer.strength, 12, 'Strength should be 12');
      // Level 5, 10: +2 CON total
      assert.strictEqual(mockOnlinePlayer.constitution, 12, 'Constitution should be 12');
      // Level 6: +1 DEX
      assert.strictEqual(mockOnlinePlayer.dexterity, 11, 'Dexterity should be 11');
      // Proficiency: +2 + floor(10/4) = +4
      assert.strictEqual(mockOnlinePlayer.proficiency, 4, 'Proficiency should be +4');
    });
  });

  describe('Level Decreases', () => {
    it('should recalculate HP when reducing level', async () => {
      // Set player to level 5
      mockOnlinePlayer.level = 5;
      mockOnlinePlayer.maxHp = 35;
      mockOnlinePlayer.hp = 35;
      mockOnlinePlayer.constitution = 10;
      playerDB.updatePlayerLevel('testplayer', 5, 35, 35);

      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '-2'], context);

      // Level 5 -> 3
      // Base HP: 15 + CON mod (0) = 15
      // Level HP: (3-1) * 4 = 8
      // Total: 23
      assert.strictEqual(mockOnlinePlayer.level, 3, 'Level should decrease to 3');
      assert.strictEqual(mockOnlinePlayer.maxHp, 23, 'Max HP should be recalculated to 23');
      assert.ok(mockOnlinePlayer.hp <= mockOnlinePlayer.maxHp, 'Current HP should not exceed max HP');
    });

    it('should recalculate proficiency when reducing level', async () => {
      // Set player to level 5
      mockOnlinePlayer.level = 5;
      mockOnlinePlayer.proficiency = 3;
      playerDB.updatePlayerLevel('testplayer', 5, 35, 35);

      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '-2'], context);

      // Level 5 -> 3: proficiency should decrease from +3 to +2
      assert.strictEqual(mockOnlinePlayer.level, 3, 'Level should decrease to 3');
      assert.strictEqual(mockOnlinePlayer.proficiency, 2, 'Proficiency should decrease to +2');
    });

    it('should warn about stat gains not being reversed', async () => {
      // Set player to level 5
      mockOnlinePlayer.level = 5;
      playerDB.updatePlayerLevel('testplayer', 5, 35, 35);

      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '-1'], context);

      // Check that a warning message was sent
      const hasWarning = messages.some(m =>
        m.includes('Stat gains') && m.includes('not reversed')
      );
      assert.ok(hasWarning, 'Should warn about stat gains not being reversed');
    });
  });

  describe('Offline Player Handling', () => {
    it('should update database for offline player', async () => {
      // Don't add player to allPlayers (offline)

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '2'], context);

      // Check database was updated
      const dbPlayer = playerDB.getPlayer('testplayer');
      assert.strictEqual(dbPlayer.level, 3, 'Database level should be updated to 3');

      // Check that admin received offline notification
      const hasOfflineMessage = messages.some(m => m.includes('offline'));
      assert.ok(hasOfflineMessage, 'Should notify admin that player is offline');
    });
  });

  describe('Message Verification', () => {
    it('should notify player of stat gains', async () => {
      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '1'], context);

      const hasStatGainMessage = messages.some(m => m.includes('stat gains'));
      assert.ok(hasStatGainMessage, 'Should notify player of stat gains');
    });

    it('should show HP and proficiency in notification', async () => {
      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '1'], context);

      const hasHpMessage = messages.some(m => m.includes('HP'));
      const hasProfMessage = messages.some(m => m.includes('Proficiency'));
      assert.ok(hasHpMessage, 'Should show HP in notification');
      assert.ok(hasProfMessage, 'Should show proficiency in notification');
    });

    it('should notify admin of successful stat application', async () => {
      allPlayers.add(mockOnlinePlayer);

      const mockAdmin = {
        username: 'testadmin',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockAdmin, ['testplayer', '3'], context);

      const hasSuccessMessage = messages.some(m =>
        m.includes('Applied') && m.includes('level')
      );
      assert.ok(hasSuccessMessage, 'Should notify admin of success');
    });
  });
});

console.log('\n=== Running @addlevel Stat Gains Fix Tests ===\n');
