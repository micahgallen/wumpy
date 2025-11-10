---
title: Creating NPCs
status: current
last_updated: 2025-11-10
related: [data-schemas, combat-overview, combat-flow]
---

# Creating NPCs

This guide walks through creating NPCs (Non-Player Characters) for Wumpy. NPCs are defined in JSON files in the `world/{realm}/npcs/` directory. They support combat, dialogue, behavior flags (roaming, merchant, kickable), and integration with combat, loot, and respawn systems.

## Quick Start

Creating an NPC requires three steps: define the NPC JSON file, place it in the realm's npcs directory, and add the NPC ID to room definitions.

### Basic Combat NPC

Create `/world/sesame_street/npcs/goblin.js`:

```json
{
  "id": "goblin",
  "name": "Goblin Scout",
  "description": "A small, green goblin with shifty eyes and a rusty dagger. It looks mean and hungry.",
  "keywords": ["goblin", "scout", "green"],
  "level": 2,
  "hp": 25,
  "abilities": {
    "str": 12,
    "dex": 14,
    "con": 12,
    "int": 8,
    "wis": 10,
    "cha": 6
  },
  "ac": 13,
  "equippedWeapon": {
    "name": "Rusty Dagger",
    "damage": "1d4+1",
    "damageType": "physical"
  },
  "aggressive": false,
  "timidity": 0.3,
  "fleeThreshold": 0.25,
  "loot": {
    "lootTableId": "goblin_loot",
    "guaranteedItems": [],
    "currency": {
      "gold": { "min": 5, "max": 15 }
    }
  }
}
```

Add to room definition in `/world/sesame_street/rooms/dark_forest.js`:

```json
{
  "id": "dark_forest",
  "name": "Dark Forest Path",
  "description": "A shadowy forest path...",
  "exits": [...],
  "npcs": ["goblin"]
}
```

## Required Fields

All NPCs must define these fields:

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `id` | string | Unique identifier | "goblin" |
| `name` | string | Display name | "Goblin Scout" |
| `description` | string | Long description | "A small, green goblin..." |
| `keywords` | string[] | Targeting keywords | ["goblin", "scout", "green"] |
| `level` | number | Combat level | 2 |
| `hp` | number | Hit points (becomes maxHp) | 25 |

The `hp` field is converted to `maxHp` at runtime. Current HP starts at max.

## Combat Fields

For combat-enabled NPCs, define these fields:

| Field | Type | Required | Purpose | Example |
|-------|------|----------|---------|---------|
| `abilities` | object | Yes | Ability scores (D&D stats) | `{str: 12, dex: 14, ...}` |
| `ac` | number | Yes | Armor class | 13 |
| `equippedWeapon` | object | Yes | Weapon stats | `{name: "Claws", damage: "1d4"}` |
| `aggressive` | boolean | No | Auto-attack players on sight | false |
| `timidity` | number | No | Chance to NOT retaliate (0-1) | 0.3 |
| `fleeThreshold` | number | No | HP % to consider fleeing | 0.25 |

### Ability Scores

Define all six D&D ability scores:

```json
"abilities": {
  "str": 12,  // Strength - melee attack/damage
  "dex": 14,  // Dexterity - AC, initiative, ranged
  "con": 12,  // Constitution - HP scaling
  "int": 8,   // Intelligence - future spellcasting
  "wis": 10,  // Wisdom - perception, insight
  "cha": 6    // Charisma - social interactions
}
```

Standard array for balanced NPCs: [15, 14, 13, 12, 10, 8]

### Equipped Weapon

Define NPC weapon stats:

```json
"equippedWeapon": {
  "name": "Rusty Dagger",
  "damage": "1d4+1",        // Damage dice + static bonus
  "damageType": "physical"  // physical, fire, cold, etc.
}
```

Damage dice format: `{count}d{sides}+{bonus}` (e.g., "2d6+3" = roll 2d6 and add 3)

