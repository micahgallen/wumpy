/**
 * Equipment System Tests
 *
 * Tests the EquipmentManager and equipment-related functionality.
 *
 * Run with: bun run tests/equipmentTests.js
 */

const { TestRunner, assert } = require('./testRunner');
const EquipmentManager = require('../src/systems/equipment/EquipmentManager');
const InventoryManager = require('../src/systems/inventory/InventoryManager');
const AttunementManager = require('../src/systems/equipment/AttunementManager');
const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const { ItemType, EquipmentSlot } = require('../src/items/schemas/ItemTypes');

// Create test runner
const runner = new TestRunner('Equipment System');

// Test data - create a mock player
function createTestPlayer() {
  return {
    username: 'testplayer',
    name: 'testplayer',
    level: 5,
    class: 'fighter',
    inventory: [],
    stats: {
      strength: 14,    // +2 modifier
      dexterity: 12,   // +1 modifier
      constitution: 13,
      intelligence: 10,
      wisdom: 10,
      charisma: 8
    }
  };
}

// Test item definitions
const testWeaponDef = {
  id: 'test_sword',
  name: 'Test Sword',
  description: 'A sword for testing',
  keywords: ['sword', 'test'],
  itemType: ItemType.WEAPON,
  weight: 3,
  value: 15,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  weaponProperties: {
    damageDice: '1d8',
    damageType: 'slashing',
    weaponClass: 'swords',
    isTwoHanded: false,
    isRanged: false,
    isLight: false,
    isFinesse: false
  }
};

const testTwoHandedWeaponDef = {
  id: 'test_greatsword',
  name: 'Test Greatsword',
  description: 'A two-handed sword for testing',
  keywords: ['greatsword', 'test'],
  itemType: ItemType.WEAPON,
  weight: 6,
  value: 30,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  weaponProperties: {
    damageDice: '2d6',
    damageType: 'slashing',
    weaponClass: 'swords',
    isTwoHanded: true,
    isRanged: false,
    isLight: false,
    isFinesse: false
  }
};

const testLightWeaponDef = {
  id: 'test_dagger',
  name: 'Test Dagger',
  description: 'A light dagger for testing',
  keywords: ['dagger', 'test'],
  itemType: ItemType.WEAPON,
  weight: 1,
  value: 2,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  weaponProperties: {
    damageDice: '1d4',
    damageType: 'piercing',
    weaponClass: 'simple_melee',
    isTwoHanded: false,
    isRanged: false,
    isLight: true,
    isFinesse: true
  }
};

const testArmorDef = {
  id: 'test_leather_armor',
  name: 'Test Leather Armor',
  description: 'Leather armor for testing',
  keywords: ['leather', 'armor', 'test'],
  itemType: ItemType.ARMOR,
  weight: 10,
  value: 25,
  isEquippable: true,
  slot: EquipmentSlot.CHEST,
  armorProperties: {
    baseAC: 11,
    armorClass: 'light',
    stealthDisadvantage: false
  }
};

const testHeavyArmorDef = {
  id: 'test_chainmail',
  name: 'Test Chainmail',
  description: 'Heavy chainmail for testing',
  keywords: ['chainmail', 'armor', 'test'],
  itemType: ItemType.ARMOR,
  weight: 55,
  value: 150,
  isEquippable: true,
  slot: EquipmentSlot.CHEST,
  armorProperties: {
    baseAC: 16,
    armorClass: 'heavy',
    stealthDisadvantage: true,
    strengthRequirement: 13
  }
};

const testAttunementItemDef = {
  id: 'test_magic_ring',
  name: 'Test Magic Ring',
  description: 'A magical ring requiring attunement',
  keywords: ['ring', 'magic', 'test'],
  itemType: ItemType.JEWELRY,
  weight: 0.1,
  value: 500,
  rarity: 'rare',
  isEquippable: true,
  requiresAttunement: true,
  slot: EquipmentSlot.RING_1,
  statModifiers: {
    str: 1
  }
};

// Register test items
ItemRegistry.registerItem(testWeaponDef);
ItemRegistry.registerItem(testTwoHandedWeaponDef);
ItemRegistry.registerItem(testLightWeaponDef);
ItemRegistry.registerItem(testArmorDef);
ItemRegistry.registerItem(testHeavyArmorDef);
ItemRegistry.registerItem(testAttunementItemDef);

// === EQUIPMENT TESTS ===

