# Command System

This directory contains the modular command system for the MUD. Commands are organized by domain and registered centrally for efficient lookup and dispatch.

## Quick Start

### Adding a New Command

1. Create a new file in the appropriate subdirectory
2. Export a command descriptor with `name`, `execute`, and optional `aliases`, `guard`, `help`
3. Register the command in `../commands.js`
4. Write tests in `../../tests/`
5. Run `npm test` to verify

Example:

```javascript
// commands/core/rest.js
const colors = require('../../colors');

function execute(player, args, context) {
  // Command logic here
  player.send('\n' + colors.success('You rest and recover.\n'));
}

module.exports = {
  name: 'rest',
  aliases: ['r'],
  execute,
  help: {
    description: 'Rest to recover HP',
    usage: 'rest',
    examples: ['rest']
  }
};
```

Then in `../commands.js`:

```javascript
const restCommand = require('./commands/core/rest');
registry.registerCommand(restCommand);
```

## Directory Structure

```
commands/
├── registry.js          # Command registry (registerCommand, getCommand)
├── utils.js             # Shared utilities (movement, emotes, player lookup)
├── combat/
│   └── attack.js        # Combat-related commands
├── core/
│   ├── quit.js          # Core game commands
│   ├── help.js
│   ├── who.js
│   ├── look.js
│   ├── score.js
│   ├── inventory.js
│   ├── get.js
│   ├── drop.js
│   ├── kick.js
│   ├── emote.js
│   ├── examine.js
│   ├── say.js
│   ├── describe.js
│   └── wumpcom.js
├── movement/
│   └── movement.js      # Directional commands (north, south, etc.)
└── emotes/
    └── emotes.js        # Social emote commands (bow, dance, etc.)
```

## Registry API (`registry.js`)

### `registerCommand(descriptor)`

Register a new command with validation and conflict detection.

**Descriptor Structure:**

```javascript
{
  name: 'commandname',           // Required: primary command name (lowercase)
  aliases: ['alias1', 'alias2'], // Optional: alternate names
  execute: function(player, args, context) { ... }, // Required: handler
  guard: function(player, args, context) { ... },   // Optional: pre-check
  help: {                        // Optional but recommended
    description: 'What the command does',
    usage: 'commandname <args>',
    examples: ['example1', 'example2']
  }
}
```

**Validation:**
- Throws if `name` or `execute` is missing
- Throws if command name is already registered
- Throws if any alias conflicts with existing command or alias

**Example:**

```javascript
const registry = require('./registry');

registry.registerCommand({
  name: 'rest',
  aliases: ['r'],
  execute: restHandler,
  help: { description: 'Rest to recover HP', usage: 'rest', examples: ['rest'] }
});
```

### `getCommand(nameOrAlias)`

Look up a command by name or alias. Returns descriptor or null.

**Parameters:**
- `nameOrAlias` (string) - Command name or alias (case-insensitive)

**Returns:**
- Command descriptor object if found
- `null` if not found

**Performance:** O(1) - Uses Map-based lookup

**Example:**

```javascript
const command = registry.getCommand('attack');
if (command) {
  command.execute(player, ['goblin'], context);
}

const aliasedCommand = registry.getCommand('k'); // Resolves to 'attack'
```

### `getAllCommandNames()`

Get array of all registered command names (primary names only, not aliases).

**Returns:** Array of strings

**Example:**

```javascript
const allCommands = registry.getAllCommandNames();
// ['attack', 'look', 'score', 'north', 'bow', ...]
```

### `clearRegistry()`

Clear all registered commands. Useful for testing.

**Example:**

```javascript
afterEach(() => {
  registry.clearRegistry();
});
```

## Utils API (`utils.js`)

### Player and Target Functions

#### `findPlayerInRoom(targetName, room, world, allPlayers = null)`

Find a player by name in the current room.

**Parameters:**
- `targetName` (string) - Name or partial name to search for
- `room` (object) - Room object with potential NPCs
- `world` (object) - World instance
- `allPlayers` (Set) - Optional set of all connected players

**Returns:**
- Player object if found in room
- `null` if not found

**Example:**

```javascript
const { findPlayerInRoom } = require('./utils');
const target = findPlayerInRoom('bob', room, context.world, context.allPlayers);
if (target) {
  player.send(`You found ${target.username}!\n`);
}
```

### Movement Functions

#### `movePlayer(player, direction, world, playerDB, allPlayers, combatEngine)`

Move a player in a direction with full room transition handling.

**Parameters:**
- `player` (object) - Player to move
- `direction` (string) - Direction name ('north', 'south', etc.)
- `world` (object) - World instance
- `playerDB` (object) - Player database for persistence
- `allPlayers` (Set) - All connected players for broadcasts
- `combatEngine` (object) - Combat engine for aggressive NPC checks

**Side Effects:**
- Updates player.currentRoom
- Persists room change to database
- Broadcasts leave/arrive messages to other players in both rooms
- Shows new room description to moving player
- Checks for aggressive NPCs in destination room

**Example:**

