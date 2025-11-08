/**
 * Magic Effect Processor
 *
 * Handles magical effects from equipped items that trigger during combat.
 * Implements D&D 5e-style triggered effects (on_hit, on_attack, start_of_turn, etc.)
 *
 * Phase 4: Combat-Item Integration
 */

const { rollDice } = require('../../utils/dice');
const logger = require('../../logger');

class MagicEffectProcessor {
  /**
   * Process magical effects that trigger on hit
   * D&D 5e: Extra damage from magical weapons is rolled separately and added to total
   *
   * @param {Object} attacker - Attacking character
   * @param {Object} target - Target character
   * @param {Object} attackResult - Attack roll result (hit, critical, etc.)
   * @param {Object} combat - Combat encounter instance (optional, for messages)
   * @returns {Object} { totalExtraDamage, effects: [...], messages: [...] }
   */
  static processOnHitEffects(attacker, target, attackResult, combat = null) {
    let totalExtraDamage = 0;
    const appliedEffects = [];
    const messages = [];

    const effects = this.getEquippedEffects(attacker, 'on_hit');

    for (const { item, effect } of effects) {
      if (effect.type === 'extra_damage') {
        // Roll extra damage dice (e.g., flaming sword adds 1d6 fire)
        let extraDamage = rollDice(effect.damageDice);

        // D&D 5e: Critical hits double ALL damage dice, including magical effects
        if (attackResult.critical) {
          extraDamage += rollDice(effect.damageDice);
        }

        totalExtraDamage += extraDamage;

        // Create flavor message
        const attackerName = attacker.username || attacker.name;
        const message = effect.message
          ? effect.message.replace('{{attacker.name}}', attackerName)
          : `${attackerName}'s ${item.name} unleashes ${effect.damageType} energy`;

        messages.push(`${message}! (+${extraDamage} ${effect.damageType} damage)`);

        appliedEffects.push({
          item: item.name,
          type: effect.type,
          damage: extraDamage,
          damageType: effect.damageType
        });
      }
    }

    return { totalExtraDamage, effects: appliedEffects, messages };
  }

  /**
   * Process effects that trigger at start of turn
   * Examples: Regeneration, auras, passive healing
   *
   * @param {Object} character - Character starting their turn
   * @param {Object} combat - Combat encounter instance (optional)
   * @returns {Object} { effects: [...], messages: [...] }
   */
  static processStartOfTurnEffects(character, combat = null) {
    const appliedEffects = [];
    const messages = [];
    const effects = this.getEquippedEffects(character, 'start_of_turn');

    for (const { item, effect } of effects) {
      if (effect.type === 'passive_heal') {
        const healAmount = effect.amount || 1;

        // Check if effect only works in combat
        const isActive = combat ? combat.isActive : true;
        if (!effect.inCombatOnly || isActive) {
          const oldHp = character.currentHp;
          character.currentHp = Math.min(
            character.currentHp + healAmount,
            character.maxHp
          );

          const actualHeal = character.currentHp - oldHp;

          if (actualHeal > 0) {
            const charName = character.username || character.name;
            const message = effect.message
              ? effect.message.replace('{{character.name}}', charName)
              : `${charName}'s ${item.name} restores vitality`;

            messages.push(`${message}. (+${actualHeal} HP)`);

            appliedEffects.push({
              item: item.name,
              type: effect.type,
              healing: actualHeal
            });
          }
        }
      }
    }

    return { effects: appliedEffects, messages };
  }

  /**
   * Process effects that trigger on attack (before hit/miss is determined)
   * Examples: Bonus to attack rolls, re-roll abilities
   *
   * @param {Object} attacker - Attacking character
   * @param {Object} target - Target character
   * @param {Object} combat - Combat encounter instance
   * @returns {Object} { attackBonus, effects: [...] }
   */
  static processOnAttackEffects(attacker, target, combat) {
    let totalAttackBonus = 0;
    const appliedEffects = [];
    const effects = this.getEquippedEffects(attacker, 'on_attack');

    for (const { item, effect } of effects) {
      if (effect.type === 'attack_bonus') {
        // Conditional attack bonus (e.g., +2 vs undead)
        if (this.checkCondition(effect.condition, target)) {
          totalAttackBonus += effect.bonus;

          appliedEffects.push({
            item: item.name,
            type: effect.type,
            bonus: effect.bonus,
            condition: effect.condition
          });
        }
      }
    }

    return { attackBonus: totalAttackBonus, effects: appliedEffects };
  }

