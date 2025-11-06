/**
 * Unit Tests for Item System
 *
 * Tests the core item framework including:
 * - Item Registry
 * - BaseItem class
 * - Item Factory
 * - Property mixins
 * - Attunement Manager
 */

const { TestRunner, assert } = require('./testRunner');
const ItemRegistry = require('../src/items/ItemRegistry');
const BaseItem = require('../src/items/BaseItem');
const ItemFactory = require('../src/items/ItemFactory');
const AttunementManager = require('../src/systems/equipment/AttunementManager');
const { ItemType, ItemRarity, EquipmentSlot, WeaponClass, ArmorClass, DamageType } = require('../src/items/schemas/ItemTypes');
const { validateItemDefinition } = require('../src/items/schemas/ItemValidator');

const runner = new TestRunner('Item System Tests');

// Test fixtures
const sampleWeaponDefinition = {
  id: 'test_iron_sword',
  name: 'Iron Sword',
  description: 'A simple iron sword.',
  keywords: ['sword', 'iron', 'weapon'],
  itemType: ItemType.WEAPON,
  subType: 'sword',
  weight: 3,
  value: 10,
  rarity: ItemRarity.COMMON,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
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

const sampleArmorDefinition = {
  id: 'test_leather_armor',
  name: 'Leather Armor',
  description: 'Light leather armor.',
  keywords: ['armor', 'leather'],
  itemType: ItemType.ARMOR,
  subType: 'light',
  weight: 10,
  value: 25,
  rarity: ItemRarity.COMMON,
  isEquippable: true,
  slot: EquipmentSlot.CHEST,
  armorProperties: {
    baseAC: 11,
    armorClass: ArmorClass.LIGHT,
    maxDexBonus: Infinity,
    stealthDisadvantage: false
  }
};

const sampleConsumableDefinition = {
  id: 'test_health_potion',
  name: 'Health Potion',
  description: 'A red potion that restores health.',
  keywords: ['potion', 'health', 'red'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.5,
  value: 50,
  rarity: ItemRarity.COMMON,
  isStackable: true,
  consumableProperties: {
    consumableType: 'potion',
    healAmount: 25
  }
};

const sampleMagicalWeaponDefinition = {
  id: 'test_flaming_sword',
  name: 'Flaming Sword',
  description: 'A sword wreathed in flames.',
  keywords: ['sword', 'flaming', 'fire', 'magical'],
  itemType: ItemType.WEAPON,
  weight: 3,
  value: 500,
  rarity: ItemRarity.RARE,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  requiresAttunement: true,
  weaponProperties: {
    damageDice: '1d8+1',
    damageType: DamageType.SLASHING,
    weaponClass: WeaponClass.SWORDS,
    isTwoHanded: false,
    isRanged: false,
    magicalProperties: [
      {
        type: 'extra_damage',
        value: '1d6',
        description: '+1d6 fire damage'
      }
    ]
  }
};

// Setup test
runner.test('Setup - clear registries', () => {
  ItemRegistry.clearRegistry();
  AttunementManager.clearAllAttunements();
  assert.true(true, 'Setup complete');
});

// Test Item Validator
runner.test('validateItemDefinition - valid weapon', () => {
  const result = validateItemDefinition(sampleWeaponDefinition);
  assert.true(result.valid, 'Validation should pass for valid weapon');
  assert.equal(result.errors.length, 0, 'Should have no errors');
});

runner.test('validateItemDefinition - missing required fields', () => {
  const invalid = { id: 'test', name: 'Test' };
  const result = validateItemDefinition(invalid);
  assert.false(result.valid, 'Validation should fail for incomplete definition');
  assert.true(result.errors.length > 0, 'Should have errors');
});

runner.test('validateItemDefinition - invalid dice string', () => {
  const invalid = {
    ...sampleWeaponDefinition,
    id: 'test_invalid_weapon',
    weaponProperties: {
      ...sampleWeaponDefinition.weaponProperties,
      damageDice: 'invalid'
    }
  };
  const result = validateItemDefinition(invalid);
  assert.false(result.valid, 'Validation should fail for invalid dice string');
});

// Test Item Registry
runner.test('ItemRegistry.registerItem - register valid item', () => {
  ItemRegistry.registerItem(sampleWeaponDefinition, 'test_domain');
  assert.true(ItemRegistry.hasItem('test_iron_sword'), 'Item should be registered');
});

runner.test('ItemRegistry.getItem - retrieve registered item', () => {
  const item = ItemRegistry.getItem('test_iron_sword');
  assert.notNull(item, 'Should retrieve registered item');
  assert.equal(item.name, 'Iron Sword', 'Should have correct name');
  assert.equal(item.domain, 'test_domain', 'Should have correct domain');
});

runner.test('ItemRegistry.registerItem - prevent duplicate IDs', () => {
  try {
    ItemRegistry.registerItem(sampleWeaponDefinition, 'test_domain');
    assert.fail('Should throw error for duplicate ID');
  } catch (e) {
    assert.true(e.message.includes('already registered'), 'Should mention duplicate');
  }
});

runner.test('ItemRegistry.findItemsByKeyword - find by keyword', () => {
  ItemRegistry.registerItem(sampleArmorDefinition, 'test_domain');
  const items = ItemRegistry.findItemsByKeyword('sword');
  assert.equal(items.length, 1, 'Should find one sword');
  assert.equal(items[0].id, 'test_iron_sword', 'Should find correct item');
});

runner.test('ItemRegistry.getItemsByDomain - filter by domain', () => {
  const items = ItemRegistry.getItemsByDomain('test_domain');
  assert.equal(items.length, 2, 'Should find two items in test_domain');
});

runner.test('ItemRegistry.getStats - registry statistics', () => {
  const stats = ItemRegistry.getStats();
  assert.equal(stats.totalItems, 2, 'Should have 2 items');
  assert.equal(stats.totalDomains, 1, 'Should have 1 domain');
  assert.true(stats.byType[ItemType.WEAPON] === 1, 'Should have 1 weapon');
  assert.true(stats.byType[ItemType.ARMOR] === 1, 'Should have 1 armor');
});

// Test BaseItem
runner.test('BaseItem - create instance from definition', () => {
  const definition = ItemRegistry.getItem('test_iron_sword');
  const item = new BaseItem(definition);

  assert.notNull(item.instanceId, 'Should have instance ID');
  assert.equal(item.name, 'Iron Sword', 'Should have correct name');
  assert.equal(item.definitionId, 'test_iron_sword', 'Should reference definition');
  assert.equal(item.quantity, 1, 'Should have default quantity');
});

runner.test('BaseItem - generate unique instance IDs', () => {
  const definition = ItemRegistry.getItem('test_iron_sword');
  const item1 = new BaseItem(definition);
  const item2 = new BaseItem(definition);

  assert.notEqual(item1.instanceId, item2.instanceId, 'Instance IDs should be unique');
});

runner.test('BaseItem - toJSON serialization', () => {
  const definition = ItemRegistry.getItem('test_iron_sword');
  const item = new BaseItem(definition);
  const json = item.toJSON();

  assert.equal(json.definitionId, 'test_iron_sword', 'Should serialize definition ID');
  assert.equal(json.instanceId, item.instanceId, 'Should serialize instance ID');
  assert.equal(json.quantity, 1, 'Should serialize quantity');
});

runner.test('BaseItem - onEquip hook with bind-on-equip', () => {
  const bindDefinition = {
    ...sampleWeaponDefinition,
    id: 'test_bind_sword',
    bindOnEquip: true
  };
  ItemRegistry.registerItem(bindDefinition, 'test_domain');

  const item = ItemFactory.createItem(bindDefinition);
  const player = { name: 'TestPlayer' };

  assert.isNull(item.boundTo, 'Should not be bound initially');

  item.onEquip(player);

  assert.equal(item.boundTo, 'TestPlayer', 'Should be bound after equip');
});

runner.test('BaseItem - canStackWith', () => {
  ItemRegistry.registerItem(sampleConsumableDefinition, 'test_domain');
  const definition = ItemRegistry.getItem('test_health_potion');

  const item1 = ItemFactory.createItem(definition);
  const item2 = ItemFactory.createItem(definition);

  assert.true(item1.canStackWith(item2), 'Same consumables should stack');
});

runner.test('BaseItem - canStackWith prevents stacking bound items', () => {
  const definition = ItemRegistry.getItem('test_health_potion');
  const item1 = ItemFactory.createItem(definition, { boundTo: 'Player1' });
  const item2 = ItemFactory.createItem(definition);

  assert.false(item1.canStackWith(item2), 'Bound items should not stack');
});

// Test Item Factory
runner.test('ItemFactory.createItem - create weapon with mixin', () => {
  const definition = ItemRegistry.getItem('test_iron_sword');
  const weapon = ItemFactory.createItem(definition);

  assert.notNull(weapon, 'Should create weapon');
  assert.equal(typeof weapon.rollDamage, 'function', 'Should have rollDamage method from mixin');
  assert.equal(typeof weapon.getAttackBonus, 'function', 'Should have getAttackBonus method');
});

runner.test('ItemFactory.createItem - create armor with mixin', () => {
  const definition = ItemRegistry.getItem('test_leather_armor');
  const armor = ItemFactory.createItem(definition);

  assert.notNull(armor, 'Should create armor');
  assert.equal(typeof armor.getBaseAC, 'function', 'Should have getBaseAC method from mixin');
  assert.equal(typeof armor.calculateAC, 'function', 'Should have calculateAC method');
});

runner.test('ItemFactory.createItem - create consumable with mixin', () => {
  const definition = ItemRegistry.getItem('test_health_potion');
  const potion = ItemFactory.createItem(definition);

  assert.notNull(potion, 'Should create consumable');
  assert.equal(typeof potion.consume, 'function', 'Should have consume method from mixin');
});

runner.test('ItemFactory.restoreItem - restore from serialized data', () => {
  const definition = ItemRegistry.getItem('test_iron_sword');
  const original = ItemFactory.createItem(definition);
  const serialized = original.toJSON();

  const restored = ItemFactory.restoreItem(serialized, definition);

  assert.equal(restored.instanceId, original.instanceId, 'Should preserve instance ID');
  assert.equal(restored.definitionId, original.definitionId, 'Should preserve definition ID');
});

runner.test('ItemFactory.cloneItem - create copy with new ID', () => {
  const definition = ItemRegistry.getItem('test_iron_sword');
  const original = ItemFactory.createItem(definition);
  const clone = ItemFactory.cloneItem(original);

  assert.notEqual(clone.instanceId, original.instanceId, 'Clone should have different instance ID');
  assert.equal(clone.definitionId, original.definitionId, 'Clone should reference same definition');
});

// Test Weapon Mixin
runner.test('WeaponMixin.rollDamage - roll normal damage', () => {
  const definition = ItemRegistry.getItem('test_iron_sword');
  const weapon = ItemFactory.createItem(definition);

  const damage = weapon.rollDamage(false, false);
  assert.inRange(damage, 1, 8, 'Damage should be in range for 1d8');
});

runner.test('WeaponMixin.rollDamage - critical doubles dice', () => {
  const definition = ItemRegistry.getItem('test_iron_sword');
  const weapon = ItemFactory.createItem(definition);

  const damage = weapon.rollDamage(true, false);
  assert.inRange(damage, 2, 16, 'Critical damage should be in range for 2d8');
});

runner.test('WeaponMixin.getAttackBonus - apply proficiency penalty', () => {
  const definition = ItemRegistry.getItem('test_iron_sword');
  const weapon = ItemFactory.createItem(definition);

  const proficientBonus = weapon.getAttackBonus(true);
  const nonProficientBonus = weapon.getAttackBonus(false);

  assert.true(nonProficientBonus < proficientBonus, 'Non-proficient should have penalty');
});

runner.test('WeaponMixin.getCriticalRange - default is 20', () => {
  const definition = ItemRegistry.getItem('test_iron_sword');
  const weapon = ItemFactory.createItem(definition);

  assert.equal(weapon.getCriticalRange(), 20, 'Default critical range should be 20');
});

// Test Armor Mixin
runner.test('ArmorMixin.getBaseAC - return base AC', () => {
  const definition = ItemRegistry.getItem('test_leather_armor');
  const armor = ItemFactory.createItem(definition);

  assert.equal(armor.getBaseAC(), 11, 'Should return base AC of 11');
});

runner.test('ArmorMixin.calculateAC - apply DEX bonus', () => {
  const definition = ItemRegistry.getItem('test_leather_armor');
  const armor = ItemFactory.createItem(definition);

  const ac = armor.calculateAC(3, true);  // +3 DEX modifier
  assert.equal(ac, 14, 'Should be 11 base + 3 DEX = 14');
});

runner.test('ArmorMixin.getMaxDexBonus - light armor has no cap', () => {
  const definition = ItemRegistry.getItem('test_leather_armor');
  const armor = ItemFactory.createItem(definition);

  assert.equal(armor.getMaxDexBonus(), Infinity, 'Light armor should have no DEX cap');
});

// Test Consumable Mixin
runner.test('ConsumableMixin.consume - consume health potion', () => {
  const definition = ItemRegistry.getItem('test_health_potion');
  const potion = ItemFactory.createItem(definition, { quantity: 3 });

  const player = { hp: 50, maxHp: 100 };
  const result = potion.consume(player, {});

  assert.true(result.success, 'Consumption should succeed');
  assert.equal(player.hp, 75, 'Should heal 25 HP');
  assert.equal(potion.quantity, 2, 'Quantity should decrease');
  assert.false(result.consumed, 'Should not be fully consumed');
});

runner.test('ConsumableMixin.consume - last use consumed', () => {
  const definition = ItemRegistry.getItem('test_health_potion');
  const potion = ItemFactory.createItem(definition, { quantity: 1 });

  const player = { hp: 50, maxHp: 100 };
  const result = potion.consume(player, {});

  assert.true(result.consumed, 'Should be fully consumed after last use');
  assert.equal(potion.quantity, 0, 'Quantity should be 0');
});

// Test Attunement Manager
runner.test('AttunementManager.getMaxAttunementSlots - default 3 slots', () => {
  const player = { name: 'TestPlayer' };
  const maxSlots = AttunementManager.getMaxAttunementSlots(player);

  assert.equal(maxSlots, 3, 'Should have 3 attunement slots by default');
});

runner.test('AttunementManager.attuneToItem - attune magical item', () => {
  ItemRegistry.registerItem(sampleMagicalWeaponDefinition, 'test_domain');
  const definition = ItemRegistry.getItem('test_flaming_sword');
  const item = ItemFactory.createItem(definition);
  const player = { name: 'TestPlayer', level: 5, class: 'warrior' };

  const result = AttunementManager.attuneToItem(player, item);

  assert.true(result.success, 'Attunement should succeed');
  assert.true(item.isAttuned, 'Item should be marked as attuned');
  assert.equal(item.attunedTo, 'TestPlayer', 'Item should be attuned to player');
});

runner.test('AttunementManager.canAttuneToItem - prevent exceeding slots', () => {
  const player = { name: 'TestPlayer2', level: 5, class: 'warrior' };

  // Attune to 3 items (max)
  for (let i = 0; i < 3; i++) {
    const def = {
      ...sampleMagicalWeaponDefinition,
      id: `test_item_${i}`
    };
    ItemRegistry.registerItem(def, 'test_domain');
    const item = ItemFactory.createItem(def);
    AttunementManager.attuneToItem(player, item);
  }

  // Try to attune to a 4th item
  const fourthDef = {
    ...sampleMagicalWeaponDefinition,
    id: 'test_item_4'
  };
  ItemRegistry.registerItem(fourthDef, 'test_domain');
  const fourthItem = ItemFactory.createItem(fourthDef);

  const validation = AttunementManager.canAttuneToItem(player, fourthItem);

  assert.false(validation.canAttune, 'Should not be able to attune to 4th item');
  assert.true(validation.reason.includes('no available'), 'Should mention slot limit');
});

runner.test('AttunementManager.breakAttunement - remove attunement', () => {
  const definition = ItemRegistry.getItem('test_flaming_sword');
  const item = ItemFactory.createItem(definition);
  const player = { name: 'TestPlayer', level: 5, class: 'warrior' };

  AttunementManager.attuneToItem(player, item);
  assert.true(item.isAttuned, 'Item should be attuned');

  const result = AttunementManager.breakAttunement(player, item);

  assert.true(result.success, 'Break attunement should succeed');
  assert.false(item.isAttuned, 'Item should no longer be attuned');
  assert.isNull(item.attunedTo, 'Item should have no attuned player');
});

runner.test('AttunementManager.getAttunementStatus - show status', () => {
  const player = { name: 'TestPlayer3', level: 5, class: 'warrior' };
  const status = AttunementManager.getAttunementStatus(player);

  assert.equal(status.maxSlots, 3, 'Should have max 3 slots');
  assert.equal(typeof status.usedSlots, 'number', 'Should have used slots count');
  assert.equal(typeof status.availableSlots, 'number', 'Should have available slots count');
});

// Run tests if this is the main module
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runner;
