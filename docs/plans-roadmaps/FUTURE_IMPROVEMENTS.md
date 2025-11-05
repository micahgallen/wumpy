# Command System - Future Improvements

This document tracks potential enhancements to the command system that were identified during or after the Phase 1-4 refactor but are not critical to immediate functionality.

## Priority 1 - High Impact

### 1. Shared Guard Function Library

**Status:** Not Started
**Effort:** 2-3 hours
**Impact:** High - DRY principle, consistency

**Description:**
Create a library of reusable guard functions in `src/commands/guards.js` that can be imported and used across commands.

**Proposed Guards:**
- `requireAlive(player, args, context)` - Player must not be a ghost
- `requireInCombat(player, args, context)` - Player must be in combat
- `requireNotInCombat(player, args, context)` - Player must not be in combat
- `requireAdmin(player, args, context)` - Player must have admin privileges
- `requireLevel(minLevel)` - Player must be at least level X
- `requireItem(itemId)` - Player must have specific item in inventory
- `requireRoom(roomId)` - Player must be in specific room
- `requireNotGhost(player, args, context)` - Alias for requireAlive
- `requireTarget(player, args, context)` - Command must have a target argument

**Example Implementation:**

```javascript
// src/commands/guards.js
function requireAlive(player, args, context) {
  if (player.isGhost) {
    return {
      allowed: false,
      reason: 'You cannot do that while you are a ghost.'
    };
  }
  return { allowed: true };
}

function requireNotInCombat(player, args, context) {
  if (context.combatEngine && context.combatEngine.isInCombat(player)) {
    return {
      allowed: false,
      reason: 'You cannot do that while in combat!'
    };
  }
  return { allowed: true };
}

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

module.exports = {
  requireAlive,
  requireNotInCombat,
  requireInCombat,
  requireAdmin,
  requireLevel,
  requireItem,
  requireRoom,
  requireTarget
};
```

**Usage:**

```javascript
// src/commands/core/rest.js
const { requireNotInCombat, requireAlive } = require('../guards');

module.exports = {
  name: 'rest',
  guard: (player, args, context) => {
    // Chain multiple guards
    const aliveCheck = requireAlive(player, args, context);
    if (!aliveCheck.allowed) return aliveCheck;

    return requireNotInCombat(player, args, context);
  },
  execute: restHandler
};
```

**Benefits:**
- Consistent guard behavior across commands
- Easy to add new guards
- Testable in isolation
- Reduces code duplication

---

### 2. Auto-Generated Help System

**Status:** Not Started
**Effort:** 4-6 hours
**Impact:** High - Better UX, maintainability

**Description:**
Enhance the help command to auto-generate command lists and detailed help from command metadata.

**Features:**
- `help` - List all commands grouped by category
- `help <command>` - Show detailed help for specific command
- `help <category>` - Show commands in category (combat, core, movement, emotes)
- Auto-generate from `descriptor.help` metadata
- Include aliases in help output

**Proposed Help Metadata Extension:**

```javascript
{
  name: 'attack',
  help: {
    description: 'Attack an NPC or player to initiate combat',
    usage: 'attack <target>',
    examples: ['attack goblin', 'kill wumpy', 'k grift'],
    category: 'combat',  // NEW: for grouping
    aliases: ['kill', 'k']  // NEW: shown in help
  }
}
```

**Help Command Output Examples:**

```
> help
Available Commands:
  Combat: attack, flee, defend
  Core: look, score, inventory, get, drop, kick, emote, say, quit
  Movement: north, south, east, west, up, down
  Social: bow, dance, laugh, cheer, cry, flex, grin, kiss

Type 'help <command>' for detailed help on a specific command.
Type 'help <category>' to see commands in that category.

> help attack
Command: attack (aliases: kill, k)
Description: Attack an NPC or player to initiate combat
Usage: attack <target>
Examples:
  attack goblin
  kill wumpy
  k grift

> help combat
Combat Commands:
  attack (kill, k) - Attack an NPC or player
  flee - Attempt to escape from combat
  defend - Take a defensive stance
```

**Implementation Notes:**
- Extend registry to support category metadata
- Update all commands to include category in help
- Modify help command to query registry and format output
- Support substring matching for command names

---

### 3. Command Performance Monitoring

**Status:** Not Started
**Effort:** 2-3 hours
**Impact:** Medium - Observability

**Description:**
Add optional performance monitoring to track command execution time and identify bottlenecks.

**Features:**
- Track command execution time
- Log slow commands (>100ms threshold)
- Collect statistics (min/max/avg execution time)
- Optional profiling mode for development

**Implementation:**

```javascript
// In parseCommand() function
const startTime = Date.now();
try {
  registeredCommand.execute(player, args, context);
  const executionTime = Date.now() - startTime;

  if (executionTime > 100) {
    logger.warn(`Slow command: ${commandName} took ${executionTime}ms`);
  }

  // Optional: track stats
  if (config.enableCommandStats) {
    commandStats.record(commandName, executionTime);
  }
} catch (err) {
  // ... error handling
}
```

**Benefits:**
- Identify performance bottlenecks
- Track system health
- Optimize slow commands

---

## Priority 2 - Medium Impact

### 4. Command Alias Improvements

**Status:** Not Started
**Effort:** 2-3 hours
**Impact:** Medium - UX

**Enhancements:**
- Support dynamic alias registration (add aliases at runtime)
- Allow per-player custom aliases (e.g., `/alias gg get`)
- Alias expansion in help text
- Alias suggestion on typos (did you mean 'attack'?)

**Implementation Ideas:**

```javascript
// Per-player aliases stored in player object
player.customAliases = {
  'gg': 'get',
  'dd': 'drop',
  'aa': 'attack'
};

// In parseCommand, check custom aliases first
let commandName = parts[0].toLowerCase();
if (player.customAliases && player.customAliases[commandName]) {
  commandName = player.customAliases[commandName];
}
```

