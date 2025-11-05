# Phase 1 Quick Reference Guide
> **Archived:** Reference for Phase 1 only; consult updated quick starts in `library/combat/`.

## File Locations (Absolute Paths)

### Source Files

**Utilities:**
- `/Users/au288926/Documents/mudmud/src/utils/dice.js` - Dice rolling system
- `/Users/au288926/Documents/mudmud/src/utils/modifiers.js` - Stat modifiers

**Data Structures:**
- `/Users/au288926/Documents/mudmud/src/data/Combat.js` - Combat data structures
- `/Users/au288926/Documents/mudmud/src/data/CombatStats.js` - Combat stats management

**Combat Systems:**
- `/Users/au288926/Documents/mudmud/src/systems/combat/CombatRegistry.js` - Combat state manager
- `/Users/au288926/Documents/mudmud/src/systems/combat/AttackRoll.js` - Attack resolution
- `/Users/au288926/Documents/mudmud/src/systems/combat/DamageCalculator.js` - Damage calculation
- `/Users/au288926/Documents/mudmud/src/systems/combat/CombatResolver.js` - Round processing

**Tests:**
- `/Users/au288926/Documents/mudmud/tests/testRunner.js` - Test framework
- `/Users/au288926/Documents/mudmud/tests/diceTests.js` - Dice tests (24 tests)
- `/Users/au288926/Documents/mudmud/tests/modifierTests.js` - Modifier tests (38 tests)
- `/Users/au288926/Documents/mudmud/tests/combatTests.js` - Combat tests (21 tests)
- `/Users/au288926/Documents/mudmud/tests/integrationTest.js` - Integration tests (5 tests)
- `/Users/au288926/Documents/mudmud/tests/runAllTests.js` - Test runner

**Documentation:**
- `/Users/au288926/Documents/mudmud/COMBAT_XP_ARCHITECTURE.md` - Full architecture spec
- `/Users/au288926/Documents/mudmud/PHASE1_IMPLEMENTATION.md` - Detailed implementation docs
- `/Users/au288926/Documents/mudmud/PHASE1_SUMMARY.md` - Executive summary
- `/Users/au288926/Documents/mudmud/PHASE1_QUICK_REFERENCE.md` - This file

---

## Quick API Reference

### Dice Rolling

```javascript
const dice = require('./src/utils/dice');

// Roll dice
dice.rollD20()                    // 1-20
dice.rollDice('2d6+3')           // Roll 2d6 and add 3
dice.rollDamage('1d8', false)    // Normal damage
dice.rollDamage('1d8', true)     // Critical (2d8)

// Attack rolls
dice.rollAttack('normal')        // Regular d20
dice.rollAttack('advantage')     // 2d20, take higher
dice.rollAttack('disadvantage')  // 2d20, take lower

// Validation
dice.isValidDiceString('1d6')    // true
dice.parseDiceString('2d8+3')    // { count: 2, sides: 8, modifier: 3 }
```

### Stat Modifiers

```javascript
const mods = require('./src/utils/modifiers');

// Ability modifiers
mods.getModifier(14)                    // +2
mods.getModifier(10)                    // +0

// Proficiency
mods.calculateProficiency(1)            // +2 (level 1)
mods.calculateProficiency(5)            // +3 (level 5)

// Combat calculations
mods.calculateArmorClass(14, 2)         // 12 + 2 = 14
mods.calculateAttackBonus(14, 2)        // +2 (STR) + 2 (prof) = +4

// Checks
mods.isHit(15, 14)                      // true (15 >= 14)
mods.isCriticalHit(20)                  // true
mods.isCriticalMiss(1)                  // true

// Advantage
mods.calculateNetAdvantage(1, 0)        // 'advantage'
mods.calculateNetAdvantage(1, 1)        // 'normal'
```

### Combat Registry

```javascript
const CombatRegistry = require('./src/systems/combat/CombatRegistry');

// Start combat
const combat = CombatRegistry.initiateCombat(
  attacker,
  defender,
  'player',
  'npc'
);

// Query combat state
CombatRegistry.isInCombat(entityId)           // boolean
CombatRegistry.getCombatForEntity(entityId)   // Combat object
CombatRegistry.getParticipant(combatId, id)   // Participant object

// Modify combat
CombatRegistry.addParticipant(combatId, entity, type)
CombatRegistry.removeParticipant(combatId, entityId)
CombatRegistry.endCombat(combatId)

// Utilities
CombatRegistry.clearAll()                     // Clear all combats
CombatRegistry.getStats()                     // Get statistics
```

