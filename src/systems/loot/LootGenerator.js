/**
 * Loot Generator System
 *
 * Generates random loot based on spawn tags, rarity weights, and configuration.
 * Used for treasure chests, NPC corpse drops, and other random loot sources.
 */

const ItemRegistry = require('../../items/ItemRegistry');
const ItemFactory = require('../../items/ItemFactory');
const config = require('../../config/itemsConfig');
const { rollDice } = require('../../utils/dice');

class LootGenerator {
  /**
   * Generate random loot items
   * @param {Object} options - Loot generation options
   * @param {Array<string>} options.lootTables - Loot table categories to pull from
   * @param {Array<string>} options.spawnTags - Spawn tags to filter by (optional)
   * @param {boolean} options.requireAllTags - Require ALL tags vs ANY tags (default: false)
   * @param {number} options.itemCount - Number of items to generate (default: from config)
   * @param {number} options.level - Level for gating rare items (default: 1)
   * @param {boolean} options.allowDuplicates - Allow duplicate items (default: from config)
   * @param {boolean} options.includeCurrency - Include currency in loot (default: from config)
   * @returns {Array<Object>} Array of item instances
   */
  static generateLoot(options = {}) {
    const {
      lootTables = ['common_loot'],
      spawnTags = null,
      requireAllTags = false,
      itemCount = config.spawn.generation.defaultItemCount,
      level = 1,
      allowDuplicates = config.spawn.generation.allowDuplicates,
      includeCurrency = config.spawn.generation.alwaysCurrency
    } = options;

    // Check if spawn system is enabled
    if (!config.spawn || !config.spawn.enabled) {
      return [];
    }

    // Chance for empty loot
    const emptyRoll = Math.random() * 100;
    if (emptyRoll < config.spawn.generation.emptyLootChance) {
      return [];
    }

    // Get eligible items from registry
    const eligibleItems = this.getEligibleItems({
      lootTables,
      spawnTags,
      requireAllTags,
      level
    });

    if (eligibleItems.length === 0) {
      return [];
    }

    // Generate items
    const lootItems = [];
    const usedItemIds = new Set();

    for (let i = 0; i < itemCount; i++) {
      const item = this.selectWeightedItem(eligibleItems, usedItemIds, allowDuplicates);

      if (item) {
        const instance = ItemFactory.createItem(item);

        // Set quantity for stackable items
        if (instance.isStackable) {
          instance.quantity = this.generateQuantity(instance);
        }

        lootItems.push(instance);
        usedItemIds.add(item.id);
      }
    }

    // Bonus item chance
    const bonusRoll = Math.random() * 100;
    if (bonusRoll < config.spawn.generation.bonusItemChance) {
      const bonusItem = this.selectWeightedItem(eligibleItems, usedItemIds, allowDuplicates);
      if (bonusItem) {
        const instance = ItemFactory.createItem(bonusItem);
        if (instance.isStackable) {
          instance.quantity = this.generateQuantity(instance);
        }
        lootItems.push(instance);
      }
    }

    // Add currency if enabled
    if (includeCurrency) {
      const currencyItem = this.generateCurrency();
      if (currencyItem) {
        lootItems.push(currencyItem);
      }
    }

    return lootItems;
  }

  /**
   * Get eligible items from the registry based on filters
   * @param {Object} filters - Filter options
   * @returns {Array<Object>} Array of item definitions
   */
  static getEligibleItems(filters) {
    const { lootTables, spawnTags, requireAllTags, level } = filters;
    const allItems = ItemRegistry.getAllItems();
    const eligible = [];

    for (const item of allItems) {
      // Create temporary instance to check spawnability
      const instance = ItemFactory.createItem(item);

      // Must be spawnable
      if (!instance.isSpawnable()) {
        continue;
      }

      // Check loot table match
      if (lootTables && lootTables.length > 0) {
        const itemLootTables = instance.getLootTables();
        const hasMatchingTable = lootTables.some(table => itemLootTables.includes(table));
        if (!hasMatchingTable) {
          continue;
        }
      }

      // Check spawn tags match
      if (spawnTags && spawnTags.length > 0) {
        if (!instance.matchesSpawnTags(spawnTags, requireAllTags)) {
          continue;
        }
      }

      // Check level gating
      if (config.spawn.filters.levelGating.enabled) {
        const gates = config.spawn.filters.levelGating.gates;
        const rarity = instance.rarity;

        if (gates[rarity] && level < gates[rarity]) {
          continue; // Item is too rare for this level
        }
      }

      eligible.push(item);
    }

    return eligible;
  }

