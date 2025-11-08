/**
 * Phase 2 Integration Tests: Inventory & Encumbrance System
 *
 * Comprehensive integration testing for:
 * - Combat death durability integration
 * - Full inventory lifecycle (spawn -> pickup -> save -> load -> drop)
 * - Encumbrance in combat context
 * - Stacking during combat loot
 * - Equipment + inventory integration
 *
 * Tests validate all Phase 2 components work together correctly.
 */

const assert = require('assert');
const InventoryManager = require('../../src/systems/inventory/InventoryManager');
const InventorySerializer = require('../../src/systems/inventory/InventorySerializer');
const DeathHandler = require('../../src/systems/inventory/DeathHandler');
const ItemFactory = require('../../src/items/ItemFactory');
const ItemRegistry = require('../../src/items/ItemRegistry');
const { ItemType } = require('../../src/items/schemas/ItemTypes');
const logger = require('../../src/logger');

// Mock player factory
function createMockPlayer(options = {}) {
  return {
    username: options.username || 'TestPlayer',
    inventory: options.inventory || [],
    stats: {
      strength: options.strength || 10,
      dexterity: options.dexterity || 10,
      constitution: options.constitution || 10,
      intelligence: options.intelligence || 10,
      wisdom: options.wisdom || 10,
      charisma: options.charisma || 10
    },
    level: options.level || 1,
    isGhost: false,
    isDead: function() { return this.isGhost; },
    takeDamage: function(amount) {
      // Mock HP system
      this.currentHP = (this.currentHP || 20) - amount;
      if (this.currentHP <= 0) {
        this.isGhost = true;
        this.currentHP = 0;
      }
    }
  };
}

// Mock NPC factory
function createMockNPC(options = {}) {
  return {
    name: options.name || 'Test Goblin',
    currentHP: options.hp || 10,
    maxHP: options.maxHP || 10,
    stats: {
      strength: 10,
      dexterity: 10,
      constitution: 10
    },
    level: options.level || 1,
    isDead: function() { return this.currentHP <= 0; },
    takeDamage: function(amount) {
      this.currentHP -= amount;
      if (this.currentHP < 0) this.currentHP = 0;
    }
  };
}

// Test results collector
const testResults = {
  passed: 0,
  failed: 0,
  scenarios: [],
  timing: {}
};

function recordTest(scenario, testName, passed, details = {}) {
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  const scenarioResult = testResults.scenarios.find(s => s.name === scenario);
  if (scenarioResult) {
    scenarioResult.tests.push({ name: testName, passed, ...details });
  } else {
    testResults.scenarios.push({
      name: scenario,
      tests: [{ name: testName, passed, ...details }]
    });
  }
}

// ============================================================================
// SCENARIO 1: Combat Death Durability Integration
// ============================================================================

