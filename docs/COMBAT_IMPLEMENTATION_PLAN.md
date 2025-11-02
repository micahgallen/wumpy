# Combat System Implementation Plan
**The Wumpy and Grift MUD**

**Status:** Architecture Complete - Ready for Implementation
**Created:** November 2, 2025
**Estimated Implementation Time:** 34-47 hours

---

## Overview

This document provides the step-by-step implementation plan for the combat and XP/levelling systems based on the complete architecture defined in the companion documents.

---

## Architecture Documents Reference

The following documents contain the complete specification:

1. **COMBAT_XP_ARCHITECTURE.md** (Main specification, 1000+ lines)
   - Complete technical architecture
   - Data structures and schemas
   - All formulas and mechanics
   - Integration points
   - Implementation phases

2. **COMBAT_QUICK_REFERENCE.md** (Quick reference guide)
   - Condensed formulas
   - At-a-glance stats
   - Testing checklists
   - Key commands

3. **COMBAT_NPC_EXAMPLES.md** (NPC configuration examples)
   - Detailed NPC templates
   - Balance guidelines
   - Damage type themes
   - Difficulty tiers

4. **COMBAT_FLOW_DIAGRAM.md** (Visual diagrams)
   - System architecture diagrams
   - Combat flow charts
   - State management
   - Integration points

---

## Pre-Implementation Checklist

Before starting implementation, ensure:

- [ ] Architecture documents reviewed and approved
- [ ] Design questions resolved (see "Open Questions" in main doc)
- [ ] Development environment ready (Node.js, git)
- [ ] Backup of current codebase created
- [ ] Testing strategy confirmed

---

## Implementation Phases

### Phase 1: Foundation (4-6 hours)

**Goal:** Create data structures and utility functions

#### Tasks

**1.1 Create Directory Structure**
```bash
mkdir -p src/combat
mkdir -p src/progression
mkdir -p src/utils
```

**1.2 Implement Dice Rolling (`src/utils/dice.js`)**

Create module with functions:
- `rollD20()` - Roll 1d20
- `rollDice(diceString)` - Parse and roll "2d6+3" format
- `rollMultiple(numDice, dieSize)` - Roll multiple dice
- `parseDiceString(diceString)` - Parse dice notation

**Testing:**
- Verify `rollD20()` returns 1-20
- Test various dice strings: "1d6", "2d8+3", "1d4-1"
- Edge cases: "d20", "1d", invalid strings

**Files created:**
- `/Users/au288926/Documents/mudmud/src/utils/dice.js`

---

**1.3 Create XP Table (`src/progression/xpTable.js`)**

Define XP thresholds for levels 1-50:
```javascript
const XP_TABLE = {
  1: 0,
  2: 1000,
  3: 3000,
  4: 6000,
  5: 10000,
  // ... up to 50
};

function getXPForLevel(level) {
  return XP_TABLE[level] || XP_TABLE[50] * 2;
}

module.exports = { XP_TABLE, getXPForLevel };
```

**Testing:**
- Verify progressive scaling
- Check edge cases (level 0, level 100)

**Files created:**
- `/Users/au288926/Documents/mudmud/src/progression/xpTable.js`

---

**1.4 Create Damage Types (`src/combat/damageTypes.js`)**

Define damage type registry and resistance calculation:
```javascript
const DAMAGE_TYPES = {
  physical: { name: 'Physical', color: 'brightRed', icon: '⚔️' },
  fire: { name: 'Fire', color: 'brightYellow', icon: '🔥' },
  // ... all 8 types
};

function calculateResistance(rawDamage, damageType, resistances) {
  const resistance = resistances[damageType] || 0;
  const multiplier = 1 - (resistance / 100);
  return Math.max(0, Math.floor(rawDamage * multiplier));
}

module.exports = { DAMAGE_TYPES, calculateResistance };
```

**Testing:**
- Test 0% resistance (no change)
- Test 25% resistance (0.75x damage)
- Test -25% vulnerability (1.25x damage)
- Test 100% immunity (0 damage)

**Files created:**
- `/Users/au288926/Documents/mudmud/src/combat/damageTypes.js`

