---
title: Combat Flow Architecture
status: current
last_updated: 2025-11-10
related: [combat-overview, command-system, timer-system, event-system]
---

# Combat Flow Architecture

The Wumpy combat system implements turn-based D20 combat using a three-tier architecture: CombatEngine (orchestrator), CombatEncounter (encounter manager), and combat modules (resolvers, AI, messages). Combat runs on a 3-second tick interval, processes active encounters, handles initiative, resolves attacks, manages death, creates corpses, and awards XP.

## Overview

Combat is initiated by the `attack` command, which creates a CombatEncounter and registers it with the CombatEngine. The engine runs a 3-second interval loop that calls `executeCombatRound()` on each active encounter. Encounters manage turn order, execute attacks for each participant, apply damage, check for death, and end when one side is defeated.

The system integrates with CorpseManager for corpse creation, RespawnManager for NPC respawn, XpSystem for experience awards, and EquipmentManager for dual-wielding and weapon stats.

## Core Architecture

| Component | Purpose | Location |
|-----------|---------|----------|
| **CombatEngine** | Orchestrates all combat encounters | `/src/combat/combatEngine.js` |
| **CombatEncounter** | Manages a single combat instance | `/src/combat/CombatEncounter.js` |
| **combatResolver** | Handles attack/damage rolls | `/src/combat/combatResolver.js` |
| **initiative** | Determines turn order | `/src/combat/initiative.js` |
| **combatAI** | NPC decision-making (attack/flee) | `/src/combat/combatAI.js` |
| **combatMessages** | Generates combat messages | `/src/combat/combatMessages.js` |
| **damageTypes** | Damage type definitions | `/src/combat/damageTypes.js` |

## Combat Initiation Flow

```
Player: "attack goblin"
    ↓
attack command execute()
    ↓
Lookup NPC in room by keywords
    ↓
Check if NPC is dead (skip if isDead())
    ↓
Retaliation logic (set NPC aggressive if timidity check fails)
    ↓
combatEngine.initiateCombat([player, npc])
    ↓
new CombatEncounter(participants, world, allPlayers, playerDB)
    ↓
determineTurnOrder(participants)
    - Roll initiative (1d20 + DEX modifier)
    - Sort by initiative (highest first)
    ↓
Store encounter in activeCombats array
    ↓
encounter.initiateCombat()
    - Broadcast "Combat has begun!"
    ↓
Combat round loop begins (next 3s tick)
```

The CombatEngine stores a reference to the encounter and processes it every 3 seconds until `encounter.isActive` becomes false.

## CombatEngine Architecture

CombatEngine is a singleton class instantiated in `/src/server.js`:

```javascript
class CombatEngine {
  constructor(world, allPlayers, playerDB) {
    this.world = world;
    this.allPlayers = allPlayers;
    this.playerDB = playerDB;
    this.activeCombats = [];

    setInterval(() => {
      this.processCombatRounds();
    }, 3000); // 3-second tick
  }

  initiateCombat(participants) {
    const encounter = new CombatEncounter(...);
    this.activeCombats.push(encounter);
    encounter.initiateCombat();
  }

  processCombatRounds() {
    for (const encounter of this.activeCombats) {
      if (encounter.isActive) {
        encounter.executeCombatRound();
      }
    }
    this.activeCombats = this.activeCombats.filter(e => e.isActive);
  }
}
```

The engine processes all active encounters each tick and filters out inactive encounters. Multiple combats can run simultaneously in different rooms.

## CombatEncounter Architecture

Each encounter manages a single combat instance:

| Property | Type | Purpose |
|----------|------|---------|
| `participants` | Array\<Entity\> | Combatants (players/NPCs) in initiative order |
| `world` | World | World reference for room data |
| `allPlayers` | Set\<Player\> | All connected players (for broadcasts) |
| `playerDB` | PlayerDB | Player persistence |
| `turn` | number | Current round number |
| `isActive` | boolean | Combat status (true = ongoing) |
| `roomId` | string | Room where combat takes place |

Key methods:

