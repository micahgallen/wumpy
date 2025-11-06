/**
 * Armor Mixin
 *
 * Provides armor-specific functionality and behavior.
 * Applied to items with itemType === 'armor'.
 */

const { ArmorClass } = require('../schemas/ItemTypes');
const config = require('../../config/itemsConfig');

const ArmorMixin = {
  /**
   * Get base armor class provided by this armor
   * @returns {number} Base AC
   */
  getBaseAC() {
    if (!this.armorProperties) {
      return 0;
    }
    return this.armorProperties.baseAC || 0;
  },

  /**
   * Get maximum DEX bonus allowed by this armor
   * @returns {number} Max DEX bonus (Infinity for no cap)
   */
  getMaxDexBonus() {
    if (!this.armorProperties) {
      return Infinity;
    }

    // Check if explicitly set on armor
    if (this.armorProperties.maxDexBonus !== undefined) {
      return this.armorProperties.maxDexBonus;
    }

    // Otherwise use config based on armor class
    const armorClass = this.armorProperties.armorClass || ArmorClass.LIGHT;
    return config.armorDexCaps[armorClass] || Infinity;
  },

  /**
   * Calculate total AC provided by this armor for a player
   * @param {number} playerDexModifier - Player's DEX modifier
   * @param {boolean} isProficient - Whether player is proficient with this armor type
   * @returns {number} Total AC
   */
  calculateAC(playerDexModifier, isProficient = true) {
    let ac = this.getBaseAC();

    // Apply capped DEX bonus
    const maxDex = this.getMaxDexBonus();
    const dexBonus = Math.min(playerDexModifier, maxDex);
    ac += Math.max(0, dexBonus);  // DEX bonus cannot be negative for AC

    // Add magical AC bonus if identified
    if (this.isIdentified && this.armorProperties.magicalACBonus) {
      ac += this.armorProperties.magicalACBonus;
    }

    // Apply proficiency penalty if not proficient (doesn't reduce AC, but noted elsewhere)
    // Note: In D&D 5e, armor proficiency affects ability checks, not AC directly
    // We track this for the combat system to apply attack penalties

    return ac;
  },

  /**
   * Get armor class type (light, medium, heavy)
   * @returns {string} Armor class
   */
  getArmorClass() {
    if (!this.armorProperties) {
      return ArmorClass.LIGHT;
    }
    return this.armorProperties.armorClass || ArmorClass.LIGHT;
  },

  /**
   * Check if armor imposes stealth disadvantage
   * @returns {boolean} True if stealth disadvantage
   */
  hasStealthDisadvantage() {
    if (!this.armorProperties) {
      return false;
    }
    return this.armorProperties.stealthDisadvantage === true;
  },

  /**
   * Check if armor requires strength to wear effectively
   * @returns {number|null} Minimum strength required, or null if none
   */
  getStrengthRequirement() {
    if (!this.armorProperties) {
      return null;
    }
    return this.armorProperties.strengthRequirement || null;
  },

  /**
   * Get attack penalty for not being proficient with this armor type
   * @returns {number} Attack penalty (negative number)
   */
  getNonProficiencyPenalty() {
    const armorClass = this.getArmorClass();
    return config.proficiency.armorPenalty[armorClass] || 0;
  },

  /**
   * Check if player meets requirements to wear this armor
   * @param {Object} player - Player object with stats
   * @returns {Object} { canWear: boolean, reason: string|null }
   */
  canBeWornBy(player) {
    // Check level requirement
    if (this.requiredLevel && player.level < this.requiredLevel) {
      return {
        canWear: false,
        reason: `You must be level ${this.requiredLevel} to wear this armor.`
      };
    }

    // Check class requirement
    if (this.requiredClass && !this.requiredClass.includes(player.class)) {
      return {
        canWear: false,
        reason: `Only ${this.requiredClass.join(', ')} can wear this armor.`
      };
    }

    // Check strength requirement (allows wearing but with penalty)
    const strReq = this.getStrengthRequirement();
    if (strReq && player.stats.str < strReq) {
      return {
        canWear: true,  // Can wear but with speed penalty (future implementation)
        reason: `You struggle under the weight of this armor. (STR ${strReq} required)`
      };
    }

    return { canWear: true, reason: null };
  },

  /**
   * Get armor statistics for display
   * @returns {Object} Armor stats
   */
  getArmorStats() {
    if (!this.armorProperties) {
      return null;
    }

    return {
      baseAC: this.getBaseAC(),
      armorClass: this.getArmorClass(),
      maxDexBonus: this.getMaxDexBonus(),
      stealthDisadvantage: this.hasStealthDisadvantage(),
      strengthRequirement: this.getStrengthRequirement(),
      magicalACBonus: this.isIdentified ? this.armorProperties.magicalACBonus : null
    };
  },

  /**
   * Get description with armor stats
   * @param {Object} player - Player viewing the item
   * @returns {string} Enhanced description
   */
  getArmorDescription(player) {
    let desc = this.getDescription(player);

    if (this.isIdentified || this.rarity === 'common') {
      const stats = this.getArmorStats();
      desc += `\n\nArmor Class: ${stats.baseAC}`;

      if (stats.maxDexBonus !== Infinity) {
        desc += ` (max DEX bonus: +${stats.maxDexBonus})`;
      }

      desc += `\nArmor Type: ${stats.armorClass}`;

      if (stats.stealthDisadvantage) {
        desc += '\nImposes disadvantage on stealth checks.';
      }

      if (stats.strengthRequirement) {
        desc += `\nRequires ${stats.strengthRequirement} Strength.`;
      }
    }

    return desc;
  }
};

/**
 * Apply armor mixin to an item instance
 * @param {Object} item - Item instance
 */
function applyArmorMixin(item) {
  Object.assign(item, ArmorMixin);
}

module.exports = {
  ArmorMixin,
  applyArmorMixin
};
