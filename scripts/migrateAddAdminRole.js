#!/usr/bin/env node
/**
 * Migration Script: Add Admin Role System
 *
 * This script migrates existing player data to support the new admin role system:
 * 1. Creates backup of players.json
 * 2. Adds 'role: "Player"' to all existing players
 * 3. Sets 'role: "Admin"' for player "cyberslayer"
 *
 * Usage: node scripts/migrateAddAdminRole.js
 */

const fs = require('fs');
const path = require('path');

const PLAYERS_FILE = path.join(__dirname, '../players.json');
const BACKUP_DIR = path.join(__dirname, '../backups');

/**
 * Ensure backup directory exists
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

/**
 * Create backup of players.json
 */
function createBackup() {
  if (!fs.existsSync(PLAYERS_FILE)) {
    console.error('Error: players.json not found!');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const backupFile = path.join(BACKUP_DIR, `players-backup-${timestamp}.json`);

  fs.copyFileSync(PLAYERS_FILE, backupFile);
  console.log(`Backup created: ${backupFile}`);

  return backupFile;
}

/**
 * Migrate player data
 */
function migratePlayerData() {
  console.log('\n=== Starting Migration ===\n');

  // Create backup
  ensureBackupDir();
  const backupFile = createBackup();

  // Load players data
  const data = fs.readFileSync(PLAYERS_FILE, 'utf8');
  const players = JSON.parse(data);

  let modifiedCount = 0;
  let cyberslayerFound = false;

  // Process each player
  for (const [playerID, playerData] of Object.entries(players)) {
    // Skip if already has role assigned
    if (playerData.role) {
      console.log(`Player ${playerID} already has role: ${playerData.role}`);
      continue;
    }

    // Set default role to Player
    playerData.role = 'Player';
    modifiedCount++;

    // Special case: cyberslayer gets Admin role
    if (playerID === 'cyberslayer') {
      playerData.role = 'Admin';
      cyberslayerFound = true;
      console.log(`✓ Granted Admin role to cyberslayer`);
    } else {
      console.log(`✓ Set Player role for ${playerID}`);
    }
  }

  // Save migrated data
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2), 'utf8');

  console.log('\n=== Migration Complete ===');
  console.log(`Total players migrated: ${modifiedCount}`);
  console.log(`Cyberslayer found: ${cyberslayerFound ? 'Yes (granted Admin role)' : 'No'}`);
  console.log(`Backup saved to: ${backupFile}`);

  if (!cyberslayerFound) {
    console.log('\nNote: Player "cyberslayer" was not found in the database.');
    console.log('They will be granted Admin role automatically on first login.');
  }
}

/**
 * Verify migration
 */
function verifyMigration() {
  console.log('\n=== Verification ===\n');

  const data = fs.readFileSync(PLAYERS_FILE, 'utf8');
  const players = JSON.parse(data);

  let totalPlayers = 0;
  let playersWithRole = 0;
  let admins = 0;

  for (const [playerID, playerData] of Object.entries(players)) {
    totalPlayers++;
    if (playerData.role) {
      playersWithRole++;
      if (playerData.role === 'Admin') {
        admins++;
        console.log(`Admin: ${playerID} (${playerData.username || playerID})`);
      }
    }
  }

  console.log(`\nTotal players: ${totalPlayers}`);
  console.log(`Players with role: ${playersWithRole}`);
  console.log(`Admins: ${admins}`);

  if (playersWithRole === totalPlayers) {
    console.log('\n✓ All players have roles assigned!');
  } else {
    console.log(`\n⚠ Warning: ${totalPlayers - playersWithRole} players missing role assignment`);
  }
}

// Main execution
try {
  migratePlayerData();
  verifyMigration();
  console.log('\n✓ Migration successful!\n');
} catch (err) {
  console.error('\n✗ Migration failed:', err);
  process.exit(1);
}
