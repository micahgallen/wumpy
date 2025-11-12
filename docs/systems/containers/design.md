---
title: Fixed Room Containers - Technical Design
status: design
version: 1.0
created: 2025-11-11
related: [container-manager, item-systems, world-system]
---

# Fixed Room Containers - Technical Design

## Overview

Fixed room containers are permanent, immovable container objects that exist in rooms and bridge the gap between legacy "room objects" (decorative fixtures) and the modern item/container system. They provide storage, loot spawning, and interactive gameplay elements.

## Design Goals

1. **Seamless Integration**: Leverage existing ContainerManager and item systems
2. **Flexible Definition**: Support standalone container definition files
3. **Loot Management**: Built-in item spawning and respawning capabilities
4. **Room Integration**: Referenced via tags in room files, just like NPCs and items
5. **Persistence**: Container state (open/closed, contents) survives server restarts
6. **Command Support**: Works with existing open, close, look, get, put commands

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Room Container System                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │   Room File  │────▶│ RoomObject   │────▶│  Container   │ │
│  │   (JSON)     │     │   Loader     │     │   Manager    │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│        │                      │                      │        │
│        │                      │                      │        │
│        ▼                      ▼                      ▼        │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │  Container   │     │ Loot Spawner │     │ Persistence  │ │
│  │ Definition   │────▶│   System     │────▶│   Manager    │ │
│  │   (*.js)     │     │              │     │              │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Differences from Portable Containers

| Feature | Fixed Room Container | Portable Container (Corpse) | Legacy Room Object |
|---------|---------------------|----------------------------|-------------------|
| **Pickupable** | No (`isTakeable: false`) | Yes (corpses are items) | No (not items) |
| **Storage Location** | `room.containers` array | `room.items` array | `room.objects` array |
| **Definition Source** | `world/*/objects/*.js` | Runtime creation | `world/*/objects/*.js` |
| **Persistence** | State saved to `data/containers.json` | State saved to `data/corpses.json` | No persistence |
| **Loot Spawning** | Yes (on init & respawn) | Yes (on NPC death) | No |
| **Decay/Removal** | Never (permanent fixture) | Yes (timer-based) | Never |
| **Examinable** | Yes (via `look` and `examine`) | Yes | Yes |

## Data Schema

### Container Definition File

Location: `world/<realm>/objects/<container_name>.js`

```javascript
{
  // Basic Identity
  "id": "treasure_chest_001",
  "name": "an ornate treasure chest",
  "description": "A heavy oak chest with iron bindings and a brass lock. It looks like it's been here for years.",
  "keywords": ["chest", "treasure chest", "treasure", "box"],

  // Container Properties
  "containerType": "room_container",
  "isRoomContainer": true,      // Flag for system identification
  "isTakeable": false,           // Cannot be picked up
  "isExaminable": true,

  // Lock Properties (optional)
  "isLocked": true,              // Starts locked
  "lockDifficulty": 15,          // DC for lockpicking (future)
  "keyItemId": "brass_key_001",  // Item that unlocks this

  // State Properties
  "isOpen": false,               // Starts closed
  "capacity": 20,                // Number of item slots

  // Display Properties
  "hideContainerStatus": false,  // If true, hides "(open/locked)" indicators and status info

  // Loot Configuration
  "lootConfig": {
    "spawnOnInit": true,         // Spawn loot when container first created
    "respawnOnEmpty": true,      // Respawn loot when emptied
    "respawnDelay": 300000,      // 5 minutes in ms
    "lootTable": "common_loot",  // Loot table category
    "guaranteedItems": [         // Always spawn these items
      {
        "itemId": "health_potion",
        "quantity": 2,
        "chance": 100              // 100% spawn chance
      }
    ],
    "randomItems": {             // Random loot pool
      "count": 3,                  // Number of random items
      "lootTable": "common_loot"   // Uses ItemRegistry loot tables
    }
  },

  // Interaction Hooks (optional)
  "onOpen": {
    "message": "The chest creaks open, revealing its contents.",
    "sound": "chest_open",         // Future: sound effects
    "animation": "chest_lid_open"  // Future: visual effects
  },
  "onClose": {
    "message": "The chest closes with a solid thunk."
  },
  "onEmpty": {
    "message": "The chest is now empty.",
    "despawnDelay": 60000          // Optional: remove empty container after 1 minute
  }
}
```

