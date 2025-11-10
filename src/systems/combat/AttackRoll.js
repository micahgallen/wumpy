/**
 * Attack Roll System
 *
 * Handles D20 attack rolls with advantage/disadvantage
 * Implements D&D 5e combat resolution mechanics
 */

const { rollAttack } = require('../../utils/dice');
const {
  getModifier,
  calculateNetAdvantage,
  isCriticalHit,
  isCriticalMiss,
  isHit
} = require('../../utils/modifiers');
const { createAttackResult } = require('../../data/Combat');
const EquipmentManager = require('../equipment/EquipmentManager');
const { ItemType } = require('../../items/schemas/ItemTypes');

/**
 * Resolve a complete attack roll
 * @param {Object} attacker - Attacking entity
 * @param {Object} defender - Defending entity
 * @param {Object} attackerParticipant - Attacker's combat participant data
 * @param {Object} defenderParticipant - Defender's combat participant data (unused but kept for future features)
 * @returns {Object} Attack result with hit/miss/critical info
 */
function resolveAttackRoll(attacker, defender, attackerParticipant, defenderParticipant = null) {
  // 1. Determine advantage/disadvantage
  const advantageType = calculateNetAdvantage(
    attackerParticipant.advantageCount,
    attackerParticipant.disadvantageCount
  );

  // 2. Roll d20 with advantage/disadvantage
  const attackRoll = rollAttack(advantageType);
  const naturalRoll = attackRoll.natural;

  // 3. Get equipped weapon and calculate attack bonus
  const weapon = EquipmentManager.getEquippedInSlot(attacker, 'main_hand');

  // Determine ability modifier (finesse weapons can use DEX or STR)
  let abilityModifier;
  if (weapon?.weaponProperties?.isFinesse) {
    // Finesse: use higher of STR or DEX
    const strMod = getModifier(attacker.str);
    const dexMod = getModifier(attacker.dex);
    abilityModifier = Math.max(strMod, dexMod);
  } else if (weapon?.weaponProperties?.isRanged) {
    // Ranged: always DEX
    abilityModifier = getModifier(attacker.dex);
  } else {
    // Melee or unarmed: STR
    abilityModifier = getModifier(attacker.str);
  }

  // Check weapon proficiency and apply penalty if not proficient
  const profCheck = weapon
    ? EquipmentManager.checkProficiency(attacker, weapon)
    : { isProficient: true, penalty: 0 };

  let proficiencyBonus = attacker.proficiency;
  if (!profCheck.isProficient) {
    proficiencyBonus += profCheck.penalty; // penalty is negative (e.g., -4)
  }

  // Get weapon magical attack bonus
  const weaponAttackBonus = weapon?.weaponProperties?.magicalAttackBonus || 0;

  // Total attack bonus: ability modifier + proficiency (with penalty if not proficient) + weapon bonus
  const attackBonus = abilityModifier + proficiencyBonus + weaponAttackBonus;
  const totalAttack = naturalRoll + attackBonus;

  // 4. Check for critical miss (natural 1)
  if (isCriticalMiss(naturalRoll)) {
    return createAttackResult(
      false,  // hit
      false,  // critical
      true,   // fumble
      attackRoll.rolls,
      totalAttack,
      0       // damage
    );
  }

  // 5. Check for critical hit (natural 20)
  if (isCriticalHit(naturalRoll)) {
    return createAttackResult(
      true,   // hit
      true,   // critical
      false,  // fumble
      attackRoll.rolls,
      totalAttack,
      0       // damage calculated separately
    );
  }

  // 6. Normal hit/miss check
  const hit = isHit(totalAttack, defender.armorClass);

  return createAttackResult(
    hit,
    false,  // critical
    false,  // fumble
    attackRoll.rolls,
    totalAttack,
    0       // damage calculated separately
  );
}

/**
 * Grant advantage to a participant
 * @param {Object} participant - Combat participant
 * @param {string} source - Source of advantage
 * @param {number} durationRounds - How long it lasts
 */
function grantAdvantage(participant, source, durationRounds = 1) {
  participant.advantageCount++;

  const { createStatusEffect } = require('../../data/Combat');
  participant.effects.push(
    createStatusEffect(
      `advantage_${source}`,
      durationRounds,
      source,
      { grantAdvantage: true }
    )
  );
}

/**
 * Grant disadvantage to a participant
 * @param {Object} participant - Combat participant
 * @param {string} source - Source of disadvantage
 * @param {number} durationRounds - How long it lasts
 */
function grantDisadvantage(participant, source, durationRounds = 1) {
  participant.disadvantageCount++;

  const { createStatusEffect } = require('../../data/Combat');
  participant.effects.push(
    createStatusEffect(
      `disadvantage_${source}`,
      durationRounds,
      source,
      { grantDisadvantage: true }
    )
  );
}

/**
 * Remove expired status effects and update advantage/disadvantage counts
 * @param {Object} participant - Combat participant
 */
function tickStatusEffects(participant) {
  let removedAdvantages = 0;
  let removedDisadvantages = 0;

  // Decrement duration and filter out expired effects
  participant.effects = participant.effects.filter(effect => {
    effect.durationRounds--;

    if (effect.durationRounds <= 0) {
      // Effect expired
      if (effect.grantAdvantage) {
        removedAdvantages++;
      }
      if (effect.grantDisadvantage) {
        removedDisadvantages++;
      }
      return false; // Remove this effect
    }

    return true; // Keep this effect
  });

  // Update counts
  participant.advantageCount -= removedAdvantages;
  participant.disadvantageCount -= removedDisadvantages;

  // Ensure counts don't go negative (safety check)
  participant.advantageCount = Math.max(0, participant.advantageCount);
  participant.disadvantageCount = Math.max(0, participant.disadvantageCount);
}

/**
 * Format attack message for display
 * @param {Object} attacker - Attacking entity
 * @param {Object} defender - Defending entity
 * @param {Object} result - Attack result
 * @returns {string} Formatted message
 */
function formatAttackMessage(attacker, defender, result) {
  // Use capname for players, name for NPCs
  const attackerName = attacker.getDisplayName ? attacker.getDisplayName() : attacker.name;

  let msg = '';

  // Show dice rolls
  if (result.rolls.length > 1) {
    const advType = result.rolls[0] === result.natural ? 'advantage' : 'disadvantage';
    msg += `${attackerName} attacks with ${advType}! `;
    msg += `[Rolls: ${result.rolls.join(', ')}] `;
  } else {
    msg += `${attackerName} rolls [${result.rolls[0]}] `;
  }

  msg += `(total: ${result.total}) vs AC ${defender.armorClass}\n`;

  if (result.fumble) {
    msg += `CRITICAL MISS! ${attackerName} stumbles badly!`;
  } else if (result.critical) {
    msg += `CRITICAL HIT! `;
  } else if (result.hit) {
    msg += `Hit! `;
  } else {
    msg += `Miss!`;
  }

  return msg;
}

module.exports = {
  resolveAttackRoll,
  grantAdvantage,
  grantDisadvantage,
  tickStatusEffects,
  formatAttackMessage
};
