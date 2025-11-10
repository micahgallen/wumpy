---
title: Timer System Architecture
status: current
last_updated: 2025-11-10
related: [corpse-system, event-system, combat-flow]
---

# Timer System Architecture

The Wumpy timer system provides event-driven, persistent timer management for game events like corpse decay, NPC respawn, buff durations, and quest deadlines. Built on individual setTimeout() calls (NO polling loops), it offers O(1) operations, zero CPU overhead when idle, persistence across server restarts, and automatic cleanup.

## Overview

TimerManager is a singleton that schedules one-time events using JavaScript setTimeout(). Each timer is stored in a Map with metadata including expiration time, callback function, and JSON-serializable data. The system persists active timers to disk on shutdown and restores them on startup, executing expired timers immediately.

The architecture eliminates polling overhead by using event-driven timers. When no timers exist, CPU usage is zero. Timer creation, cancellation, and lookup are all O(1) hash map operations.

## Core Architecture

| Component | Purpose | Location |
|-----------|---------|----------|
| **TimerManager** | Singleton timer orchestrator | `/src/systems/corpses/TimerManager.js` |
| **timers Map** | Active timer storage | In-memory Map<timerId, timerData> |
| **Persistence** | Save/load timer state | JSON files in `/data/timers.json` |
| **Callbacks** | Timer expiration handlers | Registered per timer type |

TimerManager is instantiated as a singleton and exported directly from the module. All game systems access the same instance.

## Timer Lifecycle

```
schedule(id, delay, callback, data)
    ↓
Cancel existing timer with same ID (if any)
    ↓
Create setTimeout(callback, delay)
    ↓
Store in timers Map:
    {
      timeoutId: setTimeout reference,
      expiresAt: Date.now() + delay,
      callback: function,
      data: { type: 'corpse_decay', ... }
    }
    ↓
Timer ticks down (OS-managed)
    ↓
On expiration:
    ↓
Execute callback(data)
    ↓
Delete from timers Map
    ↓
Timer complete
```

Timers are one-shot. For repeating events, callbacks must reschedule themselves.

## TimerManager API

| Method | Parameters | Returns | Purpose |
|--------|------------|---------|---------|
| `schedule()` | id, delay, callback, data | timerId | Schedule one-time event |
| `cancel()` | id | boolean | Cancel active timer |
| `getRemainingTime()` | id | milliseconds | Time until expiration |
| `has()` | id | boolean | Check timer exists |
| `getTimerData()` | id | object \| null | Get timer metadata |
| `getActiveTimers()` | none | string[] | List all timer IDs |
| `getActiveTimerCount()` | none | number | Count active timers |
| `exportState()` | none | object[] | Serialize for persistence |
| `restoreState()` | state, callbacks | void | Restore from disk |
| `saveState()` | filePath | boolean | Write to disk |
| `loadState()` | filePath, callbacks | boolean | Read from disk |
| `clearAll()` | none | number | Cancel all timers |
| `getDebugInfo()` | none | object | Timer statistics |

## Scheduling Timers

Basic timer scheduling:

```javascript
const TimerManager = require('./systems/corpses/TimerManager');

// Schedule corpse decay in 5 minutes
TimerManager.schedule(
  'corpse_goblin_12345',  // Unique ID
  5 * 60 * 1000,          // 5 minutes in ms
  onCorpseDecay,          // Callback function
  {                       // Serializable data
    type: 'corpse_decay',
    corpseId: 'corpse_goblin_12345',
    npcId: 'goblin_001',
    roomId: 'sesame_plaza'
  }
);
```

Timer IDs must be unique. Scheduling with an existing ID cancels the old timer first.

Data object must be JSON-serializable (no functions, circular refs, or class instances). It's passed to the callback and persisted to disk.

## Callback Pattern

Callback signature: `function callback(data) { ... }`

Example callback:

```javascript
function onCorpseDecay(data) {
  const { corpseId, npcId, roomId } = data;

  // Remove corpse from room
  const room = world.getRoom(roomId);
  room.items = room.items.filter(item => item.instanceId !== corpseId);

  // Emit event for respawn system
  CorpseManager.emit('corpseDecayed', { npcId, roomId, corpseId });

  logger.log(`Corpse ${corpseId} decayed in ${roomId}`);
}
```

Callbacks should be pure functions that operate on the data parameter. They're registered during state restoration.

## Persistence Flow

### Shutdown (Save State)

```
Server shutdown signal (SIGTERM/SIGINT)
    ↓
TimerManager.saveState('/data/timers.json')
    ↓
exportState() - Serialize all timers:
    [
      {
        id: 'corpse_goblin_12345',
        expiresAt: 1699901234567,
        data: { type: 'corpse_decay', ... }
      },
      ...
    ]
    ↓
Write JSON to disk
    ↓
Server exits
```

The callback function is NOT serialized. Only the timer ID, expiration time, and data object are saved.

### Startup (Restore State)

```
Server starts
    ↓
Register callback functions:
    callbacks = {
      'corpse_decay': onCorpseDecay,
      'buff_expire': onBuffExpire,
      ...
    }
    ↓
TimerManager.loadState('/data/timers.json', callbacks)
    ↓
Read JSON from disk
    ↓
For each saved timer:
    ↓
    Calculate remaining time = expiresAt - now
    ↓
    If remaining <= 0:
        ↓
        Timer expired during downtime
        ↓
        Execute callback immediately
    Else:
        ↓
        Reschedule with remaining time
        ↓
        schedule(id, remaining, callback, data)
    ↓
All timers restored
```

Timers that expired while the server was down execute immediately on startup. Active timers resume with adjusted delays.

