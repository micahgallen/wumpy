/**
 * Admin System Test Suite
 * Tests permissions, commands, storage, and ceiling rules
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('node:test');
const AdminService = require('../src/admin/service');
const { MemoryStorageAdapter } = require('../src/admin/storage');
const { Role, hasPermission, canPromote, canDemote, Command, getNextLowerRank } = require('../src/admin/permissions');
const RateLimiter = require('../src/admin/rateLimit');

describe('Admin Permissions System', () => {
  describe('Role Hierarchy', () => {
    it('should have correct role hierarchy', () => {
      const { RankValue } = require('../src/admin/permissions');
      assert.ok(RankValue[Role.ADMIN] > RankValue[Role.SHERIFF]);
      assert.ok(RankValue[Role.SHERIFF] > RankValue[Role.CREATOR]);
      assert.ok(RankValue[Role.CREATOR] > RankValue[Role.PLAYER]);
    });
  });

  describe('Permission Matrix', () => {
    it('should allow Sheriff to kick', () => {
      const actor = { role: Role.SHERIFF };
      assert.ok(hasPermission(actor, Command.KICK));
    });

    it('should allow Sheriff to ban', () => {
      const actor = { role: Role.SHERIFF };
      assert.ok(hasPermission(actor, Command.BAN));
    });

    it('should not allow Creator to ban', () => {
      const actor = { role: Role.CREATOR };
      assert.ok(!hasPermission(actor, Command.BAN));
    });

    it('should allow Creator to spawn', () => {
      const actor = { role: Role.CREATOR };
      assert.ok(hasPermission(actor, Command.SPAWN));
    });

    it('should allow Sheriff to spawn (inherited from Creator)', () => {
      const actor = { role: Role.SHERIFF };
      // Sheriff rank (2) is higher than Creator rank (1), so inherits spawn permission
      assert.ok(hasPermission(actor, Command.SPAWN));
    });

    it('should allow Creator to use addlevel', () => {
      const actor = { role: Role.CREATOR };
      assert.ok(hasPermission(actor, Command.ADDLEVEL));
    });

    it('should allow Sheriff to use addlevel (inherited from Creator)', () => {
      const actor = { role: Role.SHERIFF };
      assert.ok(hasPermission(actor, Command.ADDLEVEL));
    });

    it('should allow Creator to use removelevel', () => {
      const actor = { role: Role.CREATOR };
      assert.ok(hasPermission(actor, Command.REMOVELEVEL));
    });

    it('should allow Sheriff to use removelevel (inherited from Creator)', () => {
      const actor = { role: Role.SHERIFF };
      assert.ok(hasPermission(actor, Command.REMOVELEVEL));
    });

    it('should not allow Player to use addlevel', () => {
      const actor = { role: Role.PLAYER };
      assert.ok(!hasPermission(actor, Command.ADDLEVEL));
    });

    it('should not allow Player to use removelevel', () => {
      const actor = { role: Role.PLAYER };
      assert.ok(!hasPermission(actor, Command.REMOVELEVEL));
    });

    it('should allow Admin to use all commands', () => {
      const actor = { role: Role.ADMIN };
      assert.ok(hasPermission(actor, Command.KICK));
      assert.ok(hasPermission(actor, Command.BAN));
      assert.ok(hasPermission(actor, Command.KILL));
      assert.ok(hasPermission(actor, Command.SPAWN));
      assert.ok(hasPermission(actor, Command.ADDLEVEL));
      assert.ok(hasPermission(actor, Command.REMOVELEVEL));
      assert.ok(hasPermission(actor, Command.PROMOTE));
      assert.ok(hasPermission(actor, Command.DEMOTE));
    });

    it('should allow everyone to use adminhelp', () => {
      assert.ok(hasPermission({ role: Role.PLAYER }, Command.ADMINHELP));
      assert.ok(hasPermission({ role: Role.ADMIN }, Command.ADMINHELP));
    });
  });

  describe('Ceiling Rules - Promote', () => {
    it('should not allow non-Admin to promote', () => {
      const issuer = { id: 'sheriff1', role: Role.SHERIFF };
      const target = { id: 'player1', role: Role.PLAYER };
      const result = canPromote(issuer, target, Role.CREATOR);
      assert.ok(!result.allowed);
      assert.match(result.reason, /only admin can promote/i);
    });

    it('should not allow Creator to promote', () => {
      const issuer = { id: 'creator1', role: Role.CREATOR };
      const target = { id: 'player1', role: Role.PLAYER };
      const result = canPromote(issuer, target, Role.SHERIFF);
      assert.ok(!result.allowed);
      assert.match(result.reason, /only admin can promote/i);
    });

    it('should not allow self-promotion except for Admin', () => {
      const issuer = { id: 'creator1', role: Role.CREATOR };
      const target = { id: 'creator1', role: Role.CREATOR };
      const result = canPromote(issuer, target, Role.SHERIFF);
      assert.ok(!result.allowed);
      assert.match(result.reason, /cannot promote yourself/i);
    });

    it('should allow Admin to self-promote', () => {
      const issuer = { id: 'admin1', role: Role.ADMIN };
      const target = { id: 'admin1', role: Role.ADMIN };
      const result = canPromote(issuer, target, Role.ADMIN);
      assert.ok(result.allowed);
    });

    it('should allow Admin to promote to Sheriff', () => {
      const issuer = { id: 'admin1', role: Role.ADMIN };
      const target = { id: 'player1', role: Role.PLAYER };
      const result = canPromote(issuer, target, Role.SHERIFF);
      assert.ok(result.allowed);
    });

    it('should allow Admin to promote to Creator', () => {
      const issuer = { id: 'admin1', role: Role.ADMIN };
      const target = { id: 'player1', role: Role.PLAYER };
      const result = canPromote(issuer, target, Role.CREATOR);
      assert.ok(result.allowed);
    });

    it('should not allow promoting someone already at Admin rank (unless self)', () => {
      const issuer = { id: 'admin1', role: Role.ADMIN };
      const target = { id: 'admin2', role: Role.ADMIN };
      const result = canPromote(issuer, target, Role.ADMIN);
      assert.ok(!result.allowed);
    });
  });

  describe('Ceiling Rules - Demote', () => {
    it('should not allow non-Admin to demote', () => {
      const issuer = { id: 'sheriff1', role: Role.SHERIFF };
      const target = { id: 'creator1', role: Role.CREATOR };
      const result = canDemote(issuer, target);
      assert.ok(!result.allowed);
      assert.match(result.reason, /only admin can demote/i);
    });

    it('should not allow Creator to demote', () => {
      const issuer = { id: 'creator1', role: Role.CREATOR };
      const target = { id: 'sheriff1', role: Role.SHERIFF };
      const result = canDemote(issuer, target);
      assert.ok(!result.allowed);
      assert.match(result.reason, /only admin can demote/i);
    });

    it('should not allow self-demotion except for Admin', () => {
      const issuer = { id: 'sheriff1', role: Role.SHERIFF };
      const target = { id: 'sheriff1', role: Role.SHERIFF };
      const result = canDemote(issuer, target);
      assert.ok(!result.allowed);
      assert.match(result.reason, /cannot demote yourself/i);
    });

    it('should allow Admin to self-demote', () => {
      const issuer = { id: 'admin1', role: Role.ADMIN };
      const target = { id: 'admin1', role: Role.ADMIN };
      const result = canDemote(issuer, target);
      assert.ok(result.allowed);
    });

    it('should not allow demoting Player (already at minimum)', () => {
      const issuer = { id: 'admin1', role: Role.ADMIN };
      const target = { id: 'player1', role: Role.PLAYER };
      const result = canDemote(issuer, target);
      assert.ok(!result.allowed);
      assert.match(result.reason, /already at the minimum rank/i);
    });

    it('should allow Admin to demote Sheriff', () => {
      const issuer = { id: 'admin1', role: Role.ADMIN };
      const target = { id: 'sheriff1', role: Role.SHERIFF };
      const result = canDemote(issuer, target);
      assert.ok(result.allowed);
    });

    it('should allow Admin to demote Creator', () => {
      const issuer = { id: 'admin1', role: Role.ADMIN };
      const target = { id: 'creator1', role: Role.CREATOR };
      const result = canDemote(issuer, target);
      assert.ok(result.allowed);
    });

    it('should not allow demoting another Admin', () => {
      const issuer = { id: 'admin1', role: Role.ADMIN };
      const target = { id: 'admin2', role: Role.ADMIN };
      const result = canDemote(issuer, target);
      assert.ok(!result.allowed);
      assert.match(result.reason, /cannot demote someone at or above your rank/i);
    });
  });

  describe('One-Step Demotion', () => {
    it('should demote Admin to Sheriff', () => {
      assert.strictEqual(getNextLowerRank(Role.ADMIN), Role.SHERIFF);
    });

    it('should demote Sheriff to Creator', () => {
      assert.strictEqual(getNextLowerRank(Role.SHERIFF), Role.CREATOR);
    });

    it('should demote Creator to Player', () => {
      assert.strictEqual(getNextLowerRank(Role.CREATOR), Role.PLAYER);
    });

    it('should return null for Player', () => {
      assert.strictEqual(getNextLowerRank(Role.PLAYER), null);
    });
  });
});

describe('Admin Service', () => {
  let service;
  let storage;

  beforeEach(async () => {
    storage = new MemoryStorageAdapter();
    service = new AdminService(storage);
    await service.initialize();
  });

  describe('Role Management', () => {
    it('should grant role to player', async () => {
      const issuer = { id: 'admin', role: Role.ADMIN, name: 'Admin' };
      const result = await service.grantRole('player1', Role.SHERIFF, issuer, 'Player1', '192.168.1.1');

      assert.ok(result.success);
      assert.strictEqual(service.getRole('player1'), Role.SHERIFF);
    });

    it('should default to Player role when not set', () => {
      assert.strictEqual(service.getRole('unknown'), Role.PLAYER);
    });

    it('should revoke role', async () => {
      const issuer = { id: 'admin', role: Role.ADMIN, name: 'Admin' };
      await service.grantRole('player1', Role.CREATOR, issuer, 'Player1');

      const result = await service.revokeRole('player1', issuer);
      assert.ok(result.success);
      assert.strictEqual(service.getRole('player1'), Role.PLAYER);
    });

    it('should track player IPs', async () => {
      const issuer = { id: 'admin', role: Role.ADMIN, name: 'Admin' };
      await service.grantRole('player1', Role.CREATOR, issuer, 'Player1', '192.168.1.1');
      await service.updatePlayerInfo('player1', 'Player1', '192.168.1.2');

      const roleData = service.getRoleData('player1');
      assert.ok(roleData.ips.includes('192.168.1.1'));
      assert.ok(roleData.ips.includes('192.168.1.2'));
    });
  });

  describe('Ban System', () => {
    it('should ban player by ID', async () => {
      const issuer = { id: 'sheriff', role: Role.SHERIFF, name: 'Sheriff' };
      const target = { playerID: 'player1', name: 'Player1' };

      const result = await service.ban(target, issuer, 24, 'Test ban');
      assert.ok(result.success);

      const ban = service.isBanned('player1', null);
      assert.ok(ban);
      assert.strictEqual(ban.reason, 'Test ban');
    });

    it('should ban by IP', async () => {
      const issuer = { id: 'sheriff', role: Role.SHERIFF, name: 'Sheriff' };
      const target = { ip: '192.168.1.100' };

      await service.ban(target, issuer, 0, 'IP ban');

      const ban = service.isBanned(null, '192.168.1.100');
      assert.ok(ban);
    });

    it('should expire bans', async () => {
      const issuer = { id: 'sheriff', role: Role.SHERIFF, name: 'Sheriff' };
      const target = { playerID: 'player1', name: 'Player1' };

      // Ban for -1 hours (already expired)
      const expiredBan = {
        playerID: 'player1',
        reason: 'Expired',
        issuer: 'sheriff',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      };

      service.bans.push(expiredBan);

      const ban = service.isBanned('player1', null);
      assert.ok(!ban); // Should not find expired ban
    });

    it('should unban player', async () => {
      const issuer = { id: 'sheriff', role: Role.SHERIFF, name: 'Sheriff' };
      const target = { playerID: 'player1', name: 'Player1' };

      await service.ban(target, issuer, 24, 'Test ban');
      assert.ok(service.isBanned('player1', null));

      const result = await service.unban('player1', issuer);
      assert.ok(result.success);
      assert.ok(!service.isBanned('player1', null));
    });

    it('should list active bans', async () => {
      const issuer = { id: 'sheriff', role: Role.SHERIFF, name: 'Sheriff' };

      await service.ban({ playerID: 'player1' }, issuer, 24, 'Ban 1');
      await service.ban({ playerID: 'player2' }, issuer, 48, 'Ban 2');

      const bans = service.listBans();
      assert.strictEqual(bans.length, 2);
    });
  });

  describe('Promote/Demote Operations', () => {
    it('should promote player with ceiling checks', async () => {
      const issuer = { id: 'admin', role: Role.ADMIN, name: 'Admin' };
      const target = { id: 'player1', role: Role.PLAYER, name: 'Player1' };

      const result = await service.promote('player1', Role.CREATOR, issuer, target);
      assert.ok(result.success);
      assert.strictEqual(service.getRole('player1'), Role.CREATOR);
    });

    it('should reject promotion by non-Admin', async () => {
      const issuer = { id: 'sheriff1', role: Role.SHERIFF, name: 'Sheriff1' };
      const target = { id: 'player1', role: Role.PLAYER, name: 'Player1' };

      const result = await service.promote('player1', Role.CREATOR, issuer, target);
      assert.ok(!result.success);
      assert.match(result.message, /only admin can promote/i);
    });

    it('should demote player one step', async () => {
      const issuer = { id: 'admin', role: Role.ADMIN, name: 'Admin' };
      const target = { id: 'sheriff1', role: Role.SHERIFF, name: 'Sheriff1' };

      // First grant Sheriff role
      await service.grantRole('sheriff1', Role.SHERIFF, issuer, 'Sheriff1');

      // Then demote without specifying target role
      const result = await service.demote('sheriff1', null, issuer, target);
      assert.ok(result.success);
      assert.strictEqual(service.getRole('sheriff1'), Role.CREATOR);
    });

    it('should reject demotion by non-Admin', async () => {
      const issuer = { id: 'creator1', role: Role.CREATOR, name: 'Creator1' };
      const target = { id: 'sheriff1', role: Role.SHERIFF, name: 'Sheriff1' };

      await service.grantRole('sheriff1', Role.SHERIFF, issuer, 'Sheriff1');

      const result = await service.demote('sheriff1', Role.CREATOR, issuer, target);
      assert.ok(!result.success);
      assert.match(result.message, /only admin can demote/i);
    });
  });

  describe('Persistence', () => {
    it('should persist roles to storage', async () => {
      const issuer = { id: 'admin', role: Role.ADMIN, name: 'Admin' };
      await service.grantRole('player1', Role.SHERIFF, issuer, 'Player1');

      const savedRoles = await storage.loadRoles();
      assert.ok(savedRoles['player1']);
      assert.strictEqual(savedRoles['player1'].role, Role.SHERIFF);
    });

    it('should persist bans to storage', async () => {
      const issuer = { id: 'sheriff', role: Role.SHERIFF, name: 'Sheriff' };
      await service.ban({ playerID: 'player1' }, issuer, 24, 'Test');

      const savedBans = await storage.loadBans();
      assert.strictEqual(savedBans.length, 1);
      assert.strictEqual(savedBans[0].playerID, 'player1');
    });
  });
});

describe('Rate Limiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 5); // 3 commands per 5 seconds
  });

  it('should allow commands under limit', () => {
    limiter.recordCommand('player1');
    limiter.recordCommand('player1');

    const check = limiter.checkLimit('player1');
    assert.ok(check.allowed);
  });

  it('should block commands over limit', () => {
    limiter.recordCommand('player1');
    limiter.recordCommand('player1');
    limiter.recordCommand('player1');

    const check = limiter.checkLimit('player1');
    assert.ok(!check.allowed);
    assert.ok(check.resetIn > 0);
  });

  it('should track different players separately', () => {
    limiter.recordCommand('player1');
    limiter.recordCommand('player1');
    limiter.recordCommand('player1');

    const check1 = limiter.checkLimit('player1');
    const check2 = limiter.checkLimit('player2');

    assert.ok(!check1.allowed);
    assert.ok(check2.allowed);
  });

  it('should clear limit for player', () => {
    limiter.recordCommand('player1');
    limiter.recordCommand('player1');
    limiter.recordCommand('player1');

    limiter.clearLimit('player1');

    const check = limiter.checkLimit('player1');
    assert.ok(check.allowed);
  });

  it('should cleanup old entries', () => {
    limiter.recordCommand('player1');

    // Wait a bit and cleanup
    setTimeout(() => {
      limiter.cleanup();
      assert.strictEqual(limiter.commandLog.size, 0);
    }, 6000);
  });
});

describe('Storage Adapters', () => {
  describe('MemoryStorageAdapter', () => {
    it('should store and retrieve roles', async () => {
      const storage = new MemoryStorageAdapter();
      const roles = { player1: { role: Role.SHERIFF } };

      await storage.saveRoles(roles);
      const loaded = await storage.loadRoles();

      assert.deepStrictEqual(loaded, roles);
    });

    it('should store and retrieve bans', async () => {
      const storage = new MemoryStorageAdapter();
      const bans = [{ playerID: 'player1', reason: 'Test' }];

      await storage.saveBans(bans);
      const loaded = await storage.loadBans();

      assert.deepStrictEqual(loaded, bans);
    });

    it('should clear all data', async () => {
      const storage = new MemoryStorageAdapter();

      await storage.saveRoles({ player1: { role: Role.CREATOR } });
      await storage.saveBans([{ playerID: 'player1' }]);

      storage.clear();

      const roles = await storage.loadRoles();
      const bans = await storage.loadBans();

      assert.deepStrictEqual(roles, {});
      assert.deepStrictEqual(bans, []);
    });
  });
});

describe('Level Manipulation Commands', () => {
  let adminService;
  let storage;
  let playerDB;
  let rateLimiter;
  let allPlayers;
  let context;

  const { addlevelCommand, removelevelCommand } = require('../src/admin/commands');

  beforeEach(async () => {
    storage = new MemoryStorageAdapter();
    adminService = new AdminService(storage);
    await adminService.initialize();

    // Grant Creator role to testcreator
    const admin = { id: 'admin', role: Role.ADMIN, name: 'Admin' };
    await adminService.grantRole('testcreator', Role.CREATOR, admin, 'TestCreator');
    await adminService.grantRole('testsheriff', Role.SHERIFF, admin, 'TestSheriff');

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
      }
    };

    // Add test player to database
    players.set('testplayer', {
      username: 'testplayer',
      level: 5,
      maxHp: 70,
      hp: 70
    });

    allPlayers = new Set();
    rateLimiter = new RateLimiter(10, 60);

    context = {
      adminService,
      allPlayers,
      playerDB,
      rateLimiter
    };
  });

  describe('addlevel command', () => {
    it('should allow Creator to add levels', async () => {
      const messages = [];
      const mockPlayer = {
        username: 'testcreator',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockPlayer, ['testplayer', '2'], context);

      const updated = playerDB.getPlayer('testplayer');
      assert.strictEqual(updated.level, 7);
      assert.ok(messages.some(m => m.includes('7')));
    });

    it('should allow Sheriff to add levels', async () => {
      const messages = [];
      const mockPlayer = {
        username: 'testsheriff',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockPlayer, ['testplayer', '3'], context);

      const updated = playerDB.getPlayer('testplayer');
      assert.strictEqual(updated.level, 8);
    });

    it('should not allow Player to add levels', async () => {
      const messages = [];
      const mockPlayer = {
        username: 'normalplayer',
        send: (msg) => messages.push(msg)
      };

      await addlevelCommand(mockPlayer, ['testplayer', '2'], context);

      const updated = playerDB.getPlayer('testplayer');
      assert.strictEqual(updated.level, 5); // Unchanged
      assert.ok(messages.some(m => m.includes('permission')));
    });
  });

  describe('removelevel command', () => {
    it('should allow Creator to remove levels', async () => {
      const messages = [];
      const mockPlayer = {
        username: 'testcreator',
        send: (msg) => messages.push(msg)
      };

      await removelevelCommand(mockPlayer, ['testplayer', '2'], context);

      const updated = playerDB.getPlayer('testplayer');
      assert.strictEqual(updated.level, 3);
      assert.ok(messages.some(m => m.includes('3')));
    });

    it('should allow Sheriff to remove levels', async () => {
      const messages = [];
      const mockPlayer = {
        username: 'testsheriff',
        send: (msg) => messages.push(msg)
      };

      await removelevelCommand(mockPlayer, ['testplayer', '1'], context);

      const updated = playerDB.getPlayer('testplayer');
      assert.strictEqual(updated.level, 4);
    });

    it('should not allow removing below level 1', async () => {
      const messages = [];
      const mockPlayer = {
        username: 'testcreator',
        send: (msg) => messages.push(msg)
      };

      await removelevelCommand(mockPlayer, ['testplayer', '10'], context);

      const updated = playerDB.getPlayer('testplayer');
      assert.strictEqual(updated.level, 1); // Should be capped at 1
    });

    it('should properly adjust HP when removing levels', async () => {
      const messages = [];
      const mockPlayer = {
        username: 'testcreator',
        send: (msg) => messages.push(msg)
      };

      await removelevelCommand(mockPlayer, ['testplayer', '2'], context);

      const updated = playerDB.getPlayer('testplayer');
      assert.strictEqual(updated.level, 3);
      assert.strictEqual(updated.maxHp, 50); // 70 - (2 * 10)
      assert.ok(updated.hp <= updated.maxHp);
    });

    it('should not allow Player to remove levels', async () => {
      const messages = [];
      const mockPlayer = {
        username: 'normalplayer',
        send: (msg) => messages.push(msg)
      };

      await removelevelCommand(mockPlayer, ['testplayer', '2'], context);

      const updated = playerDB.getPlayer('testplayer');
      assert.strictEqual(updated.level, 5); // Unchanged
      assert.ok(messages.some(m => m.includes('permission')));
    });

    it('should error when already at level 1', async () => {
      // Set player to level 1
      playerDB.updatePlayerLevel('testplayer', 1, 20, 20);

      const messages = [];
      const mockPlayer = {
        username: 'testcreator',
        send: (msg) => messages.push(msg)
      };

      await removelevelCommand(mockPlayer, ['testplayer', '1'], context);

      const updated = playerDB.getPlayer('testplayer');
      assert.strictEqual(updated.level, 1);
      assert.ok(messages.some(m => m.includes('already at level 1')));
    });

    it('should require positive number of levels', async () => {
      const messages = [];
      const mockPlayer = {
        username: 'testcreator',
        send: (msg) => messages.push(msg)
      };

      await removelevelCommand(mockPlayer, ['testplayer', '0'], context);

      const updated = playerDB.getPlayer('testplayer');
      assert.strictEqual(updated.level, 5); // Unchanged
      assert.ok(messages.some(m => m.includes('positive number')));
    });
  });
});

console.log('\n=== Running Admin System Tests ===\n');