  /**
   * Process effects that trigger on miss
   * Examples: Reroll chance, consolation damage
   *
   * @param {Object} attacker - Attacking character
   * @param {Object} target - Target character
   * @param {Object} combat - Combat encounter instance
   * @returns {Object} { effects: [...] }
   */
  static processOnMissEffects(attacker, target, combat) {
    // Future implementation: reroll abilities, etc.
    return { effects: [] };
  }

  /**
   * Process effects at end of turn
   * Examples: Damage over time, buff expiration
   *
   * @param {Object} character - Character ending their turn
   * @param {Object} combat - Combat encounter instance
   * @returns {Object} { effects: [...] }
   */
  static processEndOfTurnEffects(character, combat) {
    // Future implementation: DoT, debuffs, etc.
    return { effects: [] };
  }

  /**
   * Get all equipped items with effects matching a trigger
   *
   * @param {Object} player - Player character
   * @param {String} trigger - Trigger type ('on_hit', 'on_attack', 'start_of_turn', etc.)
   * @returns {Array} Array of { item, effect } objects
   */
  static getEquippedEffects(player, trigger) {
    const results = [];

    if (!player.inventory) {
      return results;
    }

    for (const item of player.inventory) {
      if (item.isEquipped && item.magicEffects) {
        for (const effect of item.magicEffects) {
          if (effect.trigger === trigger) {
            results.push({ item, effect });
          }
        }
      }
    }

    return results;
  }

  /**
   * Check if a condition is met for a magical effect
   *
   * @param {String} condition - Condition to check (e.g., 'target.type === "undead"')
   * @param {Object} target - Target entity
   * @returns {Boolean} True if condition is met
   */
  static checkCondition(condition, target) {
    if (!condition) {
      return true; // No condition = always active
    }

    // Simple condition checking (can be expanded)
    if (condition === 'vs_undead') {
      return target.type === 'undead' || target.race === 'undead';
    }

    if (condition === 'vs_fiend') {
      return target.type === 'fiend' || target.race === 'fiend';
    }

    if (condition === 'vs_dragon') {
      return target.type === 'dragon' || target.race === 'dragon';
    }

    // Default: condition not met
    return false;
  }

  /**
   * Get summary of all active magical effects on a character
   *
   * @param {Object} character - Character to check
   * @returns {Array} Array of effect summaries
   */
  static getActiveEffectsSummary(character) {
    const summary = [];

    if (!character.inventory) {
      return summary;
    }

    for (const item of character.inventory) {
      if (item.isEquipped && item.magicEffects && item.magicEffects.length > 0) {
        summary.push({
          item: item.name,
          effects: item.magicEffects.map(e => ({
            type: e.type,
            trigger: e.trigger,
            description: e.description || this.getEffectDescription(e)
          }))
        });
      }
    }

    return summary;
  }

  /**
   * Generate a human-readable description for an effect
   *
   * @param {Object} effect - Effect object
   * @returns {String} Description
   */
  static getEffectDescription(effect) {
    if (effect.type === 'extra_damage') {
      return `Deals ${effect.damageDice} ${effect.damageType} damage on hit`;
    }

    if (effect.type === 'passive_heal') {
      return `Restores ${effect.amount} HP at start of turn`;
    }

    if (effect.type === 'attack_bonus') {
      const condition = effect.condition ? ` ${effect.condition}` : '';
      return `+${effect.bonus} to attack${condition}`;
    }

    return `${effect.type} (${effect.trigger})`;
  }
}

module.exports = MagicEffectProcessor;
