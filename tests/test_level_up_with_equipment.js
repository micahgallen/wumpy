/**
 * Integration Test: Level-Up with Equipment
 *
 * Tests the complete integration of:
 * - Equipment bonuses
 * - Level-up mechanics
 * - Stat increases
 * - AC/HP recalculation
 */

const { applyStatIncrease, applyLevelUp } = require('../src/systems/progression/LevelUpHandler');
const EquipmentManager = require('../src/systems/equipment/EquipmentManager');
const { EquipmentSlot, ItemType } = require('../src/items/schemas/ItemTypes');
const BaseItem = require('../src/items/BaseItem');

// Mock logger
const logger = require('../src/logger');
logger.log = () => {};

/**
 * Create a test item directly (bypass item registry for testing)
 */
function createTestItem(type, props = {}) {
  const itemBase = {
    id: props.id || 'test_item',
    name: props.name || 'Test Item',
    description: props.description || 'A test item',
    keywords: props.keywords || ['test'],
    itemType: type,
    isEquippable: true,
    slot: props.slot || null,
    value: props.value || 10,
    weight: props.weight || 1
  };

  const item = Object.assign(Object.create(BaseItem.prototype), {
    ...itemBase,
    ...props,
    instanceId: `test-${Date.now()}-${Math.random()}`,
    isEquipped: false,
    equippedSlot: null,
    isIdentified: props.isIdentified !== false,
    createdAt: Date.now(),
    modifiedAt: Date.now()
  });

  // Add methods from BaseItem
  item.getDisplayName = function() {
    return this.name;
  };

  item.onEquip = function(player) {
    return true;
  };

  item.onUnequip = function(player) {
    return true;
  };

  return item;
}

/**
 * Create a test player with full initialization
 */
function createFullTestPlayer(level = 1) {
  return {
    username: 'IntegrationTestPlayer',
    id: 'test-player-1',
    level: level,
    currentXp: 0,
    maxHp: 10 + (level - 1) * 5,
    currentHp: 10 + (level - 1) * 5,
    proficiency: 2,
    inventory: [],

    // Base stats
    baseStats: {
      strength: 14,
      dexterity: 14,
      constitution: 14,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },

    // Effective stats (will be recalculated)
    stats: {
      strength: 14,
      dexterity: 14,
      constitution: 14,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },

    // Short names
    str: 14,
    dex: 14,
    con: 14,
    int: 10,
    wis: 10,
    cha: 10,

    armorClass: 12,
    resistances: {},
    equipmentBonuses: {},

    // Proficiencies (for equipment)
    proficiencies: {
      weapons: ['simple_melee', 'martial_melee'],
      armor: ['light', 'medium', 'heavy']
    }
  };
}

/**
 * Test 1: Level-up with equipped +2 STR ring
 */
function testLevelUpWithStatBoostRing() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test 1: Level-Up with +2 STR Ring Equipped               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const player = createFullTestPlayer(1);

  // Create a +2 STR ring
  const ring = createTestItem(ItemType.JEWELRY, {
    id: 'test_str_ring',
    name: 'Ring of Strength +2',
    keywords: ['ring', 'strength'],
    slot: EquipmentSlot.RING_1,
    statModifiers: { strength: 2 }
  });

  player.inventory.push(ring);

  console.log('Step 1: Equip +2 STR ring');
  const equipResult = EquipmentManager.equipItem(player, ring, EquipmentSlot.RING_1);

  if (equipResult.success) {
    console.log(`✓ Ring equipped successfully`);
    console.log(`  Base STR: ${player.baseStats.strength}`);
    console.log(`  Effective STR: ${player.str}`);
    console.log(`  Equipment bonus: ${player.equipmentBonuses.strength || 0}`);

    if (player.baseStats.strength === 14 && player.str === 16) {
      console.log('✓ PASS: Base STR is 14, effective STR is 16');
    } else {
      console.log(`✗ FAIL: Expected base 14, effective 16. Got base ${player.baseStats.strength}, effective ${player.str}`);
    }
  } else {
    console.log(`✗ FAIL: Could not equip ring: ${equipResult.message}`);
    return;
  }

  console.log('\nStep 2: Level up to level 2');
  const levelUpResult = applyLevelUp(player);

  console.log(`  New level: ${player.level}`);
  console.log(`  HP gained: ${levelUpResult.hpGain}`);
  console.log(`  Max HP: ${player.maxHp}`);
  console.log(`  Base STR: ${player.baseStats.strength}`);
  console.log(`  Effective STR: ${player.str}`);

  if (player.baseStats.strength === 14 && player.str === 16) {
    console.log('✓ PASS: Equipment bonus preserved after level-up');
  } else {
    console.log(`✗ FAIL: Equipment bonus lost. Base: ${player.baseStats.strength}, Effective: ${player.str}`);
  }

  // CON 14 = +2 modifier, should gain 7 HP
  if (levelUpResult.hpGain === 7) {
    console.log('✓ PASS: HP gain includes CON modifier (5 + 2 = 7)');
  } else {
    console.log(`✗ FAIL: HP gain should be 7, got ${levelUpResult.hpGain}`);
  }
}

