---
title: Creating Room Containers
category: patterns
tags: [containers, world-building, loot, items]
difficulty: intermediate
last_updated: 2025-11-11
---

# Creating Room Containers

Room containers are permanent, interactive storage objects in rooms that players can open, close, and loot. Unlike portable containers (like corpses or bags), room containers are fixed in place and part of the room's permanent fixtures.

## Quick Start

### Basic Container Example

Create a file: `world/sesame_street/objects/cookie_jar_kitchen.js`

```javascript
{
  "id": "cookie_jar_kitchen",
  "name": "a ceramic cookie jar",
  "description": "A large ceramic jar decorated with cheerful cookie designs. It looks like it might contain something delicious.",
  "keywords": ["jar", "cookie jar", "cookies", "ceramic"],

  "containerType": "room_container",
  "isRoomContainer": true,
  "isTakeable": false,
  "isExaminable": true,

  "isOpen": false,
  "isLocked": false,
  "capacity": 10,

  "lootConfig": {
    "spawnOnInit": true,
    "guaranteedItems": [
      {
        "itemId": "chocolate_chip_cookie",
        "quantity": 5,
        "chance": 100
      }
    ]
  }
}
```

### Add to Room

Edit your room file: `world/sesame_street/rooms/kitchen.js`

```javascript
{
  "id": "kitchen_01",
  "name": "Cozy Kitchen",
  "description": "A warm, inviting kitchen...",
  "exits": [...],
  "containers": ["cookie_jar_kitchen"]  // <-- Add this
}
```

That's it! The container will automatically:
- Appear in the room description
- Be openable/closable
- Spawn cookies when the server starts
- Support "get cookie from jar" commands

## Container Types

### Simple Storage Container

No loot spawning, just a place to store items:

```javascript
{
  "id": "wooden_crate_warehouse",
  "name": "a sturdy wooden crate",
  "description": "A plain wooden shipping crate with rope handles.",
  "keywords": ["crate", "box", "wooden crate"],

  "containerType": "room_container",
  "isRoomContainer": true,
  "isTakeable": false,

  "isOpen": true,    // Starts open
  "capacity": 15     // Can hold 15 items
}
```

### Locked Container

Requires a key to open:

```javascript
{
  "id": "safe_bank_vault",
  "name": "a massive iron safe",
  "description": "A heavy iron safe with a complex combination lock.",
  "keywords": ["safe", "vault", "iron safe"],

  "containerType": "room_container",
  "isRoomContainer": true,
  "isTakeable": false,

  "isLocked": true,
  "lockDifficulty": 20,
  "keyItemId": "vault_key_master",  // Requires this key

  "capacity": 30,

  "lootConfig": {
    "spawnOnInit": true,
    "guaranteedItems": [
      {
        "itemId": "gold_coins",
        "quantity": 100,
        "chance": 100
      }
    ]
  }
}
```

### Respawning Loot Container

Automatically refills after being looted:

```javascript
{
  "id": "treasure_chest_dungeon",
  "name": "an ornate treasure chest",
  "description": "A magnificent chest with golden hinges and intricate carvings.",
  "keywords": ["chest", "treasure chest", "treasure"],

  "containerType": "room_container",
  "isRoomContainer": true,
  "isTakeable": false,

  "isOpen": false,
  "capacity": 20,

  "lootConfig": {
    "spawnOnInit": true,
    "respawnOnEmpty": true,      // Respawns when emptied
    "respawnDelay": 300000,      // 5 minutes (in milliseconds)

    "guaranteedItems": [
      {
        "itemId": "health_potion",
        "quantity": 2,
        "chance": 80                // 80% chance to spawn
      }
    ],

    "randomItems": {
      "count": 3,                  // 3 random items
      "lootTable": "common_loot"   // From common loot table
    }
  }
}
```

## Loot Configuration

### Guaranteed Items

Items that always (or usually) spawn:

```javascript
"lootConfig": {
  "guaranteedItems": [
    {
      "itemId": "rusty_sword",
      "quantity": 1,
      "chance": 100        // Always spawns
    },
    {
      "itemId": "health_potion",
      "quantity": 3,
      "chance": 75         // 75% chance to spawn
    },
    {
      "itemId": "rare_gem",
      "quantity": 1,
      "chance": 10         // 10% chance to spawn
    }
  ]
}
```

