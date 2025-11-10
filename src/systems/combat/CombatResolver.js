/**
 * Combat Resolver
 *
 * Manages combat round processing, action resolution, and combat flow
 * Coordinates between attack rolls, damage calculation, and combat state
 * Phase 2: Integrated with XP distribution and level-up system
 */

const CombatRegistry = require('./CombatRegistry');
const { resolveAttackRoll, formatAttackMessage, tickStatusEffects } = require('./AttackRoll');
const { resolveAttackDamage, resolveOffHandDamage, formatDamageMessage } = require('./DamageCalculator');
const { isAlive } = require('../../data/CombatStats');
const { rollD20 } = require('../../utils/dice');
const { getModifier } = require('../../utils/modifiers');
const EquipmentManager = require('../equipment/EquipmentManager');
const MagicEffectProcessor = require('../equipment/MagicEffectProcessor');
const { ItemType } = require('../../items/schemas/ItemTypes');

// Phase 2: XP and Leveling imports
const { recordDamageDealt, initializeDamageTracking } = require('../progression/XpDistribution');
const { distributeNpcXp, formatXpAwardMessage } = require('../progression/XpDistribution');
const { checkAndApplyLevelUp, formatLevelUpSummary } = require('../progression/LevelUpHandler');
const { getPlayerGuildHook } = require('../progression/GuildHooks');

/**
 * Resolve a complete attack from attacker to defender
 * Phase 2: Now records damage dealt for XP distribution
 * Phase 4: Now processes magical effects (on_hit triggers)
 *
 * @param {Object} attacker - Attacking entity
 * @param {Object} defender - Defending entity
 * @param {Object} combat - Combat instance
 * @returns {Object} Complete attack result
 */
function resolveAttack(attacker, defender, combat) {
  const attackerParticipant = CombatRegistry.getParticipant(combat.id, attacker.id);
  const defenderParticipant = CombatRegistry.getParticipant(combat.id, defender.id);

  if (!attackerParticipant || !defenderParticipant) {
    console.error('Missing participant data in combat');
    return null;
  }

  // 1. Roll attack
  const attackResult = resolveAttackRoll(attacker, defender, attackerParticipant, defenderParticipant);

  // 2. Calculate and apply base damage
  const fullResult = resolveAttackDamage(attacker, defender, attackResult);

  // 3. Process magical on-hit effects (Phase 4)
  if (fullResult.hit && attacker.inventory) {
    const magicEffects = MagicEffectProcessor.processOnHitEffects(
      attacker,
      defender,
      attackResult,
      combat
    );

    // Add magical extra damage to total
    if (magicEffects.totalExtraDamage > 0) {
      fullResult.damage += magicEffects.totalExtraDamage;

      // Apply extra damage to target
      const previousHp = defender.currentHp;
      defender.currentHp = Math.max(0, defender.currentHp - magicEffects.totalExtraDamage);

      // Update damage breakdown
      if (fullResult.damageBreakdown) {
        fullResult.damageBreakdown.magicEffectDamage = magicEffects.totalExtraDamage;
        fullResult.damageBreakdown.finalDamage = fullResult.damage;
      }

      // Check if magical damage killed target
      if (defender.currentHp <= 0 && previousHp > 0) {
        fullResult.targetDied = true;
      }
    }

    // Store magic effects in result (includes messages to broadcast later)
    fullResult.magicEffects = magicEffects.effects;
    fullResult.magicEffectMessages = magicEffects.messages;
  }

  // 4. Record total damage dealt for XP distribution (Phase 2)
  if (fullResult.hit && fullResult.damage > 0) {
    recordDamageDealt(combat, attacker.id, fullResult.damage);
  }

  return fullResult;
}

/**
 * Roll initiative for all participants
 * @param {Array<Object>} participants - Combat participants
 * @param {Function} getEntityFn - Function to retrieve entity by ID
 * @returns {Array<Object>} Participants sorted by initiative (highest first)
 */
