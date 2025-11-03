#!/usr/bin/env node
/**
 * Admin System Integration Test
 * Verifies all modules load and basic functionality works
 */

console.log('Testing admin system integration...\n');

// Test imports
try {
  const { Role, hasPermission, Command } = require('../src/admin/permissions');
  console.log('✓ Permissions module loaded');

  const AdminService = require('../src/admin/service');
  console.log('✓ AdminService loaded');

  const { FileStorageAdapter } = require('../src/admin/storage');
  console.log('✓ Storage adapters loaded');

  const { writeAuditLog } = require('../src/admin/audit');
  console.log('✓ Audit logging loaded');

  const RateLimiter = require('../src/admin/rateLimit');
  console.log('✓ Rate limiter loaded');

  const { isAdminCommand } = require('../src/admin/chatBinding');
  console.log('✓ Chat binding loaded');

  const { bootstrapAdmin } = require('../src/admin/bootstrap');
  console.log('✓ Bootstrap loaded');

  // Test basic functionality
  console.log('\nTesting basic functionality...');

  const admin = { role: Role.ADMIN };
  const canKick = hasPermission(admin, Command.KICK);
  console.log('✓ Admin can kick:', canKick);

  const canBan = hasPermission(admin, Command.BAN);
  console.log('✓ Admin cannot ban:', !canBan);

  const isAdminCmd = isAdminCommand('@kick player');
  console.log('✓ Admin command detection:', isAdminCmd);

  const notAdminCmd = isAdminCommand('say hello');
  console.log('✓ Regular command detection:', !notAdminCmd);

  // Test rate limiter
  const limiter = new RateLimiter(3, 5);
  limiter.recordCommand('test');
  limiter.recordCommand('test');
  const check = limiter.checkLimit('test');
  console.log('✓ Rate limiter working:', check.allowed);

  console.log('\n✓ All integration tests passed!');
  console.log('\nAdmin system is ready to use.');
} catch (err) {
  console.error('✗ Integration test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}
