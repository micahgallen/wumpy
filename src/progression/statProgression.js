function getModifier(statValue) {
  return Math.floor((statValue - 10) / 2);
}

function getProficiencyBonus(level) {
  return Math.floor(level / 4) + 1;
}

function calculateStatGains(player) {
  const gains = { hp: 5, strength: 0, dexterity: 0, /* ... */ };

  if (player.level % 4 === 0) {
    gains.strength = 1; // or based on class
  }

  if (player.level % 5 === 0) {
    gains.constitution = 1;
  }

  return gains;
}

module.exports = { getModifier, getProficiencyBonus, calculateStatGains };
