/**
 * List command - View shop inventory
 */

const colors = require('../../colors');
const ShopManager = require('../../systems/economy/ShopManager');
const CurrencyManager = require('../../systems/economy/CurrencyManager');

/**
 * Execute list command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { world } = context;

  // Find shop in current room
  let shopId = args[0]; // Allow explicit shop ID as argument

  // If no shop ID specified, check if current room has a shop
  if (!shopId && world) {
    const room = world.getRoom(player.currentRoom);
    if (room && room.shop) {
      shopId = room.shop;
    }
  }

  // Fall back to default shop if still no shop ID
  if (!shopId) {
    shopId = 'default_shop';
  }

  const shop = ShopManager.getShop(shopId);

  if (!shop) {
    player.send(colors.error('\nThere is no shop here.\n'));
    return;
  }

  const inventory = ShopManager.getShopInventory(shopId);

  let output = [];
  output.push('\n' + colors.highlight('='.repeat(60)));
  output.push(colors.highlight(`  ${shop.name.toUpperCase()}`));
  output.push(colors.highlight('='.repeat(60)));
  output.push('');

  if (shop.description) {
    output.push(colors.subtle(shop.description));
    output.push('');
  }

  if (inventory.length === 0) {
    output.push(colors.info('  The shop has nothing for sale.'));
  } else {
    output.push(colors.info('  Items for sale:'));
    output.push('');

    for (const entry of inventory) {
      const item = entry.item;
      const price = CurrencyManager.format(entry.price);
      const stockText = entry.quantity === Infinity ? '' : ` (${entry.quantity} in stock)`;
      const rarityColor = getRarityColor(item.rarity);

      output.push(`  ${rarityColor(item.name)} - ${colors.warning(price)}${stockText}`);
    }
  }

  output.push('');

  // Show services
  if (shop.services.identify || shop.services.repair) {
    output.push(colors.info('  Services:'));
    if (shop.services.identify) {
      output.push('    - Item identification');
    }
    if (shop.services.repair) {
      output.push('    - Item repair');
    }
    output.push('');
  }

  output.push(colors.subtle('  Use "buy <item>" to purchase an item.'));
  output.push(colors.subtle('  Use "sell <item>" to sell an item.'));
  output.push(colors.subtle('  Use "value <item>" to check what a shop will pay.'));
  output.push(colors.highlight('='.repeat(60)) + '\n');

  player.send(output.join('\n'));
}

/**
 * Get color function for rarity
 * @param {string} rarity - Item rarity
 * @returns {Function} Color function
 */
function getRarityColor(rarity) {
  switch (rarity) {
    case 'uncommon': return colors.info;
    case 'rare': return colors.objectName;
    case 'epic': return colors.highlight;
    case 'legendary': return colors.warning;
    case 'artifact': return colors.error;
    default: return colors.subtle;
  }
}

module.exports = {
  name: 'list',
  aliases: ['shop', 'store', 'wares'],
  description: 'View shop inventory',
  usage: 'list [shopId]',
  execute
};