  /**
   * Select a random item using weighted probabilities
   * @param {Array<Object>} items - Array of item definitions
   * @param {Set<string>} usedItemIds - Set of already-selected item IDs
   * @param {boolean} allowDuplicates - Whether to allow duplicate items
   * @returns {Object|null} Selected item definition or null
   */
  static selectWeightedItem(items, usedItemIds, allowDuplicates) {
    if (items.length === 0) {
      return null;
    }

    // Filter out already-used items if duplicates not allowed
    let availableItems = items;
    if (!allowDuplicates) {
      availableItems = items.filter(item => !usedItemIds.has(item.id));
      if (availableItems.length === 0) {
        return null; // No more unique items available
      }
    }

    // Build weight table
    const weightTable = [];
    let totalWeight = 0;

    for (const item of availableItems) {
      const instance = ItemFactory.createItem(item);
      const weight = instance.getSpawnWeight();

      if (weight > 0) {
        weightTable.push({ item, weight, cumulativeWeight: totalWeight + weight });
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) {
      return null; // No items with positive weight
    }

    // Roll random number and select item
    const roll = Math.random() * totalWeight;

    for (const entry of weightTable) {
      if (roll < entry.cumulativeWeight) {
        return entry.item;
      }
    }

    // Fallback (shouldn't happen)
    return weightTable[weightTable.length - 1].item;
  }

  /**
   * Generate quantity for stackable items
   * @param {Object} itemInstance - Item instance
   * @returns {number} Quantity to spawn
   */
  static generateQuantity(itemInstance) {
    const rarity = itemInstance.rarity;
    const itemType = itemInstance.itemType;

    // Currency gets special handling
    if (itemType === 'currency') {
      const currencyType = itemInstance.definition.subType || 'copper';
      const range = config.spawn.currencyQuantity[currencyType] || [1, 10];
      return this.randomRange(range[0], range[1]);
    }

    // Use rarity-based quantity ranges
    const ranges = config.spawn.quantityRanges;
    const range = ranges[rarity] || [1, 1];

    return this.randomRange(range[0], range[1]);
  }

  /**
   * Generate random currency loot
   * @returns {Object|null} Currency item instance or null
   */
  static generateCurrency() {
    // Find a currency item in the registry
    const currencyItems = ItemRegistry.search({ itemType: 'currency' });

    if (currencyItems.length === 0) {
      return null;
    }

    // For now, just use the first currency item (typically gold)
    // In the future, this could be weighted by currency type
    const currencyDef = currencyItems[0];
    const instance = ItemFactory.createItem(currencyDef);

    // Generate quantity
    instance.quantity = this.generateQuantity(instance);

    return instance;
  }

  /**
   * Generate loot for a specific NPC corpse
   * @param {Object} npc - NPC object
   * @returns {Array<Object>} Array of item instances
   */
  static generateNPCLoot(npc) {
    const level = npc.level || 1;
    const lootTables = npc.lootTables || ['common_loot', 'trash_loot'];
    const spawnTags = npc.spawnTags || null;

    // Boss NPCs get better loot
    const isBoss = npc.isBoss || false;
    const itemCount = isBoss
      ? config.spawn.generation.defaultItemCount + 2
      : config.spawn.generation.defaultItemCount;

    return this.generateLoot({
      lootTables,
      spawnTags,
      level,
      itemCount
    });
  }

  /**
   * Generate loot for a treasure chest
   * @param {Object} chest - Chest object
   * @returns {Array<Object>} Array of item instances
   */
  static generateChestLoot(chest) {
    const level = chest.level || 1;
    const lootTables = chest.lootTables || ['common_loot'];
    const spawnTags = chest.spawnTags || null;
    const itemCount = chest.itemCount || config.spawn.generation.defaultItemCount;

    return this.generateLoot({
      lootTables,
      spawnTags,
      level,
      itemCount,
      includeCurrency: true
    });
  }

  /**
   * Generate a random number in a range (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random number in range
   */
  static randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get spawn statistics for an item
   * @param {string} itemId - Item ID
   * @returns {Object} Spawn statistics
   */
  static getItemSpawnStats(itemId) {
    const itemDef = ItemRegistry.getItem(itemId);
    if (!itemDef) {
      return null;
    }

    const instance = ItemFactory.createItem(itemDef);

    return {
      itemId,
      name: instance.name,
      spawnable: instance.isSpawnable(),
      spawnWeight: instance.getSpawnWeight(),
      spawnTags: instance.getSpawnTags(),
      lootTables: instance.getLootTables(),
      rarity: instance.rarity,
      itemType: instance.itemType
    };
  }
}

module.exports = LootGenerator;