## Behavioral Fields

Control NPC behavior with these optional fields:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `aggressive` | boolean | false | Auto-attack players on sight |
| `timidity` | number | 0.5 | Chance to NOT retaliate when attacked (0-1) |
| `fleeThreshold` | number | 0.25 | HP % below which NPC may flee |
| `roaming` | boolean | false | Can move between rooms (future feature) |
| `is_merchant` | boolean | false | Shop NPC (disables combat) |
| `is_kickable` | boolean | false | Can be kicked (Wumpy interaction) |

### Timidity Examples

| Value | Behavior |
|-------|----------|
| 0.0 | Always retaliates when attacked |
| 0.3 | 70% chance to retaliate (30% timid) |
| 0.5 | 50% chance to retaliate (default) |
| 1.0 | Never retaliates (pacifist) |

### Flee Threshold Examples

| Value | Behavior |
|-------|----------|
| 0.0 | Never flees (fights to death) |
| 0.25 | May flee below 25% HP (default) |
| 0.5 | May flee below 50% HP (cautious) |
| 1.0 | May flee immediately (coward) |

When HP drops below threshold, NPC has 50% chance to flee each turn.

## Dialogue

Add dialogue for interaction commands:

```json
"dialogue": [
  "Grrr! Go away!",
  "The goblin eyes you suspiciously.",
  "Want shiny? Goblin has no shiny!",
  "*sniff sniff*"
]
```

Dialogue lines are selected randomly when players examine or interact with the NPC. At least 2-3 lines recommended for variety.

## Loot Configuration

Define what players get when they defeat the NPC:

```json
"loot": {
  "lootTableId": "goblin_loot",
  "guaranteedItems": ["goblin_ear"],
  "currency": {
    "gold": { "min": 5, "max": 15 },
    "silver": { "min": 0, "max": 10 }
  }
}
```

Loot tables are defined in `/world/{realm}/loot/` and specify random item drops with probabilities.

## Merchant NPCs

Shop NPCs use special flags and configuration:

```json
{
  "id": "shopkeeper",
  "name": "Mr. Hooper",
  "description": "A kindly shopkeeper...",
  "keywords": ["shopkeeper", "hooper", "merchant"],
  "level": 5,
  "hp": 100,
  "is_merchant": true,
  "dialogue": [
    "Welcome to my shop!",
    "Looking for supplies?",
    "Only the finest goods here!"
  ]
}
```

Merchant NPCs cannot be attacked. Shop inventory is defined separately in `/data/shops/{shop_id}.json`.

## Special NPCs: Kickable Wumpies

Wumpies are special NPCs with kick interactions:

```json
{
  "id": "red_wumpy",
  "name": "Red Wumpy",
  "description": "A small, round, aggressively red creature...",
  "keywords": ["wumpy", "red", "creature"],
  "level": 1,
  "hp": 20,
  "is_kickable": true,
  "roaming": true,
  "dialogue": ["Wump wump!", "*wump*"],
  "kick_responses": [
    "The Red Wumpy goes sailing through the air!",
    "Your foot connects with the Wumpy!"
  ],
  "apology_dialogue": [
    "Hey! That wasn't very nice!",
    "Say sorry or I'm going to... poof! Gone!"
  ]
}
```

Kickable NPCs trigger special interactions via the `kick` command. Wumpies have unique kick and apology mechanics.

## NPC Spawning

NPCs spawn when rooms are loaded. Define spawn locations in room files:

```json
{
  "id": "goblin_cave",
  "name": "Goblin Cave",
  "npcs": ["goblin", "goblin_chief"]
}
```

Multiple instances of the same NPC can exist by listing the ID multiple times:

```json
"npcs": ["goblin", "goblin", "goblin"]
```

## Respawn Mechanics

When an NPC dies:
1. Corpse created with loot (5 minute decay timer)
2. NPC removed from room
3. XP awarded to killer
4. When corpse decays: NPC respawns in original room

