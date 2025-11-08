/**
 * Shop Manager
 *
 * Manages shop systems including buying, selling, identification, and repair services.
 * Shops can have limited or unlimited inventory, different markup rates, and
 * special services.
 *
 * Shop Schema:
 * {
 *   id: string,
 *   name: string,
 *   description: string,
 *   inventory: Array<{itemId: string, quantity: number, price?: number}>,
 *   unlimited: boolean,          // If true, shop has infinite stock
 *   buyback: number,             // Percentage shop pays for items (0.5 = 50%)
 *   markup: number,              // Price multiplier for items sold (1.0 = base price)
 *   services: {
 *     identify: boolean,
 *     repair: boolean
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../logger');
const CurrencyManager = require('./CurrencyManager');
const ItemRegistry = require('../../items/ItemRegistry');
const ItemFactory = require('../../items/ItemFactory');
const InventoryManager = require('../inventory/InventoryManager');

class ShopManager {
  constructor() {
    this.shops = new Map();
    this.shopsDataDir = path.join(__dirname, '../../../data/shops');
    this.ensureDataDirectory();
  }

  /**
   * Ensure the shops data directory exists
   */
  ensureDataDirectory() {
    try {
      if (!fs.existsSync(this.shopsDataDir)) {
        fs.mkdirSync(this.shopsDataDir, { recursive: true });
        logger.log('Created shops data directory');
      }
    } catch (err) {
      logger.error(`Failed to create shops data directory: ${err.message}`);
    }
  }

  /**
   * Register a shop
   * @param {Object} shopDefinition - Shop definition object
   * @returns {boolean} True if registered successfully
   */
  registerShop(shopDefinition) {
    if (!shopDefinition.id) {
      logger.error('Shop definition missing id');
      return false;
    }

    const shop = {
      id: shopDefinition.id,
      name: shopDefinition.name || 'General Store',
      description: shopDefinition.description || 'A shop.',
      inventory: shopDefinition.inventory || [],
      unlimited: shopDefinition.unlimited !== undefined ? shopDefinition.unlimited : true,
      buyback: shopDefinition.buyback !== undefined ? shopDefinition.buyback : 0.5,
      markup: shopDefinition.markup !== undefined ? shopDefinition.markup : 1.0,
      services: {
        identify: shopDefinition.services?.identify !== false,
        repair: shopDefinition.services?.repair !== false
      }
    };

    this.shops.set(shop.id, shop);
    logger.log(`Registered shop: ${shop.name} (${shop.id})`);
    return true;
  }

  /**
   * Get a shop by ID
   * @param {string} shopId - Shop ID
   * @returns {Object|null} Shop object or null
   */
  getShop(shopId) {
    return this.shops.get(shopId) || null;
  }

  /**
   * Save shop inventory to disk (async)
   * @param {string} shopId - Shop ID
   * @returns {Promise<boolean>} True if saved successfully
   */
  async saveShopInventory(shopId) {
    const shop = this.getShop(shopId);
    if (!shop) {
      logger.error(`Cannot save inventory: shop ${shopId} not found`);
      return false;
    }

    try {
      const shopData = {
        id: shop.id,
        inventory: shop.inventory,
        lastSaved: Date.now()
      };

      const filepath = path.join(this.shopsDataDir, `${shopId}.json`);
      const tempFilepath = filepath + '.tmp';

      // Write to temp file first for atomic operation (async)
      await fs.promises.writeFile(tempFilepath, JSON.stringify(shopData, null, 2), 'utf8');

      // Rename temp file to actual file (atomic on most filesystems)
      await fs.promises.rename(tempFilepath, filepath);

      logger.log(`Saved inventory for shop: ${shop.name} (${shopId})`);
      return true;
    } catch (err) {
      logger.error(`Failed to save shop inventory for ${shopId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Load shop inventory from disk (async)
   * @param {string} shopId - Shop ID
   * @returns {Promise<boolean>} True if loaded successfully
   */
  async loadShopInventory(shopId) {
    const shop = this.getShop(shopId);
    if (!shop) {
      logger.error(`Cannot load inventory: shop ${shopId} not found`);
      return false;
    }

    const filepath = path.join(this.shopsDataDir, `${shopId}.json`);

    // If no saved data exists, use the shop's original definition
    try {
      await fs.promises.access(filepath);
    } catch {
      logger.log(`No saved inventory found for ${shopId}, using shop definition`);
      return true;
    }

    try {
      const data = await fs.promises.readFile(filepath, 'utf8');
      const shopData = JSON.parse(data);

      // Validate and restore inventory
      if (shopData.inventory && Array.isArray(shopData.inventory)) {
        shop.inventory = shopData.inventory.filter(entry => {
          // Validate structure
          if (!entry || typeof entry !== 'object') {
            logger.warn(`Skipping invalid entry in ${shopId} (not an object)`);
            return false;
          }
          if (!entry.itemId || typeof entry.itemId !== 'string') {
            logger.warn(`Skipping entry in ${shopId} (missing or invalid itemId)`);
            return false;
          }
          if (typeof entry.quantity !== 'number' || entry.quantity < 0) {
            logger.warn(`Skipping invalid quantity for ${entry.itemId} in ${shopId}`);
            return false;
          }

          // Validate item exists in registry
          if (!ItemRegistry.getItem(entry.itemId)) {
            logger.warn(`Removing invalid item ${entry.itemId} from ${shopId} (not in registry)`);
            return false;
          }

          return true;
        });
        logger.log(`Restored ${shop.inventory.length} items for ${shopId}`);
      } else {
        logger.warn(`Invalid inventory data for ${shopId}, keeping shop definition inventory`);
      }

      const savedDate = shopData.lastSaved ? new Date(shopData.lastSaved).toLocaleString() : 'unknown';
      logger.log(`Loaded inventory for shop: ${shop.name} (${shopId}) - last saved: ${savedDate}`);
      return true;
    } catch (err) {
      logger.error(`Failed to load shop inventory for ${shopId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Save all shop inventories to disk (async)
   * @returns {Promise<Object>} {successCount: number, errorCount: number}
   */
  async saveAllShops() {
    let successCount = 0;
    let errorCount = 0;

    for (const [shopId, shop] of this.shops) {
      if (await this.saveShopInventory(shopId)) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    logger.log(`Saved ${successCount} shop inventories (${errorCount} errors)`);
    return { successCount, errorCount };
  }

  /**
   * Load all shop inventories from disk (async)
   * @returns {Promise<Object>} {successCount: number, errorCount: number}
   */
  async loadAllShops() {
    let successCount = 0;
    let errorCount = 0;

    for (const [shopId, shop] of this.shops) {
      if (await this.loadShopInventory(shopId)) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    logger.log(`Loaded ${successCount} shop inventories (${errorCount} errors)`);
    return { successCount, errorCount };
  }

  /**
   * Get shop inventory with prices
   * @param {string} shopId - Shop ID
   * @returns {Array<Object>} Array of {item, quantity, price}
   */
  getShopInventory(shopId) {
    const shop = this.getShop(shopId);
    if (!shop) {
      return [];
    }

    const inventory = [];

    for (const entry of shop.inventory) {
      // Skip out-of-stock items (defensive filter)
      if (!shop.unlimited && (!entry.quantity || entry.quantity <= 0)) {
        continue;
      }

      const itemDef = ItemRegistry.getItem(entry.itemId);
      if (!itemDef) {
        logger.error(`Shop ${shopId} has invalid item: ${entry.itemId}`);
        continue;
      }

      // Create temporary instance to get pricing
      const instance = ItemFactory.createItem(itemDef);
      const basePrice = instance.getValue(false);
      const price = entry.price !== undefined ? entry.price : Math.floor(basePrice * shop.markup);

      inventory.push({
        itemId: entry.itemId,
        item: instance,
        quantity: shop.unlimited ? Infinity : entry.quantity,
        price: price,
        currency: CurrencyManager.fromCopper(price)
      });
    }

    return inventory;
  }

  /**
   * Buy an item from a shop
   * @param {Object} player - Player object
   * @param {string} shopId - Shop ID
   * @param {string} itemKeyword - Item keyword to buy
   * @param {number} [quantity=1] - Quantity to buy
   * @returns {Promise<Object>} {success: boolean, message: string, item?: BaseItem}
   */
  async buyItem(player, shopId, itemKeyword, quantity = 1) {
    const shop = this.getShop(shopId);
    if (!shop) {
      return { success: false, message: 'Shop not found.' };
    }

    // Find item in shop inventory
    const shopInventory = this.getShopInventory(shopId);
    const normalizedKeyword = itemKeyword.toLowerCase();

    const shopEntry = shopInventory.find(entry => {
      const itemName = entry.item.name.toLowerCase();
      const keywords = entry.item.keywords.map(kw => kw.toLowerCase());
      return itemName.includes(normalizedKeyword) || keywords.includes(normalizedKeyword);
    });

    if (!shopEntry) {
      return { success: false, message: `${shop.name} doesn't sell that item.` };
    }

    // Check if shop has enough stock
    if (!shop.unlimited && shopEntry.quantity < quantity) {
      return {
        success: false,
        message: `${shop.name} only has ${shopEntry.quantity} ${shopEntry.item.name} in stock.`
      };
    }

    // Calculate total cost
    const totalCost = shopEntry.price * quantity;
    const totalCurrency = CurrencyManager.fromCopper(totalCost);

    // Check if player has enough money
    const playerWallet = CurrencyManager.getWallet(player);
    if (!CurrencyManager.hasEnough(playerWallet, totalCost)) {
      return {
        success: false,
        message: `You need ${CurrencyManager.format(totalCost)} but only have ${CurrencyManager.format(playerWallet)}.`
      };
    }

    // Create item instance(s)
    const purchasedItems = [];
    for (let i = 0; i < quantity; i++) {
      const item = ItemFactory.createItem(shopEntry.itemId);
      purchasedItems.push(item);
    }

    // Check if player can carry items
    for (const item of purchasedItems) {
      const canAdd = InventoryManager.canAddItem(player, item);
      if (!canAdd.canAdd) {
        return {
          success: false,
          message: `You can't carry that. ${canAdd.reason}`
        };
      }
    }

    // Remove currency from player
    const removeResult = CurrencyManager.removeFromWallet(player, totalCost);
    if (!removeResult.success) {
      return removeResult;
    }

    // Add items to player inventory
    for (const item of purchasedItems) {
      const addResult = InventoryManager.addItem(player, item);
      if (!addResult.success) {
        // This shouldn't happen since we checked canAddItem, but just in case
        logger.error(`Failed to add purchased item: ${addResult.reason}`);
        // Refund the player
        CurrencyManager.addToWallet(player, totalCost);
        return { success: false, message: 'Transaction failed. Currency refunded.' };
      }
    }

    // Update shop inventory if not unlimited
    if (!shop.unlimited) {
      // Re-validate quantity hasn't changed (race condition check)
      const currentEntry = shop.inventory.find(e => e.itemId === shopEntry.itemId);
      if (!currentEntry || currentEntry.quantity < quantity) {
        // Undo the transaction - remove items and refund
        for (const item of purchasedItems) {
          InventoryManager.removeItem(player, item.instanceId);
        }
        CurrencyManager.addToWallet(player, totalCost);
        return {
          success: false,
          message: `Sorry, ${shop.name} just sold out of ${shopEntry.item.name}.`
        };
      }

      // Safe to decrement now
      currentEntry.quantity -= quantity;

      // Remove item from shop inventory when out of stock
      if (currentEntry.quantity <= 0) {
        const index = shop.inventory.indexOf(currentEntry);
        if (index !== -1) {
          shop.inventory.splice(index, 1);
          logger.log(`Removed ${shopEntry.itemId} from ${shop.name} inventory (out of stock)`);
        }
      }
    }

    // Save shop inventory to disk (async, no need to await)
    this.saveShopInventory(shopId).catch(err => {
      logger.error(`Failed to save shop inventory after buy: ${err.message}`);
    });

    logger.log(`Player ${player.username} bought ${quantity}x ${shopEntry.item.name} from ${shop.name} for ${CurrencyManager.format(totalCost)}`);

    return {
      success: true,
      message: `You buy ${quantity > 1 ? quantity + 'x ' : ''}${shopEntry.item.name} for ${CurrencyManager.format(totalCost)}.`,
      items: purchasedItems
    };
  }

  /**
   * Sell an item to a shop
   * @param {Object} player - Player object
   * @param {string} shopId - Shop ID
   * @param {string} itemKeyword - Item keyword to sell
   * @param {number} [quantity=1] - Quantity to sell
   * @returns {Promise<Object>} {success: boolean, message: string, payment?: number}
   */
  async sellItem(player, shopId, itemKeyword, quantity = 1) {
    const shop = this.getShop(shopId);
    if (!shop) {
      return { success: false, message: 'Shop not found.' };
    }

    // Find item in player inventory
    const items = InventoryManager.findItemsByKeyword(player, itemKeyword);
    if (items.length === 0) {
      return { success: false, message: `You don't have that item.` };
    }

    // For stackable items, can sell from one stack
    // For non-stackable, sell individual items
    const itemsToSell = [];
    let remainingQuantity = quantity;

    for (const item of items) {
      if (remainingQuantity <= 0) break;

      if (item.isStackable) {
        const sellFromStack = Math.min(remainingQuantity, item.quantity);
        itemsToSell.push({ item, quantityToSell: sellFromStack });
        remainingQuantity -= sellFromStack;
      } else {
        itemsToSell.push({ item, quantityToSell: 1 });
        remainingQuantity -= 1;
      }
    }

    if (itemsToSell.length === 0) {
      return { success: false, message: `You don't have enough to sell.` };
    }

    // Check if items can be sold
    for (const { item } of itemsToSell) {
      if (item.isQuestItem) {
        return { success: false, message: `You can't sell quest items.` };
      }

      if (item.boundTo && item.boundTo !== player.username) {
        return { success: false, message: `You can't sell items bound to someone else.` };
      }

      if (item.isEquipped) {
        return { success: false, message: `You must unequip ${item.name} before selling it.` };
      }
    }

    // Calculate total payment
    let totalValue = 0;
    for (const { item, quantityToSell } of itemsToSell) {
      const itemValue = item.getValue(true); // Apply shop buyback percentage
      totalValue += itemValue * quantityToSell;
    }

    if (totalValue === 0) {
      return { success: false, message: `${shop.name} won't buy that item.` };
    }

    // Remove items from inventory
    for (const { item, quantityToSell } of itemsToSell) {
      if (item.isStackable && item.quantity > quantityToSell) {
        // Reduce stack
        item.quantity -= quantityToSell;
        item.modifiedAt = Date.now();
      } else {
        // Remove entire item
        InventoryManager.removeItem(player, item.instanceId);
      }
    }

    // Add currency to player
    CurrencyManager.addToWallet(player, totalValue);

    // Add sold items to shop inventory for resale
    for (const { item, quantityToSell } of itemsToSell) {
      // Calculate resale price (shop markup over buyback price)
      const buybackPrice = item.getValue(true); // What shop paid
      const resalePrice = Math.floor(buybackPrice / shop.buyback); // Original full value

      // Find existing inventory entry for this item
      const existingEntry = shop.inventory.find(entry => entry.itemId === item.definitionId);

      if (existingEntry) {
        // Item already in shop inventory - increase quantity
        if (!shop.unlimited) {
          existingEntry.quantity += quantityToSell;
        }
      } else {
        // New item - add to shop inventory
        shop.inventory.push({
          itemId: item.definitionId,
          quantity: shop.unlimited ? Infinity : quantityToSell,
          price: resalePrice
        });
      }
    }

    // Save shop inventory to disk (async, no need to await)
    this.saveShopInventory(shopId).catch(err => {
      logger.error(`Failed to save shop inventory after sell: ${err.message}`);
    });

    const itemName = itemsToSell[0].item.name;
    const totalQuantitySold = itemsToSell.reduce((sum, {quantityToSell}) => sum + quantityToSell, 0);

    logger.log(`Player ${player.username} sold ${totalQuantitySold}x ${itemName} to ${shop.name} for ${CurrencyManager.format(totalValue)}`);

    return {
      success: true,
      message: `You sell ${totalQuantitySold > 1 ? totalQuantitySold + 'x ' : ''}${itemName} for ${CurrencyManager.format(totalValue)}.`,
      payment: totalValue
    };
  }

  /**
   * Get the value of an item if sold to shop
   * @param {Object} player - Player object
   * @param {string} shopId - Shop ID
   * @param {string} itemKeyword - Item keyword
   * @returns {Object} {success: boolean, message: string, value?: number}
   */
  valueItem(player, shopId, itemKeyword) {
    const shop = this.getShop(shopId);
    if (!shop) {
      return { success: false, message: 'Shop not found.' };
    }

    const item = InventoryManager.findItemByKeyword(player, itemKeyword);
    if (!item) {
      return { success: false, message: `You don't have that item.` };
    }

    if (item.isQuestItem) {
      return { success: false, message: 'Quest items have no value to shops.' };
    }

    const value = item.getValue(true); // With shop buyback percentage

    if (value === 0) {
      return { success: false, message: `${shop.name} won't buy that item.` };
    }

    return {
      success: true,
      message: `${shop.name} will pay ${CurrencyManager.format(value)} for ${item.name}.`,
      value: value
    };
  }

  /**
   * Identify an item for a fee
   * @param {Object} player - Player object
   * @param {string} shopId - Shop ID
   * @param {string} itemKeyword - Item keyword
   * @returns {Object} {success: boolean, message: string}
   */
  identifyItem(player, shopId, itemKeyword) {
    const shop = this.getShop(shopId);
    if (!shop) {
      return { success: false, message: 'Shop not found.' };
    }

    if (!shop.services.identify) {
      return { success: false, message: `${shop.name} doesn't offer identification services.` };
    }

    const item = InventoryManager.findItemByKeyword(player, itemKeyword);
    if (!item) {
      return { success: false, message: `You don't have that item.` };
    }

    if (item.isIdentified) {
      return { success: false, message: `${item.name} is already identified.` };
    }

    const cost = item.getIdentificationCost();
    if (cost === 0) {
      return { success: false, message: `${item.name} doesn't need identification.` };
    }

    // Check if player has enough money
    const playerWallet = CurrencyManager.getWallet(player);
    if (!CurrencyManager.hasEnough(playerWallet, cost)) {
      return {
        success: false,
        message: `Identification costs ${CurrencyManager.format(cost)}, but you only have ${CurrencyManager.format(playerWallet)}.`
      };
    }

    // Remove currency
    const removeResult = CurrencyManager.removeFromWallet(player, cost);
    if (!removeResult.success) {
      return removeResult;
    }

    // Identify the item
    item.onIdentify(player);

    logger.log(`Player ${player.username} identified ${item.name} at ${shop.name} for ${CurrencyManager.format(cost)}`);

    return {
      success: true,
      message: `You pay ${CurrencyManager.format(cost)} to identify ${item.name}.`
    };
  }

  /**
   * Repair an item for a fee
   * @param {Object} player - Player object
   * @param {string} shopId - Shop ID
   * @param {string} itemKeyword - Item keyword
   * @returns {Object} {success: boolean, message: string}
   */
  repairItem(player, shopId, itemKeyword) {
    const shop = this.getShop(shopId);
    if (!shop) {
      return { success: false, message: 'Shop not found.' };
    }

    if (!shop.services.repair) {
      return { success: false, message: `${shop.name} doesn't offer repair services.` };
    }

    const item = InventoryManager.findItemByKeyword(player, itemKeyword);
    if (!item) {
      return { success: false, message: `You don't have that item.` };
    }

    if (!item.maxDurability || item.durability === null) {
      return { success: false, message: `${item.name} cannot be repaired.` };
    }

    if (item.durability === item.maxDurability) {
      return { success: false, message: `${item.name} is already in perfect condition.` };
    }

    const cost = item.getRepairCost();
    if (cost === 0) {
      return { success: false, message: `${item.name} doesn't need repair.` };
    }

    // Check if player has enough money
    const playerWallet = CurrencyManager.getWallet(player);
    if (!CurrencyManager.hasEnough(playerWallet, cost)) {
      return {
        success: false,
        message: `Repair costs ${CurrencyManager.format(cost)}, but you only have ${CurrencyManager.format(playerWallet)}.`
      };
    }

    // Remove currency
    const removeResult = CurrencyManager.removeFromWallet(player, cost);
    if (!removeResult.success) {
      return removeResult;
    }

    // Repair the item
    const oldDurability = item.durability;
    item.repair(item.maxDurability);

    logger.log(`Player ${player.username} repaired ${item.name} at ${shop.name} for ${CurrencyManager.format(cost)} (${oldDurability} -> ${item.durability})`);

    return {
      success: true,
      message: `You pay ${CurrencyManager.format(cost)} to repair ${item.name} to perfect condition.`
    };
  }

  /**
   * List all registered shops
   * @returns {Array<Object>} Array of shop objects
   */
  getAllShops() {
    return Array.from(this.shops.values());
  }
}

// Export singleton instance
module.exports = new ShopManager();
