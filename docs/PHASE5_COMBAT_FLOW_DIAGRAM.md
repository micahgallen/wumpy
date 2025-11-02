# Phase 5: Complete Combat Flow with XP Integration

**Version:** 1.0
**Date:** 2025-11-02
**Status:** Design Complete

---

## Full Combat Cycle with XP and Leveling

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PLAYER INITIATES COMBAT                      │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Command Parser (commands.js)                                        │
│ - Receives: "attack goblin"                                         │
│ - Validates: Player not ghost, target exists                        │
│ - Finds: NPC in current room                                        │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Combat Engine (combatEngine.js)                                     │
│ - initiateCombat([player, npc])                                     │
│ - Creates: CombatEncounter instance                                 │
│ - Stores: Reference in active encounters map                        │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Combat Encounter (CombatEncounter.js)                               │
│ - Constructor: determineTurnOrder([player, npc])                    │
│ - Rolls: Initiative for each participant                            │
│ - Orders: Participants by initiative + DEX tiebreaker               │
│ - Broadcasts: "Combat has begun!"                                   │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Combat Loop (3 second interval)                                     │
│ - executeCombatRound() called every 3 seconds                       │
│ - turn++ (increment round counter)                                  │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
                    ┌──────────────────────────┐
                    │   FOR EACH PARTICIPANT   │
                    │   (in initiative order)  │
                    └──────────────────────────┘
                                   ↓
                         ┌─────────────────┐
                         │  Check isDead() │
                         └─────────────────┘
                                   ↓
                        ┌──────────┴──────────┐
                        │                     │
                    ✓ Alive              ✗ Dead (skip turn)
                        │
                        ↓
        ┌──────────────────────────────────┐
        │ Is NPC? (determineNPCAction)     │
        └──────────────────────────────────┘
                        ↓
            ┌───────────┴───────────┐
            │                       │
        ✓ NPC                   ✗ Player (auto-attack)
            │
            ↓
    ┌───────────────┐
    │ AI Decision   │
    └───────────────┘
            ↓
    ┌───────────────────────────┐
    │ HP < flee_threshold?      │
    └───────────────────────────┘
            ↓
       ┌────┴────┐
       │         │
    ✓ Flee    ✗ Attack
       │         │
       ↓         ↓
    (End)   [Continue to attack]
                        │
                        ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Attack Resolution (combatResolver.js)                               │
│ - rollAttack(attacker, target)                                      │
│   - Roll: d20 + proficiency + STR modifier                          │
│   - Compare: total vs target.armorClass                             │
│   - Check: Natural 1 (miss) or Natural 20 (crit)                    │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
                        ┌──────────────────┐
                        │   Hit or Miss?   │
                        └──────────────────┘
                                   ↓
                    ┌──────────────┴──────────────┐
                    │                             │
                ✓ HIT                         ✗ MISS
                    │                             │
                    ↓                             ↓
    ┌───────────────────────────┐    ┌──────────────────────┐
    │ rollDamage()              │    │ "Attack misses!"     │
    │ - Roll: 1d6               │    │ Continue to next     │
    │ - Critical: Roll twice    │    │ participant          │
    └───────────────────────────┘    └──────────────────────┘
                    │
                    ↓
    ┌───────────────────────────────────────────────┐
    │ applyDamage(target, damage, damageType)       │
    │ - Calculate: resistances/vulnerabilities      │
    │ - Apply: finalDamage to target.hp             │
    │ - Set: target.lastDamageTaken = now()         │
    └───────────────────────────────────────────────┘
                    │
                    ↓
    ┌───────────────────────────────────────────────┐
    │ Broadcast: Damage message to room             │
    │ - "Goblin takes 4 damage!" (with HP bar)      │
    └───────────────────────────────────────────────┘
                    │
                    ↓
            ┌───────────────────┐
            │ Check: isDead()   │
            │ (hp <= 0)         │
            └───────────────────┘
                    │
                    ↓
        ┌───────────┴───────────┐
        │                       │
    ✓ DEAD                  ✗ ALIVE (continue loop)
        │                       │
        ↓                       ↓
┌─────────────┐        ┌───────────────────┐
│ Death!      │        │ Next participant  │
└─────────────┘        └───────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Death Message                                                        │
│ - Broadcast: "Goblin has been defeated!"                            │
└─────────────────────────────────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│ endCombat() - PHASE 5 INTEGRATION POINT                             │
└─────────────────────────────────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Determine Winner and Loser                                          │
│ - winner = participants.find(p => !p.isDead())                      │
│ - loser = participants.find(p => p.isDead())                        │
└─────────────────────────────────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Validate: Winner is Player, Loser is NPC                            │
│ - winner.socket exists (is player)                                  │
│ - !loser.socket (is NPC)                                            │
└─────────────────────────────────────────────────────────────────────┘
        │
        ↓
        ┌───────────────────────────────────┐
        │ Validation passed?                │
        └───────────────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
    ✓ YES           ✗ NO (skip XP)
        │               │
        ↓               ↓
