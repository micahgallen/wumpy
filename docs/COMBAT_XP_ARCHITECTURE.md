# Combat and XP/Levelling System Architecture
**The Wumpy and Grift MUD**

**Version:** 1.0
**Last Updated:** November 2, 2025
**Author:** MUD Architect (Claude Code)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Design Philosophy](#design-philosophy)
3. [Core Mechanics Overview](#core-mechanics-overview)
4. [Data Structures](#data-structures)
5. [Combat System Architecture](#combat-system-architecture)
6. [XP and Levelling System](#xp-and-levelling-system)
7. [Damage Types and Resistances](#damage-types-and-resistances)
8. [Combat Formulas](#combat-formulas)
9. [State Management](#state-management)
10. [Integration Points](#integration-points)
11. [File Organization](#file-organization)
12. [Implementation Phases](#implementation-phases)
13. [Future Extensions](#future-extensions)

---

## Executive Summary

This document outlines a complete architectural plan for implementing a D20-based combat system and XP/levelling progression system for The Wumpy and Grift MUD. The design prioritizes:

- **Simplicity:** Easy to understand, play, and extend
- **Balance:** Fair and engaging combat that scales with level
- **Extensibility:** Clean interfaces for future guild/spell systems
- **Consistency:** D20 mechanics familiar to modern tabletop gamers
- **Fun:** Fast-paced, tactical combat with meaningful choices

The system is designed as a foundation that will support future features including guild-specific abilities, spell casting, equipment enchantments, and tactical combat mechanics.

---

## Design Philosophy

### Core Principles

1. **D20 Foundation:** All random mechanics use a 1d20 roll modified by stats and level
2. **Turn-Based Combat:** Predictable rounds with initiative order
3. **Elemental Variety:** Multiple damage types create tactical depth
4. **Progressive Scaling:** Stats and difficulty scale meaningfully with level
5. **No Spell Mechanics Yet:** Combat focuses on physical attacks; spells come later through guild system

### Inspiration Sources

- **D&D 5th Edition:** Bounded accuracy, advantage/disadvantage, saving throws
- **Classic MUDs:** Turn-based rounds, HP pools, level-based progression
- **Modern Design:** Clear feedback, meaningful choices, avoiding grinding

---

## Core Mechanics Overview

### Combat Flow (High-Level)
```
1. Player initiates combat with "attack [target]" or "kill [target]"
2. System checks if combat is valid (target exists, is attackable, not already in combat)
3. Initiative is rolled (1d20 + Dexterity modifier)
4. Combat proceeds in rounds with highest initiative acting first
5. Each combatant takes an action on their turn (attack, flee, use item)
6. Combat ends when one side dies or flees successfully
7. Winner gains XP; loser respawns (if NPC) or dies (player death mechanics)
```

### XP Flow (High-Level)
```
1. Player gains XP from:
   - Defeating NPCs (based on NPC level vs player level)
   - Completing quests (defined reward per quest)
2. XP accumulates toward next level threshold
3. On level-up:
   - Stats increase based on formula
   - Max HP increases
   - New abilities unlock (future: guild skills)
   - Player is notified
4. XP requirements scale exponentially with level
```

---

## Data Structures

### Player Combat Stats (Extended Player Object)

Add these properties to the existing `Player` class in `/Users/au288926/Documents/mudmud/src/server.js`:

```javascript
class Player {
  constructor(socket) {
    // ... existing properties ...

    // Core Stats (base 10, increase on level-up)
    this.strength = 10;      // Melee attack bonus, melee damage
    this.dexterity = 10;     // Initiative, AC, ranged attack bonus
    this.constitution = 10;  // HP calculation, fortitude saves
    this.intelligence = 10;  // Future: spell power (guild system)
    this.wisdom = 10;        // Future: spell resistance, perception
    this.charisma = 10;      // Future: persuasion, merchant prices

    // Combat Stats
    this.level = 1;
    this.xp = 0;
    this.hp = 20;            // Current HP
    this.maxHp = 20;         // Maximum HP (10 + (level * 5) + CON modifier)
    this.armorClass = 10;    // Base AC (10 + DEX modifier + equipment)

    // Resistances (0-100 percentage reduction)
    this.resistances = {
      physical: 0,
      fire: 0,
      ice: 0,
      lightning: 0,
      poison: 0,
      necrotic: 0,
      radiant: 0,
      psychic: 0
    };

    // Combat State
    this.inCombat = false;
    this.combatTarget = null;  // NPC ID or player username
    this.combatInitiative = 0;
    this.combatRoundActions = 0; // Actions taken this round
  }
}
```

### NPC Combat Data (Extended NPC Schema)

Update NPC definitions in `/Users/au288926/Documents/mudmud/world/sesame_street/npcs/*.js`:

```javascript
{
  "id": "example_npc",
  "name": "Example NPC",
  "description": "...",
  "keywords": ["..."],

  // Existing fields
  "level": 3,
  "hp": 30,  // This becomes maxHp

  // New combat fields
  "combatStats": {
    "strength": 12,
    "dexterity": 10,
    "constitution": 14,
    "intelligence": 8,
    "wisdom": 10,
    "charisma": 6
  },
  "armorClass": 13,
  "attackBonus": 3,  // Level-based or custom
  "damageType": "physical",  // Default damage type
  "damageDice": "1d6",       // Base damage dice
  "xpReward": 100,           // Base XP for defeating this NPC

  "resistances": {
    "physical": 0,
    "fire": 10,
    "ice": -20  // Negative = vulnerability
  },

  "attackMessages": [
    "{npc} claws at {target}!",
    "{npc} bites {target} viciously!",
    "{npc} strikes {target} with fury!"
  ],

  "deathMessages": [
    "{npc} collapses in a heap!",
    "{npc} lets out a final gasp and falls."
  ],

  // AI behavior flags
  "aggressive": false,       // Attacks players on sight
  "fleeThreshold": 0.2,      // Flees when HP below 20%
  "callsForHelp": false      // Future: summons nearby NPCs
}
```

### Combat State Object

Managed by the combat system, stored in a Map keyed by player username or NPC ID:

```javascript
class CombatEncounter {
  constructor(attacker, defender, attackerType, defenderType) {
    this.id = generateCombatId();
    this.attacker = attacker;      // Player or NPC object
    this.defender = defender;      // Player or NPC object
    this.attackerType = attackerType;  // 'player' or 'npc'
    this.defenderType = defenderType;  // 'player' or 'npc'

    this.round = 0;
    this.turn = null;  // Who acts this turn
    this.turnOrder = []; // Sorted by initiative
    this.combatLog = []; // History of actions this combat

    this.active = true;
    this.startTime = Date.now();
  }

  rollInitiative() {
    const attackerInit = rollD20() + getModifier(this.attacker.dexterity);
    const defenderInit = rollD20() + getModifier(this.defender.dexterity);

    this.turnOrder = [
      { combatant: this.attacker, type: this.attackerType, initiative: attackerInit },
      { combatant: this.defender, type: this.defenderType, initiative: defenderInit }
    ].sort((a, b) => b.initiative - a.initiative);

    this.turn = this.turnOrder[0];
  }

  nextTurn() {
    const currentIndex = this.turnOrder.indexOf(this.turn);
    const nextIndex = (currentIndex + 1) % this.turnOrder.length;

    if (nextIndex === 0) {
      this.round++;
    }

    this.turn = this.turnOrder[nextIndex];
  }
}
```

### XP Progression Table

Stored in `/Users/au288926/Documents/mudmud/src/xpTable.js`:

```javascript
// XP required to reach each level
// Formula: 1000 * (level ^ 1.5)
const XP_TABLE = {
  1: 0,
  2: 1000,      // 1000 * (2 ^ 1.5) ≈ 2828, simplified to 1000
  3: 3000,      // Cumulative
  4: 6000,
  5: 10000,
  6: 15000,
  7: 21000,
  8: 28000,
  9: 36000,
  10: 45000,
  11: 55000,
  12: 66000,
  13: 78000,
  14: 91000,
  15: 105000,
  20: 190000,
  25: 312000,
  30: 464000,
  // ... up to level 50 or max level
};

// Stat increases per level
const STAT_GAINS_PER_LEVEL = {
  hp: 5,           // +5 max HP per level
  primaryStat: 1,  // +1 to primary stat every 4 levels (future: class-based)
  allStats: 1      // +1 to all stats every 5 levels
};
```

---

## Combat System Architecture

### Module Structure

Create `/Users/au288926/Documents/mudmud/src/combat/` directory with:

```
src/combat/
├── combatEngine.js      - Main combat orchestrator
├── combatResolver.js    - Attack/damage resolution
├── damageTypes.js       - Damage type definitions and resistances
├── initiative.js        - Initiative and turn order
├── combatAI.js          - NPC combat behavior
└── combatMessages.js    - Combat text generation
```

### Combat Engine (`combatEngine.js`)

**Responsibilities:**
- Initiate combat between combatants
- Manage active combat encounters
- Execute combat rounds
- Handle turn progression
- Terminate combat (victory, defeat, flee)

**Key Functions:**
```javascript
/**
 * Initiate combat between attacker and defender
 * @param {Object} attacker - Player or NPC
 * @param {Object} defender - Player or NPC
 * @param {string} attackerType - 'player' or 'npc'
 * @param {string} defenderType - 'player' or 'npc'
 * @param {Object} world - World instance
 * @returns {CombatEncounter}
 */
function initiateCombat(attacker, defender, attackerType, defenderType, world)

/**
 * Execute a single combat round
 * @param {CombatEncounter} combat
 */
function executeCombatRound(combat)

/**
 * Process an attack action
 * @param {Object} attacker
 * @param {Object} defender
 * @param {CombatEncounter} combat
 */
function processAttack(attacker, defender, combat)

/**
 * End combat and clean up state
 * @param {CombatEncounter} combat
 * @param {string} outcome - 'victory', 'defeat', 'flee'
 */
function endCombat(combat, outcome)

/**
 * Check if a combatant can act (alive, not stunned, etc.)
 * @param {Object} combatant
 * @returns {boolean}
 */
function canAct(combatant)
```

### Combat Resolver (`combatResolver.js`)

**Responsibilities:**
- Calculate attack rolls
- Determine hits vs misses
- Calculate damage
- Apply damage with resistances
- Handle critical hits/misses

**Key Functions:**
```javascript
/**
 * Roll an attack against a target
 * @param {Object} attacker
 * @param {Object} defender
 * @param {string} damageType - Damage type for this attack
 * @returns {Object} { hit: boolean, roll: number, damage: number, critical: boolean }
 */
function rollAttack(attacker, defender, damageType = 'physical')

/**
 * Calculate attack bonus for a combatant
 * @param {Object} combatant
 * @param {string} damageType
 * @returns {number}
 */
function getAttackBonus(combatant, damageType)

/**
 * Roll damage for an attack
 * @param {Object} attacker
 * @param {string} damageDice - e.g., '1d6', '2d8+3'
 * @param {boolean} critical - Is this a critical hit?
 * @returns {number}
 */
function rollDamage(attacker, damageDice, critical = false)

/**
 * Apply damage to a target, accounting for resistances
 * @param {Object} target
 * @param {number} rawDamage
 * @param {string} damageType
 * @returns {number} Actual damage dealt
 */
function applyDamage(target, rawDamage, damageType)

/**
 * Calculate armor class for a combatant
 * @param {Object} combatant
 * @returns {number}
 */
function getArmorClass(combatant)
```

### Damage Types (`damageTypes.js`)

**Damage Type Registry:**
```javascript
const DAMAGE_TYPES = {
  physical: {
    name: 'Physical',
    description: 'Slashing, piercing, and bludgeoning damage from weapons',
    color: 'brightRed',
    icon: '⚔️'
  },
  fire: {
    name: 'Fire',
    description: 'Burning damage from flames and heat',
    color: 'brightYellow',
    icon: '🔥'
  },
  ice: {
    name: 'Ice',
    description: 'Freezing damage from cold and frost',
    color: 'brightCyan',
    icon: '❄️'
  },
  lightning: {
    name: 'Lightning',
    description: 'Electrical damage from storms and energy',
    color: 'brightBlue',
    icon: '⚡'
  },
  poison: {
    name: 'Poison',
    description: 'Toxic damage from venoms and toxins',
    color: 'green',
    icon: '☠️'
  },
  necrotic: {
    name: 'Necrotic',
    description: 'Death magic that withers and decays',
    color: 'magenta',
    icon: '💀'
  },
  radiant: {
    name: 'Radiant',
    description: 'Holy light that sears the wicked',
    color: 'brightWhite',
    icon: '✨'
  },
  psychic: {
    name: 'Psychic',
    description: 'Mental damage that assaults the mind',
    color: 'brightMagenta',
    icon: '🧠'
  }
};

/**
 * Calculate effective damage after resistance
 * @param {number} rawDamage
 * @param {string} damageType
 * @param {Object} resistances - { physical: 10, fire: -20, ... }
 * @returns {number}
 */
function calculateResistance(rawDamage, damageType, resistances) {
  const resistance = resistances[damageType] || 0;

  // Resistance is a percentage reduction (0-100)
  // Negative resistance = vulnerability (takes more damage)
  const multiplier = 1 - (resistance / 100);

  return Math.max(0, Math.floor(rawDamage * multiplier));
}
```

### Initiative System (`initiative.js`)

**Responsibilities:**
- Roll initiative for combatants
- Determine turn order
- Handle initiative ties

```javascript
/**
 * Roll initiative for a combatant
 * @param {Object} combatant
 * @returns {number}
 */
function rollInitiative(combatant) {
  const dexMod = getModifier(combatant.dexterity);
  return rollD20() + dexMod;
}

/**
 * Determine turn order for all combatants
 * @param {Array} combatants - Array of {combatant, type}
 * @returns {Array} Sorted by initiative (high to low)
 */
function determineTurnOrder(combatants) {
  return combatants
    .map(c => ({
      ...c,
      initiative: rollInitiative(c.combatant)
    }))
    .sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      // Tie-breaker: higher dexterity goes first
      return b.combatant.dexterity - a.combatant.dexterity;
    });
}
```

### Combat AI (`combatAI.js`)

**Responsibilities:**
- NPC decision-making during combat
- Flee logic
- Target selection (future: multi-combatant)

```javascript
/**
 * Determine NPC action for this turn
 * @param {Object} npc
 * @param {CombatEncounter} combat
 * @returns {string} Action to take: 'attack', 'flee', 'use_item'
 */
function determineNPCAction(npc, combat) {
  // Check flee threshold
  const hpPercent = npc.hp / npc.maxHp;
  if (hpPercent <= (npc.fleeThreshold || 0.1)) {
    return 'flee';
  }

  // Future: Check for items to use
  // Future: Check for special abilities

  // Default: attack
  return 'attack';
}

/**
 * Execute NPC turn
 * @param {Object} npc
 * @param {CombatEncounter} combat
 */
function executeNPCTurn(npc, combat) {
  const action = determineNPCAction(npc, combat);

  switch (action) {
    case 'attack':
      processAttack(npc, combat.getOpponent(npc), combat);
      break;
    case 'flee':
      attemptFlee(npc, combat);
      break;
    // Future: 'use_item', 'special_ability'
  }
}
```

### Combat Messages (`combatMessages.js`)

**Responsibilities:**
- Generate dynamic combat text
- Colorize output
- Provide variety in combat descriptions

```javascript
/**
 * Get a random attack message
 * @param {Object} attacker
 * @param {Object} defender
 * @param {boolean} hit
 * @param {boolean} critical
 * @returns {string}
 */
function getAttackMessage(attacker, defender, hit, critical) {
  const attackerName = attacker.username || attacker.name;
  const defenderName = defender.username || defender.name;

  if (critical) {
    return colors.critical(`${attackerName} lands a CRITICAL HIT on ${defenderName}!`);
  }

  if (hit) {
    const messages = [
      `${attackerName} strikes ${defenderName}!`,
      `${attackerName} hits ${defenderName} solidly!`,
      `${attackerName} lands a blow on ${defenderName}!`
    ];
    return colors.hit(messages[Math.floor(Math.random() * messages.length)]);
  } else {
    const messages = [
      `${attackerName} swings at ${defenderName} but misses!`,
      `${defenderName} dodges ${attackerName}'s attack!`,
      `${attackerName}'s attack goes wide!`
    ];
    return colors.miss(messages[Math.floor(Math.random() * messages.length)]);
  }
}

/**
 * Get damage message with type-specific coloring
 * @param {number} damage
 * @param {string} damageType
 * @returns {string}
 */
function getDamageMessage(damage, damageType) {
  const typeInfo = DAMAGE_TYPES[damageType];
  const colorFn = colors[typeInfo.color] || colors.damage;
  return colorFn(`${damage} ${typeInfo.name} damage!`);
}
```

---

## XP and Levelling System

### Module Structure

Create `/Users/au288926/Documents/mudmud/src/progression/` directory:

```
src/progression/
├── xpSystem.js        - XP gain and level-up logic
├── xpTable.js         - Level thresholds and progression data
└── statProgression.js - Stat increase formulas
```

### XP System (`xpSystem.js`)

**Responsibilities:**
- Award XP from combat and quests
- Track XP totals
- Trigger level-ups
- Calculate XP rewards

**Key Functions:**
```javascript
/**
 * Award XP to a player
 * @param {Object} player
 * @param {number} xpAmount
 * @param {string} source - 'combat', 'quest', 'discovery'
 * @param {Object} playerDB
 */
function awardXP(player, xpAmount, source, playerDB) {
  player.xp += xpAmount;

  player.send(colors.xpGain(`You gain ${xpAmount} XP! (${source})`));

  // Check for level-up
  checkLevelUp(player, playerDB);

  // Persist
  playerDB.updatePlayerXP(player.username, player.xp);
}

/**
 * Check if player should level up and process if so
 * @param {Object} player
 * @param {Object} playerDB
 */
function checkLevelUp(player, playerDB) {
  const nextLevelXP = getXPForLevel(player.level + 1);

  if (player.xp >= nextLevelXP) {
    levelUp(player, playerDB);

    // Check again in case of multi-level gains
    checkLevelUp(player, playerDB);
  }
}

/**
 * Process a level-up
 * @param {Object} player
 * @param {Object} playerDB
 */
function levelUp(player, playerDB) {
  player.level++;

  // Increase stats
  const statGains = calculateStatGains(player);
  applyStatGains(player, statGains);

  // Full heal on level-up
  player.hp = player.maxHp;

  // Notify player
  const levelUpMessage = `
${colors.levelUp('━'.repeat(60))}
${colors.levelUp('LEVEL UP!')} You are now level ${colors.highlight(player.level)}!

${colors.statGain(`Max HP: ${player.maxHp - statGains.hp} → ${player.maxHp} (+${statGains.hp})`)}
${formatStatGains(statGains)}

${colors.hint('You have been fully healed!')}
${colors.levelUp('━'.repeat(60))}
`;

  player.send(levelUpMessage);

  // Persist
  playerDB.updatePlayerLevel(player.username, player.level, player.maxHp, player.hp);
}

/**
 * Calculate XP reward for defeating an NPC
 * @param {Object} npc
 * @param {number} playerLevel
 * @returns {number}
 */
function calculateCombatXP(npc, playerLevel) {
  const baseXP = npc.xpReward || (npc.level * 50);
  const levelDiff = npc.level - playerLevel;

  // Scale XP based on level difference
  // +20% per level above player, -20% per level below (min 10%)
  let multiplier = 1 + (levelDiff * 0.2);
  multiplier = Math.max(0.1, Math.min(2.0, multiplier));

  return Math.floor(baseXP * multiplier);
}

/**
 * Get XP required for a specific level
 * @param {number} level
 * @returns {number}
 */
function getXPForLevel(level) {
  return XP_TABLE[level] || (XP_TABLE[50] * 2); // Max level fallback
}

/**
 * Get XP needed for next level
 * @param {Object} player
 * @returns {number}
 */
function getXPToNextLevel(player) {
  const nextLevelXP = getXPForLevel(player.level + 1);
  return nextLevelXP - player.xp;
}
```

### Stat Progression (`statProgression.js`)

**Responsibilities:**
- Calculate stat increases on level-up
- Apply stat gains to player
- Balance progression curve

```javascript
/**
 * Calculate stat gains for a level-up
 * @param {Object} player
 * @returns {Object} { hp, strength, dexterity, ... }
 */
function calculateStatGains(player) {
  const gains = {
    hp: 5,  // Always +5 HP per level
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0
  };

  // Every 4 levels: +1 to primary stat (future: class-based)
  // For now, let players choose or distribute evenly
  if (player.level % 4 === 0) {
    // Future: Choose primary stat based on guild/class
    // For now: +1 to STR and DEX alternating
    if (player.level % 8 === 0) {
      gains.strength = 1;
    } else {
      gains.dexterity = 1;
    }
  }

  // Every 5 levels: +1 to constitution
  if (player.level % 5 === 0) {
    gains.constitution = 1;
  }

  return gains;
}

/**
 * Apply stat gains to player
 * @param {Object} player
 * @param {Object} gains
 */
function applyStatGains(player, gains) {
  player.maxHp += gains.hp;
  player.strength += gains.strength;
  player.dexterity += gains.dexterity;
  player.constitution += gains.constitution;
  player.intelligence += gains.intelligence;
  player.wisdom += gains.wisdom;
  player.charisma += gains.charisma;
}

/**
 * Calculate ability modifier from stat value
 * @param {number} statValue
 * @returns {number}
 */
function getModifier(statValue) {
  return Math.floor((statValue - 10) / 2);
}
```

---

## Damage Types and Resistances

### Damage Type System

All attacks deal one of eight damage types:

| Type | Common Sources | Strategic Use |
|------|----------------|---------------|
| **Physical** | Weapons, unarmed strikes | Universal, no special properties |
| **Fire** | Flaming weapons, fire spells | Burns over time (future), high burst damage |
| **Ice** | Frost weapons, ice spells | Slows targets (future), area control |
| **Lightning** | Storm weapons, shock spells | Chain damage (future), high single-target |
| **Poison** | Poisoned weapons, toxins | Damage over time, bypasses armor (future) |
| **Necrotic** | Dark magic, undead attacks | Life drain (future), anti-healing |
| **Radiant** | Holy weapons, light spells | Bonus vs undead/demons, cleansing |
| **Psychic** | Mind powers, eldritch attacks | Bypasses physical armor, confusion (future) |

### Resistance Mechanics

Resistances are percentage-based:
- **0%:** Normal damage
- **25%:** Resistant (takes 75% damage)
- **50%:** Highly resistant (takes 50% damage)
- **-25%:** Vulnerable (takes 125% damage)
- **-50%:** Highly vulnerable (takes 150% damage)

**Example:**
```javascript
// NPC with 25% fire resistance takes fire damage
const rawDamage = 20;
const resistance = 25;
const actualDamage = 20 * (1 - 0.25) = 15 damage

// NPC with -20% ice vulnerability takes ice damage
const rawDamage = 20;
const resistance = -20;
const actualDamage = 20 * (1 - (-0.20)) = 24 damage
```

Resistances come from:
- **Base resistances:** Defined per NPC/player race (future)
- **Equipment:** Armor and accessories
- **Buffs/Debuffs:** Temporary from spells (future)
- **Environmental:** Room effects (future)

---

## Combat Formulas

### Attack Roll Formula

```
Attack Roll = 1d20 + Attack Bonus
Attack Bonus = Proficiency Bonus + Ability Modifier + Equipment Bonus

Proficiency Bonus = floor(level / 4) + 1
  - Level 1-3: +1
  - Level 4-7: +2
  - Level 8-11: +3
  - Level 12-15: +4
  - etc.

Ability Modifier = floor((Stat - 10) / 2)
  - Melee attacks: Strength modifier
  - Ranged attacks: Dexterity modifier
  - Spell attacks (future): Intelligence/Wisdom modifier

Equipment Bonus = Weapon bonus (future)

Hit if: Attack Roll >= Target AC
Critical Hit if: Natural 20 (roll shows 20 before modifiers)
Critical Miss if: Natural 1 (roll shows 1 before modifiers)
```

### Damage Formula

```
Base Damage = Damage Dice + Damage Bonus
Damage Dice = Weapon dice (e.g., 1d6, 2d8) or unarmed (1d4)
Damage Bonus = Ability Modifier + Equipment Bonus

Critical Hit Damage = Roll damage dice twice, then add bonuses once

Final Damage = applyResistance(Base Damage, Damage Type, Target Resistances)
```

### Armor Class (AC) Formula

```
AC = Base AC + Dexterity Modifier + Armor Bonus + Shield Bonus

Base AC = 10
Dexterity Modifier = floor((DEX - 10) / 2)
Armor Bonus = Armor value (future equipment)
Shield Bonus = +2 if shield equipped (future)

Example:
- Unarmored, 14 DEX: AC = 10 + 2 = 12
- Leather armor (+2), 16 DEX: AC = 10 + 3 + 2 = 15
- Plate armor (+8), 10 DEX: AC = 10 + 0 + 8 = 18
```

### Initiative Formula

```
Initiative = 1d20 + Dexterity Modifier

Tie-breaker: Higher Dexterity acts first
```

### HP Formula

```
Max HP = Base HP + (Level * HP per Level) + Constitution Modifier

Base HP = 10
HP per Level = 5
Constitution Modifier = floor((CON - 10) / 2) * Level

Example:
- Level 1, 10 CON: HP = 10 + (1 * 5) + 0 = 15
- Level 5, 14 CON: HP = 10 + (5 * 5) + (2 * 5) = 45
- Level 10, 18 CON: HP = 10 + (10 * 5) + (4 * 10) = 100
```

### Flee Success Formula

```
Flee Roll = 1d20 + Dexterity Modifier
DC = 10 + (Opponent Level / 2)

Success if: Flee Roll >= DC

On success: Combat ends, no XP gained, moved to random adjacent room
On failure: Opponent gets opportunity attack, combat continues
```

---

## State Management

### Player Combat State

Track combat state on Player object:

```javascript
// Player in combat
player.inCombat = true;
player.combatTarget = 'blue_wumpy'; // NPC ID
player.combatInitiative = 15;

// Player not in combat
player.inCombat = false;
player.combatTarget = null;
player.combatInitiative = 0;
```

### Global Combat Registry

Maintain active combats in a Map:

```javascript
// In server.js or combatEngine.js
const activeCombats = new Map();

// Key: player username or NPC ID
// Value: CombatEncounter instance
activeCombats.set('alice', combatEncounter);

// Check if entity is in combat
function isInCombat(identifier) {
  return activeCombats.has(identifier);
}

// Get combat for entity
function getCombat(identifier) {
  return activeCombats.get(identifier);
}
```

### Combat State Persistence

Combat state is **NOT** persisted across server restarts. If server crashes mid-combat:
- Player is removed from combat
- NPC respawns with full HP
- Player retains current HP (may need healing)

Rationale: Prevents exploit of disconnecting to escape combat, keeps combat transient and immediate.

### NPC Respawn After Combat

When NPC is defeated:
1. Remove NPC from room
2. Schedule respawn via RespawnService (already implemented)
3. NPC respawns with full HP at spawn location after timer (default: 5 minutes)

---

## Integration Points

### Integration with Existing Systems

#### 1. Player Object (`src/server.js`)

**Changes needed:**
- Add combat stats properties to Player constructor
- Add methods: `takeDamage()`, `heal()`, `isDead()`, `getCombatStats()`
- Persist new properties in playerDB

#### 2. PlayerDB (`playerdb.js`)

**New methods needed:**
```javascript
updatePlayerXP(username, xp)
updatePlayerLevel(username, level, maxHp, hp)
updatePlayerStats(username, stats)
updatePlayerHP(username, hp)
```

**Schema changes:**
Add to player save data:
```javascript
{
  "username": "alice",
  "passwordHash": "...",
  "description": "...",
  "currentRoom": "...",
  "inventory": [],

  // New fields
  "level": 5,
  "xp": 12000,
  "hp": 40,
  "maxHp": 45,
  "stats": {
    "strength": 12,
    "dexterity": 14,
    "constitution": 13,
    "intelligence": 10,
    "wisdom": 10,
    "charisma": 8
  },
  "resistances": {
    "physical": 0,
    "fire": 5,
    // ...
  }
}
```

#### 3. Commands (`src/commands.js`)

**New commands needed:**
- `attack [target]` / `kill [target]` - Initiate combat
- `flee` - Attempt to flee from combat
- `rest` - Recover HP outside combat (slow heal)
- `score` - Display character stats (already exists, enhance with combat stats)

**Modified commands:**
- `look` - Show HP bars for NPCs and combatants
- `quit` - Prevent quitting during combat
- Movement commands - Prevent movement during combat

**Example command handlers:**
```javascript
attack: (player, args, world, playerDB, allPlayers, activeCombats) => {
  if (player.inCombat) {
    player.send(colors.error('You are already in combat!'));
    return;
  }

  if (args.length === 0) {
    player.send(colors.error('Attack what?'));
    return;
  }

  const targetName = args.join(' ').toLowerCase();
  const room = world.getRoom(player.currentRoom);
  const npc = room.npcs.find(n =>
    n.keywords.some(k => k.toLowerCase().includes(targetName))
  );

  if (!npc) {
    player.send(colors.error('You don\'t see that here.'));
    return;
  }

  // Initiate combat
  const combat = combatEngine.initiateCombat(player, npc, 'player', 'npc', world);
  activeCombats.set(player.username, combat);
  activeCombats.set(npc.id, combat);

  player.send(colors.combat(`You attack ${npc.name}!`));

  // Start combat loop
  combatEngine.startCombatLoop(combat, activeCombats, playerDB, world);
},

flee: (player, args, world, playerDB, allPlayers, activeCombats) => {
  if (!player.inCombat) {
    player.send(colors.error('You are not in combat!'));
    return;
  }

  const combat = activeCombats.get(player.username);
  combatEngine.attemptFlee(player, combat, world, activeCombats, playerDB);
}
```

#### 4. World (`world.js`)

**Changes needed:**
- Load combat stats from NPC definitions
- Create NPC instances with combat properties
- Track NPC HP in world state (separate from definition)
- Provide methods to get/update NPC combat state

**Example methods:**
```javascript
class World {
  // ... existing methods ...

  getNPC(npcId) {
    // Return NPC instance with current HP
    return this.npcInstances[npcId];
  }

  updateNPCHP(npcId, hp) {
    if (this.npcInstances[npcId]) {
      this.npcInstances[npcId].hp = hp;
    }
  }

  respawnNPC(npcId) {
    const npcData = this.npcDefinitions[npcId];
    this.npcInstances[npcId] = {
      ...npcData,
      hp: npcData.maxHp || npcData.hp
    };
  }
}
```

#### 5. RespawnService (`src/respawnService.js`)

**Integration:**
- After NPC defeated, schedule respawn
- Respawn NPC with full HP after timer
- Notify players in room when NPC respawns

#### 6. Colors (`src/colors.js`)

**New color functions needed:**
```javascript
combat(text)      - Combat action messages
hit(text)         - Successful attacks
miss(text)        - Missed attacks
critical(text)    - Critical hits
damage(text)      - Damage numbers
healing(text)     - Healing messages
xpGain(text)      - XP rewards
levelUp(text)     - Level-up announcements
statGain(text)    - Stat increases
```

---

## File Organization

### Recommended Directory Structure

```
/Users/au288926/Documents/mudmud/
├── src/
│   ├── server.js                  (modified: add combat stats to Player)
│   ├── commands.js                (modified: add combat commands)
│   ├── colors.js                  (modified: add combat colors)
│   │
│   ├── combat/                    (NEW)
│   │   ├── combatEngine.js        (main combat orchestrator)
│   │   ├── combatResolver.js      (attack/damage calculations)
│   │   ├── damageTypes.js         (damage type definitions)
│   │   ├── initiative.js          (initiative and turn order)
│   │   ├── combatAI.js            (NPC combat behavior)
│   │   └── combatMessages.js      (combat text generation)
│   │
│   ├── progression/               (NEW)
│   │   ├── xpSystem.js            (XP gain and level-up)
│   │   ├── xpTable.js             (level thresholds)
│   │   └── statProgression.js     (stat calculations)
│   │
│   ├── utils/                     (NEW or existing)
│   │   ├── dice.js                (dice rolling utilities)
│   │   └── mathUtils.js           (general math helpers)
│   │
│   └── respawnService.js          (existing, may need modifications)
│
├── playerdb.js                    (modified: persist combat stats)
├── world.js                       (modified: NPC combat instances)
│
├── world/
│   └── sesame_street/
│       └── npcs/
│           ├── blue_wumpy.js      (modified: add combatStats, xpReward, etc.)
│           └── ... (all NPCs)
│
└── docs/
    └── COMBAT_XP_ARCHITECTURE.md  (this document)
```

### Module Dependencies

```
server.js
  ├─ requires playerdb.js
  ├─ requires world.js
  ├─ requires commands.js
  └─ requires combat/combatEngine.js

commands.js
  ├─ requires combat/combatEngine.js
  ├─ requires progression/xpSystem.js
  └─ requires colors.js

combat/combatEngine.js
  ├─ requires combat/combatResolver.js
  ├─ requires combat/initiative.js
  ├─ requires combat/combatAI.js
  ├─ requires combat/combatMessages.js
  └─ requires progression/xpSystem.js

combat/combatResolver.js
  ├─ requires combat/damageTypes.js
  ├─ requires utils/dice.js
  └─ requires progression/statProgression.js (for getModifier)

progression/xpSystem.js
  ├─ requires progression/xpTable.js
  ├─ requires progression/statProgression.js
  └─ requires colors.js
```

---

## Implementation Phases

### Phase 1: Foundation (Est. 4-6 hours)

**Goal:** Create data structures and utility functions

**Tasks:**
1. Create directory structure (`combat/`, `progression/`, `utils/`)
2. Implement `utils/dice.js` with dice rolling functions
3. Create `progression/xpTable.js` with level thresholds
4. Create `combat/damageTypes.js` with damage type registry
5. Create `progression/statProgression.js` with modifier calculations
6. Add combat stat properties to Player class
7. Update PlayerDB to persist combat stats
8. Update existing player saves with default values

**Deliverables:**
- Dice rolling works: `rollD20()`, `rollDice('2d6+3')`
- XP table accessible: `getXPForLevel(5)` returns correct value
- Stat modifiers calculate: `getModifier(16)` returns `+3`
- Players have combat stats in database

**Testing:**
- Unit test dice rolling (manual or automated)
- Verify XP table progression curve
- Test modifier calculation for all stat ranges (3-20)
- Load player, verify combat stats populated

---

### Phase 2: Combat Resolution (Est. 6-8 hours)

**Goal:** Implement attack rolls, damage calculation, HP tracking

**Tasks:**
1. Create `combat/combatResolver.js` with attack/damage functions
2. Implement attack roll logic (1d20 + modifiers vs AC)
3. Implement damage rolling and resistance application
4. Implement critical hit/miss mechanics
5. Add `takeDamage()`, `heal()`, `isDead()` methods to Player
6. Create HP tracking for NPC instances in World
7. Implement flee mechanics
8. Add combat color functions to `colors.js`

**Deliverables:**
- Attack rolls function correctly
- Damage applies with resistance calculations
- HP updates on Player and NPCs
- Critical hits deal double damage
- Flee success based on formula

**Testing:**
- Mock combat: player attacks NPC, verify hit/miss logic
- Test damage with various resistances (0%, 25%, -25%)
- Verify critical hit doubles damage dice
- Test flee with various DEX modifiers

---

### Phase 3: Combat Engine (Est. 8-10 hours)

**Goal:** Orchestrate full combat encounters

**Tasks:**
1. Create `CombatEncounter` class in `combat/combatEngine.js`
2. Implement initiative rolling (`combat/initiative.js`)
3. Implement `initiateCombat()` function
4. Implement combat round execution
5. Implement turn-based combat loop
6. Create `combat/combatMessages.js` for dynamic text
7. Implement combat end conditions (death, flee)
8. Integrate with RespawnService for defeated NPCs
9. Add combat state tracking (activeCombats Map)

**Deliverables:**
- Players can initiate combat with `attack [npc]`
- Combat proceeds in turn-based rounds
- Initiative determines action order
- Combat ends on death or flee
- Defeated NPCs respawn after timer
- Combat state prevents simultaneous combats

**Testing:**
- Full combat encounter: player vs NPC to completion
- Verify initiative determines turn order
- Test combat end on NPC death
- Test combat end on player death (if implemented)
- Test flee during combat
- Verify NPC respawns after defeat

---

### Phase 4: NPC AI (Est. 4-6 hours)

**Goal:** NPC decision-making and automated turns

**Tasks:**
1. Create `combat/combatAI.js`
2. Implement NPC action selection (attack, flee)
3. Implement flee threshold checking
4. Add automated NPC turns in combat loop
5. Add aggressive NPC behavior (attack on sight)
6. Create variety in NPC attack messages

**Deliverables:**
- NPCs attack automatically on their turn
- NPCs flee when HP low
- Aggressive NPCs initiate combat with players
- Variety in combat text

**Testing:**
- NPC attacks player automatically
- NPC flees when HP below threshold
- Aggressive NPC attacks player on entry
- Combat feels dynamic with message variety

---

### Phase 5: XP and Levelling (Est. 5-7 hours)

**Goal:** Implement progression system

**Tasks:**
1. Create `progression/xpSystem.js`
2. Implement `awardXP()` function
3. Implement `checkLevelUp()` and `levelUp()` functions
4. Implement XP calculation for combat victories
5. Implement stat gain application on level-up
6. Create level-up notification messages
7. Add `score` command enhancements to show XP/level
8. Persist XP and level in PlayerDB
9. Full heal on level-up

**Deliverables:**
- Players gain XP from defeating NPCs
- XP scaled based on level difference
- Level-up triggers at correct thresholds
- Stats increase on level-up
- Level-up provides full heal
- Score shows level, XP, and progress to next level

**Testing:**
- Award XP, verify accumulation
- Force level-up, verify stat increases
- Test multi-level jumps (e.g., level 1 to 3 in one XP gain)
- Verify XP scales with NPC level difference
- Test level-up at various levels (1→2, 5→6, 19→20)

---

### Phase 6: Commands and Polish (Est. 4-6 hours)

**Goal:** Integrate combat into command system and polish UX

**Tasks:**
1. Implement `attack` and `kill` commands in `commands.js`
2. Implement `flee` command
3. Implement `rest` command for HP recovery
4. Enhance `look` to show HP bars for combatants
5. Enhance `score` to show combat stats
6. Prevent movement during combat
7. Prevent quit during combat
8. Prevent pickup/drop during combat
9. Add combat state to player prompt (optional)
10. Broadcast combat events to room

**Deliverables:**
- All combat commands functional
- Combat state restricts certain actions
- Room sees combat events
- Clean, colorful combat output
- Help text updated with combat commands

**Testing:**
- Full player experience: login, attack NPC, defeat, level up
- Test movement prevention during combat
- Test quit prevention during combat
- Test rest command HP recovery
- Verify other players see combat messages

---

### Phase 7: NPC Updates (Est. 3-4 hours)

**Goal:** Update all NPCs with combat data

**Tasks:**
1. Update all Sesame Street NPCs with `combatStats`
2. Add `xpReward` to all NPCs
3. Add `attackMessages` and `deathMessages`
4. Balance NPC stats for levels 1-5
5. Add resistances to themed NPCs (e.g., fire wumpy has fire resistance)
6. Test combat with each NPC

**Deliverables:**
- All 8 Sesame Street NPCs combat-ready
- Balanced progression for new players
- Variety in combat encounters

**Testing:**
- Combat test with each NPC
- Verify XP rewards feel appropriate
- Check stat balance (level 1 player can defeat level 1 NPC)

---

### Total Implementation Time Estimate

| Phase | Estimated Time | Priority |
|-------|----------------|----------|
| Phase 1: Foundation | 4-6 hours | Critical |
| Phase 2: Combat Resolution | 6-8 hours | Critical |
| Phase 3: Combat Engine | 8-10 hours | Critical |
| Phase 4: NPC AI | 4-6 hours | High |
| Phase 5: XP and Levelling | 5-7 hours | High |
| Phase 6: Commands and Polish | 4-6 hours | High |
| Phase 7: NPC Updates | 3-4 hours | Medium |
| **Total** | **34-47 hours** | |

**Minimal Viable Combat (Phases 1-3):** 18-24 hours
**Full System (All Phases):** 34-47 hours

---

## Future Extensions

### Planned Enhancements (Post-Initial Implementation)

#### 1. Guild System Integration

- Guild-specific abilities in combat
- Spell casting commands (separate from basic attacks)
- Mana/energy resources
- Cooldown management
- Combo attacks

**File additions:**
```
src/guilds/
  ├── guildSystem.js
  ├── spellSystem.js
  └── abilityEffects.js
```

#### 2. Equipment System

- Weapon damage dice (1d6 dagger, 2d6 sword, 1d12 greataxe)
- Armor AC bonuses
- Magical item properties
- Equipment durability
- Enchantments

**Integration:**
- Modify `getAttackBonus()` to include weapon bonuses
- Modify `getArmorClass()` to include armor bonuses
- Add equipment damage types

#### 3. Status Effects

- Buffs: Strength boost, haste, regeneration
- Debuffs: Poison, slow, blind, stunned
- Duration tracking
- Effect stacking rules
- Cleansing/dispel mechanics

**File additions:**
```
src/combat/statusEffects.js
src/combat/effectManager.js
```

#### 4. Advanced Combat

- Multiple combatants (group combat)
- Area-of-effect attacks
- Positioning and range
- Cover and concealment
- Opportunity attacks
- Reactions (parry, dodge)

#### 5. Quest XP

- Quest completion awards
- Quest chains with scaled rewards
- Repeatable quest diminishing returns
- Bonus XP for quest achievements

**Integration:**
Add to `awardXP()`:
```javascript
awardXP(player, questReward, 'quest:quest_name', playerDB);
```

#### 6. Player vs Player (PvP)

- Dueling system
- PvP consent mechanics
- Honor/infamy tracking
- PvP zones
- Duel arenas

**Considerations:**
- Balance: Players stronger than NPCs of same level
- Griefing prevention
- Rewards for PvP victories

#### 7. Difficulty Scaling

- Easy/Normal/Hard mode toggle
- Scaling NPC stats based on party size
- Dynamic difficulty adjustment

#### 8. Combat Statistics

- Track player combat stats (kills, deaths, damage dealt)
- Leaderboards
- Achievement integration
- Combat log review

---

## Design Decisions and Rationale

### Why D20 Instead of Percentile?

**Chosen:** D20 (roll 1-20 + modifiers)
**Alternative:** Percentile (roll 1-100 vs skill percentage)

**Rationale:**
- D20 is familiar to modern tabletop gamers (D&D 5e)
- Modifiers feel more impactful (+5 matters more on d20 than on d100)
- Easier to balance with bounded accuracy
- Critical hits/misses naturally at 1 and 20

### Why Turn-Based Instead of Real-Time?

**Chosen:** Turn-based rounds
**Alternative:** Real-time with action cooldowns

**Rationale:**
- MUD tradition is turn-based
- Easier to implement and debug
- Works better with text interface
- Allows for tactical thinking
- No timing advantage for players with faster connections

### Why Round-Robin Turns Instead of Speed-Based?

**Chosen:** Initiative determines turn order, then alternating
**Alternative:** Speed stat allows multiple actions

**Rationale:**
- Simpler to understand and implement
- Prevents runaway speed advantage
- More predictable for players
- Can add speed mechanics later via buffs/abilities

### Why HP Instead of Wounds/Vitality?

**Chosen:** Single HP pool
**Alternative:** Separate vitality and wounds tracks

**Rationale:**
- Simpler mental model
- Easier to display in text
- Standard for the genre
- Can add complexity later with temporary HP

### Why Resistance Percentage Instead of Flat Reduction?

**Chosen:** Percentage reduction (25% fire resistance = 0.75x fire damage)
**Alternative:** Flat damage reduction (fire resist 5 = -5 fire damage)

**Rationale:**
- Scales naturally with damage amounts
- Easier to balance high-level content
- More intuitive (50% = half damage)
- Prevents trivializing damage with high flat reduction

### Why No Mana for Basic Attacks?

**Chosen:** Unlimited basic attacks
**Alternative:** Stamina/energy cost per attack

**Rationale:**
- Simplifies basic combat
- Mana reserved for spells (guild system)
- Prevents "stuck without resources" frustration
- Focuses tactical choices on abilities, not basic attacks

---

## Testing Strategy

### Unit Testing Priorities

1. **Dice Rolling:**
   - `rollD20()` returns 1-20
   - `rollDice('2d6+3')` returns 5-15
   - Critical hit doubles dice only, not modifiers

2. **Stat Calculations:**
   - `getModifier()` correct for all stat values
   - `getProficiencyBonus()` scales with level
   - `getArmorClass()` includes all bonuses

3. **Damage Calculations:**
   - Attack roll vs AC determines hit/miss
   - Resistance reduces damage correctly
   - Vulnerability increases damage correctly

4. **XP System:**
   - XP thresholds match table
   - Level-up triggers at correct XP
   - Stat gains apply correctly

### Integration Testing

1. **Full Combat Encounter:**
   - Player attacks NPC
   - Initiative determines order
   - Attacks resolve with hit/miss
   - Damage applies and HP decreases
   - Combat ends on death
   - XP awarded
   - Level-up triggers if threshold reached
   - NPC respawns after timer

2. **Edge Cases:**
   - Attack non-existent target
   - Attack during combat
   - Flee with low/high DEX
   - Level-up multiple levels at once
   - NPC with 0 HP
   - Player with 0 HP

### Manual Testing Checklist

- [ ] Create new character, verify default stats
- [ ] Attack weak NPC, defeat, gain XP
- [ ] Level up from 1 to 2, verify stat increases
- [ ] Attack strong NPC, flee successfully
- [ ] Attack strong NPC, flee fails, take opportunity damage
- [ ] Let NPC defeat player (death mechanics)
- [ ] Rest command recovers HP
- [ ] Multiple combats in sequence
- [ ] Aggressive NPC attacks on room entry
- [ ] Combat messages colorful and varied
- [ ] Score shows correct stats
- [ ] Look shows NPC HP bars

---

## Open Questions for Implementation

### Questions to Resolve Before/During Implementation

1. **Player Death:**
   - Permanent death?
   - Respawn at spawn point with HP penalty?
   - XP loss on death?
   - Ghost mode to return to body?

   **Recommendation:** Respawn at spawn point with 1 HP, no XP loss (beginner-friendly)

2. **Healing Mechanics:**
   - Rest command: How much HP per rest? Cooldown?
   - Passive regeneration outside combat?
   - Healing items (potions)?
   - Healing from NPCs (cleric, healer)?

   **Recommendation:**
   - Rest: Recover 25% max HP, 1 minute cooldown
   - No passive regen (keeps healing valuable)
   - Potions added with equipment system

3. **Equipment Drops:**
   - NPCs drop equipment on death?
   - Random loot or fixed drops?
   - Currency drops?

   **Recommendation:** Phase 1 = no drops, add with equipment system

4. **Multiple Combatants:**
   - Support group combat in Phase 1?
   - Or limit to 1v1 for simplicity?

   **Recommendation:** 1v1 only initially, group combat in future phase

5. **Aggressive NPCs:**
   - Attack immediately on room entry?
   - Wander and aggro if player in room?
   - Cooldown after defeat before re-aggro?

   **Recommendation:**
   - Attack on entry if `aggressive: true`
   - Check every 5 seconds for players in room
   - 5 minute cooldown per player after defeat

6. **Combat Display Format:**
   - One-line-per-action or detailed panels?
   - HP bars visual (===---) or numeric (15/20)?

   **Recommendation:**
   - One-line-per-action for simplicity
   - HP bars: "Blue Wumpy [██████░░░░] 12/20 HP"

7. **Stat Point Allocation:**
   - Auto-distribute stats on level-up?
   - Let player choose where to spend points?

   **Recommendation:** Auto-distribute initially, player choice when guild system adds classes

---

## Conclusion

This architecture provides a solid foundation for a D20-based combat and progression system that:

- **Scales cleanly** from level 1 to 50+
- **Integrates seamlessly** with existing MUD infrastructure
- **Extends naturally** to support guilds, spells, and equipment
- **Feels familiar** to modern tabletop gamers
- **Stays true** to classic MUD design

The modular structure ensures each component can be tested, debugged, and extended independently. The turn-based combat provides a smooth, predictable experience for text-based gameplay. The XP system rewards both combat and questing (future), encouraging diverse gameplay.

With an estimated 34-47 hours of implementation time, this system can be built incrementally, tested thoroughly, and polished for an excellent player experience.

---

**Next Steps:**
1. Review and approve this architecture plan
2. Create Phase 1 implementation plan with specific file/function signatures
3. Set up testing strategy and fixtures
4. Begin implementation with Phase 1 (Foundation)

**Questions or Feedback:**
- Any concerns about the D20 mechanics?
- Should we adjust damage type variety?
- Preferred player death mechanics?
- Timeline constraints for implementation?

---

*Document prepared by the MUD Architect for The Wumpy and Grift*
*Ready for implementation review and approval*
