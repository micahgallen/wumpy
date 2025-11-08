/**
 * Aggregate AC System Tests
 *
 * Comprehensive test suite for the new aggregate AC calculation system
 * where each equipped armor piece contributes to total AC.
 */

const { TestRunner, assert } = require('./testRunner');
const EquipmentManager = require('../src/systems/equipment/EquipmentManager');
const { EquipmentSlot, ItemType, ArmorClass } = require('../src/items/schemas/ItemTypes');

const runner = new TestRunner('Aggregate AC System Tests');

/**
 * Helper function to create a test armor piece
 */
function createTestArmor(slot, baseAC, armorClass, isEquipped = true, magicalACBonus = 0) {
  // Map armor class to maxDexBonus
  let maxDexBonus = 999; // default for light
  if (armorClass === ArmorClass.MEDIUM || armorClass === 'medium') {
    maxDexBonus = 2;
  } else if (armorClass === ArmorClass.HEAVY || armorClass === 'heavy') {
    maxDexBonus = 0;
  } else if (armorClass === ArmorClass.SHIELD || armorClass === 'shield') {
    maxDexBonus = 999;
  }

  return {
    instanceId: `test_${slot}_${Date.now()}_${Math.random()}`,
    name: `Test ${armorClass} ${slot}`,
    itemType: ItemType.ARMOR,
    slot: slot,
    isEquipped: isEquipped,
    equippedSlot: isEquipped ? slot : null,
    requiresAttunement: false,
    isAttuned: true,
    armorProperties: {
      baseAC: baseAC,
      armorClass: armorClass,
      armorType: typeof armorClass === 'string' ? armorClass : armorClass.toLowerCase(),
      maxDexBonus: maxDexBonus,
      magicalACBonus: magicalACBonus
    },
    getMaxDexBonus: function() {
      return this.armorProperties.maxDexBonus;
    }
  };
}

/**
 * Helper function to create a test jewelry piece with AC bonus
 */
function createTestJewelry(slot, bonusAC, requiresAttunement = true, isAttuned = true) {
  return {
    instanceId: `test_jewelry_${slot}_${Date.now()}_${Math.random()}`,
    name: `Test ${slot} Jewelry`,
    itemType: ItemType.JEWELRY,
    slot: slot,
    isEquipped: true,
    equippedSlot: slot,
    requiresAttunement: requiresAttunement,
    isAttuned: isAttuned,
    bonusAC: bonusAC
  };
}

/**
 * Helper function to create test player
 */
function createTestPlayer(dex = 10, inventory = []) {
  return {
    username: 'testplayer',
    dex: dex,
    inventory: inventory
  };
}

// ============================================================
// Test Suite: Basic AC Calculations
// ============================================================

runner.test('Unarmored AC calculation (10 + DEX)', () => {
  const player = createTestPlayer(16, []);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.baseAC, 10);
  assert.equal(ac.armorAC, 0);
  assert.equal(ac.dexBonus, 3);
  assert.equal(ac.magicalBonus, 0);
  assert.equal(ac.totalAC, 13);
});

runner.test('AC with single armor piece', () => {
  const armor = createTestArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM, true);
  const player = createTestPlayer(14, [armor]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.baseAC, 10);
  assert.equal(ac.armorAC, 4);
  assert.equal(ac.dexBonus, 2); // Capped by medium armor
  assert.equal(ac.totalAC, 16);
});

runner.test('Sum AC from multiple armor pieces', () => {
  const chest = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true);
  const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.LIGHT, true);
  const legs = createTestArmor(EquipmentSlot.LEGS, 1, ArmorClass.LIGHT, true);
  const feet = createTestArmor(EquipmentSlot.FEET, 1, ArmorClass.LIGHT, true);

  const player = createTestPlayer(16, [chest, head, legs, feet]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.armorAC, 6); // 3+1+1+1
  assert.equal(ac.dexBonus, 3);
  assert.equal(ac.totalAC, 19); // 10 + 6 + 3
});

// ============================================================
// Test Suite: DEX Cap Enforcement
// ============================================================

