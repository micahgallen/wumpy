# Combat & XP System Architecture

## Table of Contents

1. [Overview](#overview)
2. [Core Data Structures](#core-data-structures)
3. [XP & Leveling System](#xp--leveling-system)
4. [Combat System](#combat-system)
5. [Death & Resurrection](#death--resurrection)
6. [NPC AI & Behavior](#npc-ai--behavior)
7. [Resting System](#resting-system)
8. [PvP System](#pvp-system)
9. [Edge Cases & Error Handling](#edge-cases--error-handling)
10. [Implementation Guide](#implementation-guide)
11. [Reference Configuration](#reference-configuration)

---

## Overview

This document defines the complete architecture for the MUD's combat and character progression systems. These systems are deeply integrated: combat generates XP, XP drives leveling, and levels enhance combat capabilities.

### Design Philosophy

- **D20-based mechanics**: Simplified tabletop RPG approach with d20 rolls for attacks
- **Formula-driven progression**: Deterministic XP curves with configurable pacing
- **Modular combat registry**: Centralized combat state prevents desyncs
- **Instance-based NPCs**: Separate definitions from instances for efficient spawning
- **Guild extensibility**: Hooks allow guilds to customize progression and abilities

### System Integration Points

```
Player Action → Combat Initiated → Combat Registry
                                 ↓
                         Round-based Resolution
                                 ↓
                    Victory/Death/Flee/Leash
                                 ↓
              XP Award → Level Check → Guild Hooks
                                 ↓
                         Death Handler (if died)
                                 ↓
                    Corpse/Ghost/Resurrection Flow
```

---

## Core Data Structures

### 2.1 Player Character Schema

```typescript
interface Player {
  id: string;                    // Unique player ID
  name: string;

  // Core Stats
  level: number;
  currentXp: number;
  maxHp: number;
  currentHp: number;
  resource: number;              // Mana/energy/etc (guild-specific)
  maxResource: number;

  // Attributes (base values)
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;

  // Derived Stats
  proficiency: number;           // Calculated: +2 at L1, +3 at L5, +4 at L9, etc.
  armorClass: number;            // Base 10 + DEX mod + armor bonuses

  // Equipment
  equippedWeapon?: ItemInstance;
  equippedArmor?: ItemInstance;
  inventory: ItemInstance[];

  // Combat State
  currentWeapon: {
    name: string;
    damageDice: string;          // Default "1d4" for unarmed
    damageType: DamageType;
  };

  // Guild & Progression
  guildId?: string;
  guildRank: number;

  // Status Flags
  isGhost: boolean;
  isDead: boolean;
  lastDamageTaken: number;       // Timestamp for resting checks
  lastDefeatedBy: Set<string>;   // NPC instance IDs with 2-min cooldown

  // Location
  roomId: string;

  // PvP
  pvpCooldownUntil?: number;     // 5s spawn protection

  // Cooldowns
  fleeCooldownUntil?: number;    // 10s between flee attempts
}
```

### 2.2 NPC Definition vs Instance

**NPC Definition** (static template):

```typescript
interface NpcDefinition {
  id: string;                    // Unique definition ID (e.g., "goblin_warrior")
  name: string;
  description: string;

  // Base Stats
  level: number;
  maxHp: number;
  armorClass: number;

  // Attributes
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;

  // Combat
  damageDice: string;            // e.g., "1d6"
  damageType: DamageType;
  proficiency: number;

  // Resistances/Vulnerabilities
  resistances: Record<DamageType, number>;  // 0.0-1.0 multiplier
  vulnerabilities: DamageType[];

  // AI Behavior
  aggressive: boolean;
  socialAggro: boolean;          // Pull nearby same-type NPCs
  leashDistance: number;         // Max distance from home
  pursuitDurationSec: number;    // Max pursuit time

  // Loot & XP
  xpReward: number;              // Base XP for even-level kill
  lootTable: LootEntry[];

  // Respawn
  respawnDelay: number;          // Seconds until respawn
  homeRoomId: string;            // Where to spawn/retreat
}
```

**NPC Instance** (spawned copy):

```typescript
interface NpcInstance {
  instanceId: string;            // Unique instance ID
  defId: string;                 // Reference to NpcDefinition

  // Runtime State
  currentHp: number;
  currentRoomId: string;
  homeRoomId: string;

  // Combat State
  inCombat: boolean;
  targetId?: string;

  // Leash State
  pursuedSince?: number;         // Timestamp when pursuit started
  distanceFromHome: number;      // Rooms away from home

  // Aggro State
  aggroList: AggroEntry[];       // Sorted by threat
  lastDefeatedPlayers: Map<string, number>;  // PlayerId → timestamp

  // Respawn
  isDead: boolean;
  respawnAt?: number;            // Timestamp for respawn
}

interface AggroEntry {
  playerId: string;
  threat: number;
  addedAt: number;
}
```

### 2.3 Combat Registry

Centralized combat state management to prevent desyncs:

```typescript
interface CombatRegistry {
  combats: Record<CombatId, Combat>;
  entityToCombat: Record<EntityId, CombatId>;
}

interface Combat {
  id: CombatId;                  // Unique combat ID
  participants: Participant[];
  currentTurn: number;           // Round counter
  startedAt: number;             // Timestamp

  // State
  isActive: boolean;
  pendingActions: Map<EntityId, CombatAction>;
}

interface Participant {
  entityId: EntityId;            // Player or NPC instance ID
  entityType: 'player' | 'npc';

  // Snapshot at combat start
  initialHp: number;
  initialRoomId: string;

  // Status Effects
  effects: StatusEffect[];

  // Combat Modifiers
  advantageCount: number;        // Tracks advantage sources
  disadvantageCount: number;     // Tracks disadvantage sources
}

interface StatusEffect {
  type: string;                  // 'blinded', 'restrained', 'blessed', etc.
  durationRounds: number;
  source: string;
  grantAdvantage?: boolean;
  grantDisadvantage?: boolean;
}

type CombatId = string;
type EntityId = string;          // Player ID or NPC instance ID
```

### 2.4 Corpse & Ghost

```typescript
interface Corpse {
  id: string;
  playerName: string;
  playerId: string;
  roomId: string;

  // Contents
  items: ItemInstance[];         // Unequipped items only

  // Decay
  createdAt: number;
  decaysAt: number;              // createdAt + 30 minutes

  // PvP Looting
  isPvpCorpse: boolean;
  killerId?: string;
  lootableUntil?: number;        // 2-minute window for PvP
}

interface GhostState {
  playerId: string;
  deathLocation: string;         // Room ID where they died
  diedAt: number;

  // Movement penalty
  movementSlowdown: number;      // Multiplier (e.g., 2.0 = twice as slow)
}
```

### 2.5 Room Extensions

```typescript
interface Room {
  id: string;
  // ... existing room properties ...

  // Combat-related
  isPvpZone: boolean;
  isSafeRoom: boolean;           // No combat allowed, allows resting
  preventFleeing: boolean;       // Boss rooms

  // NPC Instances
  npcInstances: Set<string>;     // NPC instance IDs in this room

  // Campfires (temporary safe zones)
  campfires: Campfire[];
}

interface Campfire {
  id: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  radius: number;                // Number of rooms (0 = same room only)
}
```

---

## XP & Leveling System

### 3.1 XP Formula

**Level-to-XP Requirement**:

```typescript
function getXpForLevel(level: number): number {
  return Math.round(800 * Math.pow(level, 1.6));
}
```

**Example Progression**:
- L1 → L2: 800 XP
- L2 → L3: 2,027 XP
- L3 → L4: 3,831 XP
- L4 → L5: 6,135 XP
- L5 → L6: 8,871 XP

**Total to L5**: ~12,793 XP (~90 min with casual pacing)

### 3.2 XP Rewards

**Mob XP Calculation**:

```typescript
function getMobXpReward(mobLevel: number, playerLevel: number): number {
  const baseXp = 0.12 * getXpForLevel(mobLevel);

  // Level difference scaling
  const levelDiff = mobLevel - playerLevel;
  let multiplier = 1.0;

  if (levelDiff >= 5) multiplier = 1.5;      // Much higher level
  else if (levelDiff >= 2) multiplier = 1.2; // Higher level
  else if (levelDiff <= -5) multiplier = 0.3; // Much lower level
  else if (levelDiff <= -2) multiplier = 0.6; // Lower level

  return Math.round(baseXp * multiplier);
}
```

**Group XP Sharing**:
- Total XP is split evenly among all participants in combat
- Each participant must have dealt at least 10% of total damage to qualify

### 3.3 Level-Up Mechanics

**Triggers**:
1. After combat resolution, check if `currentXp >= getXpForLevel(level + 1)`
2. If true, increment level and apply bonuses

**Standard Level-Up Bonuses**:

```typescript
function applyLevelUp(player: Player): void {
  player.level++;

  // 1. HP Increase
  player.maxHp += 5;
  player.currentHp = player.maxHp;  // Full heal

  // 2. Proficiency (every 4 levels)
  player.proficiency = calculateProficiency(player.level);

  // 3. Stat Choice (every 4th level)
  if (player.level % 4 === 0) {
    // Check if guild has custom rule
    const guild = getGuild(player.guildId);
    if (guild?.levelUpRule) {
      guild.levelUpRule.applyStatGain(player);
    } else {
      // Prompt player to choose +1 to any stat
      promptStatChoice(player);
    }
  }

  // 4. Guild-specific bonuses
  const guild = getGuild(player.guildId);
  guild?.onLevelUp?.(player);

  // 5. Broadcast message
  sendToPlayer(player, `You have reached level ${player.level}!`);
  sendToRoom(player.roomId, `${player.name} glows briefly as they gain a level!`, [player.id]);
}

function calculateProficiency(level: number): number {
  // +2 at L1, +3 at L5, +4 at L9, +5 at L13, etc.
  return 2 + Math.floor((level - 1) / 4);
}
```

### 3.4 Guild Level-Up Hooks

Guilds can customize leveling by implementing the `LevelUpRule` interface:

```typescript
interface LevelUpRule {
  // Called when player levels up
  applyStatGain(player: Player): void;

  // Called every 4th level for stat choice
  // Return true to override default stat choice
  handleStatChoice(player: Player): boolean;

  // Optional: grant guild-specific abilities at certain levels
  grantAbilities?(player: Player): void;
}

// Example: Warrior Guild
class WarriorLevelUpRule implements LevelUpRule {
  applyStatGain(player: Player): void {
    // Warriors get bonus HP
    player.maxHp += 2;
    player.currentHp += 2;
  }

  handleStatChoice(player: Player): boolean {
    if (player.level % 4 === 0) {
      // Auto-assign STR or CON
      if (player.str < player.con) {
        player.str++;
      } else {
        player.con++;
      }
      return true;  // Handled, skip player choice
    }
    return false;
  }

  grantAbilities(player: Player): void {
    if (player.level === 5) {
      // Grant "Power Attack" ability
      addAbility(player, 'power_attack');
    }
  }
}
```

### 3.5 XP Table Generation

Generate at server startup for reference:

```typescript
function generateXpTable(): void {
  console.log('=== XP Progression Table (L1-50) ===');
  console.log('Level | XP Required | Cumulative XP | Proficiency');
  console.log('------|-------------|---------------|------------');

  let cumulative = 0;
  for (let level = 1; level <= 50; level++) {
    const xpNeeded = getXpForLevel(level);
    cumulative += xpNeeded;
    const prof = calculateProficiency(level);

    console.log(
      `${level.toString().padStart(5)} | ` +
      `${xpNeeded.toString().padStart(11)} | ` +
      `${cumulative.toString().padStart(13)} | ` +
      `${prof.toString().padStart(11)}`
    );
  }
}
```

---

## Combat System

### 4.1 Combat Initiation

**Starting Combat**:

```typescript
function initiateCombat(attacker: Entity, defender: Entity): CombatId {
  // 1. Create combat instance
  const combatId = generateCombatId();
  const combat: Combat = {
    id: combatId,
    participants: [
      createParticipant(attacker),
      createParticipant(defender)
    ],
    currentTurn: 0,
    startedAt: Date.now(),
    isActive: true,
    pendingActions: new Map()
  };

  // 2. Register in combat registry
  combatRegistry.combats[combatId] = combat;
  combatRegistry.entityToCombat[attacker.id] = combatId;
  combatRegistry.entityToCombat[defender.id] = combatId;

  // 3. Social aggro check (if defender is NPC)
  if (defender.type === 'npc') {
    triggerSocialAggro(defender as NpcInstance, attacker.id);
  }

  // 4. Send initial messages
  broadcastCombatStart(combat);

  return combatId;
}

function createParticipant(entity: Entity): Participant {
  return {
    entityId: entity.id,
    entityType: entity.type,
    initialHp: entity.currentHp,
    initialRoomId: entity.roomId,
    effects: [],
    advantageCount: 0,
    disadvantageCount: 0
  };
}
```

**Blocking Other Actions**:
- Players in combat cannot move (except via `flee` command)
- Players in combat cannot rest, use items, or interact with objects
- Players in combat cannot initiate social commands

### 4.2 Round Resolution

Combat uses a turn-based round system:

```typescript
function processCombatRound(combatId: CombatId): void {
  const combat = combatRegistry.combats[combatId];
  if (!combat.isActive) return;

  combat.currentTurn++;

  // 1. Process all pending actions simultaneously
  for (const participant of combat.participants) {
    const action = combat.pendingActions.get(participant.entityId);
    if (!action) {
      // Auto-attack if no action queued
      queueAutoAttack(participant);
    }
  }

  // 2. Resolve actions in initiative order
  const initiativeOrder = rollInitiative(combat.participants);

  for (const participant of initiativeOrder) {
    if (!isAlive(participant)) continue;

    const action = combat.pendingActions.get(participant.entityId);
    executeAction(combat, participant, action);
  }

  // 3. Clear pending actions
  combat.pendingActions.clear();

  // 4. Apply status effects
  tickStatusEffects(combat);

  // 5. Check for combat end
  if (isCombatOver(combat)) {
    endCombat(combat);
  }
}

function rollInitiative(participants: Participant[]): Participant[] {
  return participants
    .map(p => ({
      participant: p,
      roll: rollD20() + getModifier(getEntity(p.entityId).dex)
    }))
    .sort((a, b) => b.roll - a.roll)
    .map(entry => entry.participant);
}
```

### 4.3 Attack Resolution

**Attack Roll Mechanics**:

```typescript
function resolveAttack(attacker: Entity, defender: Entity, combat: Combat): AttackResult {
  const attackerParticipant = getParticipant(combat, attacker.id);
  const defenderParticipant = getParticipant(combat, defender.id);

  // 1. Determine advantage/disadvantage
  const netAdvantage = calculateNetAdvantage(attackerParticipant, defenderParticipant);

  // 2. Roll attack
  const attackRoll = rollAttack(netAdvantage);
  const attackBonus = getModifier(attacker.str) + attacker.proficiency;
  const totalAttack = attackRoll.total + attackBonus;

  // 3. Check critical miss/hit
  if (attackRoll.natural === 1) {
    return {
      hit: false,
      critical: false,
      fumble: true,
      rolls: attackRoll.rolls,
      total: totalAttack,
      damage: 0
    };
  }

  if (attackRoll.natural === 20) {
    const damage = rollDamage(attacker.currentWeapon.damageDice, true);
    applyDamage(defender, damage, attacker.currentWeapon.damageType);
    return {
      hit: true,
      critical: true,
      fumble: false,
      rolls: attackRoll.rolls,
      total: totalAttack,
      damage
    };
  }

  // 4. Normal hit check
  if (totalAttack >= defender.armorClass) {
    const damage = rollDamage(attacker.currentWeapon.damageDice, false);
    applyDamage(defender, damage, attacker.currentWeapon.damageType);
    return {
      hit: true,
      critical: false,
      fumble: false,
      rolls: attackRoll.rolls,
      total: totalAttack,
      damage
    };
  }

  // 5. Miss
  return {
    hit: false,
    critical: false,
    fumble: false,
    rolls: attackRoll.rolls,
    total: totalAttack,
    damage: 0
  };
}

interface AttackRoll {
  rolls: number[];      // Array of d20 rolls (1 or 2)
  natural: number;      // The chosen natural roll
  total: number;        // natural + bonuses
}

function rollAttack(advantage: 'advantage' | 'disadvantage' | 'normal'): AttackRoll {
  if (advantage === 'advantage') {
    const roll1 = rollD20();
    const roll2 = rollD20();
    const chosen = Math.max(roll1, roll2);
    return { rolls: [roll1, roll2], natural: chosen, total: chosen };
  } else if (advantage === 'disadvantage') {
    const roll1 = rollD20();
    const roll2 = rollD20();
    const chosen = Math.min(roll1, roll2);
    return { rolls: [roll1, roll2], natural: chosen, total: chosen };
  } else {
    const roll = rollD20();
    return { rolls: [roll], natural: roll, total: roll };
  }
}

function calculateNetAdvantage(attacker: Participant, defender: Participant): 'advantage' | 'disadvantage' | 'normal' {
  const netCount = attacker.advantageCount - attacker.disadvantageCount;

  if (netCount > 0) return 'advantage';
  if (netCount < 0) return 'disadvantage';
  return 'normal';
}
```

**Damage Calculation**:

```typescript
function rollDamage(damageDice: string, isCritical: boolean): number {
  const parsed = parseDiceString(damageDice);
  if (!parsed) return 0;

  let total = 0;
  const rollCount = isCritical ? parsed.count * 2 : parsed.count;

  for (let i = 0; i < rollCount; i++) {
    total += rollDie(parsed.sides);
  }

  total += parsed.modifier;
  return Math.max(1, total);  // Minimum 1 damage
}

function applyDamage(target: Entity, damage: number, damageType: DamageType): void {
  // Apply resistances/vulnerabilities
  const multiplier = getResistanceMultiplier(target, damageType);
  const finalDamage = Math.round(damage * multiplier);

  target.currentHp = Math.max(0, target.currentHp - finalDamage);
  target.lastDamageTaken = Date.now();

  // Check for death
  if (target.currentHp === 0) {
    handleDeath(target);
  }
}

function parseDiceString(dice: string): { count: number; sides: number; modifier: number } | null {
  const match = dice.match(/^(\d+)d(\d+)([+\-]\d+)?$/);
  if (!match) return null;

  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  // Validation
  if (count < 1 || count > 100) return null;
  if (sides < 2 || sides > 100) return null;

  return { count, sides, modifier };
}
```

### 4.4 Advantage/Disadvantage Sources

```typescript
function grantAdvantage(participant: Participant, source: string, duration: number): void {
  participant.advantageCount++;
  participant.effects.push({
    type: `advantage_${source}`,
    durationRounds: duration,
    source,
    grantAdvantage: true
  });
}

function grantDisadvantage(participant: Participant, source: string, duration: number): void {
  participant.disadvantageCount++;
  participant.effects.push({
    type: `disadvantage_${source}`,
    durationRounds: duration,
    source,
    grantDisadvantage: true
  });
}

// Common sources:
// - First attack after leaving stealth (advantage)
// - Target is blinded (advantage to attacker)
// - Target is restrained (advantage to attacker)
// - Flanking with ally in melee (advantage)
// - Attacker is blinded (disadvantage)
// - Attacking while prone (disadvantage)
```

### 4.5 Combat Output Formatting

```typescript
function formatAttackMessage(attacker: Entity, defender: Entity, result: AttackResult): string {
  let msg = '';

  // Show dice rolls
  if (result.rolls.length > 1) {
    const advType = result.rolls[0] === result.natural ? 'advantage' : 'disadvantage';
    msg += `${attacker.name} attacks with ${advType}! `;
    msg += `[Rolls: ${result.rolls.join(', ')} → ${result.natural}] `;
  } else {
    msg += `${attacker.name} rolls [${result.natural}] `;
  }

  msg += `(total: ${result.total}) vs AC ${defender.armorClass}\n`;

  if (result.fumble) {
    msg += `CRITICAL MISS! ${attacker.name} stumbles badly!`;
  } else if (result.critical) {
    msg += `CRITICAL HIT! ${defender.name} takes ${result.damage} damage!`;
  } else if (result.hit) {
    msg += `Hit! ${defender.name} takes ${result.damage} damage.`;
  } else {
    msg += `Miss!`;
  }

  return msg;
}
```

### 4.6 Flee Mechanics

**Flee Command**:

```typescript
function attemptFlee(player: Player, direction: string): FleeResult {
  // 1. Validation
  const combat = getCombatForEntity(player.id);
  if (!combat) {
    return { success: false, reason: 'You are not in combat.' };
  }

  const currentRoom = getRoom(player.roomId);
  if (currentRoom.preventFleeing) {
    return { success: false, reason: 'You cannot flee from this battle!' };
  }

  if (player.fleeCooldownUntil && Date.now() < player.fleeCooldownUntil) {
    const remaining = Math.ceil((player.fleeCooldownUntil - Date.now()) / 1000);
    return { success: false, reason: `You must wait ${remaining}s before fleeing again.` };
  }

  const exit = currentRoom.exits[direction];
  if (!exit) {
    return { success: false, reason: 'You cannot flee in that direction!' };
  }

  // 2. Get primary opponent
  const opponent = getPrimaryOpponent(combat, player.id);

  // 3. Opposed roll
  const playerRoll = rollD20() + getModifier(player.dex) + player.proficiency;
  const opponentRoll = rollD20() + getModifier(opponent.dex) + opponent.proficiency;

  // 4. Opportunity attack (happens regardless of success)
  const opportunityAttack = resolveAttack(opponent, player, combat);

  sendToPlayer(player, formatAttackMessage(opponent, player, opportunityAttack));

  // 5. Check flee success
  if (playerRoll < opponentRoll) {
    // Failed flee
    sendToPlayer(player, `You try to flee but ${opponent.name} blocks your escape!`);
    player.fleeCooldownUntil = Date.now() + 10000;  // 10s cooldown
    return { success: false, reason: 'Flee failed!' };
  }

  // 6. Successful flee
  player.fleeCooldownUntil = Date.now() + 10000;

  // Remove from combat
  removeCombatant(combat, player.id);

  // Move to target room
  movePlayer(player, exit.targetRoomId);

  sendToPlayer(player, `You flee ${direction}!`);
  sendToRoom(currentRoom.id, `${player.name} flees ${direction}!`, [player.id]);

  return { success: true };
}

interface FleeResult {
  success: boolean;
  reason?: string;
}
```

### 4.7 Target Time-to-Kill (TTK)

**Design Targets**:
- Even-level fight: 4-6 rounds average
- ~60% hit rate for even-level encounters
- Player AC ~13 at L1 (10 + 2 DEX mod + 1 armor)
- NPC AC ~14 at L1
- Proficiency: +2 at L1, +3 at L5, +4 at L9

**Example L1 Combat**:
- Player: 10 HP, AC 13, +3 to hit (STR +1, Prof +2), 1d6 damage (3.5 avg)
- Goblin: 8 HP, AC 14, +3 to hit, 1d6 damage

Expected outcome:
- Player hits on 11+ (50% chance)
- Goblin hits on 10+ (55% chance)
- Player kills in ~3 hits (10.5 damage) = 6 rounds avg
- Goblin kills in ~3 hits (10.5 damage) = 5.5 rounds avg

This gives players a slight edge in even encounters, requiring tactical use of abilities and healing.

---

## Death & Resurrection

### 5.1 Death Sequence

```typescript
function handleDeath(entity: Entity): void {
  if (entity.type === 'player') {
    handlePlayerDeath(entity as Player);
  } else {
    handleNpcDeath(entity as NpcInstance);
  }
}

function handlePlayerDeath(player: Player): void {
  const combat = getCombatForEntity(player.id);
  const killer = combat ? getPrimaryOpponent(combat, player.id) : null;

  // 1. Remove from combat
  if (combat) {
    removeCombatant(combat, player.id);
  }

  // 2. Calculate XP loss
  const xpLoss = calculateXpLoss(player);
  player.currentXp = Math.max(
    player.currentXp - xpLoss,
    getXpForLevel(player.level)  // Never drop below current level
  );

  // 3. Create corpse
  const corpse = createCorpse(player, killer);
  addCorpseToRoom(player.roomId, corpse);

  // 4. Transform to ghost
  player.isGhost = true;
  player.isDead = true;
  player.currentHp = 1;  // Ghosts have minimal HP

  // Ghost state
  const ghostState: GhostState = {
    playerId: player.id,
    deathLocation: player.roomId,
    diedAt: Date.now(),
    movementSlowdown: 2.0
  };
  setGhostState(player.id, ghostState);

  // 5. If NPC killed player, add cooldown
  if (killer && killer.type === 'npc') {
    player.lastDefeatedBy.add(killer.id);
    setTimeout(() => {
      player.lastDefeatedBy.delete(killer.id);
    }, 120000);  // 2 minutes
  }

  // 6. Messages
  sendToPlayer(player, 'You have died! Your spirit rises from your corpse...');
  sendToRoom(player.roomId, `${player.name} has died!`, [player.id]);
}

function calculateXpLoss(player: Player): number {
  const currentLevelXp = getXpForLevel(player.level);
  const nextLevelXp = getXpForLevel(player.level + 1);
  const xpIntoLevel = player.currentXp - currentLevelXp;

  let lossPercent: number;
  if (player.level <= 10) {
    lossPercent = 0.05;  // 5%
  } else if (player.level <= 30) {
    lossPercent = 0.03;  // 3%
  } else {
    lossPercent = 0.02;  // 2%
  }

  return Math.floor(xpIntoLevel * lossPercent);
}
```

### 5.2 Corpse System

```typescript
function createCorpse(player: Player, killer?: Entity): Corpse {
  const isPvpDeath = killer?.type === 'player';

  // Separate equipped vs carried items
  const carriedItems = player.inventory.filter(item => !item.isEquipped);

  const corpse: Corpse = {
    id: generateId(),
    playerName: player.name,
    playerId: player.id,
    roomId: player.roomId,
    items: carriedItems,
    createdAt: Date.now(),
    decaysAt: Date.now() + (30 * 60 * 1000),  // 30 minutes
    isPvpCorpse: isPvpDeath,
    killerId: isPvpDeath ? killer.id : undefined,
    lootableUntil: isPvpDeath ? Date.now() + (2 * 60 * 1000) : undefined
  };

  // Remove items from player inventory (equipped items stay)
  player.inventory = player.inventory.filter(item => item.isEquipped);

  return corpse;
}

function processCorpseDecay(): void {
  const now = Date.now();

  for (const corpse of getAllCorpses()) {
    if (now >= corpse.decaysAt) {
      decayCorpse(corpse);
    }
  }
}

function decayCorpse(corpse: Corpse): void {
  // Decay to "Remains" with 50% of items
  const remainingItems = corpse.items.filter(() => Math.random() < 0.5);

  if (remainingItems.length > 0) {
    const remains = createRemains(corpse, remainingItems);
    addRemainsToRoom(corpse.roomId, remains);
  }

  removeCorpse(corpse.id);

  // Notify if player is ghost in same room
  const ghost = getGhostByPlayerId(corpse.playerId);
  if (ghost && ghost.roomId === corpse.roomId) {
    sendToPlayer(ghost, 'Your corpse decays into scattered remains...');
  }
}
```

### 5.3 Resurrection

```typescript
function resurrectPlayer(player: Player, resurrector?: Entity): void {
  if (!player.isGhost) {
    return;  // Not dead
  }

  // 1. Restore to living state
  player.isGhost = false;
  player.isDead = false;
  player.currentHp = Math.floor(player.maxHp * 0.5);  // 50% HP

  // 2. Remove ghost state
  removeGhostState(player.id);

  // 3. Teleport to resurrection point (if not already there)
  const resPoint = getResurrectionPoint(player);
  if (player.roomId !== resPoint.roomId) {
    movePlayer(player, resPoint.roomId);
  }

  // 4. Short spawn protection for PvP
  if (getRoom(player.roomId).isPvpZone) {
    player.pvpCooldownUntil = Date.now() + 5000;  // 5 seconds
  }

  // 5. Messages
  sendToPlayer(player, 'Your spirit returns to your body!');
  sendToRoom(player.roomId, `${player.name} is resurrected!`, [player.id]);

  // 6. Resurrector message
  if (resurrector) {
    sendToPlayer(resurrector, `You have resurrected ${player.name}.`);
  }
}

function getResurrectionPoint(player: Player): Room {
  // Priority:
  // 1. Bound resurrection shrine (if player has set one)
  // 2. Guild temple
  // 3. Default temple/respawn point

  if (player.boundShrineId) {
    return getRoom(player.boundShrineId);
  }

  if (player.guildId) {
    const guild = getGuild(player.guildId);
    if (guild.templeRoomId) {
      return getRoom(guild.templeRoomId);
    }
  }

  return getRoom('temple_of_light');  // Default
}
```

### 5.4 Ghost Mechanics

**Ghost Restrictions**:

```typescript
function canGhostPerformAction(player: Player, action: string): boolean {
  if (!player.isGhost) return true;

  const blockedActions = [
    'attack',
    'cast',
    'use_item',
    'get',
    'drop',
    'equip',
    'unequip'
  ];

  return !blockedActions.includes(action);
}

// Movement is slower for ghosts
function getMovementDelay(player: Player): number {
  const baseDelay = 1000;  // 1 second

  if (player.isGhost) {
    const ghostState = getGhostState(player.id);
    return baseDelay * (ghostState?.movementSlowdown || 2.0);
  }

  return baseDelay;
}
```

---

## NPC AI & Behavior

### 6.1 Aggro System

**Aggro Triggers**:

```typescript
function checkNpcAggro(npcInstance: NpcInstance, player: Player): void {
  const npcDef = getNpcDefinition(npcInstance.defId);

  // Skip if NPC isn't aggressive
  if (!npcDef.aggressive) return;

  // Skip if player just defeated this NPC (2-min cooldown)
  const cooldownEnd = npcInstance.lastDefeatedPlayers.get(player.id);
  if (cooldownEnd && Date.now() < cooldownEnd) return;

  // Skip if player is ghost
  if (player.isGhost) return;

  // Skip if player has spawn protection
  if (player.pvpCooldownUntil && Date.now() < player.pvpCooldownUntil) return;

  // Initiate combat
  initiateCombat(npcInstance, player);
}

function onPlayerEnterRoom(player: Player, room: Room): void {
  for (const npcInstanceId of room.npcInstances) {
    const npcInstance = getNpcInstance(npcInstanceId);
    if (npcInstance && !npcInstance.inCombat) {
      checkNpcAggro(npcInstance, player);
    }
  }
}
```

**Social Aggro**:

```typescript
function triggerSocialAggro(npcInstance: NpcInstance, attackerId: string): void {
  const npcDef = getNpcDefinition(npcInstance.defId);

  if (!npcDef.socialAggro) return;

  const room = getRoom(npcInstance.currentRoomId);

  // Find nearby NPCs of same type
  for (const nearbyNpcId of room.npcInstances) {
    const nearbyNpc = getNpcInstance(nearbyNpcId);
    if (!nearbyNpc || nearbyNpc.inCombat) continue;

    if (nearbyNpc.defId === npcInstance.defId) {
      // Join the fight
      const combat = getCombatForEntity(npcInstance.instanceId);
      if (combat) {
        addCombatant(combat, nearbyNpc);
        sendToRoom(room.id, `${nearbyNpc.name} joins the fight!`);
      }
    }
  }
}
```

### 6.2 Leash Mechanics

**Leash Triggers**:

```typescript
function checkLeash(npcInstance: NpcInstance, combat: Combat): boolean {
  const npcDef = getNpcDefinition(npcInstance.defId);

  // Calculate distance from home
  const distanceFromHome = calculateRoomDistance(
    npcInstance.currentRoomId,
    npcInstance.homeRoomId
  );

  // Check distance leash
  if (distanceFromHome > npcDef.leashDistance) {
    triggerLeash(npcInstance, combat, 'distance');
    return true;
  }

  // Check time leash
  if (npcInstance.pursuedSince) {
    const pursuitDuration = (Date.now() - npcInstance.pursuedSince) / 1000;
    if (pursuitDuration > npcDef.pursuitDurationSec) {
      triggerLeash(npcInstance, combat, 'time');
      return true;
    }
  }

  return false;
}

function triggerLeash(npcInstance: NpcInstance, combat: Combat, reason: string): void {
  // 1. Remove from combat
  removeCombatant(combat, npcInstance.instanceId);

  // 2. Return to home
  const currentRoom = getRoom(npcInstance.currentRoomId);
  sendToRoom(currentRoom.id, `${getNpcName(npcInstance)} retreats!`);

  moveNpcToHome(npcInstance);

  // 3. Schedule healing after 10 seconds
  setTimeout(() => {
    npcInstance.currentHp = getNpcDefinition(npcInstance.defId).maxHp;
    npcInstance.pursuedSince = undefined;
  }, 10000);
}

function moveNpcToHome(npcInstance: NpcInstance): void {
  const currentRoom = getRoom(npcInstance.currentRoomId);
  const homeRoom = getRoom(npcInstance.homeRoomId);

  // Remove from current room
  currentRoom.npcInstances.delete(npcInstance.instanceId);

  // Add to home room
  homeRoom.npcInstances.add(npcInstance.instanceId);
  npcInstance.currentRoomId = npcInstance.homeRoomId;
}
```

### 6.3 NPC Death & Respawn

```typescript
function handleNpcDeath(npcInstance: NpcInstance): void {
  const combat = getCombatForEntity(npcInstance.instanceId);
  const npcDef = getNpcDefinition(npcInstance.defId);

  // 1. Award XP to all combat participants
  if (combat) {
    awardCombatXp(combat, npcInstance);
  }

  // 2. Drop loot
  const loot = generateLoot(npcDef.lootTable);
  const room = getRoom(npcInstance.currentRoomId);
  for (const item of loot) {
    addItemToRoom(room, item);
  }

  // 3. Remove from room
  room.npcInstances.delete(npcInstance.instanceId);

  // 4. Mark as dead and schedule respawn
  npcInstance.isDead = true;
  npcInstance.respawnAt = Date.now() + (npcDef.respawnDelay * 1000);

  // 5. Messages
  sendToRoom(room.id, `${getNpcName(npcInstance)} has been defeated!`);

  // 6. Remove from combat
  if (combat) {
    removeCombatant(combat, npcInstance.instanceId);
  }
}

function processNpcRespawns(): void {
  const now = Date.now();

  for (const npcInstance of getAllNpcInstances()) {
    if (npcInstance.isDead && npcInstance.respawnAt && now >= npcInstance.respawnAt) {
      respawnNpc(npcInstance);
    }
  }
}

function respawnNpc(npcInstance: NpcInstance): void {
  const npcDef = getNpcDefinition(npcInstance.defId);

  // Reset to full health
  npcInstance.currentHp = npcDef.maxHp;
  npcInstance.isDead = false;
  npcInstance.respawnAt = undefined;
  npcInstance.currentRoomId = npcInstance.homeRoomId;

  // Add back to home room
  const homeRoom = getRoom(npcInstance.homeRoomId);
  homeRoom.npcInstances.add(npcInstance.instanceId);

  // Clear aggro list
  npcInstance.aggroList = [];
  npcInstance.lastDefeatedPlayers.clear();
}
```

### 6.4 XP Award Distribution

```typescript
function awardCombatXp(combat: Combat, defeatedNpc: NpcInstance): void {
  const npcDef = getNpcDefinition(defeatedNpc.defId);

  // Get all player participants who dealt damage
  const eligiblePlayers = combat.participants
    .filter(p => p.entityType === 'player')
    .map(p => getPlayer(p.entityId))
    .filter(player => {
      // Must have dealt at least 10% of total damage
      const damageDealt = calculateDamageDealt(combat, player.id);
      const totalDamage = npcDef.maxHp - defeatedNpc.currentHp;
      return damageDealt >= totalDamage * 0.1;
    });

  if (eligiblePlayers.length === 0) return;

  // Calculate XP per player
  const baseXp = npcDef.xpReward;
  const xpPerPlayer = Math.floor(baseXp / eligiblePlayers.length);

  for (const player of eligiblePlayers) {
    const adjustedXp = getMobXpReward(npcDef.level, player.level);
    const finalXp = Math.floor(adjustedXp / eligiblePlayers.length);

    player.currentXp += finalXp;
    sendToPlayer(player, `You gain ${finalXp} experience points.`);

    // Check for level up
    checkLevelUp(player);
  }
}

function checkLevelUp(player: Player): void {
  const requiredXp = getXpForLevel(player.level + 1);

  if (player.currentXp >= requiredXp) {
    applyLevelUp(player);
  }
}
```

---

## Resting System

### 7.1 Rest Mechanics

```typescript
function attemptRest(player: Player): RestResult {
  // 1. Validation
  if (player.isGhost) {
    return { success: false, reason: 'Ghosts cannot rest.' };
  }

  if (getCombatForEntity(player.id)) {
    return { success: false, reason: 'You cannot rest while in combat!' };
  }

  const room = getRoom(player.roomId);
  const canRestHere = room.isSafeRoom || hasCampfireInRange(player);

  if (!canRestHere) {
    return { success: false, reason: 'You cannot rest here. Find a safe room or campfire.' };
  }

  // Check recent damage
  const timeSinceDamage = Date.now() - player.lastDamageTaken;
  if (timeSinceDamage < 60000) {  // 60 seconds
    const remaining = Math.ceil((60000 - timeSinceDamage) / 1000);
    return {
      success: false,
      reason: `You are too agitated to rest. Wait ${remaining}s.`
    };
  }

  // 2. Start rest
  startRest(player);
  return { success: true };
}

function startRest(player: Player): void {
  const restDuration = 10000;  // 10 seconds

  // Create rest state
  const restState: RestState = {
    playerId: player.id,
    startedAt: Date.now(),
    completesAt: Date.now() + restDuration,
    interrupted: false
  };

  setRestState(player.id, restState);

  sendToPlayer(player, 'You begin to rest...');
  sendToRoom(player.roomId, `${player.name} sits down to rest.`, [player.id]);

  // Schedule completion
  setTimeout(() => {
    completeRest(player);
  }, restDuration);
}

function completeRest(player: Player): void {
  const restState = getRestState(player.id);
  if (!restState || restState.interrupted) {
    return;  // Already interrupted
  }

  // Restore HP and resource
  const hpRestored = Math.floor(player.maxHp * 0.25);
  const resourceRestored = Math.floor(player.maxResource * 0.25);

  player.currentHp = Math.min(player.maxHp, player.currentHp + hpRestored);
  player.resource = Math.min(player.maxResource, player.resource + resourceRestored);

  sendToPlayer(player, `You finish resting. (+${hpRestored} HP, +${resourceRestored} resource)`);
  sendToRoom(player.roomId, `${player.name} finishes resting.`, [player.id]);

  removeRestState(player.id);
}

function interruptRest(player: Player, reason: string): void {
  const restState = getRestState(player.id);
  if (!restState) return;

  restState.interrupted = true;
  removeRestState(player.id);

  sendToPlayer(player, `Your rest is interrupted! (${reason})`);
}

// Hook into combat and movement
function onCombatStarted(player: Player): void {
  if (getRestState(player.id)) {
    interruptRest(player, 'combat');
  }
}

function onPlayerMove(player: Player): void {
  if (getRestState(player.id)) {
    interruptRest(player, 'movement');
  }
}

interface RestState {
  playerId: string;
  startedAt: number;
  completesAt: number;
  interrupted: boolean;
}

interface RestResult {
  success: boolean;
  reason?: string;
}
```

### 7.2 Campfire System

```typescript
function createCampfire(player: Player, duration: number, radius: number): Campfire {
  const campfire: Campfire = {
    id: generateId(),
    createdBy: player.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + duration,
    radius
  };

  const room = getRoom(player.roomId);
  room.campfires.push(campfire);

  sendToRoom(room.id, `${player.name} creates a warm campfire!`);

  // Schedule expiration
  setTimeout(() => {
    expireCampfire(campfire);
  }, duration);

  return campfire;
}

function hasCampfireInRange(player: Player): boolean {
  const room = getRoom(player.roomId);
  const now = Date.now();

  // Check current room
  for (const campfire of room.campfires) {
    if (now < campfire.expiresAt) {
      return true;
    }
  }

  // Check adjacent rooms if radius > 0
  // (Implementation depends on room graph structure)

  return false;
}

function expireCampfire(campfire: Campfire): void {
  const room = findRoomWithCampfire(campfire.id);
  if (!room) return;

  room.campfires = room.campfires.filter(cf => cf.id !== campfire.id);
  sendToRoom(room.id, 'A campfire burns out.');
}
```

---

## PvP System

### 8.1 PvP Combat Rules

```typescript
function canInitiatePvp(attacker: Player, defender: Player): boolean {
  const attackerRoom = getRoom(attacker.roomId);
  const defenderRoom = getRoom(defender.roomId);

  // Must be in same PvP zone
  if (!attackerRoom.isPvpZone || !defenderRoom.isPvpZone) {
    return false;
  }

  // Cannot attack during spawn protection
  if (defender.pvpCooldownUntil && Date.now() < defender.pvpCooldownUntil) {
    return false;
  }

  // Cannot attack ghosts
  if (defender.isGhost) {
    return false;
  }

  return true;
}

function handlePvpDeath(victim: Player, killer: Player): void {
  // No XP loss in PvP
  const savedXp = victim.currentXp;

  handlePlayerDeath(victim);

  // Restore XP
  victim.currentXp = savedXp;

  // Mark corpse as PvP lootable
  const corpse = findCorpseByPlayerId(victim.id);
  if (corpse) {
    corpse.isPvpCorpse = true;
    corpse.killerId = killer.id;
    corpse.lootableUntil = Date.now() + (2 * 60 * 1000);  // 2 minutes
  }

  sendToPlayer(killer, `You have slain ${victim.name}!`);
}
```

### 8.2 PvP Looting

```typescript
function canLootCorpse(player: Player, corpse: Corpse): LootPermission {
  // Owner can always loot
  if (corpse.playerId === player.id) {
    return { allowed: true };
  }

  // PvP corpses have special rules
  if (corpse.isPvpCorpse) {
    const now = Date.now();

    // Killer has 2-minute priority window
    if (corpse.lootableUntil && now < corpse.lootableUntil) {
      if (player.id === corpse.killerId) {
        return { allowed: true };
      } else {
        const remaining = Math.ceil((corpse.lootableUntil - now) / 1000);
        return {
          allowed: false,
          reason: `This corpse is protected for ${remaining}s.`
        };
      }
    }

    // After window, anyone can loot
    return { allowed: true };
  }

  // Non-PvP corpses: owner only
  return {
    allowed: false,
    reason: 'You cannot loot this corpse.'
  };
}

interface LootPermission {
  allowed: boolean;
  reason?: string;
}
```

---

## Edge Cases & Error Handling

### 9.1 Server Crash Recovery

```typescript
function recoverFromCrash(): void {
  console.log('Performing crash recovery...');

  // 1. Clear all active combats
  for (const combat of Object.values(combatRegistry.combats)) {
    for (const participant of combat.participants) {
      const entity = getEntity(participant.entityId);

      // Restore to pre-combat state
      if (entity) {
        entity.currentHp = participant.initialHp;

        // Teleport back to initial room if moved during combat
        if (entity.roomId !== participant.initialRoomId) {
          moveEntity(entity, participant.initialRoomId);
        }
      }
    }
  }

  // 2. Clear combat registry
  combatRegistry.combats = {};
  combatRegistry.entityToCombat = {};

  // 3. Clear all rest states
  clearAllRestStates();

  // 4. Reset NPC leash states
  for (const npcInstance of getAllNpcInstances()) {
    npcInstance.pursuedSince = undefined;
    if (npcInstance.currentRoomId !== npcInstance.homeRoomId) {
      moveNpcToHome(npcInstance);
    }
  }

  console.log('Crash recovery complete.');
}

// Call on server startup
function onServerStart(): void {
  generateXpTable();
  recoverFromCrash();

  // Start background processes
  setInterval(processCorpseDecay, 60000);      // Every minute
  setInterval(processNpcRespawns, 10000);      // Every 10 seconds
  setInterval(processLeashChecks, 5000);       // Every 5 seconds
}
```

### 9.2 Combat Cleanup

```typescript
function endCombat(combat: Combat): void {
  combat.isActive = false;

  // Determine victor
  const survivors = combat.participants.filter(p => isAlive(getEntity(p.entityId)));

  if (survivors.length === 0) {
    // Mutual destruction (rare)
    sendToRoom(getFirstParticipantRoom(combat), 'The battle ends in mutual destruction!');
  } else if (survivors.length === 1) {
    // Clear winner
    const victor = getEntity(survivors[0].entityId);
    sendToRoom(victor.roomId, `${getEntityName(victor)} is victorious!`);
  }

  // Clean up registry
  for (const participant of combat.participants) {
    delete combatRegistry.entityToCombat[participant.entityId];
  }
  delete combatRegistry.combats[combat.id];
}

function removeCombatant(combat: Combat, entityId: EntityId): void {
  combat.participants = combat.participants.filter(p => p.entityId !== entityId);
  delete combatRegistry.entityToCombat[entityId];

  // If only one participant remains, end combat
  if (combat.participants.length <= 1) {
    endCombat(combat);
  }
}
```

### 9.3 Movement Blocking

```typescript
function canMove(player: Player, direction: string): MoveResult {
  // Check if in combat
  const combat = getCombatForEntity(player.id);
  if (combat) {
    // Exception: fleeing is allowed via flee command
    // This function shouldn't be called during flee transition
    return {
      allowed: false,
      reason: 'You cannot move while in combat! Use "flee" to escape.'
    };
  }

  // Check if resting
  if (getRestState(player.id)) {
    return {
      allowed: false,
      reason: 'You cannot move while resting!'
    };
  }

  // Ghost slowdown is applied as delay, not blocking
  const delay = getMovementDelay(player);

  return { allowed: true, delay };
}

interface MoveResult {
  allowed: boolean;
  reason?: string;
  delay?: number;
}
```

### 9.4 Dice String Validation

```typescript
function parseDiceString(dice: string): DiceRoll | null {
  // Pattern: XdY or XdY+Z or XdY-Z
  const match = dice.match(/^(\d+)d(\d+)([+\-]\d+)?$/);
  if (!match) {
    console.error(`Invalid dice string: ${dice}`);
    return null;
  }

  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  // Validate ranges
  if (count < 1 || count > 100) {
    console.error(`Dice count out of range: ${count}`);
    return null;
  }

  if (sides < 2 || sides > 100) {
    console.error(`Dice sides out of range: ${sides}`);
    return null;
  }

  if (Math.abs(modifier) > 1000) {
    console.error(`Dice modifier out of range: ${modifier}`);
    return null;
  }

  return { count, sides, modifier };
}

interface DiceRoll {
  count: number;
  sides: number;
  modifier: number;
}
```

---

## Implementation Guide

### 10.1 File Structure

```
src/
├── systems/
│   ├── combat/
│   │   ├── CombatRegistry.ts        // Central combat state
│   │   ├── CombatResolver.ts        // Attack resolution, rounds
│   │   ├── AttackRoll.ts            // D20 rolling, advantage/disadvantage
│   │   ├── DamageCalculator.ts      // Damage dice, resistances
│   │   ├── FleeHandler.ts           // Flee mechanics
│   │   └── StatusEffects.ts         // Buffs/debuffs
│   │
│   ├── progression/
│   │   ├── XpSystem.ts              // XP formulas, rewards
│   │   ├── LevelUpHandler.ts        // Level-up bonuses
│   │   ├── GuildHooks.ts            // Guild customization interface
│   │   └── XpTable.ts               // Table generation
│   │
│   ├── death/
│   │   ├── DeathHandler.ts          // Death sequence
│   │   ├── CorpseSystem.ts          // Corpse creation, decay
│   │   ├── GhostState.ts            // Ghost mechanics
│   │   └── Resurrection.ts          // Resurrection logic
│   │
│   ├── npc/
│   │   ├── NpcDefinitions.ts        // Static templates
│   │   ├── NpcInstances.ts          // Spawned instances
│   │   ├── NpcAI.ts                 // Aggro, targeting
│   │   ├── LeashSystem.ts           // Leash mechanics
│   │   └── NpcRespawn.ts            // Respawn scheduling
│   │
│   └── rest/
│       ├── RestHandler.ts           // Rest mechanics
│       └── CampfireSystem.ts        // Campfire creation
│
├── data/
│   ├── Player.ts                    // Player schema
│   ├── NpcDefinition.ts             // NPC definition schema
│   ├── NpcInstance.ts               // NPC instance schema
│   ├── Combat.ts                    // Combat data structures
│   └── Room.ts                      // Room extensions
│
├── commands/
│   ├── combat/
│   │   ├── attack.ts
│   │   ├── flee.ts
│   │   └── status.ts
│   │
│   └── rest/
│       └── rest.ts
│
└── utils/
    ├── dice.ts                      // Dice rolling utilities
    ├── modifiers.ts                 // Stat modifiers
    └── validation.ts                // Input validation
```

### 10.2 Module Organization

**CombatRegistry** (singleton):
- Maintains `combats` and `entityToCombat` maps
- Provides lookup functions: `getCombatForEntity()`, `getCombat()`
- Handles combat creation and cleanup

**CombatResolver**:
- Manages round progression
- Coordinates action execution
- Checks win/loss conditions

**XpSystem**:
- Calculates XP requirements and rewards
- Handles XP distribution after combat
- Triggers level-up checks

**LevelUpHandler**:
- Applies standard bonuses
- Invokes guild hooks
- Manages stat choice prompts

**NpcAI**:
- Processes aggro triggers
- Manages aggro lists
- Selects targets

**LeashSystem**:
- Monitors distance and time
- Triggers retreats
- Schedules healing

### 10.3 Event Hooks

```typescript
// Define event system for cross-module communication
interface GameEvents {
  'combat:started': (combat: Combat) => void;
  'combat:ended': (combat: Combat, victor?: Entity) => void;
  'combat:round': (combat: Combat) => void;

  'player:death': (player: Player, killer?: Entity) => void;
  'player:levelup': (player: Player, newLevel: number) => void;
  'player:xp_gained': (player: Player, amount: number) => void;

  'npc:death': (npc: NpcInstance, killers: Player[]) => void;
  'npc:respawn': (npc: NpcInstance) => void;
  'npc:leash': (npc: NpcInstance, reason: string) => void;

  'rest:started': (player: Player) => void;
  'rest:completed': (player: Player) => void;
  'rest:interrupted': (player: Player, reason: string) => void;
}

// Usage:
gameEvents.on('combat:started', (combat) => {
  // Interrupt rest for all participants
  for (const participant of combat.participants) {
    if (participant.entityType === 'player') {
      const player = getPlayer(participant.entityId);
      if (getRestState(player.id)) {
        interruptRest(player, 'combat');
      }
    }
  }
});

gameEvents.on('player:death', (player, killer) => {
  // Log to database
  logDeath(player, killer);

  // Update statistics
  updatePlayerStats(player, { deaths: +1 });

  if (killer?.type === 'player') {
    updatePlayerStats(killer as Player, { kills: +1 });
  }
});
```

### 10.4 Testing Strategy

**Unit Tests**:
- XP formula correctness
- Dice parsing and validation
- Attack roll calculations
- Advantage/disadvantage logic
- Damage calculation with resistances

**Integration Tests**:
- Full combat sequence from start to end
- Level-up triggers and bonuses
- Death and corpse creation
- Flee mechanics
- Leash behavior
- Rest system

**Example Test**:

```typescript
describe('Combat System', () => {
  it('should resolve a basic attack correctly', () => {
    const attacker = createTestPlayer({
      str: 14,
      proficiency: 2,
      currentWeapon: { name: 'Sword', damageDice: '1d6', damageType: 'physical' }
    });

    const defender = createTestNpc({
      level: 1,
      armorClass: 14,
      currentHp: 10
    });

    const combat = initiateCombat(attacker, defender);

    // Mock d20 roll to 15 (hit)
    mockD20Roll(15);
    mockDamageRoll(4);

    const result = resolveAttack(attacker, defender, combat);

    expect(result.hit).toBe(true);
    expect(result.total).toBe(15 + 2 + 2);  // 15 (roll) + 2 (STR mod) + 2 (prof)
    expect(defender.currentHp).toBe(6);     // 10 - 4 damage
  });

  it('should apply advantage correctly', () => {
    const attacker = createTestPlayer();
    const defender = createTestNpc();
    const combat = initiateCombat(attacker, defender);

    const participant = getParticipant(combat, attacker.id);
    grantAdvantage(participant, 'test', 1);

    mockD20Rolls([8, 15]);  // Should keep 15

    const roll = rollAttack('advantage');
    expect(roll.natural).toBe(15);
    expect(roll.rolls).toEqual([8, 15]);
  });
});
```

### 10.5 Performance Considerations

**Combat Registry Optimization**:
- Use `Map` instead of plain objects for frequent lookups
- Index by both entity ID and combat ID
- Cleanup dead combats immediately

**NPC Instance Management**:
- Limit total spawned instances (e.g., 1000 max)
- Despawn instances far from players
- Pool respawning instances instead of creating new ones

**Event Processing**:
- Batch combat round processing (all combats simultaneously)
- Use event queues to prevent blocking
- Rate-limit aggro checks

### 10.6 Configuration Management

```typescript
// config/combat.ts
export const CombatConfig = {
  // XP & Leveling
  xp: {
    baseFormula: (level: number) => Math.round(800 * Math.pow(level, 1.6)),
    mobRewardPercent: 0.12,
    lossPercents: {
      low: 0.05,      // L1-10
      mid: 0.03,      // L11-30
      high: 0.02      // L31+
    }
  },

  // Combat Mechanics
  combat: {
    baseHitChance: 0.60,
    criticalHit: 20,
    criticalMiss: 1,
    proficiencyProgression: [2, 3, 4, 5, 6, 7, 8, 9],  // Every 4 levels
    baseDamageDice: '1d4',
    roundTimeout: 30000  // 30s per round
  },

  // Death & Corpse
  death: {
    corpseDecayTime: 30 * 60 * 1000,      // 30 minutes
    remainsRetentionPercent: 0.5,
    ghostMovementSlowdown: 2.0,
    pvpLootWindow: 2 * 60 * 1000,         // 2 minutes
    defeatCooldown: 2 * 60 * 1000         // 2 minutes
  },

  // Rest
  rest: {
    duration: 10000,                       // 10 seconds
    damageBlockDuration: 60000,           // 60 seconds
    hpRestorePercent: 0.25,
    resourceRestorePercent: 0.25
  },

  // Flee
  flee: {
    cooldown: 10000,                      // 10 seconds
    opportunityAttackBonus: 0             // Free attack has no penalty
  },

  // NPC Behavior
  npc: {
    defaultLeashDistance: 5,
    defaultPursuitDuration: 30,           // 30 seconds
    healDelayAfterLeash: 10000,          // 10 seconds
    spawnProtection: 5000                // 5 seconds
  }
};
```

---

## Reference Configuration

### 11.1 Startup Parameters

```typescript
// Server startup configuration
const GAME_CONFIG = {
  // XP Progression
  xpFormula: (level: number) => Math.round(800 * Math.pow(level, 1.6)),

  // Target pacing (minutes)
  targetTimes: {
    L1_to_L2: 5,
    L2_to_L3: 15,
    L3_to_L4: 25,
    L4_to_L5: 45,
    totalToL5: 90
  },

  // Combat balance
  evenLevelHitRate: 0.60,
  targetRoundsPerFight: { min: 4, max: 6 },

  // Starting stats
  playerStartingStats: {
    level: 1,
    hp: 10,
    ac: 13,
    proficiency: 2,
    damageDice: '1d4'
  },

  npcStartingStats: {
    level: 1,
    hp: 8,
    ac: 14,
    proficiency: 2,
    damageDice: '1d6'
  },

  // Progression
  hpPerLevel: 5,
  statChoiceInterval: 4,  // Every 4 levels

  // Damage types
  damageTypes: [
    'physical',
    'fire',
    'ice',
    'lightning',
    'poison',
    'necrotic',
    'radiant',
    'psychic'
  ]
};
```

### 11.2 Example NPC Definitions

```typescript
const EXAMPLE_NPCS: NpcDefinition[] = [
  {
    id: 'goblin_scout',
    name: 'Goblin Scout',
    description: 'A small, green-skinned humanoid with beady eyes.',
    level: 1,
    maxHp: 8,
    armorClass: 14,
    str: 8,
    dex: 14,
    con: 10,
    int: 8,
    wis: 10,
    cha: 6,
    damageDice: '1d6',
    damageType: 'physical',
    proficiency: 2,
    resistances: {},
    vulnerabilities: [],
    aggressive: true,
    socialAggro: true,
    leashDistance: 5,
    pursuitDurationSec: 30,
    xpReward: 96,  // 0.12 * 800
    lootTable: [
      { itemId: 'rusty_dagger', chance: 0.3 },
      { itemId: 'copper_coin', chance: 1.0, quantity: { min: 1, max: 5 } }
    ],
    respawnDelay: 300,  // 5 minutes
    homeRoomId: 'goblin_camp_1'
  },

  {
    id: 'boss_ogre_chief',
    name: 'Ogre Chief',
    description: 'A massive ogre covered in crude armor and battle scars.',
    level: 5,
    maxHp: 45,
    armorClass: 16,
    str: 18,
    dex: 8,
    con: 16,
    int: 6,
    wis: 10,
    cha: 8,
    damageDice: '2d8+4',
    damageType: 'physical',
    proficiency: 3,
    resistances: { physical: 0.5 },  // 50% resistance
    vulnerabilities: ['fire'],
    aggressive: true,
    socialAggro: false,  // Boss fights are solo
    leashDistance: 0,     // Cannot leave boss room
    pursuitDurationSec: 999999,
    xpReward: 1065,  // 0.12 * 8871
    lootTable: [
      { itemId: 'ogre_greatclub', chance: 1.0 },
      { itemId: 'boss_chest_key', chance: 1.0 },
      { itemId: 'gold_coin', chance: 1.0, quantity: { min: 10, max: 20 } }
    ],
    respawnDelay: 3600,  // 1 hour
    homeRoomId: 'ogre_throne_room'
  }
];
```

### 11.3 Default Player Initialization

```typescript
function createNewPlayer(name: string): Player {
  return {
    id: generateId(),
    name,

    // Core Stats
    level: 1,
    currentXp: 0,
    maxHp: 10,
    currentHp: 10,
    resource: 100,
    maxResource: 100,

    // Base Attributes (point-buy or roll)
    str: 10,
    dex: 12,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,

    // Derived
    proficiency: 2,
    armorClass: 11,  // 10 + 1 (DEX mod)

    // Equipment
    equippedWeapon: undefined,
    equippedArmor: undefined,
    inventory: [],

    // Default weapon
    currentWeapon: {
      name: 'Fists',
      damageDice: '1d4',
      damageType: 'physical'
    },

    // Guild
    guildId: undefined,
    guildRank: 0,

    // Status
    isGhost: false,
    isDead: false,
    lastDamageTaken: 0,
    lastDefeatedBy: new Set(),

    // Location
    roomId: 'starting_room',

    // Cooldowns
    pvpCooldownUntil: undefined,
    fleeCooldownUntil: undefined
  };
}
```

---

## Conclusion

This architecture provides a complete foundation for a D20-based MUD combat system with integrated XP progression, death mechanics, NPC AI, and PvP support. The modular design allows for easy extension through guild hooks, status effects, and custom abilities while maintaining balanced gameplay through formula-driven progression.

Key implementation priorities:
1. Combat Registry and basic attack resolution
2. XP system and level-up mechanics
3. NPC instance system and aggro
4. Death, corpse, and ghost mechanics
5. Leash and flee systems
6. Rest and regeneration
7. PvP rules and looting

All systems are designed to work together seamlessly while remaining independently testable and maintainable.
