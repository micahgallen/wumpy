/**
 * Money command - Display player's currency
 */

const colors = require('../../colors');
const CurrencyManager = require('../../systems/economy/CurrencyManager');

/**
 * Execute money command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments (unused)
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const wallet = CurrencyManager.getWallet(player);
  const totalCopper = CurrencyManager.toCopper(wallet);

  let output = [];
  output.push('\n' + colors.highlight('='.repeat(42)));
  output.push(colors.highlight('  YOUR CURRENCY'));
  output.push(colors.highlight('='.repeat(42)));
  output.push('');

  // Display each currency type with color
  if (wallet.platinum > 0) {
    output.push('  ' + colors.objectName('Platinum:') + ' ' + colors.highlight(wallet.platinum.toString()));
  }
  if (wallet.gold > 0) {
    output.push('  ' + colors.warning('Gold:    ') + ' ' + colors.warning(wallet.gold.toString()));
  }
  if (wallet.silver > 0) {
    output.push('  ' + colors.info('Silver:  ') + ' ' + colors.info(wallet.silver.toString()));
  }
  if (wallet.copper > 0) {
    output.push('  ' + colors.subtle('Copper:  ') + ' ' + colors.subtle(wallet.copper.toString()));
  }

  if (totalCopper === 0) {
    output.push(colors.error('  You have no money.'));
  }

  output.push('');
  output.push(colors.subtle(`Total: ${CurrencyManager.format(totalCopper)}`));
  output.push(colors.highlight('='.repeat(42)) + '\n');

  player.send(output.join('\n'));
}

module.exports = {
  name: 'money',
  aliases: ['currency', 'gold', 'coins', 'wallet', 'purse'],
  description: 'Display your currency',
  usage: 'money',
  execute
};