runner.test('Basic weapon equip/unequip', () => {
  const player = createTestPlayer();
  const sword = ItemFactory.createItem('test_sword');

  // Add to inventory
  InventoryManager.addItem(player, sword);
  assert.equal(player.inventory.length, 1, 'Item added to inventory');
  assert.equal(sword.isEquipped, false, 'Item starts unequipped');

  // Equip weapon
  const equipResult = EquipmentManager.equipItem(player, sword);
  assert.equal(equipResult.success, true, 'Equip succeeded');
  assert.equal(sword.isEquipped, true, 'Item is now equipped');
  assert.equal(sword.equippedSlot, EquipmentSlot.MAIN_HAND, 'Equipped in main hand');

  // Check it appears in equipped items
  const equipped = EquipmentManager.getEquippedItems(player);
  assert.equal(equipped.length, 1, 'One item equipped');
  assert.equal(equipped[0].instanceId, sword.instanceId, 'Correct item equipped');

  // Unequip weapon
  const unequipResult = EquipmentManager.unequipItem(player, sword);
  assert.equal(unequipResult.success, true, 'Unequip succeeded');
  assert.equal(sword.isEquipped, false, 'Item is now unequipped');
  assert.equal(sword.equippedSlot, null, 'Equipped slot cleared');
});

runner.test('Two-handed weapon slot validation', () => {
  const player = createTestPlayer();
  const greatsword = ItemFactory.createItem('test_greatsword');
  const sword = ItemFactory.createItem('test_sword');

  InventoryManager.addItem(player, greatsword);
  InventoryManager.addItem(player, sword);

  // Equip regular sword in off-hand first
  EquipmentManager.equipItem(player, sword, EquipmentSlot.OFF_HAND);
  assert.equal(sword.isEquipped, true, 'Off-hand weapon equipped');

  // Equip two-handed weapon - should auto-unequip off-hand
  const equipResult = EquipmentManager.equipItem(player, greatsword);
  assert.equal(equipResult.success, true, 'Two-handed weapon equipped');
  assert.equal(greatsword.isEquipped, true, 'Greatsword equipped');
  assert.equal(sword.isEquipped, false, 'Off-hand automatically unequipped');

  // Check that off-hand is empty
  const offHand = EquipmentManager.getEquippedInSlot(player, EquipmentSlot.OFF_HAND);
  assert.equal(offHand, null, 'Off-hand slot is empty');
});

runner.test('Dual wield validation (light weapons only)', () => {
  const player = createTestPlayer();
  const dagger1 = ItemFactory.createItem('test_dagger');
  const dagger2 = ItemFactory.createItem('test_dagger');
  const sword = ItemFactory.createItem('test_sword');

  InventoryManager.addItem(player, dagger1);
  InventoryManager.addItem(player, dagger2);
  InventoryManager.addItem(player, sword);

  // Equip light weapon in main hand
  EquipmentManager.equipItem(player, dagger1, EquipmentSlot.MAIN_HAND);
  assert.equal(dagger1.isEquipped, true, 'Main hand dagger equipped');

  // Equip light weapon in off-hand - should succeed
  const offHandResult = EquipmentManager.equipItem(player, dagger2, EquipmentSlot.OFF_HAND);
  assert.equal(offHandResult.success, true, 'Off-hand light weapon equipped');
  assert.equal(dagger2.isEquipped, true, 'Dual wielding works with light weapons');

  // Check dual wielding detection
  const isDualWielding = EquipmentManager.isDualWielding(player);
  assert.equal(isDualWielding, true, 'Player is dual wielding');

  // Try to equip non-light weapon in off-hand
  EquipmentManager.unequipItem(player, dagger2);
  const heavyOffHandResult = EquipmentManager.equipItem(player, sword, EquipmentSlot.OFF_HAND);
  assert.equal(heavyOffHandResult.success, false, 'Non-light weapon blocked in off-hand');
});

runner.test('Armor class calculation', () => {
  const player = createTestPlayer();

  // Unarmored AC (10 + DEX)
  let ac = EquipmentManager.calculateAC(player);
  assert.equal(ac.baseAC, 10, 'Base AC is 10 when unarmored');
  assert.equal(ac.dexBonus, 1, 'DEX bonus is +1 (DEX 12)');
  assert.equal(ac.totalAC, 11, 'Total AC is 11 unarmored');

  // Equip light armor (11 + full DEX)
  const leatherArmor = ItemFactory.createItem('test_leather_armor');
  InventoryManager.addItem(player, leatherArmor);
  EquipmentManager.equipItem(player, leatherArmor);

  ac = EquipmentManager.calculateAC(player);
  assert.equal(ac.baseAC, 11, 'Base AC from leather armor');
  assert.equal(ac.dexBonus, 1, 'Full DEX bonus with light armor');
  assert.equal(ac.totalAC, 12, 'Total AC with light armor');

  // Unequip and equip heavy armor (16 + no DEX)
  EquipmentManager.unequipItem(player, leatherArmor);
  const chainmail = ItemFactory.createItem('test_chainmail');
  InventoryManager.addItem(player, chainmail);
  EquipmentManager.equipItem(player, chainmail);

  ac = EquipmentManager.calculateAC(player);
  assert.equal(ac.baseAC, 16, 'Base AC from chainmail');
  assert.equal(ac.dexBonus, 0, 'No DEX bonus with heavy armor');
  assert.equal(ac.totalAC, 16, 'Total AC with heavy armor');
});

