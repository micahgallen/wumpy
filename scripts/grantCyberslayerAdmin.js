#!/usr/bin/env node
/**
 * Grant Admin Role to cyberslayer
 * Use when a fresh player database was created and automatic bootstrap hasn't yet promoted.
 * Safe re-run: will overwrite role assignment with Admin.
 */

const path = require('path');
const AdminService = require('../src/admin/service');
const { FileStorageAdapter } = require('../src/admin/storage');
const { Role } = require('../src/admin/permissions');

async function main() {
  // Data directory inside repo
  const dataDir = path.join(__dirname, '..', 'data', 'admin');
  const storage = new FileStorageAdapter(dataDir);
  const adminService = new AdminService(storage);
  await adminService.initialize();

  const issuer = { id: 'SYSTEM', role: Role.ADMIN, name: 'SYSTEM' };
  const targetID = 'cyberslayer';

  // Grant Admin role
  const result = await adminService.grantRole(targetID, Role.ADMIN, issuer, 'cyberslayer', null);
  console.log(result.message);

  // Show roles summary
  const roles = adminService.roles;
  console.log('\nCurrent Roles:');
  for (const [id, data] of Object.entries(roles)) {
    console.log(`  ${id} => ${data.role} (grantedBy=${data.grantedBy}, grantedAt=${data.grantedAt})`);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Failed to grant Admin role:', err);
  process.exit(1);
});
