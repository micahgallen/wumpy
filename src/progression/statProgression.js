function getModifier(statValue) {
  return Math.floor((statValue - 10) / 2);
}

function getProficiencyBonus(level) {
  // D&D 5e progression: +2 at L1, +3 at L5, +4 at L9, etc.
  return 2 + Math.floor((level - 1) / 4);
}

function calculateStatGains(player) {
  // HP gain formula: 4 base + CON modifier (minimum 1)
  const conMod = getModifier(player.constitution);
  const hpGain = Math.max(1, 4 + conMod);

  const gains = {
    hp: hpGain,
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
 * CRITICAL FIX: Updates baseStats (not equipment-modified stats) for persistence
 *
 * @param {Object} player - Player object
 * @param {Object} gains - Stat gains from calculateStatGains
 */
function applyStatGains(player, gains) {
  if (gains.hp) {
    player.maxHp += gains.hp;
    player.hp += gains.hp; // Heal when leveling up
  }

  // CRITICAL FIX: Initialize baseStats if not present (migration)
  if (!player.baseStats) {
    player.baseStats = {
      strength: player.strength || 10,
      dexterity: player.dexterity || 10,
      constitution: player.constitution || 10,
      intelligence: player.intelligence || 10,
      wisdom: player.wisdom || 10,
      charisma: player.charisma || 10
    };
  }

  // CRITICAL FIX: Update baseStats (these persist to DB)
  // Also update long-name properties for backwards compatibility with old systems
  if (gains.strength) {
    player.baseStats.strength += gains.strength;
    player.strength += gains.strength;
  }
  if (gains.dexterity) {
    player.baseStats.dexterity += gains.dexterity;
    player.dexterity += gains.dexterity;
  }
  if (gains.constitution) {
    player.baseStats.constitution += gains.constitution;
    player.constitution += gains.constitution;
  }
  if (gains.intelligence) {
    player.baseStats.intelligence += gains.intelligence;
    player.intelligence += gains.intelligence;
  }
  if (gains.wisdom) {
    player.baseStats.wisdom += gains.wisdom;
    player.wisdom += gains.wisdom;
  }
  if (gains.charisma) {
    player.baseStats.charisma += gains.charisma;
    player.charisma += gains.charisma;
  }

  // After updating base stats, recalculate effective stats (base + equipment)
  // This ensures short-name properties (str, dex, con) are updated properly
  const EquipmentManager = require('../systems/equipment/EquipmentManager');
  EquipmentManager.recalculatePlayerStats(player);
}

module.exports = { getModifier, getProficiencyBonus, calculateStatGains, applyStatGains };