runner.test('Attunement requirement enforcement', () => {
  const player = createTestPlayer();
  const ring = ItemFactory.createItem('test_magic_ring');

  InventoryManager.addItem(player, ring);
  assert.equal(ring.requiresAttunement, true, 'Item requires attunement');
  assert.equal(ring.isAttuned, false, 'Item not yet attuned');

  // Try to equip without attunement
  const equipResult = EquipmentManager.equipItem(player, ring);
  assert.equal(equipResult.success, false, 'Cannot equip without attunement');
  assert.equal(ring.isEquipped, false, 'Item remains unequipped');

  // Attune to item
  const attuneResult = AttunementManager.attuneToItem(player, ring);
  assert.equal(attuneResult.success, true, 'Attunement succeeded');
  assert.equal(ring.isAttuned, true, 'Item is now attuned');

  // Now equip should work
  const equipResult2 = EquipmentManager.equipItem(player, ring);
  assert.equal(equipResult2.success, true, 'Can equip after attunement');
  assert.equal(ring.isEquipped, true, 'Item is equipped');
});

runner.test('Slot replacement (auto-unequip)', () => {
  const player = createTestPlayer();
  const sword1 = ItemFactory.createItem('test_sword');
  const sword2 = ItemFactory.createItem('test_sword');

  InventoryManager.addItem(player, sword1);
  InventoryManager.addItem(player, sword2);

  // Equip first sword
  EquipmentManager.equipItem(player, sword1);
  assert.equal(sword1.isEquipped, true, 'First sword equipped');

  // Equip second sword in same slot - should auto-unequip first
  EquipmentManager.equipItem(player, sword2);
  assert.equal(sword1.isEquipped, false, 'First sword auto-unequipped');
  assert.equal(sword2.isEquipped, true, 'Second sword equipped');

  // Check only one item in main hand
  const mainHand = EquipmentManager.getEquippedInSlot(player, EquipmentSlot.MAIN_HAND);
  assert.equal(mainHand.instanceId, sword2.instanceId, 'Correct weapon in main hand');
});

runner.test('Equipment by slot retrieval', () => {
  const player = createTestPlayer();
  const sword = ItemFactory.createItem('test_sword');
  const armor = ItemFactory.createItem('test_leather_armor');

  InventoryManager.addItem(player, sword);
  InventoryManager.addItem(player, armor);

  EquipmentManager.equipItem(player, sword);
  EquipmentManager.equipItem(player, armor);

  const bySlot = EquipmentManager.getEquipmentBySlot(player);

  // Check weapon slots
  assert.notEqual(bySlot[EquipmentSlot.MAIN_HAND], null, 'Main hand has item');
  assert.equal(bySlot[EquipmentSlot.OFF_HAND], null, 'Off hand is empty');
  assert.equal(bySlot[EquipmentSlot.MAIN_HAND].instanceId, sword.instanceId, 'Correct weapon in main hand');

  // Check armor slots
  assert.notEqual(bySlot[EquipmentSlot.CHEST], null, 'Chest has armor');
  assert.equal(bySlot[EquipmentSlot.HEAD], null, 'Head slot is empty');
  assert.equal(bySlot[EquipmentSlot.CHEST].instanceId, armor.instanceId, 'Correct armor in chest');
});

runner.test('Cannot drop equipped items', () => {
  const player = createTestPlayer();
  const sword = ItemFactory.createItem('test_sword');

  InventoryManager.addItem(player, sword);
  EquipmentManager.equipItem(player, sword);

  assert.equal(sword.isEquipped, true, 'Sword is equipped');

  // The drop command checks isEquipped flag and blocks
  // We simulate this check here
  const canDrop = !sword.isEquipped;
  assert.equal(canDrop, false, 'Cannot drop equipped item');
});

