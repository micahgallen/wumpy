# Combat System Flow Diagrams
**The Wumpy and Grift MUD**

Visual representations of how the combat system components interact.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER.JS                               │
│  ┌──────────────┐     ┌──────────────┐    ┌─────────────────┐  │
│  │ Player Class │────▶│ handleInput()│───▶│ parseCommand()  │  │
│  │  - stats     │     │              │    │   (commands.js) │  │
│  │  - hp/maxHp  │     └──────────────┘    └────────┬────────┘  │
│  │  - inventory │                                   │           │
│  │  - inCombat  │                                   │           │
│  └──────────────┘                                   │           │
└─────────────────────────────────────────────────────┼───────────┘
                                                      │
                          ┌───────────────────────────┼───────────┐
                          │       COMMANDS.JS         │           │
                          │                           ▼           │
                          │  ┌────────────────────────────────┐   │
                          │  │ attack(player, args, ...)     │   │
                          │  │   - validate target           │   │
                          │  │   - call combatEngine         │   │
                          │  └────────────┬───────────────────┘   │
                          │               │                       │
                          │  ┌────────────▼───────────────────┐   │
                          │  │ flee(player, ...)             │   │
                          │  │   - call combatEngine.flee()  │   │
                          │  └────────────────────────────────┘   │
                          └───────────────┬───────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │    COMBAT ENGINE    │                     │
                    │                     ▼                     │
                    │  ┌──────────────────────────────────┐     │
                    │  │ initiateCombat()                │     │
                    │  │   1. Create CombatEncounter     │     │
                    │  │   2. Roll initiative            │────┐│
                    │  │   3. Start combat loop          │    ││
                    │  └─────────────┬────────────────────┘    ││
                    │                │                         ││
                    │  ┌─────────────▼────────────────────┐    ││
                    │  │ executeCombatRound()            │    ││
                    │  │   1. Determine current turn     │    ││
                    │  │   2. Execute action             │────┼┤
                    │  │   3. Check victory conditions   │    ││
                    │  │   4. Next turn or end combat    │    ││
                    │  └─────────────┬────────────────────┘    ││
                    │                │                         ││
                    │  ┌─────────────▼────────────────────┐    ││
                    │  │ endCombat()                     │    ││
                    │  │   1. Award XP (if victory)      │────┼┤
                    │  │   2. Clean up combat state      │    ││
                    │  │   3. Respawn NPC (if defeated)  │    ││
                    │  └──────────────────────────────────┘    ││
                    └────────────────┬───────────────────┬─────┘│
                                     │                   │      │
        ┌────────────────────────────┼───────────┐       │      │
        │    COMBAT RESOLVER         │           │       │      │
        │                            ▼           │       │      │
        │  ┌────────────────────────────────┐    │       │      │
        │  │ rollAttack()                  │◀───┼───────┘      │
        │  │   1. Roll 1d20                │    │              │
        │  │   2. Add attack bonus         │    │              │
        │  │   3. Compare to target AC     │    │              │
        │  │   4. Determine hit/crit/miss  │    │              │
        │  └─────────────┬──────────────────┘    │              │
        │                │                       │              │
        │  ┌─────────────▼──────────────────┐    │              │
        │  │ rollDamage()                  │    │              │
        │  │   1. Parse damage dice        │────┤              │
        │  │   2. Roll dice                │    │              │
        │  │   3. Add modifiers            │    │              │
        │  │   4. Double if critical       │    │              │
        │  └─────────────┬──────────────────┘    │              │
        │                │                       │              │
        │  ┌─────────────▼──────────────────┐    │              │
        │  │ applyDamage()                 │    │              │
        │  │   1. Get resistance %         │────┤              │
        │  │   2. Calculate final damage   │    │              │
        │  │   3. Reduce target HP         │    │              │
        │  │   4. Check if dead            │    │              │
        │  └────────────────────────────────┘    │              │
        └───────────────────────────────────────┘              │
                                                                │
        ┌───────────────────────────────────────────────────────┤
        │    XP SYSTEM                                          │
        │                                                       │
        │  ┌────────────────────────────────┐                   │
        │  │ awardXP()                     │◀──────────────────┘
        │  │   1. Calculate XP amount      │
        │  │   2. Add to player.xp         │
        │  │   3. Call checkLevelUp()      │
        │  └─────────────┬──────────────────┘
        │                │
        │  ┌─────────────▼──────────────────┐
        │  │ checkLevelUp()                │
        │  │   1. Compare XP to threshold  │
        │  │   2. If ready, call levelUp() │
        │  │   3. Recurse for multi-level  │
        │  └─────────────┬──────────────────┘
        │                │
        │  ┌─────────────▼──────────────────┐
        │  │ levelUp()                     │
        │  │   1. Increment level          │
        │  │   2. Calculate stat gains     │
        │  │   3. Apply stat gains         │
        │  │   4. Full heal                │
        │  │   5. Notify player            │
        │  │   6. Persist to database      │
        │  └────────────────────────────────┘
        └────────────────────────────────────┘
