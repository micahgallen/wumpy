/**
 * Combat Balance Simulation
 *
 * Simulates thousands of combat rounds to validate AC balance
 * and ensure hit chances align with D&D 5e expectations.
 */

const EquipmentManager = require('../src/systems/equipment/EquipmentManager');
const { resolveAttackRoll } = require('../src/systems/combat/AttackRoll');
const { createParticipant } = require('../src/data/Combat');
const { EquipmentSlot, ItemType, ArmorClass } = require('../src/items/schemas/ItemTypes');

// Helper to create test armor
function createArmor(slot, baseAC, armorClass, magicalBonus = 0) {
  const maxDexMap = {
    [ArmorClass.LIGHT]: 999,
    [ArmorClass.MEDIUM]: 2,
    [ArmorClass.HEAVY]: 0,
    [ArmorClass.SHIELD]: 999
  };

  return {
    instanceId: `armor_${slot}_${Date.now()}_${Math.random()}`,
    name: `${armorClass} ${slot}`,
    itemType: ItemType.ARMOR,
    slot: slot,
    isEquipped: true,
    equippedSlot: slot,
    requiresAttunement: false,
    isAttuned: true,
    armorProperties: {
      baseAC: baseAC,
      armorClass: armorClass,
      armorType: armorClass.toLowerCase(),
      maxDexBonus: maxDexMap[armorClass],
      magicalACBonus: magicalBonus
    },
    getMaxDexBonus: function() {
      return this.armorProperties.maxDexBonus;
    }
  };
}

// Helper to create test weapon
function createWeapon(attackBonus = 0, damageBonus = 0) {
  return {
    instanceId: `weapon_${Date.now()}_${Math.random()}`,
    name: `Test Weapon ${attackBonus > 0 ? '+' + attackBonus : ''}`,
    itemType: ItemType.WEAPON,
    slot: EquipmentSlot.MAIN_HAND,
    isEquipped: true,
    equippedSlot: EquipmentSlot.MAIN_HAND,
    weaponProperties: {
      damageDice: '1d8',
      damageType: 'slashing',
      weaponClass: 'simple_melee',
      isTwoHanded: false,
      isRanged: false,
      isLight: false,
      isFinesse: false,
      magicalAttackBonus: attackBonus,
      magicalDamageBonus: damageBonus
    }
  };
}

// Create character builds
function createRogueBuild() {
  // Rogue: DEX 18 (+4), Light armor, AC should be ~21
  const armor = [
    createArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT),
    createArmor(EquipmentSlot.HEAD, 1, ArmorClass.LIGHT),
    createArmor(EquipmentSlot.LEGS, 1, ArmorClass.LIGHT),
    createArmor(EquipmentSlot.FEET, 1, ArmorClass.LIGHT),
    createArmor(EquipmentSlot.HANDS, 1, ArmorClass.LIGHT)
  ];

  const player = {
    id: 'rogue_1',
    username: 'TestRogue',
    level: 5,
    str: 10,
    dex: 18,
    con: 14,
    int: 12,
    wis: 12,
    cha: 10,
    proficiency: 3,
    inventory: armor,
    currentHp: 35,
    maxHp: 35
  };

  // Initialize baseStats for EquipmentManager
  player.baseStats = {
    strength: 10,
    dexterity: 18,
    constitution: 14,
    intelligence: 12,
    wisdom: 12,
    charisma: 10
  };

  return player;
}

function createFighterBuild() {
  // Fighter: STR 16 (+3), DEX 14 (+2), Medium armor + shield, AC should be ~20-22
  const armor = [
    createArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM),
    createArmor(EquipmentSlot.HEAD, 1, ArmorClass.MEDIUM),
    createArmor(EquipmentSlot.LEGS, 2, ArmorClass.MEDIUM),
    createArmor(EquipmentSlot.FEET, 1, ArmorClass.MEDIUM),
    createArmor(EquipmentSlot.OFF_HAND, 2, ArmorClass.SHIELD) // Shield
  ];

  const player = {
    id: 'fighter_1',
    username: 'TestFighter',
    level: 5,
    str: 16,
    dex: 14,
    con: 16,
    int: 10,
    wis: 10,
    cha: 10,
    proficiency: 3,
    inventory: [...armor, createWeapon(0, 0)],
    currentHp: 45,
    maxHp: 45
  };

  player.baseStats = {
    strength: 16,
    dexterity: 14,
    constitution: 16,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  };

  return player;
}

