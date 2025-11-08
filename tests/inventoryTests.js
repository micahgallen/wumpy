/**
 * Inventory System Tests
 *
 * Tests for Phase 2: Inventory & Encumbrance
 * - InventoryManager operations
 * - Encumbrance (slots + weight)
 * - Stacking rules
 * - Persistence (serialization/deserialization)
 * - Death durability
 */

const { TestRunner, assert } = require('./testRunner');
const InventoryManager = require('../src/systems/inventory/InventoryManager');
const InventorySerializer = require('../src/systems/inventory/InventorySerializer');
const DeathHandler = require('../src/systems/inventory/DeathHandler');
const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const { ItemType, ItemRarity, EquipmentSlot, WeaponClass, DamageType } = require('../src/items/schemas/ItemTypes');

const runner = new TestRunner('Inventory System Tests');

// Test fixtures
function createTestPlayer(strength = 10) {
  return {
    username: 'testplayer',
    inventory: [],
    stats: {
      strength: strength,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    }
  };
}

function createTestWeapon() {
  const definition = {
    id: 'test_sword',
    name: 'Test Sword',
    description: 'A test sword',
    keywords: ['sword', 'test'],
    itemType: ItemType.WEAPON,
    weight: 3,
    value: 10,
    rarity: ItemRarity.COMMON,
    isEquippable: true,
    slot: EquipmentSlot.MAIN_HAND,
    maxDurability: 100,
    weaponProperties: {
      damageDice: '1d8',
      damageType: DamageType.SLASHING,
      weaponClass: WeaponClass.SWORDS,
      isTwoHanded: false,
      isRanged: false,
      isLight: false,
      isFinesse: false
    }
  };

  if (!ItemRegistry.hasItem(definition.id)) {
    ItemRegistry.registerItem(definition);
  }
  return ItemFactory.createItem(ItemRegistry.getItem(definition.id));
}

function createTestPotion() {
  const definition = {
    id: 'test_potion',
    name: 'Test Potion',
    description: 'A test potion',
    keywords: ['potion', 'test'],
    itemType: ItemType.CONSUMABLE,
    weight: 0.5,
    value: 25,
    rarity: ItemRarity.COMMON,
    isStackable: true,
    consumableProperties: {
      consumableType: 'potion',
      healAmount: 25
    }
  };

  if (!ItemRegistry.hasItem(definition.id)) {
    ItemRegistry.registerItem(definition);
  }
  return ItemFactory.createItem(ItemRegistry.getItem(definition.id));
}

function createHeavyItem(weight = 50) {
  const definition = {
    id: `heavy_item_${Date.now()}`,
    name: 'Heavy Item',
    description: 'A very heavy item',
    keywords: ['heavy', 'test'],
    itemType: ItemType.MISC,
    weight: weight,
    value: 10,
    rarity: ItemRarity.COMMON
  };

  ItemRegistry.registerItem(definition);
  return ItemFactory.createItem(definition);
}

// ========================================
// ENCUMBRANCE TESTS
// ========================================

runner.test('Encumbrance: Calculate max weight based on STR', () => {
  const player10Str = createTestPlayer(10);
  const player20Str = createTestPlayer(20);

  const maxWeight10 = InventoryManager.getMaxWeight(player10Str);
  const maxWeight20 = InventoryManager.getMaxWeight(player20Str);

  // baseWeight: 150, weightPerStrength: 15
  // STR 10 = 150 + (10 * 15) = 300
  // STR 20 = 150 + (20 * 15) = 450
  assert.equal(maxWeight10, 300, 'STR 10 should give 300 lbs capacity');
  assert.equal(maxWeight20, 450, 'STR 20 should give 450 lbs capacity');
});

runner.test('Encumbrance: Calculate max slots based on STR modifier', () => {
  const player8Str = createTestPlayer(8);   // -1 modifier
  const player10Str = createTestPlayer(10); // 0 modifier
  const player14Str = createTestPlayer(14); // +2 modifier

  const maxSlots8 = InventoryManager.getMaxSlots(player8Str);
  const maxSlots10 = InventoryManager.getMaxSlots(player10Str);
  const maxSlots14 = InventoryManager.getMaxSlots(player14Str);

  // baseSlots: 20, slotsPerStrength: 2
  // STR 8 (mod -1) = 20 + (-1 * 2) = 18
  // STR 10 (mod 0) = 20 + (0 * 2) = 20
  // STR 14 (mod +2) = 20 + (2 * 2) = 24
  assert.equal(maxSlots8, 18, 'STR 8 should give 18 slots');
  assert.equal(maxSlots10, 20, 'STR 10 should give 20 slots');
  assert.equal(maxSlots14, 24, 'STR 14 should give 24 slots');
});