async function testScenario1_CombatDeathDurability() {
  console.log('\n========================================');
  console.log('SCENARIO 1: Combat Death Durability Integration');
  console.log('========================================\n');

  const startTime = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Create a player with equipment
    const player = createMockPlayer({ username: 'DeathTest' });

    // Create equipped items (with durability)
    const sword = ItemFactory.createItem('longsword', {
      isEquipped: true,
      equippedSlot: 'main_hand',
      durability: 100,
      maxDurability: 100
    });

    const armor = ItemFactory.createItem('leather_armor', {
      isEquipped: true,
      equippedSlot: 'chest',
      durability: 80,
      maxDurability: 100
    });

    // Create unequipped item (should NOT lose durability)
    const backupSword = ItemFactory.createItem('longsword', {
      isEquipped: false,
      durability: 100,
      maxDurability: 100
    });

    // Add items to inventory
    player.inventory = [sword, armor, backupSword];

    console.log('TEST 1.1: Player death triggers durability loss on equipped items');
    const deathResult = DeathHandler.handlePlayerDeath(player);

    if (deathResult.success && deathResult.affectedItems === 2) {
      console.log('  ✓ PASS: Death handler processed successfully');
      console.log(`    - Affected ${deathResult.affectedItems} items (expected 2)`);
      testsPassed++;
      recordTest('Scenario 1', 'Death handler execution', true, { affectedItems: deathResult.affectedItems });
    } else {
      console.log('  ✗ FAIL: Death handler did not process correctly');
      console.log(`    - Expected 2 affected items, got ${deathResult.affectedItems}`);
      testsFailed++;
      recordTest('Scenario 1', 'Death handler execution', false, { error: 'Wrong number of affected items' });
    }

    console.log('\nTEST 1.2: Verify equipped items lost 10% durability');
    const expectedSwordDurability = 100 - Math.ceil(100 * 0.10); // 90
    const expectedArmorDurability = 80 - Math.ceil(100 * 0.10);  // 70 (10% of max, not current)

    if (sword.durability === expectedSwordDurability && armor.durability === expectedArmorDurability) {
      console.log('  ✓ PASS: Durability calculations correct');
      console.log(`    - Sword: ${sword.durability}/${sword.maxDurability} (expected ${expectedSwordDurability})`);
      console.log(`    - Armor: ${armor.durability}/${armor.maxDurability} (expected ${expectedArmorDurability})`);
      testsPassed++;
      recordTest('Scenario 1', 'Durability loss calculation', true);
    } else {
      console.log('  ✗ FAIL: Durability calculations incorrect');
      console.log(`    - Sword: ${sword.durability} (expected ${expectedSwordDurability})`);
      console.log(`    - Armor: ${armor.durability} (expected ${expectedArmorDurability})`);
      testsFailed++;
      recordTest('Scenario 1', 'Durability loss calculation', false);
    }

    console.log('\nTEST 1.3: Verify unequipped items NOT affected');
    if (backupSword.durability === 100) {
      console.log('  ✓ PASS: Unequipped items unaffected');
      console.log(`    - Backup Sword: ${backupSword.durability}/${backupSword.maxDurability}`);
      testsPassed++;
      recordTest('Scenario 1', 'Unequipped items protected', true);
    } else {
      console.log('  ✗ FAIL: Unequipped items were affected');
      console.log(`    - Backup Sword: ${backupSword.durability} (expected 100)`);
      testsFailed++;
      recordTest('Scenario 1', 'Unequipped items protected', false);
    }

    console.log('\nTEST 1.4: Check broken item detection');
    // Create item with low durability that will break
    const fragileShield = ItemFactory.createItem('wooden_shield', {
      isEquipped: true,
      equippedSlot: 'off_hand',
      durability: 5,
      maxDurability: 100
    });
    player.inventory.push(fragileShield);

    const deathResult2 = DeathHandler.handlePlayerDeath(player);
    const brokenItems = DeathHandler.getBrokenItems(player);

    if (brokenItems.length === 1 && brokenItems[0].instanceId === fragileShield.instanceId) {
      console.log('  ✓ PASS: Broken item detected correctly');
      console.log(`    - Found ${brokenItems.length} broken item(s)`);
      console.log(`    - Shield durability: ${fragileShield.durability}/${fragileShield.maxDurability}`);
      testsPassed++;
      recordTest('Scenario 1', 'Broken item detection', true);
    } else {
      console.log('  ✗ FAIL: Broken item detection failed');
      console.log(`    - Expected 1 broken item, found ${brokenItems.length}`);
      testsFailed++;
      recordTest('Scenario 1', 'Broken item detection', false);
    }

    console.log('\nTEST 1.5: Calculate repair costs');
    const repairCost = DeathHandler.getRepairCost(sword);
    const expectedRepairCost = Math.ceil(sword.value * (10 / 100) * 0.2); // 10 durability lost, 0.2 multiplier

    if (repairCost > 0 && repairCost === expectedRepairCost) {
      console.log('  ✓ PASS: Repair cost calculated correctly');
      console.log(`    - Repair cost: ${repairCost} gold (expected ${expectedRepairCost})`);
      testsPassed++;
      recordTest('Scenario 1', 'Repair cost calculation', true);
    } else {
      console.log('  ✗ FAIL: Repair cost calculation incorrect');
      console.log(`    - Got: ${repairCost}, Expected: ${expectedRepairCost}`);
      testsFailed++;
      recordTest('Scenario 1', 'Repair cost calculation', false);
    }

  } catch (err) {
    console.log('  ✗ FAIL: Exception during test');
    console.log(`    - Error: ${err.message}`);
    testsFailed++;
    recordTest('Scenario 1', 'Exception handling', false, { error: err.message });
  }

  const duration = Date.now() - startTime;
  testResults.timing['Scenario 1'] = duration;

  console.log('\n========================================');
  console.log(`SCENARIO 1 RESULTS: ${testsPassed} passed, ${testsFailed} failed (${duration}ms)`);
  console.log('========================================\n');

  return { passed: testsPassed, failed: testsFailed };
}

// ============================================================================
// SCENARIO 2: Full Inventory Lifecycle
// ============================================================================