### Room File Integration

```javascript
{
  "id": "treasure_room_01",
  "name": "Ancient Treasure Chamber",
  "description": "A dusty chamber filled with forgotten relics...",
  "exits": [...],
  "npcs": ["guardian_statue"],
  "objects": ["wall_torch", "stone_altar"],
  "items": ["ancient_coin"],

  // NEW: Room containers array
  "containers": ["treasure_chest_001", "small_lockbox_002"]
}
```

### Runtime Container State

```javascript
{
  id: "treasure_chest_001_instance_room_treasure_room_01",
  definitionId: "treasure_chest_001",
  roomId: "treasure_room_01",

  // Current state
  isOpen: false,
  isLocked: true,
  inventory: [
    { definitionId: "health_potion", instanceId: "...", quantity: 2 },
    { definitionId: "gold_coins", instanceId: "...", quantity: 50 }
  ],

  // Respawn tracking
  lastLooted: 1699564800000,
  nextRespawn: 1699565100000,

  // Metadata
  createdAt: 1699560000000,
  modifiedAt: 1699564800000
}
```

## Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 RoomContainerManager (NEW)

Create `/src/systems/containers/RoomContainerManager.js`

**Responsibilities:**
- Load container definitions from `world/*/objects/*.js`
- Create container instances for rooms
- Track container state (open/closed, inventory)
- Handle loot spawning and respawning
- Provide persistence hooks
- Emit events for room updates

**Key Methods:**
```javascript
class RoomContainerManager {
  // Initialization
  loadContainerDefinitions(worldDir)
  createContainerInstance(definitionId, roomId)

  // State Management
  openContainer(containerId, player)
  closeContainer(containerId, player)
  unlockContainer(containerId, keyItem)

  // Item Management
  addItemToContainer(containerId, item)
  removeItemFromContainer(containerId, itemId)
  getContainerContents(containerId)

  // Loot Management
  spawnLoot(containerId)
  scheduleRespawn(containerId)
  clearInventory(containerId)

  // Persistence
  exportState()
  restoreState(state)

  // Queries
  getContainer(containerId)
  getContainersByRoom(roomId)
  findContainerByKeyword(roomId, keyword)
}
```

#### 1.2 World Integration

Modify `/src/world.js`:

```javascript
class World {
  constructor(worldDir = './world') {
    this.worldDir = worldDir;
    this.rooms = {};
    this.npcs = {};
    this.objects = {};
    this.containers = {}; // NEW: Container definitions
    this.load();
  }

  loadRealm(realmName) {
    // Existing code...

    // NEW: Load container definitions
    this.loadContainerDefinitions(path.join(realmPath, 'objects'));
  }

  // NEW: Load containers from objects directory
  loadContainerDefinitions(objectsPath) {
    if (!fs.existsSync(objectsPath)) return;

    const files = fs.readdirSync(objectsPath);
    for (const file of files) {
      if (!file.endsWith('.js')) continue;

      const filePath = path.join(objectsPath, file);
      const data = fs.readFileSync(filePath, 'utf8');
      const definition = JSON.parse(data);

      // Only register room containers
      if (definition.isRoomContainer || definition.containerType === 'room_container') {
        this.containers[definition.id] = definition;
      }
    }
  }

  // NEW: Initialize room containers
  initializeRoomContainers() {
    const RoomContainerManager = require('./systems/containers/RoomContainerManager');

    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];

      if (!room.containers || room.containers.length === 0) continue;

      // Create container instances for this room
      for (const containerId of room.containers) {
        RoomContainerManager.createContainerInstance(containerId, roomId);
      }
    }
  }
}
```

#### 1.3 Command Integration

Commands already support containers via ContainerManager. We need to ensure they can find room containers:

**Modify `/src/commands/core/get.js`:**