runner.test('Encumbrance: Block adding items beyond weight limit', () => {
  const player = createTestPlayer(10); // 300 lbs capacity
  const heavyItem1 = createHeavyItem(200);
  const heavyItem2 = createHeavyItem(150); // This should exceed

  const result1 = InventoryManager.addItem(player, heavyItem1);
  assert.equal(result1.success, true, 'First heavy item should be added');

  const result2 = InventoryManager.addItem(player, heavyItem2);
  assert.equal(result2.success, false, 'Second heavy item should be blocked');
  assert.true(/heavy|weight/i.test(result2.reason), 'Reason should mention weight');
});

runner.test('Encumbrance: Block adding items beyond slot limit', () => {
  const player = createTestPlayer(10); // 20 slots

  // Add 20 non-stackable items (swords)
  for (let i = 0; i < 20; i++) {
    const item = createTestWeapon();
    const result = InventoryManager.addItem(player, item);
    assert.equal(result.success, true, `Item ${i + 1} should be added`);
  }

  // 21st item should be blocked
  const extraItem = createTestWeapon();
  const result = InventoryManager.addItem(player, extraItem);
  assert.equal(result.success, false, '21st item should be blocked');
  assert.true(/full|slot/i.test(result.reason), 'Reason should mention slots');
});

runner.test('Encumbrance: Calculate current weight correctly', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon(); // 3 lbs
  const potion1 = createTestPotion(); // 0.5 lbs
  const potion2 = createTestPotion(); // 0.5 lbs
  potion1.quantity = 10; // 10x potions = 5 lbs

  InventoryManager.addItem(player, sword);
  InventoryManager.addItem(player, potion1);
  InventoryManager.addItem(player, potion2);

  const weight = InventoryManager.getWeight(player);
  // 3 + (0.5 * 10) + (0.5 * 1) = 3 + 5 + 0.5 = 8.5
  assert.equal(weight, 8.5, 'Weight should be 8.5 lbs');
});

// ========================================
// STACKING TESTS
// ========================================

runner.test('Stacking: Stackable items combine into existing stack', () => {
  const player = createTestPlayer(10);

  const potion1 = createTestPotion();
  potion1.quantity = 10;

  const potion2 = createTestPotion();
  potion2.quantity = 5;

  const result1 = InventoryManager.addItem(player, potion1);
  assert.equal(result1.success, true, 'First potion stack added');
  assert.equal(player.inventory.length, 1, 'Should have 1 stack');

  const result2 = InventoryManager.addItem(player, potion2);
  assert.equal(result2.success, true, 'Second potion stack should combine');
  assert.equal(player.inventory.length, 1, 'Should still have 1 stack');
  assert.equal(player.inventory[0].quantity, 15, 'Stack should have 15 total');
});

runner.test('Stacking: Non-stackable items create separate instances', () => {
  const player = createTestPlayer(10);

  const sword1 = createTestWeapon();
  const sword2 = createTestWeapon();

  InventoryManager.addItem(player, sword1);
  InventoryManager.addItem(player, sword2);

  assert.equal(player.inventory.length, 2, 'Should have 2 separate swords');
  assert.notEqual(sword1.instanceId, sword2.instanceId, 'Should have different instance IDs');
});

runner.test('Stacking: Respect stack size limits', () => {
  const player = createTestPlayer(10);

  const potion1 = createTestPotion();
  potion1.quantity = 99; // Max consumable stack

  const potion2 = createTestPotion();
  potion2.quantity = 5;

  InventoryManager.addItem(player, potion1);
  const result = InventoryManager.addItem(player, potion2);

  // Should not stack because first stack is at max
  assert.equal(player.inventory.length, 2, 'Should create new stack');
});

runner.test('Stacking: Bound items do not stack', () => {
  const player = createTestPlayer(10);

  const potion1 = createTestPotion();
  potion1.quantity = 10;
  potion1.boundTo = 'testplayer';

  const potion2 = createTestPotion();
  potion2.quantity = 5;

  InventoryManager.addItem(player, potion1);
  InventoryManager.addItem(player, potion2);

  assert.equal(player.inventory.length, 2, 'Bound items should not stack with unbound');
});

runner.test('Stacking: Split stack functionality', () => {
  const player = createTestPlayer(10);

  const potion = createTestPotion();
  potion.quantity = 20;

  InventoryManager.addItem(player, potion);

  const result = InventoryManager.splitStack(player, potion.instanceId, 5);

  assert.equal(result.success, true, 'Split should succeed');
  assert.equal(player.inventory.length, 2, 'Should have 2 stacks');
  assert.equal(potion.quantity, 15, 'Original stack should have 15');
  assert.equal(result.newInstance.quantity, 5, 'New stack should have 5');
});

