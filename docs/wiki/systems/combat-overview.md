---
title: Combat System Overview
status: current
last_updated: 2025-11-10
related: [attack-resolution, damage-calculation, armor-class, combat-stats]
---

# Combat System Overview

The Wumpy MUD combat system is a turn-based D&D 5e-inspired system with automatic round execution. Players initiate combat with NPCs, and rounds execute every 3 seconds until one combatant is defeated. The system supports multiple simultaneous combats, equipment-based bonuses, proficiency checks, and XP rewards.

## Current Implementation Status

The combat system has completed Phases 1-4 with Phase 5 (XP/Leveling) at 90% completion. Core mechanics are fully operational including attack resolution, damage calculation, initiative, turn-based combat flow, equipment integration, and multi-combat support.

| Phase | Focus | Status | Completion |
|-------|-------|--------|------------|
| 1-3 | Core combat mechanics | Complete | 100% |
| 4 | Equipment integration | Complete | 100% |
| 5 | XP and leveling | Near complete | 90% |
| 6+ | Advanced features | Planned | - |

**What Works Now:**
- Basic melee and ranged attacks with D&D 5e resolution
- Equipment system with weapons, armor, jewelry
- Proficiency system with weapon/armor penalties
- Critical hits (natural 20) and critical misses (natural 1)
- Advantage/disadvantage mechanics
- Resistance and vulnerability to damage types
- Multiple simultaneous combats
- Turn-based combat with initiative
- Automatic combat rounds (3-second intervals)
- Death handling and NPC respawn
- XP rewards and level-up system

## How Combat Works

### For Players

Combat is initiated with the `attack` or `kill` command targeting an NPC. Once combat begins, rounds execute automatically every 3 seconds. Players take turns with their opponent based on initiative order. Combat ends when one combatant reaches 0 HP.

**Basic Combat Flow:**
1. Use `look` to see NPCs in the room
2. Type `attack [target]` or `kill [target]` to initiate
3. Watch automatic combat rounds execute
4. Combat ends on death, winner gains XP

**Available Actions:**
- Attack with equipped weapon (automatic each round)
- Flee attempt (requires successful DEX check)
- Use consumable items (potions, scrolls)

**Example Combat:**
```
> attack goblin

Combat has begun!

You land a CRITICAL HIT on Goblin!
12 Physical damage!

Goblin strikes you!
3 Physical damage!

Goblin has been defeated!
You gain 75 XP!
Combat has ended!
```

### For Developers

Combat is managed by the CombatEngine which orchestrates multiple simultaneous combat encounters. Each encounter uses the CombatEncounter class to manage turn order, round execution, and combat resolution.

**Initiating Combat:**
```javascript
const combatEngine = require('./src/combat/combatEngine');
const player = // ... Player object
const npc = world.getNPC('goblin_1');

combatEngine.initiateCombat([player, npc]);
// Combat now runs automatically every 3 seconds
```

**Required Stats:** Every combatant needs:
- `maxHp`, `currentHp` - Health tracking
- `strength`, `dexterity`, `constitution` - Core attributes
- `level`, `proficiency` - Scaling values
- `armorClass` - Defense value
- `resistances` - Damage type resistances object
- `takeDamage(amount)` - Damage application method
- `isDead()` - Death check method

## Core Mechanics

The combat system follows D&D 5e mechanics with MUD-specific adaptations. Attack resolution uses d20 rolls against armor class, damage uses weapon dice plus ability modifiers, and combat follows initiative-based turn order.

### Attack Resolution

| Component | Formula | Example |
|-----------|---------|---------|
| Attack Roll | 1d20 + proficiency + ability modifier + weapon bonus | 1d20 + 2 + 3 + 1 = 1d20 + 6 |
| Hit Check | Attack roll ≥ target AC | 17 ≥ 15 = Hit |
| Critical Hit | Natural 20 (automatic hit) | d20 rolls 20 |
| Critical Miss | Natural 1 (automatic miss) | d20 rolls 1 |