function rollInitiative(participants, getEntityFn) {
  const initiativeRolls = participants.map(participant => {
    const entity = getEntityFn(participant.entityId);
    if (!entity) {
      console.error(`Entity not found for participant: ${participant.entityId}`);
      return {
        participant: participant,
        initiative: 0
      };
    }

    const initiativeBonus = getModifier(entity.dex);
    const roll = rollD20() + initiativeBonus;

    return {
      participant: participant,
      initiative: roll
    };
  });

  // Sort by initiative (highest first)
  initiativeRolls.sort((a, b) => b.initiative - a.initiative);

  return initiativeRolls.map(entry => entry.participant);
}

/**
 * Process a single combat round
 * @param {Object} combat - Combat instance
 * @param {Function} getEntityFn - Function to retrieve entity by ID
 * @param {Function} messageFn - Function to send messages (entityId, message)
 * @returns {Object} Round results
 */
function processCombatRound(combat, getEntityFn, messageFn) {
  if (!combat.isActive) {
    return { ended: true, reason: 'Combat already ended' };
  }

  combat.currentTurn++;

  const results = {
    turn: combat.currentTurn,
    actions: [],
    deaths: [],
    ended: false
  };

  // 1. Roll initiative for this round
  const initiativeOrder = rollInitiative(combat.participants, getEntityFn);

  // 2. Process actions in initiative order
  for (const participant of initiativeOrder) {
    const attacker = getEntityFn(participant.entityId);

    if (!attacker || !isAlive(attacker)) {
      continue; // Skip dead or missing entities
    }

    // Process start-of-turn magical effects (Phase 4)
    if (attacker.inventory) {
      const startEffects = MagicEffectProcessor.processStartOfTurnEffects(attacker, combat);
      // Broadcast start-of-turn effect messages
      for (const message of startEffects.messages) {
        broadcastToCombat(combat, message, messageFn, getEntityFn);
      }
    }

    // Find a valid target (first alive opponent)
    const target = findTarget(participant, combat.participants, getEntityFn);

    if (!target) {
      continue; // No valid targets
    }

    // Execute main hand attack
    const attackResult = resolveAttack(attacker, target, combat);

    if (attackResult) {
      results.actions.push({
        attackerId: attacker.id,
        targetId: target.id,
        result: attackResult
      });

      // Send messages about the attack
      const attackMsg = formatAttackMessage(attacker, target, attackResult);
      broadcastToCombat(combat, attackMsg, messageFn, getEntityFn);

      // Send damage message if hit
      if (attackResult.hit && attackResult.damage > 0) {
        const damageMsg = formatDamageMessage(target, attackResult.damageBreakdown);
        broadcastToCombat(combat, damageMsg, messageFn, getEntityFn);
      }

      // Broadcast magic effect messages (Phase 4)
      if (attackResult.magicEffectMessages) {
        for (const message of attackResult.magicEffectMessages) {
          broadcastToCombat(combat, message, messageFn, getEntityFn);
        }
      }

      // Check for death
      if (attackResult.targetDied) {
        results.deaths.push(target.id);
        // Use capname for players, name for NPCs
        const targetName = target.getDisplayName ? target.getDisplayName() : target.name;
        const deathMsg = `${targetName} has been defeated!`;
        broadcastToCombat(combat, deathMsg, messageFn, getEntityFn);
      }
    }

    // D&D 5e: Dual-Wielding - Check for off-hand attack
    // Both weapons must be light, attack uses bonus action
    if (isAlive(target)) {
      const mainWeapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');
      const offHandWeapon = EquipmentManager.getEquippedInSlot(attacker, 'off_hand');

      // Check if dual-wielding light weapons
      if (offHandWeapon &&
          offHandWeapon.itemType === ItemType.WEAPON &&
          mainWeapon?.weaponProperties?.isLight &&
          offHandWeapon.weaponProperties.isLight) {

        // Broadcast off-hand attack
        // Use capname for players, name for NPCs
        const attackerName = attacker.getDisplayName ? attacker.getDisplayName() : attacker.name;
        const weaponName = offHandWeapon.name || 'weapon';
        broadcastToCombat(combat, `${attackerName} strikes with their off-hand ${weaponName}!`, messageFn, getEntityFn);

        // Roll off-hand attack (uses same attack bonus as main hand)
        const attackerParticipant = CombatRegistry.getParticipant(combat.id, attacker.id);
        const defenderParticipant = CombatRegistry.getParticipant(combat.id, target.id);

        const offHandAttackRoll = resolveAttackRoll(attacker, target, attackerParticipant, defenderParticipant);

        // Resolve off-hand damage (no ability modifier per D&D 5e)
        const offHandResult = resolveOffHandDamage(attacker, target, offHandAttackRoll, offHandWeapon);

        if (offHandResult) {
          results.actions.push({
            attackerId: attacker.id,
            targetId: target.id,
            result: offHandResult,
            isOffHand: true
          });

          // Send off-hand attack message
          const offHandAttackMsg = formatAttackMessage(attacker, target, offHandResult);
          broadcastToCombat(combat, offHandAttackMsg, messageFn, getEntityFn);

          // Send damage message if hit
          if (offHandResult.hit && offHandResult.damage > 0) {
            const damageMsg = formatDamageMessage(target, offHandResult.damageBreakdown);
            broadcastToCombat(combat, damageMsg, messageFn, getEntityFn);

            // Record off-hand damage for XP
            recordDamageDealt(combat, attacker.id, offHandResult.damage);
          }

          // Check for death from off-hand attack
          if (offHandResult.targetDied) {
            results.deaths.push(target.id);
            // Use capname for players, name for NPCs
            const targetName = target.getDisplayName ? target.getDisplayName() : target.name;
            const deathMsg = `${targetName} has been defeated!`;
            broadcastToCombat(combat, deathMsg, messageFn, getEntityFn);
          }
        }
      }
    }
  }

  // 3. Tick status effects
  for (const participant of combat.participants) {
    tickStatusEffects(participant);
  }

  // 4. Check if combat should end
  if (shouldEndCombat(combat, getEntityFn)) {
    results.ended = true;
    results.reason = determineEndReason(combat, getEntityFn);
  }

  return results;
}

