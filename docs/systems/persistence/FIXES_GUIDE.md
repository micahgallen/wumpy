# Persistence Fixes - Implementation Guide

**Version:** 1.0
**Date:** 2025-11-12
**Status:** Ready for Implementation
**Related:** [INDEX.md](INDEX.md) | [BUGS_ANALYSIS.md](BUGS_ANALYSIS.md) | [TESTING_GUIDE.md](TESTING_GUIDE.md)

---

## Quick Start

**Estimated Time:** 4-7 hours (includes testing and data cleanup)

**Steps:**
1. Apply code fixes (Sections 1-3)
2. Run data cleanup script (Section 4)
3. Test thoroughly (see TESTING_GUIDE.md)
4. Deploy with validation

**Risk Level:** Medium (data cleanup required, but fixes are straightforward)

---

## Table of Contents

1. [Fix #1: Item Duplication in Room Containers](#1-fix-1-item-duplication-in-room-containers)
2. [Fix #2: Item Duplication in Portable Containers](#2-fix-2-item-duplication-in-portable-containers)
3. [Fix #3: Player Position on Shutdown](#3-fix-3-player-position-on-shutdown)
4. [Fix #4: Container State Validation](#4-fix-4-container-state-validation)
5. [Enhancement: Player Position Auto-Save](#5-enhancement-player-position-auto-save)
6. [Data Cleanup Procedures](#6-data-cleanup-procedures)
7. [Deployment Checklist](#7-deployment-checklist)

---

## 1. Fix #1: Item Duplication in Room Containers

### File
`/home/micah/wumpy/src/commands/containers/put.js`

### Location
Lines 319-377 (function `putItemInRoomContainer`)

### Current Code (BUGGY)
```javascript
function putItemInRoomContainer(player, item, containerId, silent = false) {
  // ... validation code ...

  // BUG: Add item to container inventory (pushes full item with location tag!)
  containerObj.inventory.push(item);  // ← LINE 373: BUG HERE!
  containerObj.modifiedAt = Date.now();

  return { success: true };
}
```

### Fixed Code
```javascript
function putItemInRoomContainer(player, item, containerId, silent = false) {
  // ... keep existing validation code ...

  // FIX: Create sanitized item data with correct location tag
  const itemData = {
    instanceId: item.instanceId,
    definitionId: item.definitionId,
    quantity: item.quantity || 1,
    durability: item.durability,
    maxDurability: item.maxDurability,
    isEquipped: false, // Items in containers are never equipped
    equippedSlot: null,
    boundTo: item.boundTo || null,
    isAttuned: item.isAttuned || false,
    attunedTo: item.attunedTo || null,
    isIdentified: item.isIdentified || false,
    enchantments: item.enchantments || [],
    customName: item.customName || null,
    customDescription: item.customDescription || null,
    createdAt: item.createdAt || Date.now(),
    modifiedAt: Date.now(),
    // CRITICAL: Set correct location tag for container storage
    location: {
      type: 'container',
      containerId: containerId
    }
  };

  // Add sanitized item data to container inventory
  containerObj.inventory.push(itemData);
  containerObj.modifiedAt = Date.now();

  return { success: true };
}
```

### Changes Summary
- Remove direct push of item object (line 373)
- Add sanitization of item data with proper location tag
- Set location type to 'container'
- Add container ID in location metadata
- Handle optional fields with defaults

---

## 2. Fix #2: Item Duplication in Portable Containers

### File
`/home/micah/wumpy/src/commands/containers/put.js`

### Location
Lines 382-432 (function `putItemInPortableContainer`)

### Current Code (BUGGY)
```javascript
function putItemInPortableContainer(player, item, container, silent = false) {
  // ... validation code ...

  // BUG: Add item to container inventory
  container.inventory.push(item);  // ← LINE 429: SAME BUG!

  return { success: true };
}
```

### Fixed Code
```javascript
function putItemInPortableContainer(player, item, container, silent = false) {
  // ... keep existing validation code ...

  // FIX: Create sanitized item data with correct location tag
  const itemData = {
    instanceId: item.instanceId,
    definitionId: item.definitionId,
    quantity: item.quantity || 1,
    durability: item.durability,
    maxDurability: item.maxDurability,
    isEquipped: false,
    equippedSlot: null,
    boundTo: item.boundTo || null,
    isAttuned: item.isAttuned || false,
    attunedTo: item.attunedTo || null,
    isIdentified: item.isIdentified || false,
    enchantments: item.enchantments || [],
    customName: item.customName || null,
    customDescription: item.customDescription || null,
    createdAt: item.createdAt || Date.now(),
    modifiedAt: Date.now(),
    // CRITICAL: Set correct location tag for portable container
    location: {
      type: 'portable_container',
      containerId: container.id || container.instanceId
    }
  };

  // Add sanitized item data to container inventory
  container.inventory.push(itemData);

  return { success: true };
}
```

---

## 3. Fix #3: Player Position on Shutdown

### File
`/home/micah/wumpy/src/server/ShutdownHandler.js`

### Step 1: Add savePlayerStates Method

Add this method after line 96:

```javascript
/**
 * Save all connected player states synchronously
 */
savePlayerStates() {
  try {
    const { playerDB, players } = this.components;

    if (!playerDB || !players) {
      logger.warn('Cannot save player states: missing playerDB or players');
      return;
    }

    let savedCount = 0;

    // Save all connected players
    for (const player of players) {
      if (player.username && player.state === 'playing') {
        try {
          playerDB.savePlayer(player);
          savedCount++;
        } catch (err) {
          logger.error(`Failed to save player ${player.username}: ${err.message}`);
        }
      }
    }

    logger.log(`Saved ${savedCount} connected player states on shutdown`);
  } catch (err) {
    logger.error(`Failed to save player states: ${err.message}`);
  }
}
```

### Step 2: Update handleShutdown Method

Around line 45, add player save call:

```javascript
try {
  // Stop ambient dialogue timers
  this.stopAmbientDialogue();

  // Stop periodic state saving
  this.stopStateSaving();

  // Save critical state synchronously
  this.savePlayerStates();  // ← ADD THIS LINE - SAVE PLAYERS FIRST
  this.saveTimers();
  this.saveCorpses();
  this.saveContainers();

  // Save shops (async)
  this.saveShops();

  // Exit
  process.exit(0);
}
```

---

## 4. Fix #4: Container State Validation

### File
`/home/micah/wumpy/src/systems/containers/RoomContainerManager.js`

### Location
Lines 695-709 (in `exportState` method)

### Add Location Validation

Replace the existing filter with:

```javascript
const validInventory = container.inventory.filter((item, index) => {
  if (!item || typeof item !== 'object') {
    logger.warn(`Filtering out invalid item at index ${index} in container ${containerId}`);
    return false;
  }
  if (!item.definitionId || !item.instanceId) {
    logger.warn(`Filtering out malformed item at index ${index} in container ${containerId}`);
    return false;
  }

  // ADDED: Validate and fix location tags
  if (item.location) {
    if (item.location.type === 'inventory' && item.location.owner) {
      logger.warn(`Fixing corrupted location tag in container ${containerId}, item ${item.instanceId}`);
      item.location = {
        type: 'container',
        containerId: containerId
      };
    } else if (item.location.type !== 'container') {
      logger.warn(`Fixing invalid location type in container ${containerId}, item ${item.instanceId}`);
      item.location = {
        type: 'container',
        containerId: containerId
      };
    }
  } else {
    // No location tag - add it
    logger.warn(`Adding missing location tag to item ${item.instanceId} in container ${containerId}`);
    item.location = {
      type: 'container',
      containerId: containerId
    };
  }

  return true;
});
```

---

## 5. Enhancement: Player Position Auto-Save

**Optional but Recommended**

### File
`/home/micah/wumpy/src/server/StateManager.js`

### Add to Constructor
```javascript
constructor() {
  this.saveInterval = null;
  this.saveIntervalMs = 60000;
  this.isRunning = false;
  this.dataDir = null;
  this.components = null; // ADD THIS
}
```

### Update start Method
```javascript
start(dataDir, components = null) {  // ADD components parameter
  if (this.isRunning) {
    logger.warn('StateManager already running');
    return;
  }

  this.dataDir = dataDir;
  this.components = components; // ADD THIS
  this.isRunning = true;

  // ... rest of method
}
```

### Add Player Saves to saveAllState

After line 130, add:

```javascript
// Save active player positions
try {
  if (this.components && this.components.playerDB && this.components.players) {
    const playerDB = this.components.playerDB;
    const activePlayers = this.components.players;

    let playersSaved = 0;
    for (const player of activePlayers) {
      if (player.username && player.currentRoom) {
        playerDB.savePlayer(player);
        playersSaved++;
      }
    }

    if (playersSaved > 0) {
      logger.log(`StateManager: Saved ${playersSaved} active player positions`);
      savedCount++;
    }
  }
} catch (err) {
  logger.error(`StateManager: Failed to save player positions: ${err.message}`);
  errorCount++;
}
```

### Update ServerBootstrap

In `/home/micah/wumpy/src/server/ServerBootstrap.js`, line 92:

```javascript
// BEFORE:
StateManager.start(dataDir);

// AFTER:
StateManager.start(dataDir, components);
```

---

## 6. Data Cleanup Procedures

See [DATA_CLEANUP.md](DATA_CLEANUP.md) for complete procedures.

**Quick cleanup:**
```bash
# Backup first
cp data/containers.json data/containers.json.backup.$(date +%s)

# Option 1: Delete and regenerate (safest)
rm data/containers.json
# Containers will regenerate on server start

# Option 2: Run fix script (see DATA_CLEANUP.md)
node scripts/fix-container-locations.js
```

---

## 7. Deployment Checklist

### Pre-Deployment

- [ ] All code fixes applied
- [ ] Code reviewed by second developer
- [ ] Backup all data files
  - [ ] players.json
  - [ ] data/containers.json
  - [ ] data/corpses.json
  - [ ] data/timers.json
- [ ] Data cleanup script tested on copy of production data
- [ ] All tests pass (see TESTING_GUIDE.md)

### Deployment Steps

1. [ ] Announce maintenance window to players
2. [ ] Gracefully shutdown server
3. [ ] Backup all data files (again, to be safe)
4. [ ] Apply code changes
5. [ ] Run data cleanup script
6. [ ] Validate cleaned data
7. [ ] Start server
8. [ ] Run smoke tests
9. [ ] Monitor logs for errors
10. [ ] Verify no duplication occurring
11. [ ] Verify position persistence working

### Post-Deployment

- [ ] Monitor for 24 hours
- [ ] Check for any new duplications
- [ ] Verify player position saves
- [ ] Review logs for warnings
- [ ] Keep backups for 7 days

### Rollback Plan

If issues occur:
1. Stop server immediately
2. Restore backup data files
3. Revert code changes
4. Restart server with old code
5. Investigate issues before retry

---

## Testing

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for complete testing procedures.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Ready for Implementation ✓