```javascript
const { movePlayer } = require('./utils');
movePlayer(player, 'north', context.world, context.playerDB, context.allPlayers, context.combatEngine);
```

### Emote Functions

#### `getEmoteMessages(emoteName, player, target = null)`

Get formatted emote messages for self and others.

**Parameters:**
- `emoteName` (string) - Name of emote (must exist in emoteDefinitions)
- `player` (object) - Player performing emote
- `target` (object) - Optional target player

**Returns:**
```javascript
{
  self: "formatted message for player",
  others: "formatted message for room",
  target: "formatted message for target (if applicable)"
}
```

**Example:**

```javascript
const { getEmoteMessages } = require('./utils');
const messages = getEmoteMessages('bow', player, targetPlayer);
player.send('\n' + messages.self + '\n');
targetPlayer.send('\n' + messages.target + '\n');
// Broadcast messages.others to others in room
```

#### `broadcastEmote(player, room, selfMsg, othersMsg, world, allPlayers = null)`

Send emote messages to player and others in room.

**Parameters:**
- `player` (object) - Player performing emote
- `room` (object) - Current room
- `selfMsg` (string) - Message to send to player
- `othersMsg` (string) - Message to broadcast to others
- `world` (object) - World instance
- `allPlayers` (Set) - Optional set of all connected players

**Example:**

```javascript
const { broadcastEmote } = require('./utils');
broadcastEmote(player, room, 'You bow gracefully.',
  `${player.username} bows gracefully.`, context.world, context.allPlayers);
```

### Combat Functions

#### `checkAggressiveNPCs(player, world, combatEngine)`

Check for aggressive NPCs in player's room and initiate combat if found.

**Parameters:**
- `player` (object) - Player to check
- `world` (object) - World instance
- `combatEngine` (object) - Combat engine instance

**Side Effects:**
- Initiates combat if aggressive NPC found and player not already in combat
- Only triggers combat with first aggressive NPC found

**Example:**

```javascript
const { checkAggressiveNPCs } = require('./utils');
// After player moves to new room
checkAggressiveNPCs(player, context.world, context.combatEngine);
```

### Data Exports

#### `taunts`

Array of combat taunt strings used in attack messages.

**Type:** Array of strings

**Example:**

```javascript
const { taunts } = require('./utils');
const randomTaunt = taunts[Math.floor(Math.random() * taunts.length)];
```

#### `oppositeDirection`

Map of directions to their opposites (for arrival messages).

**Type:** Object

**Example:**

```javascript
const { oppositeDirection } = require('./utils');
console.log(oppositeDirection['north']); // 'the south'
console.log(oppositeDirection['up']); // 'below'
```

#### `emoteDefinitions`

Object containing all social emote definitions with self/others/target messages.

**Type:** Object with structure:
```javascript
{
  emoteName: {
    self: "message for performer",
    others: "message for room",
    target: "message for target (optional)"
  }
}
```

**Example:**

```javascript
const { emoteDefinitions } = require('./utils');
const bowEmote = emoteDefinitions['bow'];
console.log(bowEmote.self); // "You bow gracefully."
```

## Context Object

Commands receive a context object with access to all game systems:

```javascript
const context = {
  world,              // World instance (getRoom, getNPC, etc.)
  playerDB,           // Player database (updatePlayer, etc.)
  allPlayers,         // Set of all connected player objects
  activeInteractions, // Map of active wumpy interactions
  combatEngine        // Combat system (initiateCombat, isInCombat, etc.)
};
```

**Usage in Commands:**

```javascript
function execute(player, args, context) {
  const room = context.world.getRoom(player.currentRoom);
  const isInCombat = context.combatEngine.isInCombat(player);
  context.playerDB.updatePlayer(player.username, { hp: newHp });
}
```

## Guard Functions

Guards are optional pre-execution checks that can block command usage.

**Function Signature:**

```javascript
function guardName(player, args, context) {
  if (condition_not_met) {
    return {
      allowed: false,
      reason: 'Error message explaining why command is blocked'
    };
  }
  return { allowed: true };
}
```

**Common Patterns:**

### Require Player Alive

```javascript
function requireAlive(player, args, context) {
  if (player.isGhost) {
    return {
      allowed: false,
      reason: 'You cannot do that while you are a ghost.'
    };
  }
  return { allowed: true };
}
```

### Require In Combat

```javascript
function requireInCombat(player, args, context) {
  if (!context.combatEngine || !context.combatEngine.isInCombat(player)) {
    return {
      allowed: false,
      reason: 'You are not in combat.'
    };
  }
  return { allowed: true };
}
```

### Require Not In Combat

```javascript
function requireNotInCombat(player, args, context) {
  if (context.combatEngine && context.combatEngine.isInCombat(player)) {
    return {
      allowed: false,
      reason: 'You cannot do that while in combat!'
    };
  }
  return { allowed: true };
}
```

### Require Minimum Level

```javascript
function requireLevel(minLevel) {
  return function(player, args, context) {
    if (player.level < minLevel) {
      return {
        allowed: false,
        reason: `You must be level ${minLevel} or higher.`
      };
    }
    return { allowed: true };
  };
}
```

