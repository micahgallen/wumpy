const colors = require('../colors');
const { DAMAGE_TYPES } = require('./damageTypes');
const EquipmentManager = require('../systems/equipment/EquipmentManager');
const { EquipmentSlot, ItemType } = require('../items/schemas/ItemTypes');

function createHealthBar(currentHp, maxHp, barLength = 20) {
  // Ensure we have valid numbers (handle NaN, undefined, null)
  const current = Math.max(0, Math.floor(Number(currentHp) || 0));
  const max = Math.max(1, Math.floor(Number(maxHp) || 1));
  const percentage = current / max;

  // Calculate filled portion (clamp to valid range)
  const filledLength = Math.max(0, Math.min(barLength, Math.round(barLength * percentage)));
  const emptyLength = Math.max(0, barLength - filledLength);

  // Create bar using block characters
  const filledBar = '#'.repeat(filledLength);
  const emptyBar = '-'.repeat(emptyLength);

  // Color based on health percentage
  let barColor;
  if (percentage > 0.6) {
    barColor = colors.MUD_COLORS.SUCCESS; // Green
  } else if (percentage > 0.3) {
    barColor = colors.MUD_COLORS.WARNING; // Yellow
  } else {
    barColor = colors.MUD_COLORS.ERROR; // Red
  }

  const coloredBar = colors.colorize(filledBar + emptyBar, barColor);
  const hpText = colors.hint(` ${current}/${max} HP`);

  return coloredBar + hpText;
}

/**
 * Get weapon name for attacker
 * @param {Object} attacker - Attacker entity
 * @param {string} hand - 'main_hand' or 'off_hand'
 * @returns {string} Weapon name or 'fists'
 */
function getWeaponName(attacker, hand = 'main_hand') {
  if (!attacker.inventory) {
    return 'their weapon';
  }

  const slot = hand === 'off_hand' ? EquipmentSlot.OFF_HAND : EquipmentSlot.MAIN_HAND;
  const weapon = EquipmentManager.getEquippedInSlot(attacker, slot);

  if (weapon && weapon.itemType === ItemType.WEAPON) {
    return weapon.name;
  }

  return 'their fists';
}

function getAttackMessage(attacker, defender, hit, critical, hand = 'main_hand') {
  // Use capname for players, name for NPCs
  const attackerName = attacker.getDisplayName ? attacker.getDisplayName() : attacker.name;
  const defenderName = defender.getDisplayName ? defender.getDisplayName() : defender.name;
  const weaponName = getWeaponName(attacker, hand);

  if (critical) {
    return colors.critical(`${attackerName} lands a CRITICAL HIT on ${defenderName} with ${weaponName}!`);
  }

  if (hit) {
    const messages = [
      `${attackerName} strikes ${defenderName} with ${weaponName}!`,
      `${attackerName} hits ${defenderName} solidly with ${weaponName}!`,
      `${attackerName} lands a blow on ${defenderName} using ${weaponName}!`
    ];
    return colors.hit(messages[Math.floor(Math.random() * messages.length)]);
  } else {
    const messages = [
      `${attackerName} swings ${weaponName} at ${defenderName} but misses!`,
      `${defenderName} dodges ${attackerName}'s attack with ${weaponName}!`,
      `${attackerName}'s attack with ${weaponName} goes wide!`
    ];
    return colors.miss(messages[Math.floor(Math.random() * messages.length)]);
  }
}

function getDamageMessage(damage, damageType, target = null) {
  const typeInfo = DAMAGE_TYPES[damageType];
  const colorFn = colors[typeInfo.color] || colors.damage;
  let message = colorFn(`${damage} ${typeInfo.name} damage!`);

  // Add HP bar if target is provided
  if (target && target.hp !== undefined && target.maxHp !== undefined) {
    // Use capname for players, name for NPCs
    const targetName = target.getDisplayName ? target.getDisplayName() : target.name;
    const hpBar = createHealthBar(target.hp, target.maxHp);
    message += `\n${colors.hint(targetName + ':')} ${hpBar}`;
  }

  return message;
}

function getDeathMessage(combatant) {
  // Use capname for players, name for NPCs
  const name = combatant.getDisplayName ? combatant.getDisplayName() : combatant.name;

  if (combatant.deathMessages && combatant.deathMessages.length > 0) {
    const msg = combatant.deathMessages[Math.floor(Math.random() * combatant.deathMessages.length)];
    return msg.replace('{npc}', name);
  }

  return colors.combat(`${name} has been defeated!`);
}

module.exports = {
  getAttackMessage,
  getDamageMessage,
  getDeathMessage,
  createHealthBar
};