**Ability Modifier Selection:**
- **Melee weapons**: Use STR modifier
- **Finesse weapons**: Use STR or DEX (higher value)
- **Ranged weapons**: Use DEX modifier
- **Unarmed**: Use STR modifier

**Advantage/Disadvantage:** Roll 2d20, take highest (advantage) or lowest (disadvantage). If advantage and disadvantage sources are equal, roll normally.

**Implementation:** `/src/combat/combatResolver.js:rollAttack()`, `/src/systems/combat/AttackRoll.js`

### Damage Calculation

| Component | Formula | Notes |
|-----------|---------|-------|
| Base Damage | Weapon dice + ability modifier | 1d8 + 3 |
| Critical Damage | Roll dice twice, add modifier once | 2d8 + 3 |
| Magical Bonus | Add weapon enhancement | +1, +2, +3 |
| Resistance | damage × (1 - resistance%) | 10 damage × 0.5 = 5 |
| Minimum Damage | Always at least 1 | Math.max(1, damage) |

**Damage Types:** Physical, slashing, piercing, bludgeoning, fire, ice, lightning, poison, necrotic, radiant, psychic, force.

**Critical Hit Mechanics:** When a natural 20 is rolled, weapon dice are rolled twice but ability modifiers and magical bonuses are only added once. For example, a longsword (1d8) with +3 STR and +1 magical bonus deals 2d8 + 3 + 1 on a critical hit.

**Implementation:** `/src/combat/combatResolver.js:rollDamage()`

### Armor Class

Armor Class (AC) determines how difficult a character is to hit. The base AC is 10, modified by dexterity and equipment.

| AC Component | Value | Restrictions |
|--------------|-------|--------------|
| Base AC | 10 | Always |
| DEX Modifier | +0 to +5 (typical) | Capped by armor type |
| Armor Bonus | Varies by armor | Plate: +8, Leather: +1 |
| Shield Bonus | +2 | Requires off-hand slot |
| Magical Bonuses | +1 to +3 | Rings, cloaks, etc. |

**DEX Caps by Armor Type:**
- **No armor/Light armor**: Unlimited DEX bonus
- **Medium armor**: Max +2 DEX bonus
- **Heavy armor**: No DEX bonus (0)

**Example AC Calculations:**
- Unarmored (14 DEX): 10 + 2 = 12 AC
- Leather armor (14 DEX): 11 + 2 = 13 AC
- Plate armor (14 DEX): 18 + 0 = 18 AC
- Chain shirt + shield (14 DEX): 13 + 2 + 2 = 17 AC

**Implementation:** `/src/systems/equipment/EquipmentManager.js:calculateAC()`

### Initiative and Turn Order

Initiative determines who acts first in combat. Each combatant rolls 1d20 + DEX modifier at the start of combat. Highest roll acts first, then participants alternate turns.

**Initiative Formula:** 1d20 + DEX modifier

**Tie Breaking:** If initiative scores are equal, compare raw DEX scores. If still tied, roll randomly.

**Turn Structure:** Combat proceeds in rounds. In each round, participants take one action in initiative order. Rounds execute automatically every 3 seconds.

**Implementation:** `/src/combat/initiative.js`

## Equipment Integration

The combat system integrates with the equipment system to apply weapon damage, armor protection, and magical bonuses.

### Weapon Integration

| Property | Purpose | Example |
|----------|---------|---------|
| `damageDice` | Base weapon damage | "1d8", "2d6" |
| `damageDiceTwo` | Two-handed damage (versatile) | "1d10" |
| `weaponClass` | Proficiency category | "swords", "bows" |
| `isFinesse` | Can use DEX instead of STR | true/false |
| `isRanged` | Uses DEX for attack/damage | true/false |
| `isTwoHanded` | Requires both hands | true/false |
| `attackBonus` | Magical attack bonus | +1, +2, +3 |
| `damageBonus` | Magical damage bonus | +1, +2, +3 |

**Dual Wielding:** When wielding two light weapons, the off-hand weapon attacks automatically each round but doesn't add ability modifier to damage (D&D 5e standard).

