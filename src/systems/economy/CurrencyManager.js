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
    this.COPPER_PER_SILVER = 10;
    this.COPPER_PER_GOLD = 100;
    this.COPPER_PER_PLATINUM = 1000;

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
   * Preserves denominations when possible (doesn't auto-convert)
   * @param {Object|number} currency1 - First currency amount (minuend)
   * @param {Object|number} currency2 - Second currency amount (subtrahend)
   * @returns {Object} Difference as {platinum, gold, silver, copper}
   */
  subtract(currency1, currency2) {
    // If both are objects, subtract denomination by denomination
    if (typeof currency1 === 'object' && typeof currency2 === 'object') {
      let result = {
        platinum: (currency1.platinum || 0) - (currency2.platinum || 0),
        gold: (currency1.gold || 0) - (currency2.gold || 0),
        silver: (currency1.silver || 0) - (currency2.silver || 0),
        copper: (currency1.copper || 0) - (currency2.copper || 0)
      };

      // Handle borrowing (convert higher denominations to lower if needed)
      if (result.copper < 0) {
        const borrow = Math.ceil(-result.copper / 10);
        result.silver -= borrow;
        result.copper += borrow * 10;
      }
      if (result.silver < 0) {
        const borrow = Math.ceil(-result.silver / 10);
        result.gold -= borrow;
        result.silver += borrow * 10;
      }
      if (result.gold < 0) {
        const borrow = Math.ceil(-result.gold / 10);
        result.platinum -= borrow;
        result.gold += borrow * 10;
      }

      // If platinum is negative after borrowing, we need to "make change"
      // from lower denominations
      if (result.platinum < 0) {
        // Check if we have enough total value
        const totalCopper1 = this.toCopper(currency1);
        const totalCopper2 = this.toCopper(currency2);

        if (totalCopper1 >= totalCopper2) {
          // We have enough, just need to convert denominations properly
          return this.fromCopper(totalCopper1 - totalCopper2);
        } else {
          // Truly insufficient funds
          return { platinum: 0, gold: 0, silver: 0, copper: 0 };
        }
      }

      return result;
    }

    // Otherwise use copper conversion (auto-converts)
    const copper1 = this.toCopper(currency1);
    const copper2 = this.toCopper(currency2);
    const result = copper1 - copper2;
    return this.fromCopper(Math.max(0, result));
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
   * @param {boolean} [saveToDb=true] - Whether to save to database immediately
   * @returns {Object} {success: boolean, newBalance: Object}
   */
  addToWallet(player, amount, saveToDb = true) {
    const currentWallet = this.getWallet(player);
    const newWallet = this.add(currentWallet, amount);
    this.setWallet(player, newWallet);

    logger.log(`Added ${this.format(amount)} to ${player.username}'s wallet. New balance: ${this.format(newWallet)}`);

    // Save to database immediately
    if (saveToDb && player.playerDB) {
      player.playerDB.updatePlayerCurrency(player.username, newWallet);
    }

    return {
      success: true,
      newBalance: newWallet
    };
  }

  /**
   * Add currency to player's wallet preserving exact denominations
   * Does NOT auto-convert to optimal denominations
   * @param {Object} player - Player object
   * @param {Object} amount - Amount to add (must be object with denominations)
   * @param {boolean} [saveToDb=true] - Whether to save to database immediately
   * @returns {Object} {success: boolean, newBalance: Object}
   */
  addToWalletExact(player, amount, saveToDb = true) {
    if (typeof amount !== 'object') {
      // If passed a number, use regular addToWallet which auto-converts
      return this.addToWallet(player, amount, saveToDb);
    }

    const currentWallet = this.getWallet(player);

    // Add denomination by denomination (no conversion)
    const newWallet = {
      platinum: (currentWallet.platinum || 0) + (amount.platinum || 0),
      gold: (currentWallet.gold || 0) + (amount.gold || 0),
      silver: (currentWallet.silver || 0) + (amount.silver || 0),
      copper: (currentWallet.copper || 0) + (amount.copper || 0)
    };

    this.setWallet(player, newWallet);

    logger.log(`Added ${this.format(amount)} to ${player.username}'s wallet (exact). New balance: ${this.format(newWallet)}`);

    // Save to database immediately
    if (saveToDb && player.playerDB) {
      player.playerDB.updatePlayerCurrency(player.username, newWallet);
    }

    return {
      success: true,
      newBalance: newWallet
    };
  }

  /**
   * Remove currency from player's wallet
   * @param {Object} player - Player object
   * @param {Object|number} amount - Amount to remove
   * @param {boolean} [saveToDb=true] - Whether to save to database immediately
   * @returns {Object} {success: boolean, newBalance?: Object, message?: string}
   */
  removeFromWallet(player, amount, saveToDb = true) {
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

    // Save to database immediately
    if (saveToDb && player.playerDB) {
      player.playerDB.updatePlayerCurrency(player.username, newWallet);
    }

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
   * Check if currency is empty (all zeros or null/undefined)
   * @param {Object} currency - Currency object to check
   * @returns {boolean} True if currency is empty
   */
  isEmpty(currency) {
    if (!currency) {
      return true;
    }
    return (
      (currency.platinum === 0 || currency.platinum === undefined) &&
      (currency.gold === 0 || currency.gold === undefined) &&
      (currency.silver === 0 || currency.silver === undefined) &&
      (currency.copper === 0 || currency.copper === undefined)
    );
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

  /**
   * Create currency item instances for environmental currency
   * Converts copper amount or currency object to item instances
   * Auto-converts to optimal denominations (e.g., 100c becomes 1g)
   * @param {Object|number} currency - Currency object or copper amount
   * @returns {Array} Array of currency item instances
   */
  createCurrencyItems(currency) {
    const ItemFactory = require('../../items/ItemFactory');
    const copperAmount = this.toCopper(currency);
    const breakdown = this.fromCopper(copperAmount);

    const items = [];

    // Create items for each denomination (descending value)
    if (breakdown.platinum > 0) {
      items.push(ItemFactory.createItem('currency_platinum', { quantity: breakdown.platinum }));
    }
    if (breakdown.gold > 0) {
      items.push(ItemFactory.createItem('currency_gold', { quantity: breakdown.gold }));
    }
    if (breakdown.silver > 0) {
      items.push(ItemFactory.createItem('currency_silver', { quantity: breakdown.silver }));
    }
    if (breakdown.copper > 0) {
      items.push(ItemFactory.createItem('currency_copper', { quantity: breakdown.copper }));
    }

    return items;
  }

  /**
   * Create currency item instances preserving exact denominations
   * Does NOT auto-convert (e.g., 50 silver stays as 50 silver, not 5 gold)
   * @param {Object} currency - Currency object {platinum, gold, silver, copper}
   * @returns {Array} Array of currency item instances
   */
  createCurrencyItemsExact(currency) {
    const ItemFactory = require('../../items/ItemFactory');
    const items = [];

    // Create items for each denomination as specified (no conversion)
    if (currency.platinum > 0) {
      items.push(ItemFactory.createItem('currency_platinum', { quantity: currency.platinum }));
    }
    if (currency.gold > 0) {
      items.push(ItemFactory.createItem('currency_gold', { quantity: currency.gold }));
    }
    if (currency.silver > 0) {
      items.push(ItemFactory.createItem('currency_silver', { quantity: currency.silver }));
    }
    if (currency.copper > 0) {
      items.push(ItemFactory.createItem('currency_copper', { quantity: currency.copper }));
    }

    return items;
  }

  /**
   * Drop currency from player wallet to room
   * Creates currency items in the room and removes from wallet
   * @param {Object} player - Player object
   * @param {Object} room - Room object
   * @param {Object|number} amount - Amount to drop
   * @returns {Object} {success: boolean, items?: Array, message?: string}
   */
  dropCurrency(player, room, amount) {
    if (!player || !room) {
      return {
        success: false,
        message: 'Invalid player or room.'
      };
    }

    // Check if player has enough currency
    const currentWallet = this.getWallet(player);
    const copperAmount = this.toCopper(amount);

    if (!this.hasEnough(currentWallet, copperAmount)) {
      return {
        success: false,
        message: `You don't have enough currency. You have ${this.format(currentWallet)}, but tried to drop ${this.format(amount)}.`
      };
    }

    // Remove from wallet
    const removeResult = this.removeFromWallet(player, amount, true);
    if (!removeResult.success) {
      return removeResult;
    }

    // Create currency items (preserve exact denominations, don't auto-convert)
    const currencyItems = typeof amount === 'object'
      ? this.createCurrencyItemsExact(amount)
      : this.createCurrencyItems(amount); // If copper number, auto-convert is ok

    // Add to room (stack with existing currency if possible)
    if (!room.items) {
      room.items = [];
    }

    for (const item of currencyItems) {
      // Try to find an existing stack of this currency type
      let stacked = false;
      for (const roomItem of room.items) {
        if (roomItem.canStackWith && roomItem.canStackWith(item)) {
          // Stack with existing item
          roomItem.quantity = (roomItem.quantity || 1) + (item.quantity || 1);
          roomItem.modifiedAt = Date.now();
          stacked = true;
          break;
        }
      }

      // If not stacked, add as new item
      if (!stacked) {
        room.items.push(item);
      }
    }

    logger.log(`${player.username} dropped ${this.format(amount)} in room ${room.id}`);

    return {
      success: true,
      items: currencyItems,
      amount: copperAmount,
      message: `You drop ${this.format(amount)}.`
    };
  }

  /**
   * Pick up currency from room to player wallet
   * Converts currency item to wallet currency
   * @param {Object} player - Player object
   * @param {BaseItem} currencyItem - Currency item instance
   * @returns {Object} {success: boolean, amount?: number, message?: string}
   */
  pickupCurrency(player, currencyItem) {
    if (!player || !currencyItem) {
      return {
        success: false,
        message: 'Invalid player or currency item.'
      };
    }

    const { ItemType } = require('../../items/schemas/ItemTypes');

    // Validate it's a currency item
    if (currencyItem.itemType !== ItemType.CURRENCY) {
      return {
        success: false,
        message: 'Item is not currency.'
      };
    }

    // Calculate copper value
    const copperValue = (currencyItem.quantity || 1) * (currencyItem.value || 0);

    // Add to player wallet
    const addResult = this.addToWallet(player, copperValue, true);

    if (addResult.success) {
      logger.log(`${player.username} picked up ${this.format(copperValue)}`);

      return {
        success: true,
        amount: copperValue,
        message: `You pick up ${this.format(copperValue)}.`
      };
    }

    return {
      success: false,
      message: 'Failed to add currency to wallet.'
    };
  }

  /**
   * Parse currency string with full denomination names
   * Handles "50 copper", "5 gold", "2 gold 50 silver", etc.
   * @param {string} input - Currency string
   * @returns {Object|null} Currency object or null if invalid
   */
  parseCurrencyStringLong(input) {
    if (!input || typeof input !== 'string') {
      return null;
    }

    const currency = { platinum: 0, gold: 0, silver: 0, copper: 0 };

    // Match patterns like "50 copper", "5 gold", "2 platinum"
    const patterns = [
      { regex: /(\d+)\s*(?:platinum|plat|p)(?:\s|$)/i, type: 'platinum' },
      { regex: /(\d+)\s*(?:gold|g)(?:\s|$)/i, type: 'gold' },
      { regex: /(\d+)\s*(?:silver|s)(?:\s|$)/i, type: 'silver' },
      { regex: /(\d+)\s*(?:copper|c)(?:\s|$)/i, type: 'copper' }
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern.regex);
      if (match) {
        currency[pattern.type] = parseInt(match[1], 10);
      }
    }

    // Check if any currency was parsed
    const hasAnyCurrency = Object.values(currency).some(v => v > 0);
    return hasAnyCurrency ? currency : null;
  }
}

// Export singleton instance
module.exports = new CurrencyManager();
