---
title: Event System Architecture
status: current
last_updated: 2025-11-10
related: [timer-system, corpse-system, combat-flow]
---

# Event System Architecture

The Wumpy event system uses a lightweight EventEmitter pattern for decoupled communication between game systems. Key systems like CorpseManager and RespawnManager emit typed events that other systems listen to, enabling reactive, event-driven architecture without tight coupling. The pattern eliminates polling loops and creates clear dependency graphs.

## Overview

Wumpy's event system is built on a simple listener pattern implemented manually in each event-emitting class. Systems register listener functions via `on(eventType, callback)`, then emit events via `emit(eventType, data)`. Listeners execute synchronously when events fire.

The architecture supports multiple listeners per event type, event data payloads, and event forwarding (listeners re-emitting events to other systems). This creates event cascades that propagate state changes through the game.

## Core Pattern

Event-emitting classes implement three methods:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `on()` | `on(eventType, callback)` | Register listener function |
| `emit()` | `emit(eventType, data)` | Fire event to all listeners |
| `removeListener()` | `removeListener(eventType, callback)` | Unregister listener (optional) |

Implementation pattern:

```javascript
class EventEmittingSystem {
  constructor() {
    this.listeners = {}; // { eventType: [callback1, callback2, ...] }
  }

  on(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
  }

  emit(eventType, data) {
    const callbacks = this.listeners[eventType] || [];
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        logger.error(`Event ${eventType} listener failed:`, error);
      }
    }
  }
}
```

This pattern is used by CorpseManager, RespawnManager, and other event-driven systems.

## Event Flow Example: Corpse Decay

```
NPC dies in combat
    ↓
CorpseManager.createNPCCorpse()
    ↓
Schedule decay timer (TimerManager)
    ↓
... 5 minutes pass ...
    ↓
Timer expires → onCorpseDecay() callback
    ↓
CorpseManager.emit('corpseDecayed', {
  npcId: 'goblin_001',
  npcType: 'goblin',
  roomId: 'sesame_plaza',
  corpseId: 'corpse_goblin_12345'
})
    ↓
RespawnManager.on('corpseDecayed') listener fires
    ↓
RespawnManager.respawnNPC(npcId, roomId)
    ↓
Add NPC back to room
    ↓
RespawnManager.emit('roomMessage', {
  roomId: 'sesame_plaza',
  message: 'A goblin appears!'
})
    ↓
Server.on('roomMessage') listener fires
    ↓
Broadcast to all players in room
    ↓
Event cascade complete
```

This flow shows three event emissions across three systems, all decoupled via the event pattern.

## Active Event Types

Current events emitted in Wumpy:

| Event | Emitter | Data Payload | Listeners |
|-------|---------|--------------|-----------|
| `corpseDecayed` | CorpseManager | `{npcId, npcType, roomId, corpseId}` | RespawnManager |
| `roomMessage` | CorpseManager, RespawnManager | `{roomId, message}` | Server (broadcast handler) |

Future planned events:

| Event | Potential Emitter | Data Payload | Use Case |
|-------|-------------------|--------------|----------|
| `playerLevelUp` | XpSystem | `{player, oldLevel, newLevel}` | Broadcast, achievements |
| `questComplete` | QuestManager | `{player, questId, rewards}` | XP award, inventory update |
| `itemEquipped` | EquipmentManager | `{player, item, slot}` | Stat recalculation, buffs |
| `combatStart` | CombatEngine | `{participants, roomId}` | Quest tracking, buffs |
| `combatEnd` | CombatEngine | `{winner, loser, xp}` | Quest tracking, achievements |

## Event Registration Patterns

### Setup During Initialization

Listeners are registered during system setup:

```javascript
// In server.js during initialization
RespawnManager.initialize(world);

// Inside RespawnManager.initialize()
RespawnManager.on('corpseDecayed', (data) => {
  this.handleCorpseDecay(data);
});

RespawnManager.on('roomMessage', (data) => {
  this.emit('roomMessage', data); // Forward to server
});
```

Listeners are set up once at startup and persist for the server's lifetime.

### Server-Level Event Forwarding

Server listens to system events and broadcasts to players:

```javascript
// In server.js
RespawnManager.on('roomMessage', ({ roomId, message }) => {
  for (const player of players) {
    if (player.currentRoom === roomId && player.state === 'playing') {
      player.send('\n' + message + '\n');
      player.sendPrompt();
    }
  }
});
```

This pattern separates game logic (systems emit events) from presentation (server broadcasts messages).

## Event Data Patterns

Event data should follow these conventions:

| Convention | Rationale | Example |
|------------|-----------|---------|
| Use object payloads | Extensible, self-documenting | `{npcId, roomId}` not `(npcId, roomId)` |
| Include entity IDs, not objects | Avoid stale references | `npcId: 'goblin_001'` not `npc: {...}` |
| Add event type metadata | Aids logging and debugging | `type: 'corpse_decay'` |
| Keep payloads JSON-serializable | Enables logging, persistence | No functions or circular refs |
| Use descriptive field names | Self-documenting | `killerName` not `k` |

