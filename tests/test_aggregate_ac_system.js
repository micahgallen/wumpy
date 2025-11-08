/**
 * Aggregate AC System Tests
 *
 * Comprehensive test suite for the new aggregate AC calculation system
 * where each equipped armor piece contributes to total AC.
 *
 * Tests verify:
 * - Unarmored AC calculation (10 + DEX)
 * - Single armor piece AC
 * - Multiple armor pieces aggregation
 * - DEX cap enforcement from heaviest armor
 * - Magical AC bonuses
 * - Attunement requirements
 * - Mixed armor type scenarios
 * - Jewelry AC bonuses
 */

const assert = require('assert');
const EquipmentManager = require('../src/systems/equipment/EquipmentManager');
const { EquipmentSlot, ItemType, ArmorClass } = require('../src/items/schemas/ItemTypes');

describe('Aggregate AC System', function() {

  /**
   * Helper function to create a test armor piece
   */
  function createTestArmor(slot, baseAC, armorClass, isEquipped = true, magicalACBonus = 0) {
    const maxDexBonusMap = {
      [ArmorClass.LIGHT]: 999,
      [ArmorClass.MEDIUM]: 2,
      [ArmorClass.HEAVY]: 0,
      [ArmorClass.SHIELD]: 999
    };

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
        armorType: armorClass.toLowerCase(),
        maxDexBonus: maxDexBonusMap[armorClass] || 999,
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

  describe('Basic AC Calculations', function() {

    it('should calculate unarmored AC correctly (10 + DEX)', function() {
      const player = createTestPlayer(16, []);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.baseAC, 10, 'Base AC should be 10');
      assert.strictEqual(ac.armorAC, 0, 'Armor AC should be 0 when unarmored');
      assert.strictEqual(ac.dexBonus, 3, 'DEX bonus should be +3 for DEX 16');
      assert.strictEqual(ac.magicalBonus, 0, 'Magical bonus should be 0');
      assert.strictEqual(ac.totalAC, 13, 'Total AC should be 10 + 3 = 13');
    });

    it('should calculate AC with single armor piece', function() {
      const armor = createTestArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM, true);
      const player = createTestPlayer(14, [armor]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.baseAC, 10, 'Base AC should be 10');
      assert.strictEqual(ac.armorAC, 4, 'Armor AC should be 4 from chest piece');
      assert.strictEqual(ac.dexBonus, 2, 'DEX bonus should be +2 (capped by medium armor)');
      assert.strictEqual(ac.totalAC, 16, 'Total AC should be 10 + 4 + 2 = 16');
    });

    it('should sum AC from multiple armor pieces', function() {
      const chest = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true);
      const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.LIGHT, true);
      const legs = createTestArmor(EquipmentSlot.LEGS, 1, ArmorClass.LIGHT, true);
      const feet = createTestArmor(EquipmentSlot.FEET, 1, ArmorClass.LIGHT, true);

      const player = createTestPlayer(16, [chest, head, legs, feet]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.armorAC, 6, 'Armor AC should be 3+1+1+1 = 6');
      assert.strictEqual(ac.dexBonus, 3, 'DEX bonus should be +3 (light armor, no cap)');
      assert.strictEqual(ac.totalAC, 19, 'Total AC should be 10 + 6 + 3 = 19');
    });
  });

  // ============================================================
  // Test Suite: DEX Cap Enforcement
  // ============================================================

  describe('DEX Cap Enforcement', function() {

    it('should apply strictest DEX cap from equipped armor', function() {
      // Heavy chest (DEX cap 0) + Light gloves (DEX cap ∞)
      const chest = createTestArmor(EquipmentSlot.CHEST, 5, ArmorClass.HEAVY, true);
      const hands = createTestArmor(EquipmentSlot.HANDS, 1, ArmorClass.LIGHT, true);

      const player = createTestPlayer(18, [chest, hands]); // +4 DEX modifier
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.dexBonus, 0, 'DEX bonus should be 0 (capped by heavy armor)');
      assert.strictEqual(ac.armorAC, 6, 'Armor AC should be 5+1 = 6');
      assert.strictEqual(ac.totalAC, 16, 'Total AC should be 10 + 6 + 0 = 16');
    });

    it('should allow full DEX bonus with all light armor', function() {
      const chest = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true);
      const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.LIGHT, true);

      const player = createTestPlayer(20, [chest, head]); // +5 DEX modifier
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.dexBonus, 5, 'DEX bonus should be +5 (no cap with light armor)');
      assert.strictEqual(ac.totalAC, 19, 'Total AC should be 10 + 4 + 5 = 19');
    });

    it('should cap DEX at +2 with medium armor', function() {
      const chest = createTestArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM, true);
      const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.MEDIUM, true);

      const player = createTestPlayer(18, [chest, head]); // +4 DEX modifier
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.dexBonus, 2, 'DEX bonus should be +2 (capped by medium armor)');
      assert.strictEqual(ac.totalAC, 17, 'Total AC should be 10 + 5 + 2 = 17');
    });

    it('should suppress DEX bonus with heavy armor', function() {
      const chest = createTestArmor(EquipmentSlot.CHEST, 5, ArmorClass.HEAVY, true);
      const legs = createTestArmor(EquipmentSlot.LEGS, 2, ArmorClass.HEAVY, true);

      const player = createTestPlayer(16, [chest, legs]); // +3 DEX modifier
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.dexBonus, 0, 'DEX bonus should be 0 (heavy armor)');
      assert.strictEqual(ac.totalAC, 17, 'Total AC should be 10 + 7 + 0 = 17');
    });
  });

  // ============================================================
  // Test Suite: Magical AC Bonuses
  // ============================================================

  describe('Magical AC Bonuses', function() {

    it('should include magical AC bonuses from armor', function() {
      const chest = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true, 1);
      const player = createTestPlayer(14, [chest]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.armorAC, 3, 'Base armor AC should be 3');
      assert.strictEqual(ac.magicalBonus, 1, 'Magical bonus should be +1');
      assert.strictEqual(ac.totalAC, 16, 'Total AC should be 10 + 3 + 2 + 1 = 16');
    });

    it('should sum magical bonuses from multiple armor pieces', function() {
      const chest = createTestArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM, true, 1);
      const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.MEDIUM, true, 1);

      const player = createTestPlayer(14, [chest, head]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.magicalBonus, 2, 'Magical bonus should be 1+1 = 2');
      assert.strictEqual(ac.totalAC, 19, 'Total AC should be 10 + 5 + 2 + 2 = 19');
    });

    it('should include magical AC from jewelry', function() {
      const ring = createTestJewelry(EquipmentSlot.RING_1, 1, true, true);
      const player = createTestPlayer(14, [ring]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.magicalBonus, 1, 'Magical bonus should be +1 from ring');
      assert.strictEqual(ac.totalAC, 13, 'Total AC should be 10 + 0 + 2 + 1 = 13');
    });
  });

  // ============================================================
  // Test Suite: Attunement Requirements
  // ============================================================

  describe('Attunement Requirements', function() {

    it('should not apply magical bonuses if not attuned', function() {
      // Create armor that requires attunement but is not attuned
      const chest = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true, 1);
      chest.requiresAttunement = true;
      chest.isAttuned = false;

      const player = createTestPlayer(14, [chest]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.armorAC, 3, 'Base armor AC should still apply');
      assert.strictEqual(ac.magicalBonus, 0, 'Magical bonus should be 0 (not attuned)');
      assert.strictEqual(ac.totalAC, 15, 'Total AC should be 10 + 3 + 2 + 0 = 15');
    });

    it('should not apply jewelry AC bonus if not attuned', function() {
      const ring = createTestJewelry(EquipmentSlot.RING_1, 2, true, false);
      const player = createTestPlayer(14, [ring]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.magicalBonus, 0, 'Magical bonus should be 0 (not attuned)');
      assert.strictEqual(ac.totalAC, 12, 'Total AC should be 10 + 0 + 2 + 0 = 12');
    });

    it('should apply bonuses when properly attuned', function() {
      const chest = createTestArmor(EquipmentSlot.CHEST, 5, ArmorClass.HEAVY, true, 2);
      chest.requiresAttunement = true;
      chest.isAttuned = true;

      const ring = createTestJewelry(EquipmentSlot.RING_1, 1, true, true);

      const player = createTestPlayer(10, [chest, ring]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.magicalBonus, 3, 'Magical bonus should be 2+1 = 3');
      assert.strictEqual(ac.totalAC, 18, 'Total AC should be 10 + 5 + 0 + 3 = 18');
    });
  });

  // ============================================================
  // Test Suite: Complete Armor Set Examples (From Design Doc)
  // ============================================================

  describe('Complete Armor Set Examples', function() {

    it('Example 1: Rogue in Light Armor (DEX 18)', function() {
      // From design doc: chest+3, head+1, legs+1, feet+1, hands+1 = +7
      const chest = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true);
      const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.LIGHT, true);
      const legs = createTestArmor(EquipmentSlot.LEGS, 1, ArmorClass.LIGHT, true);
      const feet = createTestArmor(EquipmentSlot.FEET, 1, ArmorClass.LIGHT, true);
      const hands = createTestArmor(EquipmentSlot.HANDS, 1, ArmorClass.LIGHT, true);

      const player = createTestPlayer(18, [chest, head, legs, feet, hands]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.armorAC, 7, 'Armor AC should be 3+1+1+1+1 = 7');
      assert.strictEqual(ac.dexBonus, 4, 'DEX bonus should be +4');
      assert.strictEqual(ac.totalAC, 21, 'Total AC should be 10 + 7 + 4 = 21');
    });

    it('Example 2: Fighter in Medium Armor (DEX 14)', function() {
      // From design doc: chest+4, head+1, legs+2, feet+1 = +8
      const chest = createTestArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM, true);
      const head = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.MEDIUM, true);
      const legs = createTestArmor(EquipmentSlot.LEGS, 2, ArmorClass.MEDIUM, true);
      const feet = createTestArmor(EquipmentSlot.FEET, 1, ArmorClass.MEDIUM, true);

      const player = createTestPlayer(14, [chest, head, legs, feet]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.armorAC, 8, 'Armor AC should be 4+1+2+1 = 8');
      assert.strictEqual(ac.dexBonus, 2, 'DEX bonus should be +2 (capped)');
      assert.strictEqual(ac.totalAC, 20, 'Total AC should be 10 + 8 + 2 = 20');
    });

    it('Example 3: Paladin in Heavy Armor (DEX 8)', function() {
      // From design doc: chest+5, head+2, legs+2, feet+1, hands+1, shoulders+1 = +12
      const chest = createTestArmor(EquipmentSlot.CHEST, 5, ArmorClass.HEAVY, true);
      const head = createTestArmor(EquipmentSlot.HEAD, 2, ArmorClass.HEAVY, true);
      const legs = createTestArmor(EquipmentSlot.LEGS, 2, ArmorClass.HEAVY, true);
      const feet = createTestArmor(EquipmentSlot.FEET, 1, ArmorClass.HEAVY, true);
      const hands = createTestArmor(EquipmentSlot.HANDS, 1, ArmorClass.HEAVY, true);
      const shoulders = createTestArmor(EquipmentSlot.SHOULDERS, 1, ArmorClass.HEAVY, true);

      const player = createTestPlayer(8, [chest, head, legs, feet, hands, shoulders]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.armorAC, 12, 'Armor AC should be 5+2+2+1+1+1 = 12');
      assert.strictEqual(ac.dexBonus, 0, 'DEX bonus should be 0 (heavy armor suppresses negative DEX too)');
      assert.strictEqual(ac.totalAC, 22, 'Total AC should be 10 + 12 + 0 = 22');
    });

    it('Example 4: Wizard Unarmored with Magical Jewelry (DEX 16)', function() {
      // From design doc: Ring of Protection +1, Amulet of Protection +1
      const ring = createTestJewelry(EquipmentSlot.RING_1, 1, true, true);
      const amulet = createTestJewelry(EquipmentSlot.NECK, 1, true, true);

      const player = createTestPlayer(16, [ring, amulet]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.armorAC, 0, 'Armor AC should be 0 (unarmored)');
      assert.strictEqual(ac.dexBonus, 3, 'DEX bonus should be +3');
      assert.strictEqual(ac.magicalBonus, 2, 'Magical bonus should be 1+1 = 2');
      assert.strictEqual(ac.totalAC, 15, 'Total AC should be 10 + 0 + 3 + 2 = 15');
    });
  });

  // ============================================================
  // Test Suite: Edge Cases
  // ============================================================

  describe('Edge Cases', function() {

    it('should handle empty inventory', function() {
      const player = createTestPlayer(10, []);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.totalAC, 10, 'Total AC should be 10 for empty inventory');
    });

    it('should handle null player', function() {
      const ac = EquipmentManager.calculateAC(null);

      assert.strictEqual(ac.totalAC, 10, 'Total AC should be 10 for null player');
    });

    it('should handle negative DEX modifier', function() {
      const player = createTestPlayer(6, []); // DEX 6 = -2 modifier
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.dexBonus, 0, 'DEX bonus should be 0 (negative capped at 0)');
      assert.strictEqual(ac.totalAC, 10, 'Total AC should be 10 + 0 = 10');
    });

    it('should handle unequipped armor in inventory', function() {
      const equipped = createTestArmor(EquipmentSlot.CHEST, 3, ArmorClass.LIGHT, true);
      const unequipped = createTestArmor(EquipmentSlot.HEAD, 1, ArmorClass.LIGHT, false);

      const player = createTestPlayer(14, [equipped, unequipped]);
      const ac = EquipmentManager.calculateAC(player);

      assert.strictEqual(ac.armorAC, 3, 'Only equipped armor should count');
      assert.strictEqual(ac.totalAC, 15, 'Total AC should be 10 + 3 + 2 = 15');
    });

    it('should include breakdown information', function() {
      const chest = createTestArmor(EquipmentSlot.CHEST, 4, ArmorClass.MEDIUM, true);
      const player = createTestPlayer(14, [chest]);
      const ac = EquipmentManager.calculateAC(player);

      assert.ok(Array.isArray(ac.breakdown), 'Breakdown should be an array');
      assert.ok(ac.breakdown.length > 0, 'Breakdown should contain entries');
      assert.ok(ac.breakdown.some(entry => entry.includes('armor')), 'Breakdown should mention armor');
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  console.log('Running Aggregate AC System Tests...\n');
  // Note: Actual test execution would be handled by mocha
  console.log('Please run with: npm test tests/test_aggregate_ac_system.js');
}
