/**
 * Attune Command
 *
 * Allows players to attune to magical items requiring attunement.
 * Attunement is required to access magical properties of certain rare/legendary items.
 * Players have a limited number of attunement slots (default: 3).
 *
 * Usage:
 *   attune           - Show attunement status
 *   attune list      - Show attunement status (alias)
 *   attune <item>    - Attune to an item
 *   attune to <item> - Attune to an item (explicit)
 *   attune break <item> - Break attunement with an item
 */

const colors = require('../../colors');
const AttunementManager = require('../../systems/equipment/AttunementManager');

/**
 * Execute the attune command
 * @param {Object} player - Player object
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const { playerDB } = context;

  // Show attunement status if no args
  if (args.length === 0 || args[0].toLowerCase() === 'list' || args[0].toLowerCase() === 'status') {
    showAttunementStatus(player);
    return;
  }

  // Handle "attune to <item>" syntax
  let keyword;
  let subcommand = null;

  if (args[0].toLowerCase() === 'to') {
    // "attune to <item>"
    keyword = args.slice(1).join(' ').toLowerCase();
    if (!keyword) {
      player.send('\n' + colors.error('Attune to what?\n'));
      player.send(colors.hint('Usage: attune to <item>\n'));
      return;
    }
  } else if (args[0].toLowerCase() === 'break') {
    // "attune break <item>"
    subcommand = 'break';
    keyword = args.slice(1).join(' ').toLowerCase();
    if (!keyword) {
      player.send('\n' + colors.error('Break attunement with what?\n'));
      player.send(colors.hint('Usage: attune break <item>\n'));
      return;
    }
  } else {
    // "attune <item>"
    keyword = args.join(' ').toLowerCase();
  }

  // Find the item in inventory
  let item = findItemByKeyword(player, keyword);

  if (!item) {
    player.send('\n' + colors.error(`You don't have '${keyword}' in your inventory.\n`));
    return;
  }

  // Handle break attunement
  if (subcommand === 'break') {
    breakAttunement(player, item, playerDB);
    return;
  }

  // Handle attune
  attuneToItem(player, item, playerDB);
}

/**
 * Find item in player inventory by keyword
 * @param {Object} player - Player object
 * @param {string} keyword - Search keyword
 * @returns {Object|null} Item instance or null
 */
function findItemByKeyword(player, keyword) {
  if (!player.inventory || player.inventory.length === 0) {
    return null;
  }

  for (const invItem of player.inventory) {
    if (invItem && typeof invItem === 'object' && invItem.keywords) {
      const exactMatch = invItem.keywords.some(kw => kw.toLowerCase() === keyword);
      const partialMatch = invItem.keywords.some(kw =>
        kw.toLowerCase().includes(keyword) || keyword.includes(kw.toLowerCase())
      );

      if (exactMatch || partialMatch) {
        return invItem;
      }
    }
  }

  return null;
}

/**
 * Attune player to an item
 * @param {Object} player - Player object
 * @param {Object} item - Item instance
 * @param {Object} playerDB - PlayerDB instance
 */
function attuneToItem(player, item, playerDB) {
  // Check if item requires attunement
  if (!item.requiresAttunement) {
    player.send('\n' + colors.error(`${item.name} does not require attunement.\n`));
    return;
  }

  // Check if already attuned to this item
  if (item.isAttuned && item.attunedTo === player.name) {
    player.send('\n' + colors.error(`You are already attuned to ${item.name}.\n`));
    return;
  }

  // Check if item is attuned to someone else
  if (item.isAttuned && item.attunedTo !== player.name) {
    player.send('\n' + colors.error(`${item.name} is attuned to someone else.\n`));
    return;
  }

  // Check available attunement slots
  const maxSlots = AttunementManager.getMaxAttunementSlots(player);
  const usedSlots = AttunementManager.getAttunementSlotsUsed(player.name);
  const availableSlots = maxSlots - usedSlots;

  if (availableSlots <= 0) {
    player.send('\n' + colors.error(`You have no available attunement slots (${usedSlots}/${maxSlots}).\n`));
    player.send(colors.hint('Use "attune break <item>" to free up a slot.\n'));
    return;
  }

  // Attempt attunement
  const result = AttunementManager.attuneToItem(player, item);

  if (!result.success) {
    player.send('\n' + colors.error(result.message + '\n'));
    return;
  }

  // Success!
  player.send('\n' + colors.success(`You attune to ${item.name}.\n`));
  player.send(colors.cyan('You focus your will on the item, binding it to your essence.\n'));

  // Show magical properties awakening if item has them
  if (item.magicEffects && item.magicEffects.length > 0) {
    player.send(colors.magenta('You sense its magical properties awakening...\n'));
  }

  // Show updated slot usage
  const newUsedSlots = AttunementManager.getAttunementSlotsUsed(player.name);
  player.send(colors.hint(`\nAttunement slots: ${newUsedSlots}/${maxSlots}\n`));

  // Recalculate player stats to apply attunement bonuses
  const EquipmentManager = require('../../systems/equipment/EquipmentManager');
  EquipmentManager.recalculatePlayerStats(player);

  // Save player state
  if (playerDB) {
    playerDB.savePlayer(player);
  }
}

