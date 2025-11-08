/**
 * Sell command - Sell an item to a shop
 */

const colors = require('../../colors');
const ShopManager = require('../../systems/economy/ShopManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');
const CurrencyManager = require('../../systems/economy/CurrencyManager');

/**
 * Execute sell command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
async function execute(player, args, context) {
  if (args.length === 0) {
    player.send(colors.error('\nSell what? Usage: sell <item> [quantity]\n'));
    return;
  }

  // Parse quantity if provided
  let quantity = 1;
  let itemKeyword = args.join(' ');

  // Check if first arg is a number
  const firstNum = parseInt(args[0], 10);
  if (!isNaN(firstNum) && firstNum > 0) {
    quantity = firstNum;
    itemKeyword = args.slice(1).join(' ');
  } else {
    // Check if last arg is a number
    const lastNum = parseInt(args[args.length - 1], 10);
    if (!isNaN(lastNum) && lastNum > 0) {
      quantity = lastNum;
      itemKeyword = args.slice(0, -1).join(' ');
    }
  }

  if (!itemKeyword) {
    player.send(colors.error('\nSell what? Please specify an item.\n'));
    return;
  }

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

  const result = await ShopManager.sellItem(player, shopId, itemKeyword, quantity);

  if (result.success) {
    // Save inventory and currency to database
    const { playerDB } = context;
    if (playerDB) {
      const serialized = InventorySerializer.serializeInventory(player);
      playerDB.updatePlayerInventory(player.username, serialized);

      const wallet = CurrencyManager.getWallet(player);
      playerDB.updatePlayerCurrency(player.username, wallet);
    }

    player.send('\n' + colors.success(result.message) + '\n');
  } else {
    player.send('\n' + colors.error(result.message) + '\n');
  }
}

module.exports = {
  name: 'sell',
  aliases: [],
  description: 'Sell an item to a shop',
  usage: 'sell <item> [quantity]',
  execute
};
