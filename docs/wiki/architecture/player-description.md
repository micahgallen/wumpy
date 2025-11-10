---
title: Player Description Architecture
status: current
last_updated: 2025-11-10
related: [player-description-system, data-schemas, command-system]
---

# Player Description Architecture

This document describes the technical architecture, data flow, and implementation details of the Player Description System.

## Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER DESCRIPTION SYSTEM                 │
└─────────────────────────────────────────────────────────────┘

Player → look command → Look.js → PlayerDescriptionService
                                          ↓
                        Assembles from multiple sources:
                        1. Header (name, level, ghost)
                        2. Level tier description
                        3. Base description
                        4. Description modifiers (sorted)
                        5. Equipment summary
                                          ↓
                        Returns formatted string → Player
```

The PlayerDescriptionService acts as the central coordinator, pulling data from the Player object, EquipmentManager, and its own internal tier definitions to construct complete descriptions.

## File Structure

| File | Purpose | Lines |
|------|---------|-------|
| `src/systems/description/PlayerDescriptionService.js` | Core service | ~400 |
| `src/server/Player.js` | +descriptionModifiers property | Modified |
| `src/commands/core/look.js` | Integration point | Modified |
| `src/playerdb.js` | Persistence layer | Modified |
| `examples/description-modifiers/guildModifiers.js` | Guild example | ~150 |
| `examples/description-modifiers/tattooSystem.js` | Tattoo example | ~200 |

## Data Schemas

### Player Object Extension

The Player class gains one new property:

```javascript
class Player {
  constructor() {
    this.descriptionModifiers = []; // Array of modifier objects
  }
}
```

### Modifier Object Schema

Each modifier in the `descriptionModifiers` array follows this structure:

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `text` | string | Description sentence | "The crimson tabard..." |
| `source` | string | Unique identifier | "guild_warriors" |
| `priority` | number | Display order (0-100) | 80 |
| `addedAt` | number | Unix timestamp | 1699123456789 |

### PlayerDB Schema Extension

The database schema in `players.json` adds one field:

```javascript
{
  "username_lowercase": {
    "username": "ActualName",
    "passwordHash": "...",
    "currentRoom": "...",
    "inventory": [],
    "description": "Player-set text",
    "descriptionModifiers": [  // NEW
      {
        "text": "...",
        "source": "...",
        "priority": 80,
        "addedAt": 1699123456789
      }
    ]
  }
}
```

## PlayerDescriptionService API

The service exports eight public methods:

| Method | Parameters | Returns | Purpose |
|--------|------------|---------|---------|
| `generateDescription` | player, options | string | Main entry point |
| `addDescriptionModifier` | player, text, source, priority, playerDB | void | Add modifier |
| `removeDescriptionModifier` | player, source, playerDB | void | Remove modifier |
| `hasDescriptionModifier` | player, source | boolean | Check existence |
| `getDescriptionModifier` | player, source | object\|null | Get details |
| `clearDescriptionModifiers` | player, playerDB | void | Remove all |
| `getLevelTierInfo` | level | object | Get tier data |

### Internal Methods

The service uses several private methods for composition:

- `_getDefaultDescription()`: Returns random default from 5 options
- `_getLevelTierDescription(level)`: Looks up tier, returns text with variant chance
- `_formatEquipmentSummary(player)`: Calls EquipmentManager, formats visible items
- `_sortModifiersByPriority(modifiers)`: Sorts by priority DESC, then source ASC

## Data Flow Diagram

```
┌──────────────┐
│ Game Systems │ (Guilds, Tattoos, Quests)
└──────┬───────┘
       │ addDescriptionModifier()
       ▼
┌──────────────────────┐
│ Player Object        │
│ descriptionModifiers │
│ [                    │
│   {text, source...}  │
│ ]                    │
└──────┬───────────────┘
       │ savePlayer()
       ▼