function createPaladinBuild() {
  // Paladin: STR 16 (+3), DEX 8 (-1), Heavy armor + shield, AC should be ~22-24
  const armor = [
    createArmor(EquipmentSlot.CHEST, 5, ArmorClass.HEAVY),
    createArmor(EquipmentSlot.HEAD, 2, ArmorClass.HEAVY),
    createArmor(EquipmentSlot.LEGS, 2, ArmorClass.HEAVY),
    createArmor(EquipmentSlot.FEET, 1, ArmorClass.HEAVY),
    createArmor(EquipmentSlot.HANDS, 1, ArmorClass.HEAVY),
    createArmor(EquipmentSlot.SHOULDERS, 1, ArmorClass.HEAVY),
    createArmor(EquipmentSlot.OFF_HAND, 2, ArmorClass.SHIELD)
  ];

  const player = {
    id: 'paladin_1',
    username: 'TestPaladin',
    level: 5,
    str: 16,
    dex: 8,
    con: 16,
    int: 10,
    wis: 12,
    cha: 14,
    proficiency: 3,
    inventory: [...armor, createWeapon(0, 0)],
    currentHp: 45,
    maxHp: 45
  };

  player.baseStats = {
    strength: 16,
    dexterity: 8,
    constitution: 16,
    intelligence: 10,
    wisdom: 12,
    charisma: 14
  };

  return player;
}

function createWizardBuild() {
  // Wizard: DEX 16 (+3), no armor (AC 10 + DEX = 13)
  const player = {
    id: 'wizard_1',
    username: 'TestWizard',
    level: 5,
    str: 8,
    dex: 16,
    con: 14,
    int: 18,
    wis: 12,
    cha: 10,
    proficiency: 3,
    inventory: [],
    currentHp: 30,
    maxHp: 30
  };

  player.baseStats = {
    strength: 8,
    dexterity: 16,
    constitution: 14,
    intelligence: 18,
    wisdom: 12,
    charisma: 10
  };

  return player;
}

function createGoblinAttacker() {
  // Goblin: CR 1/4, +4 to hit, attacks at +0 proficiency
  return {
    id: 'goblin_1',
    name: 'Goblin Warrior',
    level: 1,
    str: 8,
    dex: 14,
    con: 10,
    int: 10,
    wis: 8,
    cha: 8,
    proficiency: 2,
    inventory: [createWeapon(0, 0)],
    currentHp: 7,
    maxHp: 7,
    armorClass: 15
  };
}

function createKnightAttacker() {
  // Knight: CR 3, +5 to hit
  return {
    id: 'knight_1',
    name: 'Knight',
    level: 5,
    str: 16,
    dex: 11,
    con: 14,
    int: 11,
    wis: 11,
    cha: 15,
    proficiency: 3,
    inventory: [createWeapon(0, 0)],
    currentHp: 52,
    maxHp: 52,
    armorClass: 18
  };
}

function createDragonAttacker() {
  // Young Dragon: CR 10, +10 to hit
  return {
    id: 'dragon_1',
    name: 'Young Red Dragon',
    level: 10,
    str: 23,
    dex: 10,
    con: 21,
    int: 14,
    wis: 11,
    cha: 19,
    proficiency: 4,
    inventory: [createWeapon(4, 4)], // Magical natural weapon
    currentHp: 178,
    maxHp: 178,
    armorClass: 18
  };
}

// Run combat simulation
function simulateAttacks(attacker, defender, rounds = 1000) {
  let hits = 0;
  let misses = 0;
  let crits = 0;
  let fumbles = 0;

  // Calculate AC once
  EquipmentManager.recalculatePlayerStats(defender);
  const defenderAC = defender.armorClass;

  // Get attacker weapon
  const weapon = attacker.inventory.find(i => i.itemType === ItemType.WEAPON);

  // Calculate attack bonus (using STR for melee)
  const abilityMod = Math.floor((attacker.str - 10) / 2);
  const weaponBonus = weapon?.weaponProperties?.magicalAttackBonus || 0;
  const attackBonus = abilityMod + attacker.proficiency + weaponBonus;

  // Create mock combat participants
  const attackerParticipant = createParticipant(attacker, 'npc');
  const defenderParticipant = createParticipant(defender, 'player');

  for (let i = 0; i < rounds; i++) {
    const result = resolveAttackRoll(attacker, defender, attackerParticipant, defenderParticipant);

    if (result.fumble) {
      fumbles++;
      misses++;
    } else if (result.critical) {
      crits++;
      hits++;
    } else if (result.hit) {
      hits++;
    } else {
      misses++;
    }
  }

  const hitRate = (hits / rounds) * 100;
  const critRate = (crits / rounds) * 100;
  const fumbleRate = (fumbles / rounds) * 100;

  // Calculate expected hit rate based on D&D 5e math
  // Hit if (d20 + attack_bonus) >= AC
  // P(hit) = (21 + attack_bonus - AC) / 20, clamped to [0.05, 0.95]
  const theoreticalHitChance = Math.min(0.95, Math.max(0.05, (21 + attackBonus - defenderAC) / 20));
  const expectedHitRate = theoreticalHitChance * 100;

  return {
    rounds,
    hits,
    misses,
    crits,
    fumbles,
    hitRate: hitRate.toFixed(1),
    critRate: critRate.toFixed(1),
    fumbleRate: fumbleRate.toFixed(1),
    attackBonus,
    defenderAC,
    expectedHitRate: expectedHitRate.toFixed(1),
    deviation: Math.abs(hitRate - expectedHitRate).toFixed(1)
  };
}