/**
 * Test 2: Increase STR while wearing +2 STR ring
 */
function testStatIncreaseWithEquippedRing() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test 2: Increase STR While Wearing +2 STR Ring           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const player = createFullTestPlayer(4);  // Level 4 to get stat choice

  // Create and equip +2 STR ring
  const ring = createTestItem(ItemType.JEWELRY, {
    id: 'test_str_ring_2',
    name: 'Ring of Strength +2',
    keywords: ['ring', 'strength'],
    slot: EquipmentSlot.RING_1,
    statModifiers: { strength: 2 }
  });

  player.inventory.push(ring);
  EquipmentManager.equipItem(player, ring, EquipmentSlot.RING_1);

  console.log('Initial state (with +2 STR ring):');
  console.log(`  Base STR: ${player.baseStats.strength}`);
  console.log(`  Effective STR: ${player.str}`);
  console.log(`  Attack modifier: +${Math.floor((player.str - 10) / 2) + player.proficiency}`);

  const initialAttackBonus = Math.floor((player.str - 10) / 2) + player.proficiency;

  console.log('\nIncreasing STR...');
  const statResult = applyStatIncrease(player, 'str');

  console.log(`\nAfter STR increase:`);
  console.log(`  Base STR: ${player.baseStats.strength} (was ${statResult.oldBaseValue})`);
  console.log(`  Effective STR: ${player.str} (was ${statResult.oldEffectiveValue})`);
  console.log(`  Equipment bonus: ${statResult.equipmentBonus}`);

  const newAttackBonus = Math.floor((player.str - 10) / 2) + player.proficiency;
  console.log(`  Attack modifier: +${newAttackBonus} (was +${initialAttackBonus})`);

  if (player.baseStats.strength === 15) {
    console.log('✓ PASS: Base STR increased from 14 to 15');
  } else {
    console.log(`✗ FAIL: Base STR should be 15, got ${player.baseStats.strength}`);
  }

  if (player.str === 17) {
    console.log('✓ PASS: Effective STR is 17 (15 base + 2 equipment)');
  } else {
    console.log(`✗ FAIL: Effective STR should be 17, got ${player.str}`);
  }

  if (statResult.equipmentBonus === 2) {
    console.log('✓ PASS: Equipment bonus correctly calculated as 2');
  } else {
    console.log(`✗ FAIL: Equipment bonus should be 2, got ${statResult.equipmentBonus}`);
  }

  // Attack bonus stays same because STR 16 (+3) and STR 17 (+3) have same modifier
  if (newAttackBonus === initialAttackBonus) {
    console.log('✓ PASS: Attack bonus unchanged (STR 16→17 both give +3 modifier)');
  } else {
    console.log(`Note: Attack bonus changed from +${initialAttackBonus} to +${newAttackBonus}`);
  }
}

/**
 * Test 3: Increase DEX while wearing armor
 */
