/**
 * Identify Command
 *
 * Allows players to identify magical items to reveal their detailed magical properties.
 * Shows weapon bonuses, armor bonuses, stat modifiers, resistances, and magic effects.
 *
 * Current implementation: Free identification (testing mode)
 * Future enhancement: Require gold cost, identification scroll, or NPC service
 */

const colors = require('../../colors');
const { ItemType } = require('../../items/schemas/ItemTypes');

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

  // Find the item in inventory (search by keywords)
  let item = null;

  if (player.inventory && player.inventory.length > 0) {
    for (const invItem of player.inventory) {
      if (invItem && typeof invItem === 'object' && invItem.keywords) {
        const exactMatch = invItem.keywords.some(kw => kw.toLowerCase() === keyword);
        const partialMatch = invItem.keywords.some(kw =>
          kw.toLowerCase().includes(keyword) || keyword.includes(kw.toLowerCase())
        );

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

  // Check if item is magical (has any magical properties or effects)
  const isMagical = checkIfMagical(item);

  if (!isMagical) {
    player.send('\n' + colors.cyan(`${item.name} is a mundane item with no magical properties.\n`));
    return;
  }

  // Display detailed magical properties
  displayMagicalProperties(player, item);

  // TODO: Future enhancement - charge gold cost
  // const identifyCost = 50; // From itemsConfig
  // if (player.currency.gold < identifyCost) {
  //   player.send(colors.error(`Identification costs ${identifyCost} gold.\n`));
  //   return;
  // }
  // player.currency.gold -= identifyCost;
}

/**
 * Check if item has any magical properties
 * @param {Object} item - Item instance
 * @returns {boolean} True if item is magical
 */
function checkIfMagical(item) {
  // Check weapon magical bonuses
  if (item.weaponProperties?.magicalAttackBonus) return true;
  if (item.weaponProperties?.magicalDamageBonus) return true;

  // Check armor magical bonuses
  if (item.armorProperties?.magicalACBonus) return true;

  // Check stat modifiers
  if (item.statModifiers && Object.values(item.statModifiers).some(v => v !== 0)) return true;

  // Check resistances
  if (item.resistances && Object.keys(item.resistances).length > 0) return true;

  // Check magic effects
  if (item.magicEffects && item.magicEffects.length > 0) return true;

  // Check attunement requirement (if it requires attunement, it's likely magical)
  if (item.requiresAttunement) return true;

  // Check bonus AC (for rings of protection)
  if (item.bonusAC && item.bonusAC > 0) return true;

  return false;
}

/**
 * Display detailed magical properties of an item
 * @param {Object} player - Player object
 * @param {Object} item - Item instance
 */
function displayMagicalProperties(player, item) {
  player.send('\n' + colors.cyan('='.repeat(60) + '\n'));
  player.send(colors.yellow(`Identify: ${item.name}\n`));
  player.send(colors.cyan('='.repeat(60) + '\n\n'));

  // Basic description
  player.send(colors.white(item.description + '\n'));

  // Examine text if available
  if (item.examineText) {
    player.send('\n' + colors.gray(item.examineText + '\n'));
  }

  // Weapon properties
  if (item.itemType === ItemType.WEAPON && item.weaponProperties) {
    player.send('\n' + colors.magenta('Weapon Properties:\n'));
    const wp = item.weaponProperties;

    // Damage
    if (wp.damageDice) {
      let damageStr = `  Damage: ${wp.damageDice}`;
      if (wp.versatileDamageDice) {
        damageStr += ` (${wp.versatileDamageDice} two-handed)`;
      }
      damageStr += ` ${wp.damageType || 'physical'}`;
      player.send(colors.white(damageStr + '\n'));
    }

    // Magical bonuses
    if (wp.magicalAttackBonus) {
      player.send(colors.green(`  +${wp.magicalAttackBonus} to attack rolls\n`));
    }
    if (wp.magicalDamageBonus) {
      player.send(colors.green(`  +${wp.magicalDamageBonus} to damage rolls\n`));
    }

    // Weapon properties
    const props = [];
    if (wp.isFinesse) props.push('finesse (use STR or DEX)');
    if (wp.isLight) props.push('light (can dual-wield)');
    if (wp.isTwoHanded) props.push('two-handed');
    if (wp.isRanged) props.push('ranged');
    if (wp.versatileDamageDice) props.push('versatile');

    if (props.length > 0) {
      player.send(colors.gray(`  Properties: ${props.join(', ')}\n`));
    }
  }

  // Armor properties
  if (item.itemType === ItemType.ARMOR && item.armorProperties) {
    player.send('\n' + colors.magenta('Armor Properties:\n'));
    const ap = item.armorProperties;

    // AC calculation
    let acStr = `  AC: ${ap.baseAC}`;
    if (ap.magicalACBonus) {
      acStr += ` + ${ap.magicalACBonus} (magical)`;
    }

    // DEX modifier info
    if (ap.armorType === 'light') {
      acStr += ' + DEX modifier';
    } else if (ap.armorType === 'medium') {
      acStr += ' + DEX modifier (max +2)';
    }
    // Heavy armor gets no DEX

    player.send(colors.white(acStr + '\n'));

    // Special properties
    if (ap.stealthDisadvantage) {
      player.send(colors.yellow('  Disadvantage on Stealth checks\n'));
    }
    if (ap.strengthRequirement) {
      player.send(colors.gray(`  Requires Strength ${ap.strengthRequirement}\n`));
    }
  }

  // Jewelry bonus AC (rings of protection)
  if (item.bonusAC && item.bonusAC > 0) {
    player.send('\n' + colors.magenta('Protective Magic:\n'));
    player.send(colors.green(`  +${item.bonusAC} bonus to AC\n`));
  }

  // Stat modifiers
  if (item.statModifiers) {
    const hasNonZero = Object.values(item.statModifiers).some(v => v !== 0);
    if (hasNonZero) {
      player.send('\n' + colors.magenta('Stat Bonuses:\n'));
      for (const [stat, bonus] of Object.entries(item.statModifiers)) {
        if (bonus !== 0) {
          const sign = bonus > 0 ? '+' : '';
          player.send(colors.green(`  ${stat.toUpperCase()}: ${sign}${bonus}\n`));
        }
      }
    }
  }

  // Resistances
  if (item.resistances && Object.keys(item.resistances).length > 0) {
    player.send('\n' + colors.magenta('Resistances:\n'));
    for (const [damageType, multiplier] of Object.entries(item.resistances)) {
      const resistPercent = Math.round((1 - multiplier) * 100);
      if (resistPercent > 0) {
        player.send(colors.cyan(`  ${damageType}: ${resistPercent}% resistance\n`));
      }
    }
  }

  // Magic effects
  if (item.magicEffects && item.magicEffects.length > 0) {
    player.send('\n' + colors.magenta('Magical Effects:\n'));
    for (const effect of item.magicEffects) {
      const desc = describeMagicEffect(effect);
      player.send(colors.cyan(`  ${desc}\n`));
    }
  }

  // Attunement status
  if (item.requiresAttunement) {
    player.send('\n');
    if (item.isAttuned && item.attunedTo === player.username) {
      player.send(colors.green('(Attuned)\n'));
    } else if (item.isAttuned) {
      player.send(colors.red('(Attuned to someone else)\n'));
    } else {
      player.send(colors.yellow('(Requires Attunement)\n'));
      player.send(colors.hint('Use "attune ' + item.keywords[0] + '" to attune to this item.\n'));
    }
  }

  // Rarity and value
  player.send('\n');
  player.send(colors.gray(`Rarity: ${item.rarity || 'common'}\n`));
  player.send(colors.gray(`Value: ${item.value} gold\n`));

  player.send('\n');
}

/**
 * Describe a magic effect in readable format
 * @param {Object} effect - Magic effect object
 * @returns {string} Readable description
 */
function describeMagicEffect(effect) {
  switch (effect.type) {
    case 'extra_damage':
      return `Deals an extra ${effect.damageDice} ${effect.damageType} damage ${effect.trigger}`;

    case 'passive_heal':
      return `Restores ${effect.amount} HP ${effect.trigger}`;

    case 'grant_advantage':
      return `Grants advantage ${effect.trigger} (${Math.round(effect.chance * 100)}% chance)`;

    case 'lifesteal':
      return `Heals you for ${Math.round(effect.percent * 100)}% of damage dealt ${effect.trigger}`;

    default:
      return `${effect.type} (${effect.trigger})`;
  }
}

module.exports = {
  name: 'identify',
  aliases: ['id'],
  execute,
  help: {
    description: 'Identify magical items to reveal their detailed properties',
    usage: 'identify <item>',
    examples: [
      'identify sword - Identify a magical sword',
      'id ring - Identify a ring (short form)',
      'identify amulet - See magical properties'
    ]
  }
};
