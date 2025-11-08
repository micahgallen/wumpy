/**
 * Quest Reward Manager
 *
 * Manages quest rewards including items, currency, and experience.
 * Supports multiple reward options (choose one of three).
 *
 * Reward Schema:
 * {
 *   items: Array<{itemId: string, quantity: number}>,
 *   currency: number | {platinum, gold, silver, copper},
 *   experience: number,
 *   options: Array<{items, currency}> // For "choose one of" rewards
 * }
 */

const logger = require('../../logger');
const CurrencyManager = require('../economy/CurrencyManager');
const ItemFactory = require('../../items/ItemFactory');
const InventoryManager = require('../inventory/InventoryManager');

class QuestRewardManager {
  /**
   * Grant quest rewards to a player
   * @param {Object} player - Player object
   * @param {Object} rewards - Reward definition
   * @returns {Object} {success: boolean, message: string, granted: Object}
   */
  grantRewards(player, rewards) {
    if (!rewards) {
      return { success: false, message: 'No rewards defined.' };
    }

    const granted = {
      items: [],
      currency: 0,
      experience: 0
    };

    // Grant currency
    if (rewards.currency) {
      const currencyAmount = typeof rewards.currency === 'number'
        ? rewards.currency
        : CurrencyManager.toCopper(rewards.currency);

      CurrencyManager.addToWallet(player, currencyAmount);
      granted.currency = currencyAmount;
    }

    // Grant items
    if (rewards.items && Array.isArray(rewards.items)) {
      for (const itemReward of rewards.items) {
        const itemId = itemReward.itemId;
        const quantity = itemReward.quantity || 1;

        for (let i = 0; i < quantity; i++) {
          const item = ItemFactory.createItem(itemId);
          if (!item) {
            logger.error(`Failed to create reward item: ${itemId}`);
            continue;
          }

          // Quest items remain unbound unless bindOnEquip flag is set
          // (per design decision)

          const addResult = InventoryManager.addItem(player, item);
          if (addResult.success) {
            granted.items.push(item);
          } else {
            logger.error(`Failed to grant reward item ${itemId}: ${addResult.reason}`);
          }
        }
      }
    }

    // Grant experience
    if (rewards.experience) {
      granted.experience = rewards.experience;
      // Note: XP system integration would go here
      // For now, just log it
      logger.log(`Player ${player.username} would gain ${rewards.experience} XP`);
    }

    // Build message
    const messageParts = [];

    if (granted.currency > 0) {
      messageParts.push(`${CurrencyManager.format(granted.currency)}`);
    }

    if (granted.items.length > 0) {
      const itemNames = granted.items.map(item => item.name).join(', ');
      messageParts.push(itemNames);
    }

    if (granted.experience > 0) {
      messageParts.push(`${granted.experience} experience`);
    }

    const message = messageParts.length > 0
      ? `You receive: ${messageParts.join(', ')}.`
      : 'Quest complete!';

    logger.log(`Player ${player.username} received quest rewards: ${message}`);

    return {
      success: true,
      message: message,
      granted: granted
    };
  }

  /**
   * Present reward options to player and grant chosen option
   * @param {Object} player - Player object
   * @param {Array<Object>} rewardOptions - Array of reward objects
   * @param {number} choiceIndex - Index of chosen reward
   * @returns {Object} {success: boolean, message: string}
   */
  grantChosenReward(player, rewardOptions, choiceIndex) {
    if (!rewardOptions || !Array.isArray(rewardOptions)) {
      return { success: false, message: 'No reward options available.' };
    }

    if (choiceIndex < 0 || choiceIndex >= rewardOptions.length) {
      return { success: false, message: 'Invalid reward choice.' };
    }

    const chosenReward = rewardOptions[choiceIndex];
    return this.grantRewards(player, chosenReward);
  }

  /**
   * Format reward options for display
   * @param {Array<Object>} rewardOptions - Array of reward objects
   * @returns {string} Formatted reward options
   */
  formatRewardOptions(rewardOptions) {
    if (!rewardOptions || !Array.isArray(rewardOptions)) {
      return 'No rewards available.';
    }

    const lines = ['Choose your reward:'];

    for (let i = 0; i < rewardOptions.length; i++) {
      const reward = rewardOptions[i];
      const parts = [];

      if (reward.currency) {
        const currencyAmount = typeof reward.currency === 'number'
          ? reward.currency
          : CurrencyManager.toCopper(reward.currency);
        parts.push(CurrencyManager.format(currencyAmount));
      }

      if (reward.items && reward.items.length > 0) {
        const itemNames = reward.items.map(ir => {
          const qty = ir.quantity > 1 ? `${ir.quantity}x ` : '';
          return `${qty}${ir.itemId}`;
        }).join(', ');
        parts.push(itemNames);
      }

      if (reward.experience) {
        parts.push(`${reward.experience} XP`);
      }

      lines.push(`  ${i + 1}. ${parts.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Validate reward definition
   * @param {Object} rewards - Reward definition
   * @returns {boolean} True if valid
   */
  validateRewards(rewards) {
    if (!rewards || typeof rewards !== 'object') {
      return false;
    }

    // At least one reward type must be present
    const hasRewards = rewards.currency !== undefined ||
                      (rewards.items && rewards.items.length > 0) ||
                      rewards.experience !== undefined;

    return hasRewards;
  }
}

// Export singleton instance
module.exports = new QuestRewardManager();
