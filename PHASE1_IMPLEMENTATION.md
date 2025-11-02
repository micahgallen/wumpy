# Phase 1 Implementation: Combat Registry and Basic Attack Resolution

## Overview

This document describes the Phase 1 implementation of the combat and XP system for the MUD project. Phase 1 establishes the foundational combat mechanics including dice rolling, attack resolution, damage calculation, and combat state management.

## Implementation Status: COMPLETE

All Phase 1 components have been implemented and tested with 100% test success rate (88 tests passing).

---

## Components Implemented

### 1. Utilities Layer

#### `/src/utils/dice.js`
Dice rolling and validation utilities supporting D&D-style notation.

**Key Functions:**
- `parseDiceString(dice)` - Parse "XdY[+/-Z]" notation
- `rollD20()` - Roll a d20
- `rollDice(diceString)` - Roll arbitrary dice notation
- `rollDamage(damageDice, isCritical)` - Roll damage with critical hit support
- `rollAttack(advantageType)` - Roll attack with advantage/disadvantage
- `isValidDiceString(dice)` - Validate dice notation
- `getAverageDiceValue(diceString)` - Calculate average for balance testing

**Validation:**
- Dice count: 1-100
- Dice sides: 2-100
- Modifiers: -1000 to +1000
- Returns null for invalid input

**Test Coverage:** 24/24 tests passing

---

#### `/src/utils/modifiers.js`
D&D 5e ability score modifiers and combat calculations.

**Key Functions:**
- `getModifier(abilityScore)` - Calculate ability modifier (score - 10) / 2
- `calculateProficiency(level)` - Level-based proficiency bonus
- `calculateArmorClass(dex, armorBonus)` - AC calculation
- `calculateAttackBonus(ability, proficiency)` - Attack roll bonus
- `isHit(attackRoll, targetAC)` - Hit determination
- `isCriticalHit(natural)` - Check for natural 20
- `isCriticalMiss(natural)` - Check for natural 1
- `calculateNetAdvantage(adv, dis)` - Advantage/disadvantage resolution
- `applyDamageMultiplier(damage, multiplier)` - Apply resistance/vulnerability

**Proficiency Progression:**
- Level 1-4: +2
- Level 5-8: +3
- Level 9-12: +4
- Level 13+: continues every 4 levels

**Test Coverage:** 38/38 tests passing

---

### 2. Data Structures

#### `/src/data/Combat.js`
Core combat data structures and factory functions.

**Structures:**
- `Combat` - Complete combat instance
  - id: Unique combat identifier
  - participants: Array of Participant objects
  - currentTurn: Round counter
  - startedAt: Timestamp
  - isActive: Combat state flag
  - pendingActions: Map of queued actions

- `Participant` - Entity participation in combat
  - entityId: Player or NPC ID
  - entityType: 'player' or 'npc'
  - initialHp: HP at combat start (for recovery on crash)
  - initialRoomId: Location at combat start
  - effects: Array of StatusEffect objects
  - advantageCount: Number of advantage sources
  - disadvantageCount: Number of disadvantage sources

- `StatusEffect` - Temporary combat effects
  - type: Effect identifier
  - durationRounds: Remaining duration
  - source: Effect source
  - grantAdvantage: Boolean
  - grantDisadvantage: Boolean

**Factory Functions:**
- `createCombat(participants)`
- `createParticipant(entity, entityType)`
- `createStatusEffect(type, duration, source, options)`
- `createCombatAction(actionType, targetId, data)`
- `createAttackResult(hit, critical, fumble, rolls, total, damage)`

---

#### `/src/data/CombatStats.js`
Combat statistics for players and NPCs.

**Key Functions:**
- `createPlayerCombatStats(level)` - Default player combat stats
- `createNpcCombatStats(npcDef)` - NPC combat stats from definition
- `applyDamage(entity, damage)` - Apply damage to entity
- `applyHealing(entity, amount)` - Heal entity
- `isAlive(entity)` - Check if entity is alive
- `isDead(entity)` - Check if entity is dead
- `getResistanceMultiplier(entity, damageType)` - Get damage multiplier

