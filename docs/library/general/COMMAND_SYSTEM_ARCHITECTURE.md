# Command System Architecture

## Overview

The MUD's command system uses a modular, registry-based architecture that separates command registration, dispatch, and execution into distinct, testable layers. This design enables easy addition of new commands, clear separation of concerns, and maintainable code organization.

## High-Level Command Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                                    │
│    "attack goblin"                                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. PARSE COMMAND (commands.js)                                  │
│    - Split command and arguments                                │
│    - Build context object (world, playerDB, etc.)               │
│    - Check for admin commands (@addlevel, etc.)                 │
│    - Handle special cases (sorry for wumpy)                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. REGISTRY LOOKUP (commands/registry.js)                       │
│    registry.getCommand("attack")                                │
│    - O(1) Map-based lookup                                      │
│    - Checks command names and aliases                           │
│    - Returns command descriptor or null                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. GUARD EXECUTION (if present)                                 │
│    if (descriptor.guard) {                                      │
│      const result = descriptor.guard(player, args, context)     │
│      if (!result.allowed) return error                          │
│    }                                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. COMMAND EXECUTION                                            │
│    descriptor.execute(player, args, context)                    │
│    - Access world state via context                             │
│    - Perform command logic                                      │
│    - Send messages to player                                    │
│    - Update game state (HP, position, inventory, etc.)          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. ERROR HANDLING (if exception)                                │
│    catch (err) {                                                │
│      logger.error(...)                                          │
│      player.send(error message)                                 │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── commands.js              # Main entry point: parseCommand(), registry setup
├── commands/
│   ├── registry.js          # Command registry (registerCommand, getCommand)
│   ├── utils.js             # Shared utilities (taunts, movePlayer, etc.)
│   ├── combat/
│   │   └── attack.js        # Combat-related commands
│   ├── core/
│   │   ├── quit.js          # Core game commands
│   │   ├── help.js
│   │   ├── who.js
│   │   ├── look.js
│   │   ├── score.js
│   │   ├── inventory.js
│   │   ├── get.js
│   │   ├── drop.js
│   │   ├── kick.js
│   │   ├── emote.js
│   │   ├── examine.js
│   │   ├── say.js
│   │   ├── describe.js
│   │   └── wumpcom.js
│   ├── movement/
│   │   └── movement.js      # Directional movement (n, s, e, w, u, d)
│   └── emotes/
│       └── emotes.js        # Social emote commands (bow, dance, etc.)
└── admin/
    ├── commands.js          # Admin command handlers
    └── chatBinding.js       # Admin command dispatcher
```

## Core Components

### 1. Command Registry (`commands/registry.js`)

**Purpose:** Central storage for all command definitions with O(1) lookup performance.

**Key Functions:**
- `registerCommand(descriptor)` - Register a new command with validation
- `getCommand(nameOrAlias)` - Look up a command by name or alias
- `getAllCommandNames()` - Get list of all registered commands
- `clearRegistry()` - Clear all commands (useful for testing)

**Data Structure:**
```javascript
// Internal storage
const commands = new Map();  // name -> descriptor
const aliases = new Map();   // alias -> command name

// Command descriptor structure
{
  name: 'attack',
  aliases: ['kill', 'k'],
  execute: function(player, args, context) { ... },
  guard: function(player, args, context) { ... },
  help: {
    description: 'Attack an NPC or player',
    usage: 'attack <target>',
    examples: ['attack goblin', 'kill wumpy']
  }
}
```

### 2. Command Dispatcher (`commands.js`)

**Purpose:** Parse user input, build context, and dispatch to registered commands.

**Key Function:**
```javascript
parseCommand(input, player, world, playerDB, allPlayers, activeInteractions, combatEngine, adminSystem)
```

**Responsibilities:**
1. Parse command input (split command/args)
2. Check for special cases (admin commands, "sorry" for wumpy)
3. Build context object for command execution
4. Look up command in registry
5. Execute guard if present
6. Execute command handler
7. Handle errors gracefully

**Context Object:**
```javascript
const context = {
  world,              // World object (rooms, NPCs, objects)
  playerDB,           // Player database for persistence
  allPlayers,         // Set of all connected players
  activeInteractions, // Map of active wumpy interactions
  combatEngine        // Combat system instance
};
```

### 3. Command Utilities (`commands/utils.js`)

**Purpose:** Shared helper functions used across multiple commands.

**Key Functions:**
- `findPlayerInRoom(targetName, room, world)` - Find player in current room
- `getEmoteMessages(emoteName, player, target)` - Get emote message strings
- `broadcastEmote(player, room, selfMsg, othersMsg, world)` - Send emote to room
- `checkAggressiveNPCs(player, world, combatEngine)` - Auto-initiate combat
- `movePlayer(player, direction, world, playerDB, allPlayers, combatEngine)` - Handle movement

**Exports:**
- `taunts` - Array of combat taunts
- `oppositeDirection` - Map for arrival messages
- `emoteDefinitions` - Definitions for all social emotes

### 4. Command Modules

Each command is a separate file exporting a descriptor object:

```javascript
// Example: commands/core/look.js
module.exports = {
  name: 'look',
  aliases: ['l'],
  execute: function(player, args, context) {
    const room = context.world.getRoom(player.currentRoom);
    // ... command logic
    player.send(formattedOutput);
  },
  help: {
    description: 'Look around the current room',
    usage: 'look',
    examples: ['look']
  }
};
```

## Guard Functions

Guards are optional functions that determine if a player can execute a command. They run before the command executes and can block execution with an error message.

**Guard Function Signature:**
```javascript
function guard(player, args, context) {
  return {
    allowed: true | false,
    reason: "Error message if not allowed"
  };
}
```

**Example Guard (from attack.js):**
```javascript
function requireAlive(player, args, context) {
  if (player.isGhost) {
    return {
      allowed: false,
      reason: 'You cannot attack while you are a ghost.'
    };
  }
  return { allowed: true };
}

module.exports = {
  name: 'attack',
  guard: requireAlive,
  execute: function(player, args, context) { ... }
};
```

**Potential Future Guards:**
- `requireInCombat` - Player must be in combat
- `requireNotInCombat` - Player must not be in combat
- `requireAdmin` - Player must have admin privileges
- `requireLevel(minLevel)` - Player must be at least level X
- `requireItem(itemId)` - Player must have specific item
- `requireRoom(roomId)` - Player must be in specific room

## Alias System

Commands can have multiple aliases that all resolve to the same handler.

**Example:**
```javascript
{
  name: 'attack',
  aliases: ['kill', 'k', 'at'],
  execute: attackHandler
}
```

All of these resolve to the same command:
- `attack goblin`
- `kill goblin`
- `k goblin`
- `at goblin`

**Conflict Detection:**
The registry prevents:
- Registering the same command name twice
- Registering an alias that conflicts with an existing command name
- Registering an alias that's already registered

## Adding a New Command

### Step 1: Create Command File

Create a new file in the appropriate subdirectory:
- `commands/combat/` - Combat-related commands
- `commands/core/` - Core game commands
- `commands/movement/` - Movement commands
- `commands/emotes/` - Social emotes

Example: `commands/core/rest.js`
```javascript
const colors = require('../../colors');

function execute(player, args, context) {
  if (player.hp === player.maxHp) {
    player.send('\n' + colors.hint('You are already at full health.\n'));
    return;
  }

  const healAmount = Math.floor(player.maxHp * 0.25);
  player.hp = Math.min(player.maxHp, player.hp + healAmount);
  context.playerDB.updatePlayer(player.username, { hp: player.hp });

  player.send('\n' + colors.success(`You rest and recover ${healAmount} HP.\n`));
}

function requireNotInCombat(player, args, context) {
  if (context.combatEngine && context.combatEngine.isInCombat(player)) {
    return {
      allowed: false,
      reason: 'You cannot rest while in combat!'
    };
  }
  return { allowed: true };
}

module.exports = {
  name: 'rest',
  aliases: ['r'],
  guard: requireNotInCombat,
  execute,
  help: {
    description: 'Rest to recover 25% of your HP',
    usage: 'rest',
    examples: ['rest']
  }
};
```

### Step 2: Register Command

In `commands.js`, import and register the command:

```javascript
const restCommand = require('./commands/core/rest');
registry.registerCommand(restCommand);
```

### Step 3: Write Tests

Add tests in `tests/` directory to cover:
- Command descriptor structure
- Guard behavior (if applicable)
- Successful execution
- Error cases (invalid arguments, etc.)
- Edge cases

### Step 4: Test and Verify

Run tests to ensure no regressions:
```bash
npm test
```

## Admin Commands

Admin commands follow a parallel structure but are registered separately:

**Location:** `src/admin/commands.js`
**Dispatcher:** `src/admin/chatBinding.js`

Admin commands are prefixed with `@` and bypass the main command registry:
- `@addlevel <player> <amount>`
- `@teleport <player> <room>`
- `@sethp <player> <amount>`

This separation maintains security and allows different permission models.

## Performance Characteristics

- **Command Lookup:** O(1) - Uses Map-based storage
- **Alias Resolution:** O(1) - Aliases map directly to command names
- **Guard Execution:** O(1) - Single function call per command
- **Registry Size:** 39 commands registered (as of Phase 3 completion)

## Error Handling

The system has three layers of error handling:

1. **Parse Level:** Unknown commands show helpful error with hint to type 'help'
2. **Guard Level:** Guard failures show specific reason from guard function
3. **Execution Level:** Exceptions in execute() are caught, logged, and show generic error

Example error flow:
```javascript
// Unknown command
"foobar" -> "Unknown command: foobar\nType 'help' for a list of commands."

// Guard failure
"attack goblin" (while ghost) -> "You cannot attack while you are a ghost."

// Execution error
"attack goblin" (exception) -> "An error occurred while processing that command."
```

## Testing Strategy

Each command should have tests covering:

1. **Descriptor Structure:** Validate name, execute function, help metadata
2. **Guard Behavior:** Test all guard conditions (pass and fail cases)
3. **Successful Execution:** Test happy path with valid inputs
4. **Error Cases:** Test with invalid arguments, missing targets, etc.
5. **Edge Cases:** Test boundary conditions, empty inputs, etc.

Example test structure:
```javascript
describe('rest command', () => {
  test('has correct descriptor structure', () => { ... });
  test('guard blocks players in combat', () => { ... });
  test('guard allows players not in combat', () => { ... });
  test('heals 25% of max HP', () => { ... });
  test('does not overheal past max HP', () => { ... });
  test('shows message when already at full health', () => { ... });
});
```

## Migration History

This architecture was implemented in 4 phases:

- **Phase 0:** Safety net (baseline tests)
- **Phase 1:** Infrastructure (registry, utils, context object)
- **Phase 2:** Combat commands (attack, kill)
- **Phase 3:** Complete migration (39 commands, legacy system removed)
- **Phase 4:** Cleanup & documentation (this document)

For detailed implementation notes, see `docs/refactor/COMMANDS_REFACTOR_JOURNAL.md`.

## Future Improvements

See `docs/refactor/FUTURE_IMPROVEMENTS.md` for planned enhancements:
- Additional guard functions
- Auto-generated help system from metadata
- Command categories/grouping
- Performance monitoring
- Unit test coverage for all commands
- Potential admin command integration

## References

- **Implementation:** `/src/commands/`
- **Tests:** `/tests/` (attackCommandTests.js, etc.)
- **Refactor Plan:** `/docs/COMMANDS_REFACTOR_PLAN.md`
- **Journal:** `/docs/refactor/COMMANDS_REFACTOR_JOURNAL.md`
- **Contributing:** `/AGENTS.md` (command system guide)