// ========================================
// PERSISTENCE TESTS
// ========================================

runner.test('Persistence: Serialize inventory to JSON', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon();
  sword.durability = 75;
  sword.isEquipped = true;
  sword.equippedSlot = EquipmentSlot.MAIN_HAND;

  const potion = createTestPotion();
  potion.quantity = 10;

  InventoryManager.addItem(player, sword);
  InventoryManager.addItem(player, potion);

  const serialized = InventorySerializer.serializeInventory(player);

  assert.equal(Array.isArray(serialized), true, 'Serialized should be array');
  assert.equal(serialized.length, 2, 'Should have 2 serialized items');

  const swordData = serialized.find(i => i.definitionId === 'test_sword');
  assert.equal(swordData.durability, 75, 'Durability should be preserved');
  assert.equal(swordData.isEquipped, true, 'Equipped state should be preserved');
  assert.equal(swordData.equippedSlot, EquipmentSlot.MAIN_HAND, 'Equipped slot should be preserved');

  const potionData = serialized.find(i => i.definitionId === 'test_potion');
  assert.equal(potionData.quantity, 10, 'Quantity should be preserved');
});

runner.test('Persistence: Deserialize inventory from JSON', () => {
  const player = createTestPlayer(10);

  const serializedData = [
    {
      instanceId: 'test-instance-1',
      definitionId: 'test_sword',
      quantity: 1,
      durability: 75,
      maxDurability: 100,
      isEquipped: true,
      equippedSlot: EquipmentSlot.MAIN_HAND,
      boundTo: null,
      isAttuned: false,
      attunedTo: null,
      isIdentified: true,
      enchantments: [],
      customName: null,
      customDescription: null,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    }
  ];

  const restored = InventorySerializer.deserializeInventory(player, serializedData);

  assert.equal(restored.length, 1, 'Should restore 1 item');
  assert.equal(restored[0].definitionId, 'test_sword', 'Should restore correct item');
  assert.equal(restored[0].durability, 75, 'Should restore durability');
  assert.equal(restored[0].isEquipped, true, 'Should restore equipped state');
});

runner.test('Persistence: Round-trip serialization preserves data', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon();
  sword.durability = 50;
  sword.boundTo = 'testplayer';
  sword.isIdentified = true;
  sword.isEquipped = true;

  InventoryManager.addItem(player, sword);

  // Serialize
  const serialized = InventorySerializer.serializeInventory(player);

  // Clear inventory
  player.inventory = [];

  // Deserialize
  player.inventory = InventorySerializer.deserializeInventory(player, serialized);

  // Verify
  assert.equal(player.inventory.length, 1, 'Should have 1 item after round-trip');
  const restored = player.inventory[0];
  assert.equal(restored.definitionId, 'test_sword', 'Definition ID preserved');
  assert.equal(restored.durability, 50, 'Durability preserved');
  assert.equal(restored.boundTo, 'testplayer', 'Binding preserved');
  assert.equal(restored.isIdentified, true, 'Identified state preserved');
  assert.equal(restored.isEquipped, true, 'Equipped state preserved');
});

runner.test('Persistence: Handle missing item definitions gracefully', () => {
  const player = createTestPlayer(10);

  const serializedData = [
    {
      instanceId: 'test-instance-1',
      definitionId: 'nonexistent_item', // This definition doesn't exist
      quantity: 1,
      durability: 100,
      isEquipped: false
    }
  ];

  const restored = InventorySerializer.deserializeInventory(player, serializedData);

  assert.equal(restored.length, 0, 'Should skip items with missing definitions');
});

// ========================================
// DEATH DURABILITY TESTS
// ========================================

runner.test('Death Durability: Equipped items lose durability on death', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon();
  sword.durability = 100;
  sword.maxDurability = 100;
  sword.isEquipped = true;

  InventoryManager.addItem(player, sword);

  const result = DeathHandler.handlePlayerDeath(player);

  assert.equal(result.success, true, 'Death handler should succeed');
  assert.equal(result.affectedItems, 1, 'Should affect 1 item');
  assert.equal(sword.durability, 90, 'Should lose 10% durability (10 points)');
});

runner.test('Death Durability: Unequipped items do not lose durability', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon();
  sword.durability = 100;
  sword.maxDurability = 100;
  sword.isEquipped = false; // Not equipped

  InventoryManager.addItem(player, sword);

  DeathHandler.handlePlayerDeath(player);

  assert.equal(sword.durability, 100, 'Unequipped item should not lose durability');
});

