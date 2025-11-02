const { rollD20 } = require('../utils/dice');
const { getModifier } = require('../progression/statProgression');

function rollInitiative(combatant) {
  const dexMod = getModifier(combatant.dexterity);
  return rollD20() + dexMod;
}

function determineTurnOrder(combatants) {
  // Add initiative property to each combatant (mutates in place to preserve methods)
  combatants.forEach(c => {
    c.initiative = rollInitiative(c);
  });

  // Sort by initiative (highest first), then by dexterity for ties
  return combatants.sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }
    return b.dexterity - a.dexterity;
  });
}

module.exports = { rollInitiative, determineTurnOrder };