```javascript
function findContainerInRoom(room, keyword) {
  // Check room.items first (corpses, portable containers)
  if (room.items && room.items.length > 0) {
    for (const item of room.items) {
      if (item.inventory && matchesKeyword(item, keyword)) {
        return item;
      }
    }
  }

  // NEW: Check room containers (fixed containers)
  const RoomContainerManager = require('../../systems/containers/RoomContainerManager');
  const containers = RoomContainerManager.getContainersByRoom(room.id);
  for (const container of containers) {
    if (matchesKeyword(container, keyword)) {
      return container;
    }
  }

  return null;
}

function matchesKeyword(obj, keyword) {
  const normalized = keyword.toLowerCase();

  if (obj.name && obj.name.toLowerCase().includes(normalized)) {
    return true;
  }

  if (obj.keywords && obj.keywords.some(kw =>
    kw.toLowerCase() === normalized ||
    kw.toLowerCase().includes(normalized)
  )) {
    return true;
  }

  return false;
}
```

**Create NEW commands (if not exist):**

`/src/commands/core/open.js`:
```javascript
function execute(player, args, context) {
  if (args.length === 0) {
    player.send(colors.error('Open what?\n'));
    return;
  }

  const target = args.join(' ').toLowerCase();
  const room = context.world.getRoom(player.currentRoom);

  // Find container in room
  const container = findContainerInRoom(room, target);
  if (!container) {
    player.send(colors.error(`You don't see "${args.join(' ')}" here.\n`));
    return;
  }

  // Use RoomContainerManager for room containers
  if (container.containerType === 'room_container') {
    const RoomContainerManager = require('../../systems/containers/RoomContainerManager');
    const result = RoomContainerManager.openContainer(container.id, player);

    if (result.success) {
      player.send(colors.success(result.message + '\n'));
    } else {
      player.send(colors.error(result.message + '\n'));
    }
    return;
  }

  // Use ContainerManager for portable containers
  const ContainerManager = require('../../systems/containers/ContainerManager');
  const result = ContainerManager.openContainer(player, container);

  if (result.success) {
    player.send(colors.success(result.message + '\n'));
  } else {
    player.send(colors.error(result.message + '\n'));
  }
}

module.exports = {
  name: 'open',
  description: 'Open a container',
  usage: 'open <container>',
  execute
};
```

`/src/commands/core/close.js`:
```javascript
function execute(player, args, context) {
  // Similar to open.js but calls closeContainer
}

module.exports = {
  name: 'close',
  description: 'Close a container',
  usage: 'close <container>',
  execute
};
```

### Phase 2: Loot System Integration

#### 2.1 LootSpawner

Create `/src/systems/containers/LootSpawner.js`:

```javascript
class LootSpawner {
  /**
   * Spawn loot for a room container based on its lootConfig
   * @param {Object} container - Container instance
   * @param {Object} containerDef - Container definition
   * @returns {Array} Spawned items
   */
  static spawnLoot(container, containerDef) {
    const lootConfig = containerDef.lootConfig;
    if (!lootConfig) return [];

    const items = [];
    const ItemRegistry = require('../../items/ItemRegistry');
    const ItemFactory = require('../../items/ItemFactory');
    const LootGenerator = require('../loot/LootGenerator');

    // Spawn guaranteed items
    if (lootConfig.guaranteedItems) {
      for (const guaranteed of lootConfig.guaranteedItems) {
        const roll = Math.random() * 100;
        if (roll <= guaranteed.chance) {
          const itemDef = ItemRegistry.getItem(guaranteed.itemId);
          if (itemDef) {
            const item = ItemFactory.createItem(itemDef, {
              quantity: guaranteed.quantity || 1,
              location: { type: 'container', containerId: container.id }
            });
            items.push(item);
          }
        }
      }
    }

    // Spawn random items from loot table
    if (lootConfig.randomItems) {
      const randomLoot = LootGenerator.generateLoot({
        lootTable: lootConfig.randomItems.lootTable,
        itemCount: lootConfig.randomItems.count || 3
      });
      items.push(...randomLoot.items);
    }

    return items;
  }

