# Persistence Data Cleanup Guide

**Version:** 1.0
**Date:** 2025-11-12
**Status:** Production Ready
**Related:** [INDEX.md](INDEX.md) | [FIXES_GUIDE.md](FIXES_GUIDE.md) | [TESTING_GUIDE.md](TESTING_GUIDE.md)

---

## Quick Start

**Cleanup Time:** 30-60 minutes
**Risk Level:** Medium (backup required)

**Steps:**
1. Stop server
2. Backup all data files
3. Run cleanup script
4. Validate cleaned data
5. Restart server

---

## Table of Contents

1. [Current Data Corruption](#1-current-data-corruption)
2. [Backup Procedures](#2-backup-procedures)
3. [Cleanup Script](#3-cleanup-script)
4. [Manual Cleanup](#4-manual-cleanup)
5. [Validation](#5-validation)
6. [Deployment Steps](#6-deployment-steps)

---

## 1. Current Data Corruption

### 1.1 Corruption Examples

**Example 1: Item in container with player location tag**
```json
// In /home/micah/wumpy/data/containers.json
{
  "containerId": "chest_sesame_01",
  "inventory": [
    {
      "instanceId": "91afe0ad-1011-438d-8065-1996b19ec2e0",
      "definitionId": "minor_health_potion",
      "location": {
        "type": "inventory",        ← WRONG!
        "owner": "cyberslayer"      ← WRONG!
      }
    }
  ]
}

// Should be:
"location": {
  "type": "container",
  "containerId": "chest_sesame_01"
}
```

**Example 2: Item with void location**
```json
{
  "location": {
    "type": "void"  ← Wrong, should have proper location
  }
}
```

**Example 3: Duplicate item instances**
Same `instanceId` appears in multiple locations:
- Container: chest_sesame_01
- Player: texan
- Player: cyberslayer

### 1.2 Corruption Impact

- 30+ items with wrong location tags
- 15+ items with `location.type = "inventory"` in containers
- Multiple duplicate `instanceId` values
- Items with `type: "void"` throughout

---

## 2. Backup Procedures

### 2.1 Pre-Cleanup Backup

**CRITICAL: Always backup before cleanup**

```bash
#!/bin/bash
# backup-persistence-data.sh

# Create backup directory
BACKUP_DIR="/home/micah/wumpy/data/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup all data files
cp /home/micah/wumpy/players.json "$BACKUP_DIR/"
cp /home/micah/wumpy/data/containers.json "$BACKUP_DIR/"
cp /home/micah/wumpy/data/corpses.json "$BACKUP_DIR/"
cp /home/micah/wumpy/data/timers.json "$BACKUP_DIR/"
cp -r /home/micah/wumpy/data/shops "$BACKUP_DIR/"

echo "Backup created in: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
```

**Run backup:**
```bash
chmod +x backup-persistence-data.sh
./backup-persistence-data.sh
```

### 2.2 Verify Backup

```bash
# Check backup files exist and have content
ls -lh data/backups/YYYYMMDD_HHMMSS/

# Verify JSON is valid
node -e "console.log(JSON.parse(require('fs').readFileSync('data/backups/YYYYMMDD_HHMMSS/containers.json')))"
```

---

## 3. Cleanup Script

### 3.1 Complete Cleanup Script

**File:** `/home/micah/wumpy/scripts/fix-container-locations.js`

```javascript
/**
 * Data Cleanup Script: Fix Corrupted Location Tags in Containers
 */

const fs = require('fs');
const path = require('path');

const CONTAINERS_PATH = path.join(__dirname, '../data/containers.json');
const BACKUP_PATH = path.join(__dirname, '../data/containers.json.backup.' + Date.now());

function fixContainerLocations() {
  console.log('Container Location Fix Script');
  console.log('============================\n');

  // Check if file exists
  if (!fs.existsSync(CONTAINERS_PATH)) {
    console.error('ERROR: containers.json not found');
    return;
  }

  // Backup first
  console.log('Creating backup...');
  fs.copyFileSync(CONTAINERS_PATH, BACKUP_PATH);
  console.log(`Backup: ${BACKUP_PATH}\n`);

  // Load container data
  console.log('Loading container data...');
  const rawData = fs.readFileSync(CONTAINERS_PATH, 'utf8');
  const data = JSON.parse(rawData);

  let totalFixed = 0;
  let totalContainers = 0;
  const duplicates = new Map(); // Track instanceIds

  // Process each container
  for (const [containerId, container] of Object.entries(data.containers)) {
    totalContainers++;
    let fixedInContainer = 0;

    if (container.inventory && Array.isArray(container.inventory)) {
      // Track duplicates
      for (const item of container.inventory) {
        if (duplicates.has(item.instanceId)) {
          console.warn(`⚠️  DUPLICATE: ${item.instanceId} in container ${containerId} (also in ${duplicates.get(item.instanceId)})`);
        } else {
          duplicates.set(item.instanceId, containerId);
        }

        // Fix location tags
        if (item.location) {
          if (item.location.type === 'inventory' && item.location.owner) {
            console.log(`  Fixing item ${item.instanceId} in ${containerId}`);
            console.log(`    Was: {type: 'inventory', owner: '${item.location.owner}'}`);
            item.location = {
              type: 'container',
              containerId: containerId
            };
            console.log(`    Now: {type: 'container', containerId: '${containerId}'}\n`);
            fixedInContainer++;
            totalFixed++;
          } else if (item.location.type !== 'container') {
            console.log(`  Fixing item ${item.instanceId} in ${containerId}`);
            console.log(`    Was: {type: '${item.location.type}'}`);
            item.location = {
              type: 'container',
              containerId: containerId
            };
            console.log(`    Now: {type: 'container', containerId: '${containerId}'}\n`);
            fixedInContainer++;
            totalFixed++;
          }
        } else {
          // No location tag - add it
          console.log(`  Adding location to ${item.instanceId} in ${containerId}\n`);
          item.location = {
            type: 'container',
            containerId: containerId
          };
          fixedInContainer++;
          totalFixed++;
        }
      }
    }

    if (fixedInContainer > 0) {
      console.log(`Container ${containerId}: Fixed ${fixedInContainer} items`);
    }
  }

  // Save fixed data
  console.log(`\nSummary:`);
  console.log(`  Containers: ${totalContainers}`);
  console.log(`  Items fixed: ${totalFixed}`);
  console.log(`  Duplicates found: ${duplicates.size - totalContainers}`);

  if (totalFixed > 0) {
    console.log('\nSaving fixed data...');
    fs.writeFileSync(CONTAINERS_PATH, JSON.stringify(data, null, 2));
    console.log('✅ Done! containers.json updated\n');
    console.log(`Backup: ${BACKUP_PATH}`);
  } else {
    console.log('\nNo fixes needed. Data is clean!');
  }
}

// Run the script
try {
  fixContainerLocations();
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
```

### 3.2 Running the Script

```bash
# Stop server first!
# IMPORTANT: Server must be stopped

# Run cleanup
node scripts/fix-container-locations.js

# Check output for errors
# Review backup file location
# Verify fixes applied
```

### 3.3 Expected Output

```
Container Location Fix Script
============================

Creating backup...
Backup: /home/micah/wumpy/data/containers.json.backup.1699999999999

Loading container data...
  Fixing item 91afe0ad-1011-438d-8065-1996b19ec2e0 in equipment_rack
    Was: {type: 'inventory', owner: 'cyberslayer'}
    Now: {type: 'container', containerId: 'equipment_rack'}

Container equipment_rack: Fixed 12 items
Container treasure_chest: Fixed 5 items

Summary:
  Containers: 10
  Items fixed: 17
  Duplicates found: 0

Saving fixed data...
✅ Done! containers.json updated

Backup: /home/micah/wumpy/data/containers.json.backup.1699999999999
```

---

## 4. Manual Cleanup

### 4.1 When to Use Manual Cleanup

Use manual cleanup if:
- Script fails
- Need to inspect specific items
- Want to remove duplicates manually
- Need fine-grained control

### 4.2 Manual Steps

```bash
# 1. Stop server
npm stop

# 2. Backup data
cp data/containers.json data/containers.json.manual.backup

# 3. Open file for editing
nano data/containers.json
# or
code data/containers.json

# 4. Find and fix corrupted location tags
# Search for: "type": "inventory"
# Replace with: "type": "container"
# Update containerId to match parent container

# 5. Save file

# 6. Validate JSON
node -e "console.log(JSON.parse(require('fs').readFileSync('data/containers.json')))"

# 7. Restart server
npm start
```

---

## 5. Validation

### 5.1 Automated Validation

**File:** `/home/micah/wumpy/scripts/validate-container-data.js`

```javascript
const fs = require('fs');
const path = require('path');

const CONTAINERS_PATH = path.join(__dirname, '../data/containers.json');

const data = JSON.parse(fs.readFileSync(CONTAINERS_PATH, 'utf8'));

let errors = 0;

for (const [containerId, container] of Object.entries(data.containers)) {
  if (container.inventory) {
    for (const item of container.inventory) {
      if (!item.location || item.location.type !== 'container') {
        console.error(`❌ ${containerId}: Item ${item.instanceId} has wrong location: ${JSON.stringify(item.location)}`);
        errors++;
      }
    }
  }
}

if (errors === 0) {
  console.log('✅ All container data is valid');
  process.exit(0);
} else {
  console.error(`❌ Found ${errors} errors`);
  process.exit(1);
}
```

**Run validation:**
```bash
node scripts/validate-container-data.js
```

---

## 6. Deployment Steps

### 6.1 Pre-Deployment Checklist

- [ ] Code fixes applied (see FIXES_GUIDE.md)
- [ ] Backups created
- [ ] Cleanup script tested on copy of data
- [ ] Validation script passes
- [ ] Rollback plan ready

### 6.2 Deployment Procedure

```bash
# 1. Announce maintenance
echo "Server going down for maintenance in 5 minutes"

# 2. Stop server gracefully
npm stop

# 3. Verify server stopped
ps aux | grep node

# 4. Backup data
./scripts/backup-persistence-data.sh

# 5. Run cleanup
node scripts/fix-container-locations.js

# 6. Validate cleaned data
node scripts/validate-container-data.js

# 7. If validation passes, start server
npm start

# 8. Monitor logs
tail -f logs/server.log

# 9. Run smoke tests
# - Login as test user
# - Check inventory
# - Check containers
# - Move between rooms
# - Verify no errors
```

### 6.3 Post-Deployment Validation

```bash
# Wait 60 seconds for auto-save
sleep 60

# Validate data again
node scripts/validate-container-data.js

# Check for duplicates
node scripts/check-duplicates.js

# Monitor for 24 hours
tail -f logs/server.log | grep -i "error\|warning\|duplicate"
```

---

## 7. Rollback Procedures

### 7.1 When to Rollback

Rollback if:
- Validation fails after cleanup
- Server won't start
- New duplications appear
- Data loss detected

### 7.2 Rollback Steps

```bash
# 1. Stop server immediately
npm stop

# 2. Restore from backup
cp data/backups/YYYYMMDD_HHMMSS/containers.json data/containers.json
cp data/backups/YYYYMMDD_HHMMSS/players.json players.json

# 3. Validate restored data
node -e "console.log(JSON.parse(require('fs').readFileSync('data/containers.json')))"

# 4. Start server with old code
git checkout [previous-commit]
npm start

# 5. Verify server operational

# 6. Investigate what went wrong
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Production Ready ✓
