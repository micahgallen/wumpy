# Combat System - Quick Start Guide

**Status:** ✅ Fully Operational (Phase 2 & 3 Complete)
**Last Updated:** 2025-11-02

---

## For Players

### How to Fight

1. **Find an NPC:**
   ```
   look
   ```

2. **Attack:**
   ```
   attack big bird
   kill big bird
   attack goblin
   ```

3. **Watch combat execute automatically** (every 3 seconds)

4. **Combat ends when someone dies**

### What You'll See

```
Combat has begun!

You land a CRITICAL HIT on Big Bird!
12 Physical damage!

Big Bird strikes you!
3 Physical damage!

Big Bird has been defeated!
Combat has ended!
```

**Note:** You cannot flee yet - fight to the death! 💀

---

## For Developers

### Running Tests

```bash
# Test all combat modules load correctly
node test_combat_modules.js

# Test full combat encounter simulation
node test_combat_encounter.js
```

### Adding a Combat Command

```javascript
// In src/commands.js
commands.specialAttack = (player, args, world, playerDB, allPlayers, activeInteractions, combatEngine) => {
  const target = findNPCByName(args.join(' '), player, world);
  if (!target) {
    player.send(colors.error('Target not found!\n'));
    return;
  }

  // Custom logic here

  combatEngine.initiateCombat([player, target]);
};
```

### Key Files

**Core Combat:**
- `src/combat/combatResolver.js` - Attack & damage calculations
- `src/combat/initiative.js` - Turn order
- `src/combat/CombatEncounter.js` - Single combat instance
- `src/combat/combatEngine.js` - Multi-combat manager

**Integration:**
- `src/server.js` - Player combat stats
- `world.js` - NPC combat initialization
- `src/commands.js` - Attack command

### Combat Stats Required

```javascript
// Every combatant needs:
{
  maxHp: number,
  currentHp: number,
  strength: number,
  dexterity: number,
  constitution: number,
  resistances: {},
  takeDamage(amount),
  isDead()
}
```

### Initiating Combat

```javascript
const combatEngine = // ... from server context
const player = // ... Player object
const npc = world.getNPC('goblin_1');

combatEngine.initiateCombat([player, npc]);
// Combat now runs automatically every 3 seconds
```

---

## Combat Mechanics (D&D 5e Based)

### Attack Roll
```
d20 + Proficiency + Ability Modifier >= Target AC
Natural 20 = Critical Hit (double damage)
Natural 1 = Automatic Miss
```

### Damage
```
1d6 damage dice (currently hardcoded)
Critical: Roll dice twice
Apply resistance: damage × (1 - resistance%)
```

### Initiative
```
d20 + DEX Modifier
Highest goes first
Ties broken by DEX score
```

### Ability Modifier
```
floor((ability - 10) / 2)

Examples:
10 → +0
14 → +2
16 → +3
```

### Proficiency Bonus
```
floor(level / 4) + 1

Level 1-4: +1
Level 5-8: +2
Level 9-12: +3
```

---

## What Works Now

✅ Basic melee attacks
✅ d20 attack resolution
✅ Damage with critical hits
✅ Initiative system
✅ Turn-based combat
✅ Automatic end on death
✅ Color-coded messages
✅ Multiple simultaneous combats

---

## What's Coming Next

❌ XP rewards
❌ Level-up system
❌ Equipment (weapons/armor)
❌ Flee command
❌ Status effects
❌ Spell casting
❌ Multiple enemies
❌ Player vs Player

---

## Common Issues

**"Attack command not found"**
- Make sure you're using: `attack [name]` or `kill [name]`

**"You don't see [name] here"**
- Use `look` to see NPCs in the room
- Try different keywords (e.g., "bird" instead of "big bird")

**Combat feels slow**
- Rounds execute every 3 seconds (by design)
- This gives time to read messages

**Can't flee**
- Not implemented yet - you must defeat the enemy

**HP doesn't show**
- Use `score` command (HP display coming soon)

---

## Architecture

```
Player types "attack goblin"
         ↓
Command parser → attack command
         ↓
Find NPC by keywords
         ↓
combatEngine.initiateCombat([player, npc])
         ↓
CombatEncounter created
         ↓
Roll initiative, determine turn order
         ↓
setInterval: Execute rounds every 3s
         ↓
For each participant in turn order:
  - Roll attack vs AC
  - If hit, roll damage
  - Apply damage via takeDamage()
  - Check isDead()
         ↓
If anyone dead → end combat
         ↓
Remove from active combats list
```

---

## Documentation

**Complete Details:**
- `docs/COMBAT_IMPLEMENTATION_STATUS.md` - Full technical report
- `docs/PHASE_2_3_COMPLETION_SUMMARY.md` - Implementation summary
- `docs/COMBAT_XP_ARCHITECTURE.md` - Complete specification
- `docs/COMBAT_IMPLEMENTATION_PLAN.md` - Original plan

**This File:**
- Quick reference for getting started
- Most common use cases
- Key mechanics at a glance

---

## Quick Reference

**Commands:**
```
attack [target]    Start combat
kill [target]      Start combat (alias)
look               See NPCs in room
score              Check your stats
```

**Test Scripts:**
```bash
node test_combat_modules.js      # Module test
node test_combat_encounter.js    # Full combat test
```

**Key Stats:**
- HP: Hit points (default: 20)
- STR: Strength (affects attack/damage)
- DEX: Dexterity (affects AC/initiative)
- CON: Constitution (future: affects max HP)

**Default Values:**
- Player HP: 20
- Player abilities: 10 (all)
- Player level: 1
- NPC stats: Loaded from JSON files

---

**Need help?** Check the full documentation in `docs/COMBAT_IMPLEMENTATION_STATUS.md`

**Found a bug?** All known issues are documented in the status report.

**Ready to fight!** ⚔️🛡️