┌──────────────────────┐
│ PlayerDB             │
│ players.json         │
└──────────────────────┘
       ▲
       │ authenticate() / load
       │
┌──────────────────────┐
│ Player Login         │
└──────────────────────┘
```

When players log in, PlayerDB loads `descriptionModifiers` from disk. Legacy players without this property receive an empty array. When game systems call `addDescriptionModifier()` with the playerDB parameter, the service updates the player object and immediately persists to disk.

## Look Command Integration

The look command in `src/commands/core/look.js` detects when the target is a Player object and routes to PlayerDescriptionService:

```javascript
// Existing code handles NPCs, objects, items...

// Player description (NEW)
if (target instanceof Player) {
  const description = PlayerDescriptionService.generateDescription(target, {
    isSelf: target === player,
    showEquipment: true,
    showLevel: true
  });
  player.send(description);
  return;
}
```

All existing look command functionality remains unchanged. The integration is additive, not destructive.

## Description Generation Flow

When `generateDescription()` executes, it follows this sequence:

1. **Validate Input**: Check player object exists, initialize options with defaults
2. **Build Header**: Combine `playerName(player.username)`, ghost indicator, level number
3. **Get Level Tier**: Call `_getLevelTierDescription(player.level)` for narrative text
4. **Get Base**: Use `player.description` or call `_getDefaultDescription()`
5. **Sort Modifiers**: Call `_sortModifiersByPriority(player.descriptionModifiers)`
6. **Format Equipment**: Call `_formatEquipmentSummary(player)` if `showEquipment`
7. **Assemble**: Concatenate components with proper spacing and ANSI colors
8. **Return**: Complete formatted string with line breaks

## Level Tier Implementation

Level tiers are defined as a static array within PlayerDescriptionService:

```javascript
const LEVEL_TIERS = [
  {
    minLevel: 1,
    maxLevel: 3,
    title: 'fresh-faced novice',
    description: 'They have that unmistakable look...',
    variants: [
      'The optimism is almost painful to watch...',
      'Death hasn\'t introduced itself yet...'
    ]
  },
  // ... 6 more tiers
];
```

The `_getLevelTierDescription()` method binary searches this array for the appropriate tier, then randomly selects between the primary description (70% chance) and a variant (30% chance when variants exist).

## Priority Sorting Algorithm

Modifiers sort using a two-tier comparison:

```javascript
modifiers.sort((a, b) => {
  if (b.priority !== a.priority) {
    return b.priority - a.priority;  // Higher priority first
  }
  return a.source.localeCompare(b.source);  // Alphabetical on tie
});
```

This ensures consistent ordering: legendary achievements appear before guild membership, guild membership before tattoos, and so on. When priorities tie, alphabetical source order provides determinism.

## Equipment Display Logic

The `_formatEquipmentSummary()` method queries EquipmentManager for specific slots and formats them into sentences:

| Slot | Variable | Display Priority |
|------|----------|------------------|
| `main_hand` | Main hand weapon | 1 |
| `off_hand` | Off-hand weapon | 2 |
| `chest` | Chest armor | 3 |
| `head` | Head armor | 4 |
| `legs` | Leg armor | 5 |
| `feet` | Foot armor | 6 |
| `back` | Cloak/cape | 7 |
| `neck` | Neck jewelry | 8 |

Other equipped items (rings, hands, shoulders, waist, wrists, trinkets) do not appear in descriptions but are visible via the `equipment` command. This prevents description bloat while highlighting the most visible items.

## Color Coding

ANSI color codes apply to specific elements:

| Element | Color Function | Visual Effect |
|---------|----------------|---------------|
| Player name | `playerName()` | Bright cyan |
| Level number | `dim()` | Gray |
| Level tier text | `dim()` | Gray |
| Base description | Default | White |
| Modifiers | `cyan()` | Cyan |
| Ghost indicators | `hint()` | Dim cyan |
| Equipment labels | `dim()` | Gray |
| Item names | `objectName()` | Bright magenta |

## Persistence Implementation

PlayerDB handles three persistence scenarios:

**New Player Creation**: The `createPlayer()` method initializes `descriptionModifiers: []` as part of the default player object.

**Player Authentication**: The `authenticate()` method loads existing players and ensures backwards compatibility:

```javascript
if (!playerData.descriptionModifiers) {
  playerData.descriptionModifiers = [];
}
```

**Modifier Changes**: When `addDescriptionModifier()` or `removeDescriptionModifier()` receive a playerDB parameter, they call `playerDB.savePlayer(player)` after modifying the array. This ensures immediate persistence without requiring manual save calls.

## Performance Analysis

| Operation | Complexity | Typical Count | Impact |
|-----------|------------|---------------|--------|
| Generate description | O(n) | n < 10 modifiers | Negligible |
| Add modifier | O(n) | n < 10 | Negligible |
| Remove modifier | O(n) | n < 10 | Negligible |
| Has modifier | O(n) | n < 10 | Negligible |
| Database save | O(1) | - | Async, non-blocking |

Linear operations on arrays of typically fewer than 10 elements incur negligible overhead. Database saves use Node.js async I/O and don't block the event loop. No caching or optimization is currently necessary.

## Error Handling

The system handles errors gracefully without throwing exceptions:

| Error Condition | Behavior |
|-----------------|----------|
| Null/undefined player | Return empty string or skip operation |
| Missing descriptionModifiers | Initialize empty array |
| Invalid source identifier | Silently ignore |
| Missing playerDB parameter | Modify in-memory only, no persistence |
| Malformed modifier object | Use defaults or skip |

This "fail gracefully" approach prevents crashes while providing sensible fallbacks.

## Extension Points

Game systems integrate by calling the public API. No modification to PlayerDescriptionService is required. The architecture supports unlimited custom systems using the modifier pattern.

Example integration flow:

```
Custom System → addDescriptionModifier() → Player Object → PlayerDB → Disk
                                                ↓
                            Automatic appearance in look command
