# Phase 5 & 6 Implementation Plan
## Complete Combat & Progression System

**Date:** 2025-11-04
**Status:** Phase 5 ~95% Complete | Phase 6 ~30% Complete
**Overall Completion:** ~70%

---

## Executive Summary

The MUD combat system is functionally complete with D&D 5e-based mechanics, automatic XP/leveling, NPC AI with flee mechanics, and death handling. However, critical gameplay features remain incomplete: player flee command, rest/healing mechanics, equipment system, and HP balance tuning.

### Current System Health
- ✅ **Combat Resolution:** Fully functional (d20 + modifiers vs AC)
- ✅ **XP System:** Complete with level-diff scaling
- ✅ **Automatic Leveling:** Working with stat gains
- ✅ **NPC AI:** Flee mechanics with attack of opportunity
- ⚠️ **HP Balance:** TTK ~50-60 seconds (acceptable but needs tuning)
- ❌ **Player Healing:** No rest/recovery mechanics
- ❌ **Player Fleeing:** NPCs can flee, players cannot
- ❌ **Equipment:** Framework exists, not functional

---

## Table of Contents

1. [Current System Analysis](#1-current-system-analysis)
2. [HP Balance & TTK Review](#2-hp-balance--ttk-review)
3. [Phase 5 Remaining Tasks](#3-phase-5-remaining-tasks)
4. [Phase 6 Remaining Tasks](#4-phase-6-remaining-tasks)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Testing Strategy](#6-testing-strategy)

---

## 1. Current System Analysis

### 1.1 Player HP System (COMPLETE ✅)

**Starting HP:** 20 HP (hardcoded, no CON modifier)
**HP Per Level:** +5 HP per level (flat rate)
**Level-Up Behavior:** Full heal on level-up

```javascript
// src/progression/statProgression.js:12
gains.hp = 5;  // Fixed 5 HP per level

// src/progression/xpSystem.js:57
player.hp = player.maxHp;  // Full heal
```

**Progression Table:**
| Level | Max HP | Total Gain |
|-------|--------|------------|
| L1 | 20 | (start) |
| L2 | 25 | +5 |
| L5 | 40 | +20 |
| L10 | 65 | +45 |
| L20 | 115 | +95 |

**Issue Identified:** No CON modifier affects starting HP or HP-per-level gains.

### 1.2 NPC HP System (COMPLETE ✅)

**HP Definition:** Hardcoded per NPC in JSON files
**Default Fallback:** 10 HP if not specified

**Example NPCs:**
- Yellow Wumpy (L1): 20 HP
- Arena Champion (L4): 45 HP
- Big Bird (L5): 100 HP
- Bartender (L5): 120 HP

**Observation:** HP varies significantly at same level - intentional design for difficulty variation.

### 1.3 Damage System (COMPLETE ✅)

**Unarmed Damage:** `1d3 + STR modifier` (min 1)
**Weapon Damage:** Framework exists, not yet functional
**Critical Hits:** Total damage × 2

```javascript
// src/combat/combatResolver.js:42
return '1d3';  // Unarmed default

// src/combat/combatResolver.js:60-64
if (isUnarmed || weaponUsesStr) {
  baseDamage += strModifier;
}
```

**Average Damage by Level:**
- L1 (STR 10): 1d3 + 0 = **2.0 avg**
- L5 (STR 14): 1d3 + 2 = **4.0 avg**
- L10 (STR 16): 1d3 + 3 = **5.0 avg**

### 1.4 XP & Leveling System (COMPLETE ✅)

**XP Award Integration:**
- Awarded on NPC death (`CombatEncounter.js:149-150`)
- Scales with level difference (±20% per level)
- Min 10%, Max 200% of base XP

**Level-Up Mechanics:**
- Automatic threshold detection
- Multi-level support (recursive check)
- Stat gains applied via `calculateStatGains()`
- Full heal on level-up

**Files Verified:**
- ✅ `src/progression/xpSystem.js` - Award and level-up logic
- ✅ `src/progression/xpTable.js` - XP table L1-50
- ✅ `src/progression/statProgression.js` - Stat gain formulas
- ✅ `src/combat/CombatEncounter.js` - XP award integration

### 1.5 Combat Commands Status

**Implemented:**
- ✅ `attack [target]` - Initiate combat
- ✅ `kill [target]` - Alias for attack
- ✅ `score` - View character stats with XP progress

**Not Implemented:**
- ❌ `flee [direction]` - Player escape from combat
- ❌ `rest` - Regenerate HP
- ❌ `equip [weapon]` - Equip weapons
- ❌ `unequip [slot]` - Remove equipment

---

## 2. HP Balance & TTK Review

### 2.1 Current TTK Analysis

**Combat Round Timing:** 3 seconds per round

**L1 vs L1 Combat (even level):**
- Attack Bonus: +2 (proficiency)
- AC: 10 (base)
- Hit Chance: ~50%
- Average Damage: 2.0 × 0.5 = **1.0 DPR**
- TTK: 20 HP / 1.0 DPR = **20 rounds** = **60 seconds**

**L5 vs L5 Combat (STR 14, DEX 12):**
- Attack Bonus: +5 (prof +3, STR +2)
- AC: 11 (base 10, DEX +1)
- Hit Chance: ~65%
- Average Damage: 4.0 × 0.65 = **2.6 DPR**
- TTK: 40 HP / 2.6 DPR = **~15 rounds** = **~45 seconds**

**L10 vs L10 Combat (STR 16, DEX 14):**
- Attack Bonus: +7 (prof +4, STR +3)
- AC: 12 (base 10, DEX +2)
- Hit Chance: ~75%
- Average Damage: 5.0 × 0.75 = **3.75 DPR**
- TTK: 65 HP / 3.75 DPR = **~17 rounds** = **~51 seconds**

### 2.2 TTK Balance Assessment

**Target TTK (from COMBAT_XP_ARCHITECTURE.md):**
- Even-level fight: 4-6 rounds (12-18 seconds)
- ~60% hit rate for even encounters

**Current State:**
- ❌ **TTK too long:** 15-20 rounds vs target 4-6 rounds
- ✅ **Hit rate acceptable:** 50-75% vs target ~60%
- ❌ **Damage too low:** 1d3 base is very weak
- ✅ **Progression reasonable:** TTK stays consistent across levels

### 2.3 HP Balance Recommendations

#### Option A: Reduce HP (Conservative)
**Change:** Reduce starting HP and HP-per-level gains
- Starting HP: 20 → **12**
- HP per level: +5 → **+3**

**New Progression:**
| Level | Old HP | New HP | TTK (rounds) |
|-------|--------|--------|--------------|
| L1 | 20 | 12 | 12 (target 4-6) |
| L5 | 40 | 24 | 9 (target 4-6) |
| L10 | 65 | 39 | 10 (target 4-6) |

**Pros:** Faster combat without changing damage
**Cons:** Players feel fragile, death more common

#### Option B: Increase Damage (Aggressive)
**Change:** Buff base unarmed damage and add weapon system
- Unarmed: 1d3 → **1d4+1** (avg 3.5 → 4.5)
- Add weapons: 1d6 (short sword), 1d8 (longsword), 2d6 (greatsword)

**New TTK with 1d4+1:**
| Level | HP | New DPR | TTK (rounds) |
|-------|-------|---------|--------------|
| L1 | 20 | 2.25 | 9 (target 4-6) |
| L5 | 40 | 5.2 | 8 (target 4-6) |
| L10 | 65 | 7.5 | 9 (target 4-6) |

**Pros:** Players feel powerful, weapon progression meaningful
**Cons:** High-level damage may become excessive

#### Option C: Hybrid Approach (RECOMMENDED)
**Change:** Moderate adjustments to both HP and damage
- Starting HP: 20 → **15**
- HP per level: +5 → **+4**
- Unarmed: 1d3 → **1d4**
- Add CON modifier to HP gains

**New Progression:**
| Level | Base HP | +CON | Effective HP | TTK (rounds) |
|-------|---------|------|--------------|--------------|
| L1 | 15 | +0 | 15 | 8 rounds |
| L5 | 31 | +2 | 33 | 8 rounds |
| L10 | 51 | +4 | 55 | 9 rounds |

**Formula:**
```javascript
// Starting HP
startingHp = 15 + getModifier(constitution);

// HP per level
hpGain = 4 + getModifier(constitution);
```

**Pros:**
- Balanced TTK closer to target (8-9 rounds)
- CON stat becomes meaningful
- Guild customization easier (modify base values)
- Gradual power scaling

**Cons:**
- Requires changes to multiple files
- Existing characters need HP adjustment

### 2.4 Guild-Based HP Modifiers (Future)

**Architecture for guild customization:**

```javascript
// Example: Warrior Guild
const WARRIOR_HP_BONUS = {
  startingHp: +5,      // 15 → 20
  hpPerLevel: +2       // 4 → 6
};

// Example: Mage Guild
const MAGE_HP_PENALTY = {
  startingHp: -2,      // 15 → 13
  hpPerLevel: -1       // 4 → 3
};
```

**Implementation Hook:**
```javascript
function calculateStatGains(player) {
  let baseHp = 4;

  // Apply guild modifier
  if (player.guild) {
    baseHp += GUILD_HP_MODIFIERS[player.guild].hpPerLevel || 0;
  }

  // Apply CON modifier
  baseHp += getModifier(player.constitution);

  gains.hp = Math.max(1, baseHp);  // Min 1 HP per level
}
```

---

## 3. Phase 5 Remaining Tasks

### Status: ~95% Complete

**Completed:**
- ✅ XP award on NPC death
- ✅ Level-up trigger at XP threshold
- ✅ Stat gains on level-up
- ✅ HP increase per level
- ✅ Full heal on level-up
- ✅ Level-up notification messages
- ✅ XP display in score command
- ✅ Multi-level gain support

**Remaining:**

#### Task 5.1: Proficiency Bonus Update (CRITICAL)
**Status:** ⚠️ NOT IMPLEMENTED
**Priority:** CRITICAL
**Estimated Time:** 15 minutes

**Issue:** Proficiency bonus not updated in `levelUp()` function, causing attack bonus to stagnate.

**Fix Required:**
```javascript
// src/progression/xpSystem.js:49-51
const { getProficiencyBonus } = require('./statProgression');

function levelUp(player, playerDB) {
  player.level++;

  // CRITICAL FIX: Update proficiency
  player.proficiency = getProficiencyBonus(player.level);

  const statGains = calculateStatGains(player);
  applyStatGains(player, statGains);
  // ...
}
```

**Testing:**
- Player at L4 with prof +2 levels to L5
- Verify proficiency increases to +3
- Verify attack bonus reflects change

**Files to Modify:**
- `src/progression/xpSystem.js` (1 line addition, 1 import)

#### Task 5.2: HP Balance Implementation
**Status:** ❌ NOT IMPLEMENTED
**Priority:** HIGH
**Estimated Time:** 1-2 hours
**Agent:** combat-mechanic

**Scope:** Implement Option C (Hybrid Approach)

**Changes Required:**

1. **Update Starting HP** (`src/server.js:30`)
   ```javascript
   // Old:
   this.hp = 20;
   this.maxHp = 20;

   // New:
   const conMod = Math.floor((this.constitution - 10) / 2);
   this.maxHp = 15 + conMod;
   this.hp = this.maxHp;
   ```

2. **Update HP-Per-Level** (`src/progression/statProgression.js:12`)
   ```javascript
   // Old:
   gains.hp = 5;

   // New:
   const conMod = getModifier(player.constitution);
   gains.hp = 4 + conMod;
   ```

3. **Update Unarmed Damage** (`src/combat/combatResolver.js:42`)
   ```javascript
   // Old:
   return '1d3';

   // New:
   return '1d4';
   ```

**Files to Modify:**
- `src/server.js` - Player constructor
- `src/progression/statProgression.js` - HP gain calculation
- `src/combat/combatResolver.js` - Unarmed damage dice

**Testing:**
- Create new L1 character with CON 14 → starts with 17 HP
- Level up L1→L2 with CON 14 → gains 6 HP (4 base + 2 CON)
- Verify TTK drops to ~8 rounds in even combat

#### Task 5.3: Comprehensive Testing
**Status:** ❌ NOT COMPLETE
**Priority:** HIGH
**Estimated Time:** 1 hour
**Agent:** combat-mechanic

**Test Suite:**

1. **Proficiency Scaling Test**
   - Start L1 player (prof +2)
   - Level to L5 (prof should be +3)
   - Level to L9 (prof should be +4)
   - Verify attack bonus increases

2. **HP Scaling Test**
   - Create CON 10 character → starts 15 HP
   - Create CON 16 character → starts 18 HP
   - Level up CON 10 → gains 4 HP
   - Level up CON 16 → gains 7 HP

3. **TTK Balance Test**
   - L1 vs L1 combat → should end in ~8 rounds
   - L5 vs L5 combat → should end in ~8 rounds
   - L10 vs L10 combat → should end in ~9 rounds

4. **XP Persistence Test**
   - Gain XP, logout, login → XP preserved
   - Level up, logout, login → level/stats preserved

**Deliverables:**
- Test results log
- Updated COMBAT_IMPLEMENTATION_STATUS.md
- Phase 5 marked as 100% complete

---

## 4. Phase 6 Remaining Tasks

### Status: ~30% Complete

**Completed:**
- ✅ NPC flee mechanics with AoO
- ✅ Death handling (ghost form)
- ✅ Combat messages with color

**Not Implemented:**
- ❌ Player flee command
- ❌ Rest/healing system
- ❌ Equipment system (equip/unequip)
- ❌ Resurrection/respawn
- ❌ Health consumables

### Task 6.1: Player Flee Command
**Status:** ❌ NOT IMPLEMENTED
**Priority:** HIGH
**Estimated Time:** 2-3 hours
**Agent:** combat-mechanic

**Architecture Reference:** COMBAT_XP_ARCHITECTURE.md section 4.6

**Implementation Requirements:**

**Command Syntax:** `flee <direction>`

**Validation:**
- Must be in active combat
- Direction must have valid exit in current room
- Not in boss room (preventFleeing flag)
- Flee cooldown expired (10 seconds)

**Flee Resolution:**
```javascript
// src/combat/fleeHandler.js (NEW FILE)
function attemptFlee(player, direction, combat, world) {
  // 1. Validation checks
  if (!combat) return { success: false, msg: 'Not in combat' };
  if (player.fleeCooldownUntil > Date.now()) {
    return { success: false, msg: 'Flee on cooldown' };
  }

  const room = world.getRoom(player.currentRoom);
  const exit = room.exits.find(e => e.direction === direction);
  if (!exit) return { success: false, msg: 'No exit that way' };

  // 2. Find opponent
  const opponent = combat.participants.find(p => p !== player);

  // 3. Opposed roll (DEX + proficiency)
  const playerRoll = rollD20() + getModifier(player.dexterity) + player.proficiency;
  const opponentRoll = rollD20() + getModifier(opponent.dexterity) + opponent.proficiency;

  // 4. Opportunity attack (ALWAYS happens)
  const aoo = rollAttack(opponent, player);
  if (aoo.hit) {
    const damage = rollDamage(opponent, getDamageDice(opponent), aoo.critical);
    applyDamage(player, damage, 'physical');
  }

  // 5. Check success
  if (playerRoll < opponentRoll) {
    player.fleeCooldownUntil = Date.now() + 10000;
    return { success: false, msg: 'Flee failed!' };
  }

  // 6. Success: move player
  player.fleeCooldownUntil = Date.now() + 10000;
  return {
    success: true,
    destination: exit.room,
    msg: `You flee ${direction}!`
  };
}
```

**Integration Points:**
- Add flee command to `src/commands.js`
- Add `fleeCooldownUntil` to Player class (`src/server.js`)
- Update CombatEncounter to handle player flee
- Add room broadcast messages

**Files to Create/Modify:**
- NEW: `src/combat/fleeHandler.js`
- MODIFY: `src/commands.js`
- MODIFY: `src/server.js`
- MODIFY: `src/combat/CombatEncounter.js`

**Testing:**
- Flee with good DEX (14+) vs low DEX opponent → high success rate
- Flee with low DEX (8) vs high DEX opponent → low success rate
- Verify AoO always occurs
- Verify flee cooldown prevents spam
- Verify boss rooms block fleeing

### Task 6.2: Rest/Healing System
**Status:** ❌ NOT IMPLEMENTED
**Priority:** HIGH
**Estimated Time:** 2-3 hours
**Agent:** combat-mechanic

**Architecture Reference:** COMBAT_XP_ARCHITECTURE.md section 7

**Implementation Requirements:**

**Command Syntax:** `rest`

**Validation:**
- Not a ghost
- Not in combat
- In safe room OR near campfire (future)
- No damage taken in last 60 seconds

**Rest Mechanics:**
```javascript
// src/combat/restHandler.js (NEW FILE)
function attemptRest(player, world) {
  // 1. Validation
  if (player.isGhost) return { success: false, msg: 'Ghosts cannot rest' };
  if (player.inCombat) return { success: false, msg: 'Cannot rest in combat' };

  const room = world.getRoom(player.currentRoom);
  if (!room.isSafeRoom) {
    return { success: false, msg: 'You cannot rest here' };
  }

  const timeSinceDamage = Date.now() - (player.lastDamageTaken || 0);
  if (timeSinceDamage < 60000) {
    const remaining = Math.ceil((60000 - timeSinceDamage) / 1000);
    return { success: false, msg: `Too agitated. Wait ${remaining}s` };
  }

  // 2. Start rest
  return startRest(player);
}

function startRest(player) {
  const restDuration = 10000;  // 10 seconds

  player.restState = {
    startedAt: Date.now(),
    completesAt: Date.now() + restDuration,
    interrupted: false
  };

  // Schedule completion
  setTimeout(() => {
    completeRest(player);
  }, restDuration);

  return { success: true, msg: 'You begin to rest...' };
}

function completeRest(player) {
  if (!player.restState || player.restState.interrupted) return;

  const hpRestored = Math.floor(player.maxHp * 0.25);
  player.hp = Math.min(player.maxHp, player.hp + hpRestored);

  player.send(`You finish resting. (+${hpRestored} HP)`);
  player.restState = null;
}

function interruptRest(player, reason) {
  if (!player.restState) return;

  player.restState.interrupted = true;
  player.restState = null;

  player.send(`Your rest is interrupted! (${reason})`);
}
```

**Rest Interrupts:**
- Combat starts → call `interruptRest(player, 'combat')`
- Player moves → call `interruptRest(player, 'movement')`
- Player takes damage → update `lastDamageTaken`, blocks future rests

**Room Configuration:**
```javascript
// src/world.js - Add to room schema
room.isSafeRoom = room.isSafeRoom || false;

// Mark starting areas as safe
if (room.id === 'starting_room') {
  room.isSafeRoom = true;
}
```

**Files to Create/Modify:**
- NEW: `src/combat/restHandler.js`
- MODIFY: `src/commands.js` (add rest command)
- MODIFY: `src/server.js` (add restState, lastDamageTaken)
- MODIFY: `src/world.js` (add isSafeRoom to rooms)
- MODIFY: `src/combat/combatResolver.js` (update applyDamage to set lastDamageTaken)

**Testing:**
- Rest in safe room → gains 25% HP after 10 seconds
- Rest while in combat → denied
- Rest after taking damage → denied for 60 seconds
- Rest then move → interrupted
- Rest then enter combat → interrupted

### Task 6.3: Equipment System (Equip/Unequip)
**Status:** ❌ NOT IMPLEMENTED (framework exists)
**Priority:** MEDIUM
**Estimated Time:** 3-4 hours
**Agent:** mud-architect

**Current State:**
- Weapon damage dice framework exists in `getDamageDice()`
- `equippedWeapon` property exists on Player class
- No commands to actually equip/unequip

**Implementation Requirements:**

**Command Syntax:**
- `equip <item name>` - Equip weapon/armor from inventory
- `unequip <slot>` - Unequip weapon or armor
- `equipment` - Show equipped items

**Weapon System:**
```javascript
// Weapon schema (already partially defined)
{
  name: "Short Sword",
  type: "weapon",
  damage: "1d6",
  damageType: "physical",
  finesse: true,  // Can use DEX instead of STR
  twoHanded: false,
  description: "A short blade..."
}
```

**Equip Logic:**
```javascript
// src/commands.js
function equipCommand(player, itemName) {
  const item = player.inventory.find(i =>
    i.name.toLowerCase().includes(itemName.toLowerCase())
  );

  if (!item) return player.send('You don\'t have that item');
  if (item.type !== 'weapon' && item.type !== 'armor') {
    return player.send('You can\'t equip that');
  }

  if (item.type === 'weapon') {
    // Unequip current weapon first
    if (player.equippedWeapon) {
      player.equippedWeapon.equipped = false;
    }

    player.equippedWeapon = item;
    item.equipped = true;
    player.send(`You equip ${item.name}.`);
  }

  // Similar for armor...
}
```

**Files to Create/Modify:**
- MODIFY: `src/commands.js` (add equip/unequip/equipment commands)
- MODIFY: `src/combat/combatResolver.js` (already uses equippedWeapon)
- CREATE: Sample weapon items in world data

**Testing:**
- Pick up weapon → inventory shows it
- Equip weapon → damage dice changes
- Combat with weapon → higher damage than unarmed
- Unequip weapon → reverts to unarmed (1d4)

### Task 6.4: Resurrection/Respawn System
**Status:** ❌ NOT IMPLEMENTED
**Priority:** MEDIUM
**Estimated Time:** 2-3 hours
**Agent:** mud-architect

**Current State:**
- Players become ghosts on death (`isGhost = true`)
- Ghost form persists in database
- No way to return to life

**Implementation Requirements:**

**Respawn Options:**

**Option A: Temple Resurrection (Simple)**
```javascript
// Auto-respawn at temple after 30 seconds
function handlePlayerDeath(player, killer) {
  player.isGhost = true;
  player.send('You have died! You will respawn in 30 seconds...');

  setTimeout(() => {
    resurrectPlayer(player);
  }, 30000);
}

function resurrectPlayer(player) {
  player.isGhost = false;
  player.hp = Math.floor(player.maxHp * 0.5);  // Respawn at 50% HP
  player.currentRoom = 'temple_of_light';  // Respawn point

  player.send('You have been resurrected!');
}
```

**Option B: Corpse Retrieval (Complex)**
- Ghost returns to corpse location
- Command: `resurrect` at corpse
- Corpse decays after 30 minutes

**Files to Modify:**
- `src/combat/CombatEncounter.js` (update death handler)
- `src/server.js` (add respawn logic)
- `src/commands.js` (add resurrect command if Option B)

### Task 6.5: Enhanced Combat Status
**Status:** ❌ NOT IMPLEMENTED
**Priority:** LOW
**Estimated Time:** 1-2 hours
**Agent:** combat-mechanic

**Commands to Enhance:**

**1. Combat Status Command**
```
> combat-status

COMBAT STATUS
=============
Round: 3
Your turn: Yes
Opponent: Yellow Wumpy
  HP: [▓▓▓▓▓░░░░░] 12/20 (60%)

Your HP: [▓▓▓▓▓▓▓░░░] 18/25 (72%)
Flee Cooldown: 3 seconds
```

**2. Score Command Enhancement**
```
> score

CHARACTER: PlayerName
=====================
Level: 5 [▓▓▓▓▓▓░░░░] 12000/20000 XP (8000 to next)

HP: [▓▓▓▓▓▓▓▓░░] 32/40 (80%)
Proficiency: +3

STR: 14 (+2)
DEX: 12 (+1)
CON: 13 (+1)

Combat Stats:
  Attacks: 47
  Kills: 12
  Deaths: 2
  Damage Dealt: 342
```

**3. Look Command Enhancement**
```
> look

The Town Square
===============
A bustling marketplace...

Exits: north, south, east, west

Players:
  Bob (Level 3) [resting]
  Alice (Level 7) [in combat]

NPCs:
  Yellow Wumpy [hostile, 20/20 HP]
  Big Bird [passive, 100/100 HP]
```

**Files to Modify:**
- `src/commands.js` (add combat-status, enhance score/look)

---

## 5. Implementation Roadmap

### Priority Sequence

**CRITICAL (Must Complete First):**
```
Phase 5.1: Proficiency Bonus Fix
  ├─ Agent: mud-architect
  ├─ Time: 15 minutes
  └─ Files: src/progression/xpSystem.js
```

**HIGH PRIORITY (Core Gameplay):**
```
Phase 5.2: HP Balance Implementation
  ├─ Agent: combat-mechanic
  ├─ Time: 1-2 hours
  ├─ Files: server.js, statProgression.js, combatResolver.js
  └─ Deliverable: Balanced TTK (~8 rounds)

Phase 6.1: Player Flee Command
  ├─ Agent: combat-mechanic
  ├─ Time: 2-3 hours
  ├─ Files: fleeHandler.js (new), commands.js, server.js
  └─ Deliverable: Working flee with opposed rolls

Phase 6.2: Rest/Healing System
  ├─ Agent: combat-mechanic
  ├─ Time: 2-3 hours
  ├─ Files: restHandler.js (new), commands.js, world.js
  └─ Deliverable: Rest command with interrupts
```

**MEDIUM PRIORITY (Progression):**
```
Phase 6.3: Equipment System
  ├─ Agent: mud-architect
  ├─ Time: 3-4 hours
  ├─ Files: commands.js, world data
  └─ Deliverable: Equip/unequip commands

Phase 6.4: Resurrection System
  ├─ Agent: mud-architect
  ├─ Time: 2-3 hours
  ├─ Files: CombatEncounter.js, server.js
  └─ Deliverable: Auto-respawn at temple
```

**LOW PRIORITY (Polish):**
```
Phase 5.3: Comprehensive Testing
  ├─ Agent: combat-mechanic
  ├─ Time: 1 hour
  └─ Deliverable: Test report, updated docs

Phase 6.5: Enhanced Combat Status
  ├─ Agent: combat-mechanic
  ├─ Time: 1-2 hours
  └─ Deliverable: combat-status, enhanced score/look
```

### Total Estimated Time
- **Critical:** 15 minutes
- **High Priority:** 5-8 hours
- **Medium Priority:** 5-7 hours
- **Low Priority:** 2-3 hours
- **TOTAL:** 12-18 hours (1.5-2 days of focused work)

---

## 6. Testing Strategy

### 6.1 Unit Tests (Per Feature)

**Proficiency Fix Test:**
```javascript
// Test that proficiency updates on level-up
const player = createTestPlayer({ level: 4, proficiency: 2 });
levelUp(player, mockDB);
assert(player.proficiency === 3, 'Proficiency should be +3 at L5');
```

**HP Balance Test:**
```javascript
// Test CON modifier affects starting HP
const player1 = createTestPlayer({ constitution: 10 });
assert(player1.maxHp === 15, 'CON 10 starts with 15 HP');

const player2 = createTestPlayer({ constitution: 16 });
assert(player2.maxHp === 18, 'CON 16 starts with 18 HP (15 + 3)');
```

**Flee Mechanic Test:**
```javascript
// Test flee opposed roll
mockRolls([15, 10]);  // Player 15, opponent 10
const result = attemptFlee(player, 'north', combat);
assert(result.success === true, 'Should succeed with higher roll');
assert(player.fleeCooldownUntil > Date.now(), 'Should have cooldown');
```

**Rest Test:**
```javascript
// Test rest healing
const player = createTestPlayer({ hp: 10, maxHp: 40 });
completeRest(player);
assert(player.hp === 20, 'Should heal 25% (10 HP)');
```

### 6.2 Integration Tests (End-to-End)

**Combat → XP → Level-Up Flow:**
```
1. Create L1 player (950/1000 XP)
2. Attack and defeat L1 goblin
3. Verify XP gain message
4. Verify level-up to L2
5. Verify HP increase
6. Verify proficiency update
7. Verify full heal
8. Check players.json persistence
```

**Flee Combat Flow:**
```
1. Enter combat with NPC
2. Take some damage
3. Command: flee north
4. Verify AoO occurs
5. Verify player moves to new room
6. Verify combat ends
7. Verify 10s cooldown active
8. Try to flee again → denied
```

**Rest Healing Flow:**
```
1. Player at 50% HP in safe room
2. Command: rest
3. Wait 10 seconds
4. Verify HP restored to 75%
5. Try to rest in unsafe room → denied
6. Take damage → try to rest → denied for 60s
```

### 6.3 Balance Testing

**TTK Measurement:**
```
Test: Run 100 even-level combats at each level
Measure: Average rounds to kill
Target: 6-10 rounds (18-30 seconds)

Script: /scripts/test_ttk_balance.js
```

**XP Scaling Test:**
```
Test: Award XP for various level differences
Verify: Proper scaling (±20% per level)
Target: L1 vs L3 = 140% XP, L3 vs L1 = 60% XP

Script: /scripts/test_xp_scaling.js
```

### 6.4 Regression Testing

**Before Each Release:**
- ✅ All combat mechanics work (attack, damage, death)
- ✅ XP system awards correctly
- ✅ Level-up triggers and applies gains
- ✅ Flee mechanics work for both players and NPCs
- ✅ Rest system heals properly
- ✅ Equipment affects damage output
- ✅ Persistence works (logout/login preserves state)

---

## 7. Success Criteria

### Phase 5 Complete When:
- ✅ Proficiency bonus updates on level-up
- ✅ HP scales with CON modifier
- ✅ TTK balanced to 8-10 rounds (24-30 seconds)
- ✅ All XP tests pass (basic, level-up, multi-level, scaling)
- ✅ Players can progress L1→L50 without issues

### Phase 6 Complete When:
- ✅ Players can flee from combat (with opposed roll)
- ✅ Players can rest to heal in safe rooms
- ✅ Rest interrupts work (combat, movement)
- ✅ Equipment system functional (equip/unequip)
- ✅ Weapons affect damage output
- ✅ Resurrection/respawn works
- ✅ Enhanced status commands display correctly

### Overall System Complete When:
- ✅ Combat feels balanced and engaging
- ✅ Players have tactical options (fight/flee/rest)
- ✅ Progression feels rewarding (XP→level→power)
- ✅ Death has consequences but not game-ending
- ✅ No critical bugs in core gameplay loop
- ✅ All documentation updated

---

## 8. File Modification Summary

### Files to Create (NEW)
- `src/combat/fleeHandler.js` - Player flee mechanics
- `src/combat/restHandler.js` - Rest/healing system
- `tests/test_ttk_balance.js` - TTK measurement script
- `tests/test_xp_scaling.js` - XP scaling verification

### Files to Modify (EXISTING)
- `src/progression/xpSystem.js` - Add proficiency update
- `src/progression/statProgression.js` - CON-based HP gains
- `src/combat/combatResolver.js` - Unarmed damage 1d4, lastDamageTaken
- `src/server.js` - Starting HP with CON, fleeCooldownUntil, restState
- `src/world.js` - Add isSafeRoom to room schema
- `src/commands.js` - Add flee, rest, equip, unequip commands
- `src/combat/CombatEncounter.js` - Integrate player flee, respawn logic
- `docs/COMBAT_IMPLEMENTATION_STATUS.md` - Update completion status

### Documentation to Update
- `docs/COMBAT_IMPLEMENTATION_STATUS.md` - Mark Phase 5 & 6 complete
- `docs/COMBAT_XP_ARCHITECTURE.md` - Add implemented features notes
- `README.md` - Update feature list

---

## 9. Agent Assignment Plan

### Sequence 1: Critical Fix (15 min)
```bash
# Launch mud-architect for proficiency fix
Task: Fix proficiency bonus not updating in levelUp()
Files: src/progression/xpSystem.js
Agent: mud-architect
```

### Sequence 2: HP Balance (1-2 hours)
```bash
# Launch combat-mechanic for HP/damage tuning
Task: Implement CON-based HP, increase unarmed to 1d4
Files: server.js, statProgression.js, combatResolver.js
Agent: combat-mechanic
Verification: Run TTK tests, should be ~8 rounds
```

### Sequence 3: Player Flee (2-3 hours)
```bash
# Launch combat-mechanic for flee system
Task: Implement player flee with opposed rolls and AoO
Files: fleeHandler.js (new), commands.js, server.js, CombatEncounter.js
Agent: combat-mechanic
```

### Sequence 4: Rest System (2-3 hours)
```bash
# Launch combat-mechanic for rest mechanics
Task: Implement rest command with interrupts
Files: restHandler.js (new), commands.js, world.js, combatResolver.js
Agent: combat-mechanic
```

### Sequence 5: Equipment (3-4 hours)
```bash
# Launch mud-architect for equipment system
Task: Implement equip/unequip commands
Files: commands.js, world data
Agent: mud-architect
```

### Sequence 6: Respawn (2-3 hours)
```bash
# Launch mud-architect for resurrection
Task: Implement auto-respawn at temple
Files: CombatEncounter.js, server.js
Agent: mud-architect
```

### Sequence 7: Testing & Polish (2-3 hours)
```bash
# Launch combat-mechanic for final validation
Task: Run comprehensive test suite, enhance status commands
Files: test scripts, commands.js
Agent: combat-mechanic
```

---

## 10. Risk Assessment

### High Risk Items
1. **HP Balance Changes**
   - Risk: Existing characters have wrong HP values
   - Mitigation: Add migration script to recalculate HP
   - Fallback: Make changes configurable, can revert

2. **Player Flee Integration**
   - Risk: Combat state desync if flee fails
   - Mitigation: Extensive testing of all flee paths
   - Fallback: Disable flee command if critical bugs

3. **Rest Interrupt Timing**
   - Risk: Race conditions with setTimeout
   - Mitigation: Check restState before applying heal
   - Fallback: Simple instant heal (no timer)

### Medium Risk Items
1. **Equipment System Complexity**
   - Risk: Inventory management bugs
   - Mitigation: Start simple (weapon only, no armor)

2. **Proficiency Update**
   - Risk: Attack bonus calculation inconsistency
   - Mitigation: Unit tests for all proficiency levels

### Low Risk Items
1. **Enhanced Status Commands**
   - Risk: Display formatting issues
   - Mitigation: Easy to fix, cosmetic only

---

## 11. Next Steps

### Immediate Actions (Start Now)
1. ✅ Review this implementation plan
2. Launch mud-architect for proficiency fix (15 min)
3. Test proficiency scaling at L5, L9, L13
4. Commit fix: "fix: Update proficiency bonus on level-up"

### Short Term (This Session)
1. Launch combat-mechanic for HP balance (1-2 hours)
2. Test TTK with new values
3. Adjust if needed to hit 8-10 round target
4. Commit: "feat: Implement CON-based HP scaling and balance"

### Medium Term (Next 1-2 Days)
1. Implement player flee command (2-3 hours)
2. Implement rest system (2-3 hours)
3. Run integration tests
4. Commit: "feat: Add player flee and rest mechanics"

### Long Term (Next Week)
1. Implement equipment system (3-4 hours)
2. Implement respawn system (2-3 hours)
3. Polish and testing (2-3 hours)
4. Update all documentation
5. Commit: "feat: Complete Phase 5 & 6 implementation"

---

## Appendix A: Quick Reference

### Current System Stats
- **Starting HP:** 20 (flat)
- **HP Per Level:** +5 (flat)
- **Unarmed Damage:** 1d3 + STR
- **Combat Speed:** 3 seconds per round
- **Current TTK:** 15-20 rounds (45-60 seconds)

### Target System Stats
- **Starting HP:** 15 + CON modifier
- **HP Per Level:** 4 + CON modifier
- **Unarmed Damage:** 1d4 + STR
- **Combat Speed:** 3 seconds per round (unchanged)
- **Target TTK:** 8-10 rounds (24-30 seconds)

### Key Files
- **Combat:** `src/combat/combatResolver.js`, `CombatEncounter.js`
- **Progression:** `src/progression/xpSystem.js`, `statProgression.js`
- **Player:** `src/server.js`
- **Commands:** `src/commands.js`
- **World:** `src/world.js`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Next Review:** After Phase 5 completion
