# Repository Guidelines

## Project Structure & Module Organization
- Core gameplay logic lives in `src/`; `src/server.js` boots the Telnet server and wires combat, admin, and respawn systems.
- Domain modules are grouped by responsibility (`src/combat`, `src/admin`, `src/systems`, `src/utils`, `src/progression`), while data-driven assets are in `data/` and `world/`.
- **Commands** use a modular registry system in `src/commands/` with subdirectories for different domains (combat, core, movement, emotes). See Command System Guide below.
- Persistent player state defaults to `players.json`; avoid manual edits while the server is running.
- Automated and exploratory tests sit in `tests/`, and operational helpers (launch, smoke, migration scripts) are under `scripts/`.

## Build, Test, and Development Commands
- `npm install` — install Node dependencies before the first run.
- `npm start` — start the MUD server locally; logs stream to stdout and `server.log`.
- `npm test` — execute the full Node-based test harness via `tests/runAllTests.js`.
- `npm run test:combat` (or other targeted scripts) — focus on subsystem suites such as combat, modifiers, or dice rolls.
- `node scripts/demo.sh` and companions — smoke-test flows used by liveops; keep them updated when player flows change.

## Coding Style & Naming Conventions
- Write CommonJS modules with `module.exports`; prefer single-responsibility files under the existing directory scheme.
- Use 2-space indentation, single quotes for strings, and trailing commas only where syntactically required.
- Name exported classes/functions descriptively (`CombatEngine`, `createBanEnforcementHook`); helper utilities should follow `camelCase`.
- Keep logging consistent via `src/logger.js`; include context tags like `[combat]` for traceability.
- When adding assets, mirror existing JSON shape and snake_case keys in `data/` and `world/`.

## Testing Guidelines
- Unit and integration tests run as plain Node scripts; replicate existing patterns (`*.spec.js`, `test_*.js`) and guard side effects with mocks.
- New features must ship with at least one automated test under `tests/` that fails without the change.
- Use targeted scripts (`npm run test:integration`) before the full suite when iterating quickly, then finish with `npm test`.
- For manual verification, update or author shell harnesses in `scripts/` so regressions can be replayed.

## Commit & Pull Request Guidelines
- Follow the Conventional Commit style observed in history (`feat:`, `fix:`, `chore:`); keep scope narrow and imperative.
- Reference related tickets in commit bodies, and note balance-impacting changes explicitly.
- Pull requests should summarize intent, list verification steps (command output, affected scripts), and attach log excerpts or screenshots when UI/text changes.
- Ensure test scripts succeed (`npm test`) before requesting review, and call out any skipped suites with rationale.

---

## Command System Guide

### Overview

The MUD uses a modular, registry-based command system that separates command definitions from parsing and dispatch logic. Commands are organized by domain and registered centrally for O(1) lookup performance.

### Architecture

**Core Components:**
- `src/commands.js` - Main dispatcher: parseCommand() function and command registration
- `src/commands/registry.js` - Command registry with registerCommand() and getCommand()
- `src/commands/utils.js` - Shared utilities (movement, emotes, player lookup, etc.)
- `src/commands/<domain>/` - Modular command implementations organized by type

**Command Flow:**
1. User input → parseCommand() in commands.js
2. Registry lookup → registry.getCommand(commandName)
3. Guard execution (if present) → descriptor.guard()
4. Command execution → descriptor.execute(player, args, context)
5. Error handling → catch and log exceptions

For detailed architecture diagrams and flow charts, see `docs/COMMAND_SYSTEM_ARCHITECTURE.md`.

### Directory Structure

```
src/commands/
├── registry.js          # Central command registry
├── utils.js             # Shared helper functions
├── combat/
│   └── attack.js        # Combat commands (attack, kill)
├── core/
│   ├── quit.js          # Core game commands
│   ├── help.js
│   ├── look.js
│   ├── score.js
│   ├── inventory.js
│   ├── get.js
│   ├── drop.js
│   ├── kick.js
│   ├── emote.js
│   └── ...              # Other core commands
├── movement/
│   └── movement.js      # Directional movement (n, s, e, w, u, d)
└── emotes/
    └── emotes.js        # Social emotes (bow, dance, laugh, etc.)
```

### Adding a New Command

#### Step 1: Create Command File

Create a new file in the appropriate subdirectory:
- `commands/combat/` - Combat-related commands
- `commands/core/` - Core game commands (items, social, utility)
- `commands/movement/` - Navigation commands
- `commands/emotes/` - Social emote commands

Example (`commands/core/rest.js`):

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

