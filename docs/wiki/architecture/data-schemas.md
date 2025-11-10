---
title: Data Schemas Architecture
status: current
last_updated: 2025-11-10
related: [item-system, combat-overview, creating-npcs]
---

# Data Schemas Architecture

The Wumpy data layer defines four primary entity types: Player, NPC, Room, and Item. Each uses JSON for persistence with in-memory object representations during runtime. Schemas balance persistence needs (long-term storage), runtime needs (active gameplay state), and migration needs (backward compatibility as systems evolve).

## Overview

Wumpy separates persistent data (stored in JSON files) from runtime state (in-memory objects with methods). Player data lives in `players.json`, world data (rooms, NPCs, objects) lives in `world/` directory structure, items are registered in ItemRegistry, and transient state (corpses, timers) lives in `data/` directory.

The architecture supports schema migration, default value injection, and bidirectional transformation between storage format and runtime format.

## Core Data Entities

| Entity | Storage | Runtime | Manager |
|--------|---------|---------|---------|
| **Player** | `players.json` | Player class instance | PlayerDB |
| **Room** | `world/{realm}/rooms/*.js` | Plain object | World |
| **NPC** | `world/{realm}/npcs/*.js` | Plain object + methods | World |
| **Item** | `world/{realm}/items/*.js` | ItemInstance from ItemDefinition | ItemRegistry + ItemFactory |

Storage uses JSON (`.js` files are actually JSON). Runtime adds computed properties, methods, and transient state.

## Player Schema

Players have the most complex schema due to progression, inventory, equipment, and state management:

### Persistent Fields (Saved to `players.json`)

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `username` | string | Unique identifier | "alice" |
| `passwordHash` | string | SHA-256 hashed password | "5e884..." |
| `description` | string | Player-set description | "A brave adventurer" |
| `level` | number | Character level | 5 |
| `xp` | number | Experience points | 250 |
| `currentRoom` | string | Room ID for login spawn | "sesame_street_01" |
| `hp` | number | Current hit points | 35 |
| `maxHp` | number | Maximum hit points | 50 |
| `stats` | object | Base ability scores (long names) | `{strength: 14, dexterity: 12, ...}` |
| `baseStats` | object | Base stats (new format) | `{strength: 14, dexterity: 12, ...}` |
| `inventory` | array | Item instances | `[{instanceId, definitionId, ...}, ...]` |
| `equipment` | object | Equipped items by slot | `{main_hand: {...}, chest: {...}}` |
| `currency` | object | Currency wallet | `{gold: 100, silver: 50}` |
| `isGhost` | boolean | Ghost status (dead) | false |
| `resistances` | object | Damage resistances | `{fire: 0.5, cold: 0.5}` |

### Runtime-Only Fields (Not Saved)

| Field | Type | Purpose | Computed From |
|-------|------|---------|---------------|
| `socket` | Socket | Network connection | Set on login |
| `state` | string | Login/playing state | State machine |
| `str`, `dex`, `con`, etc. | number | Short-name stats | baseStats + equipment |
| `proficiency` | number | Proficiency bonus | Calculated from level |
| `armorClass` | number | AC for combat | Base + equipment + DEX |
| `lastActivity` | number | Timestamp for idle detection | Updated on commands |
| `tauntIndex` | number | Wumpy interaction state | Incremented by commands |

### Player Stat System

Stats use a dual-format system for backward compatibility:

```javascript
// Persistent (saved to DB)
stats: {
  strength: 14,
  dexterity: 12,
  constitution: 13,
  intelligence: 10,
  wisdom: 10,
  charisma: 8
}

// Runtime (calculated, not saved)
str: 16,  // baseStats.strength (14) + equipment bonus (+2)
dex: 12,  // baseStats.dexterity (12) + equipment bonus (0)
con: 13,  // etc.
```

The `savePlayer()` method saves `stats` and `baseStats` (base values before equipment). The `authenticate()` method loads from `stats`, initializes `baseStats`, then recalculates short names with equipment bonuses.