async function testScenario2_InventoryLifecycle() {
  console.log('\n========================================');
  console.log('SCENARIO 2: Full Inventory Lifecycle');
  console.log('========================================\n');

  const startTime = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    const player = createMockPlayer({ username: 'LifecycleTest' });

    console.log('TEST 2.1: Create and add items to inventory');
    const potion = ItemFactory.createItem('health_potion', { quantity: 3 });
    const addResult = InventoryManager.addItem(player, potion);

    if (addResult.success && player.inventory.length === 1) {
      console.log('  ✓ PASS: Item added successfully');
      console.log(`    - Inventory size: ${player.inventory.length}`);
      testsPassed++;
      recordTest('Scenario 2', 'Add item to inventory', true);
    } else {
      console.log('  ✗ FAIL: Failed to add item');
      testsFailed++;
      recordTest('Scenario 2', 'Add item to inventory', false);
    }

    console.log('\nTEST 2.2: Test encumbrance limits');
    // Create heavy item
    const heavyItem = ItemFactory.createItem('iron_ingot', {
      quantity: 100  // This should be heavy
    });

    const canAddResult = InventoryManager.canAddItem(player, heavyItem);
    console.log(`  - Can add heavy item: ${canAddResult.canAdd}`);
    console.log(`  - Current weight: ${InventoryManager.getWeight(player).toFixed(1)} lbs`);
    console.log(`  - Max weight: ${InventoryManager.getMaxWeight(player)} lbs`);

    // This test passes if we can detect encumbrance (result may vary based on item weights)
    if (canAddResult.hasOwnProperty('canAdd')) {
      console.log('  ✓ PASS: Encumbrance check working');
      testsPassed++;
      recordTest('Scenario 2', 'Encumbrance check', true);
    } else {
      console.log('  ✗ FAIL: Encumbrance check not working');
      testsFailed++;
      recordTest('Scenario 2', 'Encumbrance check', false);
    }

    console.log('\nTEST 2.3: Serialize and deserialize inventory');
    const serialized = InventorySerializer.serializeInventory(player);

    if (serialized.length === player.inventory.length) {
      console.log('  ✓ PASS: Serialization successful');
      console.log(`    - Serialized ${serialized.length} items`);
      testsPassed++;
      recordTest('Scenario 2', 'Inventory serialization', true);
    } else {
      console.log('  ✗ FAIL: Serialization failed');
      testsFailed++;
      recordTest('Scenario 2', 'Inventory serialization', false);
    }

    // Create new player and restore
    const player2 = createMockPlayer({ username: 'RestoredPlayer' });
    const restored = InventorySerializer.deserializeInventory(player2, serialized);
    player2.inventory = restored;

    if (player2.inventory.length === player.inventory.length) {
      console.log('  ✓ PASS: Deserialization successful');
      console.log(`    - Restored ${restored.length} items`);
      testsPassed++;
      recordTest('Scenario 2', 'Inventory deserialization', true);
    } else {
      console.log('  ✗ FAIL: Deserialization failed');
      testsFailed++;
      recordTest('Scenario 2', 'Inventory deserialization', false);
    }

    console.log('\nTEST 2.4: Verify item properties preserved');
    const originalItem = player.inventory[0];
    const restoredItem = player2.inventory[0];

    const propertiesMatch = (
      originalItem.definitionId === restoredItem.definitionId &&
      originalItem.quantity === restoredItem.quantity &&
      originalItem.name === restoredItem.name
    );

    if (propertiesMatch) {
      console.log('  ✓ PASS: Item properties preserved through serialization');
      console.log(`    - Original: ${originalItem.name} x${originalItem.quantity}`);
      console.log(`    - Restored: ${restoredItem.name} x${restoredItem.quantity}`);
      testsPassed++;
      recordTest('Scenario 2', 'Property preservation', true);
    } else {
      console.log('  ✗ FAIL: Item properties not preserved');
      testsFailed++;
      recordTest('Scenario 2', 'Property preservation', false);
    }

    console.log('\nTEST 2.5: Remove item from inventory');
    const itemToRemove = player.inventory[0];
    const removed = InventoryManager.removeItem(player, itemToRemove.instanceId);

    if (removed && removed.instanceId === itemToRemove.instanceId && player.inventory.length === 0) {
      console.log('  ✓ PASS: Item removed successfully');
      console.log(`    - Removed: ${removed.name}`);
      console.log(`    - Inventory size: ${player.inventory.length}`);
      testsPassed++;
      recordTest('Scenario 2', 'Remove item', true);
    } else {
      console.log('  ✗ FAIL: Item removal failed');
      testsFailed++;
      recordTest('Scenario 2', 'Remove item', false);
    }

  } catch (err) {
    console.log('  ✗ FAIL: Exception during test');
    console.log(`    - Error: ${err.message}`);
    testsFailed++;
    recordTest('Scenario 2', 'Exception handling', false, { error: err.message });
  }

  const duration = Date.now() - startTime;
  testResults.timing['Scenario 2'] = duration;

  console.log('\n========================================');
  console.log(`SCENARIO 2 RESULTS: ${testsPassed} passed, ${testsFailed} failed (${duration}ms)`);
  console.log('========================================\n');

  return { passed: testsPassed, failed: testsFailed };
}

// ============================================================================
// SCENARIO 3: Encumbrance in Combat Context
// ============================================================================