```

---

## Combat Encounter Flow

```
PLAYER INITIATES COMBAT: "attack blue wumpy"
    │
    ├──▶ Validate: Target exists in room?
    │       ├─NO──▶ Error: "You don't see that here"
    │       └─YES
    │
    ├──▶ Validate: Player already in combat?
    │       ├─YES──▶ Error: "Already in combat!"
    │       └─NO
    │
    ├──▶ Validate: Target is attackable?
    │       ├─NO──▶ Error: "You can't attack that"
    │       └─YES
    │
    ▼
CREATE COMBAT ENCOUNTER
    │
    ├──▶ Create CombatEncounter instance
    ├──▶ Set attacker = player
    ├──▶ Set defender = NPC
    │
    ▼
ROLL INITIATIVE
    │
    ├──▶ Player rolls: 1d20 + DEX mod
    ├──▶ NPC rolls: 1d20 + DEX mod
    ├──▶ Sort by initiative (high to low)
    │
    ▼
COMBAT ROUND LOOP (until combat ends)
┌───────────────────────────────────────────┐
│  ┌──────────────────────────────────────┐ │
│  │ DETERMINE CURRENT TURN               │ │
│  │   - Get next combatant from order    │ │
│  │   - If round complete, increment     │ │
│  └───────────┬──────────────────────────┘ │
│              │                            │
│  ┌───────────▼──────────────────────────┐ │
│  │ CHECK IF COMBATANT CAN ACT           │ │
│  │   - Alive? (HP > 0)                  │ │
│  │   - Not stunned?                     │ │
│  │   - Not fled?                        │ │
│  └───────────┬──────────────────────────┘ │
│              │                            │
│  ┌───────────▼──────────────────────────┐ │
│  │ DETERMINE ACTION                     │ │
│  │                                      │ │
│  │ IF PLAYER:                           │ │
│  │   - Wait for player input            │ │
│  │   - "attack", "flee", "item"         │ │
│  │                                      │ │
│  │ IF NPC:                              │ │
│  │   - Call combatAI.determineAction()  │ │
│  │   - Check flee threshold             │ │
│  │   - Default: attack                  │ │
│  └───────────┬──────────────────────────┘ │
│              │                            │
│  ┌───────────▼──────────────────────────┐ │
│  │ EXECUTE ACTION                       │ │
│  │                                      │ │
│  │ ATTACK:                              │ │
│  │   ├─▶ rollAttack()                   │ │
│  │   ├─▶ rollDamage() if hit            │ │
│  │   ├─▶ applyDamage()                  │ │
│  │   └─▶ Display messages               │ │
│  │                                      │ │
│  │ FLEE:                                │ │
│  │   ├─▶ Roll 1d20 + DEX vs DC          │ │
│  │   ├─▶ If success: end combat         │ │
│  │   └─▶ If fail: opportunity attack    │ │
│  │                                      │ │
│  │ ITEM:                                │ │
│  │   └─▶ Future: use healing potion     │ │
│  └───────────┬──────────────────────────┘ │
│              │                            │
│  ┌───────────▼──────────────────────────┐ │
│  │ CHECK VICTORY CONDITIONS             │ │
│  │   - Either combatant HP <= 0?        │ │
│  │   - Combat fled?                     │ │
│  │   - Special conditions?              │ │
│  └───────────┬──────────────────────────┘ │
│              │                            │
│              ├─CONTINUE──▶ Next turn      │
│              │                            │
└──────────────┼────────────────────────────┘
               │
               ├─END (Victory/Defeat/Flee)
               │
               ▼
         END COMBAT
               │
    ┌──────────┼──────────┐
    │          │          │