**Versatile Weapons:** Weapons like longswords can be used one-handed (1d8) or two-handed (1d10). The system automatically uses two-handed damage if no off-hand item is equipped.

### Armor Integration

Armor provides AC bonuses and may impose DEX caps or stealth disadvantages.

| Armor Type | Base AC | DEX Cap | Proficiency Required |
|------------|---------|---------|----------------------|
| Leather (light) | 11 | Unlimited | Light armor |
| Chain shirt (medium) | 13 | +2 | Medium armor |
| Breastplate (medium) | 14 | +2 | Medium armor |
| Half plate (medium) | 15 | +2 | Medium armor |
| Chain mail (heavy) | 16 | 0 | Heavy armor |
| Plate (heavy) | 18 | 0 | Heavy armor |
| Shield | +2 AC | - | Shields |

**Proficiency Penalties:** Wearing armor without proficiency imposes -2 (medium) or -4 (heavy) penalty to attack rolls.

### Magical Effects

Equipment can provide stat bonuses, resistances, and special effects that trigger during combat.

**Common Magical Properties:**
- **Stat bonuses**: +1 to +5 to STR, DEX, CON, etc.
- **AC bonuses**: +1 to +3 AC from rings, cloaks
- **Attack bonuses**: +1 to +3 to hit from magical weapons
- **Damage bonuses**: +1 to +3 damage from magical weapons
- **Resistances**: 25%, 50%, or 100% resistance to damage types
- **Special effects**: Life steal, extra damage dice, on-hit effects

**Attunement:** Magical items with `requiresAttunement: true` only provide bonuses when attuned. Players can attune to maximum 3 items at once.

**Implementation:** `/src/systems/equipment/EquipmentManager.js`, `/src/items/BaseItem.js`

## Proficiency System

The proficiency system determines whether a character can effectively use weapons and armor. Using equipment without proficiency imposes penalties.

| Proficiency Type | Penalty If Not Proficient | Examples |
|------------------|---------------------------|----------|
| Weapon | -4 attack roll penalty | Swords, axes, bows |
| Light armor | No penalty | Leather, padded |
| Medium armor | -2 attack roll penalty | Chain shirt, hide |
| Heavy armor | -4 attack roll penalty | Plate, chain mail |

**Checking Proficiency:**
```javascript
const profCheck = EquipmentManager.checkProficiency(player, weapon);
// Returns: { isProficient: boolean, penalty: number }
```

**Proficiency Bonus:** Separate from weapon proficiency, this is a level-based bonus (+2 at L1-4, +3 at L5-8, etc.) added to all attack rolls and ability checks.

**Implementation:** `/src/systems/equipment/EquipmentManager.js:checkProficiency()`

## XP and Leveling

Players gain experience points (XP) from defeating NPCs. When accumulated XP reaches the threshold for the next level, the player automatically levels up with stat increases and full HP restoration.

**XP Award Formula:**
```
Base XP = NPC.xpReward || (NPC.level × 50)
Level Diff = NPC.level - Player.level
Multiplier = 1 + (Level Diff × 0.2)
Multiplier = clamp(Multiplier, 0.1, 2.0)
Final XP = floor(Base XP × Multiplier)
```

**Level Thresholds (cumulative):**
- Level 2: 1,000 XP
- Level 3: 3,000 XP
- Level 4: 6,000 XP
- Level 5: 10,000 XP
- Formula: `1000 × (level ^ 1.5)`

**Level-Up Stat Gains:**
- **Every level**: +5 max HP, full HP restore
- **Every 4th level**: +1 to primary stat (STR)
- **Every 5th level**: +1 CON
- **Every 6th level**: +1 DEX

**Implementation:** `/src/progression/xpSystem.js`, `/src/progression/xpTable.js`

## System Integration Points

The combat system integrates with multiple other game systems.