/**
 * Find a valid target for an entity
 * @param {Object} attackerParticipant - Attacker's participant data
 * @param {Array<Object>} allParticipants - All combat participants
 * @param {Function} getEntityFn - Function to retrieve entity by ID
 * @returns {Object|null} Target entity or null
 */
function findTarget(attackerParticipant, allParticipants, getEntityFn) {
  // Find first alive opponent (different entity type)
  for (const participant of allParticipants) {
    if (participant.entityId === attackerParticipant.entityId) {
      continue; // Skip self
    }

    const entity = getEntityFn(participant.entityId);
    if (entity && isAlive(entity)) {
      return entity;
    }
  }

  return null;
}

/**
 * Check if combat should end
 * @param {Object} combat - Combat instance
 * @param {Function} getEntityFn - Function to retrieve entity by ID
 * @returns {boolean} True if combat should end
 */
function shouldEndCombat(combat, getEntityFn) {
  const aliveParticipants = combat.participants.filter(p => {
    const entity = getEntityFn(p.entityId);
    return entity && isAlive(entity);
  });

  // End if one or fewer participants remain alive
  return aliveParticipants.length <= 1;
}

/**
 * Determine why combat ended
 * @param {Object} combat - Combat instance
 * @param {Function} getEntityFn - Function to retrieve entity by ID
 * @returns {string} End reason
 */
function determineEndReason(combat, getEntityFn) {
  const aliveParticipants = combat.participants.filter(p => {
    const entity = getEntityFn(p.entityId);
    return entity && isAlive(entity);
  });

  if (aliveParticipants.length === 0) {
    return 'mutual_destruction';
  } else if (aliveParticipants.length === 1) {
    const winner = getEntityFn(aliveParticipants[0].entityId);
    return `victory_${winner.username || winner.name}`;
  } else {
    return 'unknown';
  }
}

/**
 * Broadcast a message to all participants in combat
 * @param {Object} combat - Combat instance
 * @param {string} message - Message to broadcast
 * @param {Function} messageFn - Function to send messages (entityId, message)
 * @param {Function} getEntityFn - Function to retrieve entity by ID
 */
function broadcastToCombat(combat, message, messageFn, getEntityFn) {
  for (const participant of combat.participants) {
    const entity = getEntityFn(participant.entityId);
    if (entity && participant.entityType === 'player') {
      messageFn(participant.entityId, message + '\n');
    }
  }
}

