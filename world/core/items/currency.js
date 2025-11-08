/**
 * Currency Item Definitions
 *
 * Physical currency items for environmental currency (loot drops, trading).
 * These auto-convert to wallet currency when picked up.
 */

const { ItemType, ItemRarity, SpawnTag } = require('../../../src/items/schemas/ItemTypes');

const currencyItems = [
  {
    id: 'currency_copper',
    name: 'copper coins',
    description: 'A pile of copper coins, the most common currency.',
    keywords: ['copper', 'coins', 'coin', 'c', 'cp'],
    itemType: ItemType.CURRENCY,
    subType: 'copper',
    weight: 0.01, // 100 coins = 1 pound
    value: 1, // 1 copper each
    rarity: ItemRarity.COMMON,
    isStackable: true,
    maxStackSize: 10000,
    isDroppable: true,
    isTakeable: true,
    spawnable: true,
    lootTables: ['common_loot', 'trash_loot'],
    spawnTags: [
      SpawnTag.TYPE_CURRENCY,
      SpawnTag.REALM_GENERIC,
      SpawnTag.TRASH_MOB,
      SpawnTag.STARTER_GEAR
    ],

    /**
     * Custom pickup behavior - auto-convert to wallet
     */
    onPickup: function(player, item) {
      const CurrencyManager = require('../../../src/systems/economy/CurrencyManager');

      // Preserve denomination - don't convert to copper
      const currencyToAdd = {
        platinum: 0,
        gold: 0,
        silver: 0,
        copper: item.quantity || 1
      };

      // Add to player wallet preserving exact denomination
      const result = CurrencyManager.addToWalletExact(player, currencyToAdd);

      if (result.success) {
        // Save to database
        if (player.playerDB) {
          player.playerDB.updatePlayerCurrency(player.username, result.newBalance);
        }

        // Return message for pickup
        return {
          success: true,
          preventAddToInventory: true, // Don't add to inventory, goes to wallet
          message: `You pick up ${CurrencyManager.format(currencyToAdd)} and add it to your wallet.`
        };
      }

      return { success: false, message: 'Failed to add currency to wallet.' };
    },

    /**
     * Custom display for stacked currency
     */
    getDisplayName: function() {
      const quantity = this.quantity || 1;
      return quantity === 1 ? 'a copper coin' : `${quantity} copper coins`;
    }
  },

  {
    id: 'currency_silver',
    name: 'silver coins',
    description: 'A pile of silver coins, worth 10 copper each.',
    keywords: ['silver', 'coins', 'coin', 's', 'sp'],
    itemType: ItemType.CURRENCY,
    subType: 'silver',
    weight: 0.01, // 100 coins = 1 pound
    value: 10, // 10 copper each
    rarity: ItemRarity.COMMON,
    isStackable: true,
    maxStackSize: 10000,
    isDroppable: true,
    isTakeable: true,
    spawnable: true,
    lootTables: ['uncommon_loot'],
    spawnTags: [
      SpawnTag.TYPE_CURRENCY,
      SpawnTag.REALM_GENERIC,
      SpawnTag.RARITY_UNCOMMON
    ],

    onPickup: function(player, item) {
      const CurrencyManager = require('../../../src/systems/economy/CurrencyManager');

      // Preserve denomination - don't convert to copper
      const currencyToAdd = {
        platinum: 0,
        gold: 0,
        silver: item.quantity || 1,
        copper: 0
      };

      const result = CurrencyManager.addToWalletExact(player, currencyToAdd);

      if (result.success) {
        if (player.playerDB) {
          player.playerDB.updatePlayerCurrency(player.username, result.newBalance);
        }

        return {
          success: true,
          preventAddToInventory: true,
          message: `You pick up ${CurrencyManager.format(currencyToAdd)} and add it to your wallet.`
        };
      }

      return { success: false, message: 'Failed to add currency to wallet.' };
    },

    getDisplayName: function() {
      const quantity = this.quantity || 1;
      return quantity === 1 ? 'a silver coin' : `${quantity} silver coins`;
    }
  },

  {
    id: 'currency_gold',
    name: 'gold coins',
    description: 'A pile of gold coins, worth 100 copper each.',
    keywords: ['gold', 'coins', 'coin', 'g', 'gp'],
    itemType: ItemType.CURRENCY,
    subType: 'gold',
    weight: 0.01, // 100 coins = 1 pound
    value: 100, // 100 copper each
    rarity: ItemRarity.UNCOMMON,
    isStackable: true,
    maxStackSize: 10000,
    isDroppable: true,
    isTakeable: true,
    spawnable: true,
    lootTables: ['rare_loot', 'epic_loot'],
    spawnTags: [
      SpawnTag.TYPE_CURRENCY,
      SpawnTag.REALM_GENERIC,
      SpawnTag.RARITY_RARE,
      SpawnTag.ELITE_DROP
    ],

    onPickup: function(player, item) {
      const CurrencyManager = require('../../../src/systems/economy/CurrencyManager');

      // Preserve denomination - don't convert to copper
      const currencyToAdd = {
        platinum: 0,
        gold: item.quantity || 1,
        silver: 0,
        copper: 0
      };

      const result = CurrencyManager.addToWalletExact(player, currencyToAdd);

      if (result.success) {
        if (player.playerDB) {
          player.playerDB.updatePlayerCurrency(player.username, result.newBalance);
        }

        return {
          success: true,
          preventAddToInventory: true,
          message: `You pick up ${CurrencyManager.format(currencyToAdd)} and add it to your wallet.`
        };
      }

      return { success: false, message: 'Failed to add currency to wallet.' };
    },

    getDisplayName: function() {
      const quantity = this.quantity || 1;
      return quantity === 1 ? 'a gold coin' : `${quantity} gold coins`;
    }
  },

  {
    id: 'currency_platinum',
    name: 'platinum coins',
    description: 'A pile of platinum coins, worth 1000 copper each. Very valuable!',
    keywords: ['platinum', 'coins', 'coin', 'p', 'pp'],
    itemType: ItemType.CURRENCY,
    subType: 'platinum',
    weight: 0.01, // 100 coins = 1 pound
    value: 1000, // 1000 copper each
    rarity: ItemRarity.RARE,
    isStackable: true,
    maxStackSize: 10000,
    isDroppable: true,
    isTakeable: true,
    spawnable: true,
    lootTables: ['legendary_loot', 'boss_drops'],
    spawnTags: [
      SpawnTag.TYPE_CURRENCY,
      SpawnTag.REALM_GENERIC,
      SpawnTag.RARITY_LEGENDARY,
      SpawnTag.BOSS_DROP
    ],

    onPickup: function(player, item) {
      const CurrencyManager = require('../../../src/systems/economy/CurrencyManager');

      // Preserve denomination - don't convert to copper
      const currencyToAdd = {
        platinum: item.quantity || 1,
        gold: 0,
        silver: 0,
        copper: 0
      };

      const result = CurrencyManager.addToWalletExact(player, currencyToAdd);

      if (result.success) {
        if (player.playerDB) {
          player.playerDB.updatePlayerCurrency(player.username, result.newBalance);
        }

        return {
          success: true,
          preventAddToInventory: true,
          message: `You pick up ${CurrencyManager.format(currencyToAdd)} and add it to your wallet.`
        };
      }

      return { success: false, message: 'Failed to add currency to wallet.' };
    },

    getDisplayName: function() {
      const quantity = this.quantity || 1;
      return quantity === 1 ? 'a platinum coin' : `${quantity} platinum coins`;
    }
  }
];

module.exports = currencyItems;