/**
 * Break attunement with an item
 * @param {Object} player - Player object
 * @param {Object} item - Item instance
 * @param {Object} playerDB - PlayerDB instance
 */
function breakAttunement(player, item, playerDB) {
  // Check if attuned to this item
  if (!item.isAttuned || item.attunedTo !== player.name) {
    player.send('\n' + colors.error(`You are not attuned to ${item.name}.\n`));
    return;
  }

  // Break the attunement
  const result = AttunementManager.breakAttunement(player, item);

  if (!result.success) {
    player.send('\n' + colors.error(result.message + '\n'));
    return;
  }

  // Success!
  player.send('\n' + colors.cyan(`You break your attunement with ${item.name}.\n`));
  player.send(colors.gray('The magical bond fades as you release your focus.\n'));

  // Show updated slot usage
  const maxSlots = AttunementManager.getMaxAttunementSlots(player);
  const usedSlots = AttunementManager.getAttunementSlotsUsed(player.name);
  player.send(colors.hint(`\nAttunement slots: ${usedSlots}/${maxSlots}\n`));

  // Recalculate player stats (attunement bonuses no longer apply)
  const EquipmentManager = require('../../systems/equipment/EquipmentManager');
  EquipmentManager.recalculatePlayerStats(player);

  // Save player state
  if (playerDB) {
    playerDB.savePlayer(player);
  }
}

/**
 * Show player's attunement status
 * @param {Object} player - Player object
 */
function showAttunementStatus(player) {
  const maxSlots = AttunementManager.getMaxAttunementSlots(player);
  const usedSlots = AttunementManager.getAttunementSlotsUsed(player.name);
  const availableSlots = maxSlots - usedSlots;

  player.send('\n' + colors.cyan('='.repeat(60) + '\n'));
  player.send(colors.yellow('Attunement Status\n'));
  player.send(colors.cyan('='.repeat(60) + '\n\n'));

  player.send(colors.white(`Attunement Slots: ${usedSlots}/${maxSlots}\n`));
  player.send(colors.white(`Available: ${availableSlots}\n\n`));

  // List attuned items
  const attunedItemIds = AttunementManager.getAttunedItems(player.name);

  if (attunedItemIds.size === 0) {
    player.send(colors.gray('You are not attuned to any items.\n'));
  } else {
    player.send(colors.cyan('Attuned Items:\n\n'));

    // Find attuned items in inventory
    for (const itemId of attunedItemIds) {
      const item = player.inventory.find(i => i.instanceId === itemId);
      if (item) {
        player.send(colors.green('  \u2022 ') + colors.white(item.name));

        if (item.isEquipped) {
          player.send(colors.gray(' (equipped)'));
        }

        player.send('\n');
      }
    }
  }

  player.send('\n');
  player.send(colors.hint('Usage:\n'));
  player.send(colors.hint('  attune <item>       - Attune to a magical item\n'));
  player.send(colors.hint('  attune break <item> - Break attunement with an item\n'));
  player.send('\n');
}

module.exports = {
  name: 'attune',
  aliases: ['attunement'],
  execute,
  help: {
    description: 'Attune to magical items to unlock their full power',
    usage: 'attune [item] | attune break <item> | attune list',
    examples: [
      'attune - Show attunement status',
      'attune sword - Attune to a magical sword',
      'attune to ring - Attune to a ring (explicit)',
      'attune break sword - Break attunement with a sword',
      'attune list - Show attuned items'
    ]
  }
};