---

**1.5 Create Stat Progression (`src/progression/statProgression.js`)**

Implement ability modifier and stat gain calculations:
```javascript
function getModifier(statValue) {
  return Math.floor((statValue - 10) / 2);
}

function getProficiencyBonus(level) {
  return Math.floor(level / 4) + 1;
}

function calculateStatGains(player) {
  const gains = { hp: 5, strength: 0, dexterity: 0, /* ... */ };

  if (player.level % 4 === 0) {
    gains.strength = 1; // or based on class
  }

  if (player.level % 5 === 0) {
    gains.constitution = 1;
  }

  return gains;
}

module.exports = { getModifier, getProficiencyBonus, calculateStatGains };
```

**Testing:**
- Verify modifier table (3→-3, 10→0, 20→+5)
- Test proficiency scaling (1→+1, 4→+2, 8→+3)
- Test stat gains at various levels

**Files created:**
- `/Users/au288926/Documents/mudmud/src/progression/statProgression.js`

---

**1.6 Extend Player Class (`src/server.js`)**

Add combat stats properties to Player constructor:
```javascript
class Player {
  constructor(socket) {
    // ... existing properties ...

    // Core Stats
    this.strength = 10;
    this.dexterity = 10;
    this.constitution = 10;
    this.intelligence = 10;
    this.wisdom = 10;
    this.charisma = 10;

    // Combat Stats
    this.level = 1;
    this.xp = 0;
    this.hp = 20;
    this.maxHp = 20;
    this.armorClass = 10;

    // Resistances
    this.resistances = {
      physical: 0, fire: 0, ice: 0, lightning: 0,
      poison: 0, necrotic: 0, radiant: 0, psychic: 0
    };

    // Combat State
    this.inCombat = false;
    this.combatTarget = null;
    this.combatInitiative = 0;
  }

  // Add helper methods
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0; // Returns true if dead
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  isDead() {
    return this.hp <= 0;
  }
}
```

**Testing:**
- Create player, verify default stats
- Test takeDamage() and heal()
- Verify HP can't go below 0 or above maxHp

**Files modified:**
- `/Users/au288926/Documents/mudmud/src/server.js`

---

**1.7 Extend PlayerDB (`playerdb.js`)**

Add methods for persisting combat data:
```javascript
class PlayerDB {
  // ... existing methods ...

  updatePlayerXP(username, xp) {
    const player = this.players[username.toLowerCase()];
    if (player) {
      player.xp = xp;
      this.save();
    }
  }

  updatePlayerLevel(username, level, maxHp, hp) {
    const player = this.players[username.toLowerCase()];
    if (player) {
      player.level = level;
      player.maxHp = maxHp;
      player.hp = hp;
      this.save();
    }
  }

  updatePlayerStats(username, stats) {
    const player = this.players[username.toLowerCase()];
    if (player) {
      player.stats = stats;
      this.save();
    }
  }

  updatePlayerHP(username, hp) {
    const player = this.players[username.toLowerCase()];
    if (player) {
      player.hp = hp;
      this.save();
    }
  }
}
```

**Testing:**
- Create player, save, reload, verify stats persist
- Update XP, verify persistence
- Update level, verify persistence

**Files modified:**
- `/Users/au288926/Documents/mudmud/playerdb.js`

---

**1.8 Update Player Save Schema**

Modify createPlayer() and authenticate() to handle new fields:
```javascript
createPlayer(username, password) {
  const playerData = {
    username: username,
    passwordHash: this.hashPassword(password),
    description: 'A normal-looking person.',
    currentRoom: 'sesame_street_01',
    inventory: [],

    // NEW: Combat stats
    level: 1,
    xp: 0,
    hp: 20,
    maxHp: 20,
    stats: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    resistances: {
      physical: 0, fire: 0, ice: 0, lightning: 0,
      poison: 0, necrotic: 0, radiant: 0, psychic: 0
    },

    createdAt: new Date().toISOString()
  };

  this.players[lowerUsername] = playerData;
  this.save();
  return playerData;
}
```

