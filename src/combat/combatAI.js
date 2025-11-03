/**
 * Determines the action an NPC will take during its turn in combat.
 *
 * @param {object} npc The NPC actor.
 * @param {object} combat The current combat encounter.
 * @returns {string} The action to take ('attack', 'flee').
 */
function determineNPCAction(npc, combat) {
  const hpPercent = npc.hp / npc.maxHp;
  const fleeThreshold = npc.fleeThreshold !== undefined ? npc.fleeThreshold : 0.1;

  // Adjust flee chance by timidity. Higher timidity makes fleeing more likely.
  const timidity = npc.timidity !== undefined ? npc.timidity : 0.5;
  const fleeChance = (1 - hpPercent) + (timidity * 0.5); // Example formula

  if (hpPercent <= fleeThreshold && Math.random() < fleeChance) {
    return 'flee';
  }

  // Future actions can be added here, e.g.:
  // if (npc.canUseSpecialAbility()) {
  //   return 'special_ability';
  // }

  return 'attack';
}

module.exports = {
  determineNPCAction,
};
