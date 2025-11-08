/**
 * Currency Manager
 *
 * Manages the four-tier currency system (copper, silver, gold, platinum).
 * Handles conversion between currency types, formatting for display,
 * and currency arithmetic operations.
 *
 * Conversion Rates:
 * - 100 copper = 1 silver
 * - 10 silver = 1 gold
 * - 10 gold = 1 platinum
 *
 * Design Decision: Wallet approach - currency stored separately from inventory
 * to avoid using inventory slots. Better UX for players.
 */

const logger = require('../../logger');

class CurrencyManager {
  constructor() {
    // Conversion rates (all in copper)
    this.COPPER_PER_SILVER = 100;
    this.COPPER_PER_GOLD = 1000;
    this.COPPER_PER_PLATINUM = 10000;

    // Currency types in order from lowest to highest
    this.CURRENCY_TYPES = ['copper', 'silver', 'gold', 'platinum'];
  }

  /**
   * Convert currency amounts to total copper value
   * @param {Object} currency - {copper, silver, gold, platinum}
   * @returns {number} Total value in copper
   */
  toCopper(currency) {
    if (typeof currency === 'number') {
      return currency; // Already in copper
    }

    const copper = currency.copper || 0;
    const silver = currency.silver || 0;
    const gold = currency.gold || 0;
    const platinum = currency.platinum || 0;

    return copper +
           (silver * this.COPPER_PER_SILVER) +
           (gold * this.COPPER_PER_GOLD) +
           (platinum * this.COPPER_PER_PLATINUM);
  }

  /**
   * Convert copper amount to currency breakdown
   * @param {number} copperAmount - Total copper amount
   * @returns {Object} {platinum, gold, silver, copper}
   */
  fromCopper(copperAmount) {
    if (copperAmount < 0) {
      return { platinum: 0, gold: 0, silver: 0, copper: 0 };
    }

    let remaining = Math.floor(copperAmount);

    const platinum = Math.floor(remaining / this.COPPER_PER_PLATINUM);
    remaining -= platinum * this.COPPER_PER_PLATINUM;

    const gold = Math.floor(remaining / this.COPPER_PER_GOLD);
    remaining -= gold * this.COPPER_PER_GOLD;

    const silver = Math.floor(remaining / this.COPPER_PER_SILVER);
    remaining -= silver * this.COPPER_PER_SILVER;

    const copper = remaining;

    return { platinum, gold, silver, copper };
  }

  /**
   * Format currency for display (e.g., "5g 32s 8c")
   * @param {Object|number} currency - Currency object or copper amount
   * @param {boolean} [hideZeros=true] - Hide zero values
   * @returns {string} Formatted currency string
   */
  format(currency, hideZeros = true) {
    const breakdown = typeof currency === 'number'
      ? this.fromCopper(currency)
      : currency;

    const parts = [];

    if (breakdown.platinum > 0 || !hideZeros) {
      parts.push(`${breakdown.platinum}p`);
    }
    if (breakdown.gold > 0 || (!hideZeros && parts.length > 0)) {
      parts.push(`${breakdown.gold}g`);
    }
    if (breakdown.silver > 0 || (!hideZeros && parts.length > 0)) {
      parts.push(`${breakdown.silver}s`);
    }
    if (breakdown.copper > 0 || parts.length === 0) {
      parts.push(`${breakdown.copper}c`);
    }

    return parts.join(' ');
  }