**Default Player Stats (Level 1):**
- HP: 10
- Armor Class: 11 (10 + DEX modifier)
- Proficiency: +2
- Attributes: STR 10, DEX 12, CON 10, INT 10, WIS 10, CHA 10
- Default weapon: Fists (1d4 physical damage)

---

### 3. Combat Systems

#### `/src/systems/combat/CombatRegistry.js`
Singleton combat state manager.

**Purpose:** Centralized combat state management to prevent desyncs and provide fast entity lookups.

**Key Methods:**
- `initiateCombat(attacker, defender, attackerType, defenderType)` - Create new combat
- `addParticipant(combatId, entity, entityType)` - Add to existing combat
- `removeParticipant(combatId, entityId)` - Remove from combat
- `endCombat(combatId)` - End and cleanup combat
- `getCombat(combatId)` - Get combat by ID
- `getCombatForEntity(entityId)` - Get combat for entity
- `isInCombat(entityId)` - Check combat status
- `getParticipant(combatId, entityId)` - Get participant data
- `clearAll()` - Clear all combats (crash recovery)
- `getStats()` - Get registry statistics

**Data Structures:**
- `combats`: Map<combatId, Combat> - All active combats
- `entityToCombat`: Map<entityId, combatId> - Fast entity lookup

**Test Coverage:** 8/8 tests passing

---

#### `/src/systems/combat/AttackRoll.js`
Attack roll resolution with advantage/disadvantage.

**Key Functions:**
- `resolveAttackRoll(attacker, defender, attackerParticipant, defenderParticipant)` - Complete attack roll
- `grantAdvantage(participant, source, duration)` - Add advantage
- `grantDisadvantage(participant, source, duration)` - Add disadvantage
- `tickStatusEffects(participant)` - Update effect durations
- `formatAttackMessage(attacker, defender, result)` - Format output

**Attack Resolution Flow:**
1. Determine advantage/disadvantage (net count)
2. Roll d20 (once, twice with advantage, twice with disadvantage)
3. Calculate attack bonus (ability modifier + proficiency)
4. Check for critical miss (natural 1)
5. Check for critical hit (natural 20)
6. Check for normal hit (total >= AC)

**Advantage/Disadvantage Rules:**
- Advantage: Roll 2d20, take higher
- Disadvantage: Roll 2d20, take lower
- Multiple sources: Net count determines final state
- Equal counts cancel to normal

**Test Coverage:** 3/3 tests passing

---

#### `/src/systems/combat/DamageCalculator.js`
Damage calculation with resistances and vulnerabilities.

**Key Functions:**
- `calculateDamage(damageDice, isCritical, damageType, target)` - Calculate damage
- `applyDamageToTarget(target, damage, damageType)` - Apply to entity
- `resolveAttackDamage(attacker, target, attackResult)` - Complete attack damage
- `formatDamageMessage(target, damageResult)` - Format output
- `getDamageEffectiveness(target, damageType)` - Get effectiveness

**Damage Calculation:**
1. Roll damage dice (doubled for critical hits)
2. Apply resistance/vulnerability multiplier
3. Round final damage
4. Minimum 1 damage (D&D 5e rule)

**Resistance/Vulnerability:**
- Resistance: 0.5x damage (50% reduction)
- Vulnerability: 2.0x damage (double damage)
- Normal: 1.0x damage

**Test Coverage:** 4/4 tests passing

---

#### `/src/systems/combat/CombatResolver.js`
Combat round processing and coordination.

**Key Functions:**
- `resolveAttack(attacker, defender, combat)` - Full attack resolution
- `rollInitiative(participants, getEntityFn)` - Roll initiative order
- `processCombatRound(combat, getEntityFn, messageFn)` - Process one round
- `findTarget(attackerParticipant, allParticipants, getEntityFn)` - Select target
- `shouldEndCombat(combat, getEntityFn)` - Check end condition
- `endCombat(combat, getEntityFn, messageFn)` - End combat
- `broadcastToCombat(combat, message, messageFn, getEntityFn)` - Send messages

**Round Processing Flow:**
1. Increment turn counter
2. Roll initiative for all participants
3. Process actions in initiative order:
   - Find valid target
   - Resolve attack
   - Apply damage
   - Broadcast messages
   - Check for death