**Testing:**
- Create new player, verify full schema saved
- Load existing player, verify backward compatibility

**Files modified:**
- `/Users/au288926/Documents/mudmud/playerdb.js`

---

**Phase 1 Completion Criteria:**

- [ ] Dice rolling works correctly
- [ ] XP table accessible and accurate
- [ ] Damage type resistance calculates correctly
- [ ] Stat modifiers calculate correctly
- [ ] Player class has all combat properties
- [ ] PlayerDB persists combat data
- [ ] All Phase 1 code documented and tested

**Estimated Time:** 4-6 hours

---

### Phase 2: Combat Resolution (6-8 hours)

**Goal:** Implement attack rolls, damage calculation, HP tracking

#### Tasks

**2.1 Create Combat Resolver (`src/combat/combatResolver.js`)**

Implement core combat mechanics:

```javascript
const { rollD20, rollDice } = require('../utils/dice');
const { getModifier, getProficiencyBonus } = require('../progression/statProgression');
const { calculateResistance } = require('./damageTypes');

function getAttackBonus(attacker, damageType) {
  const proficiency = getProficiencyBonus(attacker.level);
  const ability = damageType === 'physical'
    ? getModifier(attacker.strength)
    : getModifier(attacker.dexterity);
  const equipment = 0; // Future: weapon bonus

  return proficiency + ability + equipment;
}

function getArmorClass(defender) {
  const baseDC = 10;
  const dexMod = getModifier(defender.dexterity);
  const armorBonus = 0; // Future: armor equipment

  return baseAC + dexMod + armorBonus;
}

function rollAttack(attacker, defender, damageType = 'physical') {
  const roll = rollD20();
  const bonus = getAttackBonus(attacker, damageType);
  const total = roll + bonus;
  const targetAC = getArmorClass(defender);

  const critical = (roll === 20);
  const criticalMiss = (roll === 1);
  const hit = !criticalMiss && (critical || total >= targetAC);

  return { hit, critical, criticalMiss, roll, total, targetAC };
}

function rollDamage(attacker, damageDice, critical = false) {
  const baseDamage = rollDice(damageDice);
  const finalDamage = critical ? baseDamage * 2 : baseDamage;

  return finalDamage;
}

function applyDamage(target, rawDamage, damageType) {
  const resistance = target.resistances[damageType] || 0;
  const finalDamage = calculateResistance(rawDamage, damageType, target.resistances);

  target.takeDamage(finalDamage);

  return {
    rawDamage,
    resistance,
    finalDamage,
    dead: target.isDead()
  };
}

module.exports = {
  getAttackBonus,
  getArmorClass,
  rollAttack,
  rollDamage,
  applyDamage
};
```

**Testing:**
- Mock attacker/defender, test attack rolls
- Verify hit vs AC logic
- Test critical hit mechanics
- Test damage with resistances
- Verify HP updates correctly

**Files created:**
- `/Users/au288926/Documents/mudmud/src/combat/combatResolver.js`

---

**2.2 Create Initiative System (`src/combat/initiative.js`)**

```javascript
const { rollD20 } = require('../utils/dice');
const { getModifier } = require('../progression/statProgression');

function rollInitiative(combatant) {
  const dexMod = getModifier(combatant.dexterity);
  return rollD20() + dexMod;
}

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
      return b.combatant.dexterity - a.combatant.dexterity;
    });
}

module.exports = { rollInitiative, determineTurnOrder };
```

**Testing:**
- Roll initiative, verify range and modifiers
- Test turn order with ties
- Test turn order with various DEX values

**Files created:**
- `/Users/au288926/Documents/mudmud/src/combat/initiative.js`

---

**2.3 Create Combat Messages (`src/combat/combatMessages.js`)**

