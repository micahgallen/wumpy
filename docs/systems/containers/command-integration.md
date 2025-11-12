---
title: Room Containers - Command Integration Guide
status: design
version: 1.0
created: 2025-11-11
related: [room-containers-design, commands]
---

# Room Containers - Command Integration Guide

This document details how existing commands integrate with the room container system and what modifications are needed.

## Overview

Room containers should work seamlessly with existing commands. Players shouldn't need to learn new commands - they should be able to use familiar commands like `open`, `close`, `look`, `get`, and `put` naturally.

## Command Coverage Matrix

| Command | Current Support | Needs Modification | Priority | Notes |
|---------|----------------|-------------------|----------|-------|
| `look` | Partial | Yes | High | Show containers in room description |
| `examine` | Partial | Yes | High | Examine container details and contents |
| `open` | None | Create New | High | Open containers |
| `close` | None | Create New | High | Close containers |
| `get` | Yes | Yes | High | Get items from containers (already supports "from") |
| `put` | None | Create New | Medium | Put items into containers |
| `unlock` | None | Create New | Low | Unlock with key (future) |
| `lock` | None | Create New | Low | Lock with key (future) |
| `inventory` | N/A | No | N/A | Not related |
| `drop` | N/A | No | N/A | Not related |

## Implementation Details

### 1. Look Command

**File:** `/src/commands/core/look.js`

**Current Behavior:**
- Shows room name, description, exits
- Lists NPCs
- Lists legacy objects
- Lists items (new item system)
- Lists other players

**Required Changes:**
- Add section for room containers

**Implementation:**

```javascript
// In execute() function, after checking items
function execute(player, args, context) {
  // ... existing code ...

  // NEW: Check room containers
  const RoomContainerManager = require('../../systems/containers/RoomContainerManager');
  const containers = RoomContainerManager.getContainersByRoom(player.currentRoom);

  for (const container of containers) {
    if (matchesKeyword(container, targetName)) {
      const definition = RoomContainerManager.getDefinition(container.definitionId);

      let output = '\n' + colors.objectName(definition.name) + '\n';
      output += definition.description + '\n';

      // Show state
      if (container.isLocked) {
        output += colors.warning('It is locked.\n');
      } else if (container.isOpen) {
        output += colors.info('It is open.\n');

        // Show contents if open
        if (container.inventory && container.inventory.length > 0) {
          output += colors.info('\nInside you see:\n');
          const ItemRegistry = require('../../items/ItemRegistry');

          for (const item of container.inventory) {
            const itemDef = ItemRegistry.getItem(item.definitionId);
            if (itemDef) {
              let itemLine = '  - ' + itemDef.name;
              if (item.quantity > 1) {
                itemLine += colors.dim(` x${item.quantity}`);
              }
              output += colors.dim(itemLine + '\n');
            }
          }
        } else {
          output += colors.dim('It is empty.\n');
        }
      } else {
        output += colors.info('It is closed.\n');
      }

      player.send(output);
      return;
    }
  }

  // ... rest of existing code ...
}
```

### 2. Examine Command

**File:** `/src/commands/core/examine.js`

**Current Behavior:**
- Examines NPCs (shows stats, equipment, dialogue hints)
- Examines items in room
- Examines items in inventory
- Examines legacy objects

**Required Changes:**
- Add room container examination (same logic as look, but more detailed)

**Implementation:**

