const colors = require('../colors');
const { DAMAGE_TYPES } = require('./damageTypes');

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
      `${attackerName} lands a blow on ${defenderName} அளிக்க!`
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

function getDamageMessage(damage, damageType) {
  const typeInfo = DAMAGE_TYPES[damageType];
  const colorFn = colors[typeInfo.color] || colors.damage;
  return colorFn(`${damage} ${typeInfo.name} damage!`);
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
  getDeathMessage
};
