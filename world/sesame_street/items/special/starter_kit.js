/**
 * Starter Kit - Welcome Package for New Players
 *
 * A special item that provides new players with basic supplies
 * and starting currency to begin their adventure.
 */

const { ItemType, ItemRarity, SpawnTag } = require('../../../../src/items/schemas/ItemTypes');

module.exports = {
  id: 'starter_kit',
  name: 'a Sesame Street Starter Kit',
  description: 'This cheerful canvas bag bears a friendly logo and the words "Welcome to Sesame Street!" in bright yellow letters. Inside, you can see the essentials every new adventurer needs: a few cookies, a bottle of milk, and a small pouch of coins. The bag itself radiates the kind of optimistic energy that suggests whoever packed it genuinely believes in your potential. A small note attached reads: "Good luck! Try not to die immediately. - The Management"',
  keywords: ['kit', 'starter', 'welcome', 'bag', 'package'],
  itemType: ItemType.MISC,
  weight: 2,
  value: 0,  // Worthless to shops - can't be sold
  rarity: ItemRarity.COMMON,
  isStackable: false,
  spawnable: false,  // Only given to new players, not found in world
  isQuestItem: true, // Prevents selling
  spawnTags: [
    SpawnTag.STARTER_GEAR,
    SpawnTag.REALM_SESAME_STREET
  ],

  // Special property: contains items and currency
  // This would be handled by a special "use" or "open" action
  contents: {
    items: [
      { itemId: 'chocolate_chip_cookie', quantity: 3 },
      { itemId: 'milk_bottle', quantity: 2 },
      { itemId: 'wooden_practice_sword', quantity: 1 }
    ],
    currency: 100  // 100 copper (1 silver) to start
  }
};