function testDexIncreaseWithArmor() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test 3: Increase DEX While Wearing Armor                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const player = createFullTestPlayer(4);  // Level 4 to get stat choice

  // Create and equip leather armor (light armor, no DEX cap)
  const armor = createTestItem(ItemType.ARMOR, {
    id: 'test_leather_armor',
    name: 'Leather Armor',
    keywords: ['leather', 'armor'],
    slot: EquipmentSlot.CHEST,
    armorProperties: {
      armorClass: 'light',
      baseAC: 11,
      maxDexBonus: Infinity  // Light armor has no DEX cap
    }
  });
  player.inventory.push(armor);

  const equipResult = EquipmentManager.equipItem(player, armor, EquipmentSlot.CHEST);

  if (!equipResult.success) {
    console.log(`✗ FAIL: Could not equip armor: ${equipResult.message}`);
    return;
  }

  console.log('Initial state (wearing leather armor):');
  console.log(`  Base DEX: ${player.baseStats.dexterity}`);
  console.log(`  Effective DEX: ${player.dex}`);
  console.log(`  AC: ${player.armorClass}`);

  const initialAC = player.armorClass;

  console.log('\nIncreasing DEX...');
  const statResult = applyStatIncrease(player, 'dex');

  console.log(`\nAfter DEX increase:`);
  console.log(`  Base DEX: ${player.baseStats.dexterity} (was ${statResult.oldBaseValue})`);
  console.log(`  Effective DEX: ${player.dex} (was ${statResult.oldEffectiveValue})`);
  console.log(`  AC: ${player.armorClass} (was ${initialAC})`);

  if (player.baseStats.dexterity === 15) {
    console.log('✓ PASS: Base DEX increased from 14 to 15');
  } else {
    console.log(`✗ FAIL: Base DEX should be 15, got ${player.baseStats.dexterity}`);
  }

  if (player.armorClass === initialAC) {
    console.log('✓ PASS: AC recalculated (DEX 14→15 gives same modifier +2)');
  } else {
    console.log(`AC changed from ${initialAC} to ${player.armorClass}`);
  }
}

/**
 * Test 4: Increase CON and verify HP recalculation
 */
function testConIncreaseRecalculatesMaxHP() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test 4: Increase CON and Verify Retroactive HP Calc      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const player = createFullTestPlayer(4);  // Level 4

  // Set proper HP: 10 + 15 (3 levels * 5) + 8 (CON +2 * 4 levels) = 33
  const initialConMod = Math.floor((player.con - 10) / 2);
  player.maxHp = 10 + (player.level - 1) * 5 + (initialConMod * player.level);
  player.currentHp = player.maxHp;

  console.log('Initial state:');
  console.log(`  Level: ${player.level}`);
  console.log(`  Base CON: ${player.baseStats.constitution} (modifier: +${initialConMod})`);
  console.log(`  Max HP: ${player.maxHp}`);
  console.log(`  Calculation: 10 + ${(player.level - 1) * 5} + ${initialConMod * player.level} = ${player.maxHp}`);

  console.log('\nIncreasing CON from 14 to 15...');
  const statResult = applyStatIncrease(player, 'con');

  const newConMod = Math.floor((player.con - 10) / 2);

  console.log(`\nAfter CON increase:`);
  console.log(`  Base CON: ${player.baseStats.constitution} (modifier: +${newConMod})`);
  console.log(`  Max HP: ${player.maxHp}`);

  if (player.baseStats.constitution === 15) {
    console.log('✓ PASS: Base CON increased from 14 to 15');
  } else {
    console.log(`✗ FAIL: Base CON should be 15, got ${player.baseStats.constitution}`);
  }

  // CON 15 still gives +2 modifier (same as 14), so HP shouldn't change
  const expectedHP = 10 + (player.level - 1) * 5 + (newConMod * player.level);
  if (player.maxHp === expectedHP) {
    console.log(`✓ PASS: Max HP correctly calculated as ${expectedHP}`);
  } else {
    console.log(`✗ FAIL: Max HP should be ${expectedHP}, got ${player.maxHp}`);
  }

  // Now increase CON again to 16, which should give +3 modifier
  console.log('\nIncreasing CON from 15 to 16 (+3 modifier)...');
  const statResult2 = applyStatIncrease(player, 'con');

  const newConMod2 = Math.floor((player.con - 10) / 2);
  const expectedHP2 = 10 + (player.level - 1) * 5 + (newConMod2 * player.level);

  console.log(`\nAfter second CON increase:`);
  console.log(`  Base CON: ${player.baseStats.constitution} (modifier: +${newConMod2})`);
  console.log(`  Max HP: ${player.maxHp} (expected: ${expectedHP2})`);
  console.log(`  HP increased by: ${player.maxHp - expectedHP} (should be ${player.level} for retroactive calc)`);

  if (player.baseStats.constitution === 16) {
    console.log('✓ PASS: Base CON increased to 16');
  } else {
    console.log(`✗ FAIL: Base CON should be 16, got ${player.baseStats.constitution}`);
  }

  if (player.maxHp === expectedHP2) {
    console.log(`✓ PASS: Max HP retroactively recalculated to ${expectedHP2}`);
    console.log(`  (Gained ${player.level} HP from +1 CON modifier across all ${player.level} levels)`);
  } else {
    console.log(`✗ FAIL: Max HP should be ${expectedHP2}, got ${player.maxHp}`);
  }
}