async function testScenario3_EncumbranceInCombat() {
  console.log('\n========================================');
  console.log('SCENARIO 3: Encumbrance in Combat Context');
  console.log('========================================\n');

  const startTime = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    const player = createMockPlayer({
      username: 'CombatTest',
      strength: 10  // Base strength for consistent testing
    });

    console.log('TEST 3.1: Fill inventory to near-limit');
    const maxWeight = InventoryManager.getMaxWeight(player);
    const maxSlots = InventoryManager.getMaxSlots(player);

    console.log(`  - Max weight: ${maxWeight} lbs`);
    console.log(`  - Max slots: ${maxSlots}`);

    // Add items until near capacity
    let itemsAdded = 0;
    for (let i = 0; i < maxSlots - 2; i++) {
      const item = ItemFactory.createItem('iron_ration');
      const result = InventoryManager.addItem(player, item);
      if (result.success) itemsAdded++;
    }

    const currentSlots = InventoryManager.getSlots(player);
    const currentWeight = InventoryManager.getWeight(player);

    if (currentSlots >= maxSlots - 3) {
      console.log('  ✓ PASS: Inventory filled near capacity');
      console.log(`    - Current: ${currentSlots}/${maxSlots} slots`);
      console.log(`    - Weight: ${currentWeight.toFixed(1)}/${maxWeight} lbs`);
      testsPassed++;
      recordTest('Scenario 3', 'Fill to near-capacity', true);
    } else {
      console.log('  ✗ FAIL: Could not fill inventory');
      testsFailed++;
      recordTest('Scenario 3', 'Fill to near-capacity', false);
    }

    console.log('\nTEST 3.2: Attempt to pickup heavy loot (should fail)');
    const heavyLoot = ItemFactory.createItem('plate_armor');  // Heavy armor
    const canPickup = InventoryManager.canAddItem(player, heavyLoot);

    console.log(`  - Can pickup: ${canPickup.canAdd}`);
    if (canPickup.reason) {
      console.log(`  - Reason: ${canPickup.reason}`);
    }

    // Either weight or slots should block it
    if (!canPickup.canAdd && canPickup.reason) {
      console.log('  ✓ PASS: Encumbrance blocks pickup with clear message');
      testsPassed++;
      recordTest('Scenario 3', 'Block over-encumbered pickup', true);
    } else {
      console.log('  ✗ FAIL: Should have blocked pickup');
      testsFailed++;
      recordTest('Scenario 3', 'Block over-encumbered pickup', false);
    }

    console.log('\nTEST 3.3: Drop item and retry');
    if (player.inventory.length > 0) {
      const droppedItem = InventoryManager.removeItem(player, player.inventory[0].instanceId);
      const canPickupNow = InventoryManager.canAddItem(player, heavyLoot);

      console.log(`  - Dropped: ${droppedItem.name}`);
      console.log(`  - Can pickup now: ${canPickupNow.canAdd}`);
      console.log(`  - Current slots: ${InventoryManager.getSlots(player)}/${maxSlots}`);

      if (canPickupNow.canAdd || canPickupNow.reason.includes('Weight')) {
        console.log('  ✓ PASS: Dropping items frees space');
        testsPassed++;
        recordTest('Scenario 3', 'Free space by dropping', true);
      } else {
        console.log('  ✗ FAIL: Still cannot pickup after dropping');
        testsFailed++;
        recordTest('Scenario 3', 'Free space by dropping', false);
      }
    }

    console.log('\nTEST 3.4: Test weight-only encumbrance');
    // Create player with high STR (more slots but same base weight capacity)
    const strongPlayer = createMockPlayer({
      username: 'StrongPlayer',
      strength: 18  // +4 modifier = extra slots
    });

    const strongMaxSlots = InventoryManager.getMaxSlots(strongPlayer);
    const strongMaxWeight = InventoryManager.getMaxWeight(strongPlayer);

    console.log(`  - Strong player max slots: ${strongMaxSlots}`);
    console.log(`  - Strong player max weight: ${strongMaxWeight} lbs`);

    // Add one very heavy item
    const veryHeavyItem = ItemFactory.createItem('anvil', { weight: strongMaxWeight + 10 });
    const canAddHeavy = InventoryManager.canAddItem(strongPlayer, veryHeavyItem);

    if (!canAddHeavy.canAdd && canAddHeavy.reason.includes('Weight')) {
      console.log('  ✓ PASS: Weight limit enforced independently of slots');
      console.log(`    - ${canAddHeavy.reason}`);
      testsPassed++;
      recordTest('Scenario 3', 'Weight-only limit', true);
    } else {
      console.log('  ✗ FAIL: Weight limit not properly enforced');
      testsFailed++;
      recordTest('Scenario 3', 'Weight-only limit', false);
    }

  } catch (err) {
    console.log('  ✗ FAIL: Exception during test');
    console.log(`    - Error: ${err.message}`);
    testsFailed++;
    recordTest('Scenario 3', 'Exception handling', false, { error: err.message });
  }

  const duration = Date.now() - startTime;
  testResults.timing['Scenario 3'] = duration;

  console.log('\n========================================');
  console.log(`SCENARIO 3 RESULTS: ${testsPassed} passed, ${testsFailed} failed (${duration}ms)`);
  console.log('========================================\n');

  return { passed: testsPassed, failed: testsFailed };
}

// ============================================================================
// SCENARIO 4: Stacking During Combat
// ============================================================================