  /**
   * Check if container should respawn loot
   * @param {Object} container - Container instance
   * @param {Object} containerDef - Container definition
   * @returns {boolean} True if should respawn
   */
  static shouldRespawn(container, containerDef) {
    const lootConfig = containerDef.lootConfig;
    if (!lootConfig || !lootConfig.respawnOnEmpty) return false;

    // Container must be empty
    if (container.inventory.length > 0) return false;

    // Check respawn delay
    const now = Date.now();
    const timeSinceLooted = now - (container.lastLooted || 0);
    const respawnDelay = lootConfig.respawnDelay || 300000;

    return timeSinceLooted >= respawnDelay;
  }
}
```

#### 2.2 Respawn Timer Integration

Use existing `TimerManager` for respawn scheduling:

```javascript
// In RoomContainerManager
scheduleRespawn(containerId) {
  const container = this.getContainer(containerId);
  const definition = this.getDefinition(container.definitionId);

  if (!definition.lootConfig || !definition.lootConfig.respawnOnEmpty) {
    return; // No respawn configured
  }

  const delay = definition.lootConfig.respawnDelay || 300000;

  TimerManager.schedule(
    `container_respawn_${containerId}`,
    delay,
    (data) => this.onContainerRespawn(data.containerId),
    {
      type: 'container_respawn',
      containerId: containerId
    }
  );
}

onContainerRespawn(containerId) {
  const container = this.getContainer(containerId);
  const definition = this.getDefinition(container.definitionId);

  // Spawn new loot
  const items = LootSpawner.spawnLoot(container, definition);
  container.inventory = items;
  container.lastLooted = null;

  logger.log(`Respawned loot for container ${containerId}: ${items.length} items`);
}
```

### Phase 3: Persistence

#### 3.1 State Export/Import

```javascript
// In RoomContainerManager
exportState() {
  const state = {
    containers: [],
    savedAt: Date.now()
  };

  for (const container of this.containers.values()) {
    state.containers.push({
      id: container.id,
      definitionId: container.definitionId,
      roomId: container.roomId,
      isOpen: container.isOpen,
      isLocked: container.isLocked,
      inventory: container.inventory,
      lastLooted: container.lastLooted,
      nextRespawn: container.nextRespawn,
      modifiedAt: container.modifiedAt
    });
  }

  return state;
}

restoreState(state) {
  if (!state || !state.containers) return;

  for (const containerData of state.containers) {
    const definition = this.getDefinition(containerData.definitionId);
    if (!definition) {
      logger.warn(`Container definition not found: ${containerData.definitionId}`);
      continue;
    }

    // Restore container
    this.containers.set(containerData.id, containerData);

    // Reschedule respawn timer if needed
    if (containerData.nextRespawn && containerData.nextRespawn > Date.now()) {
      const delay = containerData.nextRespawn - Date.now();
      TimerManager.schedule(
        `container_respawn_${containerData.id}`,
        delay,
        (data) => this.onContainerRespawn(data.containerId),
        { type: 'container_respawn', containerId: containerData.id }
      );
    }
  }

  logger.log(`Restored ${state.containers.length} room containers`);
}
```

#### 3.2 Server Bootstrap Integration

Modify `/src/server/ServerBootstrap.js`:

```javascript
static initializeComponents() {
  // ... existing code ...

  // Initialize room containers
  const RoomContainerManager = require('../systems/containers/RoomContainerManager');
  RoomContainerManager.initialize(world);

  return { /* ... */ };
}