### Attack Resolution

```javascript
const { resolveAttackRoll, grantAdvantage, grantDisadvantage } =
  require('./src/systems/combat/AttackRoll');

// Resolve attack
const result = resolveAttackRoll(attacker, defender, attackerParticipant);
// Returns: { hit, critical, fumble, rolls, total, damage }

// Grant advantage/disadvantage
grantAdvantage(participant, 'flanking', 2)      // 2 rounds
grantDisadvantage(participant, 'prone', 1)      // 1 round
```

### Damage Calculation

```javascript
const { calculateDamage, applyDamageToTarget, resolveAttackDamage } =
  require('./src/systems/combat/DamageCalculator');

// Calculate damage
const dmg = calculateDamage('1d8', false, 'physical', target);
// Returns: { baseDamage, finalDamage, damageType, multiplier, wasResisted, wasVulnerable }

// Apply damage
const result = applyDamageToTarget(target, 10, 'fire');
// Returns: { previousHp, currentHp, damageTaken, died, damageType }

// Complete attack with damage
const fullResult = resolveAttackDamage(attacker, target, attackResult);
```

### Combat Resolution

```javascript
const { processCombatRound, endCombat } =
  require('./src/systems/combat/CombatResolver');

// Process one round
const result = processCombatRound(
  combat,
  getEntityFn,    // (id) => entity
  messageFn       // (id, message) => void
);

// Returns: { turn, actions[], deaths[], ended, reason }

// End combat manually
endCombat(combat, getEntityFn, messageFn);
```

### Combat Stats

```javascript
const {
  createPlayerCombatStats,
  createNpcCombatStats,
  isAlive,
  applyDamage,
  applyHealing
} = require('./src/data/CombatStats');

// Create stats
const playerStats = createPlayerCombatStats(1);  // Level 1
const npcStats = createNpcCombatStats(npcDef);

// Check status
isAlive(entity)      // true if HP > 0

// Modify HP
applyDamage(entity, 5)
applyHealing(entity, 3)
```

---

## Common Patterns

### Creating a Combat

```javascript
const CombatRegistry = require('./src/systems/combat/CombatRegistry');
const { createPlayerCombatStats } = require('./src/data/CombatStats');

// Create player
const player = {
  id: 'player_1',
  username: 'Warrior',
  currentRoom: 'dungeon',
  ...createPlayerCombatStats(1),
  str: 14,
  currentWeapon: {
    name: 'Sword',
    damageDice: '1d8',
    damageType: 'physical'
  }
};

// Create NPC
const goblin = {
  id: 'goblin_1',
  name: 'Goblin',
  roomId: 'dungeon',
  level: 1,
  maxHp: 8,
  currentHp: 8,
  armorClass: 14,
  str: 10,
  dex: 12,
  proficiency: 2,
  currentWeapon: {
    damageDice: '1d6',
    damageType: 'physical'
  },
  resistances: {},
  vulnerabilities: []
};

// Start combat
const combat = CombatRegistry.initiateCombat(player, goblin, 'player', 'npc');
```

### Running Combat Until Completion

```javascript
const { processCombatRound } = require('./src/systems/combat/CombatResolver');

const entities = new Map();
entities.set(player.id, player);
entities.set(goblin.id, goblin);

while (combat.isActive) {
  const result = processCombatRound(
    combat,
    (id) => entities.get(id),
    (id, msg) => {
      const entity = entities.get(id);
      if (entity.socket) entity.socket.write(msg);
    }
  );

  if (result.ended) {
    console.log('Combat ended:', result.reason);
    break;
  }
}
```

### Processing a Single Attack

```javascript
const { resolveAttackRoll } = require('./src/systems/combat/AttackRoll');
const { resolveAttackDamage } = require('./src/systems/combat/DamageCalculator');

const attackerParticipant = CombatRegistry.getParticipant(combat.id, attacker.id);

// Roll attack
const attackResult = resolveAttackRoll(attacker, defender, attackerParticipant);

// Calculate and apply damage
const fullResult = resolveAttackDamage(attacker, defender, attackResult);

console.log('Hit:', fullResult.hit);
console.log('Damage:', fullResult.damage);
console.log('Target died:', fullResult.targetDied);
```