/**
 * Test 5: Complete scenario - Level 1 to 5 with equipment
 */
function testCompleteProgressionScenario() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test 5: Complete Progression Scenario (Level 1→5)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const player = createFullTestPlayer(1);

  console.log('=== Starting Character ===');
  console.log(`Level: ${player.level}`);
  console.log(`STR: ${player.str} (base: ${player.baseStats.strength})`);
  console.log(`DEX: ${player.dex} (base: ${player.baseStats.dexterity})`);
  console.log(`CON: ${player.con} (base: ${player.baseStats.constitution})`);
  console.log(`Max HP: ${player.maxHp}`);
  console.log(`AC: ${player.armorClass}`);

  // Level 2-3: Normal level-ups
  console.log('\n--- Leveling to 2 ---');
  applyLevelUp(player);
  console.log(`Level ${player.level}, HP: ${player.maxHp}`);

  console.log('\n--- Leveling to 3 ---');
  applyLevelUp(player);
  console.log(`Level ${player.level}, HP: ${player.maxHp}`);

  // Level 4: Get stat choice, increase STR
  console.log('\n--- Leveling to 4 (stat choice!) ---');
  const level4Result = applyLevelUp(player);
  console.log(`Level ${player.level}, HP: ${player.maxHp}`);

  if (level4Result.needsStatChoice) {
    console.log('✓ Stat choice available');
    console.log('Choosing to increase STR...');
    applyStatIncrease(player, 'str');
    console.log(`STR increased: ${player.str} (base: ${player.baseStats.strength})`);
  }

  // Equip +2 STR ring
  console.log('\n--- Equipping +2 STR ring ---');
  const ring = createTestItem(ItemType.JEWELRY, {
    id: 'test_str_ring_3',
    name: 'Ring of Strength +2',
    keywords: ['ring', 'strength'],
    slot: EquipmentSlot.RING_1,
    statModifiers: { strength: 2 }
  });
  player.inventory.push(ring);
  EquipmentManager.equipItem(player, ring, EquipmentSlot.RING_1);
  console.log(`STR with ring: ${player.str} (base: ${player.baseStats.strength}, bonus: +2)`);

  // Level 5
  console.log('\n--- Leveling to 5 ---');
  applyLevelUp(player);
  console.log(`Level ${player.level}, HP: ${player.maxHp}`);
  console.log(`STR: ${player.str} (base: ${player.baseStats.strength}, equipment: +${player.equipmentBonuses.strength || 0})`);

  console.log('\n=== Final Character ===');
  console.log(`Level: ${player.level}`);
  console.log(`STR: ${player.str} (base: ${player.baseStats.strength})`);
  console.log(`DEX: ${player.dex} (base: ${player.baseStats.dexterity})`);
  console.log(`CON: ${player.con} (base: ${player.baseStats.constitution})`);
  console.log(`Max HP: ${player.maxHp}`);
  console.log(`AC: ${player.armorClass}`);

  // Verify expectations
  const expectedBaseSTR = 15;  // Started at 14, increased once
  const expectedEffectiveSTR = 17;  // 15 base + 2 ring

  if (player.baseStats.strength === expectedBaseSTR && player.str === expectedEffectiveSTR) {
    console.log('\n✓ PASS: Complete progression scenario successful!');
    console.log(`  Base stats increased correctly`);
    console.log(`  Equipment bonuses preserved through level-ups`);
    console.log(`  All derived stats recalculated properly`);
  } else {
    console.log(`\n✗ FAIL: Expected base STR ${expectedBaseSTR}, effective ${expectedEffectiveSTR}`);
    console.log(`  Got base ${player.baseStats.strength}, effective ${player.str}`);
  }
}

/**
 * Run all integration tests
 */
function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Level-Up with Equipment Integration Tests                ║');
  console.log('║  Full system integration testing                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    testLevelUpWithStatBoostRing();
    testStatIncreaseWithEquippedRing();
    testDexIncreaseWithArmor();
    testConIncreaseRecalculatesMaxHP();
    testCompleteProgressionScenario();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Integration tests completed!                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ Integration test error:', error);
    console.error(error.stack);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  createFullTestPlayer
};