## NPC Schema

NPCs use simpler schemas focused on combat and behavior:

### Core NPC Fields

| Field | Type | Required | Purpose | Example |
|-------|------|----------|---------|---------|
| `id` | string | Yes | Unique identifier | "red_wumpy" |
| `name` | string | Yes | Display name | "Red Wumpy" |
| `description` | string | Yes | Long description | "A small, round..." |
| `keywords` | string[] | Yes | Targeting keywords | ["wumpy", "red", "creature"] |
| `level` | number | Yes | Combat level | 1 |
| `hp` | number | Yes | Hit points (becomes maxHp) | 20 |
| `abilities` | object | Combat | Ability scores | `{str: 12, dex: 10, ...}` |
| `ac` | number | Combat | Armor class | 14 |
| `equippedWeapon` | object | Combat | Weapon stats | `{name: "Claws", damage: "1d4"}` |
| `dialogue` | string[] | No | Random dialogue lines | ["Wump wump!", ...] |
| `aggressive` | boolean | No | Auto-attack players | false |
| `timidity` | number | No | Flee probability (0-1) | 0.5 |
| `fleeThreshold` | number | No | HP % to flee below | 0.25 |
| `roaming` | boolean | No | Can move between rooms | true |
| `is_merchant` | boolean | No | Shop NPC flag | false |
| `is_kickable` | boolean | No | Can be kicked | true |

### NPC Runtime State

NPCs gain runtime state when spawned:

```javascript
// From JSON definition
{
  id: "red_wumpy",
  hp: 20,
  ...
}

// After spawning (in-memory object)
{
  id: "red_wumpy",
  maxHp: 20,        // Set from hp
  currentHp: 20,    // Starts at max
  aggressive: false,
  homeRoom: "sesame_street_01",  // Set by World
  isDead: function() { return this.currentHp <= 0; },
  takeDamage: function(amount) { this.currentHp -= amount; }
}
```

Methods are attached by combat system and World manager.

## Room Schema

Rooms define the game world structure:

### Room Fields

| Field | Type | Required | Purpose | Example |
|-------|------|----------|---------|---------|
| `id` | string | Yes | Unique identifier | "sesame_street_01" |
| `name` | string | Yes | Display name | "Sesame Street - Central Plaza" |
| `description` | string | Yes | Long description | "You stand at the heart..." |
| `exits` | array | Yes | Directional connections | `[{direction: "north", room: "sesame_street_03"}]` |
| `npcs` | string[] | No | NPC IDs in room | ["big_bird", "red_wumpy"] |
| `objects` | string[] | No | Object IDs in room | ["trashcan"] |
| `items` | string[] or array | No | Item definition IDs or instances | ["chocolate_chip_cookie"] |
| `realm` | string | Runtime | Set by World during load | "sesame_street" |

### Exit Schema

Exits are directional connections:

```javascript
{
  "direction": "north",  // north, south, east, west, up, down
  "room": "target_room_id"
}
```

Movement commands use exits to find adjacent rooms. The World provides `getRoom(id)` to retrieve destination rooms.

### Room Item Initialization

Rooms can specify items in two ways:

```javascript
// Static item IDs (converted to instances at startup)
"items": ["chocolate_chip_cookie", "birdseed"]

// Runtime item instances (after World.initializeRoomItems())
"items": [
  { instanceId: "item_1699901234567_abc", definitionId: "chocolate_chip_cookie", ... },
  { instanceId: "item_1699901234568_def", definitionId: "birdseed", ... }
]
```

World calls `ItemFactory.createItem(definitionId)` for each ID, replacing the array with instances.

## Item Schema

Items use a definition-instance pattern:

### ItemDefinition (Template)

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `id` | string | Yes | Unique template ID |
| `name` | string | Yes | Display name |
| `description` | string | Yes | Long description |
| `keywords` | string[] | Yes | Targeting keywords |
| `itemType` | ItemType | Yes | Type enum (WEAPON, ARMOR, etc.) |
| `weight` | number | Yes | Encumbrance value |
| `value` | number | Yes | Gold value |
| `rarity` | ItemRarity | No | Common/Uncommon/Rare/etc. |
| `isEquippable` | boolean | No | Can be equipped |
| `slot` | EquipmentSlot | If equippable | Equipment slot |
| `weaponProperties` | object | If weapon | Damage dice, type, class |
| `armorProperties` | object | If armor | AC bonus, armor type |
| `statModifiers` | object | If equipment | Stat bonuses |

See [Item Properties Reference](../reference/item-properties.md) for complete schema.

### ItemInstance (Runtime Object)

| Field | Type | Purpose |
|-------|------|---------|
| `instanceId` | string | Unique instance ID (UUID-like) |
| `definitionId` | string | Template ID this instance is from |
| All ItemDefinition fields | mixed | Copied from definition |
| `charges` | number | For consumables (runtime) |
| `isIdentified` | boolean | For magical items (runtime) |

Instances are created by ItemFactory and exist in player inventory, room items, or containers.

## Persistence Patterns

### Player Save/Load Cycle

```
Login
    ↓
PlayerDB.authenticate(username, password)
    ↓
Load from players.json
    ↓
Initialize baseStats from stats
    ↓
Create Player instance
    ↓
Recalculate stats from baseStats + equipment
    ↓
Player active in game
    ↓
... gameplay ...
    ↓
Logout or auto-save
    ↓
PlayerDB.savePlayer(player)
    ↓
Write to players.json
```

Auto-save happens on level up, XP gain, inventory changes, and periodic intervals.

### World Data Loading

```
Server Start
    ↓
World.load()
    ↓
World.loadRealm('sesame_street')
    ↓
Load rooms, NPCs, objects from world/sesame_street/
    ↓
World.initializeRoomItems()
    - Convert item IDs to instances
    ↓
World.initializeNPCHomeRooms()
    - Set NPC spawn points
    ↓
Store initialRoomsState (deep copy for respawn)
    ↓
World ready
```

World data is read-only after load. Changes happen in-memory and are NOT saved back to JSON (rooms/NPCs reset on restart).

### Transient Data Persistence

Some data persists across restarts but isn't core entity data:

| File | Contents | When Saved | When Loaded |
|------|----------|------------|-------------|
| `data/corpses.json` | Active corpse state | On shutdown | On startup |
| `data/timers.json` | Active timer state | On shutdown | On startup |
| `data/shops/{shop}.json` | Shop inventory state | On shop changes | On startup |

These files use same JSON format as entity data but represent transient game state.

## Schema Migration

Player schema evolves over time. Migration happens during load:

```javascript
// In PlayerDB.load()
for (const username in this.players) {
  const player = this.players[username];

  // Migrate inventory format
  if (player.inventory) {
    player.inventory = InventorySerializer.migrateInventory(player.inventory);
  }

  // Migrate stats format
  if (player.stats && !player.baseStats) {
    player.baseStats = { ...player.stats };
  }
}
```

Migrations are additive and backward-compatible. Old player data gains new fields with defaults, never loses fields.

## Data Validation

Critical validation points:

| Validation | Location | Check |
|------------|----------|-------|
| Player creation | PlayerDB.createPlayer() | Username uniqueness, password strength |
| Room exits | World.loadRealm() | Destination rooms exist |
| NPC abilities | Combat system | Required fields present |
| Item registration | ItemRegistry.registerItem() | Required fields, unique ID |
| Inventory capacity | InventoryManager.addItem() | Weight limit, slot availability |

Invalid data logs warnings but doesn't crash server. Defensive coding handles missing fields with sensible defaults.

## See Also

- [Item System](../systems/item-system.md) - Item definition and instance architecture
- [Combat Overview](../systems/combat-overview.md) - Combat stats and calculations
- [Creating NPCs Pattern](../patterns/creating-npcs.md) - How to define NPC schemas
