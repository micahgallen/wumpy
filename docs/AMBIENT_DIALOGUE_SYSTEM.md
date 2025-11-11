# Ambient Dialogue System

## Overview

The Ambient Dialogue System automatically makes NPCs speak their dialogue lines at randomized intervals, creating a more immersive and living world. NPCs will periodically say one of their dialogue lines to all players in the same room.

## Features

- **Automatic Dialogue**: NPCs speak every 30-60 seconds (randomized interval)
- **Random Selection**: Each NPC picks a random line from their dialogue array
- **Smart Broadcasting**: Only broadcasts when players are present in the room
- **Performance Optimized**: Individual timers per NPC, no polling
- **Clean Shutdown**: All timers are properly cleaned up on server shutdown

## Architecture

### Core Components

**Location**: `/home/micah/wumpy/src/systems/ambient/AmbientDialogueManager.js`

The `AmbientDialogueManager` is a singleton that manages ambient dialogue for all NPCs:

- **Timer-based**: Each NPC gets its own randomized timer (30-60 seconds)
- **Event-driven**: No polling, minimal CPU overhead
- **Room-aware**: Only speaks when players are present
- **NPC-aware**: Handles dead NPCs gracefully

### Integration Points

1. **ServerBootstrap** (`/home/micah/wumpy/src/server/ServerBootstrap.js`)
   - Initializes during Phase 6 of server startup
   - Starts after world and players are loaded
   - Automatically starts timers for all NPCs with dialogue

2. **ShutdownHandler** (`/home/micah/wumpy/src/server/ShutdownHandler.js`)
   - Stops all timers during graceful shutdown
   - Prevents memory leaks and zombie timers

## NPC Dialogue Configuration

NPCs must have a `dialogue` property in their JSON definition:

```json
{
  "id": "bert_fire_safety",
  "name": "Bert (Fire Safety Officer)",
  "dialogue": [
    "FORTY candles, Ernie. FORTY. That's not a birthday cake, that's a fire code violation with frosting!",
    "I've already filled out three incident reports and he hasn't even blown them out yet!",
    "Happy birthday, Texan! Please blow out those candles before I have to file paperwork in triplicate!"
  ]
}
```

## Message Format

When an NPC speaks, the message appears as:

```
Bert (Fire Safety Officer) says, "FORTY candles, Ernie. FORTY..."
```

The NPC name is colored green (using the `colors.npc()` function) and the quotation marks are dimmed for visual polish.

## Technical Details

### Initialization Sequence

1. World and players are loaded
2. AmbientDialogueManager is initialized with world and players references
3. Manager scans all NPCs to find those with dialogue arrays
4. Individual timers are started for each NPC with randomized intervals
5. Timers run continuously until server shutdown

### Runtime Behavior

For each NPC with dialogue:
1. Timer fires after random interval (30-60s)
2. Check if NPC is alive (not dead)
3. Find which room the NPC is currently in
4. Check if any players are in that room
5. If players present, pick a random dialogue line and broadcast
6. Schedule the next dialogue with a new random interval

### Performance Characteristics

- **Memory**: One timer per NPC with dialogue (~12 timers for current NPCs)
- **CPU**: Negligible - only fires every 30-60 seconds per NPC
- **Network**: Only sends messages when players are present
- **Scalability**: O(1) per NPC, O(n) for finding players in room

## API Reference

### AmbientDialogueManager Methods

#### `initialize(world, players)`
Initialize the manager with world and player references.

#### `start()`
Start ambient dialogue timers for all NPCs with dialogue.

#### `stop()`
Stop all timers and clean up (called during shutdown).

#### `triggerDialogue(npcId)`
Manually trigger dialogue for a specific NPC (useful for testing/debugging).

#### `getDebugInfo()`
Get debugging information about the current state:
```javascript
{
  active: true,
  totalNPCs: 12,
  npcsWithDialogue: 12,
  activeTimers: 12,
  npcDialogueCounts: {
    "bert_fire_safety": 7,
    "big_bird": 3,
    // ...
  }
}
```

## Testing

A test script is provided at `/home/micah/wumpy/test/test-ambient-dialogue.js`.

Run it with:
```bash
node test/test-ambient-dialogue.js
```

The test verifies:
- NPCs speak dialogue when players are in the room
- NPCs don't speak when no players are present
- Messages are properly formatted
- Multiple players in different rooms receive appropriate messages

## Future Enhancements

Potential improvements for the system:

1. **Emotes**: Add support for NPC emotes in addition to dialogue
2. **Conditional Dialogue**: Allow NPCs to speak different lines based on:
   - Time of day
   - Player actions
   - World events
   - NPC mood/state

3. **Dialogue Groups**: Support multiple dialogue sets per NPC:
   - Idle chatter
   - Combat taunts
   - Quest hints
   - Merchant pitches

4. **Proximity Awareness**: NPCs could reference nearby players or other NPCs in dialogue

5. **Admin Commands**: Add admin commands to:
   - Enable/disable ambient dialogue globally
   - Adjust timing intervals
   - Trigger specific dialogue lines
   - View dialogue statistics

## Examples

### Current NPCs with Dialogue

All 12 Sesame Street NPCs have dialogue:

- **Bert (Fire Safety Officer)**: 7 lines about fire safety concerns
- **Ernie (Dangerously Calm)**: 7 lines about party shenanigans
- **Cookie Monster (Volunteer Firefighter)**: 8 lines about cake/cookies
- **Big Bird**: 3 lines about Sesame Street
- **Grover the Bartender**: 4 lines of bartender wisdom
- **Mr. Hooper**: 4 lines of shop talk
- **Wumpies** (Blue, Yellow, Green, Red, Purple): 4 lines each of Wumpy personality
- **Gronk the Wumpy Gladiator**: 7 lines of arena boasts

### Sample In-Game Experience

```
> look
Sesame Street - Center
========================
You are standing at the center of Sesame Street. The famous street is lined with
brownstones and small shops. To the north, you can see a large yellow bird's nest.
To the south, there's a small general store.

Exits: north, south, east, west

Big Bird is here.
Bert (Fire Safety Officer) is here.
Ernie (Dangerously Calm) is here.
Cookie Monster (Volunteer Firefighter) is here.

Also here: Micah

>
Bert (Fire Safety Officer) says, "FORTY candles, Ernie. FORTY. That's not a birthday
cake, that's a fire code violation with frosting!"

>
Cookie Monster (Volunteer Firefighter) says, "Me volunteer to help with dangerous
cake situation! Me very qualified. Me have fork!"

> smile
You smile.

>
Ernie (Dangerously Calm) says, "The cake is fine! Probably! I mean, the local birds
are using it as a heat source but that's just efficient energy use!"
```

## Troubleshooting

### NPCs Not Speaking

1. Check if NPC has `dialogue` array in JSON definition
2. Verify AmbientDialogueManager started successfully in logs:
   ```
   Logging message: AmbientDialogueManager started for 12 NPCs with dialogue
   ```
3. Ensure at least one player is in the room with the NPC
4. Check that NPC is alive (not dead)

### Performance Issues

1. Check number of active timers with `getDebugInfo()`
2. Verify timers are being cleaned up on shutdown
3. Monitor server logs for error messages

### Testing Issues

1. Use `triggerDialogue(npcId)` to manually trigger dialogue
2. Call `getDebugInfo()` to inspect current state
3. Check that world and players references are set correctly
