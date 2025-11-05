# Combat System Quick Reference
**The Wumpy and Grift MUD**

This is a condensed reference guide for the combat and XP systems. See `COMBAT_XP_ARCHITECTURE.md` for full details.

---

## Core Formulas (At-a-Glance)

### Attack Roll
```
Roll: 1d20 + Proficiency + Ability Modifier + Equipment
Hit if: Roll >= Target AC
Critical Hit: Natural 20
Critical Miss: Natural 1
```

### Damage
```
Damage: Dice Roll + Ability Modifier + Equipment
Critical: Roll dice twice, add modifiers once
Final: Apply resistance (% reduction)
```

### Armor Class
```
AC = 10 + DEX Modifier + Armor + Shield
```

### Initiative
```
Initiative = 1d20 + DEX Modifier
```

### HP
```
Max HP = 10 + (Level × 5) + (CON Mod × Level)
```

### XP to Level
```
Level 1→2: 1,000 XP
Level 2→3: 3,000 XP total
Level 3→4: 6,000 XP total
Level 4→5: 10,000 XP total
Formula: 1000 × (level ^ 1.5) cumulative
```

### Ability Modifiers
```
Stat  Modifier
3-4   -3
5-6   -2
7-8   -1
9-10   0
11-12 +1
13-14 +2
15-16 +3
17-18 +4
19-20 +5

Formula: floor((Stat - 10) / 2)
```

---

## Damage Types

| Type | Color | Icon | Common Use |
|------|-------|------|------------|
| Physical | Red | ⚔️ | Weapons, unarmed |
| Fire | Yellow | 🔥 | Burning attacks |
| Ice | Cyan | ❄️ | Freezing attacks |
| Lightning | Blue | ⚡ | Shock attacks |
| Poison | Green | ☠️ | Toxins, DoT |
| Necrotic | Magenta | 💀 | Death magic |
| Radiant | White | ✨ | Holy damage |
| Psychic | Purple | 🧠 | Mental attacks |

**Resistance Calculation:**
```javascript
finalDamage = rawDamage × (1 - resistance/100)

Example:
20 damage with 25% resistance = 20 × 0.75 = 15 damage
20 damage with -25% (vulnerable) = 20 × 1.25 = 25 damage
```

---

## Combat Flow

1. **Initiate:** Player uses `attack [target]` or `kill [target]`
2. **Initiative:** Both roll 1d20 + DEX modifier
3. **Rounds:** Highest initiative acts first, then alternates
4. **Actions:** Attack, flee, or use item
5. **Resolution:** Combat ends on death or successful flee
6. **Rewards:** Winner gains XP, loser respawns/dies

---

## Player Stats Schema

```javascript
{
  // Core Stats (base 10)
  strength: 10,      // Melee attack/damage
  dexterity: 10,     // Initiative, AC, ranged
  constitution: 10,  // HP
  intelligence: 10,  // Future: spell power
  wisdom: 10,        // Future: spell resist
  charisma: 10,      // Future: persuasion

  // Combat
  level: 1,
  xp: 0,
  hp: 20,
  maxHp: 20,
  armorClass: 10,

  // Resistances (0-100%)
  resistances: {
    physical: 0,
    fire: 0,
    ice: 0,
    lightning: 0,
    poison: 0,
    necrotic: 0,
    radiant: 0,
    psychic: 0
  },

  // State
  inCombat: false,
  combatTarget: null,
  combatInitiative: 0
}
```

---

## NPC Combat Schema

```javascript
{
  "id": "example_npc",
  "name": "Example NPC",
  "level": 3,
  "hp": 30,  // This becomes maxHp

  "combatStats": {
    "strength": 12,
    "dexterity": 10,
    "constitution": 14,
    "intelligence": 8,
    "wisdom": 10,
    "charisma": 6
  },

  "armorClass": 13,
  "attackBonus": 3,
  "damageType": "physical",
  "damageDice": "1d6",
  "xpReward": 100,

  "resistances": {
    "physical": 0,
    "fire": 10,
    "ice": -20
  },

  "attackMessages": [
    "{npc} claws at {target}!",
    "{npc} strikes {target}!"
  ],

  "deathMessages": [
    "{npc} collapses!",
    "{npc} falls defeated!"
  ],

  "aggressive": false,
  "fleeThreshold": 0.2,
  "callsForHelp": false
}
```

---

## File Structure

```
src/
├── combat/
│   ├── combatEngine.js       - Main orchestrator
│   ├── combatResolver.js     - Attack/damage logic
│   ├── damageTypes.js        - Damage type registry
│   ├── initiative.js         - Turn order
│   ├── combatAI.js          - NPC behavior
│   └── combatMessages.js     - Text generation
│
├── progression/
│   ├── xpSystem.js          - XP gain/level-up
│   ├── xpTable.js           - Level thresholds
│   └── statProgression.js   - Stat calculations
│
└── utils/
    ├── dice.js              - Dice rolling
    └── mathUtils.js         - Math helpers
```