[XP AWARD FLOW]    (End Combat)


╔═════════════════════════════════════════════════════════════════════╗
║                         XP AWARD FLOW                               ║
║                    (Phase 5 Integration)                            ║
╚═════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│ Step 1: Calculate XP Reward                                         │
│ - Function: calculateCombatXP(npc, playerLevel)                     │
│ - Base: npc.xpReward || (npc.level * 50)                           │
│ - Level diff: npc.level - playerLevel                               │
│ - Multiplier: 1 + (levelDiff * 0.2)                                │
│ - Capped: 0.1 (min) to 2.0 (max)                                   │
│ - Result: Math.floor(baseXP * multiplier)                           │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
        ┌───────────────────────────────────────────┐
        │ Example: L1 player defeats L3 goblin     │
        │ - Base: 150 XP                            │
        │ - Diff: +2                                │
        │ - Mult: 1 + (2 * 0.2) = 1.4              │
        │ - Final: 150 * 1.4 = 210 XP              │
        └───────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 2: Award XP to Player                                          │
│ - Function: awardXP(player, xp, 'combat', playerDB)                │
│ - player.xp += xpAmount                                             │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 3: Display XP Gain Message                                     │
│ - player.socket.write(colors.xpGain(...))                           │
│ - Message: "You gain 210 XP! (combat)"                             │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 4: Persist XP to Database                                      │
│ - playerDB.updatePlayerXP(player.name, player.xp)                  │
│ - Writes to: players.json                                           │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 5: Check Level-Up Threshold                                    │
│ - Function: checkLevelUp(player, playerDB)                         │
│ - Get: nextLevelXP = getXPForLevel(player.level + 1)               │
│ - Compare: player.xp >= nextLevelXP ?                               │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
                    ┌──────────────────────────┐
                    │  XP >= Threshold?        │
                    └──────────────────────────┘
                                   ↓
                    ┌──────────────┴──────────────┐
                    │                             │
                ✓ YES                         ✗ NO
                    │                             │
                    ↓                             ↓
        [LEVEL-UP FLOW]                  ┌───────────────┐
                                         │ End Combat    │
                                         │ Return to game│
                                         └───────────────┘


╔═════════════════════════════════════════════════════════════════════╗
║                        LEVEL-UP FLOW                                ║
║                    (Automatic Trigger)                              ║
╚═════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│ Step 1: Increment Level                                             │
│ - Function: levelUp(player, playerDB)                              │
│ - player.level++                                                    │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 2: Update Proficiency Bonus (PHASE 5 FIX)                     │
│ - player.proficiency = getProficiencyBonus(player.level)           │
│ - L1-4: +2, L5-8: +3, L9-12: +4, etc.                              │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 3: Calculate Stat Gains                                        │
│ - Function: calculateStatGains(player)                             │
│ - Every level: +5 HP                                                │
│ - Every 4th level: +1 Strength                                      │
│ - Every 5th level: +1 Constitution                                  │
│ - Every 6th level: +1 Dexterity                                     │
│ - Returns: { hp: 5, strength: 0/1, dex: 0/1, con: 0/1, ... }       │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
        ┌───────────────────────────────────────────┐
        │ Example: L4 → L5                          │
        │ - HP: +5 (always)                         │
        │ - CON: +1 (divisible by 5)                │
        │ - No other stat gains this level          │
        └───────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 4: Apply Stat Gains                                            │
│ - Function: applyStatGains(player, gains)                          │
│ - player.maxHp += gains.hp                                          │
│ - player.currentHp += gains.hp                                      │
│ - player.strength += gains.strength                                 │
│ - player.dexterity += gains.dexterity                               │
│ - player.constitution += gains.constitution                         │
│ - (etc. for all stats)                                              │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 5: Full Heal                                                   │
│ - player.hp = player.maxHp                                          │
│ - Reward for leveling up: restore all HP                            │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 6: Format Level-Up Message                                     │
│ - Build ASCII bordered message                                      │
│ - Show: New level                                                   │
│ - Show: HP increase (old → new)                                     │
│ - Show: Each stat that increased                                    │
│ - Show: "You have been fully healed!"                               │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
        ┌───────────────────────────────────────────┐
        │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
        │ LEVEL UP! You are now level 5!            │
        │                                           │
        │ Max HP: 20 → 25 (+5)                      │
        │ Constitution: +1                          │
        │                                           │
        │ You have been fully healed!               │
        │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
        └───────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 7: Send Message to Player                                      │