| Method | Purpose | When Called |
|--------|---------|-------------|
| `initiateCombat()` | Broadcast start message | Once at creation |
| `executeCombatRound()` | Process one round of attacks | Every 3s by engine |
| `endCombat()` | Award XP, create corpses, broadcast end | When one side wins |
| `handlePlayerDeath()` | Set ghost status, create player corpse | When player HP reaches 0 |
| `removeNPCFromRoom()` | Create NPC corpse, remove from room | When NPC HP reaches 0 |
| `broadcast()` | Send message to all in room | Throughout combat |

## Combat Round Execution Flow

```
CombatEngine tick (every 3s)
    ↓
For each active encounter:
    ↓
executeCombatRound()
    ↓
Increment turn counter
    ↓
For each participant (in initiative order):
    ↓
    Check if attacker isDead()
        - If yes: SKIP to next participant
    ↓
    Find target (first living opponent)
        - If no target: END COMBAT
    ↓
    If attacker is NPC:
        ↓
        determineNPCAction(attacker, encounter)
            - Returns 'attack' or 'flee'
        ↓
        If action='flee':
            ↓
            Player gets attack of opportunity
            ↓
            If NPC survives: Move NPC to adjacent room
            ↓
            END COMBAT
    ↓
    rollAttack(attacker, target)
        - Roll 1d20 + attacker proficiency + STR/DEX mod
        - Compare to target AC
        - Critical: nat 20, Fumble: nat 1
        - Returns: { hit: bool, critical: bool }
    ↓
    Broadcast attack message
    ↓
    If hit:
        ↓
        getDamageDice(attacker)
            - Returns weapon damage dice (e.g., "1d8")
        ↓
        rollDamage(attacker, damageDice, critical)
            - Roll damage dice
            - If critical: roll damage dice twice
            - Add STR/DEX modifier
            - Returns: damage number
        ↓
        applyDamage(target, damage, damageType)
            - Apply resistances/vulnerabilities
            - Subtract from target HP
            - Returns: { finalDamage, dead: bool }
        ↓
        Broadcast damage message
        ↓
        If target dead:
            ↓
            Broadcast death message
            ↓
            If target is player:
                ↓
                handlePlayerDeath(player, killer)
            ↓
            END COMBAT
    ↓
    Check for dual wield (EquipmentManager.isDualWielding())
        ↓
        If yes: Execute off-hand attack
            - Same flow as main attack
            - Uses off_hand weapon stats
            - Prefix messages with "[Off-Hand]"
    ↓
Next participant
    ↓
Round complete
```

## Initiative System

Initiative determines action order each combat:

| Step | Process | Example |
|------|---------|---------|
| 1. Roll initiative | 1d20 + DEX modifier for each participant | Player: 1d20+2=15, Goblin: 1d20+1=8 |
| 2. Sort descending | Highest initiative acts first | [Player(15), Goblin(8)] |
| 3. Store order | Saved in encounter.participants | Fixed for entire combat |

Initiative is rolled ONCE at combat start and determines turn order for all rounds. NPCs and players use the same formula: `1d20 + Math.floor((dexterity - 10) / 2)`.

## Attack & Damage Resolution

Attack: `1d20 + proficiency + ability mod` vs target AC. Natural 20 = critical, natural 1 = fumble (auto-miss).

Damage: `roll(damageDice) + ability mod + weapon bonus`. Critical = roll damage twice. Resistances multiply final damage (vulnerable 2.0x, resistant 0.5x, immune 0.0x).

Proficiency bonus: `Math.floor((level - 1) / 4) + 2`.

## NPC AI System

NPCs use simple AI to choose actions each turn:

```javascript
function determineNPCAction(npc, encounter) {
  const threshold = npc.fleeThreshold || 0.25;
  const hpPercent = npc.hp / npc.maxHp;

  if (hpPercent <= threshold && Math.random() < 0.5) {
    return 'flee'; // Low HP → 50% chance to flee
  }

  return 'attack'; // Default action
}
```

| NPC Property | Default | Behavior |
|--------------|---------|----------|
| `fleeThreshold` | 0.25 | HP % below which flee is considered |
| `aggressive` | false | Set to true if attacked by player |
| `timidity` | 0.5 | Chance to NOT retaliate when attacked |

When NPC flees:
1. Player gets attack of opportunity (free attack)
2. If NPC survives, it moves to random adjacent room
3. Combat ends
4. Players in destination room see arrival message