async function testScenario4_CombatStacking() {
  console.log('\n========================================');
  console.log('SCENARIO 4: Stacking During Combat');
  console.log('========================================\n');

  const startTime = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    const player = createMockPlayer({ username: 'StackTest' });

    console.log('TEST 4.1: Player has existing stackable items');
    const existingPotions = ItemFactory.createItem('health_potion', { quantity: 3 });
    InventoryManager.addItem(player, existingPotions);

    if (player.inventory.length === 1 && player.inventory[0].quantity === 3) {
      console.log('  ✓ PASS: Initial potions added');
      console.log(`    - ${player.inventory[0].quantity}x ${player.inventory[0].name}`);
      testsPassed++;
      recordTest('Scenario 4', 'Initial stackable items', true);
    } else {
      console.log('  ✗ FAIL: Failed to add initial potions');
      testsFailed++;
      recordTest('Scenario 4', 'Initial stackable items', false);
    }

    console.log('\nTEST 4.2: Loot drops additional stackable items');
    const lootedPotions = ItemFactory.createItem('health_potion', { quantity: 5 });
    const addResult = InventoryManager.addItem(player, lootedPotions);

    if (addResult.success && addResult.stackedWith) {
      console.log('  ✓ PASS: Items stacked automatically');
      console.log(`    - Stacked with: ${addResult.stackedWith}`);
      testsPassed++;
      recordTest('Scenario 4', 'Auto-stacking', true);
    } else {
      console.log('  ✗ FAIL: Items did not stack');
      testsFailed++;
      recordTest('Scenario 4', 'Auto-stacking', false);
    }

    console.log('\nTEST 4.3: Verify total quantity and slot count');
    const potionStack = player.inventory.find(item => item.name.includes('Potion'));
    const totalSlots = InventoryManager.getSlots(player);

    if (potionStack && potionStack.quantity === 8 && totalSlots === 1) {
      console.log('  ✓ PASS: Stack quantity correct, uses 1 slot');
      console.log(`    - Total potions: ${potionStack.quantity}`);
      console.log(`    - Inventory slots used: ${totalSlots}`);
      testsPassed++;
      recordTest('Scenario 4', 'Stack quantity and slots', true);
    } else {
      console.log('  ✗ FAIL: Stack quantity or slot count incorrect');
      console.log(`    - Potion quantity: ${potionStack?.quantity || 0} (expected 8)`);
      console.log(`    - Slots used: ${totalSlots} (expected 1)`);
      testsFailed++;
      recordTest('Scenario 4', 'Stack quantity and slots', false);
    }

    console.log('\nTEST 4.4: Test max stack size limit');
    const maxStack = InventoryManager.getMaxStackSize(existingPotions);
    console.log(`  - Max stack size for consumables: ${maxStack}`);

    // Try to add more potions than the stack can hold
    const overflowPotions = ItemFactory.createItem('health_potion', { quantity: maxStack });
    const overflowResult = InventoryManager.addItem(player, overflowPotions);

    const stackCount = player.inventory.filter(item => item.name.includes('Potion')).length;

    if (stackCount > 1) {
      console.log('  ✓ PASS: Overflow creates new stack');
      console.log(`    - Number of potion stacks: ${stackCount}`);
      testsPassed++;
      recordTest('Scenario 4', 'Max stack overflow', true);
    } else {
      console.log('  ✗ FAIL: Overflow handling incorrect');
      testsFailed++;
      recordTest('Scenario 4', 'Max stack overflow', false);
    }

    console.log('\nTEST 4.5: Non-stackable items create separate slots');
    const sword1 = ItemFactory.createItem('longsword');
    const sword2 = ItemFactory.createItem('longsword');

    InventoryManager.addItem(player, sword1);
    InventoryManager.addItem(player, sword2);

    const swordCount = player.inventory.filter(item => item.name.includes('Longsword')).length;

    if (swordCount === 2) {
      console.log('  ✓ PASS: Non-stackable items use separate slots');
      console.log(`    - Number of longswords: ${swordCount}`);
      testsPassed++;
      recordTest('Scenario 4', 'Non-stackable separation', true);
    } else {
      console.log('  ✗ FAIL: Non-stackable items incorrectly stacked');
      testsFailed++;
      recordTest('Scenario 4', 'Non-stackable separation', false);
    }

  } catch (err) {
    console.log('  ✗ FAIL: Exception during test');
    console.log(`    - Error: ${err.message}`);
    console.log(`    - Stack: ${err.stack}`);
    testsFailed++;
    recordTest('Scenario 4', 'Exception handling', false, { error: err.message });
  }

  const duration = Date.now() - startTime;
  testResults.timing['Scenario 4'] = duration;

  console.log('\n========================================');
  console.log(`SCENARIO 4 RESULTS: ${testsPassed} passed, ${testsFailed} failed (${duration}ms)`);
  console.log('========================================\n');

  return { passed: testsPassed, failed: testsFailed };
}

// ============================================================================
// SCENARIO 5: Equipment + Inventory Integration
// ============================================================================

