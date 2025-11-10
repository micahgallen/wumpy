---
title: Adding Commands
status: current
last_updated: 2025-11-10
related: [command-system, combat-flow, item-system]
---

# Adding Commands

This guide walks through creating new player commands for Wumpy. Commands are self-contained modules registered at startup with a standard descriptor format. The process involves defining command logic, optional guards, help metadata, and registration in the command loader.

## Quick Start

Creating a command requires three steps: create the command module, export the descriptor, and register in `/src/commands.js`.

### Basic Command Example

Create `/src/commands/core/wave.js`:

```javascript
/**
 * Wave Command
 * Waves at other players or NPCs
 */

const colors = require('../../colors');

/**
 * Execute wave command
 * @param {Object} player - Player executing command
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Game state context
 */
function execute(player, args, context) {
  const { world, allPlayers } = context;

  if (args.length === 0) {
    // Wave at everyone in room
    const room = world.getRoom(player.currentRoom);
    player.send(colors.action('\nYou wave cheerfully!\n'));

    // Notify others in room
    for (const other of allPlayers) {
      if (other !== player && other.currentRoom === player.currentRoom) {
        other.send(colors.action(`\n${player.username} waves cheerfully!\n`));
      }
    }
    return;
  }

  // Wave at specific target
  const targetName = args.join(' ').toLowerCase();

  // Check for other players
  for (const other of allPlayers) {
    if (other.username.toLowerCase() === targetName &&
        other.currentRoom === player.currentRoom) {
      player.send(colors.action(`\nYou wave at ${other.username}!\n`));
      other.send(colors.action(`\n${player.username} waves at you!\n`));
      return;
    }
  }

  player.send(colors.error(`\nYou don't see "${args.join(' ')}" here.\n`));
}

/**
 * Command descriptor for registration
 */
module.exports = {
  name: 'wave',
  aliases: ['w'],
  execute,
  help: {
    description: 'Wave at players or NPCs',
    usage: 'wave [target]',
    examples: ['wave', 'wave alice', 'w bob']
  }
};
```

### Register Command

Add to `/src/commands.js`:

```javascript
// In the "Core commands" section
const waveCommand = require('./commands/core/wave');
registry.registerCommand(waveCommand);
```

## Command Descriptor Schema

Every command module exports a descriptor object:

| Property | Required | Type | Purpose |
|----------|----------|------|---------|
| `name` | Yes | string | Primary command name (lowercase) |
| `execute` | Yes | function | Command logic function |
| `aliases` | No | string[] | Alternative command names |
| `guard` | No | function | Pre-execution validation |
| `help` | No | object | Help system metadata |

### Execute Function Signature

```javascript
function execute(player, args, context) {
  // player: Player object with username, inventory, stats, etc.
  // args: Array of arguments (e.g., ["goblin"] for "attack goblin")
  // context: { world, playerDB, allPlayers, combatEngine, ... }
}
```

The execute function has no return value. Use `player.send()` to show messages to the player.

## Context Object Properties

Commands access game state via the context parameter:

| Property | Type | Usage |
|----------|------|-------|
| `world` | World | `world.getRoom(id)`, `world.getNPC(id)` |
| `playerDB` | PlayerDB | `playerDB.savePlayer(player)` |
| `allPlayers` | Set\<Player\> | Iterate to find other players |
| `combatEngine` | CombatEngine | `combatEngine.initiateCombat([...])` |
| `activeInteractions` | Map | Track NPC interactions |
| `adminSystem` | Object | Admin services (if available) |

Not all commands need all properties. Destructure only what you need:

```javascript
function execute(player, args, context) {
  const { world } = context; // Only need world for this command
  // ...
}
```

## Adding Guards

Guards validate preconditions before command execution:

```javascript
/**
 * Guard: Require player not to be a ghost
 */
function requireNotGhost(player, args, context) {
  if (player.isGhost) {
    return {
      allowed: false,
      reason: colors.error('\nYou cannot do that while you are a ghost!\n')
    };
  }
  return { allowed: true };
}