runner.test('DEX cap - heavy armor suppresses DEX bonus', () => {
  const chest = createTestArmor(EquipmentSlot.CHEST, 5, ArmorClass.HEAVY, true);
  const hands = createTestArmor(EquipmentSlot.HANDS, 1, ArmorClass.LIGHT, true);

  // Debug: verify heavy armor has maxDexBonus of 0
  const chestMaxDex = chest.getMaxDexBonus();
  assert.equal(chestMaxDex, 0, 'Heavy armor should have maxDexBonus of 0');

  const player = createTestPlayer(18, [chest, hands]); // +4 DEX modifier
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.dexBonus, 0, `Heavy armor should cap DEX bonus at 0, got ${ac.dexBonus}`); // Heavy armor caps at 0
  assert.equal(ac.armorAC, 6); // 5+1
  assert.equal(ac.totalAC, 16); // 10 + 6 + 0
});

runner.test('DEX cap - full DEX bonus with all light armor', () => {
  const chest = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true);
  const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.LIGHT, true);

  const player = createTestPlayer(20, [chest, head]); // +5 DEX modifier
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.dexBonus, 5); // No cap with light armor
  assert.equal(ac.totalAC, 19); // 10 + 4 + 5
});

runner.test('DEX cap - medium armor caps at +2', () => {
  const chest = createTestArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM, true);
  const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.MEDIUM, true);

  const player = createTestPlayer(18, [chest, head]); // +4 DEX modifier
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.dexBonus, 2); // Capped at +2
  assert.equal(ac.totalAC, 17); // 10 + 5 + 2
});

// ============================================================
// Test Suite: Magical AC Bonuses
// ============================================================

runner.test('Magical AC bonuses from armor', () => {
  const chest = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true, 1);
  const player = createTestPlayer(14, [chest]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.armorAC, 3);
  assert.equal(ac.magicalBonus, 1);
  assert.equal(ac.totalAC, 16); // 10 + 3 + 2 + 1
});

runner.test('Sum magical bonuses from multiple pieces', () => {
  const chest = createTestArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM, true, 1);
  const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.MEDIUM, true, 1);

  const player = createTestPlayer(14, [chest, head]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.magicalBonus, 2); // 1+1
  assert.equal(ac.totalAC, 19); // 10 + 5 + 2 + 2
});

runner.test('Magical AC from jewelry', () => {
  const ring = createTestJewelry(EquipmentSlot.RING_1, 1, true, true);
  const player = createTestPlayer(14, [ring]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.magicalBonus, 1);
  assert.equal(ac.totalAC, 13); // 10 + 0 + 2 + 1
});

// ============================================================
// Test Suite: Attunement Requirements
// ============================================================

runner.test('Attunement - magical bonuses only when attuned', () => {
  const chest = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true, 1);
  chest.requiresAttunement = true;
  chest.isAttuned = false;

  const player = createTestPlayer(14, [chest]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.armorAC, 3); // Base AC still applies
  assert.equal(ac.magicalBonus, 0); // Not attuned
  assert.equal(ac.totalAC, 15); // 10 + 3 + 2 + 0
});

runner.test('Attunement - jewelry requires attunement', () => {
  const ring = createTestJewelry(EquipmentSlot.RING_1, 2, true, false);
  const player = createTestPlayer(14, [ring]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.magicalBonus, 0); // Not attuned
  assert.equal(ac.totalAC, 12); // 10 + 0 + 2 + 0
});

// ============================================================
// Test Suite: Complete Armor Set Examples (From Design Doc)
// ============================================================

runner.test('Example: Rogue in Light Armor (DEX 18)', () => {
  // chest+3, head+1, legs+1, feet+1, hands+1 = +7
  const chest = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true);
  const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.LIGHT, true);
  const legs = createTestArmor(EquipmentSlot.LEGS, 1, ArmorClass.LIGHT, true);
  const feet = createTestArmor(EquipmentSlot.FEET, 1, ArmorClass.LIGHT, true);
  const hands = createTestArmor(EquipmentSlot.HANDS, 1, ArmorClass.LIGHT, true);

  const player = createTestPlayer(18, [chest, head, legs, feet, hands]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.armorAC, 7);
  assert.equal(ac.dexBonus, 4);
  assert.equal(ac.totalAC, 21); // 10 + 7 + 4
});

