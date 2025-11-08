/**
 * Equipment command - Show equipped items
 */

const colors = require('../../colors');
const EquipmentManager = require('../../systems/equipment/EquipmentManager');
const config = require('../../config/itemsConfig');

/**
 * Execute equipment command
 * @param {Object} player - The player object
 * @param {Array} args - Command arguments (unused)
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  const bySlot = EquipmentManager.getEquipmentBySlot(player);
  const ac = EquipmentManager.calculateAC(player);

  const output = [];
  output.push('\n' + colors.highlight('='.repeat(50)));
  output.push(colors.highlight('  EQUIPMENT'));
  output.push(colors.highlight('='.repeat(50)));
  output.push('');

  // Weapons
  output.push(colors.highlight('Weapons:'));
  for (const slot of config.slots.weapon) {
    const item = bySlot[slot];
    const slotName = formatSlotName(slot);
    if (item) {
      let line = `  ${colors.dim(slotName + ':')} ${colors.objectName(item.getDisplayName())}`;

      // Show weapon stats if it's a weapon
      if (item.weaponProperties) {
        const damage = item.weaponProperties.damageDice || '1d4';
        line += colors.dim(` (${damage})`);
      }

      // Show durability warning
      if (item.maxDurability && item.durability !== null) {
        const durabilityPercent = (item.durability / item.maxDurability) * 100;
        if (durabilityPercent < 25) {
          line += colors.error(' [broken!]');
        } else if (durabilityPercent < 50) {
          line += colors.warning(' [worn]');
        }
      }

      // Show attunement
      if (item.requiresAttunement && item.isAttuned) {
        line += colors.dim(' [attuned]');
      }

      output.push(line);
    } else {
      output.push(`  ${colors.dim(slotName + ':')} ${colors.dim('(empty)')}`);
    }
  }
  output.push('');

  // Armor
  output.push(colors.highlight('Armor:'));
  for (const slot of config.slots.armor) {
    const item = bySlot[slot];
    const slotName = formatSlotName(slot);
    if (item) {
      let line = `  ${colors.dim(slotName + ':')} ${colors.objectName(item.getDisplayName())}`;

      // Show AC if it's armor
      if (item.armorProperties && item.armorProperties.baseAC) {
        line += colors.dim(` (AC ${item.armorProperties.baseAC})`);
      }

      // Show durability warning
      if (item.maxDurability && item.durability !== null) {
        const durabilityPercent = (item.durability / item.maxDurability) * 100;
        if (durabilityPercent < 25) {
          line += colors.error(' [broken!]');
        } else if (durabilityPercent < 50) {
          line += colors.warning(' [worn]');
        }
      }

      // Show attunement
      if (item.requiresAttunement && item.isAttuned) {
        line += colors.dim(' [attuned]');
      }

      output.push(line);
    } else {
      output.push(`  ${colors.dim(slotName + ':')} ${colors.dim('(empty)')}`);
    }
  }
  output.push('');

  // Jewelry
  output.push(colors.highlight('Jewelry:'));
  for (const slot of config.slots.jewelry) {
    const item = bySlot[slot];
    const slotName = formatSlotName(slot);
    if (item) {
      let line = `  ${colors.dim(slotName + ':')} ${colors.objectName(item.getDisplayName())}`;

      // Show attunement
      if (item.requiresAttunement && item.isAttuned) {
        line += colors.dim(' [attuned]');
      }

      output.push(line);
    } else {
      output.push(`  ${colors.dim(slotName + ':')} ${colors.dim('(empty)')}`);
    }
  }
  output.push('');

  // Stats summary - Wumpy style!
  output.push(colors.cyan('Combat Stats'));

  // Total AC with fun flavor text
  const acFlavor = getACFlavorText(ac.totalAC);
  output.push(`  ${colors.highlight('Armor Class:')} ${colors.success(ac.totalAC.toString())} ${colors.dim(acFlavor)}`);

  // AC breakdown - clean and readable
  if (ac.breakdown && ac.breakdown.length > 0) {
    output.push('');
    output.push(colors.dim('  AC Breakdown:'));

    for (const line of ac.breakdown) {
      // Format each line with a simple ASCII bullet
      output.push(`    ${colors.cyan('>')} ${colors.dim(line)}`);
    }
  }

  // Dual wielding indicator
  if (EquipmentManager.isDualWielding(player)) {
    output.push('');
    output.push(`  ${colors.dim('Combat Style:')} ${colors.info('Dual Wielding')} ${colors.dim('(fancy!)')}`);
  }

  output.push('');
  output.push(colors.highlight('='.repeat(50)));
  output.push('');

  player.send(output.join('\n'));
}

/**
 * Format slot name for display
 * @param {string} slot - Slot name (e.g., "main_hand")
 * @returns {string} Formatted name (e.g., "Main Hand")
 */
function formatSlotName(slot) {
  return slot
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .padEnd(12);
}

/**
 * Get whimsical flavor text based on AC value
 * @param {number} ac - Armor class value
 * @returns {string} Flavor text
 */
function getACFlavorText(ac) {
  if (ac <= 10) return '(birthday suit)';
  if (ac <= 12) return '(lightly protected)';
  if (ac <= 14) return '(reasonably safe)';
  if (ac <= 16) return '(well armored)';
  if (ac <= 18) return '(quite sturdy!)';
  if (ac <= 20) return '(very impressive!)';
  if (ac <= 22) return '(walking fortress!)';
  if (ac <= 25) return '(practically invincible!)';
  return '(is that even legal?!)';
}

module.exports = {
  name: 'equipment',
  aliases: ['eq', 'worn'],
  description: 'Show your equipped items',
  usage: 'equipment',
  category: 'items',
  execute
};