---

## Key Commands

```
attack [target]  - Initiate combat
kill [target]    - Alias for attack
flee             - Attempt to escape (1d20+DEX vs DC)
rest             - Recover HP (25% max HP, 1min cooldown)
score            - View character stats
look             - See room with HP bars
```

---

## Implementation Phases

| Phase | Focus | Time | Priority |
|-------|-------|------|----------|
| 1 | Foundation (data, utils) | 4-6h | Critical |
| 2 | Combat Resolution (attacks) | 6-8h | Critical |
| 3 | Combat Engine (orchestration) | 8-10h | Critical |
| 4 | NPC AI (behavior) | 4-6h | High |
| 5 | XP/Levelling | 5-7h | High |
| 6 | Commands/Polish | 4-6h | High |
| 7 | NPC Updates | 3-4h | Medium |
| **Total** | | **34-47h** | |

**MVP (Phases 1-3):** 18-24 hours

---

## Level Progression Example

### Level 1 Character
```
HP: 15 (10 + 5 + CON 0)
Stats: All 10
Proficiency: +1
XP to Level 2: 1,000
```

### Level 5 Character
```
HP: 45 (10 + 25 + CON +10)
Stats: STR 11, DEX 11, CON 12, others 10
Proficiency: +2
XP to Level 6: 15,000 total
```

### Level 10 Character
```
HP: 100 (10 + 50 + CON +40)
Stats: STR 13, DEX 12, CON 14, others 11
Proficiency: +3
XP to Level 11: 55,000 total
```

---

## Stat Gains on Level-Up

- **HP:** +5 every level
- **Primary Stat:** +1 every 4 levels (4, 8, 12, 16...)
- **Constitution:** +1 every 5 levels (5, 10, 15, 20...)
- **Full Heal:** HP restored to max on level-up

---

## Integration Points

### PlayerDB Methods (New)
```javascript
updatePlayerXP(username, xp)
updatePlayerLevel(username, level, maxHp, hp)
updatePlayerStats(username, stats)
updatePlayerHP(username, hp)
```

### World Methods (New)
```javascript
getNPC(npcId)           - Get NPC instance with current HP
updateNPCHP(npcId, hp)  - Update NPC HP
respawnNPC(npcId)       - Respawn NPC with full HP
```

### Colors Functions (New)
```javascript
colors.combat(text)    - Combat actions
colors.hit(text)       - Successful attacks
colors.miss(text)      - Missed attacks
colors.critical(text)  - Critical hits
colors.damage(text)    - Damage numbers
colors.xpGain(text)    - XP rewards
colors.levelUp(text)   - Level-up messages
```

---

## Testing Checklist

**Foundation:**
- [ ] Dice rolling: `rollD20()` returns 1-20
- [ ] XP table: `getXPForLevel(5)` correct
- [ ] Modifiers: `getModifier(16)` = +3
- [ ] Player stats persist in database

**Combat Resolution:**
- [ ] Attack roll vs AC determines hit
- [ ] Damage applies with resistances
- [ ] Critical hits double dice only
- [ ] HP updates correctly

**Combat Engine:**
- [ ] Full combat: player vs NPC
- [ ] Initiative determines turn order
- [ ] Combat ends on death
- [ ] NPC respawns after defeat

**XP System:**
- [ ] XP awarded on NPC defeat
- [ ] Level-up triggers correctly
- [ ] Stats increase on level-up
- [ ] Score shows XP progress

**Commands:**
- [ ] `attack` initiates combat
- [ ] `flee` escapes combat
- [ ] `rest` recovers HP
- [ ] Combat prevents movement
- [ ] Combat messages broadcast to room

---

## Design Decisions Summary

- **D20 System:** Familiar to modern gamers, balanced, impactful modifiers
- **Turn-Based:** MUD tradition, tactical, connection-agnostic
- **Single HP Pool:** Simple, standard, extensible
- **Percentage Resistance:** Scales naturally, intuitive
- **8 Damage Types:** Tactical variety without overwhelming complexity
- **No Mana for Basic Attacks:** Simplifies combat, reserves mana for spells

---

## Future Extensions

- **Guilds:** Class-specific abilities and spells
- **Equipment:** Weapons, armor, enchantments
- **Status Effects:** Buffs, debuffs, DoTs
- **Group Combat:** Multiple combatants, AoE attacks
- **PvP:** Dueling, arenas, honor system
- **Quest XP:** Completion rewards, chains
- **Advanced AI:** Tactics, spell usage, cooperation

---

*See COMBAT_XP_ARCHITECTURE.md for complete specifications*
