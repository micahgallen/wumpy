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

  // Stats summary
  output.push(colors.highlight('Combat Stats:'));
  output.push(`  ${colors.dim('Armor Class:')} ${colors.success(ac.totalAC.toString())}`);

  if (ac.breakdown && ac.breakdown.length > 0) {
    for (const line of ac.breakdown) {
      output.push(`    ${colors.dim('└─')} ${colors.dim(line)}`);
    }
  }

  // Dual wielding indicator
  if (EquipmentManager.isDualWielding(player)) {
    output.push(`  ${colors.dim('Combat Style:')} ${colors.info('Dual Wielding')}`);
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

module.exports = {
  name: 'equipment',
  aliases: ['eq', 'worn'],
  description: 'Show your equipped items',
  usage: 'equipment',
  category: 'items',
  execute
};
