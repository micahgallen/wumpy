# Persistence System Overview

**Version:** 1.0
**Date:** 2025-11-12
**Status:** Current
**Related:** [INDEX.md](INDEX.md) | [DIAGRAMS.md](DIAGRAMS.md) | [API_REFERENCE.md](API_REFERENCE.md)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Architecture](#2-system-architecture)
3. [Persistence Systems](#3-persistence-systems)
4. [Data Flow Overview](#4-data-flow-overview)
5. [Design Principles](#5-design-principles)
6. [Component Relationships](#6-component-relationships)
7. [Quick Reference](#7-quick-reference)

---

## 1. Introduction

### 1.1 Purpose

The persistence system ensures all game state survives server restarts, crashes, and shutdowns. It manages:
- Player accounts and characters
- Player inventory and equipment
- Room containers and their contents
- NPC corpses and loot
- Shop inventory and currency
- Respawn and decay timers

### 1.2 Scope

This document provides a high-level overview of:
- All persistence systems and their responsibilities
- How data flows through the system
- Relationships between components
- Design principles and patterns

**For detailed bug analysis:** See [BUGS_ANALYSIS.md](BUGS_ANALYSIS.md)
**For implementation details:** See [API_REFERENCE.md](API_REFERENCE.md)
**For visual diagrams:** See [DIAGRAMS.md](DIAGRAMS.md)

### 1.3 Key Concepts

**Persistence** = Saving runtime state to disk so it can be restored later

**Serialization** = Converting in-memory objects to JSON format for storage

**Deserialization** = Converting JSON data back to in-memory objects

**State Manager** = Central coordinator for periodic auto-saves

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GAME RUNTIME                             │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌─────────┐│
│  │  Players   │  │ Containers │  │ Corpses  │  │  Shops  ││
│  │  (Active)  │  │  (Active)  │  │ (Active) │  │(Active) ││
│  └─────┬──────┘  └──────┬─────┘  └────┬─────┘  └────┬────┘│
│        │                │               │             │     │
│        └────────────────┴───────────────┴─────────────┘     │
│                         │                                    │
│              ┌──────────▼──────────┐                        │
│              │   STATE MANAGER     │                        │
│              │   (60s auto-save)   │                        │
│              └──────────┬──────────┘                        │
└─────────────────────────┼─────────────────────────────────┘
                          │
               ┌──────────▼──────────┐
               │  DISK PERSISTENCE   │
               │   (JSON Files)      │
               └──────────┬──────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                   │
   ┌───▼──────┐  ┌───────▼────┐  ┌──────────▼─────┐
   │ players  │  │ containers │  │    corpses     │
   │  .json   │  │   .json    │  │     .json      │
   └──────────┘  └────────────┘  └────────────────┘
```

### 2.2 Architecture Principles

1. **Separation of Concerns**
   - Each system manages its own persistence
   - Central coordinator for timing
   - Serialization isolated from business logic

2. **Immediate Critical Saves**
   - Player position: Saved on every move
   - Player inventory: Saved on disconnect
   - Combat results: Saved immediately

3. **Periodic Bulk Saves**
   - Containers: Every 60 seconds
   - Corpses: Every 60 seconds
   - Timers: Every 60 seconds

4. **Graceful Degradation**
   - Save failures are logged but don't crash server
   - Corrupted data is filtered on load
   - Auto-backup on every save

### 2.3 File Structure

```
/home/micah/wumpy/
├── players.json              # Player accounts and characters
└── data/
    ├── containers.json       # Room containers and inventory
    ├── corpses.json          # NPC and player corpses
    ├── timers.json           # Respawn and decay timers
    └── shops/
        ├── sesame_shop.json  # Individual shop states
        └── ...
```

---

## 3. Persistence Systems

### 3.1 Player Persistence

**Managed by:** `PlayerDB` (`/home/micah/wumpy/src/playerdb.js`)
**Data file:** `/home/micah/wumpy/players.json`
**Format:** JSON object with username keys

**Persisted Data:**
- Account credentials (username, password hash)
- Character state (level, XP, stats)
- Current room position
- Inventory (serialized items)
- Equipment state (equipped items and slots)
- Currency (platinum, gold, silver, copper)
- HP and max HP
- Ghost status
- Custom display name and description
- Last login timestamp

**Save Triggers:**
- Player disconnect (immediate)
- Room movement (immediate)
- Inventory change (immediate)
- Manual save calls

**Restore Points:**
- Player login (authentication)
- Character creation

**Key Methods:**
- `savePlayer(player)` - Save complete player state
- `authenticate(username, password)` - Load and verify player
- `updatePlayerRoom(username, roomId)` - Save position change
- `updatePlayerInventory(username, inventory)` - Save inventory

**Critical Path:** Player position MUST be saved on every movement for good UX

---

### 3.2 Container Persistence

**Managed by:** `RoomContainerManager` (`/home/micah/wumpy/src/systems/containers/RoomContainerManager.js`)
**Data file:** `/home/micah/wumpy/data/containers.json`
**Format:** JSON object with container ID keys

**Persisted Data:**
- Container instance ID and definition ID
- Room location
- Open/closed state
- Locked/unlocked state
- Inventory array (serialized items)
- Capacity
- Last looted timestamp
- Next respawn timestamp
- Trap state

**Save Triggers:**
- Periodic (every 60 seconds via StateManager)
- Server shutdown (graceful)
- Manual export calls

**Restore Points:**
- Server startup (`ServerBootstrap.restoreContainerState()`)

**Key Methods:**
- `exportState()` - Serialize all containers to JSON
- `saveState(filepath)` - Write to disk
- `restoreState(data)` - Deserialize from JSON
- `loadState(filepath)` - Read from disk

**Critical Path:** Items in containers MUST have correct location metadata

---

### 3.3 Corpse Persistence

**Managed by:** `CorpseManager` (`/home/micah/wumpy/src/systems/corpses/CorpseManager.js`)
**Data file:** `/home/micah/wumpy/data/corpses.json`
**Format:** JSON array of corpse objects

**Persisted Data:**
- NPC corpses (with decay timers)
- Player corpses (with ownership info)
- Corpse inventory (loot)
- Currency in corpses
- Decay timer state
- Room location

**Save Triggers:**
- Periodic (every 60 seconds via StateManager)
- Server shutdown (graceful)

**Restore Points:**
- Server startup (`ServerBootstrap.restoreCorpseState()`)

**Key Methods:**
- `exportState()` - Serialize all corpses
- `saveState(filepath)` - Write to disk
- `restoreState(data)` - Deserialize and recreate corpses

**Critical Path:** Corpses with loot must not disappear on restart

---

### 3.4 Timer Persistence

**Managed by:** `TimerManager` (`/home/micah/wumpy/src/systems/corpses/TimerManager.js`)
**Data file:** `/home/micah/wumpy/data/timers.json`
**Format:** JSON array of timer objects

**Persisted Data:**
- Active timers (corpse decay, container respawn)
- Timer metadata and context
- Expiration timestamps
- Timer callbacks (serialized)

**Save Triggers:**
- Periodic (every 60 seconds via StateManager)
- Server shutdown (graceful)

**Restore Points:**
- Server startup

**Key Methods:**
- `exportState()` - Serialize active timers
- `restoreState(data)` - Recreate timers with remaining time

**Critical Path:** Timers must resume correctly after restart

---

### 3.5 Shop Persistence

**Managed by:** `ShopManager` (`/home/micah/wumpy/src/systems/economy/ShopManager.js`)
**Data files:** `/home/micah/wumpy/data/shops/*.json` (one per shop)
**Format:** JSON object per shop

**Persisted Data:**
- Shop inventory and stock levels
- Currency balances
- Transaction history
- Restock timers

**Save Triggers:**
- Server shutdown (asynchronous)
- Manual save calls

**Restore Points:**
- Server startup (shop initialization)

**Key Methods:**
- `saveAllShops()` - Async save of all shops

**Critical Path:** Shop inventory must persist between restarts

---

### 3.6 State Manager (Coordinator)

**File:** `/home/micah/wumpy/src/server/StateManager.js`
**Purpose:** Centralized periodic save coordinator

**Responsibilities:**
- Run 60-second auto-save loop
- Coordinate saves across systems
- Handle save failures gracefully
- Log save status

**Systems Managed:**
- Timers (synchronous)
- Corpses (synchronous)
- Containers (synchronous)

**NOT Managed:**
- Player positions (saved immediately on movement)
- Player inventory (saved on disconnect)
- Shops (saved on shutdown only)

**Key Methods:**
- `start(dataDir, components)` - Begin auto-save loop
- `stop()` - Stop auto-save loop
- `saveAllState()` - Execute one save cycle

**Critical Design:** StateManager does NOT save player positions because they're saved immediately on each movement. Adding player saves here is redundant but can provide extra safety net.

---

## 4. Data Flow Overview

### 4.1 Server Lifecycle

**Startup Flow:**
```
1. Load item registry
2. Load shops
3. Initialize world (rooms, NPCs)
4. Restore corpses ← corpses.json
5. Restore containers ← containers.json
6. Check and spawn missing NPCs
7. Start StateManager (60s auto-save)
8. Accept player connections
```

**Runtime Flow:**
```
1. Player connects → Load from players.json
2. Player moves → Save position immediately
3. Player interacts → State changes in memory
4. Every 60s → StateManager saves containers, corpses, timers
5. Player disconnects → Save player state immediately
```

**Shutdown Flow:**
```
1. Stop ambient dialogue
2. Stop StateManager (no more auto-saves)
3. Save all player states (CURRENTLY MISSING - BUG #2)
4. Save timers (synchronous)
5. Save corpses (synchronous)
6. Save containers (synchronous)
7. Save shops (asynchronous)
8. Exit process
```

### 4.2 Player Login Flow

```
Player connects
    ↓
AuthenticationFlow.handleLoginPassword()
    ↓
PlayerDB.authenticate() → Load from players.json
    ↓
Deserialize inventory → ItemFactory.restoreItem()
    ↓
Restore currentRoom position
    ↓
Recalculate equipment stats
    ↓
Register session → Player enters world
```

### 4.3 Item Movement Flow

**Getting item from container:**
```
Player: "get potion from chest"
    ↓
Find container in room
    ↓
Find item in container.inventory
    ↓
Create item instance → ItemFactory.restoreItem()
    ↓
Set location: { type: 'inventory', owner: username }
    ↓
Add to player.inventory
    ↓
Remove from container.inventory
    ↓
Save player inventory
```

**Putting item in container:**
```
Player: "put potion in chest"
    ↓
Find item in player.inventory
    ↓
Find container in room
    ↓
BUG: Pushes item with old location tag! ← CRITICAL BUG
Should: Sanitize and update location tag
    ↓
Add to container.inventory
    ↓
Remove from player.inventory
    ↓
Container saved on next auto-save cycle
```

### 4.4 Position Tracking Flow

```
Player: "north"
    ↓
Validate exit exists
    ↓
Update player.currentRoom = newRoomId
    ↓
PlayerDB.updatePlayerRoom() ← IMMEDIATE SAVE
    ↓
Position persisted to players.json
```

---

## 5. Design Principles

### 5.1 Persistence Patterns

**1. Immediate Saves for Critical Data**
- Player position (every movement)
- Player inventory (every change)
- Combat results (immediately)

**Rationale:** Players expect position and inventory to persist immediately. Losing progress feels like a bug.

**2. Periodic Saves for Bulk Data**
- Containers (every 60s)
- Corpses (every 60s)
- Timers (every 60s)

**Rationale:** These change frequently and full saves are expensive. 60-second window is acceptable data loss.

**3. Shutdown Saves for Everything**
- All systems save on graceful shutdown
- Minimizes data loss on normal restarts

**Rationale:** Planned shutdowns should lose zero data.

### 5.2 Serialization Strategy

**Inventory Serialization:**
- Convert BaseItem instances → Plain JSON objects
- Include all properties (durability, enchantments, etc.)
- Include location metadata
- Exclude transient state (cached values)

**Container Serialization:**
- Export complete container state
- Include inventory as array of item data
- Include timer metadata
- Filter out invalid items

**Player Serialization:**
- Export complete character state
- Serialize inventory array
- Include equipped item references
- Hash sensitive data (passwords)

### 5.3 Error Handling

**Save Failures:**
- Log error but don't crash server
- Retry on next cycle for periodic saves
- Alert on critical save failures

**Load Failures:**
- Log corrupted data
- Filter out invalid items
- Continue with partial state
- Report data loss to logs

**Corruption Detection:**
- Validate item schemas on load
- Check for missing required fields
- Repair correctable issues
- Warn about uncorrectable issues

### 5.4 Data Integrity

**Location Metadata Consistency:**
- Items track their location (inventory, container, room)
- Location should match actual location
- BUG: Currently not enforced (root cause of duplication)

**Ownership Tracking:**
- Items can be bound to players
- Containers belong to rooms
- Corpses have owners (for player corpses)

**Referential Integrity:**
- Item instanceIds are unique
- Container IDs reference valid definitions
- Room IDs reference valid world locations

---

## 6. Component Relationships

### 6.1 System Dependencies

```
AuthenticationFlow
    ├── depends on → PlayerDB
    ├── depends on → InventorySerializer
    └── depends on → EquipmentManager

PlayerDB
    └── depends on → fs (file system)

InventorySerializer
    ├── depends on → ItemFactory
    └── depends on → ItemRegistry

RoomContainerManager
    ├── depends on → ItemFactory
    └── depends on → TimerManager

StateManager
    ├── coordinates → TimerManager
    ├── coordinates → CorpseManager
    ├── coordinates → RoomContainerManager
    └── depends on → fs (file system)

ShutdownHandler
    ├── triggers → StateManager.stop()
    ├── triggers → TimerManager.saveState()
    ├── triggers → CorpseManager.exportState()
    ├── triggers → RoomContainerManager.saveState()
    ├── triggers → ShopManager.saveAllShops()
    └── MISSING → PlayerDB.saveAllPlayers() ← BUG #2
```

### 6.2 Data Flow Dependencies

**Player Inventory → Player File:**
```
Item instance in memory
    ↓ (serialize)
InventorySerializer.serializeInventory()
    ↓ (save)
PlayerDB.savePlayer()
    ↓ (write)
players.json
```

**Container Inventory → Container File:**
```
Container state in memory
    ↓ (export)
RoomContainerManager.exportState()
    ↓ (save)
RoomContainerManager.saveState()
    ↓ (write)
data/containers.json
```

**Player Login → Inventory Restore:**
```
players.json
    ↓ (read)
PlayerDB.authenticate()
    ↓ (deserialize)
InventorySerializer.deserializeInventory()
    ↓ (restore)
Item instances in memory
```

### 6.3 Timing Dependencies

**Critical Timing:**
- Movement → Save MUST complete before next movement
- Disconnect → Save MUST complete before session removed
- Item transfer → Location MUST update before save

**Race Conditions:**
- Rapid movements may queue multiple saves
- Item transfer + auto-save can race
- Shutdown during save can corrupt data

---

## 7. Quick Reference

### 7.1 Save Triggers Quick Lookup

| Event | What Saves | When | System |
|-------|-----------|------|--------|
| Player moves | Position | Immediate | PlayerDB |
| Player disconnects | Full player state | Immediate | PlayerDB |
| Inventory changes | Player inventory | Immediate | PlayerDB |
| 60 seconds elapsed | Containers, corpses, timers | Periodic | StateManager |
| Server shutdown | Everything | On exit | ShutdownHandler |
| Item transferred | Nothing (BUG) | Never | put.js |

### 7.2 File Locations Quick Lookup

| System | Source File | Data File |
|--------|-------------|-----------|
| Player persistence | `/home/micah/wumpy/src/playerdb.js` | `/home/micah/wumpy/players.json` |
| Container persistence | `/home/micah/wumpy/src/systems/containers/RoomContainerManager.js` | `/home/micah/wumpy/data/containers.json` |
| Corpse persistence | `/home/micah/wumpy/src/systems/corpses/CorpseManager.js` | `/home/micah/wumpy/data/corpses.json` |
| Timer persistence | `/home/micah/wumpy/src/systems/corpses/TimerManager.js` | `/home/micah/wumpy/data/timers.json` |
| Shop persistence | `/home/micah/wumpy/src/systems/economy/ShopManager.js` | `/home/micah/wumpy/data/shops/*.json` |
| State coordinator | `/home/micah/wumpy/src/server/StateManager.js` | N/A |
| Shutdown handler | `/home/micah/wumpy/src/server/ShutdownHandler.js` | N/A |
| Server bootstrap | `/home/micah/wumpy/src/server/ServerBootstrap.js` | N/A |
| Auth flow | `/home/micah/wumpy/src/server/AuthenticationFlow.js` | N/A |

### 7.3 Common Operations

**Save player state:**
```javascript
playerDB.savePlayer(player);
```

**Save player position:**
```javascript
playerDB.updatePlayerRoom(username, roomId);
```

**Save all containers:**
```javascript
const containersPath = path.join(dataDir, 'containers.json');
RoomContainerManager.saveState(containersPath);
```

**Restore containers on startup:**
```javascript
const containersPath = path.join(dataDir, 'containers.json');
RoomContainerManager.loadState(containersPath);
```

**Serialize player inventory:**
```javascript
const serialized = InventorySerializer.serializeInventory(player);
```

**Deserialize player inventory:**
```javascript
InventorySerializer.deserializeInventory(player, serializedData);
```

---

## See Also

- [BUGS_ANALYSIS.md](BUGS_ANALYSIS.md) - Complete bug analysis
- [FIXES_GUIDE.md](FIXES_GUIDE.md) - Implementation guide
- [API_REFERENCE.md](API_REFERENCE.md) - Detailed API documentation
- [DIAGRAMS.md](DIAGRAMS.md) - Visual data flow diagrams
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing procedures

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Current