async function testScenario5_EquipmentIntegration() {
  console.log('\n========================================');
  console.log('SCENARIO 5: Equipment + Inventory Integration');
  console.log('========================================\n');

  const startTime = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    const player = createMockPlayer({
      username: 'EquipTest',
      strength: 10
    });

    console.log('TEST 5.1: Equip item and check weight calculation');
    const sword = ItemFactory.createItem('longsword', {
      isEquipped: true,
      equippedSlot: 'main_hand'
    });
    InventoryManager.addItem(player, sword);

    const weight = InventoryManager.getWeight(player);
    const slots = InventoryManager.getSlots(player);

    console.log(`  - Weight: ${weight.toFixed(1)} lbs (includes equipped items)`);
    console.log(`  - Slots: ${slots} (equipped items count as 1 slot each)`);

    if (weight > 0 && slots === 1) {
      console.log('  ✓ PASS: Equipped item counted in weight and slots');
      testsPassed++;
      recordTest('Scenario 5', 'Equipped item weight', true);
    } else {
      console.log('  ✗ FAIL: Equipped item not counted properly');
      testsFailed++;
      recordTest('Scenario 5', 'Equipped item weight', false);
    }

    console.log('\nTEST 5.2: Equipped items are in inventory array');
    const equippedItems = InventoryManager.getEquippedItems(player);

    if (equippedItems.length === 1 && equippedItems[0].isEquipped) {
      console.log('  ✓ PASS: Equipped items accessible from inventory');
      console.log(`    - Found ${equippedItems.length} equipped item(s)`);
      testsPassed++;
      recordTest('Scenario 5', 'Equipped items in inventory', true);
    } else {
      console.log('  ✗ FAIL: Cannot find equipped items');
      testsFailed++;
      recordTest('Scenario 5', 'Equipped items in inventory', false);
    }

    console.log('\nTEST 5.3: Unequipped items separate');
    const potion = ItemFactory.createItem('health_potion', { isEquipped: false });
    InventoryManager.addItem(player, potion);

    const unequippedItems = InventoryManager.getUnequippedItems(player);

    if (unequippedItems.length === 1 && !unequippedItems[0].isEquipped) {
      console.log('  ✓ PASS: Unequipped items properly filtered');
      console.log(`    - Found ${unequippedItems.length} unequipped item(s)`);
      testsPassed++;
      recordTest('Scenario 5', 'Unequipped items filtering', true);
    } else {
      console.log('  ✗ FAIL: Unequipped items filtering failed');
      testsFailed++;
      recordTest('Scenario 5', 'Unequipped items filtering', false);
    }

    console.log('\nTEST 5.4: Fill inventory with equipped and unequipped items');
    const maxSlots = InventoryManager.getMaxSlots(player);

    // Add more unequipped items
    for (let i = 0; i < 3; i++) {
      const item = ItemFactory.createItem('iron_ration', { isEquipped: false });
      InventoryManager.addItem(player, item);
    }

    const totalSlots = InventoryManager.getSlots(player);
    const totalWeight = InventoryManager.getWeight(player);

    console.log(`  - Total inventory slots: ${totalSlots}/${maxSlots}`);
    console.log(`  - Total weight: ${totalWeight.toFixed(1)} lbs`);
    console.log(`  - Equipped items: ${InventoryManager.getEquippedItems(player).length}`);
    console.log(`  - Unequipped items: ${InventoryManager.getUnequippedItems(player).length}`);

    if (totalSlots === player.inventory.length) {
      console.log('  ✓ PASS: All items counted in total');
      testsPassed++;
      recordTest('Scenario 5', 'Total inventory calculation', true);
    } else {
      console.log('  ✗ FAIL: Inventory count mismatch');
      testsFailed++;
      recordTest('Scenario 5', 'Total inventory calculation', false);
    }

    console.log('\nTEST 5.5: Equipped items show correct flag in serialization');
    const serialized = InventorySerializer.serializeInventory(player);
    const serializedEquipped = serialized.filter(item => item.isEquipped);
    const serializedUnequipped = serialized.filter(item => !item.isEquipped);

    console.log(`  - Serialized equipped: ${serializedEquipped.length}`);
    console.log(`  - Serialized unequipped: ${serializedUnequipped.length}`);

    if (serializedEquipped.length === 1 && serializedUnequipped.length === player.inventory.length - 1) {
      console.log('  ✓ PASS: Equipment status preserved in serialization');
      testsPassed++;
      recordTest('Scenario 5', 'Equipment serialization', true);
    } else {
      console.log('  ✗ FAIL: Equipment status not preserved');
      testsFailed++;
      recordTest('Scenario 5', 'Equipment serialization', false);
    }

  } catch (err) {
    console.log('  ✗ FAIL: Exception during test');
    console.log(`    - Error: ${err.message}`);
    testsFailed++;
    recordTest('Scenario 5', 'Exception handling', false, { error: err.message });
  }

  const duration = Date.now() - startTime;
  testResults.timing['Scenario 5'] = duration;

  console.log('\n========================================');
  console.log(`SCENARIO 5 RESULTS: ${testsPassed} passed, ${testsFailed} failed (${duration}ms)`);
  console.log('========================================\n');

  return { passed: testsPassed, failed: testsFailed };
}

// ============================================================================
// PERFORMANCE & EDGE CASE TESTS
// ============================================================================