```javascript
function execute(player, args, context) {
  // ... existing NPC and item checks ...

  // NEW: Check room containers (add after item checks, before object checks)
  const RoomContainerManager = require('../../systems/containers/RoomContainerManager');
  const containers = RoomContainerManager.getContainersByRoom(player.currentRoom);

  for (const container of containers) {
    const definition = RoomContainerManager.getDefinition(container.definitionId);

    if (matchesKeyword(definition, target)) {
      let output = '\n' + colors.objectName(definition.name) + '\n';
      output += colors.line(colors.visibleLength(definition.name), '=') + '\n';
      output += definition.description + '\n\n';

      // Container type and capacity
      output += colors.dim(`Type: Container (${container.capacity} slots)\n`);

      // Lock status
      if (container.isLocked) {
        output += colors.warning('Status: LOCKED\n');
        if (definition.keyItemId) {
          output += colors.dim(`Required key: ${definition.keyItemId}\n`);
        }
      } else if (container.isOpen) {
        output += colors.success('Status: OPEN\n');
      } else {
        output += colors.info('Status: CLOSED\n');
      }

      // Contents (if open)
      if (container.isOpen && container.inventory && container.inventory.length > 0) {
        output += '\n' + colors.info('Contents:\n');
        const ItemRegistry = require('../../items/ItemRegistry');

        for (const item of container.inventory) {
          const itemDef = ItemRegistry.getItem(item.definitionId);
          if (itemDef) {
            let itemLine = '  - ' + itemDef.name;
            if (item.quantity > 1) {
              itemLine += colors.dim(` x${item.quantity}`);
            }
            output += itemLine + '\n';
          }
        }
      } else if (container.isOpen) {
        output += '\n' + colors.dim('The container is empty.\n');
      }

      // Respawn info (if applicable)
      if (definition.lootConfig && definition.lootConfig.respawnOnEmpty) {
        const respawnMinutes = Math.floor(definition.lootConfig.respawnDelay / 60000);
        output += '\n' + colors.dim(`This container refills every ${respawnMinutes} minutes.\n`);
      }

      player.send(output);
      return;
    }
  }

  // ... rest of existing code ...
}
```

### 3. Open Command (NEW)

**File:** `/src/commands/core/open.js` (CREATE NEW)

**Purpose:** Open containers (room containers, portable containers, doors)

**Implementation:**

```javascript
/**
 * Open Command - Open containers and doors
 */

const colors = require('../../colors');

/**
 * Find a container in the room by keyword
 */
function findContainer(room, keyword) {
  // Check room.items for portable containers (corpses, bags, etc.)
  if (room.items && room.items.length > 0) {
    for (const item of room.items) {
      if (item.inventory && matchesKeyword(item, keyword)) {
        return { container: item, type: 'portable' };
      }
    }
  }

  // Check room containers (fixed containers)
  const RoomContainerManager = require('../../systems/containers/RoomContainerManager');
  const containers = RoomContainerManager.getContainersByRoom(room.id);

  for (const container of containers) {
    const definition = RoomContainerManager.getDefinition(container.definitionId);
    if (matchesKeyword(definition, keyword)) {
      return { container, definition, type: 'room' };
    }
  }

  return null;
}

/**
 * Check if object matches keyword
 */
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

/**
 * Execute open command
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send('\n' + colors.error('Open what?\n'));
    player.send(colors.hint('Usage: open <container>\n'));
    return;
  }

  const target = args.join(' ').toLowerCase();
  const room = context.world.getRoom(player.currentRoom);

  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Find the container
  const result = findContainer(room, target);

  if (!result) {
    player.send('\n' + colors.error(`You don't see "${args.join(' ')}" here.\n'));
    return;
  }

  const { container, definition, type } = result;

  // Handle room containers
  if (type === 'room') {
    // Check if already open
    if (container.isOpen) {
      player.send('\n' + colors.info(`${definition.name} is already open.\n`));
      return;
    }

    // Check if locked
    if (container.isLocked) {
      player.send('\n' + colors.error(`${definition.name} is locked.\n`));
      if (definition.keyItemId) {
        player.send(colors.hint(`You need ${definition.keyItemId} to unlock it.\n`));
      }
      return;
    }

    // Open the container
    container.isOpen = true;
    container.modifiedAt = Date.now();

    // Show custom message or default
    const message = definition.onOpen?.message || `You open ${definition.name}.`;
    player.send('\n' + colors.success(message + '\n'));

    // Show contents if configured
    if (container.inventory && container.inventory.length > 0) {
      player.send(colors.info('Inside you see:\n'));
      const ItemRegistry = require('../../items/ItemRegistry');

      for (const item of container.inventory) {
        const itemDef = ItemRegistry.getItem(item.definitionId);
        if (itemDef) {
          let itemLine = '  - ' + itemDef.name;
          if (item.quantity > 1) {
            itemLine += colors.dim(` x${item.quantity}`);
          }
          player.send(itemLine + '\n');
        }
      }
    } else {
      player.send(colors.dim('It is empty.\n'));
    }

    // Announce to room
    if (context.allPlayers) {
      const announcement = `${player.getDisplayName()} opens ${definition.name}.`;
      for (const p of context.allPlayers) {
        if (p !== player && p.currentRoom === player.currentRoom) {
          p.send('\n' + colors.dim(announcement + '\n'));
        }
      }
    }

    return;
  }

  // Handle portable containers (corpses, bags, etc.)
  if (type === 'portable') {
    // Use existing ContainerManager
    const ContainerManager = require('../../systems/containers/ContainerManager');
    const openResult = ContainerManager.openContainer(player, container);

    if (openResult.success) {
      player.send('\n' + colors.success(openResult.message + '\n'));

      // Show contents
      if (container.inventory && container.inventory.length > 0) {
        const contents = ContainerManager.getContentsDisplay(container);
        player.send(contents + '\n');
      }
    } else {
      player.send('\n' + colors.error(openResult.message + '\n'));
    }

    return;
  }
}

