const DAMAGE_TYPES = {
  physical: { name: 'Physical', color: 'brightRed', icon: '⚔️' },
  fire: { name: 'Fire', color: 'brightYellow', icon: '🔥' },
  // ... all 8 types
};

function calculateResistance(rawDamage, damageType, resistances) {
  const resistance = resistances[damageType] || 0;
  const multiplier = 1 - (resistance / 100);
  return Math.max(0, Math.floor(rawDamage * multiplier));
}

module.exports = { DAMAGE_TYPES, calculateResistance };