/**
 * End combat and clean up
 * Phase 2: Now awards XP and processes level-ups
 *
 * @param {Object} combat - Combat instance
 * @param {Function} getEntityFn - Function to retrieve entity by ID
 * @param {Function} messageFn - Function to send messages
 * @param {Function} broadcastRoomFn - Function to broadcast to room (optional)
 * @returns {Object} Combat end results including XP awards
 */
function endCombat(combat, getEntityFn, messageFn, broadcastRoomFn = null) {
  const reason = determineEndReason(combat, getEntityFn);

  // Broadcast end message
  let endMessage = 'Combat has ended.';
  if (reason.startsWith('victory_')) {
    const winnerName = reason.replace('victory_', '');
    endMessage = `${winnerName} is victorious!`;
  } else if (reason === 'mutual_destruction') {
    endMessage = 'The battle ends in mutual destruction!';
  }

  broadcastToCombat(combat, endMessage, messageFn, getEntityFn);

  // Phase 2: Award XP if NPC was defeated
  const xpResults = processXpAwards(combat, getEntityFn, messageFn, broadcastRoomFn);

  // Clean up combat in registry
  CombatRegistry.endCombat(combat.id);

  return {
    reason,
    xpAwarded: xpResults.awarded,
    xpResults
  };
}

/**
 * Process XP awards at combat end (Phase 2)
 * Awards XP to eligible players and processes level-ups
 *
 * @param {Object} combat - Combat instance
 * @param {Function} getEntityFn - Function to get entity by ID
 * @param {Function} messageFn - Function to send messages to players
 * @param {Function} broadcastRoomFn - Function to broadcast to room (optional)
 * @returns {Object} XP award results
 */
function processXpAwards(combat, getEntityFn, messageFn, broadcastRoomFn) {
  // Find defeated NPC (if any)
  const defeatedNpc = findDefeatedNpc(combat, getEntityFn);

  if (!defeatedNpc) {
    // No NPC defeated (PvP or other scenario)
    return {
      awarded: false,
      reason: 'No NPC defeated'
    };
  }

  // Distribute XP
  const distribution = distributeNpcXp(combat, defeatedNpc, defeatedNpc.level, getEntityFn);

  if (!distribution.awarded) {
    return distribution;
  }

  // Process each player's XP award
  const levelUpResults = [];

  for (const result of distribution.results) {
    const player = getEntityFn(result.playerId);

    if (!player) {
      continue;
    }

    // Send XP award message
    const xpMsg = formatXpAwardMessage(result);
    if (messageFn) {
      messageFn(player.id, xpMsg);
    }

    // Check for level-up
    const guildHook = getPlayerGuildHook(player);
    const levelUpResult = checkAndApplyLevelUp(player, {
      guildHook,
      messageFn,
      broadcastFn: broadcastRoomFn
    });

    if (levelUpResult.leveledUp) {
      levelUpResults.push({
        playerId: player.id,
        playerName: player.username || player.name,
        ...levelUpResult
      });

      // Send level-up summary
      const summary = formatLevelUpSummary(levelUpResult);
      if (messageFn) {
        messageFn(player.id, summary);
      }
    }

    // Mark result with level-up status
    result.leveledUp = levelUpResult.leveledUp;
    result.newLevel = player.level;
  }

  return {
    ...distribution,
    levelUps: levelUpResults
  };
}

/**
 * Find the defeated NPC in combat (Phase 2 helper)
 * @param {Object} combat - Combat instance
 * @param {Function} getEntityFn - Function to get entity by ID
 * @returns {Object|null} Defeated NPC or null
 */
function findDefeatedNpc(combat, getEntityFn) {
  for (const participant of combat.participants) {
    if (participant.entityType === 'npc') {
      const entity = getEntityFn(participant.entityId);
      if (entity && !isAlive(entity)) {
        return entity;
      }
    }
  }

  return null;
}

module.exports = {
  resolveAttack,
  rollInitiative,
  processCombatRound,
  findTarget,
  shouldEndCombat,
  determineEndReason,
  broadcastToCombat,
  endCombat,
  // Phase 2 additions
  processXpAwards,
  findDefeatedNpc
};