VICTORY    DEFEAT      FLEE
    │          │          │
    ├─▶ Award XP        ├─▶ No XP
    ├─▶ Display message    │
    ├─▶ Check level-up ├─▶ Opportunity attack
    ├─▶ Respawn NPC    │   (if flee failed)
    │                  │
    └──────────┬───────┴─▶ Move to random exit
               │           (if flee succeeded)
               │
         CLEAN UP
               │
               ├─▶ Set player.inCombat = false
               ├─▶ Remove from activeCombats
               ├─▶ Reset combat state
               └─▶ Broadcast to room
```

---

## Attack Resolution Flow

```
ATTACK ACTION
    │
    ▼
┌─────────────────────────┐
│ GET ATTACK BONUS        │
│                         │
│ Proficiency = ⌊lvl/4⌋+1 │
│ Ability = ⌊(stat-10)/2⌋ │
│ Equipment = weapon bonus│
│                         │
│ Total = Prof + Abil + Eq│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ ROLL ATTACK             │
│                         │
│ Roll = 1d20             │
│ Total = Roll + Bonus    │
└────────┬────────────────┘
         │
         ├──▶ Natural 20? ──YES──▶ CRITICAL HIT!
         │                           │
         ├──▶ Natural 1?  ──YES──▶ CRITICAL MISS!
         │                           │
         └──▶ Roll >= AC? ──YES──▶ HIT!
                           │
                          NO
                           │
                           ▼
                      MISS! ──▶ Display miss message
                                Return (no damage)

┌─────────────────────────┐
│ ROLL DAMAGE             │
│                         │
│ Parse dice: "2d6+3"     │
│   - numDice = 2         │
│   - dieSize = 6         │
│   - modifier = 3        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Roll each die           │
│   die1 = rand(1-6)      │
│   die2 = rand(1-6)      │
│   total = die1 + die2   │
└────────┬────────────────┘
         │
         ├──▶ Critical? ──YES──▶ Double dice!
         │                        total = total × 2
         │                        (modifier NOT doubled)
         └──NO
              │
              ▼
        ┌──────────────────┐
        │ Add modifier     │
        │ damage = total+3 │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ APPLY RESISTANCE     │
        │                      │
        │ Get target resistance│
        │ for damage type      │
        │                      │
        │ multiplier = 1 - (r%)│
        │ final = dmg × mult   │
        │                      │
        │ Examples:            │
        │ 20 dmg, 25% resist:  │
        │   20 × 0.75 = 15     │
        │                      │
        │ 20 dmg, -25% vuln:   │
        │   20 × 1.25 = 25     │
        └────────┬─────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ REDUCE TARGET HP     │
        │                      │
        │ target.hp -= final   │
        │                      │
        │ If hp <= 0:          │
        │   hp = 0             │
        │   combatant DEAD     │
        └──────────────────────┘
```

---

## XP and Level-Up Flow

```
COMBAT VICTORY
    │
    ▼
┌────────────────────────────┐
│ CALCULATE XP REWARD        │
│                            │
│ baseXP = npc.xpReward      │
│ or npc.level × 50          │
│                            │
│ levelDiff = npc.lvl - p.lvl│
│ multiplier = 1 + (diff×0.2)│
│ multiplier = clamp(0.1-2.0)│
│                            │
│ finalXP = base × multiplier│
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ AWARD XP                   │
│                            │
│ player.xp += finalXP       │
│ Display: "You gain 100 XP!"│
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ CHECK LEVEL-UP             │
│                            │
│ nextLevelXP = XP_TABLE[+1] │
│                            │
│ If player.xp >= nextLevelXP│
│   ──YES──▶ LEVEL UP!       │
│   ──NO───▶ Save and return │
└────────────────┬───────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ LEVEL UP!          │
        │                    │
        │ player.level++     │
        └────────┬───────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │ CALCULATE STAT GAINS    │
        │                         │
        │ hp = +5 always          │
        │                         │
        │ If level % 4 == 0:      │
        │   primary stat +1       │
        │                         │
        │ If level % 5 == 0:      │
        │   constitution +1       │
        └────────┬────────────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │ APPLY STAT GAINS        │
        │                         │
        │ player.maxHp += 5       │
        │ player.strength += gain │
        │ player.dexterity += gain│
        │ etc.                    │
        └────────┬────────────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │ FULL HEAL               │
        │                         │
        │ player.hp = player.maxHp│
        └────────┬────────────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │ DISPLAY LEVEL-UP        │
        │                         │
        │ ╔═══════════════════╗   │
        │ ║   LEVEL UP!       ║   │
        │ ║ You are now lvl 2!║   │
        │ ║                   ║   │
        │ ║ Max HP: 15 → 20   ║   │
        │ ║ STR: 10 → 11      ║   │
        │ ║                   ║   │
        │ ║ Fully healed!     ║   │
        │ ╚═══════════════════╝   │
        └────────┬────────────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │ PERSIST TO DATABASE     │
        │                         │
        │ playerDB.updateLevel()  │
        │ playerDB.updateStats()  │
        │ playerDB.updateXP()     │
        └────────┬────────────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │ CHECK LEVEL-UP AGAIN    │
        │ (recursive for multi)   │
        │                         │
        │ If still enough XP:     │
        │   ──▶ LEVEL UP again!   │
        │                         │
        │ Else:                   │
        │   ──▶ Done!             │
        └─────────────────────────┘
