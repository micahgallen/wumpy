/**
 * Spawn System Tests
 *
 * Comprehensive tests for the item spawn system including spawn tag validation,
 * spawnability checks, loot generation, and tag filtering.
 */

const { TestRunner, assert } = require('./testRunner');
const { validateItemDefinition } = require('../src/items/schemas/ItemValidator');
const { SpawnTag, ItemType, ItemRarity } = require('../src/items/schemas/ItemTypes');
const ItemRegistry = require('../src/items/ItemRegistry');
const ItemFactory = require('../src/items/ItemFactory');
const LootGenerator = require('../src/systems/loot/LootGenerator');

const runner = new TestRunner('Spawn System Tests');

// Helper to clear registries
function clear() {
  ItemRegistry.clearRegistry();
}

// Spawn Tag Validation Tests
runner.test('validateItemDefinition - valid spawn tags', () => {
  const definition = {
    id: 'test_sword',
    name: 'Test Sword',
    description: 'A test weapon',
    keywords: ['sword', 'test'],
    itemType: ItemType.WEAPON,
    weight: 3,
    value: 10,
    rarity: ItemRarity.COMMON,
    spawnable: true,
    spawnTags: [SpawnTag.TYPE_WEAPON, SpawnTag.WEAPON_MELEE, SpawnTag.REALM_GENERIC]
  };

  const result = validateItemDefinition(definition);
  assert.true(result.valid, 'Valid spawn tags should pass validation');
});

runner.test('validateItemDefinition - invalid spawn tag', () => {
  const definition = {
    id: 'test_sword',
    name: 'Test Sword',
    description: 'A test weapon',
    keywords: ['sword', 'test'],
    itemType: ItemType.WEAPON,
    weight: 3,
    value: 10,
    rarity: ItemRarity.COMMON,
    spawnable: true,
    spawnTags: ['invalid_tag_xyz']
  };

  const result = validateItemDefinition(definition);
  assert.false(result.valid, 'Invalid spawn tag should fail validation');
});

runner.test('validateItemDefinition - quest item cannot be spawnable', () => {
  const definition = {
    id: 'test_quest',
    name: 'Quest Item',
    description: 'A quest item',
    keywords: ['quest'],
    itemType: ItemType.QUEST,
    weight: 1,
    value: 0,
    rarity: ItemRarity.COMMON,
    spawnable: true
  };

  const result = validateItemDefinition(definition);
  assert.false(result.valid, 'Quest items cannot be spawnable');
});

runner.test('validateItemDefinition - artifact cannot be spawnable', () => {
  const definition = {
    id: 'test_artifact',
    name: 'Artifact Item',
    description: 'An artifact',
    keywords: ['artifact'],
    itemType: ItemType.WEAPON,
    weight: 1,
    value: 1000,
    rarity: ItemRarity.ARTIFACT,
    spawnable: true
  };

  const result = validateItemDefinition(definition);
  assert.false(result.valid, 'Artifacts cannot be spawnable');
});

// BaseItem Spawn Methods Tests
runner.test('BaseItem.isSpawnable - spawnable weapon', () => {
  clear();
  
  const definition = {
    id: 'test_spawnable_sword',
    name: 'Spawnable Sword',
    description: 'A spawnable weapon',
    keywords: ['sword'],
    itemType: ItemType.WEAPON,
    weight: 3,
    value: 10,
    rarity: ItemRarity.COMMON,
    spawnable: true,
    lootTables: ['common_loot']
  };

  ItemRegistry.registerItem(definition, 'test_domain');
  const item = ItemFactory.createItem(definition);

  assert.true(item.isSpawnable(), 'Item with spawnable: true should be spawnable');
});

runner.test('BaseItem.isSpawnable - quest item never spawnable', () => {
  clear();
  
  const definition = {
    id: 'test_quest_key',
    name: 'Quest Key',
    description: 'A quest key',
    keywords: ['key'],
    itemType: ItemType.QUEST,
    weight: 1,
    value: 0,
    rarity: ItemRarity.COMMON
  };

  ItemRegistry.registerItem(definition, 'test_domain');
  const item = ItemFactory.createItem(definition);

  assert.false(item.isSpawnable(), 'Quest items should never be spawnable');
});

runner.test('BaseItem.getSpawnWeight - rarity-based weight', () => {
  clear();
  
  const commonDef = {
    id: 'test_common_item',
    name: 'Common Item',
    description: 'A common item',
    keywords: ['common'],
    itemType: ItemType.WEAPON,
    weight: 1,
    value: 1,
    rarity: ItemRarity.COMMON,
    spawnable: true
  };

  const rareDef = {
    id: 'test_rare_item',
    name: 'Rare Item',
    description: 'A rare item',
    keywords: ['rare'],
    itemType: ItemType.WEAPON,
    weight: 1,
    value: 100,
    rarity: ItemRarity.RARE,
    spawnable: true
  };

  ItemRegistry.registerItem(commonDef, 'test_domain');
  ItemRegistry.registerItem(rareDef, 'test_domain');

  const commonItem = ItemFactory.createItem(commonDef);
  const rareItem = ItemFactory.createItem(rareDef);

  assert.greaterThan(commonItem.getSpawnWeight(), rareItem.getSpawnWeight(), 
    'Common items should have higher spawn weight than rare items');
});

runner.test('LootGenerator.generateLoot - basic generation', () => {
  clear();

  const items = [
    {
      id: 'loot_sword',
      name: 'Loot Sword',
      description: 'A sword',
      keywords: ['sword'],
      itemType: ItemType.WEAPON,
      weight: 3,
      value: 10,
      rarity: ItemRarity.COMMON,
      spawnable: true,
      lootTables: ['common_loot']
    },
    {
      id: 'loot_potion',
      name: 'Loot Potion',
      description: 'A potion',
      keywords: ['potion'],
      itemType: ItemType.CONSUMABLE,
      weight: 0.5,
      value: 25,
      rarity: ItemRarity.COMMON,
      spawnable: true,
      isStackable: true,
      lootTables: ['common_loot']
    }
  ];

  items.forEach(def => ItemRegistry.registerItem(def, 'test_domain'));

  const loot = LootGenerator.generateLoot({
    lootTables: ['common_loot'],
    itemCount: 2,
    includeCurrency: false
  });

  assert.true(Array.isArray(loot), 'Should return array of items');
});

runner.test('LootGenerator.getItemSpawnStats - get stats', () => {
  clear();

  const definition = {
    id: 'stats_test_item',
    name: 'Stats Test Item',
    description: 'Testing spawn stats',
    keywords: ['test'],
    itemType: ItemType.WEAPON,
    weight: 3,
    value: 10,
    rarity: ItemRarity.COMMON,
    spawnable: true,
    lootTables: ['common_loot'],
    spawnTags: [SpawnTag.TYPE_WEAPON]
  };

  ItemRegistry.registerItem(definition, 'test_domain');

  const stats = LootGenerator.getItemSpawnStats('stats_test_item');

  assert.notNull(stats, 'Should return stats object');
  assert.true(stats.spawnable, 'Should report spawnable status');
  assert.arrayContains(stats.lootTables, 'common_loot', 'Should include loot tables');
  assert.arrayContains(stats.spawnTags, SpawnTag.TYPE_WEAPON, 'Should include spawn tags');
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