runner.test('Death Durability: Items can break at 0 durability', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon();
  sword.durability = 5;
  sword.maxDurability = 100;
  sword.isEquipped = true;

  InventoryManager.addItem(player, sword);

  const result = DeathHandler.handlePlayerDeath(player);

  assert.equal(sword.durability, 0, 'Item should break (0 durability)');
  assert.equal(result.brokenItems, 1, 'Should report 1 broken item');
});

runner.test('Death Durability: Calculate repair costs', () => {
  const sword = createTestWeapon();
  sword.durability = 50;
  sword.maxDurability = 100;
  sword.value = 100; // 100 gold

  const cost = DeathHandler.getRepairCost(sword);

  // 50 durability lost, value 100, multiplier 0.2
  // cost = 100 * (50/100) * 0.2 = 10 gold
  assert.equal(cost, 10, 'Repair cost should be 10 gold');
});

runner.test('Death Durability: Repair items', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon();
  sword.durability = 50;
  sword.maxDurability = 100;
  sword.value = 100;

  InventoryManager.addItem(player, sword);

  const result = DeathHandler.repairItem(player, sword, 25);

  assert.equal(result.success, true, 'Repair should succeed');
  assert.equal(result.repairedAmount, 25, 'Should repair 25 durability');
  assert.equal(sword.durability, 75, 'Durability should be 75');
  assert.equal(result.cost, 5, 'Cost should be 5 gold');
});

// ========================================
// INVENTORY OPERATIONS TESTS
// ========================================

runner.test('Operations: Remove item by instance ID', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon();
  InventoryManager.addItem(player, sword);

  const removed = InventoryManager.removeItem(player, sword.instanceId);

  assert.notEqual(removed, null, 'Should return removed item');
  assert.equal(removed.instanceId, sword.instanceId, 'Should be the correct item');
  assert.equal(player.inventory.length, 0, 'Inventory should be empty');
});

runner.test('Operations: Find item by keyword', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon();
  const potion = createTestPotion();

  InventoryManager.addItem(player, sword);
  InventoryManager.addItem(player, potion);

  const foundSword = InventoryManager.findItemByKeyword(player, 'sword');
  const foundPotion = InventoryManager.findItemByKeyword(player, 'potion');

  assert.notEqual(foundSword, null, 'Should find sword');
  assert.equal(foundSword.definitionId, 'test_sword', 'Should be the sword');
  assert.notEqual(foundPotion, null, 'Should find potion');
  assert.equal(foundPotion.definitionId, 'test_potion', 'Should be the potion');
});

runner.test('Operations: Get inventory statistics', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon(); // 3 lbs
  const potion = createTestPotion(); // 0.5 lbs
  potion.quantity = 10;

  InventoryManager.addItem(player, sword);
  InventoryManager.addItem(player, potion);

  const stats = InventoryManager.getInventoryStats(player);

  assert.equal(stats.slots.current, 2, 'Should use 2 slots');
  assert.equal(stats.slots.max, 20, 'Should have 20 max slots');
  assert.equal(stats.weight.current, 8, 'Should weigh 8 lbs (3 + 5)');
  assert.equal(stats.weight.max, 300, 'Should have 300 lbs capacity');
  assert.equal(stats.itemCount, 11, 'Should have 11 total items (1 + 10)');
});

runner.test('Operations: Sort inventory by various criteria', () => {
  const player = createTestPlayer(10);

  const sword = createTestWeapon();
  sword.name = 'Zebra Sword';

  const potion = createTestPotion();
  potion.name = 'Apple Potion';

  InventoryManager.addItem(player, sword);
  InventoryManager.addItem(player, potion);

  const sortedByName = InventoryManager.sortInventory(player, 'name');

  assert.equal(sortedByName[0].name, 'Apple Potion', 'First item should be Apple Potion');
  assert.equal(sortedByName[1].name, 'Zebra Sword', 'Second item should be Zebra Sword');
});

// ========================================
// RUN TESTS
// ========================================

// Clean up registry before running
ItemRegistry.clearRegistry();

async function run() {
  console.log('\n' + '='.repeat(70));
  console.log('RUNNING INVENTORY SYSTEM TESTS (Phase 2)');
  console.log('='.repeat(70) + '\n');

  await runner.run();

  console.log('\n' + '='.repeat(70));
  console.log('INVENTORY TESTS COMPLETE');
  console.log('='.repeat(70) + '\n');

  return runner.passed === runner.total;
}

if (require.main === module) {
  run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { run, passed: runner.passed, failed: runner.failed };