| System | Integration | Files |
|--------|-------------|-------|
| **Equipment** | Weapon/armor stats, proficiency checks | EquipmentManager.js, combatResolver.js |
| **Items** | Item definitions, magical properties | ItemRegistry.js, BaseItem.js |
| **Progression** | XP awards, level-up, stat gains | xpSystem.js, statProgression.js |
| **Commands** | Attack, flee, rest commands | commands.js |
| **NPCs** | NPC stats, AI behavior, respawn | world.js, combatAI.js |
| **Corpse System** | Corpse creation on NPC death | CorpseManager.js |
| **Persistence** | Save combat stats, XP, level | playerDB methods |

## Architecture

The combat system uses an engine-encounter pattern where CombatEngine manages multiple simultaneous combats and CombatEncounter manages individual combat instances.

### Core Components

| Component | Purpose | File |
|-----------|---------|------|
| **CombatEngine** | Multi-combat orchestrator | `/src/combat/combatEngine.js` |
| **CombatEncounter** | Single combat instance | `/src/combat/CombatEncounter.js` |
| **combatResolver** | Attack/damage calculations | `/src/combat/combatResolver.js` |
| **AttackRoll** | Attack roll logic with advantage | `/src/systems/combat/AttackRoll.js` |
| **initiative** | Turn order determination | `/src/combat/initiative.js` |
| **combatAI** | NPC behavior and tactics | `/src/combat/combatAI.js` |
| **damageTypes** | Damage type registry | `/src/combat/damageTypes.js` |
| **combatMessages** | Combat text generation | `/src/combat/combatMessages.js` |

### Combat Flow

**Initiation:** Player types `attack [target]` → Command parser finds NPC → `combatEngine.initiateCombat([player, npc])` called → CombatEncounter created.

**Initiative:** Each combatant rolls 1d20 + DEX modifier → Sort by initiative score → Determine turn order.

**Round Execution:** Every 3 seconds, CombatEncounter executes one round. For each participant in turn order: roll attack vs AC, if hit roll damage, apply damage via `takeDamage()`, check `isDead()`.

**Combat End:** When any combatant reaches 0 HP, combat ends. Winner gains XP (if applicable), loser dies/respawns. CombatEncounter is removed from active combats list.

**Persistence:** Player stats (HP, XP, level) are persisted to database after combat. NPC stats are reset on respawn.

## Testing and Validation

The combat system has comprehensive test coverage with 34/34 tests passing.

**Test Files:**
- `/tests/combatTests.js` - Core combat mechanics
- `/tests/test_combat_modules.js` - Module loading tests
- `/tests/test_combat_encounter.js` - Full encounter simulation
- `/tests/combatEquipmentIntegrationTest.js` - Equipment integration
- `/tests/combatBalanceSimulation.js` - Balance testing

**Manual Testing:**
1. Test basic combat: `attack goblin`
2. Test equipment effects: Equip weapon, verify damage changes
3. Test proficiency penalties: Equip unproficient armor
4. Test XP gain: Defeat NPC, check XP award
5. Test level-up: Gain enough XP, verify stat gains
6. Test simultaneous combats: Multiple players fighting different NPCs

## Future Development

**Planned Features (Phase 6+):**
- Spell casting system
- Status effects (buffs, debuffs, DoTs)
- Group combat and AoE attacks
- Player vs Player (PvP) combat
- Advanced NPC AI (tactics, spell usage, cooperation)
- Legendary items with unique effects
- Combat log and replay

**Known Issues:**
- Proficiency bonus not updating on level-up (fix in progress)
- Flee success rate may need balance adjustment
- Some magical effect types not yet implemented

## See Also

- [Combat Stats Reference](../../reference/combat-stats.md) - Quick lookup tables
- [Item Properties Reference](../../reference/item-properties.md) - Equipment property tables
<!-- Future detailed mechanics pages (not yet created):
- [Attack Resolution](../mechanics/attack-resolution.md) - Detailed attack mechanics
- [Damage Calculation](../mechanics/damage-calculation.md) - Detailed damage mechanics
- [Armor Class](../mechanics/armor-class.md) - Detailed AC mechanics
-->

---

**For detailed formulas and reference tables, see:** `/docs/reference/combat-stats.md`

**For implementation details, see:** Source files in `/src/combat/` and `/src/systems/combat/`
