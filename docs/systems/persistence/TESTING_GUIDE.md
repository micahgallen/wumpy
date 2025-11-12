# Persistence Testing Guide

**Version:** 1.0
**Date:** 2025-11-12
**Status:** Ready for Use
**Related:** [INDEX.md](INDEX.md) | [FIXES_GUIDE.md](FIXES_GUIDE.md) | [BUGS_ANALYSIS.md](BUGS_ANALYSIS.md)

---

## Quick Start

**Testing Time:** 2-3 hours for complete test suite

**Test Priority:**
1. Critical: Item duplication tests (must pass before deploy)
2. High: Player position tests (should pass before deploy)
3. Medium: Integration tests
4. Low: Edge case tests

---

## Table of Contents

1. [Test Setup](#1-test-setup)
2. [Test Case: Item Duplication Prevention](#2-test-case-item-duplication-prevention)
3. [Test Case: Player Position Persistence](#3-test-case-player-position-persistence)
4. [Integration Tests](#4-integration-tests)
5. [Regression Tests](#5-regression-tests)
6. [Automated Test Scripts](#6-automated-test-scripts)

---

## 1. Test Setup

### 1.1 Prerequisites

- Server with fixes applied
- Clean test environment
- Backup of production data
- Test player accounts created

### 1.2 Test Environment Setup

```bash
# 1. Backup production data
cp players.json players.json.backup
cp data/containers.json data/containers.json.backup

# 2. Start server
npm start

# 3. In separate terminal, connect via telnet
telnet localhost 4000

# 4. Create test accounts if needed
# Username: testdup
# Password: test123
```

---

## 2. Test Case: Item Duplication Prevention

### 2.1 Test Objective

Verify that items placed in containers do NOT duplicate after server restart.

### 2.2 Test Steps

```
Step 1: Initial Setup
----------------------
1. Login as test player "testdup"
2. Note starting inventory:
   > inventory
   (Record what items you have)

3. Spawn a unique test item:
   > spawn minor_health_potion
   (Note the item name for tracking)

Step 2: Put Item in Container
-------------------------------
4. Find a container in the room:
   > look
   (Identify available containers, e.g., "chest")

5. Put the item in the container:
   > put potion in chest

6. Verify item is GONE from inventory:
   > inventory
   Expected: Item should NOT appear in inventory

7. Verify item is IN container:
   > examine chest
   Expected: Item should appear in container inventory

Step 3: Save and Restart Server
---------------------------------
8. Disconnect from server
   > quit

9. Stop server (Ctrl+C or kill)

10. Start server again:
    > npm start

Step 4: Verify No Duplication
-------------------------------
11. Login as "testdup" again

12. Check inventory:
    > inventory
    Expected: Item should NOT be in inventory

13. Check container:
    > examine chest
    Expected: Item SHOULD be in container

14. Verify item appears in ONLY ONE place
```

### 2.3 Expected Results

- Item in container: YES
- Item in player inventory: NO
- Item duplicated: NO

### 2.4 Failure Indicators

- Item appears in BOTH container and inventory = BUG NOT FIXED
- Item missing from both = Different bug
- Item has wrong quantity = Stacking issue

---

## 3. Test Case: Player Position Persistence

### 3.1 Test Objective

Verify that player position is saved during graceful server shutdown.

### 3.2 Test Steps

```
Step 1: Initial Setup
----------------------
1. Login as test player "testpos"

2. Note starting room:
   > look
   (Record current room ID from look output)

Step 2: Move to Different Room
--------------------------------
3. Move to a different room:
   > north
   (or any valid direction)

4. Verify you moved:
   > look
   (Record new room ID)

5. Move several more times to be far from start:
   > east
   > north
   > west
   (Record final room ID)

Step 3: Graceful Shutdown
---------------------------
6. DO NOT disconnect normally
   (Leave connection open)

7. In server terminal, gracefully shutdown:
   Ctrl+C (sends SIGTERM)

8. Verify server saved player state:
   Check server logs for:
   "Saved X connected player states on shutdown"

Step 4: Restart and Verify
----------------------------
9. Start server again:
   > npm start

10. Login as "testpos"

11. Check current room:
    > look

12. Verify you're in the SAME room as step 5
    Expected: Final room from step 5
    NOT expected: Starting room
```

### 3.3 Expected Results

- Player position: SAVED
- Player spawns at: Last known position
- Player does NOT spawn at: Starting area

### 3.4 Failure Indicators

- Player spawns at starting area = BUG NOT FIXED
- Player position is random = Different bug
- Server crashes on shutdown = Shutdown bug

---

## 4. Integration Tests

### 4.1 Test: Put and Get Cycle

```
Test: Item maintains integrity through put/get cycle
------------------------------------------------------
1. Get item from container:
   > get potion from chest

2. Check item in inventory:
   > inventory
   (Verify item properties)

3. Put item back in container:
   > put potion in chest

4. Get item again:
   > get potion from chest

5. Verify item is unchanged:
   > inventory
   (Check quantity, durability, etc.)

Expected: Item properties unchanged after cycle
```

### 4.2 Test: Multiple Items in Container

```
Test: Multiple items don't interfere
--------------------------------------
1. Put 3 different items in container:
   > put sword in chest
   > put potion in chest
   > put key in chest

2. Examine container:
   > examine chest
   (Verify all 3 items present)

3. Restart server

4. Examine container:
   > examine chest
   (Verify all 3 items still present, no duplicates)

Expected: All items persist, no duplication
```

### 4.3 Test: Container Respawn

```
Test: Container respawn doesn't duplicate items
-------------------------------------------------
1. Put items in lootable container
2. Wait for container to respawn (if applicable)
3. Check for duplicates

Expected: No item duplication on respawn
```

---

## 5. Regression Tests

### 5.1 Checklist

Test these scenarios to ensure no regressions:

**Item Operations:**
- [ ] Get item from container
- [ ] Put item in container
- [ ] Drop item in room
- [ ] Pick up item from room
- [ ] Give item to player
- [ ] Receive item from player
- [ ] Equip item
- [ ] Unequip item
- [ ] Stack items
- [ ] Split stacks

**Player Operations:**
- [ ] Login
- [ ] Logout
- [ ] Move between rooms
- [ ] Die (become ghost)
- [ ] Respawn
- [ ] Level up
- [ ] Save character

**Container Operations:**
- [ ] Open container
- [ ] Close container
- [ ] Lock container
- [ ] Unlock container
- [ ] Container respawn
- [ ] Loot corpse container

**Server Operations:**
- [ ] Normal shutdown (Ctrl+C)
- [ ] Crash simulation (kill -9)
- [ ] Restart after shutdown
- [ ] Auto-save (wait 60s)
- [ ] Multiple concurrent players

---

## 6. Automated Test Scripts

### 6.1 Data Validation Script

**File:** `/home/micah/wumpy/scripts/test-container-fix.js`

```javascript
/**
 * Validates containers.json for location tag correctness
 */
const fs = require('fs');
const path = require('path');

const CONTAINERS_PATH = path.join(__dirname, '../data/containers.json');

function testContainerFix() {
  console.log('Container Fix Verification Test\n');

  if (!fs.existsSync(CONTAINERS_PATH)) {
    console.log('No containers.json found');
    return;
  }

  const data = JSON.parse(fs.readFileSync(CONTAINERS_PATH, 'utf8'));

  let totalItems = 0;
  let correctItems = 0;
  let wrongItems = 0;
  const errors = [];

  for (const [containerId, container] of Object.entries(data.containers)) {
    if (container.inventory && Array.isArray(container.inventory)) {
      for (const item of container.inventory) {
        totalItems++;

        if (!item.location) {
          wrongItems++;
          errors.push(`Item ${item.instanceId} in ${containerId}: Missing location tag`);
        } else if (item.location.type !== 'container') {
          wrongItems++;
          errors.push(`Item ${item.instanceId} in ${containerId}: Wrong type '${item.location.type}'`);
        } else {
          correctItems++;
        }
      }
    }
  }

  console.log(`Total items: ${totalItems}`);
  console.log(`Correct: ${correctItems}`);
  console.log(`Wrong: ${wrongItems}\n`);

  if (wrongItems > 0) {
    console.log('ERRORS:\n');
    errors.forEach(err => console.log(`  ❌ ${err}`));
    console.log('\n❌ TEST FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL TESTS PASSED');
    process.exit(0);
  }
}

testContainerFix();
```

**Usage:**
```bash
node scripts/test-container-fix.js
```

---

## Test Results Template

```
PERSISTENCE TEST RESULTS
Date: 2025-11-12
Tester: [Your Name]
Environment: [Dev/Staging/Production]
Server Version: [commit hash or tag]

TEST CASE 1: Item Duplication Prevention
Status: [PASS / FAIL]
Notes: [Any observations]

TEST CASE 2: Player Position Persistence
Status: [PASS / FAIL]
Notes: [Any observations]

INTEGRATION TESTS
- Put/Get Cycle: [PASS / FAIL]
- Multiple Items: [PASS / FAIL]
- Container Respawn: [PASS / FAIL]

REGRESSION TESTS
[List any failures]

OVERALL RESULT: [PASS / FAIL]
Ready for Production: [YES / NO]

Additional Notes:
[Any other observations or concerns]
```

---

## Troubleshooting Test Failures

### Item Duplication Test Failed

**Symptom:** Item appears in both container and inventory

**Cause:** Fix not applied correctly to put.js

**Solution:**
1. Verify fix applied to BOTH `putItemInRoomContainer` AND `putItemInPortableContainer`
2. Check line 373 and line 429
3. Restart server after applying fix

---

### Position Test Failed

**Symptom:** Player spawns at starting area

**Cause:** ShutdownHandler not saving players

**Solution:**
1. Verify `savePlayerStates()` method added
2. Verify method called in `handleShutdown()`
3. Check server logs for "Saved X connected player states"

---

### Data Validation Script Fails

**Symptom:** Script reports corrupted location tags

**Cause:** Old corrupted data not cleaned up

**Solution:**
1. Run data cleanup script (see DATA_CLEANUP.md)
2. Re-run validation
3. If still failing, delete containers.json and let it regenerate

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Ready for Use ✓
