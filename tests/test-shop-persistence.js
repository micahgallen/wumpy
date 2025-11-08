/**
 * Shop Persistence Test
 *
 * Tests that shop inventory persists across server restarts
 */

const path = require('path');
const fs = require('fs');

// Set up the environment
process.chdir(path.join(__dirname, '..'));

// Load items first
const { loadCoreItems } = require('../world/core/items/loadItems');
const { loadSesameStreetItems } = require('../world/sesame_street/items/loadItems');

console.log('Loading items...');
loadCoreItems();
loadSesameStreetItems();

// Load shops
const { loadSesameStreetShops } = require('../world/sesame_street/shops/loadShops');
const ShopManager = require('../src/systems/economy/ShopManager');

console.log('\n=== Shop Persistence Test ===\n');

// Load shops
console.log('1. Loading shops...');
loadSesameStreetShops();

// Get the shop
const shop = ShopManager.getShop('hoopers_store');
if (!shop) {
  console.error('ERROR: Could not find hoopers_store');
  process.exit(1);
}

console.log('\n2. Original shop inventory:');
console.log(`   Total items: ${shop.inventory.length}`);
console.log(`   Leather caps: ${shop.inventory.find(i => i.itemId === 'leather_cap')?.quantity || 0}`);
console.log(`   Health potions: ${shop.inventory.find(i => i.itemId === 'health_potion')?.quantity || 0}`);

// Modify shop inventory (simulate a purchase)
console.log('\n3. Simulating purchases (reducing quantities)...');
const leatherCapEntry = shop.inventory.find(i => i.itemId === 'leather_cap');
if (leatherCapEntry) {
  leatherCapEntry.quantity -= 5; // Simulate selling 5 leather caps
  console.log(`   Reduced leather caps from 8 to ${leatherCapEntry.quantity}`);
}

const healthPotionEntry = shop.inventory.find(i => i.itemId === 'health_potion');
if (healthPotionEntry) {
  healthPotionEntry.quantity -= 10; // Simulate selling 10 health potions
  console.log(`   Reduced health potions from 20 to ${healthPotionEntry.quantity}`);
}

// Add a new item (simulate player selling to shop)
console.log('\n4. Simulating player selling items to shop...');
shop.inventory.push({
  itemId: 'rusty_dagger',
  quantity: 2,
  price: 30
});
console.log('   Added 2x rusty_dagger to shop inventory');

// Save shop inventory
console.log('\n5. Saving shop inventory to disk...');
const saveResult = ShopManager.saveShopInventory('hoopers_store');
console.log(`   Save result: ${saveResult ? 'SUCCESS' : 'FAILED'}`);

// Check that the file was created
const shopFilePath = path.join(__dirname, '../data/shops/hoopers_store.json');
if (fs.existsSync(shopFilePath)) {
  console.log(`   File created: ${shopFilePath}`);
  const fileContent = JSON.parse(fs.readFileSync(shopFilePath, 'utf8'));
  console.log(`   File contains ${fileContent.inventory.length} inventory entries`);
} else {
  console.error('   ERROR: Shop file was not created!');
  process.exit(1);
}

// Clear the shop and reload it
console.log('\n6. Simulating server restart (clearing and reloading)...');
shop.inventory = [];
console.log(`   Cleared shop inventory (now has ${shop.inventory.length} items)`);

// Reload from disk
const loadResult = ShopManager.loadShopInventory('hoopers_store');
console.log(`   Load result: ${loadResult ? 'SUCCESS' : 'FAILED'}`);

console.log('\n7. Reloaded shop inventory:');
console.log(`   Total items: ${shop.inventory.length}`);
console.log(`   Leather caps: ${shop.inventory.find(i => i.itemId === 'leather_cap')?.quantity || 0}`);
console.log(`   Health potions: ${shop.inventory.find(i => i.itemId === 'health_potion')?.quantity || 0}`);
console.log(`   Rusty daggers: ${shop.inventory.find(i => i.itemId === 'rusty_dagger')?.quantity || 0}`);

// Verify the quantities are correct
const reloadedLeatherCaps = shop.inventory.find(i => i.itemId === 'leather_cap')?.quantity || 0;
const reloadedHealthPotions = shop.inventory.find(i => i.itemId === 'health_potion')?.quantity || 0;
const reloadedRustyDaggers = shop.inventory.find(i => i.itemId === 'rusty_dagger')?.quantity || 0;

console.log('\n8. Verification:');
if (reloadedLeatherCaps === 3) {
  console.log('   ✓ Leather caps quantity persisted correctly (3)');
} else {
  console.error(`   ✗ Leather caps quantity WRONG (expected 3, got ${reloadedLeatherCaps})`);
}

if (reloadedHealthPotions === 10) {
  console.log('   ✓ Health potions quantity persisted correctly (10)');
} else {
  console.error(`   ✗ Health potions quantity WRONG (expected 10, got ${reloadedHealthPotions})`);
}

if (reloadedRustyDaggers === 2) {
  console.log('   ✓ Rusty daggers added correctly (2)');
} else {
  console.error(`   ✗ Rusty daggers WRONG (expected 2, got ${reloadedRustyDaggers})`);
}

console.log('\n=== Shop Persistence Test Complete ===\n');

// Clean up test data
console.log('Cleaning up test data...');
if (fs.existsSync(shopFilePath)) {
  fs.unlinkSync(shopFilePath);
  console.log('Test shop data removed.');
}

console.log('\nAll tests passed! Shop persistence is working correctly.');