## Timer Data Schema

Timer data structure stored in the Map:

| Property | Type | Purpose |
|----------|------|---------|
| `timeoutId` | Timeout | setTimeout reference for cancellation |
| `expiresAt` | number | Unix timestamp (ms) when timer fires |
| `callback` | function | Function to execute on expiration |
| `data` | object | Serializable metadata passed to callback |

Persisted state schema (JSON):

| Property | Type | Purpose |
|----------|------|---------|
| `id` | string | Timer unique identifier |
| `expiresAt` | number | Unix timestamp (ms) when timer fires |
| `data` | object | Serializable metadata (includes `type` field) |

The `data.type` field maps to callback functions during restoration: `callbacks[data.type]`.

## Performance Characteristics

| Operation | Complexity | Implementation |
|-----------|-----------|----------------|
| schedule() | O(1) | Map.set() + setTimeout() |
| cancel() | O(1) | Map.get() + clearTimeout() + Map.delete() |
| getRemainingTime() | O(1) | Map.get() + subtraction |
| has() | O(1) | Map.has() |
| getActiveTimers() | O(n) | Map.keys() iteration |
| exportState() | O(n) | Map iteration |
| restoreState() | O(n) | Array iteration + schedule() each |

Memory usage: ~200 bytes per active timer (includes Map entry, timeout reference, and data object).

CPU usage: Zero when no timers are firing. setTimeout() is OS-managed, no polling loops.

## Event-Driven Design

TimerManager integrates with Wumpy's event system:

```
Timer expires
    ↓
Callback executes
    ↓
Callback emits event (optional)
    EventEmitter.emit('corpseDecayed', data)
    ↓
Other systems listen for event
    RespawnManager.on('corpseDecayed', respawnNPC)
    ↓
Event-driven cascade
```

This pattern decouples timer logic from game systems. Timers trigger events, listeners react.

## Use Cases

| System | Timer Type | Duration | Callback |
|--------|-----------|----------|----------|
| **Corpse Decay** | NPC corpse removal | 5 minutes | Remove corpse, emit respawn event |
| **Player Corpse** | Player corpse removal | 30 minutes | Remove corpse, delete items |
| **Buff Duration** | Temporary stat bonus | Variable | Remove buff from player |
| **Cooldown** | Ability reuse timer | 30-60 seconds | Clear cooldown flag |
| **Quest Deadline** | Time-limited quest | Hours/days | Fail quest, emit event |
| **NPC Respawn** | Dead NPC return | 5-10 minutes | Add NPC back to room |

All these use the same TimerManager API with different callbacks and data.

## Error Handling

Timer system error handling:

| Error Scenario | Handling |
|----------------|----------|
| Callback throws exception | Caught, logged, timer still deleted |
| Invalid callback during restore | Logged warning, timer skipped |
| Disk write failure | Logged error, returns false |
| Disk read failure | Logged error, returns false, starts fresh |
| Timer data corrupted | Skipped, logged warning |

The system is defensive. A single bad timer won't crash the server or prevent other timers from working.

Example from TimerManager.schedule():

```javascript
const timeoutId = setTimeout(() => {
  try {
    callback(data);
  } catch (error) {
    logger.error(`Timer ${id} callback failed:`, error);
  } finally {
    // Always cleanup even if callback fails
    this.timers.delete(id);
  }
}, delay);
```

## Admin Tools

TimerManager provides inspection tools for admins:

| Method | Output | Use Case |
|--------|--------|----------|
| `getDebugInfo()` | Full timer list with remaining time | Debugging timer issues |
| `getStats()` | Count by type, timers due soon | System health monitoring |
| `getActiveTimerCount()` | Total active timers | Performance tracking |

Example admin command output:

```
Active Timers: 23
By Type:
  corpse_decay: 18
  buff_expire: 3
  cooldown: 2

Due in next 60 seconds:
  corpse_goblin_12345 (45s remaining)
  buff_strength_player1 (58s remaining)
```

## Integration Example: Corpse System

How CorpseManager uses TimerManager:

```javascript
// In CorpseManager.createNPCCorpse()
const decayTime = config.decay.npc; // 5 minutes

TimerManager.schedule(
  `corpse_decay_${corpseId}`,
  decayTime,
  this.onCorpseDecay.bind(this), // Callback
  {
    type: 'corpse_decay',
    corpseId,
    npcId: npc.id,
    npcType: npc.type,
    roomId
  }
);

// Callback function
onCorpseDecay(data) {
  const { corpseId, npcId, npcType, roomId } = data;

  // Remove corpse from room
  this.removeCorpseFromRoom(corpseId, roomId);

  // Emit event for respawn
  this.emit('corpseDecayed', { npcId, npcType, roomId, corpseId });

  // Cleanup internal state
  this.corpses.delete(corpseId);
}
```

The timer triggers corpse removal exactly 5 minutes after creation, even if the server restarts.

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Use unique, descriptive timer IDs | Prevents conflicts, aids debugging |
| Include `type` in data object | Required for callback mapping during restore |
| Keep data JSON-serializable | Enables persistence |
| Bind callbacks with context | Preserve `this` when using class methods |
| Handle missing entities gracefully | Entity might be deleted before timer fires |
| Log timer lifecycle events | Aids debugging and monitoring |
| Don't schedule ultra-short timers | Use immediate execution for < 1 second |

## See Also

- [Corpse System](../systems/corpse-system.md) - Primary consumer of TimerManager
- [Event System Architecture](event-system.md) - Event-driven patterns
- [Combat Flow Architecture](combat-flow.md) - Combat integration with timers