module.exports = {
  name: 'trade',
  execute,
  guard: requireNotGhost, // Guard function
  help: { ... }
};
```

Guard function signature:

```javascript
function guardName(player, args, context) {
  if (/* condition fails */) {
    return { allowed: false, reason: 'Error message to show player' };
  }
  return { allowed: true };
}
```

Common guard patterns:

| Guard Type | Check | Example |
|------------|-------|---------|
| Ghost restriction | `player.isGhost` | Cannot attack/trade while dead |
| Combat restriction | Check combat state | Cannot flee to town during combat |
| Item requirement | `player.inventory.find(...)` | Need key to unlock door |
| Cooldown | Compare timestamp | Ability used too recently |
| Admin permission | Check admin roles | Admin-only commands |

## Command Categories

Organize commands by category:

| Category | Directory | Examples |
|----------|-----------|----------|
| Core | `/src/commands/core/` | look, inventory, help |
| Combat | `/src/commands/combat/` | attack |
| Movement | `/src/commands/movement/` | north, south, up, down |
| Economy | `/src/commands/economy/` | buy, sell, value |
| Containers | `/src/commands/containers/` | open, close |
| Admin | `/src/commands/admin/` | givemoney, ban |
| Social | `/src/commands/social/` | say, emote, tell |

Place new commands in the appropriate category directory.

## Async Command Example

Commands can be async for database queries or network calls:

```javascript
async function execute(player, args, context) {
  const { playerDB } = context;

  player.send(colors.info('\nChecking leaderboard...\n'));

  const topPlayers = await playerDB.getTopPlayersByLevel(10);

  let message = colors.header('\n=== Top 10 Players ===\n');
  for (const p of topPlayers) {
    message += `${p.username} - Level ${p.level}\n`;
  }
  player.send(message);
}

module.exports = {
  name: 'leaderboard',
  execute, // Async function works automatically
  help: { ... }
};
```

No special flags needed. The command system detects Promise returns and handles errors.

## Multi-Argument Commands

Parse complex arguments:

```javascript
// Command: give item to player
// Usage: "give sword to alice"
function execute(player, args, context) {
  if (args.length < 3 || args[args.length - 2] !== 'to') {
    player.send(colors.error('\nUsage: give <item> to <player>\n'));
    return;
  }

  const playerName = args[args.length - 1];
  const itemName = args.slice(0, args.length - 2).join(' ');

  // Find item, find target, transfer
  // (implementation details omitted for brevity)
}
```

## Broadcasting to Room

Notify all players in the same room:

```javascript
function execute(player, args, context) {
  const { world, allPlayers } = context;
  const room = world.getRoom(player.currentRoom);

  const message = args.join(' ');

  // Send to current player
  player.send(colors.say(`\nYou say: "${message}"\n`));

  // Broadcast to others in room
  for (const other of allPlayers) {
    if (other !== player && other.currentRoom === player.currentRoom) {
      other.send(colors.say(`\n${player.username} says: "${message}"\n`));
    }
  }
}
```

## Error Handling

Handle errors gracefully:

```javascript
function execute(player, args, context) {
  const { world } = context;

  try {
    const room = world.getRoom(player.currentRoom);

    if (!room) {
      throw new Error(`Room ${player.currentRoom} not found`);
    }

    // Command logic...
  } catch (error) {
    logger.error('Wave command error:', error);
    player.send(colors.error('\nAn error occurred. Please try again.\n'));
  }
}
```

The command system catches exceptions and logs them, but explicit try-catch provides better error messages to players.

## Testing Commands

Test commands in isolation with mock players and context objects. Verify command behavior, message output, and state changes.

## Common Patterns

### Check for Arguments

```javascript
if (args.length === 0) {
  player.send(colors.error('\nUsage: commandname <arg>\n'));
  return;
}
```

### Find Target in Room

```javascript
const room = world.getRoom(player.currentRoom);
const targetName = args.join(' ').toLowerCase();

// Check NPCs
for (const npcId of room.npcs) {
  const npc = world.getNPC(npcId);
  if (npc.keywords.some(kw => kw.toLowerCase() === targetName)) {
    // Found NPC
    return;
  }
}

player.send(colors.error(`\nYou don't see "${args.join(' ')}" here.\n`));
```

### Save Player State

```javascript
// Modify player data
player.xp += 100;
player.level += 1;

// Save to database
context.playerDB.savePlayer(player);

player.send(colors.success('\nYou gained a level!\n'));
```

## See Also

- [Command System Architecture](../architecture/command-system.md) - System internals
- [Combat Flow Architecture](../architecture/combat-flow.md) - Combat integration
- [Item System](../systems/item-system.md) - Item-related commands