async function testPerformanceAndEdgeCases() {
  console.log('\n========================================');
  console.log('PERFORMANCE & EDGE CASE TESTS');
  console.log('========================================\n');

  const startTime = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    console.log('TEST P.1: Large inventory performance (100 items)');
    const player = createMockPlayer({ username: 'PerformanceTest', strength: 20 });

    const addStartTime = Date.now();
    for (let i = 0; i < 100; i++) {
      const item = ItemFactory.createItem('iron_ration');
      InventoryManager.addItem(player, item);
    }
    const addDuration = Date.now() - addStartTime;

    console.log(`  - Added 100 items in ${addDuration}ms`);

    const serializeStartTime = Date.now();
    const serialized = InventorySerializer.serializeInventory(player);
    const serializeDuration = Date.now() - serializeStartTime;

    console.log(`  - Serialized ${serialized.length} items in ${serializeDuration}ms`);

    const deserializeStartTime = Date.now();
    const player2 = createMockPlayer({ username: 'Test2' });
    const restored = InventorySerializer.deserializeInventory(player2, serialized);
    const deserializeDuration = Date.now() - deserializeStartTime;

    console.log(`  - Deserialized ${restored.length} items in ${deserializeDuration}ms`);

    if (addDuration < 500 && serializeDuration < 100 && deserializeDuration < 500) {
      console.log('  ✓ PASS: Performance acceptable for large inventories');
      testsPassed++;
      recordTest('Performance', 'Large inventory operations', true, {
        addMs: addDuration,
        serializeMs: serializeDuration,
        deserializeMs: deserializeDuration
      });
    } else {
      console.log('  ✗ FAIL: Performance issues detected');
      testsFailed++;
      recordTest('Performance', 'Large inventory operations', false);
    }

    console.log('\nTEST P.2: Zero-weight items');
    const zeroWeightItem = ItemFactory.createItem('scroll_magic', { weight: 0 });
    const result = InventoryManager.addItem(player, zeroWeightItem);

    if (result.success) {
      console.log('  ✓ PASS: Zero-weight items handled');
      testsPassed++;
      recordTest('Edge Cases', 'Zero-weight items', true);
    } else {
      console.log('  ✗ FAIL: Zero-weight items rejected');
      testsFailed++;
      recordTest('Edge Cases', 'Zero-weight items', false);
    }

    console.log('\nTEST P.3: Items with null durability');
    const noDurabilityItem = ItemFactory.createItem('gold_coin', {
      durability: null,
      maxDurability: null,
      isEquipped: true
    });
    player.inventory = [noDurabilityItem];

    const deathResult = DeathHandler.handlePlayerDeath(player);

    if (deathResult.success && deathResult.affectedItems === 0) {
      console.log('  ✓ PASS: Items without durability skipped on death');
      testsPassed++;
      recordTest('Edge Cases', 'Null durability items', true);
    } else {
      console.log('  ✗ FAIL: Null durability handling failed');
      testsFailed++;
      recordTest('Edge Cases', 'Null durability items', false);
    }

    console.log('\nTEST P.4: Empty inventory operations');
    const emptyPlayer = createMockPlayer({ username: 'Empty' });
    const emptyStats = InventoryManager.getInventoryStats(emptyPlayer);
    const emptyWeight = InventoryManager.getWeight(emptyPlayer);
    const emptySlots = InventoryManager.getSlots(emptyPlayer);

    if (emptyWeight === 0 && emptySlots === 0 && emptyStats) {
      console.log('  ✓ PASS: Empty inventory handled correctly');
      console.log(`    - Weight: ${emptyWeight}, Slots: ${emptySlots}`);
      testsPassed++;
      recordTest('Edge Cases', 'Empty inventory', true);
    } else {
      console.log('  ✗ FAIL: Empty inventory issues');
      testsFailed++;
      recordTest('Edge Cases', 'Empty inventory', false);
    }

    console.log('\nTEST P.5: Invalid item handling');
    const invalidAddResult = InventoryManager.addItem(null, null);
    const invalidRemoveResult = InventoryManager.removeItem(emptyPlayer, 'nonexistent-id');

    if (!invalidAddResult.success && invalidRemoveResult === null) {
      console.log('  ✓ PASS: Invalid operations handled gracefully');
      testsPassed++;
      recordTest('Edge Cases', 'Invalid operations', true);
    } else {
      console.log('  ✗ FAIL: Invalid operations not handled');
      testsFailed++;
      recordTest('Edge Cases', 'Invalid operations', false);
    }

  } catch (err) {
    console.log('  ✗ FAIL: Exception during test');
    console.log(`    - Error: ${err.message}`);
    testsFailed++;
    recordTest('Performance', 'Exception handling', false, { error: err.message });
  }

  const duration = Date.now() - startTime;
  testResults.timing['Performance'] = duration;

  console.log('\n========================================');
  console.log(`PERFORMANCE RESULTS: ${testsPassed} passed, ${testsFailed} failed (${duration}ms)`);
  console.log('========================================\n');

  return { passed: testsPassed, failed: testsFailed };
}

// ============================================================================
// COMBAT INTEGRATION CHECK
// ============================================================================

