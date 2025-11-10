/**
 * Tattoo System - Description Modifier Example
 *
 * This module demonstrates a tattoo parlor system where players can get
 * permanent tattoos that appear in their descriptions. Includes costs,
 * removal, and multiple tattoo slots.
 */

const PlayerDescriptionService = require('../../src/systems/description/PlayerDescriptionService');
const colors = require('../../src/colors');

/**
 * Available tattoo designs
 * Each tattoo has a name, description, cost, and rarity
 */
const TATTOO_DESIGNS = {
  dragon: {
    name: 'Dragon',
    description: 'A magnificent dragon tattoo coils up their arm, its scales shimmering with an almost lifelike iridescence.',
    cost: { gold: 50 },
    priority: 60,
    slot: 'arm'
  },
  skull: {
    name: 'Skull',
    description: 'A grinning skull adorns their shoulder, the ink work surprisingly delicate for such a macabre subject.',
    cost: { gold: 30 },
    priority: 60,
    slot: 'shoulder'
  },
  runes: {
    name: 'Mystic Runes',
    description: 'Ancient runes crawl across their forearms, pulsing with eldritch power. They say these tattoos were learned from the Shadowfen witches.',
    cost: { gold: 100 },
    priority: 65,
    slot: 'forearm'
  },
  rose: {
    name: 'Thorned Rose',
    description: 'A blood-red rose winds around their wrist, its thorns drawn so realistically you almost expect them to draw blood.',
    cost: { gold: 25 },
    priority: 58,
    slot: 'wrist'
  },
  phoenix: {
    name: 'Phoenix',
    description: 'A phoenix in flames spreads its wings across their back, the artwork so vivid it seems to move in the light.',
    cost: { gold: 150 },
    priority: 70,
    slot: 'back'
  },
  tribal: {
    name: 'Tribal Bands',
    description: 'Intricate tribal bands encircle their biceps in swirling patterns that speak of ancient traditions best left unquestioned.',
    cost: { gold: 40 },
    priority: 60,
    slot: 'bicep'
  },
  serpent: {
    name: 'Serpent',
    description: 'A serpent winds its way up their leg, scales rendered in painstaking detail. The fangs look disturbingly real.',
    cost: { gold: 45 },
    priority: 60,
    slot: 'leg'
  },
  compass: {
    name: 'Nautical Compass',
    description: 'An ornate compass rose is inked on their chest, pointing toward adventures yet to come. Or possibly just north. It\'s hard to tell.',
    cost: { gold: 35 },
    priority: 60,
    slot: 'chest'
  },
  moon: {
    name: 'Crescent Moon',
    description: 'A silvery crescent moon marks their neck, accompanied by scattered stars. The work has an ethereal, dreamlike quality.',
    cost: { gold: 55 },
    priority: 62,
    slot: 'neck'
  },
  anchor: {
    name: 'Anchor',
    description: 'A ship\'s anchor is tattooed on their forearm, surrounded by nautical rope. It suggests either a sailing background or a deep appreciation for maritime clich\u00e9s.',
    cost: { gold: 30 },
    priority: 58,
    slot: 'forearm'
  }
};

/**
 * Check if player can afford a tattoo
 * @private
 */
function canAffordTattoo(player, design) {
  if (!player.currency) {
    return false;
  }

  const cost = design.cost;
  if (cost.platinum && player.currency.platinum < cost.platinum) return false;
  if (cost.gold && player.currency.gold < cost.gold) return false;
  if (cost.silver && player.currency.silver < cost.silver) return false;
  if (cost.copper && player.currency.copper < cost.copper) return false;

  return true;
}

/**
 * Deduct tattoo cost from player
 * @private
 */
function chargeTattoo(player, design, playerDB) {
  const cost = design.cost;

  if (cost.platinum) player.currency.platinum -= cost.platinum;
  if (cost.gold) player.currency.gold -= cost.gold;
  if (cost.silver) player.currency.silver -= cost.silver;
  if (cost.copper) player.currency.copper -= cost.copper;

  if (playerDB) {
    playerDB.updatePlayerCurrency(player.username, player.currency);
  }
}

/**
 * Get a tattoo
 *
 * @param {Object} player - The player object
 * @param {string} tattooId - The tattoo design ID
 * @param {Object} playerDB - PlayerDB instance
 * @returns {Object} {success: boolean, message: string}
 */
function getTattoo(player, tattooId, playerDB) {
  const design = TATTOO_DESIGNS[tattooId];

  if (!design) {
    return {
      success: false,
      message: colors.error('That tattoo design doesn\'t exist.')
    };
  }

  // Check if player already has a tattoo in that slot
  const existingSource = `tattoo_${design.slot}`;
  if (PlayerDescriptionService.hasDescriptionModifier(player, existingSource)) {
    return {
      success: false,
      message: colors.error(`You already have a tattoo on your ${design.slot}! Remove it first.`)
    };
  }

  // Check if player can afford it
  if (!canAffordTattoo(player, design)) {
    return {
      success: false,
      message: colors.error(`You can't afford that tattoo. It costs ${design.cost.gold || 0} gold.`)
    };
  }

  // Charge the player
  chargeTattoo(player, design, playerDB);

  // Add the tattoo modifier
  PlayerDescriptionService.addDescriptionModifier(
    player,
    design.description,
    existingSource,
    design.priority,
    playerDB
  );

  return {
    success: true,
    message: colors.success('The tattoo artist nods approvingly. "That\'s some fine work, if I do say so myself."')
  };
}