### Random Loot Tables

Use the loot table system for variety:

```javascript
"lootConfig": {
  "randomItems": {
    "count": 5,                      // Generate 5 items
    "lootTable": "uncommon_loot"     // From uncommon loot table
  }
}
```

Available loot tables (see `itemsConfig.js`):
- `common_loot` - Basic items, low value
- `uncommon_loot` - Better items, moderate value
- `rare_loot` - Good items, higher value
- `epic_loot` - Excellent items, very high value
- `legendary_loot` - Amazing items, extremely high value
- `boss_drops` - Special boss loot
- `crafting_drops` - Materials and components

### Combining Both

Mix guaranteed and random loot:

```javascript
"lootConfig": {
  "spawnOnInit": true,
  "respawnOnEmpty": true,
  "respawnDelay": 600000,  // 10 minutes

  "guaranteedItems": [
    {
      "itemId": "quest_item_note",
      "quantity": 1,
      "chance": 100
    }
  ],

  "randomItems": {
    "count": 3,
    "lootTable": "rare_loot"
  }
}
```

## Interaction Hooks (Future)

Currently planned but not yet implemented:

```javascript
{
  "onOpen": {
    "message": "The chest creaks open dramatically.",
    "sound": "chest_open",
    "animation": "chest_lid_open",
    "trigger": {
      "type": "spawn_npc",
      "npcId": "angry_mimic"
    }
  },

  "onClose": {
    "message": "The chest closes with a satisfying click."
  },

  "onEmpty": {
    "message": "You've taken everything. The chest looks forlorn.",
    "despawnDelay": 60000  // Remove empty container after 1 minute
  },

  "onUnlock": {
    "message": "The lock clicks open!",
    "grantXP": 50
  }
}
```

## Container Properties Reference

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique container ID |
| `name` | string | Display name |
| `description` | string | Long description |
| `keywords` | array | Keywords for targeting |
| `containerType` | string | Must be `"room_container"` |
| `isRoomContainer` | boolean | Must be `true` |

### Container Behavior

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isTakeable` | boolean | `false` | Can be picked up (should be false) |
| `isExaminable` | boolean | `true` | Can be examined |
| `isOpen` | boolean | `false` | Starting state |
| `isLocked` | boolean | `false` | Starting lock state |
| `capacity` | number | 20 | Number of item slots |

### Lock Properties

| Property | Type | Description |
|----------|------|-------------|
| `lockDifficulty` | number | DC for lockpicking (future feature) |
| `keyItemId` | string | Item ID that unlocks this container |

### Loot Configuration

| Property | Type | Description |
|----------|------|-------------|
| `lootConfig.spawnOnInit` | boolean | Spawn loot when container created |
| `lootConfig.respawnOnEmpty` | boolean | Respawn loot when emptied |
| `lootConfig.respawnDelay` | number | Milliseconds before respawn |
| `lootConfig.guaranteedItems` | array | Always spawn these items |
| `lootConfig.randomItems` | object | Random loot configuration |

## Player Commands

Players interact with room containers using standard commands:

```
> look
You see an ornate treasure chest here.

> examine chest
An ornate treasure chest
A magnificent chest with golden hinges and intricate carvings.
It is closed.

> open chest
You open an ornate treasure chest.

> look chest
An ornate treasure chest
A magnificent chest with golden hinges and intricate carvings.
It is open.
Inside you see:
  - health potion
  - health potion
  - gold coins
  - silver ring

> get potion from chest
You take health potion from the an ornate treasure chest.
Weight: 5.2/300 lbs | Slots: 3/20

> get all from chest
You take everything from the an ornate treasure chest:
  - health potion
  - gold coins
  - silver ring
Weight: 8.7/300 lbs | Slots: 6/20

> close chest
You close an ornate treasure chest.
```

## Best Practices

### 1. Clear Keywords

Use multiple keywords so players can refer to the container naturally:

```javascript
"keywords": [
  "chest",           // Short form
  "treasure chest",  // Full name
  "treasure",        // Partial match
  "box",             // Alternative name
  "ornate chest"     // Descriptive variant
]
```

### 2. Descriptive Names

Use indefinite articles and descriptive adjectives:

```javascript
// Good
"name": "an ornate treasure chest"
"name": "a dusty old crate"
"name": "a locked iron safe"

