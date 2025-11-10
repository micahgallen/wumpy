---
title: Command System Architecture
status: current
last_updated: 2025-11-10
related: [adding-commands, combat-flow, event-system]
---

# Command System Architecture

The Wumpy command system uses a registry pattern for modular, extensible command handling. Commands are registered at startup, looked up by name or alias, validated through optional guards, and executed with a shared context object. The architecture separates command definition from execution, enabling hot-swappable commands and centralized command management.

## Overview

The command system processes player input through three phases: parsing (tokenization and command lookup), validation (guard execution), and execution (command logic with error handling). Commands are self-contained modules with metadata, aliases, guards, and help text, all registered in a central CommandRegistry.

The system supports both synchronous and asynchronous command execution, handles admin commands through special routing, and provides consistent error handling across all commands.

## Core Architecture

| Component | Purpose | Location |
|-----------|---------|----------|
| **CommandRegistry** | Stores command descriptors and aliases | `/src/commands/registry.js` |
| **parseCommand()** | Main parser, routes to commands | `/src/commands.js` |
| **Command Modules** | Individual command implementations | `/src/commands/{category}/` |
| **Guard Functions** | Pre-execution validation | Within command modules |
| **Context Object** | Shared runtime state | Built in parseCommand() |

## Command Registration Flow

```
Server Startup
    ↓
Load Command Modules (require())
    ↓
Each Module Exports Descriptor
    {
      name: 'attack',
      aliases: ['kill'],
      execute: Function,
      guard: Function (optional),
      help: Object (optional)
    }
    ↓
registry.registerCommand(descriptor)
    ↓
Validate Descriptor Schema
    - name: string (required)
    - execute: function (required)
    - aliases: array (optional)
    ↓
Store in commands Map
    commands.set('attack', descriptor)
    ↓
Register Aliases
    aliases.set('kill', 'attack')
    ↓
Command Ready for Lookup
```

Registration happens in `/src/commands.js` during module initialization. Commands are imported, then registered via `registry.registerCommand()`. The registry validates each descriptor and throws errors on conflicts.

## Command Execution Flow

```
Player Input: "attack goblin"
    ↓
parseCommand(input, player, world, playerDB, ...)
    ↓
Split Input: commandName="attack", args=["goblin"]
    ↓
registry.getCommand('attack')
    ↓
Lookup in commands Map or aliases Map
    ↓
Command Found: descriptor object
    ↓
Build Context Object
    {
      world: World,
      playerDB: PlayerDB,
      allPlayers: Set<Player>,
      activeInteractions: Map,
      combatEngine: CombatEngine,
      adminSystem: Object
    }
    ↓
Execute Guard (if present)
    guard(player, args, context)
    ↓
Guard Returns: { allowed: true/false, reason: string }
    ↓
If allowed=false: Send error message, STOP
    ↓
Execute Command
    execute(player, args, context)
    ↓
Handle Async (if Promise returned)
    result.catch(err => logger.error(...))
    ↓
Command Complete
```

All commands receive the same signature: `(player, args, context)`. The context object provides access to game state without tight coupling between commands and server internals.

## Command Descriptor Schema

Every command module exports a descriptor object with these properties:

| Property | Required | Type | Purpose |
|----------|----------|------|---------|
| `name` | Yes | string | Primary command name (lowercase) |
| `execute` | Yes | function | Command logic: `(player, args, context) => void` |
| `aliases` | No | string[] | Alternative command names |
| `guard` | No | function | Pre-execution check: `(player, args, context) => {allowed, reason}` |
| `help` | No | object | Help metadata: `{description, usage, examples}` |

Example descriptor from `/src/commands/combat/attack.js`:

```javascript
module.exports = {
  name: 'attack',
  aliases: ['kill'],
  execute: function(player, args, context) { /* ... */ },
  guard: requireNotGhost, // function that checks player.isGhost
  help: {
    description: 'Initiate combat with an NPC',
    usage: 'attack <target>',
    examples: ['attack goblin', 'attack wumpy']
  }
};
```

## Guard Pattern

Guards provide reusable validation logic executed before command execution:

| Guard Use Case | Example Guard Function | Rejection Reason |
|----------------|------------------------|------------------|
| Ghost restriction | `requireNotGhost()` | "You cannot attack while you are a ghost!" |
| Combat status | `requireNotInCombat()` | "You cannot do that while in combat!" |
| Item requirement | `requireItem(itemId)` | "You need a key to open this door!" |
| Cooldown check | `checkCooldown(type)` | "You must wait 30s before using this again!" |
| Admin permission | `requireAdmin()` | "This command requires admin privileges!" |

Guard function signature:

```javascript
function guardName(player, args, context) {
  if (validationFails) {
    return { allowed: false, reason: 'Error message shown to player' };
  }
  return { allowed: true };
}
```

Guards are executed synchronously before the command. If `allowed: false`, the command never runs and the reason is sent to the player.

## Command Categories

Commands are organized by category in the filesystem:

| Category | Directory | Examples | Purpose |
|----------|-----------|----------|---------|
| **Core** | `/src/commands/core/` | look, inventory, quit, help | Essential gameplay |
| **Combat** | `/src/commands/combat/` | attack | Combat initiation |
| **Movement** | `/src/commands/movement/` | north, south, east, west | Navigation |
| **Economy** | `/src/commands/economy/` | buy, sell, list, value | Shop interaction |
| **Containers** | `/src/commands/containers/` | open, close | Container manipulation |
| **Admin** | `/src/commands/admin/` | givemoney, corpseinfo | Admin-only tools |
| **Emotes** | `/src/commands/emotes/` | smile, laugh, dance | Social expressions |

