/**
 * Give Money (Admin Command)
 *
 * Spawns currency for testing purposes
 * Usage: givemoney [amount] [type]
 */

const colors = require('../../colors');
const CurrencyManager = require('../../systems/economy/CurrencyManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');

function execute(player, args, context) {
  // Parse arguments
  let amount = 1000; // Default: 1000 copper
  let currencyType = 'copper';

  if (args.length >= 1) {
    const parsedAmount = parseInt(args[0], 10);
    if (!isNaN(parsedAmount) && parsedAmount > 0) {
      amount = parsedAmount;
    }
  }

  if (args.length >= 2) {
    const type = args[1].toLowerCase();
    if (['copper', 'c', 'silver', 's', 'gold', 'g', 'platinum', 'p'].includes(type)) {
      if (type === 'c') currencyType = 'copper';
      else if (type === 's') currencyType = 'silver';
      else if (type === 'g') currencyType = 'gold';
      else if (type === 'p') currencyType = 'platinum';
      else currencyType = type;
    }
  }

  // Get current wallet
  const currentWallet = CurrencyManager.getWallet(player);

  // Add directly to the specific currency type (no auto-conversion)
  currentWallet[currencyType] = (currentWallet[currencyType] || 0) + amount;

  // Set wallet directly (bypasses auto-conversion)
  CurrencyManager.setWallet(player, currentWallet);

  // Save to database
  const { playerDB } = context;
  if (playerDB) {
    const wallet = CurrencyManager.getWallet(player);
    playerDB.updatePlayerCurrency(player.username, wallet);
  }

  // Show success message
  player.send('\n' + colors.success(`Spawned ${amount} ${currencyType}!\n`));

  const wallet = CurrencyManager.getWallet(player);
  player.send(colors.info(`New balance: ${CurrencyManager.format(CurrencyManager.toCopper(wallet))}\n`));
}

module.exports = {
  name: 'givemoney',
  aliases: ['gm', 'spawnmoney', 'addgold'],
  description: 'Spawn currency for testing (admin)',
  usage: 'givemoney [amount] [type]',
  examples: [
    'givemoney - Give 1000 copper',
    'givemoney 500 - Give 500 copper',
    'givemoney 100 gold - Give 100 gold',
    'givemoney 50 platinum - Give 50 platinum',
    'gm 1000 g - Give 1000 gold (short form)'
  ],
  execute
};