---

## Testing

### Run All Tests
```bash
cd /Users/au288926/Documents/mudmud
npm test
```

### Run Specific Suite
```bash
npm run test:dice
npm run test:modifiers
npm run test:combat
npm run test:integration
```

### Expected Output
```
Total Tests: 88
Total Passed: 88
Total Failed: 0
Success Rate: 100.0%

✓ ALL TESTS PASSED
```

---

## Data Structure Reference

### Combat Object
```javascript
{
  id: string,              // Unique combat ID
  participants: [],        // Array of Participant objects
  currentTurn: number,     // Round counter
  startedAt: number,       // Timestamp
  isActive: boolean,       // Combat active flag
  pendingActions: Map      // Queued actions
}
```

### Participant Object
```javascript
{
  entityId: string,           // Player or NPC ID
  entityType: 'player'|'npc', // Entity type
  initialHp: number,          // HP at combat start
  initialRoomId: string,      // Room at combat start
  effects: [],                // Status effects
  advantageCount: number,     // Advantage sources
  disadvantageCount: number   // Disadvantage sources
}
```

### Player Combat Stats
```javascript
{
  level: 1,
  currentXp: 0,
  maxHp: 10,
  currentHp: 10,
  resource: 100,
  maxResource: 100,
  str: 10, dex: 12, con: 10,
  int: 10, wis: 10, cha: 10,
  proficiency: 2,
  armorClass: 11,
  currentWeapon: {
    name: 'Fists',
    damageDice: '1d4',
    damageType: 'physical'
  }
}
```

### Attack Result
```javascript
{
  hit: boolean,         // Did the attack hit?
  critical: boolean,    // Was it a critical hit?
  fumble: boolean,      // Was it a critical miss?
  rolls: number[],      // d20 rolls (1 or 2)
  total: number,        // Total attack roll
  damage: number        // Damage dealt
}
```

---

## Constants & Defaults

### Default Values
- **Starting HP:** 10
- **Starting AC:** 11 (10 + 1 DEX modifier)
- **Starting Proficiency:** +2
- **Unarmed Damage:** 1d4
- **Starting Level:** 1

### Dice Limits
- **Min Dice Count:** 1
- **Max Dice Count:** 100
- **Min Dice Sides:** 2
- **Max Dice Sides:** 100
- **Max Modifier:** ±1000

### Proficiency Progression
- Levels 1-4: +2
- Levels 5-8: +3
- Levels 9-12: +4
- Levels 13-16: +5
- Continues every 4 levels

### Damage Multipliers
- **Resistance:** 0.5x (half damage)
- **Normal:** 1.0x (full damage)
- **Vulnerability:** 2.0x (double damage)

---

## Error Handling

All functions include error handling:

```javascript
// Example: Invalid dice string
const result = dice.parseDiceString('invalid');
// Returns: null (logs error to console)

// Example: Missing entity
const combat = CombatRegistry.getCombat('nonexistent');
// Returns: null (logs error to console)
```

Check for null returns and handle appropriately.

---

## Performance Notes

- **Dice Rolling:** O(1) - constant time
- **Entity Lookup:** O(1) - Map-based
- **Attack Resolution:** O(1) - single calculation
- **Round Processing:** O(n) - n = participant count
- **All operations:** <1ms for typical scenarios

---

## Next Steps (Phase 2)

Phase 2 will add:
- XP formulas: `Math.round(800 * Math.pow(level, 1.6))`
- Level-up mechanics: +5 HP, proficiency updates
- Guild hooks for custom bonuses

Integration points are ready in:
- `CombatResolver.endCombat()` for XP awards
- `createPlayerCombatStats()` for XP tracking

---

## Support

For questions or issues:
1. Review `/Users/au288926/Documents/mudmud/PHASE1_IMPLEMENTATION.md`
2. Check test files for usage examples
3. Run `npm test` to verify system health

---

**Last Updated:** 2025-11-02
**Status:** Production Ready
**Test Coverage:** 100% (88/88 tests passing)