Each category directory contains individual command modules. Commands are imported in `/src/commands.js` and registered at startup.

## Context Object Properties

The context object provides dependency injection for commands:

| Property | Type | Purpose |
|----------|------|---------|
| `world` | World | Room/NPC/object data access |
| `playerDB` | PlayerDB | Player persistence and queries |
| `allPlayers` | Set\<Player\> | All connected players |
| `activeInteractions` | Map | Interaction state tracking |
| `combatEngine` | CombatEngine | Combat system integration |
| `adminSystem` | Object | Admin services (if available) |

Commands access context properties as needed. Not all commands use all properties. Example:

```javascript
function execute(player, args, context) {
  const { world, combatEngine } = context;
  const room = world.getRoom(player.currentRoom);
  const npc = world.getNPC(args[0]);
  combatEngine.initiateCombat([player, npc]);
}
```

## Error Handling

The command system provides three layers of error handling:

| Layer | Scope | Behavior |
|-------|-------|----------|
| **Registry validation** | Registration time | Throws Error if descriptor invalid or conflicts |
| **Guard validation** | Pre-execution | Returns error message to player, stops execution |
| **Execution errors** | Runtime | Catches exceptions, logs to logger, shows generic error |

Example execution error handling from `/src/commands.js`:

```javascript
try {
  const result = registeredCommand.execute(player, args, context);
  if (result && typeof result.then === 'function') {
    result.catch(err => {
      logger.error(`Error in async command '${commandName}':`, err);
      player.send(colors.error('An error occurred...'));
    });
  }
} catch (err) {
  logger.error(`Error executing command '${commandName}':`, err);
  player.send(colors.error('An error occurred...'));
}
```

This ensures players never see stack traces, only friendly error messages.

## Async Command Support

Commands can return Promises for asynchronous operations:

```javascript
async function execute(player, args, context) {
  const data = await fetchDataFromDatabase(args[0]);
  player.send(`Found: ${data.name}`);
}
```

The parser detects Promise returns via `result.then === 'function'` and attaches error handlers. Sync and async commands coexist without special flags.

## Admin Command Routing

Admin commands use a special prefix (`@`) and separate routing:

```
Input: "@ban player123 reason"
    ↓
parseCommand() checks isAdminCommand(trimmed)
    ↓
If true: executeAdminCommand(trimmed, player, context)
    ↓
Route to admin/chatBinding.js system
    ↓
Separate authentication and rate limiting
```

Admin commands bypass the registry system and use their own validation and execution pipeline. See `/src/admin/chatBinding.js` for implementation.

## Registry API Reference

The CommandRegistry exposes these methods:

| Method | Parameters | Returns | Purpose |
|--------|------------|---------|---------|
| `registerCommand()` | descriptor: Object | void | Add command to registry |
| `getCommand()` | nameOrAlias: string | descriptor \| null | Lookup command |
| `getAllCommandNames()` | none | string[] | List all registered names |
| `clearRegistry()` | none | void | Remove all commands (testing) |

## Command Module Template

Standard structure for new command modules:

```javascript
/**
 * CommandName Command
 * Brief description of what this command does
 */

const colors = require('../../colors');

// Optional guard function
function guardName(player, args, context) {
  if (/* validation fails */) {
    return { allowed: false, reason: 'Error message' };
  }
  return { allowed: true };
}

/**
 * Execute command logic
 * @param {Object} player - Player executing command
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Game state context
 */
function execute(player, args, context) {
  const { world, playerDB } = context;

  // Command logic here
  player.send(colors.info('Success message'));
}

module.exports = {
  name: 'commandname',
  aliases: ['alias1', 'alias2'],
  execute,
  guard: guardName, // optional
  help: {
    description: 'Brief description',
    usage: 'commandname <arg>',
    examples: ['commandname foo', 'alias1 bar']
  }
};
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Command lookup | O(1) | Hash map lookup by name |
| Alias resolution | O(1) | Hash map lookup, then command lookup |
| Registration | O(1) | Hash map insertion |
| Full registry scan | O(n) | Only used for help command |

The registry uses JavaScript Maps for O(1) lookups. No iteration happens during normal command execution.

## Integration Points

The command system integrates with other Wumpy systems:

| System | Integration | Example |
|--------|-------------|---------|
| **Combat** | Commands call combatEngine.initiateCombat() | `attack` command |
| **Equipment** | Commands call EquipmentManager methods | `equip`, `unequip` |
| **Inventory** | Commands call InventoryManager methods | `get`, `drop` |
| **World** | Commands query world.getRoom(), world.getNPC() | `look`, `examine` |
| **Admin** | Special routing for @ commands | `@ban`, `@kick` |

Commands act as the interface layer between player input and game systems. They translate user intent into system method calls.

## See Also

- [Adding Commands Pattern](../patterns/adding-commands.md) - How to create new commands
- [Combat Flow Architecture](combat-flow.md) - Combat system integration
- [Event System Architecture](event-system.md) - Event-driven patterns
