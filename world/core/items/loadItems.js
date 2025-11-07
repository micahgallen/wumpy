/**
 * Load Core Items
 *
 * Registers all core item definitions with the ItemRegistry.
 */

const ItemRegistry = require('../../../src/items/ItemRegistry');
const sampleItems = require('./sampleItems');
const testEquipmentSet = require('./testEquipmentSet');
const logger = require('../../../src/logger');

/**
 * Load all core items into the registry
 */
function loadCoreItems() {
  logger.log('Loading core items...');

  let successCount = 0;
  let errorCount = 0;

  // Load sample items
  for (const itemDef of sampleItems) {
    try {
      ItemRegistry.registerItem(itemDef, 'core');
      successCount++;
    } catch (error) {
      logger.error(`Failed to register item ${itemDef.id}: ${error.message}`);
      errorCount++;
    }
  }

  // Load test equipment set
  for (const itemDef of testEquipmentSet) {
    try {
      ItemRegistry.registerItem(itemDef, 'core');
      successCount++;
    } catch (error) {
      logger.error(`Failed to register item ${itemDef.id}: ${error.message}`);
      errorCount++;
    }
  }

  logger.log(`Core items loaded: ${successCount} succeeded, ${errorCount} failed`);

  return {
    success: errorCount === 0,
    successCount,
    errorCount
  };
}

module.exports = {
  loadCoreItems
};