// Avoid
"name": "chest"
"name": "Treasure Chest"
"name": "the chest"
```

### 3. Respawn Timing

Consider gameplay balance when setting respawn delays:

```javascript
// Quick respawn (5 minutes) - common items, high-traffic areas
"respawnDelay": 300000

// Medium respawn (15 minutes) - uncommon items, moderate rewards
"respawnDelay": 900000

// Long respawn (1 hour) - rare items, significant rewards
"respawnDelay": 3600000

// Very long respawn (24 hours) - epic/legendary items
"respawnDelay": 86400000
```

### 4. Capacity Planning

Set capacity based on expected use:

```javascript
// Small container - few items
"capacity": 5

// Medium container - typical loot
"capacity": 15

// Large container - storage or rich loot
"capacity": 30

// Massive container - guild storage, vaults
"capacity": 100
```

### 5. Loot Balance

Balance loot value with respawn rate and accessibility:

```javascript
// Low value, fast respawn, easy access
{
  "respawnDelay": 300000,
  "randomItems": { "count": 2, "lootTable": "common_loot" }
}

// High value, slow respawn, locked/guarded
{
  "isLocked": true,
  "respawnDelay": 3600000,
  "randomItems": { "count": 5, "lootTable": "epic_loot" }
}
```

## Common Patterns

### Quest Item Container

Container with a specific quest item that doesn't respawn:

```javascript
{
  "id": "desk_drawer_office",
  "name": "a locked desk drawer",
  "keywords": ["drawer", "desk", "desk drawer"],
  "containerType": "room_container",
  "isRoomContainer": true,

  "isLocked": true,
  "keyItemId": "desk_key",

  "lootConfig": {
    "spawnOnInit": true,
    "respawnOnEmpty": false,  // Only spawns once
    "guaranteedItems": [
      {
        "itemId": "secret_letter_quest",
        "quantity": 1,
        "chance": 100
      }
    ]
  }
}
```

### Donation Box / Collection Box

Always open, no loot, for players to deposit items:

```javascript
{
  "id": "donation_box_temple",
  "name": "a wooden donation box",
  "description": "A simple wooden box for offerings and donations.",
  "keywords": ["box", "donation box", "offering box"],

  "containerType": "room_container",
  "isRoomContainer": true,

  "isOpen": true,    // Always open
  "capacity": 50     // Large capacity for donations

  // No lootConfig - starts empty
}
```

### Mimic / Trapped Container

Container that spawns an enemy when opened (future feature):

```javascript
{
  "id": "mimic_chest_dungeon",
  "name": "a suspicious-looking chest",
  "description": "This chest looks oddly... alive?",
  "keywords": ["chest", "suspicious chest"],

  "containerType": "room_container",
  "isRoomContainer": true,

  "onOpen": {
    "trigger": {
      "type": "spawn_npc",
      "npcId": "angry_mimic",
      "combatOnSpawn": true
    },
    "message": "The chest suddenly grows teeth and lunges at you!"
  }
}
```

## Troubleshooting

### Container not appearing in room

1. Check container is in `world/*/objects/*.js`
2. Verify `"isRoomContainer": true` is set
3. Confirm `"containerType": "room_container"`
4. Check room file has `"containers": ["your_container_id"]`
5. Restart server to reload definitions

### Can't open container

1. Check if `"isLocked": true` - need key
2. Verify `"keyItemId"` matches an existing item
3. Player must have key in inventory
4. Try `unlock <container> with <key>` first (when implemented)

### Loot not spawning

1. Verify `"spawnOnInit": true` in lootConfig
2. Check item IDs in `guaranteedItems` exist in ItemRegistry
3. Confirm `lootTable` name is valid (see itemsConfig.js)
4. Check server logs for errors during loot generation

### Loot not respawning

1. Verify `"respawnOnEmpty": true` in lootConfig
2. Check `respawnDelay` is set (in milliseconds)
3. Confirm container is completely empty
4. Wait for respawn timer to complete
5. Check server logs for timer events

## See Also

- [Technical Design: Room Containers](/docs/systems/room-containers-design.md)
- [Item Systems Reference](/docs/reference/item-systems.md)
- [Creating Items (Basics)](/docs/wiki/patterns/creating-items-basics.md)
- [Loot System](/docs/systems/loot-system.md)