runner.test('Example: Fighter in Medium Armor (DEX 14)', () => {
  // chest+4, head+1, legs+2, feet+1 = +8
  const chest = createTestArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM, true);
  const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.MEDIUM, true);
  const legs = createTestArmor(EquipmentSlot.LEGS, 2, ArmorClass.MEDIUM, true);
  const feet = createTestArmor(EquipmentSlot.FEET, 1, ArmorClass.MEDIUM, true);

  const player = createTestPlayer(14, [chest, head, legs, feet]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.armorAC, 8);
  assert.equal(ac.dexBonus, 2);
  assert.equal(ac.totalAC, 20); // 10 + 8 + 2
});

runner.test('Example: Paladin in Heavy Armor (DEX 8)', () => {
  // chest+5, head+2, legs+2, feet+1, hands+1, shoulders+1 = +12
  const chest = createTestArmor(EquipmentSlot.CHEST, 5, ArmorClass.HEAVY, true);
  const head = createTestArmor(EquipmentSlot.HEAD, 2, ArmorClass.HEAVY, true);
  const legs = createTestArmor(EquipmentSlot.LEGS, 2, ArmorClass.HEAVY, true);
  const feet = createTestArmor(EquipmentSlot.FEET, 1, ArmorClass.HEAVY, true);
  const hands = createTestArmor(EquipmentSlot.HANDS, 1, ArmorClass.HEAVY, true);
  const shoulders = createTestArmor(EquipmentSlot.SHOULDERS, 1, ArmorClass.HEAVY, true);

  const player = createTestPlayer(8, [chest, head, legs, feet, hands, shoulders]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.armorAC, 12);
  assert.equal(ac.dexBonus, 0); // Heavy armor suppresses negative DEX too
  assert.equal(ac.totalAC, 22); // 10 + 12 + 0
});

runner.test('Example: Wizard unarmored with jewelry (DEX 16)', () => {
  // Ring of Protection +1, Amulet +1
  const ring = createTestJewelry(EquipmentSlot.RING_1, 1, true, true);
  const amulet = createTestJewelry(EquipmentSlot.NECK, 1, true, true);

  const player = createTestPlayer(16, [ring, amulet]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.armorAC, 0);
  assert.equal(ac.dexBonus, 3);
  assert.equal(ac.magicalBonus, 2);
  assert.equal(ac.totalAC, 15); // 10 + 0 + 3 + 2
});

// ============================================================
// Test Suite: Edge Cases
// ============================================================

runner.test('Edge case - empty inventory', () => {
  const player = createTestPlayer(10, []);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.totalAC, 10);
});

runner.test('Edge case - null player', () => {
  const ac = EquipmentManager.calculateAC(null);

  assert.equal(ac.totalAC, 10);
});

runner.test('Edge case - negative DEX capped at 0', () => {
  const player = createTestPlayer(6, []); // DEX 6 = -2 modifier
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.dexBonus, 0); // Negative capped at 0
  assert.equal(ac.totalAC, 10);
});

runner.test('Edge case - unequipped armor ignored', () => {
  const equipped = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true);
  const unequipped = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.LIGHT, false);

  const player = createTestPlayer(14, [equipped, unequipped]);
  const ac = EquipmentManager.calculateAC(player);

  assert.equal(ac.armorAC, 3); // Only equipped counts
  assert.equal(ac.totalAC, 15); // 10 + 3 + 2
});

runner.test('Edge case - breakdown is populated', () => {
  const chest = createTestArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM, true);
  const player = createTestPlayer(14, [chest]);
  const ac = EquipmentManager.calculateAC(player);

  assert.true(Array.isArray(ac.breakdown));
  assert.true(ac.breakdown.length > 0);
});

module.exports = runner;