/**
 * Remove a tattoo (costs money!)
 *
 * @param {Object} player - The player object
 * @param {string} slot - The body slot to remove from
 * @param {Object} playerDB - PlayerDB instance
 * @returns {Object} {success: boolean, message: string}
 */
function removeTattoo(player, slot, playerDB) {
  const removalCost = { gold: 20 }; // Removal is expensive
  const source = `tattoo_${slot}`;

  // Check if player has a tattoo in that slot
  if (!PlayerDescriptionService.hasDescriptionModifier(player, source)) {
    return {
      success: false,
      message: colors.error(`You don't have a tattoo on your ${slot}.`)
    };
  }

  // Check if player can afford removal
  if (!player.currency || player.currency.gold < removalCost.gold) {
    return {
      success: false,
      message: colors.error(`Tattoo removal costs ${removalCost.gold} gold. You can't afford it.`)
    };
  }

  // Charge for removal
  player.currency.gold -= removalCost.gold;
  if (playerDB) {
    playerDB.updatePlayerCurrency(player.username, player.currency);
  }

  // Remove the modifier
  PlayerDescriptionService.removeDescriptionModifier(player, source, playerDB);

  return {
    success: true,
    message: colors.success('The tattoo artist grimaces as they work. "This is going to hurt..." And it does. But the tattoo is gone.')
  };
}

/**
 * List available tattoos with prices
 *
 * @returns {string} Formatted list of tattoos
 */
function listTattoos() {
  const lines = [];
  lines.push(colors.highlight('='.repeat(60)));
  lines.push(colors.highlight('  TATTOO PARLOR - Available Designs'));
  lines.push(colors.highlight('='.repeat(60)));
  lines.push('');

  for (const [id, design] of Object.entries(TATTOO_DESIGNS)) {
    const costStr = `${design.cost.gold || 0}g`;
    lines.push(`  ${colors.cyan(design.name.padEnd(20))} ${colors.dim(`[${design.slot}]`)} ${colors.yellow(costStr.padStart(8))}`);
    lines.push(`    ${colors.dim(design.description)}`);
    lines.push('');
  }

  lines.push(colors.dim('  Tattoo removal available for 20g per tattoo.'));
  lines.push(colors.highlight('='.repeat(60)));

  return lines.join('\n');
}

/**
 * Show player's current tattoos
 *
 * @param {Object} player - The player object
 * @returns {string} Formatted list of player's tattoos
 */
function showPlayerTattoos(player) {
  if (!player.descriptionModifiers) {
    return colors.dim('You have no tattoos.');
  }

  const tattoos = player.descriptionModifiers.filter(m => m.source.startsWith('tattoo_'));

  if (tattoos.length === 0) {
    return colors.dim('You have no tattoos.');
  }

  const lines = [];
  lines.push(colors.highlight('Your Tattoos:'));

  for (const tattoo of tattoos) {
    const slot = tattoo.source.replace('tattoo_', '');
    lines.push(`  ${colors.cyan(slot)}: ${colors.dim(tattoo.text)}`);
  }

  return lines.join('\n');
}

/**
 * Get list of available tattoo IDs
 *
 * @returns {Array<string>}
 */
function getAvailableTattooIds() {
  return Object.keys(TATTOO_DESIGNS);
}

/**
 * Get tattoo design info
 *
 * @param {string} tattooId - The tattoo design ID
 * @returns {Object|null}
 */
function getTattooDesign(tattooId) {
  return TATTOO_DESIGNS[tattooId] || null;
}

// Example command implementation:
//
// commands['tattoo'] = {
//   execute: (player, args, context) => {
//     const action = args[0];
//
//     if (!action || action === 'list') {
//       player.send('\n' + listTattoos());
//       return;
//     }
//
//     if (action === 'show' || action === 'view') {
//       player.send('\n' + showPlayerTattoos(player));
//       return;
//     }
//
//     if (action === 'get' || action === 'buy') {
//       const tattooId = args[1];
//       const result = getTattoo(player, tattooId, context.playerDB);
//       player.send('\n' + result.message);
//       return;
//     }
//
//     if (action === 'remove') {
//       const slot = args[1];
//       const result = removeTattoo(player, slot, context.playerDB);
//       player.send('\n' + result.message);
//       return;
//     }
//
//     player.send(colors.error('Usage: tattoo [list|show|get <design>|remove <slot>]'));
//   }
// };

module.exports = {
  TATTOO_DESIGNS,
  getTattoo,
  removeTattoo,
  listTattoos,
  showPlayerTattoos,
  getAvailableTattooIds,
  getTattooDesign
};