## Death Handling

**Player Death**: Set isGhost=true, create player corpse (30min decay) with inventory, broadcast death messages. Ghosts cannot attack/be attacked.

**NPC Death**: Create NPC corpse (5min decay) with loot, remove from room, award XP to killer. Corpse decay triggers respawn via RespawnManager event listener.

## Dual Wielding

Players with weapons in both main_hand and off_hand get two attacks per round:

| Attack | Hand | Damage Modifier | Message Prefix |
|--------|------|-----------------|----------------|
| First | main_hand | Full | (none) |
| Second | off_hand | Full | "[Off-Hand]" |

Both attacks use the same resolution flow but query different weapon slots. EquipmentManager provides `isDualWielding(player)` check and slot-specific damage dice via `getDamageDice(attacker, 'off_hand')`.

## Combat Messages

All combat messages are generated by combatMessages.js:

| Message Type | Function | Example Output |
|--------------|----------|----------------|
| Attack hit | `getAttackMessage(attacker, target, true, false)` | "Goblin swings at you!" |
| Attack miss | `getAttackMessage(attacker, target, false, false)` | "Goblin swings wildly and misses!" |
| Critical hit | `getAttackMessage(attacker, target, true, true)` | "Goblin delivers a CRITICAL strike!" |
| Damage dealt | `getDamageMessage(damage, type, target)` | "You take 15 physical damage!" |
| Death | `getDeathMessage(entity)` | "Goblin collapses lifeless to the ground!" |

Messages use color coding from `/src/colors.js`: `colors.hit()`, `colors.miss()`, `colors.critical()`, etc.

## XP Award System

XP formula: `baseXP = npc.level * 10`, then apply level difference modifier (bonus for harder, penalty for easier). Award via `awardXP(player, xp, 'combat', playerDB)`, check for level up, save to DB. Example: Level 3 player defeats level 5 goblin → 50 base + 10 bonus = 60 XP.

## Combat State Management

CombatEncounter tracks state through properties:

| Property | Initial Value | When Changed |
|----------|---------------|--------------|
| `isActive` | true | Set to false in endCombat() |
| `turn` | 0 | Incremented each round |
| `participants` | [sorted by initiative] | Never changes mid-combat |
| `roomId` | player.currentRoom | Set at creation, used for broadcasts |

The CombatEngine filters inactive encounters after each tick:

```javascript
this.activeCombats = this.activeCombats.filter(e => e.isActive);
```

This ensures memory cleanup and prevents processing ended combats.

## Broadcasting System

All combat messages broadcast to everyone in the room via `broadcast(message)`. Spectators can watch combat. Messages include start/end, attacks, damage, death, flee attempts, corpse creation.

## Integration Points

Combat integrates with multiple Wumpy systems:

| System | Integration | Example |
|--------|-------------|---------|
| **CorpseManager** | Create corpses on death | `CorpseManager.createNPCCorpse()` |
| **RespawnManager** | NPCs respawn when corpse decays | Event-driven via CorpseManager |
| **XpSystem** | Award XP on victory | `awardXP(player, xp, 'combat')` |
| **EquipmentManager** | Check dual wield, get weapon stats | `isDualWielding()`, `getDamageDice()` |
| **PlayerDB** | Save XP, ghost status, level | `playerDB.updatePlayerGhostStatus()` |
| **World** | Room data, NPC management | `world.getRoom()`, `world.getNPC()` |

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Initiate combat | O(n log n) | n = participants (initiative sort) |
| Execute round | O(n * m) | n = participants, m = attacks per participant |
| Broadcast message | O(p) | p = players in room (~5 max) |
| Find target | O(n) | n = participants (~2-4 max) |
| Filter inactive | O(c) | c = active combats (~10 max) |

The 3-second tick interval limits combat throughput. With 100 players in 50 combats, the engine processes ~50 encounters every 3 seconds, averaging ~17 encounters/second.

## See Also

- [Combat Overview](../systems/combat-overview.md) - Combat mechanics and stats
- [Corpse System](../systems/corpse-system.md) - Corpse creation and decay
- [Timer System Architecture](timer-system.md) - Event-driven timer management
- [Event System Architecture](event-system.md) - Event patterns in Wumpy
