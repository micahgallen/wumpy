/**
 * Value command - Check the value of an item
 */

const colors = require('../../colors');
const ShopManager = require('../../systems/economy/ShopManager');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const CurrencyManager = require('../../systems/economy/CurrencyManager');

/**
 * Execute value command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send(colors.error('\nCheck the value of what? Usage: value <item>\n'));
    return;
  }

  const itemKeyword = args.join(' ');
  const item = InventoryManager.findItemByKeyword(player, itemKeyword);

  if (!item) {
    player.send(colors.error('\nYou don\'t have that item.\n'));
    return;
  }

  // Show base value
  const baseValue = item.getBaseValue();
  const currentValue = item.getValue(false); // Full value
  const sellValue = item.getValue(true); // Shop buyback value

  let output = [];
  output.push('\n' + colors.highlight(`=== ${item.name} ===`));
  output.push('');
  output.push(`  Base Value:    ${colors.subtle(CurrencyManager.format(baseValue))}`);
  output.push(`  Current Value: ${colors.info(CurrencyManager.format(currentValue))}`);

  if (item.isQuestItem) {
    output.push(`  Shop Value:    ${colors.error('Quest items cannot be sold')}`);
  } else {
    output.push(`  Shop Value:    ${colors.warning(CurrencyManager.format(sellValue))}`);
  }

  // Show modifiers
  if (item.rarity && item.rarity !== 'common') {
    output.push('');
    output.push(colors.subtle(`  Rarity: ${item.rarity}`));
  }

  if (item.maxDurability && item.durability !== null) {
    const percent = Math.floor((item.durability / item.maxDurability) * 100);
    const conditionText = percent === 100 ? 'Perfect' :
                         percent >= 75 ? 'Excellent' :
                         percent >= 50 ? 'Good' :
                         percent >= 25 ? 'Fair' : 'Poor';
    output.push(colors.subtle(`  Condition: ${conditionText} (${percent}%)`));
  }

  if (!item.isIdentified && item.hasHiddenProperties()) {
    output.push('');
    output.push(colors.warning('  (Unidentified - worth less until identified)'));
  }

  output.push('');

  player.send(output.join('\n'));
}

module.exports = {
  name: 'value',
  aliases: ['worth', 'appraise'],
  description: 'Check the value of an item',
  usage: 'value <item>',
  execute
};