```

---

## NPC AI Decision Flow

```
NPC TURN IN COMBAT
    │
    ▼
┌───────────────────────────┐
│ CHECK HP THRESHOLD        │
│                           │
│ hpPercent = hp / maxHp    │
│ fleeThreshold = npc.flee  │
│                           │
│ If hpPercent <= threshold:│
│   ──YES──▶ FLEE!          │
│   ──NO───▶ Continue       │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ CHECK SPECIAL ABILITIES   │
│ (Future implementation)   │
│                           │
│ If hasAbility() && ready: │
│   ──YES──▶ USE ABILITY!   │
│   ──NO───▶ Continue       │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ CHECK ITEMS               │
│ (Future implementation)   │
│                           │
│ If hasPotion() && lowHP:  │
│   ──YES──▶ USE POTION!    │
│   ──NO───▶ Continue       │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ DEFAULT: ATTACK           │
│                           │
│ Select attack message     │
│ Execute attack action     │
└───────────────────────────┘


FLEE ATTEMPT
    │
    ▼
┌───────────────────────────┐
│ ROLL FLEE CHECK           │
│                           │
│ Roll = 1d20 + DEX mod     │
│ DC = 10 + (oppLvl / 2)    │
│                           │
│ If Roll >= DC:            │
│   ──SUCCESS──▶ ESCAPE!    │
│   ──FAIL─────▶ CAUGHT!    │
└────────┬──────────────────┘
         │
    ┌────┴────┐
    │         │
SUCCESS     FAIL
    │         │
    │         ▼
    │   ┌──────────────────┐
    │   │ OPPORTUNITY      │
    │   │ ATTACK           │
    │   │                  │
    │   │ Opponent gets    │
    │   │ free attack with │
    │   │ advantage (+5)   │
    │   └────────┬─────────┘
    │            │
    │            ▼
    │      Resume combat
    │
    ▼
┌─────────────────────────┐
│ SUCCESSFUL FLEE         │
│                         │
│ End combat              │
│ Move to random exit     │
│ No XP gained            │
│ Display flee message    │
└─────────────────────────┘
```

---

## Aggressive NPC Behavior

```
PLAYER ENTERS ROOM
    │
    ▼
┌──────────────────────────┐
│ FOR EACH NPC IN ROOM:    │
│                          │
│ Check npc.aggressive     │
│                          │
│ If aggressive == true:   │
│   ──YES──▶ ATTACK!       │
│   ──NO───▶ Ignore        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ CHECK COOLDOWN           │
│ (per player)             │
│                          │
│ Last defeat < 5min ago?  │
│   ──YES──▶ Wait          │
│   ──NO───▶ Attack!       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ INITIATE COMBAT          │
│                          │
│ NPC attacks player       │
│ Roll initiative          │
│ Begin combat loop        │
└──────────────────────────┘


ROAMING NPC CHECK (every 5 seconds)
    │
    ▼
┌──────────────────────────┐
│ FOR EACH ROAMING NPC:    │
│                          │
│ Get NPCs in current room │
│ Check if aggressive      │
│                          │
│ If aggressive:           │
│   For each player:       │
│     If not in combat:    │
│       Check cooldown     │
│       Attack if ready    │
└──────────────────────────┘
```

---

## State Management

```
GLOBAL STATE TRACKING

