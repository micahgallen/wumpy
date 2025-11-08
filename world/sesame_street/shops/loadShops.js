/**
 * Sesame Street Shop Loader
 *
 * Loads all shop definitions from Sesame Street into the ShopManager
 */

const ShopManager = require('../../../src/systems/economy/ShopManager');
const logger = require('../../../src/logger');

// Import shop definitions
const hoopersStore = require('./hoopersStore');

/**
 * Load all Sesame Street shops into the ShopManager
 * @returns {Object} Load result with counts and errors
 */
function loadSesameStreetShops() {
  const shops = [
    hoopersStore
  ];

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // First, register all shop definitions
  for (const shopDef of shops) {
    try {
      const result = ShopManager.registerShop(shopDef);
      if (result) {
        successCount++;
        logger.log(`Registered Sesame Street shop: ${shopDef.name} (${shopDef.id})`);
      } else {
        errorCount++;
        errors.push({ shopId: shopDef.id, error: 'Registration returned false' });
        logger.error(`Failed to register Sesame Street shop ${shopDef.id}`);
      }
    } catch (error) {
      errorCount++;
      errors.push({ shopId: shopDef.id, error: error.message });
      logger.error(`Failed to register Sesame Street shop ${shopDef.id}: ${error.message}`);
    }
  }

  // After registration, load persisted inventory state
  logger.log('Loading persisted shop inventory...');
  const loadResult = ShopManager.loadAllShops();
  logger.log(`Loaded ${loadResult.successCount} shop inventories from disk`);

  return {
    successCount,
    errorCount,
    totalAttempted: shops.length,
    errors
  };
}

module.exports = {
  loadSesameStreetShops
};