│ - player.socket.write(levelUpMessage + '\n')                        │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 8: Persist to Database                                         │
│ - playerDB.updatePlayerLevel(player.name, player.level,            │
│                              player.maxHp, player.hp)               │
│ - Writes to: players.json                                           │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Step 9: Recursive Check for Multi-Level                             │
│ - checkLevelUp(player, playerDB) AGAIN                             │
│ - If player gained enough XP for multiple levels, repeat            │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
                    ┌──────────────────────────┐
                    │  XP >= Next Threshold?   │
                    └──────────────────────────┘
                                   ↓
                    ┌──────────────┴──────────────┐
                    │                             │
                ✓ YES                         ✗ NO
                    │                             │
        (Loop back to levelUp)                    ↓
                                         ┌────────────────┐
                                         │ Level-Up Done  │
                                         └────────────────┘
                                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Return to Combat End                                                 │
│ - Broadcast: "Combat has ended!"                                    │
│ - Remove: Combat from active encounters                              │
│ - Free: Participants to move/act normally                           │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Player Returns to Normal Gameplay                                   │
│ - Can move, interact, attack new targets                            │
│ - New XP and level visible in score command                         │
│ - Stats updated for future combat                                   │
└─────────────────────────────────────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════
                           DATA FLOW SUMMARY
════════════════════════════════════════════════════════════════════════

┌──────────────────┐
│ Combat Start     │
└──────────────────┘
         │
         ↓ determineTurnOrder()
┌──────────────────┐
│ Initiative       │ [Player: 15, NPC: 12]
└──────────────────┘
         │
         ↓ executeCombatRound() every 3s
┌──────────────────┐
│ Round Loop       │ [Turn 1, Turn 2, Turn 3...]
└──────────────────┘
         │
         ↓ rollAttack() → rollDamage() → applyDamage()
┌──────────────────┐
│ Damage Applied   │ [NPC.hp: 10 → 6 → 2 → 0]
└──────────────────┘
         │
         ↓ isDead() = true
┌──────────────────┐
│ NPC Death        │
└──────────────────┘
         │
         ↓ calculateCombatXP()
┌──────────────────┐
│ XP Calculation   │ [150 XP * 1.4 = 210 XP]
└──────────────────┘
         │
         ↓ awardXP()
┌──────────────────┐
│ XP Added         │ [player.xp: 800 → 1010]
└──────────────────┘
         │
         ↓ checkLevelUp()
┌──────────────────┐
│ Threshold Check  │ [1010 >= 1000 ? YES]
└──────────────────┘
         │
         ↓ levelUp()
┌──────────────────┐
│ Level Up         │ [level: 1 → 2]
└──────────────────┘
         │
         ↓ getProficiencyBonus()
┌──────────────────┐
│ Proficiency      │ [+2 (no change at L2)]
└──────────────────┘
         │
         ↓ calculateStatGains()
┌──────────────────┐
│ Stat Gains       │ [{ hp: 5, str: 0, ... }]
└──────────────────┘
         │
         ↓ applyStatGains()
┌──────────────────┐
│ Stats Applied    │ [maxHp: 10 → 15, hp: 6 → 15]
└──────────────────┘
         │
         ↓ playerDB.updatePlayerLevel()
┌──────────────────┐
│ Persistence      │ [players.json updated]
└──────────────────┘
         │
         ↓ Display messages
┌──────────────────┐
│ Player Notified  │ ["LEVEL UP! You are now level 2!"]
└──────────────────┘
         │
         ↓
┌──────────────────┐
│ Return to Game   │
└──────────────────┘


════════════════════════════════════════════════════════════════════════
                         FILE INTERACTION MAP
════════════════════════════════════════════════════════════════════════

commands.js (attack command)
    │
    ├──→ world.js (getNPC)
    │
    └──→ combatEngine.js (initiateCombat)
              │
              └──→ CombatEncounter.js (constructor)
                        │
                        ├──→ initiative.js (determineTurnOrder)
                        │
                        └──→ executeCombatRound()
                                  │
                                  ├──→ combatAI.js (determineNPCAction)
                                  │
                                  ├──→ combatResolver.js (rollAttack, rollDamage, applyDamage)
                                  │
                                  ├──→ combatMessages.js (getAttackMessage, getDamageMessage)
                                  │
                                  └──→ endCombat()
                                          │
                                          └──→ xpSystem.js (calculateCombatXP, awardXP)
                                                    │
                                                    ├──→ checkLevelUp()
                                                    │
                                                    └──→ levelUp()
                                                            │
                                                            ├──→ statProgression.js
                                                            │    - getProficiencyBonus()
                                                            │    - calculateStatGains()
                                                            │    - applyStatGains()
                                                            │
                                                            └──→ playerDB.js
                                                                 - updatePlayerXP()
                                                                 - updatePlayerLevel()


