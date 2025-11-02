const { rollD20, rollDice } = require('../utils/dice');
const { getModifier, getProficiencyBonus } = require('../progression/statProgression');
const { calculateResistance } = require('./damageTypes');

function getAttackBonus(attacker, damageType) {
  const proficiency = getProficiencyBonus(attacker.level);
  const ability = damageType === 'physical'
    ? getModifier(attacker.strength)
    : getModifier(attacker.dexterity);
  const equipment = 0; // Future: weapon bonus

  return proficiency + ability + equipment;
}

function getArmorClass(defender) {
  const baseAC = 10;
  const dexMod = getModifier(defender.dexterity);
  const armorBonus = 0; // Future: armor equipment

  return baseAC + dexMod + armorBonus;
}

function rollAttack(attacker, defender, damageType = 'physical') {
  const roll = rollD20();
  const bonus = getAttackBonus(attacker, damageType);
  const total = roll + bonus;
  const targetAC = getArmorClass(defender);

  const critical = (roll === 20);
  const criticalMiss = (roll === 1);
  const hit = !criticalMiss && (critical || total >= targetAC);

  return { hit, critical, criticalMiss, roll, total, targetAC };
}

function rollDamage(attacker, damageDice, critical = false) {
  const baseDamage = rollDice(damageDice);
  const finalDamage = critical ? baseDamage * 2 : baseDamage;

  return finalDamage;
}

function applyDamage(target, rawDamage, damageType) {
  const resistance = target.resistances[damageType] || 0;
  const finalDamage = calculateResistance(rawDamage, damageType, target.resistances);

  target.takeDamage(finalDamage);

  return {
    rawDamage,
    resistance,
    finalDamage,
    dead: target.isDead()
  };
}

module.exports = {
  getAttackBonus,
  getArmorClass,
  rollAttack,
  rollDamage,
  applyDamage
};
