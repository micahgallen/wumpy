# Persistence API Reference

**Version:** 1.0
**Date:** 2025-11-12
**Status:** Current
**Related:** [INDEX.md](INDEX.md) | [OVERVIEW.md](OVERVIEW.md) | [DIAGRAMS.md](DIAGRAMS.md)

---

## Quick Reference

| Class | Purpose | File |
|-------|---------|------|
| PlayerDB | Player account persistence | `/home/micah/wumpy/src/playerdb.js` |
| RoomContainerManager | Container state management | `/home/micah/wumpy/src/systems/containers/RoomContainerManager.js` |
| InventorySerializer | Item serialization | `/home/micah/wumpy/src/systems/inventory/InventorySerializer.js` |
| StateManager | Auto-save coordinator | `/home/micah/wumpy/src/server/StateManager.js` |
| ShutdownHandler | Graceful shutdown | `/home/micah/wumpy/src/server/ShutdownHandler.js` |

---

## Table of Contents

1. [PlayerDB](#1-playerdb)
2. [RoomContainerManager](#2-roomcontainermanager)
3. [InventorySerializer](#3-inventoryserializer)
4. [StateManager](#4-statemanager)
5. [Data Structures](#5-data-structures)

---

## 1. PlayerDB

**File:** `/home/micah/wumpy/src/playerdb.js`
**Purpose:** Manages player account data persistence

### Methods

#### savePlayer(player)
Save complete player state to disk.

**Parameters:**
- `player` (Object) - Player object with all properties

**Returns:** void

**Usage:**
```javascript
playerDB.savePlayer(player);
```

**Saves:**
- Username and password hash
- Current room position
- Inventory (serialized)
- Stats, level, XP, HP
- Currency wallet
- Equipment state
- Ghost status

---

#### authenticate(username, password)
Load and verify player credentials.

**Parameters:**
- `username` (string) - Player username
- `password` (string) - Plain text password

**Returns:** Object with player data or null

**Usage:**
```javascript
const playerData = await playerDB.authenticate('username', 'password');
if (playerData) {
  // Login successful
}
```

---

#### updatePlayerRoom(username, roomId)
Save player position immediately.

**Parameters:**
- `username` (string) - Player username
- `roomId` (string) - New room ID

**Returns:** void

**Usage:**
```javascript
playerDB.updatePlayerRoom('playername', 'sesame_street_02');
```

**Called by:** Movement commands

---

#### updatePlayerInventory(username, inventory)
Save player inventory immediately.

**Parameters:**
- `username` (string) - Player username
- `inventory` (Array) - Serialized inventory array

**Returns:** void

**Usage:**
```javascript
const serialized = InventorySerializer.serializeInventory(player);
playerDB.updatePlayerInventory('playername', serialized);
```

---

## 2. RoomContainerManager

**File:** `/home/micah/wumpy/src/systems/containers/RoomContainerManager.js`
**Purpose:** Manages room container persistence

### Methods

#### exportState()
Export all containers to JSON format.

**Returns:** Object with containers data

**Usage:**
```javascript
const containerData = RoomContainerManager.exportState();
```

**Output Format:**
```javascript
{
  containers: {
    "container_id_1": {
      instanceId: "...",
      definitionId: "...",
      inventory: [...],
      isOpen: true,
      // ... other properties
    }
  }
}
```

---

#### saveState(filepath)
Save containers to file.

**Parameters:**
- `filepath` (string) - Full path to save file

**Returns:** boolean (success)

**Usage:**
```javascript
const success = RoomContainerManager.saveState('/home/micah/wumpy/data/containers.json');
```

---

#### restoreState(data)
Restore containers from JSON data.

**Parameters:**
- `data` (Object) - Container data object

**Returns:** void

**Usage:**
```javascript
const data = JSON.parse(fs.readFileSync(filepath));
RoomContainerManager.restoreState(data);
```

---

#### loadState(filepath)
Load containers from file.

**Parameters:**
- `filepath` (string) - Full path to load file

**Returns:** boolean (success)

**Usage:**
```javascript
RoomContainerManager.loadState('/home/micah/wumpy/data/containers.json');
```

---

## 3. InventorySerializer

**File:** `/home/micah/wumpy/src/systems/inventory/InventorySerializer.js`
**Purpose:** Serialize/deserialize player inventory

### Methods

#### serializeInventory(player)
Convert player inventory to JSON format.

**Parameters:**
- `player` (Object) - Player object with inventory array

**Returns:** Array of serialized items

**Usage:**
```javascript
const serialized = InventorySerializer.serializeInventory(player);
```

**Output Format:**
```javascript
[
  {
    instanceId: "uuid",
    definitionId: "item_id",
    location: {type: "inventory", owner: "username"},
    quantity: 1,
    durability: 100,
    isEquipped: false,
    // ... other properties
  }
]
```

---

#### deserializeInventory(player, serializedData)
Restore inventory from JSON data.

**Parameters:**
- `player` (Object) - Player object to restore into
- `serializedData` (Array) - Serialized inventory data

**Returns:** void (modifies player object)

**Usage:**
```javascript
InventorySerializer.deserializeInventory(player, playerData.inventory);
```

**Side Effects:**
- Populates `player.inventory` array
- Creates BaseItem instances
- Restores item properties
- Calls item hooks

---

## 4. StateManager

**File:** `/home/micah/wumpy/src/server/StateManager.js`
**Purpose:** Centralized auto-save coordinator

### Methods

#### start(dataDir, components)
Start periodic auto-save loop.

**Parameters:**
- `dataDir` (string) - Data directory path
- `components` (Object) - Server components (optional)

**Returns:** void

**Usage:**
```javascript
StateManager.start('/home/micah/wumpy/data', components);
```

**Starts:** 60-second auto-save loop

---

#### stop()
Stop periodic auto-save loop.

**Returns:** void

**Usage:**
```javascript
StateManager.stop();
```

---

#### saveAllState()
Execute one save cycle manually.

**Returns:** void

**Usage:**
```javascript
StateManager.saveAllState();
```

**Saves:**
- Timers
- Corpses
- Containers
- (Optional) Player positions

---

## 5. Data Structures

### 5.1 Player Data Format

```javascript
{
  username: "playername",
  passwordHash: "...",
  currentRoom: "room_id",
  inventory: [
    // Serialized items
  ],
  stats: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    // ...
  },
  level: 1,
  xp: 0,
  hp: 100,
  maxHp: 100,
  wallet: {
    platinum: 0,
    gold: 0,
    silver: 0,
    copper: 0
  },
  isGhost: false,
  // ...
}
```

### 5.2 Container Data Format

```javascript
{
  instanceId: "container_id",
  definitionId: "chest",
  roomId: "room_id",
  isOpen: false,
  isLocked: false,
  inventory: [
    // Serialized items
  ],
  capacity: 20,
  lastLooted: timestamp,
  nextRespawn: timestamp,
  // ...
}
```

### 5.3 Item Data Format

**In Player Inventory:**
```javascript
{
  instanceId: "uuid",
  definitionId: "item_id",
  location: {
    type: "inventory",
    owner: "username"
  },
  quantity: 1,
  durability: 100,
  maxDurability: 100,
  isEquipped: false,
  equippedSlot: null,
  // ...
}
```

**In Container:**
```javascript
{
  instanceId: "uuid",
  definitionId: "item_id",
  location: {
    type: "container",
    containerId: "container_id"
  },
  quantity: 1,
  durability: 100,
  // ...
}
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