## Alias System

Commands can have multiple names that resolve to the same handler.

**Example:**

```javascript
{
  name: 'attack',
  aliases: ['kill', 'k', 'at']
}
```

All variations execute the same command:
- `attack goblin`
- `kill goblin`
- `k goblin`
- `at goblin`

**Conflict Prevention:**

The registry throws errors if:
- A command name is already registered
- An alias conflicts with an existing command name
- An alias is already registered

This ensures unambiguous command resolution.

## Testing Commands

### Test File Structure

Create a test file in `../../tests/` following this pattern:

```javascript
// tests/myCommandTests.js
const myCommand = require('../src/commands/core/myCommand');

describe('myCommand command', () => {
  let player, context;

  beforeEach(() => {
    // Set up test fixtures
    player = { username: 'testPlayer', hp: 100, maxHp: 100 };
    context = { world: mockWorld, playerDB: mockDB };
  });

  test('has correct descriptor structure', () => {
    expect(myCommand.name).toBe('mycommand');
    expect(typeof myCommand.execute).toBe('function');
    if (myCommand.help) {
      expect(myCommand.help.description).toBeTruthy();
    }
  });

  test('guard allows valid usage', () => {
    if (myCommand.guard) {
      const result = myCommand.guard(player, [], context);
      expect(result.allowed).toBe(true);
    }
  });

  test('executes successfully with valid input', () => {
    const messages = [];
    player.send = (msg) => messages.push(msg);

    myCommand.execute(player, ['arg'], context);

    expect(messages.length).toBeGreaterThan(0);
  });

  test('handles invalid input gracefully', () => {
    // Test error cases
  });
});
```

### Test Coverage Requirements

Every command should have tests for:

1. **Descriptor validation** - name, execute function, help metadata
2. **Guard behavior** (if present) - both allowed and blocked cases
3. **Successful execution** - happy path with valid inputs
4. **Error handling** - invalid arguments, missing targets, etc.
5. **Edge cases** - boundary conditions, empty inputs, special states

Run tests with:

```bash
npm test                 # All tests
npm run test:integration # Integration tests only
```

## Command Categories

### Combat Commands (`combat/`)

Commands related to combat mechanics.

**Current:**
- `attack` / `kill` - Initiate combat with a target

**Future:**
- `flee` - Attempt to escape combat
- `defend` - Take defensive stance
- `cast` - Cast a spell

### Core Commands (`core/`)

Essential game commands for interaction, inventory, and information.

**Current:**
- `quit` - Exit the game
- `help` - Show available commands
- `who` - List online players
- `look` / `l` - Examine current room
- `score` - Show character stats
- `inventory` / `i` - List carried items
- `get` - Pick up an item
- `drop` - Drop an item
- `kick` - Kick a wumpy (signature feature!)
- `emote` - Custom emote with text
- `examine` / `x` - Look at object/NPC in detail
- `say` / `'` - Speak in room
- `describe` - Set self-description
- `wumpcom` - Communicate with wumpy interactions

**Future:**
- `rest` - Recover HP out of combat
- `use` - Use an item
- `give` - Give item to player/NPC
- `open` / `close` - Interact with containers
- `read` - Read signs, books, etc.

### Movement Commands (`movement/`)

Directional navigation commands.

**Current:**
- `north` / `n` - Move north
- `south` / `s` - Move south
- `east` / `e` - Move east
- `west` / `w` - Move west
- `up` / `u` - Move up
- `down` / `d` - Move down

### Emote Commands (`emotes/`)

Social emote commands for roleplaying and interaction.

**Current:**
- `applaud`, `bow`, `cackle`, `cheer`, `chuckle`, `cry`
- `dance`, `fart`, `flex`, `giggle`, `groan`, `growl`
- `hiccup`, `grin`, `kiss`, `pinch`, `tip`, `taunt`

All emotes support optional target syntax: `bow` or `bow alice`

## Performance

- **Command lookup:** O(1) via Map
- **Alias resolution:** O(1) via Map
- **Registration time:** O(n) where n = number of aliases
- **Current registry size:** 39 commands
- **Memory footprint:** Negligible (< 1KB for registry)

## Admin Commands

Admin commands (prefixed with `@`) are handled separately:

**Location:** `../admin/commands.js`
**Dispatcher:** `../admin/chatBinding.js`

Admin commands do not use this registry system. They have their own permission checks and dispatch logic to maintain security separation.

## Further Reading

- **Architecture Overview:** `/docs/COMMAND_SYSTEM_ARCHITECTURE.md`
- **Contributor Guide:** `/AGENTS.md` (Command System Guide section)
- **Refactor History:** `/docs/refactor/COMMANDS_REFACTOR_JOURNAL.md`
- **Future Plans:** `/docs/refactor/FUTURE_IMPROVEMENTS.md`
- **Main Dispatcher:** `../commands.js` (parseCommand function)

## Migration Notes

This modular system replaced a monolithic command structure in commands.js (1387 lines → 195 lines, 86% reduction). All legacy commands have been migrated as of Phase 3 completion. For historical context, see the refactor journal.