// Main test function
function runBalanceSimulation() {
  console.log('\n' + '='.repeat(80));
  console.log('COMBAT BALANCE SIMULATION - AGGREGATE AC SYSTEM');
  console.log('='.repeat(80));
  console.log('\nSimulating 1000 attack rolls per scenario to validate AC balance\n');

  const defenders = [
    { name: 'Rogue (Light Armor)', build: createRogueBuild(), expectedAC: 21 },
    { name: 'Fighter (Medium + Shield)', build: createFighterBuild(), expectedAC: 22 },
    { name: 'Paladin (Heavy + Shield)', build: createPaladinBuild(), expectedAC: 24 },
    { name: 'Wizard (No Armor)', build: createWizardBuild(), expectedAC: 13 }
  ];

  const attackers = [
    { name: 'Goblin (CR 1/4)', build: createGoblinAttacker(), expectedToHit: 4 },
    { name: 'Knight (CR 3)', build: createKnightAttacker(), expectedToHit: 5 },
    { name: 'Dragon (CR 10)', build: createDragonAttacker(), expectedToHit: 10 }
  ];

  let totalDeviation = 0;
  let testCount = 0;
  let passed = 0;
  let failed = 0;

  // Test each combination
  for (const defender of defenders) {
    console.log('-'.repeat(80));
    console.log(`DEFENDER: ${defender.name}`);

    // Validate AC
    EquipmentManager.recalculatePlayerStats(defender.build);
    const actualAC = defender.build.armorClass;
    const acMatch = actualAC === defender.expectedAC;

    console.log(`  Expected AC: ${defender.expectedAC}, Actual AC: ${actualAC} ${acMatch ? '✓' : '✗'}`);

    if (!acMatch) {
      console.log(`  WARNING: AC mismatch! Expected ${defender.expectedAC}, got ${actualAC}`);
      failed++;
    } else {
      passed++;
    }
    testCount++;

    console.log('');

    for (const attacker of attackers) {
      const results = simulateAttacks(attacker.build, defender.build, 1000);

      const deviation = parseFloat(results.deviation);
      totalDeviation += deviation;
      testCount++;

      // Hit rate should be within 3% of expected (statistical variance)
      const deviationOk = deviation <= 3.0;

      console.log(`  vs ${attacker.name}:`);
      console.log(`    Attack Bonus: +${results.attackBonus}`);
      console.log(`    Hit Rate: ${results.hitRate}% (expected ${results.expectedHitRate}%)`);
      console.log(`    Deviation: ${results.deviation}% ${deviationOk ? '✓' : '✗ OUTSIDE TOLERANCE'}`);
      console.log(`    Crits: ${results.critRate}% | Fumbles: ${results.fumbleRate}%`);

      if (deviationOk) {
        passed++;
      } else {
        failed++;
        console.log(`    WARNING: Hit rate deviation too high!`);
      }
      console.log('');
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('BALANCE SIMULATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Scenarios Tested: ${testCount}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Average Deviation: ${(totalDeviation / testCount).toFixed(2)}%`);
  console.log('');

  if (failed === 0) {
    console.log('✓ ALL BALANCE TESTS PASSED');
    console.log('  AC values are within D&D 5e expected ranges');
    console.log('  Hit rates match statistical expectations');
    console.log('');
  } else {
    console.log('✗ SOME BALANCE TESTS FAILED');
    console.log(`  ${failed} scenario(s) outside tolerance`);
    console.log('');
  }

  console.log('='.repeat(80) + '\n');

  return failed === 0;
}

// Run if called directly
if (require.main === module) {
  const success = runBalanceSimulation();
  process.exit(success ? 0 : 1);
}

module.exports = { runBalanceSimulation };
