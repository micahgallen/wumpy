/**
 * Consumable Mixin
 *
 * Provides consumable-specific functionality and behavior.
 * Applied to items with itemType === 'consumable'.
 */

const ConsumableMixin = {
  /**
   * Use/consume this item
   * @param {Object} player - Player using the item
   * @param {Object} [context={}] - Additional context (target, etc.)
   * @returns {Object} Result of consumption { success: boolean, message: string, consumed: boolean }
   */
  consume(player, context = {}) {
    if (!this.consumableProperties) {
      return {
        success: false,
        message: 'This item cannot be consumed.',
        consumed: false
      };
    }

    // Call custom onUse hook if defined
    if (this.consumableProperties.onUse && typeof this.consumableProperties.onUse === 'function') {
      const result = this.consumableProperties.onUse(player, this, context);

      if (result.success) {
        // Reduce quantity
        this.quantity -= 1;

        return {
          success: true,
          message: result.message || 'You consume the item.',
          consumed: this.quantity <= 0
        };
      }

      return result;
    }

    // Default behavior based on consumable type
    return this.defaultConsumeBehavior(player, context);
  },

  /**
   * Default consumption behavior by type
   * @param {Object} player - Player using the item
   * @param {Object} context - Additional context
   * @returns {Object} Result object
   */
  defaultConsumeBehavior(player, context) {
    const type = this.consumableProperties.consumableType;

    switch (type) {
      case 'potion':
        return this.consumePotion(player, context);
      case 'food':
        return this.consumeFood(player, context);
      case 'scroll':
        return this.consumeScroll(player, context);
      case 'elixir':
        return this.consumeElixir(player, context);
      default:
        return {
          success: false,
          message: 'You cannot use this item.',
          consumed: false
        };
    }
  },

  /**
   * Consume a potion
   * @param {Object} player - Player using the potion
   * @param {Object} context - Additional context
   * @returns {Object} Result object
   */
  consumePotion(player, context) {
    // Check for healing effect
    if (this.consumableProperties.healAmount) {
      const healAmount = this.consumableProperties.healAmount;
      const actualHeal = Math.min(healAmount, player.maxHp - player.hp);
      player.hp += actualHeal;

      this.quantity -= 1;

      return {
        success: true,
        message: `You drink the ${this.name} and recover ${actualHeal} HP.`,
        consumed: this.quantity <= 0
      };
    }

    // Check for resource restoration
    if (this.consumableProperties.restoreResource) {
      const restoreAmount = this.consumableProperties.restoreResource;
      const actualRestore = Math.min(restoreAmount, player.maxResource - player.resource);
      player.resource += actualRestore;

      this.quantity -= 1;

      return {
        success: true,
        message: `You drink the ${this.name} and restore ${actualRestore} resource.`,
        consumed: this.quantity <= 0
      };
    }

    return {
      success: false,
      message: `The ${this.name} has no effect.`,
      consumed: false
    };
  },

  /**
   * Consume food
   * @param {Object} player - Player eating
   * @param {Object} context - Additional context
   * @returns {Object} Result object
   */
  consumeFood(player, context) {
    // Simple food restoration
    if (this.consumableProperties.healAmount) {
      const healAmount = this.consumableProperties.healAmount;
      const actualHeal = Math.min(healAmount, player.maxHp - player.hp);
      player.hp += actualHeal;

      this.quantity -= 1;

      return {
        success: true,
        message: `You eat the ${this.name} and feel refreshed. (+${actualHeal} HP)`,
        consumed: this.quantity <= 0
      };
    }

    this.quantity -= 1;
    return {
      success: true,
      message: `You eat the ${this.name}. It's ${this.consumableProperties.flavorText || 'quite tasty'}.`,
      consumed: this.quantity <= 0
    };
  },

  /**
   * Use a scroll
   * @param {Object} player - Player using scroll
   * @param {Object} context - Additional context
   * @returns {Object} Result object
   */
  consumeScroll(player, context) {
    if (this.consumableProperties.spellEffect) {
      // Future: Cast spell from scroll
      this.quantity -= 1;

      return {
        success: true,
        message: `You read the ${this.name}. The scroll crumbles to dust.`,
        consumed: this.quantity <= 0
      };
    }

    return {
      success: false,
      message: `The ${this.name} has no magical effect.`,
      consumed: false
    };
  },

  /**
   * Consume an elixir (long-lasting buff)
   * @param {Object} player - Player using elixir
   * @param {Object} context - Additional context
   * @returns {Object} Result object
   */
  consumeElixir(player, context) {
    if (this.consumableProperties.buffEffect) {
      // Future: Apply temporary buff
      this.quantity -= 1;

      return {
        success: true,
        message: `You drink the ${this.name}. You feel its effects coursing through your body.`,
        consumed: this.quantity <= 0
      };
    }

    return {
      success: false,
      message: `The ${this.name} has no effect.`,
      consumed: false
    };
  },

  /**
   * Get consumable type
   * @returns {string} Consumable type
   */
  getConsumableType() {
    if (!this.consumableProperties) {
      return 'misc';
    }
    return this.consumableProperties.consumableType;
  },

  /**
   * Check if consumable has charges/uses
   * @returns {boolean} True if has multiple uses
   */
  hasMultipleUses() {
    return this.quantity > 1;
  },

  /**
   * Get remaining uses
   * @returns {number} Number of remaining uses
   */
  getRemainingUses() {
    return this.quantity;
  },

  /**
   * Get consumable description with usage info
   * @param {Object} player - Player viewing the item
   * @returns {string} Enhanced description
   */
  getConsumableDescription(player) {
    let desc = this.getDescription(player);

    if (this.quantity > 1) {
      desc += `\n\nYou have ${this.quantity} of these.`;
    }

    // Show effects if identified
    if (this.isIdentified || this.rarity === 'common') {
      if (this.consumableProperties.healAmount) {
        desc += `\nRestores ${this.consumableProperties.healAmount} HP.`;
      }

      if (this.consumableProperties.restoreResource) {
        desc += `\nRestores ${this.consumableProperties.restoreResource} resource.`;
      }

      if (this.consumableProperties.buffEffect) {
        desc += `\nProvides a temporary enhancement.`;
      }
    }

    return desc;
  }
};

/**
 * Apply consumable mixin to an item instance
 * @param {Object} item - Item instance
 */
function applyConsumableMixin(item) {
  Object.assign(item, ConsumableMixin);
}

module.exports = {
  ConsumableMixin,
  applyConsumableMixin
};
