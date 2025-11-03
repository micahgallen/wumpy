function getModifier(statValue) {
  return Math.floor((statValue - 10) / 2);
}

function getProficiencyBonus(level) {
  // D&D 5e progression: +2 at L1, +3 at L5, +4 at L9, etc.
  return 2 + Math.floor((level - 1) / 4);
}

function calculateStatGains(player) {
  const gains = {
    hp: 5,
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0
  };

  // Every 4th level: +1 to primary stat (strength for now, can be class-based later)
  if (player.level % 4 === 0) {
    gains.strength = 1;
  }

  // Every 5th level: +1 to constitution
  if (player.level % 5 === 0) {
    gains.constitution = 1;
  }

  // Every 6th level: +1 to dexterity
  if (player.level % 6 === 0) {
    gains.dexterity = 1;
  }

  return gains;
}

/**
 * Apply stat gains to a player
 * @param {Object} player - Player object
 * @param {Object} gains - Stat gains from calculateStatGains
 */
function applyStatGains(player, gains) {
  if (gains.hp) {
    player.maxHp += gains.hp;
    player.hp += gains.hp; // Heal when leveling up
  }
  if (gains.strength) player.strength += gains.strength;
  if (gains.dexterity) player.dexterity += gains.dexterity;
  if (gains.constitution) player.constitution += gains.constitution;
  if (gains.intelligence) player.intelligence += gains.intelligence;
  if (gains.wisdom) player.wisdom += gains.wisdom;
  if (gains.charisma) player.charisma += gains.charisma;
}

module.exports = { getModifier, getProficiencyBonus, calculateStatGains, applyStatGains };