---

### 5. Unit Test Coverage for All Commands

**Status:** Partial (attack command has tests)
**Effort:** 8-12 hours
**Impact:** Medium - Code quality

**Description:**
Add comprehensive unit tests for every command following the pattern established in attackCommandTests.js.

**Current Coverage:**
- Combat: attack command (16 tests)
- Core: None
- Movement: None
- Emotes: None

**Target:**
- 100% command coverage
- All guard functions tested
- All error paths tested
- Edge cases covered

**Test Template:**

```javascript
describe('<command> command', () => {
  test('has correct descriptor structure', () => { ... });
  test('guard allows valid usage', () => { ... });
  test('guard blocks invalid usage', () => { ... });
  test('executes successfully with valid input', () => { ... });
  test('handles missing arguments', () => { ... });
  test('handles invalid target', () => { ... });
  test('aliases are registered', () => { ... });
});
```

---

### 6. Admin Command Integration

**Status:** Not Started
**Effort:** 4-6 hours
**Impact:** Medium - Consistency

**Description:**
Consider integrating admin commands into the main registry system while maintaining security separation.

**Approach 1: Separate Registry**
- Create `src/admin/registry.js` mirroring command registry
- Use same descriptor structure
- Maintain separate dispatch in chatBinding.js

**Approach 2: Single Registry with Permissions**
- Add `requiresAdmin: true` flag to command descriptors
- Check permissions in parseCommand before execution
- Move admin commands to `src/commands/admin/`

**Security Considerations:**
- Admin commands must have strict permission checks
- No accidental exposure of admin functions
- Audit logging for admin command usage
- Rate limiting for sensitive commands

**Decision Point:**
Defer to next major refactor. Current separation is acceptable for now.

---

## Priority 3 - Nice to Have

### 7. Command Cooldowns

**Status:** Not Started
**Effort:** 3-4 hours
**Impact:** Low - Gameplay balance

**Description:**
Add cooldown support to prevent command spam.

**Implementation:**

```javascript
// In command descriptor
{
  name: 'shout',
  cooldown: 5000, // 5 seconds in ms
  execute: shoutHandler
}

// Track cooldowns per player
player.commandCooldowns = new Map(); // commandName -> expiryTime

// In parseCommand before execution
if (descriptor.cooldown) {
  const now = Date.now();
  const cooldownExpiry = player.commandCooldowns.get(commandName) || 0;

  if (now < cooldownExpiry) {
    const remaining = Math.ceil((cooldownExpiry - now) / 1000);
    player.send(`\nYou must wait ${remaining} seconds before using that command again.\n`);
    return;
  }

  player.commandCooldowns.set(commandName, now + descriptor.cooldown);
}
```

---

### 8. Command History and Recall

**Status:** Not Started
**Effort:** 2-3 hours
**Impact:** Low - UX convenience

**Description:**
Allow players to recall previous commands with arrow keys or `!!` syntax.

**Features:**
- Store last N commands per player
- `!!` - Repeat last command
- `!<number>` - Repeat command N from history
- Arrow key support (requires telnet negotiation)

---

### 9. Command Macros

**Status:** Not Started
**Effort:** 4-6 hours
**Impact:** Low - Power user feature

**Description:**
Allow players to define multi-command macros.

**Example:**

```
> /macro combat attack goblin; cast shield; flee
Macro 'combat' created.

> /combat
> attack goblin
> cast shield
> flee
```

**Implementation:**
- Store macros in player object
- Parse macro definition and store as command array
- Execute commands sequentially on macro invocation
- Macro-specific commands: `/macro`, `/macros`, `/delmacro`

---

### 10. Command Queue System

**Status:** Not Started
**Effort:** 6-8 hours
**Impact:** Low - Advanced feature

**Description:**
Allow players to queue multiple commands that execute with delays.

**Use Case:**
Combat rotations, crafting sequences, automated actions.

**Example:**

```
> /queue attack goblin; wait 2; attack goblin; wait 2; flee
Queued 5 commands. Execute with /go or /abort to cancel.

> /go
Executing queued commands...
```

**Considerations:**
- Prevent abuse (rate limits, max queue size)
- Combat interruptions should clear queue
- Visibility of queue status

---

## Completed Improvements

### Command Registry System
**Completed:** Phase 1
- Centralized command registration
- O(1) lookup performance
- Alias support
- Guard functions

### Modular Command Structure
**Completed:** Phases 2-3
- Domain-based organization (combat, core, movement, emotes)
- 39 commands migrated
- Legacy system removed
- 86% code reduction in commands.js

### Command Testing Framework
**Completed:** Phase 2
- Test pattern established
- 16 attack command tests
- Integration with existing test suite

---

## Implementation Priority

**Immediate (Next Sprint):**
1. Shared Guard Function Library - Blocks other work
2. Auto-Generated Help System - High user value

**Short Term (1-2 Sprints):**
3. Command Performance Monitoring - Observability
4. Unit Test Coverage - Code quality

**Medium Term (3-6 months):**
5. Command Alias Improvements - UX enhancement
6. Admin Command Integration - Architectural consistency

**Long Term (Future):**
7-10. Cooldowns, History, Macros, Queue - Nice-to-have features

---

## Notes

- All improvements should maintain backward compatibility
- New features require comprehensive tests
- Documentation must be updated alongside changes
- Performance impact should be measured before and after
- Security implications must be reviewed for admin-related changes

---

## Tracking

Update this document as improvements are implemented. Move completed items to the "Completed Improvements" section with completion date.

**Last Updated:** 2025-11-04 (Phase 4 completion)