  /**
   * Format currency with full names (e.g., "5 gold, 32 silver, 8 copper")
   * @param {Object|number} currency - Currency object or copper amount
   * @param {boolean} [hideZeros=true] - Hide zero values
   * @returns {string} Formatted currency string
   */
  formatLong(currency, hideZeros = true) {
    const breakdown = typeof currency === 'number'
      ? this.fromCopper(currency)
      : currency;

    const parts = [];

    if (breakdown.platinum > 0 || !hideZeros) {
      const plural = breakdown.platinum !== 1 ? 's' : '';
      parts.push(`${breakdown.platinum} platinum${plural}`);
    }
    if (breakdown.gold > 0 || (!hideZeros && parts.length > 0)) {
      parts.push(`${breakdown.gold} gold`);
    }
    if (breakdown.silver > 0 || (!hideZeros && parts.length > 0)) {
      parts.push(`${breakdown.silver} silver`);
    }
    if (breakdown.copper > 0 || parts.length === 0) {
      parts.push(`${breakdown.copper} copper`);
    }

    if (parts.length === 0) {
      return '0 copper';
    }

    if (parts.length === 1) {
      return parts[0];
    }

    // Join with commas and 'and' before last item
    const lastPart = parts.pop();
    return `${parts.join(', ')} and ${lastPart}`;
  }

  /**
   * Add currency amounts
   * @param {Object|number} currency1 - First currency amount
   * @param {Object|number} currency2 - Second currency amount
   * @returns {Object} Sum as {platinum, gold, silver, copper}
   */
  add(currency1, currency2) {
    const copper1 = this.toCopper(currency1);
    const copper2 = this.toCopper(currency2);
    return this.fromCopper(copper1 + copper2);
  }

  /**
   * Subtract currency amounts
   * @param {Object|number} currency1 - First currency amount (minuend)
   * @param {Object|number} currency2 - Second currency amount (subtrahend)
   * @returns {Object} Difference as {platinum, gold, silver, copper}
   */
  subtract(currency1, currency2) {
    const copper1 = this.toCopper(currency1);
    const copper2 = this.toCopper(currency2);
    const result = copper1 - copper2;
    return this.fromCopper(Math.max(0, result)); // Never go negative
  }

  /**
   * Compare two currency amounts
   * @param {Object|number} currency1 - First currency amount
   * @param {Object|number} currency2 - Second currency amount
   * @returns {number} -1 if currency1 < currency2, 0 if equal, 1 if currency1 > currency2
   */
  compare(currency1, currency2) {
    const copper1 = this.toCopper(currency1);
    const copper2 = this.toCopper(currency2);

    if (copper1 < copper2) return -1;
    if (copper1 > copper2) return 1;
    return 0;
  }

  /**
   * Check if player has enough currency
   * @param {Object|number} playerCurrency - Player's current currency
   * @param {Object|number} requiredCurrency - Required currency amount
   * @returns {boolean} True if player has enough
   */
  hasEnough(playerCurrency, requiredCurrency) {
    return this.compare(playerCurrency, requiredCurrency) >= 0;
  }

  /**
   * Get player's currency wallet (initializes if not present)
   * @param {Object} player - Player object
   * @returns {Object} Currency wallet {platinum, gold, silver, copper}
   */
  getWallet(player) {
    if (!player.currency) {
      player.currency = { platinum: 0, gold: 0, silver: 0, copper: 0 };
    }
    return player.currency;
  }

  /**
   * Set player's currency wallet
   * @param {Object} player - Player object
   * @param {Object|number} currency - Currency to set (object or copper amount)
   */
  setWallet(player, currency) {
    const breakdown = typeof currency === 'number'
      ? this.fromCopper(currency)
      : currency;

    player.currency = {
      platinum: breakdown.platinum || 0,
      gold: breakdown.gold || 0,
      silver: breakdown.silver || 0,
      copper: breakdown.copper || 0
    };
  }

  /**
   * Add currency to player's wallet
   * @param {Object} player - Player object
   * @param {Object|number} amount - Amount to add
   * @returns {Object} New wallet balance
   */
  addToWallet(player, amount) {
    const currentWallet = this.getWallet(player);
    const newWallet = this.add(currentWallet, amount);
    this.setWallet(player, newWallet);

    logger.log(`Added ${this.format(amount)} to ${player.username}'s wallet. New balance: ${this.format(newWallet)}`);

    return newWallet;
  }