Respawn is automatic via the event-driven RespawnManager. No configuration needed.

## Combat Level Design

Balance NPC level against player levels:

| Level | HP Range | AC Range | Damage | Target Player Level |
|-------|----------|----------|--------|---------------------|
| 1 | 15-25 | 10-12 | 1d4 | 1-2 |
| 2-3 | 25-40 | 12-14 | 1d6 | 2-4 |
| 4-5 | 40-60 | 14-16 | 1d8 | 4-6 |
| 6-8 | 60-90 | 16-18 | 1d10 | 6-10 |
| 9+ | 90+ | 18+ | 2d6+ | 10+ |

Higher level = more HP, better AC, higher damage. Scale abilities to match level.

## Ability Score Guidelines

Assign ability scores based on NPC archetype:

| Archetype | Primary Stats | Example |
|-----------|---------------|---------|
| Brute | STR high, DEX low | Ogre: STR 18, DEX 8 |
| Rogue | DEX high, STR low | Thief: DEX 16, STR 10 |
| Tank | CON high | Guard: CON 16, AC 18 |
| Caster | INT/WIS high | Mage: INT 16, DEX 14 |
| Leader | CHA high | Chief: CHA 14, STR 16 |

Standard point buy: 27 points for abilities (8 = 0 points, 15 = 9 points)

## Testing NPCs

Test NPC behavior in-game:

```
1. Login to test server
2. Navigate to NPC room
3. "look" - verify NPC appears in room
4. "examine goblin" - verify description and stats
5. "attack goblin" - test combat
6. Verify death -> corpse creation -> respawn cycle
7. "loot corpse" - verify loot generation
```

Check server logs for errors during combat and respawn.

## Complete Example: Boss NPC

```json
{
  "id": "dragon_wyrmling",
  "name": "Red Dragon Wyrmling",
  "description": "A young red dragon with scales like molten rubies. Smoke curls from its nostrils as it eyes you hungrily. Despite its youth, it radiates deadly menace.",
  "keywords": ["dragon", "wyrmling", "red", "drake"],
  "level": 8,
  "hp": 120,
  "abilities": {
    "str": 18,
    "dex": 14,
    "con": 16,
    "int": 12,
    "wis": 11,
    "cha": 15
  },
  "ac": 17,
  "equippedWeapon": {
    "name": "Bite and Claws",
    "damage": "2d6+4",
    "damageType": "physical"
  },
  "resistances": {
    "fire": 0.0
  },
  "vulnerabilities": ["cold"],
  "aggressive": true,
  "timidity": 0.0,
  "fleeThreshold": 0.1,
  "dialogue": [
    "ROAR! You dare enter my lair?",
    "The dragon's eyes blaze with fury.",
    "I will feast on your bones, adventurer!"
  ],
  "loot": {
    "lootTableId": "dragon_hoard",
    "guaranteedItems": ["dragon_scale"],
    "currency": {
      "gold": { "min": 50, "max": 150 }
    }
  }
}
```

This boss NPC has high stats, fire immunity, guaranteed aggressive behavior, and rich loot.

## Common Pitfalls

| Issue | Problem | Solution |
|-------|---------|----------|
| Missing keywords | Players can't target NPC | Add common keywords: name, type, color |
| HP too low | NPC dies in 1 hit | Scale HP to level (level * 12-15) |
| AC too high | Players never hit | Keep AC = 10 + level + 2 for balance |
| Missing abilities | Combat breaks | Define all 6 ability scores |
| No weapon | NPC can't attack | Define equippedWeapon with damage dice |

## See Also

- [Data Schemas Architecture](../architecture/data-schemas.md) - NPC schema details
- [Combat Overview](../systems/combat-overview.md) - Combat mechanics
- [Combat Flow Architecture](../architecture/combat-flow.md) - How NPCs interact with combat system
