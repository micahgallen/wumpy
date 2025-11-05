# Emote System Documentation

## Overview

The emote system uses a modular, template-driven architecture where each emote is a self-contained module. This design makes it easy for content creators to add new emotes without touching shared utilities or understanding complex systems.

**Key Principles:**
- Each emote is one file with all its messages and behavior
- Generic helpers are separated from emote-specific content
- Factory pattern ensures consistency
- Registry enforces uniqueness

## File Structure

```
src/commands/emotes/
├── README.md            # This file
├── createEmote.js       # Factory function that builds command descriptors
├── emoteUtils.js        # Generic helpers (findPlayerInRoom, broadcastEmote)
├── registry.js          # Aggregates all emotes and checks for conflicts
├── applaud.js           # Individual emote modules
├── bow.js
├── dance.js
├── taunt.js
└── ... (all other emotes)
```

## Adding a New Emote

### Method 1: Using @createemote Command (Recommended)

As a Creator, Sheriff, or Admin, use the in-game command:

```
@createemote wave "Wave at someone"
```

This generates a template file at `src/commands/emotes/wave.js` with placeholder messages marked with `TODO:`.

**Then:**
1. Edit the generated file and replace all `TODO:` messages
2. Add the emote to `registry.js` (see "Registering Your Emote" below)
3. Restart the server

### Method 2: Manual Creation

Copy an existing emote file (e.g., `bow.js`) and modify it:

```bash
cp src/commands/emotes/bow.js src/commands/emotes/wave.js
# Edit wave.js
```

## Emote Structure

Every emote file follows this pattern:

```javascript
const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'wave',              // Command name (required)
  aliases: ['w'],            // Alternative names (optional)
  help: {                    // Help text (optional, defaults provided)
    description: 'Wave at someone',
    usage: 'wave [target]',
    examples: ['wave', 'wave Bob']
  },
  messages: {
    noTarget: {              // When emote has no target (required)
      self: '...',           // Message shown to player
      room: (player) => '...' // Message shown to others in room
    },
    withTarget: {            // When emote has a target (optional)
      self: (player, target) => '...',  // Message to player
      target: (player) => '...',        // Message to target
      room: (player, target) => '...'   // Message to others
    }
  },
  hooks: {                   // Lifecycle hooks (optional)
    beforeExecute: (player, args, context) => { },
    afterExecute: (player, args, context) => { }
  }
});
```

## Message Types

### Static Messages
Simple strings that don't change:

```javascript
messages: {
  noTarget: {
    self: 'You wave enthusiastically.',
    room: 'Someone waves.'  // ❌ BAD - doesn't show who!
  }
}
```

### Dynamic Messages (Recommended)
Functions that receive player/target objects:

```javascript
messages: {
  noTarget: {
    self: 'You wave enthusiastically.',
    room: (player) => `${player.username} waves enthusiastically.`
  },
  withTarget: {
    self: (player, target) => `You wave at ${target.username}.`,
    target: (player) => `${player.username} waves at you.`,
    room: (player, target) => `${player.username} waves at ${target.username}.`
  }
}
```

### When to Use Each

**noTarget.self:**
- Use static string if message doesn't need player info
- Example: `'You wave.'`

**noTarget.room:**
- ALWAYS use function to include `player.username`
- Example: `(player) => \`${player.username} waves.\``

**withTarget messages:**
- ALWAYS use functions - you need player and/or target info
- All three (self, target, room) must be present if withTarget exists

## Optional vs Required

### Required Fields
- `name` - string, lowercase
- `messages.noTarget` - object
- `messages.noTarget.self` - string or function
- `messages.noTarget.room` - string or function

### Optional Fields
- `aliases` - array of strings
- `help` - object (defaults provided)
- `messages.withTarget` - entire object
- `hooks` - object with beforeExecute/afterExecute

### When to Omit withTarget

Some emotes don't make sense with a target:

```javascript
// Taunt emote - no target version
messages: {
  noTarget: {
    self: (player) => `You taunt, "${getCurrentTaunt()}"`,
    room: (player) => `${player.username} taunts, "${getCurrentTaunt()}"`
  }
  // No withTarget - can't taunt AT someone
}
```

## Lifecycle Hooks

Hooks let you add custom behavior before or after the emote executes.

### beforeExecute
Called before the emote is performed:

```javascript
hooks: {
  beforeExecute: (player, args, context) => {
    // Validate something
    // Modify player state
    // Check conditions
  }
}
```

### afterExecute
Called after the emote broadcasts messages:

```javascript
hooks: {
  afterExecute: (player, args, context) => {
    // Update counters
    // Trigger effects
    // Cycle through states
  }
}
```

### Example: Taunt with State

The taunt emote uses `afterExecute` to cycle through taunts:

```javascript
// Taunt array lives in this file
const taunts = [
  'I fart in your general direction!',
  'Your mother was a hamster!',
  // ...
];

module.exports = createEmote({
  name: 'taunt',
  messages: {
    noTarget: {
      self: (player) => {
        const taunt = taunts[player.tauntIndex];
        return `You taunt, "${taunt}"`;
      },
      room: (player) => {
        const taunt = taunts[player.tauntIndex];
        return `${player.username} taunts, "${taunt}"`;
      }
    }
  },
  hooks: {
    afterExecute: (player) => {
      // Cycle to next taunt
      player.tauntIndex = (player.tauntIndex + 1) % taunts.length;
    }
  }
});
```

## Registering Your Emote

After creating your emote file, add it to `registry.js`:

```javascript
// Import your emote
const wave = require('./wave');

// Add to the array
const emoteDescriptors = [
  applaud,
  bow,
  // ... existing emotes ...
  wave  // Add here
];
```

The registry automatically checks for naming conflicts when the server starts.

## Examples

### Simple Emote (No Target)

```javascript
const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'yawn',
  help: {
    description: 'Yawn tiredly',
    usage: 'yawn',
    examples: ['yawn']
  },
  messages: {
    noTarget: {
      self: 'You yawn widely, covering your mouth.',
      room: (player) => `${player.username} yawns widely, covering their mouth.`
    }
  }
});
```

### Emote with Target

```javascript
const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'hug',
  help: {
    description: 'Hug someone warmly',
    usage: 'hug [target]',
    examples: ['hug', 'hug Elmo']
  },
  messages: {
    noTarget: {
      self: 'You hug yourself. That\'s... sad.',
      room: (player) => `${player.username} hugs themselves. Aww.`
    },
    withTarget: {
      self: (player, target) => `You hug ${target.username} warmly.`,
      target: (player) => `${player.username} hugs you warmly.`,
      room: (player, target) => `${player.username} hugs ${target.username} warmly.`
    }
  }
});
```

### Emote with Aliases

```javascript
const createEmote = require('./createEmote');

module.exports = createEmote({
  name: 'laugh',
  aliases: ['lol', 'lmao'],  // Can use: laugh, lol, or lmao
  help: {
    description: 'Laugh heartily',
    usage: 'laugh [target]',
    examples: ['laugh', 'lol', 'laugh Bob']
  },
  messages: {
    noTarget: {
      self: 'You laugh heartily.',
      room: (player) => `${player.username} laughs heartily.`
    },
    withTarget: {
      self: (player, target) => `You laugh at ${target.username}.`,
      target: (player) => `${player.username} laughs at you.`,
      room: (player, target) => `${player.username} laughs at ${target.username}.`
    }
  }
});
```

### Complex Emote with State

```javascript
const createEmote = require('./createEmote');

// State data lives in this file
const poses = ['dramatically', 'heroically', 'mysteriously', 'awkwardly'];

module.exports = createEmote({
  name: 'pose',
  help: {
    description: 'Strike a random pose',
    usage: 'pose',
    examples: ['pose']
  },
  messages: {
    noTarget: {
      self: (player) => {
        const style = poses[Math.floor(Math.random() * poses.length)];
        return `You pose ${style}.`;
      },
      room: (player) => {
        const style = poses[Math.floor(Math.random() * poses.length)];
        return `${player.username} poses ${style}.`;
      }
    }
  }
});
```

## Best Practices

### Message Writing

1. **Be consistent with tone** - Match the humorous, nostalgic tone of existing emotes
2. **Use player.username, not 'you'** in room messages
3. **Keep messages concise** - 1-2 sentences max
4. **Use proper punctuation** - End with periods
5. **Avoid explicit content** - Keep it PG-13

### Code Style

1. **Use single quotes** for strings: `'like this'`
2. **Use template literals** for interpolation: `` `${player.username} waves.` ``
3. **Two-space indentation**
4. **Add file header comment** with emote name and description
5. **Export immediately** - no intermediate variables

### Testing

Before committing:

```bash
# Test that emote loads
node -e "require('./src/commands/emotes/yourEmote')"

# Test command system
node -e "require('./src/commands.js'); console.log('OK')"

# Run full test suite
npm test
```

## Troubleshooting

### Error: "Emote must have a name"
You forgot the `name` field or passed a non-string.

### Error: "must have messages.noTarget"
You forgot the `messages.noTarget` object.

### Error: "noTarget messages must have 'self' and 'room'"
Your `messages.noTarget` is missing either `self` or `room`.

### Error: "Duplicate emote name detected"
Another emote already uses that name or alias. Check `registry.js`.

### Emote doesn't appear in game
Did you add it to `registry.js` and restart the server?

### Messages show [object Object]
You're returning an object instead of a string. Make sure message functions return strings, not objects.

## Architecture Details

### createEmote Factory

The `createEmote.js` factory:
1. Validates required fields
2. Provides sensible defaults
3. Returns a command descriptor with `execute()` function
4. Handles target resolution and error messages
5. Broadcasts messages via shared helpers
6. Calls lifecycle hooks at appropriate times

### emoteUtils Helpers

Two generic helpers used by all emotes:

**findPlayerInRoom(playerName, player, allPlayers)**
- Case-insensitive search
- Only finds players in same room
- Returns player object or null

**broadcastEmote(player, target, allPlayers, selfMsg, targetMsg, roomMsg)**
- Sends correct message to each player
- Handles both target and no-target cases
- Applies emote color styling

### Registry

The `registry.js` file:
- Imports all emote modules
- Exports array of descriptors
- Runs conflict detection on load
- Throws error if duplicates found

## Related Documentation

- **Command System**: `src/commands/README.md`
- **Admin Commands**: `docs/admin/COMMANDS.md`
- **Refactor Plan**: `docs/refactor/EMOTE_SYSTEM_REFACTOR_PLAN.md`
- **Tests**: `tests/test_emote_system.js`

## Support

For questions or issues:
1. Check this README
2. Look at existing emote files as examples
3. Review `createEmote.js` for JSDoc documentation
4. Run tests to verify your emote works
5. Ask in the development channel

---

**Last Updated**: November 2025
**Version**: 2.0 (Modular Architecture)