4. Tick status effects (decrement durations)
5. Check if combat should end
6. Return round results

**Combat End Conditions:**
- One or fewer participants alive
- All participants dead (mutual destruction)

---

### 4. Testing Infrastructure

#### `/tests/testRunner.js`
Simple test framework without external dependencies.

**Features:**
- Test suite organization
- Assertion library
- Pass/fail tracking
- Error reporting
- Summary statistics

**Assertions:**
- `assert.equal(actual, expected)`
- `assert.true(value)`
- `assert.false(value)`
- `assert.inRange(value, min, max)`
- `assert.arrayContains(array, value)`
- `assert.isNull(value)`
- `assert.notNull(value)`

---

#### Test Suites

1. **`/tests/diceTests.js`** - Dice utilities (24 tests)
   - Dice parsing validation
   - Random roll range validation
   - Advantage/disadvantage mechanics
   - Average value calculations

2. **`/tests/modifierTests.js`** - Modifier utilities (38 tests)
   - Ability score modifiers
   - Proficiency progression
   - AC calculation
   - Attack bonuses
   - Hit determination
   - Critical hits/misses
   - Advantage/disadvantage resolution

3. **`/tests/combatTests.js`** - Combat systems (21 tests)
   - Combat Registry operations
   - Attack roll mechanics
   - Damage calculation
   - Resistance/vulnerability
   - HP management

4. **`/tests/integrationTest.js`** - End-to-end scenarios (5 tests)
   - Complete 1v1 combat
   - Multi-participant combat
   - Advantage/disadvantage in combat
   - Resistance mechanics in combat
   - Combat statistics

**Total Test Coverage: 88 tests, 100% passing**

---

## NPM Scripts

Added to `package.json`:
```json
"scripts": {
  "start": "node src/server.js",
  "test": "node tests/runAllTests.js",
  "test:dice": "node tests/diceTests.js",
  "test:modifiers": "node tests/modifierTests.js",
  "test:combat": "node tests/combatTests.js",
  "test:integration": "node tests/integrationTest.js"
}
```

---

## Architecture Alignment

This implementation follows the architecture document (`COMBAT_XP_ARCHITECTURE.md`) precisely:

✓ D20-based attack rolls
✓ Advantage/disadvantage mechanics
✓ Critical hits (natural 20) and fumbles (natural 1)
✓ Proficiency bonus progression
✓ Armor Class hit determination
✓ Damage dice with critical hit doubling
✓ Resistance/vulnerability multipliers
✓ Combat Registry singleton pattern
✓ Participant tracking with status effects
✓ Initiative-based round processing

---

## Performance Characteristics

**Dice Rolling:** O(1) - constant time
**Combat Lookup:** O(1) - Map-based lookups
**Attack Resolution:** O(1) - single attack calculation
**Round Processing:** O(n) - n = participant count
**Status Effect Ticking:** O(m) - m = effect count per participant

**Target Performance:** <10ms for typical combat calculations
**Actual Performance:** Well under 1ms for single attack resolution

---

## Integration Points for Phase 2

Phase 2 will add XP system and level-up mechanics. Ready integration points:

### From Phase 1:
- `CombatResolver.endCombat()` - Hook for XP award on combat end
- `createPlayerCombatStats()` - Extend with XP tracking
- Combat participant tracking - Used for XP distribution calculations

### For Phase 2:
- XP formula: `Math.round(800 * Math.pow(level, 1.6))`
- Level-up handler with stat increases
- XP reward calculation based on mob level vs player level
- Guild hooks for custom level-up bonuses

### File Structure for Phase 2:
```
src/systems/progression/
  ├── XpSystem.js              # XP formulas and rewards
  ├── LevelUpHandler.js        # Level-up bonuses
  └── XpTable.js               # Table generation
```

---

## Known Limitations (By Design)

These are intentional limitations for Phase 1:

1. **No XP system** - Phase 2 feature
2. **No NPC AI or aggro** - Phase 3 feature
3. **No death/corpse system** - Phase 4 feature
4. **No flee mechanics** - Phase 5 feature
5. **No resting system** - Phase 6 feature
6. **Basic targeting only** - Targets first available opponent
7. **No spell attacks** - Uses melee attack mechanics only
8. **No ranged vs melee distinction** - All attacks use STR modifier

