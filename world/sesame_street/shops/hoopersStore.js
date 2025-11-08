/**
 * Hooper's General Store - Main Shop for Sesame Street
 *
 * A friendly neighborhood store run by Mr. Hooper.
 * Sells consumables, basic equipment, and offers repair/identify services.
 *
 * This shop serves as the primary testing ground for the Phase 5 economy system.
 */

module.exports = {
  id: 'hoopers_store',
  name: "Hooper's General Store",
  description: 'A cozy neighborhood store that somehow stocks everything from cookies to combat equipment. Mr. Hooper runs the place with professional cheerfulness and only occasional existential uncertainty.',

  // Shop inventory with prices in copper
  inventory: [
    // === CONSUMABLES - Food & Drink ===
    { itemId: 'chocolate_chip_cookie', quantity: 50, price: 25 },
    { itemId: 'sugar_cookie', quantity: 50, price: 20 },
    { itemId: 'oatmeal_cookie', quantity: 40, price: 30 },
    { itemId: 'milk_bottle', quantity: 30, price: 15 },
    { itemId: 'birdseed', quantity: 20, price: 10 },
    { itemId: 'sardine_can', quantity: 15, price: 12 },

    // === CONSUMABLES - Potions ===
    { itemId: 'health_potion', quantity: 20, price: 50 },

    // === EQUIPMENT - Weapons ===
    { itemId: 'wooden_practice_sword', quantity: 10, price: 50 },

    // === EQUIPMENT - Armor ===
    { itemId: 'leather_cap', quantity: 8, price: 100 },

    // === SPECIAL ITEMS - Magical (Unidentified) ===
    { itemId: 'mysterious_amulet', quantity: 3, price: 500 }
  ],

  // Shop configuration
  unlimited: false,           // Limited stock - quantities matter
  buyback: 0.5,              // Buys items at 50% of their value
  markup: 1.0,               // Sells at base item price (1.0x multiplier)

  // Services offered
  services: {
    identify: true,          // Can identify magical items
    repair: true             // Can repair damaged equipment
  },

  // What types of items the shop will buy from players
  buyTypes: ['consumable', 'weapon', 'armor', 'jewelry'],

  // Shop hours (optional - for future implementation)
  hours: {
    open: 6,    // 6 AM
    close: 22   // 10 PM
  },

  // Flavor text for various interactions
  messages: {
    greeting: "Welcome to Hooper's! We have everything you need and several things you don't!",
    farewell: "Thanks for shopping at Hooper's! Try not to break anything... expensive.",
    noMoney: "I'm afraid your pockets are lighter than your ambitions, friend.",
    soldOut: "We're fresh out of those! But I could interest you in something equally... adjacent?",
    repairSuccess: "Good as new! Well, good as it was before it broke, anyway.",
    identifySuccess: "Ah yes, I know exactly what this is! Mostly. Fairly sure."
  }
};