```

The modifier's `source` identifier prevents collisions and allows systems to manage their own modifiers independently.

## Thread Safety

Node.js runs single-threaded, eliminating traditional race conditions. However, async considerations apply:

Database saves queue through the Node.js event loop but execute sequentially. Multiple rapid modifier changes to the same player accumulate in memory, then the final state persists on the next savePlayer call. This batching behavior is intentional and improves performance.

No locking or synchronization is necessary in the current architecture.

## Backwards Compatibility

The implementation maintains complete backwards compatibility:

Existing players without `descriptionModifiers` receive empty arrays on login. The `describe` command continues to work unchanged, setting `player.description`. The look command's existing NPC, object, and item handling remains unmodified. No breaking changes to the Player class interface occurred.

## Testing Strategy

The test suite in `tests/test_player_description.js` uses a mock player object and validates each component independently:

Level tier accuracy verifies all seven tiers return correct descriptions for their level ranges. Modifier management confirms add, remove, has, get, and clear operations work correctly. Priority ordering tests confirm higher priority modifiers appear first. Equipment display validates correct item formatting. Ghost status tests ensure ethereal descriptions appear appropriately.

## Future Optimization Opportunities

If modifier counts grow beyond 10-20 per player, several optimizations become viable. Replace the modifiers array with a Map keyed by source for O(1) lookups. Implement a description cache that invalidates on modifier changes. Add schema validation using a library like Joi. Emit events when modifiers change so other systems can react. Add version fields to support future schema migrations.

These optimizations are not currently necessary but provide clear upgrade paths if performance becomes a concern.

## See Also

- [Player Description System](../systems/player-description.md) - System overview and usage
- [Data Schemas](data-schemas.md) - Complete player object structure
- [Command System](command-system.md) - Command execution flow
- [Player Description Examples](../../reference/player-description-examples.md) - Output examples