module.exports = {
  name: 'open',
  description: 'Open a container',
  usage: 'open <container>',
  execute
};
```

### 4. Close Command (NEW)

**File:** `/src/commands/core/close.js` (CREATE NEW)

**Purpose:** Close containers

**Implementation:**

```javascript
/**
 * Close Command - Close containers and doors
 */

const colors = require('../../colors');

/**
 * Find a container in the room by keyword
 * (Same as open.js)
 */
function findContainer(room, keyword) {
  // ... same implementation as open.js ...
}

function matchesKeyword(obj, keyword) {
  // ... same implementation as open.js ...
}

/**
 * Execute close command
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send('\n' + colors.error('Close what?\n'));
    player.send(colors.hint('Usage: close <container>\n'));
    return;
  }

  const target = args.join(' ').toLowerCase();
  const room = context.world.getRoom(player.currentRoom);

  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Find the container
  const result = findContainer(room, target);

  if (!result) {
    player.send('\n' + colors.error(`You don't see "${args.join(' ')}" here.\n`));
    return;
  }

  const { container, definition, type } = result;

  // Handle room containers
  if (type === 'room') {
    // Check if already closed
    if (!container.isOpen) {
      player.send('\n' + colors.info(`${definition.name} is already closed.\n`));
      return;
    }

    // Close the container
    container.isOpen = false;
    container.modifiedAt = Date.now();

    // Show custom message or default
    const message = definition.onClose?.message || `You close ${definition.name}.`;
    player.send('\n' + colors.success(message + '\n'));

    // Announce to room
    if (context.allPlayers) {
      const announcement = `${player.getDisplayName()} closes ${definition.name}.`;
      for (const p of context.allPlayers) {
        if (p !== player && p.currentRoom === player.currentRoom) {
          p.send('\n' + colors.dim(announcement + '\n'));
        }
      }
    }

    return;
  }

  // Handle portable containers
  if (type === 'portable') {
    const ContainerManager = require('../../systems/containers/ContainerManager');
    const closeResult = ContainerManager.closeContainer(player, container);

    if (closeResult.success) {
      player.send('\n' + colors.success(closeResult.message + '\n'));
    } else {
      player.send('\n' + colors.error(closeResult.message + '\n'));
    }

    return;
  }
}

module.exports = {
  name: 'close',
  description: 'Close a container',
  usage: 'close <container>',
  execute
};
```

### 5. Get Command

**File:** `/src/commands/core/get.js`

**Current Behavior:**
- Already supports "get item from container" syntax
- Works with corpses (which are containers in room.items)

**Required Changes:**
- Extend `findContainerInRoom()` to check room containers

**Implementation:**

```javascript
// MODIFY existing function
function findContainerInRoom(room, keyword) {
  const normalizedKeyword = keyword.toLowerCase();

  // Check room.items first (corpses, portable containers)
  if (room.items && room.items.length > 0) {
    for (const item of room.items) {
      // Check if item is a container (has inventory property)
      if (!item.inventory) {
        continue;
      }

      // Check item name
      if (item.name && item.name.toLowerCase().includes(normalizedKeyword)) {
        return item;
      }

      // Check keywords
      if (item.keywords && item.keywords.some(kw =>
        kw.toLowerCase() === normalizedKeyword ||
        kw.toLowerCase().includes(normalizedKeyword)
      )) {
        return item;
      }
    }
  }

  // NEW: Check room containers (fixed containers)
  const RoomContainerManager = require('../../systems/containers/RoomContainerManager');
  const containers = RoomContainerManager.getContainersByRoom(room.id);

  for (const container of containers) {
    const definition = RoomContainerManager.getDefinition(container.definitionId);

    // Check name
    if (definition.name && definition.name.toLowerCase().includes(normalizedKeyword)) {
      // Return container with its definition attached
      return { ...container, _definition: definition };
    }

    // Check keywords
    if (definition.keywords && definition.keywords.some(kw =>
      kw.toLowerCase() === normalizedKeyword ||
      kw.toLowerCase().includes(normalizedKeyword)
    )) {
      return { ...container, _definition: definition };
    }
  }

  return null;
}

// The rest of the get command logic already handles containers correctly
// No other changes needed!
```

### 6. Put Command (NEW)

**File:** `/src/commands/core/put.js` (CREATE NEW)

**Purpose:** Put items into containers

**Implementation:**

```javascript
/**
 * Put Command - Put items into containers
 */