---

## File Structure

```
mudmud/
├── src/
│   ├── utils/
│   │   ├── dice.js                  # Dice rolling utilities
│   │   └── modifiers.js             # Stat modifiers
│   ├── data/
│   │   ├── Combat.js                # Combat data structures
│   │   └── CombatStats.js           # Combat stats management
│   └── systems/
│       └── combat/
│           ├── CombatRegistry.js    # Combat state singleton
│           ├── AttackRoll.js        # Attack resolution
│           ├── DamageCalculator.js  # Damage calculation
│           └── CombatResolver.js    # Round processing
├── tests/
│   ├── testRunner.js                # Test framework
│   ├── diceTests.js                 # Dice utility tests
│   ├── modifierTests.js             # Modifier tests
│   ├── combatTests.js               # Combat system tests
│   ├── integrationTest.js           # Integration tests
│   └── runAllTests.js               # Test runner
└── PHASE1_IMPLEMENTATION.md         # This file
```

---

## Usage Examples

### Creating a Combat

```javascript
const CombatRegistry = require('./src/systems/combat/CombatRegistry');
const { createPlayerCombatStats } = require('./src/data/CombatStats');

// Create entities
const player = {
  id: 'player_1',
  username: 'Warrior',
  currentRoom: 'dungeon_1',
  ...createPlayerCombatStats(1)
};

const goblin = {
  id: 'goblin_1',
  name: 'Goblin Scout',
  roomId: 'dungeon_1',
  level: 1,
  maxHp: 8,
  currentHp: 8,
  armorClass: 14,
  str: 10,
  proficiency: 2,
  currentWeapon: {
    damageDice: '1d6',
    damageType: 'physical'
  }
};

// Initiate combat
const combat = CombatRegistry.initiateCombat(
  player,
  goblin,
  'player',
  'npc'
);
```

### Processing a Combat Round

```javascript
const { processCombatRound } = require('./src/systems/combat/CombatResolver');

// Entity lookup function
function getEntity(id) {
  // Return player or NPC by ID
  return entities.get(id);
}

// Message function
function sendMessage(entityId, message) {
  const entity = getEntity(entityId);
  if (entity && entity.socket) {
    entity.socket.write(message);
  }
}

// Process round
const result = processCombatRound(combat, getEntity, sendMessage);

if (result.ended) {
  console.log(`Combat ended: ${result.reason}`);
}
```

### Granting Advantage

```javascript
const { grantAdvantage } = require('./src/systems/combat/AttackRoll');

const participant = CombatRegistry.getParticipant(combat.id, player.id);
grantAdvantage(participant, 'flanking', 2); // 2 rounds
```

---

## Testing

Run all tests:
```bash
npm test
```

Run specific test suite:
```bash
npm run test:dice
npm run test:modifiers
npm run test:combat
npm run test:integration
```

Expected output:
```
Total Tests: 88
Total Passed: 88
Total Failed: 0
Success Rate: 100.0%

✓ ALL TESTS PASSED
```

---

## Next Steps (Phase 2)

Phase 2 will implement:

1. **XP System** - XP formulas, level requirements, XP rewards
2. **Level-Up Mechanics** - HP increases, proficiency progression, stat choices
3. **Guild Hooks** - Customizable level-up bonuses
4. **XP Table Generation** - Progression reference table

Phase 2 integration will require:
- Extending Player data structure with XP tracking
- Hooking into combat end for XP distribution
- Creating level-up command/automatic triggers
- Adding guild-specific level-up rules

---

## Conclusion

Phase 1 is **complete and fully tested** with 100% test success rate. All core combat mechanics are implemented according to the architecture specification:

- ✅ Dice rolling system
- ✅ D&D 5e modifiers and calculations
- ✅ Combat state management
- ✅ Attack roll resolution
- ✅ Damage calculation
- ✅ Advantage/disadvantage mechanics
- ✅ Critical hits and fumbles
- ✅ Resistance and vulnerability
- ✅ Round-based combat processing
- ✅ Comprehensive test coverage

The foundation is ready for Phase 2: XP and Leveling System.