Example well-structured event data:

```javascript
{
  type: 'corpse_decay',
  corpseId: 'corpse_goblin_12345',
  npcId: 'goblin_001',
  npcType: 'goblin',
  roomId: 'sesame_plaza',
  timestamp: 1699901234567
}
```

## Event vs Direct Calls

When to use events vs direct function calls:

| Use Events When | Use Direct Calls When |
|-----------------|----------------------|
| Multiple systems need notification | One system needs one action |
| Future listeners may be added | Clear single responsibility |
| Systems should be decoupled | Systems have tight coupling by design |
| Order of operations doesn't matter | Specific execution order required |
| Action might happen asynchronously | Synchronous response needed |

Example: Corpse decay uses events because RespawnManager shouldn't know about CorpseManager internals. Combat death uses direct calls to CorpseManager because corpse creation must complete before combat ends.

## Error Handling

Event listeners use defensive error handling:

```javascript
emit(eventType, data) {
  const callbacks = this.listeners[eventType] || [];
  for (const callback of callbacks) {
    try {
      callback(data);
    } catch (error) {
      logger.error(`Event ${eventType} listener failed:`, error);
      // Continue executing other listeners
    }
  }
}
```

One failing listener doesn't stop other listeners. Errors are logged but don't propagate.

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Register listener | O(1) | Array push |
| Emit event | O(n) | n = listeners for this event type (~1-3 typically) |
| Event dispatch | Synchronous | Listeners execute immediately, in order |
| Memory per listener | ~100 bytes | Function reference + array slot |

Events execute synchronously in the current tick. For async operations, listeners should spawn Promises or use setTimeout().

## Integration with Node.js EventEmitter

Wumpy could migrate to Node.js EventEmitter for additional features:

```javascript
const EventEmitter = require('events');

class CorpseManager extends EventEmitter {
  constructor() {
    super();
  }

  onCorpseDecay(data) {
    // ... decay logic ...
    this.emit('corpseDecayed', data);
  }
}
```

Benefits: Built-in `once()`, `removeListener()`, `removeAllListeners()`, max listener warnings.

Current manual pattern is simpler and sufficient for Wumpy's needs.

## Testing Event-Driven Code

Event systems enable isolated testing:

```javascript
// Test corpse decay without full game server
const CorpseManager = require('./CorpseManager');
const corpseManager = new CorpseManager();

let eventFired = false;
let eventData = null;

corpseManager.on('corpseDecayed', (data) => {
  eventFired = true;
  eventData = data;
});

// Trigger decay manually
corpseManager.onCorpseDecay({
  corpseId: 'test_corpse',
  npcId: 'test_npc',
  roomId: 'test_room'
});

assert(eventFired === true);
assert(eventData.npcId === 'test_npc');
```

Events provide clear test boundaries and observable outcomes.

## Event Debugging

Tips for debugging event-driven code:

| Problem | Solution |
|---------|----------|
| Event not firing | Add logger.log() in emit() to confirm emission |
| Listener not executing | Check listener registration, verify event type string |
| Wrong data in listener | Log event data in emit() before listener call |
| Listener order issues | Listeners execute in registration order |
| Circular event loops | Add event depth tracking, log warning at depth > 5 |

Example debug logging:

```javascript
emit(eventType, data) {
  logger.debug(`Emitting ${eventType} with data:`, data);
  const callbacks = this.listeners[eventType] || [];
  logger.debug(`${callbacks.length} listeners registered`);
  // ... execute listeners ...
}
```

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Document emitted events in class docstring | Helps developers find event sources |
| Use typed event constants | `const EVENTS = {CORPSE_DECAYED: 'corpseDecayed'}` prevents typos |
| Keep listener logic minimal | Listeners should delegate to methods, not contain complex logic |
| Avoid listener removal during iteration | Can cause array mutation bugs |
| Log events at debug level | Aids troubleshooting without cluttering normal logs |
| Test event emissions | Verify events fire with correct data |

## Event System Expansion

Future enhancements to consider:

| Feature | Benefit | Implementation Effort |
|---------|---------|----------------------|
| Event priorities | Control listener execution order | Medium |
| Async listeners | Support Promise-based listeners | Low |
| Event namespacing | Organize events by system | Low |
| Event replay | Debugging tool to replay event sequences | High |
| Event persistence | Log events to disk for analysis | Medium |
| Conditional listeners | Register listeners with filter predicates | Medium |

Most valuable near-term: typed event constants and async listener support.

## See Also

- [Timer System Architecture](timer-system.md) - Event-driven timer management
- [Corpse System](../systems/corpse-system.md) - Primary event emitter/consumer
- [Combat Flow Architecture](combat-flow.md) - Potential combat event integration
