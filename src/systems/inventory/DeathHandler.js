/**
 * Death Handler for Inventory System
 *
 * Handles durability loss when players die.
 * Integrates with combat system death events.
 */

const InventoryManager = require('./InventoryManager');
const logger = require('../../logger');

class DeathHandler {
  /**
   * Handle player death and apply durability loss
   * @param {Object} player - Player who died
   * @param {Object} context - Death context (killer, location, etc.)
   * @returns {Object} Result with affected items
   */
  handlePlayerDeath(player, context = {}) {
    if (!player) {
      return { success: false, error: 'Invalid player' };
    }

    logger.log(`Processing death for ${player.username}`);

    // Apply durability loss to equipped items
    const affectedItems = InventoryManager.applyDeathDurability(player);

    // Build result messages
    const messages = [];
    const brokenItems = [];

    for (const result of affectedItems) {
      const { item, lostDurability, broke } = result;

      if (broke) {
        messages.push(`Your ${item.name} has broken and needs repair!`);
        brokenItems.push(item);
      } else if (lostDurability > 0) {
        const durabilityPercent = ((item.durability / item.maxDurability) * 100).toFixed(0);
        messages.push(`Your ${item.name} lost ${lostDurability} durability (${durabilityPercent}% remaining).`);
      }
    }

    return {
      success: true,
      affectedItems: affectedItems.length,
      brokenItems: brokenItems.length,
      messages,
      items: affectedItems
    };
  }

  /**
   * Check if a player has any broken items
   * @param {Object} player - Player to check
   * @returns {Array<BaseItem>} Array of broken items
   */
  getBrokenItems(player) {
    if (!player || !player.inventory) {
      return [];
    }

    return player.inventory.filter(item => {
      return item.maxDurability && item.durability === 0;
    });
  }

  /**
   * Check if a player has any items needing repair
   * @param {Object} player - Player to check
   * @param {number} [threshold=50] - Durability percentage threshold
   * @returns {Array<BaseItem>} Array of items needing repair
   */
  getItemsNeedingRepair(player, threshold = 50) {
    if (!player || !player.inventory) {
      return [];
    }

    return player.inventory.filter(item => {
      if (!item.maxDurability || item.durability === null) {
        return false;
      }

      const durabilityPercent = (item.durability / item.maxDurability) * 100;
      return durabilityPercent < threshold;
    });
  }

  /**
   * Repair an item
   * @param {Object} player - Player object
   * @param {BaseItem} item - Item to repair
   * @param {number} [amount] - Amount to repair (if not specified, full repair)
   * @returns {Object} Result with cost and new durability
   */
  repairItem(player, item, amount) {
    if (!player || !item) {
      return { success: false, error: 'Invalid player or item' };
    }

    if (!item.maxDurability || item.durability === null) {
      return { success: false, error: 'Item cannot be repaired' };
    }

    const config = require('../../config/itemsConfig');

    // Calculate repair amount
    const durabilityToRestore = amount || (item.maxDurability - item.durability);
    const actualRepair = Math.min(durabilityToRestore, item.maxDurability - item.durability);

    if (actualRepair <= 0) {
      return { success: false, error: 'Item is already at full durability' };
    }

    // Calculate cost
    const repairCost = Math.ceil(
      item.value *
      (actualRepair / item.maxDurability) *
      config.durability.repairCostMultiplier
    );

    // Apply repair
    item.repair(actualRepair);

    logger.log(`Repaired ${item.name} for ${player.username}: +${actualRepair} durability`);

    return {
      success: true,
      repairedAmount: actualRepair,
      newDurability: item.durability,
      cost: repairCost
    };
  }

  /**
   * Get repair cost for an item
   * @param {BaseItem} item - Item to check
   * @param {number} [amount] - Amount to repair (if not specified, full repair)
   * @returns {number} Repair cost in gold
   */
  getRepairCost(item, amount) {
    if (!item || !item.maxDurability || item.durability === null) {
      return 0;
    }

    const config = require('../../config/itemsConfig');

    const durabilityToRestore = amount || (item.maxDurability - item.durability);
    const actualRepair = Math.min(durabilityToRestore, item.maxDurability - item.durability);

    if (actualRepair <= 0) {
      return 0;
    }

    return Math.ceil(
      item.value *
      (actualRepair / item.maxDurability) *
      config.durability.repairCostMultiplier
    );
  }

  /**
   * Get total repair cost for all items needing repair
   * @param {Object} player - Player object
   * @returns {Object} Costs breakdown
   */
  getTotalRepairCost(player) {
    const itemsNeedingRepair = this.getItemsNeedingRepair(player);
    const brokenItems = this.getBrokenItems(player);

    let totalCost = 0;
    const itemCosts = [];

    for (const item of itemsNeedingRepair) {
      const cost = this.getRepairCost(item);
      totalCost += cost;
      itemCosts.push({
        item,
        cost,
        isBroken: item.durability === 0
      });
    }

    return {
      totalCost,
      itemCount: itemsNeedingRepair.length,
      brokenCount: brokenItems.length,
      items: itemCosts
    };
  }
}

// Export singleton instance
module.exports = new DeathHandler();