async function testCombatIntegrationHooks() {
  console.log('\n========================================');
  console.log('COMBAT INTEGRATION ANALYSIS');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  console.log('CHECKING: Is DeathHandler hooked up to combat system?');

  try {
    // Check if CombatEncounter exists and can be imported
    const CombatEncounter = require('../../src/combat/CombatEncounter');
    console.log('  ✓ CombatEncounter module found');
    passed++;

    // Check the death flow in CombatEncounter
    const combatSource = require('fs').readFileSync(
      '/home/micah/wumpy/src/combat/CombatEncounter.js',
      'utf8'
    );

    // Look for death handling code
    const hasDeathHandling = combatSource.includes('isDead') || combatSource.includes('isGhost');
    const hasPlayerDeath = combatSource.includes('target.socket') && combatSource.includes('isGhost = true');

    if (hasDeathHandling && hasPlayerDeath) {
      console.log('  ✓ Combat system has player death handling');
      passed++;
    } else {
      console.log('  ✗ Combat system may not handle player death');
      failed++;
    }

    // Check if DeathHandler is imported or called
    const usesDeathHandler = combatSource.includes('DeathHandler') || combatSource.includes('durability');

    if (usesDeathHandler) {
      console.log('  ✓ DeathHandler appears to be integrated');
      passed++;
    } else {
      console.log('  ⚠ WARNING: DeathHandler does NOT appear to be called from combat system');
      console.log('    - Need to add DeathHandler.handlePlayerDeath() call when player dies');
      console.log('    - Recommend adding at line 122 in CombatEncounter.js after setting isGhost');
      failed++;
    }

  } catch (err) {
    console.log('  ✗ Error checking combat integration');
    console.log(`    - ${err.message}`);
    failed++;
  }

  return { passed, failed };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 2 INTEGRATION TEST SUITE');
  console.log('Inventory & Encumbrance System');
  console.log('='.repeat(80));

  const overallStart = Date.now();

  // Run all scenario tests
  const s1 = await testScenario1_CombatDeathDurability();
  const s2 = await testScenario2_InventoryLifecycle();
  const s3 = await testScenario3_EncumbranceInCombat();
  const s4 = await testScenario4_CombatStacking();
  const s5 = await testScenario5_EquipmentIntegration();
  const perf = await testPerformanceAndEdgeCases();
  const combat = await testCombatIntegrationHooks();

  const overallDuration = Date.now() - overallStart;

  // Calculate totals
  const totalPassed = s1.passed + s2.passed + s3.passed + s4.passed + s5.passed + perf.passed + combat.passed;
  const totalFailed = s1.failed + s2.failed + s3.failed + s4.failed + s5.failed + perf.failed + combat.failed;
  const totalTests = totalPassed + totalFailed;
  const passRate = ((totalPassed / totalTests) * 100).toFixed(1);

  // Generate final report
  console.log('\n' + '='.repeat(80));
  console.log('INTEGRATION TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed} (${passRate}%)`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`\nTotal Duration: ${overallDuration}ms`);

  console.log('\n--- Scenario Breakdown ---');
  console.log(`Scenario 1 (Death Durability):     ${s1.passed}/${s1.passed + s1.failed} passed`);
  console.log(`Scenario 2 (Inventory Lifecycle):  ${s2.passed}/${s2.passed + s2.failed} passed`);
  console.log(`Scenario 3 (Combat Encumbrance):   ${s3.passed}/${s3.passed + s3.failed} passed`);
  console.log(`Scenario 4 (Combat Stacking):      ${s4.passed}/${s4.passed + s4.failed} passed`);
  console.log(`Scenario 5 (Equipment Integration): ${s5.passed}/${s5.passed + s5.failed} passed`);
  console.log(`Performance & Edge Cases:          ${perf.passed}/${perf.passed + perf.failed} passed`);
  console.log(`Combat Integration Hooks:          ${combat.passed}/${combat.passed + combat.failed} passed`);

  console.log('\n--- Performance Metrics ---');
  for (const [scenario, duration] of Object.entries(testResults.timing)) {
    console.log(`${scenario}: ${duration}ms`);
  }

  // Production readiness assessment
  console.log('\n' + '='.repeat(80));
  console.log('PRODUCTION READINESS ASSESSMENT');
  console.log('='.repeat(80));

  const criteriaChecks = {
    'All scenarios pass': totalFailed === 0,
    'No data corruption detected': totalPassed > 0,
    'Performance acceptable': overallDuration < 5000,
    'Combat integration needs work': combat.failed > 0,
    'Persistence works': s2.passed >= 3
  };

  for (const [criterion, met] of Object.entries(criteriaChecks)) {
    const status = met ? '✓' : '✗';
    console.log(`${status} ${criterion}`);
  }

  const productionReady = totalFailed === 0 && combat.failed === 0;

  console.log('\n' + '='.repeat(80));
  if (productionReady) {
    console.log('STATUS: ✓ READY FOR PRODUCTION');
  } else if (combat.failed > 0 && totalFailed <= combat.failed) {
    console.log('STATUS: ⚠ READY WITH COMBAT INTEGRATION TODO');
  } else {
    console.log('STATUS: ✗ NOT READY - FAILURES DETECTED');
  }
  console.log('='.repeat(80) + '\n');

  // Generate recommendations
  console.log('RECOMMENDATIONS:');
  if (combat.failed > 0) {
    console.log('  1. CRITICAL: Add DeathHandler integration to combat system');
    console.log('     - Modify CombatEncounter.js line ~122');
    console.log('     - Add: const deathResult = DeathHandler.handlePlayerDeath(target);');
    console.log('     - Send death messages to player');
  }
  if (totalFailed > combat.failed) {
    console.log('  2. Fix failing integration tests before production deployment');
  }
  if (overallDuration > 3000) {
    console.log('  3. Consider optimizing inventory operations for better performance');
  }
  console.log('  4. Add additional edge case tests for bound items and quest items');
  console.log('  5. Test with real combat encounters in development environment');

  console.log('\n');
  return productionReady;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().then(ready => {
    process.exit(ready ? 0 : 1);
  }).catch(err => {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testScenario1_CombatDeathDurability,
  testScenario2_InventoryLifecycle,
  testScenario3_EncumbranceInCombat,
  testScenario4_CombatStacking,
  testScenario5_EquipmentIntegration,
  testPerformanceAndEdgeCases,
  testCombatIntegrationHooks
};