```javascript
const colors = require('../colors');
const { DAMAGE_TYPES } = require('./damageTypes');

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

function getDamageMessage(damage, damageType) {
  const typeInfo = DAMAGE_TYPES[damageType];
  const colorFn = colors[typeInfo.color] || colors.damage;
  return colorFn(`${damage} ${typeInfo.name} damage!`);
}

function getDeathMessage(combatant) {
  const name = combatant.username || combatant.name;

  if (combatant.deathMessages && combatant.deathMessages.length > 0) {
    const msg = combatant.deathMessages[Math.floor(Math.random() * combatant.deathMessages.length)];
    return msg.replace('{npc}', name);
  }

  return colors.combat(`${name} has been defeated!`);
}

module.exports = {
  getAttackMessage,
  getDamageMessage,
  getDeathMessage
};
```

**Testing:**
- Generate attack messages, verify variety
- Test with NPCs that have custom messages
- Verify color coding works

**Files created:**
- `/Users/au288926/Documents/mudmud/src/combat/combatMessages.js`

---

**2.4 Add Combat Colors (`src/colors.js`)**

```javascript
// Add to existing colors.js

combat: (text) => `\x1b[1;33m${text}\x1b[0m`,      // Bright yellow
hit: (text) => `\x1b[1;31m${text}\x1b[0m`,         // Bright red
miss: (text) => `\x1b[90m${text}\x1b[0m`,          // Gray
critical: (text) => `\x1b[1;35m${text}\x1b[0m`,    // Bright magenta
damage: (text) => `\x1b[31m${text}\x1b[0m`,        // Red
healing: (text) => `\x1b[32m${text}\x1b[0m`,       // Green
xpGain: (text) => `\x1b[1;36m${text}\x1b[0m`,      // Bright cyan
levelUp: (text) => `\x1b[1;33m${text}\x1b[0m`,     // Bright yellow
statGain: (text) => `\x1b[32m${text}\x1b[0m`,      // Green
```

**Files modified:**
- `/Users/au288926/Documents/mudmud/src/colors.js`

---

**Phase 2 Completion Criteria:**

- [ ] Attack rolls function correctly
- [ ] Damage applies with resistance
- [ ] Critical hits work as expected
- [ ] Initiative system functional
- [ ] Combat messages display with colors
- [ ] All Phase 2 code tested

**Estimated Time:** 6-8 hours

---

### Phase 3: Combat Engine (8-10 hours)

**Goal:** Orchestrate full combat encounters

**Detailed implementation plan available in COMBAT_XP_ARCHITECTURE.md Phase 3**

Key deliverables:
- CombatEncounter class
- initiateCombat() function
- executeCombatRound() function
- endCombat() function
- Active combats tracking

**Estimated Time:** 8-10 hours

---

### Phase 4: NPC AI (4-6 hours) - **BUG: Combat output missing**

**Goal:** NPC decision-making and automated turns, including aggressive behavior and retaliation.

**Implementation Details:**
- **`src/combat/combatAI.js`:** Created to house NPC AI logic. The `determineNPCAction` function decides whether an NPC should attack or flee, taking into account the NPC's `fleeThreshold` and `timidity`.
- **`src/combat/CombatEncounter.js`:** The `executeCombatRound` method now uses `determineNPCAction` for NPC turns. If an NPC decides to flee, the combat ends.
- **`src/commands.js`:**
    - **Aggressive Behavior:** The `movePlayer` function now calls a new `checkAggressiveNPCs` function. This function checks for NPCs with the `aggressive: true` flag in the player's new room and initiates combat if found.
    - **Retaliation:** The `attack` command now includes retaliation logic. When a player attacks a non-aggressive NPC, the NPC has a chance to become aggressive based on its `timidity` stat.

**Key deliverables:**
- [x] NPC action selection (attack, flee)
- [x] Flee logic (basic implementation)
- [x] Aggressive NPC behavior (attack on sight)
- [x] Automated NPC turns
- [x] Retaliation logic for non-aggressive NPCs

**Current Status:** Combat rounds are executing, but no output messages (attack, damage, death) are being displayed to the players. This indicates a potential issue in how combat messages are broadcast or generated, possibly introduced during recent changes. This bug must be investigated and resolved before proceeding.


**Estimated Time:** 4-6 hours

---

### Phase 5: XP and Levelling (5-7 hours)

**Goal:** Implement progression system

**Detailed implementation plan available in COMBAT_XP_ARCHITECTURE.md Phase 5**

Key deliverables:
- awardXP() function
- levelUp() function
- Stat progression
- Level-up notifications

**Estimated Time:** 5-7 hours

---

### Phase 6: Commands and Polish (4-6 hours)

**Goal:** Integrate combat into command system

**Detailed implementation plan available in COMBAT_XP_ARCHITECTURE.md Phase 6**

Key deliverables:
- attack/kill commands
- flee command
- rest command
- Enhanced score command
- Combat state restrictions

**Estimated Time:** 4-6 hours

---

### Phase 7: NPC Updates (3-4 hours)

**Goal:** Update all NPCs with combat data

**Detailed implementation plan available in COMBAT_XP_ARCHITECTURE.md Phase 7**

Key deliverables:
- All Sesame Street NPCs updated
- Balanced stats
- Combat testing

**Estimated Time:** 3-4 hours

---

## Testing Strategy

### Unit Tests (Manual or Automated)

**Dice Rolling:**
```javascript
// Test rollD20()
for (let i = 0; i < 100; i++) {
  const roll = rollD20();
  console.assert(roll >= 1 && roll <= 20, 'Roll out of range');
}

// Test rollDice()
const result = rollDice('2d6+3');
console.assert(result >= 5 && result <= 15, 'Dice parse error');
```

**Stat Calculations:**
```javascript
console.assert(getModifier(10) === 0);
console.assert(getModifier(16) === 3);
console.assert(getModifier(8) === -1);
console.assert(getProficiencyBonus(1) === 1);
console.assert(getProficiencyBonus(5) === 2);
```

**Resistance:**
```javascript
const damage = calculateResistance(20, 'fire', { fire: 25 });
console.assert(damage === 15, 'Resistance calculation error');

const vulnDamage = calculateResistance(20, 'ice', { ice: -25 });
console.assert(vulnDamage === 25, 'Vulnerability calculation error');
```

### Integration Tests

**Full Combat Encounter:**
1. Create test player (level 1)
2. Create test NPC (level 1)
3. Initiate combat
4. Verify initiative rolled
5. Execute combat rounds until completion
6. Verify XP awarded
7. Verify NPC respawn scheduled

**Level-Up Test:**
1. Create player with 950 XP (near level 2)
2. Award 100 XP
3. Verify level-up triggered
4. Verify stats increased
5. Verify HP increased
6. Verify full heal

**Flee Test:**
1. Initiate combat
2. Attempt flee (high DEX)
3. Verify escape on success
4. Attempt flee (low DEX)
5. Verify opportunity attack on failure

### Manual Testing Checklist

Use this checklist for end-to-end testing:

**Basic Combat:**
- [ ] Login with test character
- [ ] Navigate to room with wumpy
- [ ] `attack blue wumpy`
- [ ] Verify initiative message
- [ ] Verify turn-based combat
- [ ] Verify hit/miss messages
- [ ] Verify damage applied
- [ ] Defeat wumpy
- [ ] Verify XP gained
- [ ] Verify wumpy respawn scheduled

**Level-Up:**
- [ ] Gain enough XP to level up
- [ ] Verify level-up message
- [ ] `score` - verify new stats
- [ ] Verify HP increased
- [ ] Verify full heal occurred

**Flee:**
- [ ] Initiate combat
- [ ] `flee`
- [ ] Verify flee attempt
- [ ] Test both success and failure

**Aggressive NPC:**
- [ ] Enter room with red wumpy
- [ ] Verify red wumpy attacks immediately
- [ ] Verify combat initiated

**Rest:**
- [ ] Take damage in combat
- [ ] End combat
- [ ] `rest`
- [ ] Verify HP recovery
- [ ] Try rest again immediately
- [ ] Verify cooldown message

---

## Implementation Order

Recommended implementation sequence:

1. **Phase 1 (Foundation)** - Complete all tasks in order
2. **Phase 2 (Combat Resolution)** - Complete all tasks
3. **Phase 3 (Combat Engine)** - Start with minimal viable combat
4. **Test Integration** - Full combat encounter test
5. **Phase 4 (NPC AI)** - Add automated NPC behavior
   **PRIORITY: Investigate and fix missing combat output bug.**
6. **Phase 5 (XP System)** - Add progression
7. **Test Progression** - Level-up test
8. **Phase 6 (Commands)** - Integrate with command system
9. **Phase 7 (NPC Updates)** - Update all NPCs
10. **Full Testing** - Complete manual testing checklist
11. **Polish** - Balance adjustments, message variety
12. **Documentation** - Update help text, player guide

---

## Post-Implementation Tasks

After all phases complete:

### Documentation Updates

- [ ] Update `/Users/au288926/Documents/mudmud/docs/FEATURES_ROADMAP.md`
- [ ] Mark combat system as complete
- [ ] Update implementation estimates
- [ ] Add future enhancement notes

### Player Communication

- [ ] Write in-game help for combat commands
- [ ] Create beginner combat guide
- [ ] Update welcome message with combat hints

### Monitoring

- [ ] Test with multiple concurrent combats
- [ ] Monitor server performance under load
- [ ] Check for memory leaks in combat loop
- [ ] Verify NPC respawn timing

### Balance Tuning

- [ ] Gather combat data (time to kill, death rates)
- [ ] Adjust XP rewards if needed
- [ ] Tune NPC stats for difficulty curve
- [ ] Adjust damage/HP scaling

---

## Rollback Plan

If critical issues arise during implementation:

1. **Git Branching:**
   - Implement on feature branch `feature/combat-system`
   - Keep `master` stable
   - Can rollback by switching branches

2. **Backup Strategy:**
   - Backup `players.json` before testing
   - Keep old player schema compatible
   - Can restore player data if needed

3. **Feature Flags:**
   - Add `COMBAT_ENABLED` flag in config
   - Can disable combat without code rollback
   - Useful for testing and gradual rollout

---

## Success Metrics

Combat system implementation is successful when:

- [ ] All 7 phases completed
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing checklist 100% complete
- [ ] No critical bugs identified
- [ ] Performance acceptable (< 100ms combat round)
- [ ] Player data persists correctly
- [ ] NPC respawn functioning
- [ ] Documentation updated

---

## Timeline Estimate

Based on phase estimates:

**Minimum Viable Combat (Phases 1-3):**
- 18-24 hours
- Basic combat functional
- No AI, no XP, no commands

**Playable Combat (Phases 1-5):**
- 27-35 hours
- Full combat with AI and progression
- Command integration pending

**Complete System (All Phases):**
- 34-47 hours
- Fully integrated
- All NPCs updated
- Ready for players

**Realistic Schedule:**
- Solo developer, 4-hour sessions: 9-12 sessions
- Part-time (10 hrs/week): 3.5-5 weeks
- Full-time (40 hrs/week): 1-1.5 weeks

---

## Next Steps

To begin implementation:

1. **Review all architecture documents**
2. **Resolve open design questions** (see COMBAT_XP_ARCHITECTURE.md)
3. **Create feature branch:** `git checkout -b feature/combat-system`
4. **Start Phase 1, Task 1.1:** Create directory structure
5. **Implement incrementally, test frequently**
6. **Commit after each completed task**
7. **Reference this document for guidance**

---

## Support and Resources

**Architecture References:**
- Main spec: `COMBAT_XP_ARCHITECTURE.md`
- Quick ref: `COMBAT_QUICK_REFERENCE.md`
- NPC examples: `COMBAT_NPC_EXAMPLES.md`
- Flow diagrams: `COMBAT_FLOW_DIAGRAM.md`

**Code References:**
- Existing player system: `src/server.js`
- Existing commands: `src/commands.js`
- Existing world: `world.js`
- Existing NPCs: `world/sesame_street/npcs/*.js`

**External Resources:**
- D&D 5E SRD: https://5e.d20srd.org/
- Dice notation: https://en.wikipedia.org/wiki/Dice_notation
- MUD combat systems: Classic MUD documentation

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-02 | 1.0 | Initial implementation plan created |

---

*Ready to build an epic combat system!*
*May your rolls be high and your crits be frequent.*