activeCombats Map:
  key: player.username or npc.id
  value: CombatEncounter instance

┌─────────────────────────────────┐
│ activeCombats Map               │
├─────────────────────────────────┤
│ "alice"     → CombatEncounter{} │
│ "blue_wumpy"→ CombatEncounter{} │
│ "bob"       → CombatEncounter{} │
│ "red_wumpy" → CombatEncounter{} │
└─────────────────────────────────┘

Each CombatEncounter:
  - attacker (Player or NPC)
  - defender (Player or NPC)
  - round (number)
  - turnOrder (array)
  - active (boolean)


PLAYER STATE

player.inCombat (boolean)
player.combatTarget (string)
player.combatInitiative (number)

When combat starts:
  ├─▶ inCombat = true
  ├─▶ combatTarget = npc.id
  └─▶ combatInitiative = rolled value

When combat ends:
  ├─▶ inCombat = false
  ├─▶ combatTarget = null
  └─▶ combatInitiative = 0


NPC STATE (in World)

world.npcInstances[npcId]:
  - All NPC data from definition
  - hp (current, can be < maxHp)
  - inCombat (boolean)
  - combatTarget (string)

On NPC defeat:
  ├─▶ Remove from room
  ├─▶ Schedule respawn (5min)
  └─▶ Delete from npcInstances

On NPC respawn:
  ├─▶ Recreate instance
  ├─▶ hp = maxHp
  ├─▶ inCombat = false
  └─▶ Add back to room
```

---

## Integration Summary

```
┌──────────────────────────────────────────────────────────┐
│                     EXISTING SYSTEM                      │
│                                                          │
│  server.js                                               │
│    └─▶ Player class                                      │
│    └─▶ players Set                                       │
│    └─▶ handleInput()                                     │
│                                                          │
│  playerdb.js                                             │
│    └─▶ Player data persistence                           │
│    └─▶ save() and load()                                 │
│                                                          │
│  world.js                                                │
│    └─▶ Room/NPC/Object loading                          │
│    └─▶ formatRoom()                                      │
│                                                          │
│  commands.js                                             │
│    └─▶ Command parsing                                  │
│    └─▶ look, move, get, drop, etc.                      │
│                                                          │
│  respawnService.js                                       │
│    └─▶ NPC respawn scheduling                           │
└─────────────────┬────────────────────────────────────────┘
                  │
                  │ INTEGRATION POINTS
                  │
┌─────────────────▼────────────────────────────────────────┐
│                     NEW COMBAT SYSTEM                    │
│                                                          │
│  ┌──────────────────────────────────────────┐            │
│  │ Player class (EXTENDED)                  │            │
│  │   + strength, dexterity, etc.            │            │
│  │   + hp, maxHp, armorClass                │            │
│  │   + resistances{}                        │            │
│  │   + inCombat, combatTarget               │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────┐            │
│  │ PlayerDB (EXTENDED)                      │            │
│  │   + updatePlayerXP()                     │            │
│  │   + updatePlayerLevel()                  │            │
│  │   + updatePlayerStats()                  │            │
│  │   + updatePlayerHP()                     │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────┐            │
│  │ World (EXTENDED)                         │            │
│  │   + npcInstances (separate from defs)    │            │
│  │   + getNPC()                             │            │
│  │   + updateNPCHP()                        │            │
│  │   + respawnNPC()                         │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────┐            │
│  │ Commands (EXTENDED)                      │            │
│  │   + attack command                       │            │
│  │   + kill command (alias)                 │            │
│  │   + flee command                         │            │
│  │   + rest command                         │            │
│  │   + score (enhanced)                     │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────┐            │
│  │ NEW: combat/                             │            │
│  │   combatEngine.js                        │            │
│  │   combatResolver.js                      │            │
│  │   damageTypes.js                         │            │
│  │   initiative.js                          │            │
│  │   combatAI.js                            │            │
│  │   combatMessages.js                      │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────┐            │
│  │ NEW: progression/                        │            │
│  │   xpSystem.js                            │            │
│  │   xpTable.js                             │            │
│  │   statProgression.js                     │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────┐            │
│  │ NEW: utils/                              │            │
│  │   dice.js                                │            │
│  │   mathUtils.js                           │            │
│  └──────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────┘
```

---

*These diagrams provide a visual reference for implementing the combat system*
