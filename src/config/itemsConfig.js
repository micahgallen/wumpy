/**
 * Items System Configuration
 *
 * Central configuration for all item system tunables.
 * Modify these values to adjust game balance without changing code.
 */

module.exports = {
  // Attunement System
  attunement: {
    maxSlots: 3,              // Maximum number of attuned items per character
    requiresRest: false        // Whether attunement requires rest (future feature)
  },

  // Encumbrance System
  encumbrance: {
    baseSlots: 20,             // Base inventory slots for all characters
    slotsPerStrength: 2,       // Additional slots per STR modifier point
    weightPerStrength: 15,     // Pounds of carry capacity per STR point
    baseWeight: 150            // Base carry capacity in pounds
  },

  // Stacking Rules
  stacking: {
    defaultStackSize: 99,      // Default max stack size for stackable items
    currencyStackSize: 9999,   // Max stack size for currency
    consumableStackSize: 99,   // Max stack size for consumables
    materialStackSize: 999     // Max stack size for crafting materials
  },

  // Durability System
  durability: {
    lossOnDeath: 10,           // Percentage of max durability lost on death
    repairCostMultiplier: 0.2, // Cost to repair = item_value * durability_lost * multiplier
    minDurability: 0,          // Items break at 0 durability
    brokenItemPenalty: 0.5     // Stat reduction when item is broken (50%)
  },

  // Proficiency Penalties
  proficiency: {
    weaponPenalty: -4,         // Attack roll penalty without weapon proficiency
    armorPenalty: {
      light: 0,                // No penalty for light armor
      medium: -2,              // Attack penalty for medium armor without proficiency
      heavy: -4                // Attack penalty for heavy armor without proficiency
    }
  },

  // Armor DEX Caps (D&D 5e style)
  armorDexCaps: {
    none: Infinity,            // No armor = full DEX bonus
    light: Infinity,           // Light armor = full DEX bonus
    medium: 2,                 // Medium armor = max +2 DEX bonus
    heavy: 0                   // Heavy armor = no DEX bonus
  },

  // Identification
  identification: {
    hideMagicalProperties: true,  // Hide magical properties until identified
    identifyCost: 50,             // Gold cost to identify at NPC
    identifyScrollCost: 25        // Gold cost for identify scroll
  },

  // Binding
  binding: {
    defaultBound: false,       // Items are unbound by default
    allowTradeWhenBound: false,// Cannot trade bound items
    allowDropWhenBound: false  // Cannot drop bound items
  },

  // Currency System
  currency: {
    types: ['copper', 'silver', 'gold', 'platinum'],
    conversions: {
      copper: 1,
      silver: 10,              // 1 silver = 10 copper
      gold: 100,               // 1 gold = 100 copper
      platinum: 1000           // 1 platinum = 1000 copper
    }
  },

  // Dual Wielding (D&D 5e Rules)
  dualWield: {
    // NOTE: This multiplier is used as a flag (0.5 = don't add ability mod to off-hand damage)
    // Following D&D 5e rules: off-hand attacks don't add ability modifier to damage
    // unless the player has the Two-Weapon Fighting feat (not yet implemented)
    // The value 0.5 is checked in combatResolver.js to determine if ability mod should be added
    offHandDamageMultiplier: 0.5,  // Flag: when 0.5, off-hand doesn't add ability mod (D&D 5e)
    requiresLightWeapons: true,    // Both weapons must be light (D&D 5e)
    autoAttack: true               // Off-hand attacks automatically each round
  },

  // Equipment Slots
  slots: {
    weapon: ['main_hand', 'off_hand'],
    armor: ['head', 'chest', 'legs', 'feet', 'hands', 'shoulders', 'waist', 'wrists', 'back'],
    jewelry: ['neck', 'ring_1', 'ring_2', 'trinket_1', 'trinket_2']
  },

  // Item Rarity Colors (for display)
  rarityColors: {
    common: 'white',
    uncommon: 'green',
    rare: 'blue',
    epic: 'purple',
    legendary: 'orange',
    artifact: 'red'
  },

  // Validation Limits
  validation: {
    maxWeight: 1000,           // Max weight for single item (pounds)
    maxValue: 1000000,         // Max gold value for single item
    maxDurability: 1000,       // Max durability points
    maxStackSize: 9999,        // Absolute max stack size
    maxNameLength: 50,         // Max characters in item name
    maxDescriptionLength: 500  // Max characters in description
  },

  // Loot Table System
  lootTables: {
    // Standard loot table categories
    // Items can be tagged with these to appear in specific loot drops
    categories: [
      'common_loot',      // Common treasure chests, low-level monsters
      'uncommon_loot',    // Mid-tier chests, tougher enemies
      'rare_loot',        // High-level chests, elite enemies
      'epic_loot',        // Epic chests, boss encounters
      'legendary_loot',   // Legendary chests, world bosses
      'boss_drops',       // Specific boss loot tables
      'vendor_only',      // Only available from vendors, never spawned
      'trash_loot',       // Junk items from trash mobs
      'crafting_drops',   // Materials and crafting components
      'quest_rewards'     // Items given as quest rewards
    ],

    // Type-based override rules
    // These rules override lootTables tags for certain item types
    typeRules: {
      // Quest items are NEVER spawnable, even if tagged
      quest: {
        neverSpawnable: true,
        reason: 'Quest items must be obtained through specific game events'
      },

      // Artifact rarity items are NEVER spawnable, even if tagged
      artifact: {
        neverSpawnable: true,
        reason: 'Artifacts are unique and must be obtained through specific means'
      },

      // Currency is ALWAYS spawnable in appropriate loot tables
      currency: {
        alwaysSpawnable: true,
        defaultTables: ['common_loot', 'uncommon_loot', 'rare_loot', 'epic_loot', 'legendary_loot', 'boss_drops', 'trash_loot'],
        reason: 'Currency is available in most loot sources'
      }
    }
  },

  // Economy System
  economy: {
    // Base item values by type (in copper)
    baseValues: {
      weapon: 200,        // Base value for weapons (e.g., common dagger)
      armor: 1000,        // Base value for armor pieces
      consumable: 50,     // Base value for consumables
      material: 10,       // Base value for crafting materials
      jewelry: 500,       // Base value for jewelry
      container: 100,     // Base value for containers
      currency: 1,        // Currency has value of 1 copper per copper
      quest: 0            // Quest items have no shop value
    },

    // Rarity price multipliers
    rarityMultipliers: {
      common: 1,
      uncommon: 5,
      rare: 25,
      epic: 125,
      legendary: 625,
      artifact: 3125
    },

    // Condition modifiers (percentage of full value)
    conditionModifiers: {
      broken: 0.10,       // 10% value when broken (0 durability)
      poor: 0.50,         // 50% value when durability < 25%
      fair: 0.75,         // 75% value when durability < 50%
      good: 0.90,         // 90% value when durability < 75%
      excellent: 1.00     // 100% value when durability >= 75%
    },

    // Shop settings
    shops: {
      defaultBuybackPercent: 0.50,  // Shops buy items at 50% of value
      identifyService: {
        common: 50,                  // 50 copper to identify common items
        uncommon: 500,               // 5 silver for uncommon
        rare: 5000,                  // 50 silver for rare
        epic: 50000,                 // 500 silver (5 gold) for epic
        legendary: 100000            // 1000 silver (10 gold) for legendary
      },
      repairService: {
        costMultiplier: 0.25        // 25% of item value per 100% durability restored
      }
    },

    // NPC currency drops (in copper)
    npcCurrencyDrops: {
      cr0: [1, 5],         // CR 0 (rats, etc): 1-5 copper
      cr1: [5, 20],        // CR 1 (goblins): 5-20 copper
      cr2: [10, 50],       // CR 2 (bandits): 10-50 copper
      cr3: [25, 100],      // CR 3 (orcs): 25-100 copper (1 silver max)
      cr4: [50, 200],      // CR 4: 50-200 copper (2 silver max)
      cr5: [100, 1000],    // CR 5+ (bosses): 1-10 silver (100-1000 copper)
      boss: [1000, 10000]  // Elite bosses: 10-100 silver (1-10 gold)
    }
  },

  // Container System
  containers: {
    defaultCapacity: 20,    // Default slot capacity for containers
    capacityByType: {
      small_chest: 10,
      chest: 20,
      large_chest: 40,
      crate: 15,
      barrel: 25,
      sack: 10,
      bag: 8
    }
  },

  // Corpse System Configuration
  corpses: {
    npc: {
      decayTime: 300000,        // 5 minutes (300,000 ms)
      baseWeight: 100,          // Base weight in pounds
      capacity: 20,             // Number of item slots
      isPickupable: true        // Can be picked up by strong players
    },
    player: {
      baseWeight: 150,          // Players heavier than NPCs
      capacity: 100,            // Large capacity (player's full inventory)
      isPickupable: false,      // Cannot be picked up
      allowPvPLooting: false,   // Only owner can loot
      lootedGracePeriod: 300000,  // 5 minutes before cleanup after looting
      abandonmentThreshold: 604800000  // 7 days (cleanup if player inactive)
    },
    sizeWeights: {
      tiny: 10,
      small: 50,
      medium: 100,
      large: 200,
      huge: 500,
      gargantuan: 1000
    }
  },

  // Spawn System Configuration
  spawn: {
    // Enable/disable the spawn system globally
    enabled: true,

    // Rarity-based spawn weights (higher = more common in random loot)
    // These weights are used when generating random loot from a pool of items
    rarityWeights: {
      common: 100,       // Very common
      uncommon: 40,      // Fairly common
      rare: 15,          // Uncommon
      epic: 5,           // Rare
      legendary: 1,      // Very rare
      artifact: 0        // Never random (must be placed manually)
    },

    // Quantity ranges for stackable items when spawned
    // [min, max] for each rarity level
    quantityRanges: {
      common: [1, 10],        // 1-10 common items
      uncommon: [1, 5],       // 1-5 uncommon items
      rare: [1, 3],           // 1-3 rare items
      epic: [1, 2],           // 1-2 epic items
      legendary: [1, 1],      // Always 1 legendary
      currency: [1, 100]      // Variable currency amounts
    },

    // Currency-specific quantity multipliers by type
    currencyQuantity: {
      copper: [1, 50],
      silver: [1, 20],
      gold: [1, 10],
      platinum: [1, 3]
    },

    // Default spawn tags for items that don't specify spawnTags
    // Items get auto-tagged based on their properties
    autoTagging: {
      enabled: true,
      rules: {
        // Auto-tag weapons
        weapon: ['type:weapon'],
        armor: ['type:armor'],
        consumable: ['type:consumable'],
        currency: ['type:currency'],
        material: ['type:material'],

        // Auto-tag by rarity
        common: ['rarity:common'],
        uncommon: ['rarity:uncommon'],
        rare: ['rarity:rare'],
        epic: ['rarity:epic'],
        legendary: ['rarity:legendary']
      }
    },

    // Spawn filtering rules
    // Control what can spawn in different contexts
    filters: {
      // Respect lootTables even if item is spawnable
      requireLootTableMatch: true,

      // Allow spawning items without explicit lootTables if spawnable: true
      allowUntaggedSpawnable: false,

      // Minimum level requirements for spawning rare items
      levelGating: {
        enabled: true,
        gates: {
          uncommon: 3,    // Level 3+ areas
          rare: 5,        // Level 5+ areas
          epic: 10,       // Level 10+ areas
          legendary: 15   // Level 15+ areas
        }
      }
    },

    // Loot generation defaults
    generation: {
      // Default number of items to generate per loot roll
      defaultItemCount: 3,

      // Chance for no loot (0-100)
      emptyLootChance: 10,

      // Chance for bonus item (0-100)
      bonusItemChance: 15,

      // Currency always drops in addition to items
      alwaysCurrency: true,

      // Duplicate item policy
      allowDuplicates: false
    }
  }
};
