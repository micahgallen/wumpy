# Persistence Bugs - Detailed Analysis

**Version:** 1.0
**Date:** 2025-11-12
**Status:** Investigation Complete
**Related:** [INDEX.md](INDEX.md) | [FIXES_GUIDE.md](FIXES_GUIDE.md) | [DIAGRAMS.md](DIAGRAMS.md)

---

## Executive Summary

Two critical bugs prevent production deployment:

| Bug | Severity | Impact | Root Cause | Status |
|-----|----------|--------|------------|---------|
| Item Duplication | CRITICAL | Game-breaking | Missing location metadata update in put.js:373 | Identified |
| Player Position Loss | HIGH | Poor UX | Missing player save in ShutdownHandler.js | Identified |

**Estimated Fix Time:** 4-7 hours (including testing and data cleanup)

---

## Table of Contents

1. [Bug #1: Item Duplication](#1-bug-1-item-duplication-critical)
2. [Bug #2: Player Position Loss](#2-bug-2-player-position-loss-high)
3. [Production Data Evidence](#3-production-data-evidence)
4. [Impact Assessment](#4-impact-assessment)
5. [System Interaction Matrix](#5-system-interaction-matrix)

---

## 1. Bug #1: Item Duplication (CRITICAL)

### 1.1 Summary

**Problem:** Items placed in containers retain their `location.owner` tag from when they were in player inventory. After server reboot, items may appear in both container AND player inventory.

**Severity:** CRITICAL - Game Breaking
**Impact:** Players can duplicate items, breaking economy and progression

### 1.2 Root Cause Analysis

**Location:** `/home/micah/wumpy/src/commands/containers/put.js:373`

**The Problem:**

When a player puts an item into a container, the `put.js` command pushes the full item object from the player's inventory directly into the container's inventory array WITHOUT updating its location metadata:

```javascript
// Line 373 in put.js - CURRENT (BUGGY):
containerObj.inventory.push(item);  // ❌ BUG: Pushes item with old location tag!
```

The `item` object at this point contains a `location` property that was set when the item was picked up:

```javascript
// From get.js when item is picked up:
itemInstance.location = {
  type: 'inventory',
  owner: 'cyberslayer'  // Player who picked it up
};
```

**Why This Causes Duplication:**

1. Player picks up item → `item.location = {type: 'inventory', owner: 'cyberslayer'}`
2. Player puts item in container → Item pushed to container WITHOUT location update
3. Container state saved to `containers.json` → Item stored WITH player location tag
4. Server restarts → Container loads with corrupted location metadata
5. Item has conflicting location data → May appear in both places

### 1.3 Code Evidence

**File:** `/home/micah/wumpy/src/commands/containers/put.js`
**Function:** `putItemInRoomContainer()`
**Lines:** 319-377

**Current code:**
```javascript
function putItemInRoomContainer(player, item, containerId, silent = false) {
  const containerObj = RoomContainerManager.getContainer(containerId);

  // ... validation code ...

  // BUG: Item is added to container WITHOUT updating location metadata
  containerObj.inventory.push(item);  // LINE 373 - CRITICAL BUG
  containerObj.modifiedAt = Date.now();

  return { success: true };
}
```

**What SHOULD happen:**
```javascript
// Update item location metadata BEFORE adding to container
item.location = {
  type: 'container',
  containerId: containerId,
  roomId: containerObj.roomId
};

// THEN add to container
containerObj.inventory.push(item);
```

### 1.4 Data Flow Causing Bug

```
Player: "get potion"
    ↓
Item created with location: {type: 'inventory', owner: 'username'}
    ↓
Player: "put potion in chest"
    ↓
BUG: Item pushed to container.inventory WITH old location tag
    ↓
Container saved to containers.json
    ↓
containers.json contains:
{
  "inventory": [{
    "instanceId": "abc-123",
    "location": {
      "type": "inventory",      ← WRONG!
      "owner": "cyberslayer"    ← WRONG!
    }
  }]
}
    ↓
Server restart
    ↓
Container restored with corrupted location metadata
    ↓
Item may appear in both container AND player inventory
```

### 1.5 Affected Files

**Primary:**
- `/home/micah/wumpy/src/commands/containers/put.js:373` - Main bug location
- `/home/micah/wumpy/src/commands/containers/put.js:429` - Same bug in portable containers

**Secondary:**
- `/home/micah/wumpy/src/commands/core/get.js` - Sets location tag on pickup
- `/home/micah/wumpy/data/containers.json` - Contains corrupted data
- `/home/micah/wumpy/src/systems/containers/RoomContainerManager.js` - No validation on export

### 1.6 Why This Is Critical

**Game-Breaking Impact:**
- Players can duplicate currency (infinite money)
- Players can duplicate rare equipment (progression broken)
- Economy is completely broken
- Storage system is unreliable
- Data corruption accumulates over time

**Cannot deploy to production with this bug.**

---

## 2. Bug #2: Player Position Loss (HIGH)

### 2.1 Summary

**Problem:** Players lose their room position when server shuts down gracefully. They respawn at starting area instead of their last location.

**Severity:** HIGH - Major UX Issue
**Impact:** Frustrating user experience, exploration progress lost

### 2.2 Root Cause Analysis

**Location:** `/home/micah/wumpy/src/server/ShutdownHandler.js:43-69`

**The Problem:**

The shutdown handler saves containers, corpses, timers, and shops, but does NOT save player states. If the server shuts down gracefully (SIGTERM/SIGINT), players who are still connected will NOT have their disconnect handler called, so their position is never saved.

**Code Evidence:**

```javascript
// ShutdownHandler.handleShutdown() - Lines 43-69
handleShutdown(signal) {
  try {
    // Stop ambient dialogue
    this.stopAmbientDialogue();

    // Stop periodic saves
    this.stopStateSaving();

    // Save critical state
    this.saveTimers();      // ✓ Saves timers
    this.saveCorpses();     // ✓ Saves corpses
    this.saveContainers();  // ✓ Saves containers

    // ❌ MISSING: this.savePlayerStates();

    // Save shops (async)
    this.saveShops();

    // Exit
    process.exit(0);
  } catch (err) {
    logger.error(`Shutdown error: ${err.message}`);
    process.exit(1);
  }
}
```

### 2.3 Why Player Position Saves Usually Work

**Player position IS saved in two scenarios:**

1. **Normal disconnect:**
   - Player closes connection
   - Socket 'end' event fires
   - `AuthenticationFlow.js:352` calls `playerDB.savePlayer()`
   - Position saved ✓

2. **Movement:**
   - Player moves to new room
   - `commands/utils.js:93` calls `playerDB.updatePlayerRoom()`
   - Position saved immediately ✓

**But NOT during graceful shutdown:**
- Server sends SIGTERM/SIGINT
- ShutdownHandler called
- Players still connected
- Socket 'end' event never fires
- Position NOT saved ❌

### 2.4 Data Flow Causing Bug

```
Player at Room X
    ↓
Server administrator: "shutdown"
    ↓
SIGTERM signal sent
    ↓
ShutdownHandler.handleShutdown() called
    ↓
Saves: Timers, Corpses, Containers, Shops
Does NOT save: Player positions
    ↓
Process exits
    ↓
Server restart
    ↓
Player logs in
    ↓
Loads position from OLD data (before last movement)
    ↓
Player spawns at wrong location
```

### 2.5 Affected Files

**Primary:**
- `/home/micah/wumpy/src/server/ShutdownHandler.js:43-69` - Missing player save

**Related:**
- `/home/micah/wumpy/src/server/AuthenticationFlow.js:352` - Normal disconnect save (works)
- `/home/micah/wumpy/src/playerdb.js:317-323` - updatePlayerRoom() (works)
- `/home/micah/wumpy/src/commands/utils.js:93` - Movement save trigger (works)

### 2.6 Why This Is High Priority

**User Experience Impact:**
- Frustrating to lose exploration progress
- Players may quit due to repeated position resets
- Server maintenance becomes disruptive
- Exploration feels pointless if position not remembered

**Game is PLAYABLE but UX is severely degraded.**

---

## 3. Production Data Evidence

### 3.1 Item Duplication Evidence

**Instance ID:** `f13402ac-b1da-4e14-9f34-38eec6c222d8` (ancient_key)

**Found in 3 locations:**

1. **In treasure_chest_sesame_plaza container:**
```json
{
  "instanceId": "f13402ac-b1da-4e14-9f34-38eec6c222d8",
  "definitionId": "ancient_key",
  "location": {
    "type": "void"  // ← Wrong, should be "container"
  },
  "quantity": 1
}
```

2. **In player "texan" inventory:**
```json
{
  "instanceId": "f13402ac-b1da-4e14-9f34-38eec6c222d8",
  "definitionId": "ancient_key",
  "location": {
    "type": "void"  // ← Wrong, should be "inventory"
  },
  "quantity": 1
}
```

3. **In player "cyberslayer" inventory:**
```json
{
  "instanceId": "f13402ac-b1da-4e14-9f34-38eec6c222d8",
  "definitionId": "ancient_key",
  "location": {
    "type": "inventory",
    "owner": "cyberslayer"  // ← Correct type, but item is duplicated
  },
  "quantity": 1
}
```

**Analysis:** Same instanceId appears in 3 locations - clear evidence of duplication bug.

---

### 3.2 More Duplication Evidence

**Instance ID:** `91afe0ad-1011-438d-8065-1996b19ec2e0` (minor_health_potion)

**In equipment_rack container:**
```json
{
  "instanceId": "91afe0ad-1011-438d-8065-1996b19ec2e0",
  "definitionId": "minor_health_potion",
  "location": {
    "type": "inventory",
    "owner": "cyberslayer"  // ← WRONG! Should be "container"
  },
  "quantity": 12
}
```

**In player "texan" inventory:**
```json
{
  "instanceId": "91afe0ad-1011-438d-8065-1996b19ec2e0",
  "definitionId": "minor_health_potion",
  "location": {
    "type": "inventory",
    "owner": "texan"  // ← Different owner for same instanceId!
  },
  "quantity": 1
}
```

**Analysis:**
- Same instanceId in container and player inventory
- Container item has location pointing to "cyberslayer"
- Player inventory item has location pointing to "texan"
- Proves location field is NOT being updated when items move

---

### 3.3 Location Field Inconsistencies

Throughout production data files, many items have incorrect location metadata:

**Items in player inventories with `location: {type: "void"}`:**
- Should be `{type: "inventory", owner: "username"}`
- Found in multiple player inventories

**Items in containers with `location: {type: "inventory"}`:**
- Should be `{type: "container", containerId: "..."}`
- Found in multiple containers

**Items with `location: {type: "void"}`:**
- Generic fallback used incorrectly
- Should have proper location metadata

**Conclusion:** Location tracking is:
1. Not consistently implemented
2. Not validated or enforced
3. Treated as optional metadata rather than authoritative

---

## 4. Impact Assessment

### 4.1 Item Duplication Impact

**Severity:** CRITICAL - Game Breaking

**Technical Impact:**
- Data corruption in containers.json
- Item integrity compromised
- Referential integrity violated
- Accumulating corruption over time

**Gameplay Impact:**
- Players can duplicate gold/platinum (infinite money)
- Players can duplicate rare equipment (progression broken)
- Economy is completely broken
- Storage system unreliable and untrusted
- Unfair advantage for players who discover exploit

**Affected Systems:**
- Container system (primary)
- Inventory system (secondary)
- Economy/trading (severe)
- Item persistence (core)
- Player progression (game balance)

**Business Impact:**
- **BLOCKS PRODUCTION DEPLOYMENT**
- Game is not playable in current state
- Players will lose trust if bug reaches production
- Requires data cleanup before launch

---

### 4.2 Player Position Impact

**Severity:** HIGH - Major UX Issue

**Technical Impact:**
- Player position data loss
- Inconsistent save behavior
- No save on graceful shutdown

**Gameplay Impact:**
- Players lose their position on server restart
- Always respawn at starting area after shutdown
- Frustrating user experience
- Exploration progress lost
- May cause player churn

**Affected Systems:**
- Player login flow
- Server shutdown sequence
- Position tracking
- Player persistence

**Business Impact:**
- Game is PLAYABLE but UX severely degraded
- Players may quit due to frustration
- Server maintenance becomes disruptive
- Should fix before production but not blocking if urgent

---

## 5. System Interaction Matrix

| System | Touches Player Inventory | Touches Container Inventory | Updates Location Metadata | Saves to Disk |
|--------|-------------------------|----------------------------|---------------------------|---------------|
| **InventoryManager** | ✓ Add/Remove | ✗ | ✗ | ✗ |
| **InventorySerializer** | ✓ Serialize/Deserialize | ✗ | ✗ (reads only) | ✗ |
| **RoomContainerManager** | ✗ | ✓ Add/Remove | ✗ | ✓ (via StateManager) |
| **PlayerDB** | ✓ Save/Load | ✗ | ✗ | ✓ (on disconnect) |
| **put command** | ✓ Remove item | ✓ Add item | ✗ **BUG** | ✗ |
| **get command** | ✓ Add item | ✓ Remove item | ✓ (sets location) | ✗ |
| **StateManager** | ✗ | ✓ (periodic save) | ✗ | ✓ |
| **ShutdownHandler** | ✗ **BUG** | ✓ | ✗ | ✓ (containers) ✗ (players) |

**Key Observations:**
1. **No system is responsible for updating location metadata** when items move from inventory to container
2. **get command sets location** when picking up items
3. **put command does NOT update location** when storing items ← BUG
4. **ShutdownHandler doesn't save player states** ← BUG

---

## Recommended Next Steps

1. **Review fixes:** See [FIXES_GUIDE.md](FIXES_GUIDE.md)
2. **Review testing:** See [TESTING_GUIDE.md](TESTING_GUIDE.md)
3. **Review data cleanup:** See [DATA_CLEANUP.md](DATA_CLEANUP.md)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Investigation Status:** Complete ✓