static restoreContainerState(world, dataDir) {
  const containersPath = path.join(dataDir, 'containers.json');

  try {
    if (fs.existsSync(containersPath)) {
      const rawData = fs.readFileSync(containersPath, 'utf8');
      const state = JSON.parse(rawData);

      const RoomContainerManager = require('../systems/containers/RoomContainerManager');
      RoomContainerManager.restoreState(state);

      logger.log(`Restored container state from ${containersPath}`);
    }
  } catch (err) {
    logger.error(`Failed to restore container state: ${err.message}`);
  }
}
```

## Display Integration

### Room Display

Modify `World.formatRoom()`:

```javascript
formatRoom(roomId, allPlayers, currentPlayer) {
  // ... existing code ...

  // NEW: Display room containers
  const RoomContainerManager = require('./systems/containers/RoomContainerManager');
  const containers = RoomContainerManager.getContainersByRoom(roomId);

  if (containers.length > 0) {
    output.push('');
    for (const container of containers) {
      const definition = RoomContainerManager.getDefinition(container.definitionId);
      let display = 'You see ' + colors.objectName(definition.name);

      // Show state indicators
      if (container.isLocked) {
        display += colors.dim(' (locked)');
      } else if (container.isOpen) {
        display += colors.dim(' (open)');
      }

      display += ' here.';
      output.push(display);
    }
  }

  // ... rest of existing code ...
}
```

### Examine Container

Modify `/src/commands/core/examine.js`:

```javascript
function execute(player, args, context) {
  // ... existing code ...

  // Check room containers
  const RoomContainerManager = require('../../systems/containers/RoomContainerManager');
  const containers = RoomContainerManager.getContainersByRoom(player.currentRoom);

  for (const container of containers) {
    if (matchesKeyword(container, target)) {
      const definition = RoomContainerManager.getDefinition(container.definitionId);

      player.send('\n' + colors.objectName(definition.name) + '\n');
      player.send(definition.description + '\n');

      // Show state
      if (container.isLocked) {
        player.send(colors.warning('It is locked.\n'));
      } else if (container.isOpen) {
        player.send(colors.info('It is open.\n'));

        // Show contents
        if (container.inventory.length > 0) {
          player.send(colors.info('Inside you see:\n'));
          for (const item of container.inventory) {
            const itemDef = ItemRegistry.getItem(item.definitionId);
            if (itemDef) {
              player.send(colors.dim(`  - ${itemDef.name}\n`));
            }
          }
        } else {
          player.send(colors.dim('It is empty.\n'));
        }
      } else {
        player.send(colors.info('It is closed.\n'));
      }

      return;
    }
  }

  // ... rest of existing code ...
}
```

## Testing Strategy

### Unit Tests

Create `/tests/roomContainerTests.js`:

```javascript
// Test container creation
// Test loot spawning
// Test open/close/lock mechanics
// Test persistence
// Test respawn timers
```

### Integration Tests

Create `/tests/roomContainerIntegrationTest.js`:

```javascript
// Test full player interaction flow
// Test command integration
// Test multi-room scenarios
// Test server restart persistence
```

### Demo Scenario

Create `/tests/roomContainerDemo.js`:

```javascript
// Create test room with containers
// Demonstrate open/close
// Demonstrate looting
// Demonstrate respawn
```

## Example Implementation

See `/world/sesame_street/objects/treasure_chest_example.js` (created separately)

## Migration Path

1. **No breaking changes** - Existing systems continue to work
2. **Gradual adoption** - Can convert legacy objects one at a time
3. **Backward compatibility** - Legacy `room.objects` still supported
4. **Clear separation** - Room containers vs portable containers vs legacy objects

## Performance Considerations

- **Memory**: ~1-2KB per container instance
- **Lookup**: O(1) container lookup by ID, O(n) by room (n = containers in room, typically <5)
- **Persistence**: Containers saved with corpses/timers (every 60 seconds)
- **Respawn**: Event-driven (no polling), same pattern as NPC respawns

## Security Considerations

- Validate container definitions on load
- Prevent duplicate container IDs
- Sanitize loot configuration
- Rate-limit container interactions (prevent spam open/close)
- Validate key items before unlocking

## Future Enhancements

1. **Lockpicking System**: Skill-based container unlocking
2. **Trapped Containers**: Damage/effects when opened without disarming
3. **Weight Limits**: Containers have weight capacity, not just slot capacity
4. **Visual Effects**: Animations and particles for open/close
5. **Sound Effects**: Audio feedback for interactions
6. **Quest Integration**: Containers as quest objectives
7. **Ownership**: Player-owned containers in housing
8. **Shared Storage**: Guild storage containers

## References

- [ContainerManager.js](/src/systems/containers/ContainerManager.js)
- [CorpseManager.js](/src/systems/corpses/CorpseManager.js)
- [Item Systems Reference](/docs/reference/item-systems.md)
- [World System](/src/world.js)
- [Get Command](/src/commands/core/get.js)