runner.test('Equipment stats aggregation', () => {
  const player = createTestPlayer();
  const dagger1 = ItemFactory.createItem('test_dagger');
  const armor = ItemFactory.createItem('test_leather_armor');
  const dagger2 = ItemFactory.createItem('test_dagger');

  InventoryManager.addItem(player, dagger1);
  InventoryManager.addItem(player, armor);
  InventoryManager.addItem(player, dagger2);

  const equipResult1 = EquipmentManager.equipItem(player, dagger1, EquipmentSlot.MAIN_HAND);
  assert.equal(equipResult1.success, true, 'Dagger 1 equipped successfully');

  const equipResult2 = EquipmentManager.equipItem(player, armor);
  assert.equal(equipResult2.success, true, 'Armor equipped successfully');

  const equipResult3 = EquipmentManager.equipItem(player, dagger2, EquipmentSlot.OFF_HAND);
  assert.equal(equipResult3.success, true, 'Dagger 2 equipped successfully');

  const stats = EquipmentManager.getEquipmentStats(player);

  assert.equal(stats.totalEquipped, 3, 'Three items equipped');
  assert.equal(stats.weaponSlots, 2, 'Two weapon slots used');
  assert.equal(stats.armorSlots, 1, 'One armor slot used');
  assert.equal(stats.jewelrySlots, 0, 'No jewelry slots used');
  assert.equal(stats.isDualWielding, true, 'Player is dual wielding');
  assert.notEqual(stats.armorClass, undefined, 'AC calculated');
});

runner.test('Bind-on-equip functionality', () => {
  const player = createTestPlayer();

  // Create item with bindOnEquip flag
  const bindItemDef = {
    id: 'test_bind_sword',
    name: 'Test Bind Sword',
    description: 'A sword that binds when equipped',
    keywords: ['sword', 'bind'],
    itemType: ItemType.WEAPON,
    weight: 3,
    value: 50,
    isEquippable: true,
    bindOnEquip: true,
    slot: EquipmentSlot.MAIN_HAND,
    weaponProperties: {
      damageDice: '1d8',
      damageType: 'slashing',
      weaponClass: 'swords',
      isTwoHanded: false,
      isRanged: false
    }
  };

  ItemRegistry.registerItem(bindItemDef);
  const bindSword = ItemFactory.createItem('test_bind_sword');

  InventoryManager.addItem(player, bindSword);

  assert.equal(bindSword.boundTo, null, 'Item not bound initially');

  // Equip item - should trigger bind
  EquipmentManager.equipItem(player, bindSword);

  assert.equal(bindSword.boundTo, player.name, 'Item bound to player on equip');
  assert.equal(bindSword.isEquipped, true, 'Item is equipped');
});

runner.test('Slot validation for armor pieces', () => {
  const player = createTestPlayer();
  const armor = ItemFactory.createItem('test_leather_armor');

  InventoryManager.addItem(player, armor);

  // Try to equip chest armor in wrong slot
  const wrongSlotResult = EquipmentManager.equipItem(player, armor, EquipmentSlot.HEAD);
  assert.equal(wrongSlotResult.success, false, 'Cannot equip chest armor in head slot');

  // Equip in correct slot
  const correctSlotResult = EquipmentManager.equipItem(player, armor, EquipmentSlot.CHEST);
  assert.equal(correctSlotResult.success, true, 'Can equip chest armor in chest slot');
});

runner.test('Equip item not in inventory fails', () => {
  const player = createTestPlayer();
  const sword = ItemFactory.createItem('test_sword');

  // Don't add to inventory

  const equipResult = EquipmentManager.equipItem(player, sword);
  assert.equal(equipResult.success, false, 'Cannot equip item not in inventory');
});

runner.test('Double equip same item fails', () => {
  const player = createTestPlayer();
  const sword = ItemFactory.createItem('test_sword');

  InventoryManager.addItem(player, sword);
  EquipmentManager.equipItem(player, sword);

  assert.equal(sword.isEquipped, true, 'Sword equipped');

  // Try to equip again
  const equipResult = EquipmentManager.equipItem(player, sword);
  assert.equal(equipResult.success, false, 'Cannot equip already equipped item');
});

runner.test('Unequip non-equipped item fails', () => {
  const player = createTestPlayer();
  const sword = ItemFactory.createItem('test_sword');

  InventoryManager.addItem(player, sword);

  assert.equal(sword.isEquipped, false, 'Sword not equipped');

  const unequipResult = EquipmentManager.unequipItem(player, sword);
  assert.equal(unequipResult.success, false, 'Cannot unequip item that is not equipped');
});

// Run all tests
runner.run();

module.exports = runner;
