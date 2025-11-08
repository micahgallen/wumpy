/**
 * Identify Command
 *
 * Allows players to identify magical items to reveal their hidden properties.
 * Unidentified items have their magical properties hidden and are worth less.
 *
 * NOTE: This is the player-side command for using identification scrolls/spells.
 * For shop identification services, see the economy system commands.
 */

const colors = require('../../colors');
const InventoryManager = require('../../systems/inventory/InventoryManager');

/**
 * Execute the identify command
 * @param {Object} player - Player object
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send('\n' + colors.error('Identify what?\n'));
    player.send(colors.hint('Usage: identify <item>\n'));
    return;
  }

  const keyword = args.join(' ').toLowerCase();

  // Find the item in inventory (search by keywords like examine command does)
  let item = null;

  if (player.inventory && player.inventory.length > 0) {
    for (const invItem of player.inventory) {
      // Check if it's a new item system item
      if (invItem && typeof invItem === 'object' && invItem.keywords) {
        // Check if any keyword matches (exact or partial match)
        const exactMatch = invItem.keywords.some(kw => kw.toLowerCase() === keyword);
        const partialMatch = invItem.keywords.some(kw => kw.toLowerCase().includes(keyword) || keyword.includes(kw.toLowerCase()));

        if (exactMatch || partialMatch) {
          item = invItem;
          break;
        }
      }
    }
  }

  if (!item) {
    player.send('\n' + colors.error(`You don't have '${keyword}' in your inventory.\n`));
    return;
  }

  // Check if item can be identified
  if (!item.hasHiddenProperties()) {
    player.send('\n' + colors.error(`${item.getDisplayName()} has no hidden properties to identify.\n`));
    return;
  }

  // Check if already identified
  if (item.isIdentified) {
    player.send('\n' + colors.error(`${item.getDisplayName()} has already been identified.\n`));
    return;
  }

  // TODO: Future enhancement - require identification scroll or spell
  // For now, players can identify items freely (testing mode)
  // In production, you might want to:
  // 1. Check for identification scroll in inventory and consume it
  // 2. Check for identification spell/skill
  // 3. Require visiting a shop for identification service (economy command)

  // Identify the item
  const success = item.onIdentify(player);

  if (!success) {
    player.send('\n' + colors.error('Failed to identify the item.\n'));
    return;
  }

  player.send('\n' + colors.success(`You have identified ${item.getDisplayName()}!\n\n`));

  // Show the item's full description with revealed properties
  player.send(colors.cyan('=== Identified Properties ===\n'));
  player.send(item.getDescription() + '\n');

  // Show magical properties if any
  if (item.magicalProperties && Object.keys(item.magicalProperties).length > 0) {
    player.send('\n' + colors.magenta('Magical Properties:\n'));
    for (const [key, value] of Object.entries(item.magicalProperties)) {
      player.send(`  ${key}: ${value}\n`);
    }
  }

  // Show stat bonuses if any
  if (item.statBonuses && Object.keys(item.statBonuses).length > 0) {
    player.send('\n' + colors.green('Stat Bonuses:\n'));
    for (const [stat, bonus] of Object.entries(item.statBonuses)) {
      const sign = bonus >= 0 ? '+' : '';
      player.send(`  ${stat.toUpperCase()}: ${sign}${bonus}\n`);
    }
  }

  player.send('\n' + colors.hint('Note: In the future, you may need an identification scroll or spell to identify items.\n'));
  player.send(colors.hint('You can also visit a shop and use the "value" command to get professional identification services.\n'));
}

module.exports = {
  name: 'identify',
  aliases: ['id'],
  execute,
  help: {
    description: 'Identify magical items to reveal their hidden properties',
    usage: 'identify <item>',
    examples: [
      'identify sword - Identify a mysterious sword',
      'id amulet - Identify an amulet (short form)'
    ]
  }
};
