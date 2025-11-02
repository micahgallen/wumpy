const colors = require('../colors');
const { DAMAGE_TYPES } = require('./damageTypes');

function createHealthBar(currentHp, maxHp, barLength = 20) {
  // Ensure we have valid numbers
  const current = Math.max(0, Math.floor(currentHp));
  const max = Math.max(1, Math.floor(maxHp));
  const percentage = current / max;

  // Calculate filled portion
  const filledLength = Math.round(barLength * percentage);
  const emptyLength = barLength - filledLength;

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

function getAttackMessage(attacker, defender, hit, critical) {
  const attackerName = attacker.username || attacker.name;
  const defenderName = defender.username || defender.name;

  if (critical) {
    return colors.critical(`${attackerName} lands a CRITICAL HIT on ${defenderName}!`);
  }

  if (hit) {
    const messages = [
      `${attackerName} strikes ${defenderName}!`,
      `${attackerName} hits ${defenderName} solidly!`,
      `${attackerName} lands a blow on ${defenderName}!`
    ];
    return colors.hit(messages[Math.floor(Math.random() * messages.length)]);
  } else {
    const messages = [
      `${attackerName} swings at ${defenderName} but misses!`,
      `${defenderName} dodges ${attackerName}\'s attack!`,
      `${attackerName}\'s attack goes wide!`
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
    const targetName = target.username || target.name;
    const hpBar = createHealthBar(target.hp, target.maxHp);
    message += `\n${colors.hint(targetName + ':')} ${hpBar}`;
  }

  return message;
}

function getDeathMessage(combatant) {
  const name = combatant.username || combatant.name;

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
