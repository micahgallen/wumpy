/**
 * Weapon Mixin
 *
 * Provides weapon-specific functionality and behavior.
 * Applied to items with itemType === 'weapon'.
 */

const { rollDice } = require('../../utils/dice');
const { DamageType } = require('../schemas/ItemTypes');

const WeaponMixin = {
  /**
   * Roll weapon damage
   * @param {boolean} isCritical - Whether this is a critical hit
   * @param {boolean} isVersatile - Whether versatile damage should be used (two-handed)
   * @returns {number} Damage amount
   */
  rollDamage(isCritical = false, isVersatile = false) {
    if (!this.weaponProperties) {
      return 0;
    }

    let damageDice = this.weaponProperties.damageDice;

    // Use versatile damage if applicable
    if (isVersatile && this.weaponProperties.isVersatile && this.weaponProperties.versatileDamageDice) {
      damageDice = this.weaponProperties.versatileDamageDice;
    }

    // Parse and roll base damage
    const parsed = require('../../utils/dice').parseDiceString(damageDice);
    if (!parsed) {
      return 1;
    }

    let total = 0;
    const rollCount = isCritical ? parsed.count * 2 : parsed.count;

    for (let i = 0; i < rollCount; i++) {
      total += require('../../utils/dice').rollDie(parsed.sides);
    }

    total += parsed.modifier;

    // Add weapon damage bonus if present
    if (this.weaponProperties.damageBonus) {
      total += this.weaponProperties.damageBonus;
    }

    // Add magical bonus damage
    if (this.isIdentified && this.weaponProperties.magicalProperties) {
      for (const prop of this.weaponProperties.magicalProperties) {
        if (prop.type === 'damage_bonus') {
          total += prop.value;
        } else if (prop.type === 'extra_damage') {
          // Extra damage (e.g., "+1d6 fire")
          total += rollDice(prop.value);
        }
      }
    }

    return Math.max(1, total);  // Minimum 1 damage
  },

  /**
   * Get attack bonus for this weapon
   * @param {boolean} isProficient - Whether wielder is proficient
   * @returns {number} Attack bonus
   */
  getAttackBonus(isProficient = true) {
    if (!this.weaponProperties) {
      return 0;
    }

    let bonus = this.weaponProperties.attackBonus || 0;

    // Add magical attack bonus if identified
    if (this.isIdentified && this.weaponProperties.magicalProperties) {
      for (const prop of this.weaponProperties.magicalProperties) {
        if (prop.type === 'attack_bonus') {
          bonus += prop.value;
        }
      }
    }

    // Apply proficiency penalty if not proficient
    if (!isProficient) {
      const config = require('../../config/itemsConfig');
      bonus += config.proficiency.weaponPenalty;
    }

    return bonus;
  },

  /**
   * Get critical hit range for this weapon
   * @returns {number} Minimum roll for critical (default 20)
   */
  getCriticalRange() {
    if (!this.weaponProperties) {
      return 20;
    }

    let range = this.weaponProperties.criticalRange || 20;

    // Check for critical improvement properties
    if (this.isIdentified && this.weaponProperties.magicalProperties) {
      for (const prop of this.weaponProperties.magicalProperties) {
        if (prop.type === 'critical_improvement') {
          range = Math.min(range, prop.value);
        }
      }
    }

    return range;
  },

  /**
   * Check if this weapon is finesse (can use DEX instead of STR)
   * @returns {boolean} True if finesse weapon
   */
  isFinesse() {
    return this.weaponProperties && this.weaponProperties.isFinesse === true;
  },

  /**
   * Check if this weapon is light (can be dual-wielded)
   * @returns {boolean} True if light weapon
   */
  isLight() {
    return this.weaponProperties && this.weaponProperties.isLight === true;
  },

  /**
   * Check if this weapon is two-handed
   * @returns {boolean} True if two-handed
   */
  isTwoHanded() {
    return this.weaponProperties && this.weaponProperties.isTwoHanded === true;
  },

  /**
   * Check if this weapon is versatile (can be used one or two-handed)
   * @returns {boolean} True if versatile
   */
  isVersatile() {
    return this.weaponProperties && this.weaponProperties.isVersatile === true;
  },

  /**
   * Check if this weapon is ranged
   * @returns {boolean} True if ranged weapon
   */
  isRanged() {
    return this.weaponProperties && this.weaponProperties.isRanged === true;
  },

  /**
   * Get damage type for this weapon
   * @returns {string} Damage type (physical, fire, etc.)
   */
  getDamageType() {
    if (!this.weaponProperties) {
      return DamageType.PHYSICAL;
    }
    return this.weaponProperties.damageType || DamageType.PHYSICAL;
  },

  /**
   * Get weapon class for proficiency checks
   * @returns {string} Weapon class
   */
  getWeaponClass() {
    if (!this.weaponProperties) {
      return 'simple_melee';
    }
    return this.weaponProperties.weaponClass;
  },

  /**
   * Get weapon statistics for display
   * @returns {Object} Weapon stats
   */
  getWeaponStats() {
    if (!this.weaponProperties) {
      return null;
    }

    return {
      damage: this.weaponProperties.damageDice,
      damageType: this.getDamageType(),
      attackBonus: this.getAttackBonus(true),
      criticalRange: this.getCriticalRange(),
      weaponClass: this.getWeaponClass(),
      isTwoHanded: this.isTwoHanded(),
      isFinesse: this.isFinesse(),
      isLight: this.isLight(),
      isVersatile: this.isVersatile(),
      isRanged: this.isRanged()
    };
  }
};

/**
 * Apply weapon mixin to an item instance
 * @param {Object} item - Item instance
 */
function applyWeaponMixin(item) {
  Object.assign(item, WeaponMixin);
}

module.exports = {
  WeaponMixin,
  applyWeaponMixin
};