  /**
   * Remove currency from player's wallet
   * @param {Object} player - Player object
   * @param {Object|number} amount - Amount to remove
   * @returns {Object} {success: boolean, newBalance?: Object, message?: string}
   */
  removeFromWallet(player, amount) {
    const currentWallet = this.getWallet(player);

    if (!this.hasEnough(currentWallet, amount)) {
      return {
        success: false,
        message: `Insufficient funds. You have ${this.format(currentWallet)}, but need ${this.format(amount)}.`
      };
    }

    const newWallet = this.subtract(currentWallet, amount);
    this.setWallet(player, newWallet);

    logger.log(`Removed ${this.format(amount)} from ${player.username}'s wallet. New balance: ${this.format(newWallet)}`);

    return {
      success: true,
      newBalance: newWallet
    };
  }

  /**
   * Transfer currency between players
   * @param {Object} fromPlayer - Source player
   * @param {Object} toPlayer - Destination player
   * @param {Object|number} amount - Amount to transfer
   * @returns {Object} {success: boolean, message: string}
   */
  transfer(fromPlayer, toPlayer, amount) {
    const currentWallet = this.getWallet(fromPlayer);

    if (!this.hasEnough(currentWallet, amount)) {
      return {
        success: false,
        message: `Insufficient funds. You have ${this.format(currentWallet)}, but need ${this.format(amount)}.`
      };
    }

    // Remove from source
    const removeResult = this.removeFromWallet(fromPlayer, amount);
    if (!removeResult.success) {
      return removeResult;
    }

    // Add to destination
    this.addToWallet(toPlayer, amount);

    logger.log(`Transferred ${this.format(amount)} from ${fromPlayer.username} to ${toPlayer.username}`);

    return {
      success: true,
      message: `You gave ${this.format(amount)} to ${toPlayer.username}.`
    };
  }

  /**
   * Parse currency string input (e.g., "5g", "100c", "2g 50s")
   * @param {string} input - Currency string
   * @returns {Object|null} Currency object or null if invalid
   */
  parseCurrencyString(input) {
    if (!input || typeof input !== 'string') {
      return null;
    }

    const currency = { platinum: 0, gold: 0, silver: 0, copper: 0 };
    const parts = input.toLowerCase().split(/\s+/);

    for (const part of parts) {
      const match = part.match(/^(\d+)([pgsc])$/);
      if (!match) {
        continue;
      }

      const amount = parseInt(match[1], 10);
      const type = match[2];

      switch (type) {
        case 'p':
          currency.platinum = amount;
          break;
        case 'g':
          currency.gold = amount;
          break;
        case 's':
          currency.silver = amount;
          break;
        case 'c':
          currency.copper = amount;
          break;
      }
    }

    return currency;
  }

  /**
   * Validate currency object
   * @param {Object} currency - Currency object to validate
   * @returns {boolean} True if valid
   */
  isValid(currency) {
    if (!currency || typeof currency !== 'object') {
      return false;
    }

    const types = ['platinum', 'gold', 'silver', 'copper'];
    for (const type of types) {
      const value = currency[type];
      if (value !== undefined && (typeof value !== 'number' || value < 0 || !Number.isFinite(value))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create a clean currency object with default zeros
   * @param {Object} [partial={}] - Partial currency object
   * @returns {Object} Complete currency object
   */
  createWallet(partial = {}) {
    return {
      platinum: partial.platinum || 0,
      gold: partial.gold || 0,
      silver: partial.silver || 0,
      copper: partial.copper || 0
    };
  }

  /**
   * Calculate the value of an item in copper
   * This is a helper for item pricing based on rarity
   * @param {number} baseValue - Base value in copper
   * @param {string} rarity - Item rarity
   * @returns {number} Final value in copper
   */
  calculateItemValue(baseValue, rarity) {
    const rarityMultipliers = {
      common: 1,
      uncommon: 5,
      rare: 25,
      epic: 125,
      legendary: 625,
      artifact: 3125
    };

    const multiplier = rarityMultipliers[rarity] || 1;
    return Math.floor(baseValue * multiplier);
  }
}

// Export singleton instance
module.exports = new CurrencyManager();