// Optional guard function to prevent use in combat
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
  aliases: ['r'],              // Optional: alternate command names
  guard: requireNotInCombat,   // Optional: pre-execution check
  execute,
  help: {                      // Optional but recommended
    description: 'Rest to recover 25% of your HP',
    usage: 'rest',
    examples: ['rest']
  }
};
```

#### Step 2: Register Command

Add to `src/commands.js`:

```javascript
const restCommand = require('./commands/core/rest');
registry.registerCommand(restCommand);
```

Place registration in the appropriate section with similar commands (combat, core, movement, emotes).

#### Step 3: Write Tests

Create tests in `tests/` following existing patterns:

```javascript
// tests/restCommandTests.js
describe('rest command', () => {
  test('has correct descriptor structure', () => {
    expect(restCommand.name).toBe('rest');
    expect(typeof restCommand.execute).toBe('function');
  });

  test('guard blocks players in combat', () => {
    const result = restCommand.guard(playerInCombat, [], context);
    expect(result.allowed).toBe(false);
  });

  test('heals 25% of max HP', () => {
    player.hp = 50;
    player.maxHp = 100;
    restCommand.execute(player, [], context);
    expect(player.hp).toBe(75);
  });
});
```

#### Step 4: Test and Verify

```bash
npm test  # All tests should pass
```

### Command Descriptor Structure

Every command exports an object with:

**Required:**
- `name` (string) - Primary command name (lowercase)
- `execute` (function) - Command handler: `(player, args, context) => void`

**Optional:**
- `aliases` (array) - Alternate command names (e.g., ['k', 'kill'] for 'attack')
- `guard` (function) - Pre-execution check: `(player, args, context) => {allowed, reason}`
- `help` (object) - Help metadata: `{description, usage, examples}`

### Context Object

The context parameter passed to execute() and guard() contains:

```javascript
{
  world,              // World object (getRoom, getNPC, etc.)
  playerDB,           // Player database for persistence
  allPlayers,         // Set of all connected players
  activeInteractions, // Map of active wumpy interactions
  combatEngine        // Combat system instance
}
```

### Guard Functions

Guards determine if a player can execute a command. They run before execution and can block with an error message.

**Common Guard Patterns:**

```javascript
// Require player to be alive (not a ghost)
function requireAlive(player, args, context) {
  if (player.isGhost) {
    return { allowed: false, reason: 'You cannot do that while you are a ghost.' };
  }
  return { allowed: true };
}

// Require player to be in combat
function requireInCombat(player, args, context) {
  if (!context.combatEngine || !context.combatEngine.isInCombat(player)) {
    return { allowed: false, reason: 'You are not in combat.' };
  }
  return { allowed: true };
}

// Require minimum level
function requireLevel(minLevel) {
  return function(player, args, context) {
    if (player.level < minLevel) {
      return { allowed: false, reason: `You must be level ${minLevel} or higher.` };
    }
    return { allowed: true };
  };
}
```

### Aliases

Commands can have multiple names that all execute the same handler:

```javascript
{
  name: 'attack',
  aliases: ['kill', 'k', 'at'],
  execute: attackHandler
}
```

All of these work: `attack goblin`, `kill goblin`, `k goblin`, `at goblin`

The registry prevents conflicts:
- Command names must be unique
- Aliases cannot conflict with existing command names
- Aliases cannot be registered twice

### Shared Utilities (commands/utils.js)

Use shared helpers to avoid code duplication:

**Player Lookup:**
```javascript
const { findPlayerInRoom } = require('./commands/utils');
const target = findPlayerInRoom(targetName, room, context.world);
```

**Movement:**
```javascript
const { movePlayer } = require('./commands/utils');
movePlayer(player, 'north', context.world, context.playerDB, context.allPlayers, context.combatEngine);
```

**Emotes:**
```javascript
const { broadcastEmote, getEmoteMessages } = require('./commands/utils');
const { self, others } = getEmoteMessages('bow', player, targetPlayer);
broadcastEmote(player, room, self, others, context.world, context.allPlayers);
```

### Testing Requirements

New commands must include tests covering:

1. Descriptor structure validation
2. Guard behavior (if applicable) - both pass and fail cases
3. Successful execution with valid inputs
4. Error handling with invalid arguments
5. Edge cases (boundary conditions, empty inputs, etc.)

Follow existing patterns in `tests/attackCommandTests.js` and similar files.

### Admin Commands

Admin commands (prefixed with `@`) are registered separately in `src/admin/commands.js` and dispatched via `src/admin/chatBinding.js`. This maintains security separation and allows different permission models.

Admin commands do not use the main command registry but follow similar structural patterns.

### Performance Notes

- Command lookup is O(1) using Map-based storage
- Alias resolution is O(1) (aliases map directly to command names)
- Registry currently holds 39 commands (as of Phase 3 completion)
- No performance bottlenecks observed with current command count

### Further Reading

- **Architecture Details:** `docs/COMMAND_SYSTEM_ARCHITECTURE.md`
- **Implementation Guide:** `src/commands/README.md`
- **Refactor History:** `docs/refactor/COMMANDS_REFACTOR_JOURNAL.md`
- **Future Improvements:** `docs/refactor/FUTURE_IMPROVEMENTS.md`