════════════════════════════════════════════════════════════════════════
                       TIMING AND SEQUENCE
════════════════════════════════════════════════════════════════════════

T=0s:    Player types "attack goblin"
T=0s:    Combat initiated, initiative rolled
T=0s:    "Combat has begun!"

T=0s:    Round 1 begins
T=0s:    Player attacks (wins initiative)
T=0s:    "You roll [15] (total: 17) vs AC 14"
T=0s:    "Hit! Goblin takes 4 damage."
T=0s:    "Goblin [████░░] 6/10 HP"
T=0s:    Goblin attacks
T=0s:    "Goblin rolls [12] (total: 14) vs AC 13"
T=0s:    "Hit! You take 3 damage."

T=3s:    Round 2 begins
T=3s:    Player attacks
T=3s:    "Critical hit! Goblin takes 8 damage!"
T=3s:    "Goblin has been defeated!"

T=3s:    ─── XP AWARD BEGINS ───
T=3.1s:  Calculate XP: 50 * 1.0 = 50 XP
T=3.1s:  Award XP: player.xp = 950 + 50 = 1000
T=3.1s:  Display: "You gain 50 XP! (combat)"
T=3.1s:  Persist: players.json updated (xp: 1000)
T=3.1s:  Check threshold: 1000 >= 1000 ? YES
T=3.1s:  ─── LEVEL-UP BEGINS ───
T=3.2s:  Increment level: 1 → 2
T=3.2s:  Update proficiency: +2 (no change)
T=3.2s:  Calculate gains: { hp: 5, str: 0, ... }
T=3.2s:  Apply gains: maxHp: 10 → 15, hp: 7 → 15
T=3.2s:  Display level-up message
T=3.2s:  Persist: players.json updated (level: 2, hp: 15)
T=3.2s:  Recursive check: 1000 >= 2027 ? NO
T=3.2s:  ─── LEVEL-UP COMPLETE ───
T=3.2s:  ─── XP AWARD COMPLETE ───

T=3.3s:  "Combat has ended!"
T=3.3s:  Combat removed from active encounters
T=3.3s:  Player free to act

T=4s:    Player types "score"
T=4s:    Display: "Level: 2, XP: 1000 / 2027 (1027 to next), HP: 15/15"


════════════════════════════════════════════════════════════════════════
                     MULTI-LEVEL EXAMPLE
════════════════════════════════════════════════════════════════════════

Initial State: L1, 0 XP, 10 HP
Boss Kill: +5000 XP

T=0s:    awardXP(player, 5000, 'boss', playerDB)
T=0s:    player.xp = 0 + 5000 = 5000
T=0s:    "You gain 5000 XP! (boss)"
T=0s:    playerDB.updatePlayerXP() → players.json

T=0.1s:  checkLevelUp()
T=0.1s:  5000 >= 1000 (L2 threshold) ? YES
T=0.1s:  ─── LEVEL-UP 1 BEGINS ───
T=0.1s:  levelUp() → L1 → L2
T=0.1s:  HP: 10 → 15, proficiency: +2
T=0.1s:  Display: "LEVEL UP! You are now level 2!"
T=0.1s:  playerDB.updatePlayerLevel()
T=0.1s:  ─── LEVEL-UP 1 COMPLETE ───

T=0.2s:  checkLevelUp() AGAIN (recursive)
T=0.2s:  5000 >= 2027 (L3 threshold) ? YES
T=0.2s:  ─── LEVEL-UP 2 BEGINS ───
T=0.2s:  levelUp() → L2 → L3
T=0.2s:  HP: 15 → 20, proficiency: +2
T=0.2s:  Display: "LEVEL UP! You are now level 3!"
T=0.2s:  playerDB.updatePlayerLevel()
T=0.2s:  ─── LEVEL-UP 2 COMPLETE ───

T=0.3s:  checkLevelUp() AGAIN (recursive)
T=0.3s:  5000 >= 6858 (L4 threshold) ? NO
T=0.3s:  ─── MULTI-LEVEL COMPLETE ───

Final State: L3, 5000 XP, 20 HP


════════════════════════════════════════════════════════════════════════
                      END OF FLOW DIAGRAM
════════════════════════════════════════════════════════════════════════
