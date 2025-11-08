/**
 * Sesame Street Item Loader
 *
 * Loads all item definitions from the Sesame Street realm into the ItemRegistry
 */

const ItemRegistry = require('../../../src/items/ItemRegistry');
const logger = require('../../../src/logger');

// Import all consumables
const chocolateChipCookie = require('./consumables/chocolate_chip_cookie');
const sardine_can = require('./consumables/sardine_can');
const birdseed = require('./consumables/birdseed');
const sugarCookie = require('./consumables/sugar_cookie');
const oatmealCookie = require('./consumables/oatmeal_cookie');
const milkBottle = require('./consumables/milk_bottle');
const healthPotion = require('./consumables/health_potion');

// Import equipment
const woodenPracticeSword = require('./equipment/wooden_practice_sword');
const mysteriousAmulet = require('./equipment/mysterious_amulet');
const leatherCap = require('./equipment/leather_cap');

/**
 * Load all Sesame Street items into the registry
 * @returns {Object} Load result with counts and errors
 */
function loadSesameStreetItems() {
  const items = [
    // Consumables
    chocolateChipCookie,
    sardine_can,
    birdseed,
    sugarCookie,
    oatmealCookie,
    milkBottle,
    healthPotion,
    // Equipment
    woodenPracticeSword,
    mysteriousAmulet,
    leatherCap
  ];

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const itemDef of items) {
    try {
      ItemRegistry.registerItem(itemDef, 'sesame_street');
      successCount++;
      logger.log(`Registered Sesame Street item: ${itemDef.id}`);
    } catch (error) {
      errorCount++;
      errors.push({ itemId: itemDef.id, error: error.message });
      logger.error(`Failed to register Sesame Street item ${itemDef.id}: ${error.message}`);
    }
  }

  return {
    successCount,
    errorCount,
    totalAttempted: items.length,
    errors
  };
}

module.exports = {
  loadSesameStreetItems
};
