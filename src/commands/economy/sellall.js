/**
 * Sell All command - Sell all unequipped items to a shop
 */

const colors = require('../../colors');
const ShopManager = require('../../systems/economy/ShopManager');
const CurrencyManager = require('../../systems/economy/CurrencyManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');

/**
 * Execute sellall command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  // Find shop in current room
  const { world } = context;
  let shopId = null;

  if (world) {
    const room = world.getRoom(player.currentRoom);
    if (room && room.shop) {
      shopId = room.shop;
    }
  }

  if (!shopId) {
    player.send(colors.error('\nThere is no shop here.\n'));
    return;
  }

  // Find all sellable items in inventory
  const sellableItems = [];

  if (player.inventory && player.inventory.length > 0) {
    for (const item of player.inventory) {
      // Only process new item system items
      if (item && typeof item === 'object' && item.instanceId) {
        // Skip equipped items
        if (item.equipped || item.isEquipped) {
          continue;
        }

        // Skip quest items
        if (item.isQuestItem) {
          continue;
        }

        // Skip bound items
        if (item.isBound) {
          continue;
        }

        // Skip items with zero or negative value
        const itemValue = item.getValue(true); // Get sell value (with buyback)
        if (itemValue <= 0) {
          continue;
        }

        sellableItems.push(item);
      }
    }
  }

  if (sellableItems.length === 0) {
    player.send('\n' + colors.info('You have nothing to sell.\n'));
    player.send(colors.hint('(Quest items, bound items, and equipped items cannot be sold)\n'));
    return;
  }

  // Confirm sale
  player.send('\n' + colors.warning(`You are about to sell ${sellableItems.length} item(s):\n`));

  let totalValue = 0;
  const itemSummary = [];

  for (const item of sellableItems) {
    const itemValue = item.getValue(true);
    const quantity = item.quantity || 1;
    const totalItemValue = itemValue * quantity;
    totalValue += totalItemValue;

    const displayName = item.getDisplayName();
    const priceText = CurrencyManager.format(totalItemValue);

    if (quantity > 1) {
      itemSummary.push(`  - ${displayName} x${quantity} - ${priceText}`);
    } else {
      itemSummary.push(`  - ${displayName} - ${priceText}`);
    }
  }

  // Show first 10 items, then "and X more..."
  const displayLimit = 10;
  if (itemSummary.length > displayLimit) {
    player.send(itemSummary.slice(0, displayLimit).join('\n') + '\n');
    player.send(colors.subtle(`  ... and ${itemSummary.length - displayLimit} more items\n`));
  } else {
    player.send(itemSummary.join('\n') + '\n');
  }

  player.send('\n' + colors.highlight(`Total value: ${CurrencyManager.format(totalValue)}\n`));
  player.send(colors.hint('Use "sellall confirm" to proceed, or just wait to cancel.\n'));

  // Store pending sale in player object (temporary)
  player.pendingSellAll = {
    shopId: shopId,
    items: sellableItems,
    totalValue: totalValue,
    timestamp: Date.now()
  };

  // Set a timeout to clear the pending sale (30 seconds)
  setTimeout(() => {
    if (player.pendingSellAll && player.pendingSellAll.timestamp === player.pendingSellAll.timestamp) {
      delete player.pendingSellAll;
    }
  }, 30000);
}

/**
 * Confirm and execute the sell all operation
 * @param {Object} player - The player object
 * @param {Object} context - Command context
 */
function confirmSellAll(player, context) {
  if (!player.pendingSellAll) {
    player.send('\n' + colors.error('No pending sale to confirm.\n'));
    player.send(colors.hint('Use "sellall" first to see what will be sold.\n'));
    return;
  }

  const { shopId, items, totalValue } = player.pendingSellAll;

  // Track results
  let soldCount = 0;
  let failedCount = 0;
  let earnedCopper = 0;

  player.send('\n' + colors.info('Selling items...\n'));

  // Sell each item directly (bypassing keyword search)
  for (const item of items) {
    const quantity = item.quantity || 1;

    // Validate item can still be sold (might have been equipped since sellall was called)
    if (item.isEquipped || item.equipped) {
      failedCount++;
      continue;
    }
    if (item.isQuestItem) {
      failedCount++;
      continue;
    }
    if (item.isBound) {
      failedCount++;
      continue;
    }

    const itemValue = item.getValue(true);
    if (itemValue <= 0) {
      failedCount++;
      continue;
    }

    // Calculate total payment for this item
    const totalItemValue = itemValue * quantity;

    // Remove from inventory
    const InventoryManager = require('../../systems/inventory/InventoryManager');
    if (item.isStackable && item.quantity > quantity) {
      // Reduce stack
      item.quantity -= quantity;
      item.modifiedAt = Date.now();
    } else {
      // Remove entire item
      InventoryManager.removeItem(player, item.instanceId);
    }

    // Add to shop inventory
    const shop = ShopManager.getShop(shopId);
    if (shop) {
      const resalePrice = Math.floor(itemValue / shop.buyback);
      const existingEntry = shop.inventory.find(entry => entry.itemId === item.definitionId);

      if (existingEntry) {
        if (!shop.unlimited) {
          existingEntry.quantity += quantity;
        }
      } else {
        shop.inventory.push({
          itemId: item.definitionId,
          quantity: shop.unlimited ? Infinity : quantity,
          price: resalePrice
        });
      }
    }

    earnedCopper += totalItemValue;
    soldCount++;
  }

  // Add currency to player
  const CurrencyManager = require('../../systems/economy/CurrencyManager');
  CurrencyManager.addToWallet(player, earnedCopper);

  // Clear pending sale
  delete player.pendingSellAll;

  // Save inventory and currency to database
  if (context.playerDB) {
    const serialized = InventorySerializer.serializeInventory(player);
    context.playerDB.updatePlayerInventory(player.username, serialized);

    const wallet = CurrencyManager.getWallet(player);
    context.playerDB.updatePlayerCurrency(player.username, wallet);
  }

  // Show results
  player.send('\n' + colors.success(`Sold ${soldCount} item(s) for ${CurrencyManager.format(earnedCopper)}!\n`));

  if (failedCount > 0) {
    player.send(colors.warning(`Failed to sell ${failedCount} item(s).\n`));
  }

  // Show new balance
  const wallet = CurrencyManager.getWallet(player);
  player.send(colors.info(`New balance: ${CurrencyManager.format(CurrencyManager.toCopper(wallet))}\n`));
}

module.exports = {
  name: 'sellall',
  aliases: ['selleverything', 'bulksell'],
  description: 'Sell all unequipped items to a shop',
  usage: 'sellall [confirm]',
  execute: function(player, args, context) {
    // Check if this is a confirmation
    if (args.length > 0 && (args[0].toLowerCase() === 'confirm' || args[0].toLowerCase() === 'yes')) {
      confirmSellAll(player, context);
    } else {
      execute(player, args, context);
    }
  }
};