const colors = require('../../colors');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');

function findContainer(room, keyword) {
  // ... same implementation as open.js ...
}

function matchesKeyword(obj, keyword) {
  // ... same implementation as open.js ...
}

/**
 * Execute put command
 */
function execute(player, args, context) {
  if (args.length < 3) {
    player.send('\n' + colors.error('Put what in what?\n'));
    player.send(colors.hint('Usage: put <item> in <container>\n'));
    return;
  }

  // Find "in" keyword
  const inIndex = args.findIndex(arg => arg.toLowerCase() === 'in' || arg.toLowerCase() === 'into');

  if (inIndex === -1 || inIndex === 0) {
    player.send('\n' + colors.error('Usage: put <item> in <container>\n'));
    return;
  }

  const itemArgs = args.slice(0, inIndex);
  const containerArgs = args.slice(inIndex + 1);

  if (itemArgs.length === 0 || containerArgs.length === 0) {
    player.send('\n' + colors.error('Put what in what?\n'));
    return;
  }

  const itemTarget = itemArgs.join(' ').toLowerCase();
  const containerTarget = containerArgs.join(' ').toLowerCase();

  const room = context.world.getRoom(player.currentRoom);

  // Find container
  const containerResult = findContainer(room, containerTarget);

  if (!containerResult) {
    player.send('\n' + colors.error(`You don't see "${containerArgs.join(' ')}" here.\n`));
    return;
  }

  const { container, definition, type } = containerResult;

  // Check if container is open
  if (!container.isOpen) {
    const name = definition?.name || container.name;
    player.send('\n' + colors.error(`${name} is closed. Open it first.\n`));
    return;
  }

  // Find item in player's inventory
  const item = InventoryManager.findItemByKeyword(player, itemTarget);

  if (!item) {
    player.send('\n' + colors.error(`You don't have "${itemArgs.join(' ')}".\n`));
    return;
  }

  // Can't put equipped items
  if (item.isEquipped) {
    player.send('\n' + colors.error(`You must unequip ${item.name} first.\n`));
    return;
  }

  // Check container capacity
  if (container.inventory.length >= container.capacity) {
    const name = definition?.name || container.name;
    player.send('\n' + colors.error(`${name} is full.\n`));
    return;
  }

  // Remove from player inventory
  InventoryManager.removeItem(player, item.instanceId);

  // Add to container
  container.inventory.push({
    definitionId: item.definitionId,
    instanceId: item.instanceId,
    quantity: item.quantity || 1,
    durability: item.durability,
    maxDurability: item.maxDurability
  });

  container.modifiedAt = Date.now();

  // Save player inventory
  const serialized = InventorySerializer.serializeInventory(player);
  context.playerDB.updatePlayerInventory(player.username, serialized);

  // Success message
  const name = definition?.name || container.name;
  player.send('\n' + colors.success(`You put ${item.getDisplayName()} in ${name}.\n`));

  // Announce to room
  if (context.allPlayers) {
    const announcement = `${player.getDisplayName()} puts ${item.getDisplayName()} in ${name}.`;
    for (const p of context.allPlayers) {
      if (p !== player && p.currentRoom === player.currentRoom) {
        p.send('\n' + colors.dim(announcement + '\n'));
      }
    }
  }
}

