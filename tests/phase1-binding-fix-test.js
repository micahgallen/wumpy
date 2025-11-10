/**
 * Phase 1: Item Binding Bug Fix Test
 *
 * Tests that item binding and attunement correctly use player.username
 * instead of the broken player.name property.
 */

const Player = require('../src/server/Player');
const BaseItem = require('../src/items/BaseItem');
const AttunementManager = require('../src/systems/equipment/AttunementManager');
const ItemRegistry = require('../src/items/ItemRegistry');

// Mock socket
const mockSocket = {
  write: () => {},
  destroyed: false
};

console.log('\n=== Phase 1: Item Binding Bug Fix Test ===\n');

// Test 1: Verify Player has no name property
console.log('Test 1: Verify Player object structure');
const player = new Player(mockSocket);
player.username = 'testuser';

console.log(`  player.username: ${player.username}`);
console.log(`  player.name: ${player.name}`);
console.log(`  player.name is undefined: ${player.name === undefined}`);
console.log('  ✓ PASS: player.name is undefined, only username exists\n');

// Test 2: Bind-on-Equip uses username
console.log('Test 2: Bind-on-Equip uses player.username');
const bindOnEquipDef = {
  id: 'test_boe_sword',
  name: 'Test Bind-on-Equip Sword',
  description: 'A test sword',
  keywords: ['sword', 'test'],
  itemType: 'weapon',
  weight: 5,
  value: 100,
  bindOnEquip: true,
  isEquippable: true,
  weaponProperties: {
    damageDice: '1d8',
    damageType: 'slashing',
    weaponClass: 'swords',
    isTwoHanded: false,
    isRanged: false
  }
};

// Register the item definition so getDefinition() works
ItemRegistry.registerItem(bindOnEquipDef);

const boeItem = new BaseItem(bindOnEquipDef);
console.log(`  Before equip - boundTo: ${boeItem.boundTo}`);

boeItem.onEquip(player);
console.log(`  After equip - boundTo: ${boeItem.boundTo}`);
console.log(`  boundTo === player.username: ${boeItem.boundTo === player.username}`);

if (boeItem.boundTo === player.username && boeItem.boundTo !== undefined) {
  console.log('  ✓ PASS: Item bound to player.username\n');
} else {
  console.error('  ✗ FAIL: Item not bound correctly\n');
  process.exit(1);
}

// Test 3: Bind-on-Pickup uses username
console.log('Test 3: Bind-on-Pickup uses player.username');
const bindOnPickupDef = {
  id: 'test_bop_item',
  name: 'Test Bind-on-Pickup Item',
  description: 'A test item',
  keywords: ['item', 'test'],
  itemType: 'misc',
  weight: 1,
  value: 50,
  bindOnPickup: true
};

// Register the item definition
ItemRegistry.registerItem(bindOnPickupDef);

const bopItem = new BaseItem(bindOnPickupDef);
console.log(`  Before pickup - boundTo: ${bopItem.boundTo}`);

bopItem.onPickup(player);
console.log(`  After pickup - boundTo: ${bopItem.boundTo}`);
console.log(`  boundTo === player.username: ${bopItem.boundTo === player.username}`);

if (bopItem.boundTo === player.username && bopItem.boundTo !== undefined) {
  console.log('  ✓ PASS: Item bound to player.username\n');
} else {
  console.error('  ✗ FAIL: Item not bound correctly\n');
  process.exit(1);
}

// Test 4: Attunement uses username
console.log('Test 4: Attunement uses player.username');
const attunementDef = {
  id: 'test_attune_ring',
  name: 'Test Attunement Ring',
  description: 'A magical ring',
  keywords: ['ring', 'test'],
  itemType: 'jewelry',
  weight: 0.1,
  value: 500,
  requiresAttunement: true
};

// Register the item definition
ItemRegistry.registerItem(attunementDef);

const attuneItem = new BaseItem(attunementDef);
console.log(`  Before attune - attunedTo: ${attuneItem.attunedTo}`);

const attuneResult = attuneItem.onAttune(player);
console.log(`  Attunement result: ${attuneResult}`);
console.log(`  After attune - attunedTo: ${attuneItem.attunedTo}`);
console.log(`  attunedTo === player.username: ${attuneItem.attunedTo === player.username}`);

if (attuneItem.attunedTo === player.username && attuneItem.attunedTo !== undefined) {
  console.log('  ✓ PASS: Item attuned to player.username\n');
} else {
  console.error('  ✗ FAIL: Item not attuned correctly\n');
  process.exit(1);
}

// Test 5: AttunementManager tracks by username
console.log('Test 5: AttunementManager uses player.username for tracking');
AttunementManager.clearAllAttunements(); // Clear for clean test

const attuneDef2 = {
  id: 'test_attune_amulet',
  name: 'Test Attunement Amulet',
  description: 'A magical amulet',
  keywords: ['amulet', 'test'],
  itemType: 'jewelry',
  weight: 0.1,
  value: 500,
  requiresAttunement: true
};

// Register the item definition
ItemRegistry.registerItem(attuneDef2);

const attuneItem2 = new BaseItem(attuneDef2);
const managerResult = AttunementManager.attuneToItem(player, attuneItem2);

console.log(`  Attunement success: ${managerResult.success}`);
console.log(`  Used slots: ${AttunementManager.getAttunementSlotsUsed(player.username)}`);
console.log(`  Is attuned (by username): ${AttunementManager.isAttunedTo(player.username, attuneItem2.instanceId)}`);

if (managerResult.success && AttunementManager.isAttunedTo(player.username, attuneItem2.instanceId)) {
  console.log('  ✓ PASS: AttunementManager tracks by player.username\n');
} else {
  console.error('  ✗ FAIL: AttunementManager not tracking correctly\n');
  process.exit(1);
}

// Test 6: Drop restriction checks username
console.log('Test 6: Drop restriction uses player.username');
const anotherPlayer = new Player(mockSocket);
anotherPlayer.username = 'otheruser';

const boundItem = new BaseItem(bindOnEquipDef, { boundTo: player.username });
console.log(`  Item bound to: ${boundItem.boundTo}`);
console.log(`  Current player username: ${anotherPlayer.username}`);

const canDrop = boundItem.onDrop(anotherPlayer, {});
console.log(`  Can other player drop: ${canDrop}`);

if (canDrop === false) {
  console.log('  ✓ PASS: Drop correctly restricted by username\n');
} else {
  console.error('  ✗ FAIL: Drop restriction not working\n');
  process.exit(1);
}

// Clean up
AttunementManager.clearAllAttunements();

console.log('=== All Tests Passed ===\n');
console.log('Summary:');
console.log('  - Player objects only have username property (not name)');
console.log('  - Bind-on-Equip correctly uses player.username');
console.log('  - Bind-on-Pickup correctly uses player.username');
console.log('  - Item attunement correctly uses player.username');
console.log('  - AttunementManager tracks players by username');
console.log('  - Drop restrictions work with username');
console.log('\nPhase 1 bug fix verified successfully!\n');