module.exports = {
  name: 'put',
  aliases: ['place'],
  description: 'Put an item into a container',
  usage: 'put <item> in <container>',
  execute
};
```

### 7. World Display Integration

**File:** `/src/world.js`

**Method:** `formatRoom()`

**Required Changes:**
- Add room container display after items

**Implementation:**

```javascript
formatRoom(roomId, allPlayers, currentPlayer) {
  const room = this.getRoom(roomId);
  if (!room) {
    return colors.error('You are in a void. This room does not exist.');
  }

  let output = [];

  // ... existing room name, description, exits, NPCs, objects, items ...

  // NEW: Room containers (add after items section)
  const RoomContainerManager = require('./systems/containers/RoomContainerManager');
  const containers = RoomContainerManager.getContainersByRoom(roomId);

  if (containers && containers.length > 0) {
    output.push('');
    for (const container of containers) {
      const definition = RoomContainerManager.getDefinition(container.definitionId);
      if (!definition) continue;

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

  // ... existing players section ...

  return output.join('\n');
}
```

## Command Registration

All new commands must be registered in the command system:

**File:** `/src/commands/registry.js`

```javascript
// Ensure these commands are registered
registerCommand(require('./core/open'));
registerCommand(require('./core/close'));
registerCommand(require('./core/put'));
```

## Testing Checklist

### Manual Testing Flow

1. **Container Display**
   - [ ] Container appears in room description
   - [ ] Container shows (locked) indicator when locked
   - [ ] Container shows (open) indicator when open

2. **Examine Command**
   - [ ] Can examine closed container
   - [ ] Can examine open container
   - [ ] See contents when open
   - [ ] See "empty" message when container is empty
   - [ ] See lock status

3. **Open Command**
   - [ ] Can open unlocked, closed container
   - [ ] Cannot open locked container
   - [ ] Cannot open already-open container
   - [ ] See custom onOpen message if configured
   - [ ] See container contents after opening

4. **Close Command**
   - [ ] Can close open container
   - [ ] Cannot close already-closed container
   - [ ] See custom onClose message if configured

5. **Get Command**
   - [ ] Can get item from open container
   - [ ] Cannot get from closed container
   - [ ] Can get multiple items (quantity)
   - [ ] Can get all items
   - [ ] Inventory updates correctly
   - [ ] Container becomes empty after taking all

6. **Put Command**
   - [ ] Can put item in open container
   - [ ] Cannot put in closed container
   - [ ] Cannot put equipped items
   - [ ] Cannot overfill container (capacity check)
   - [ ] Item removed from inventory
   - [ ] Item appears in container

7. **Loot Spawning**
   - [ ] Container spawns loot on server start
   - [ ] Guaranteed items spawn correctly
   - [ ] Random items spawn from loot table
   - [ ] Respawn timer triggers after empty

8. **Persistence**
   - [ ] Container state saves (open/closed)
   - [ ] Container inventory saves
   - [ ] Container state restores after server restart
   - [ ] Respawn timers restore correctly

## Error Handling

All commands should handle:

- Missing arguments
- Invalid container names
- Container not found
- Container locked
- Container closed (for get/put)
- Container full (for put)
- Item not found (for put)
- Equipped items (for put)
- No permissions (future: ownership checks)

## Performance Considerations

- Container lookup is O(n) where n = containers in room (typically <5)
- Room container caching could be added if needed
- Inventory operations are already optimized in InventoryManager
- No polling - all timers are event-driven

## Future Command Extensions

### Unlock Command

```javascript
// unlock <container> with <key>
function execute(player, args, context) {
  // Find "with" keyword
  // Verify player has key
  // Check key matches container.keyItemId
  // Unlock container
}
```

### Lock Command

```javascript
// lock <container> with <key>
function execute(player, args, context) {
  // Similar to unlock but sets isLocked = true
  // Also sets isOpen = false
}
```

### Search Command

```javascript
// search <container> (reveals hidden compartments, future feature)
function execute(player, args, context) {
  // Skill check
  // Reveal hidden items
  // Grant XP on success
}
```

## See Also

- [Room Containers Technical Design](/docs/systems/room-containers-design.md)
- [Creating Room Containers](/docs/wiki/patterns/creating-room-containers.md)
- [Command System Architecture](/docs/wiki/architecture/command-system.md)
