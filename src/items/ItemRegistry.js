/**
 * Item Registry
 *
 * Central singleton registry for all item definitions.
 * Mirrors the command registry pattern with domain-based organization.
 *
 * Supports:
 * - Registration of item definitions by ID
 * - Domain-based organization (e.g., sesame_street, narnia)
 * - Validation on registration
 * - O(1) lookup by ID
 * - Alias support for item keywords
 */

const logger = require('../logger');
const { validateItemDefinition } = require('./schemas/ItemValidator');

/**
 * Registry storage
 * - items: Map<id, definition>
 * - domains: Map<domain, Set<itemId>>
 * - keywords: Map<keyword, Set<itemId>> - for multi-item keyword lookups
 */
const items = new Map();
const domains = new Map();
const keywords = new Map();

/**
 * Register an item definition with the registry
 * @param {Object} definition - Item definition object
 * @param {string} [domain='core'] - Domain/realm this item belongs to
 * @throws {Error} If definition is invalid or item ID conflicts
 */
function registerItem(definition, domain = 'core') {
  // Validate definition
  const validation = validateItemDefinition(definition);
  if (!validation.valid) {
    const errorMsg = `Invalid item definition for "${definition.id || 'unknown'}":\n  - ${validation.errors.join('\n  - ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  const id = definition.id.toLowerCase();

  // Check for ID conflicts
  if (items.has(id)) {
    throw new Error(`Item ID "${id}" is already registered`);
  }

  // Store the item definition
  items.set(id, {
    ...definition,
    id,  // Ensure lowercase ID
    domain,
    registeredAt: Date.now()
  });

  // Track domain membership
  if (!domains.has(domain)) {
    domains.set(domain, new Set());
  }
  domains.get(domain).add(id);

  // Index keywords for lookup
  if (definition.keywords && Array.isArray(definition.keywords)) {
    for (const keyword of definition.keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      if (!keywords.has(normalizedKeyword)) {
        keywords.set(normalizedKeyword, new Set());
      }
      keywords.get(normalizedKeyword).add(id);
    }
  }

  logger.debug(`Registered item: ${id} (domain: ${domain}, type: ${definition.itemType})`);
}

/**
 * Get an item definition by ID
 * @param {string} id - Item ID
 * @returns {Object|null} Item definition or null if not found
 */
function getItem(id) {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const normalized = id.toLowerCase();
  return items.get(normalized) || null;
}

/**
 * Find items by keyword
 * Useful for "get sword" commands where multiple swords might exist
 * @param {string} keyword - Keyword to search for
 * @returns {Array<Object>} Array of item definitions matching the keyword
 */
function findItemsByKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    return [];
  }

  const normalized = keyword.toLowerCase();
  const itemIds = keywords.get(normalized);

  if (!itemIds) {
    return [];
  }

  return Array.from(itemIds)
    .map(id => items.get(id))
    .filter(item => item !== null);
}

/**
 * Get all items for a specific domain
 * @param {string} domain - Domain/realm name
 * @returns {Array<Object>} Array of item definitions in that domain
 */
function getItemsByDomain(domain) {
  const domainItems = domains.get(domain);
  if (!domainItems) {
    return [];
  }

  return Array.from(domainItems)
    .map(id => items.get(id))
    .filter(item => item !== null);
}

/**
 * Get all items available for a specific loot table category
 * This checks the item's lootTables property and respects type-based rules
 * @param {string} tableCategory - Loot table category (e.g., 'common_loot', 'boss_drops')
 * @returns {Array<Object>} Array of item definitions that can spawn in this loot table
 */
function getItemsByLootTable(tableCategory) {
  if (!tableCategory || typeof tableCategory !== 'string') {
    return [];
  }

  const config = require('../config/itemsConfig');
  const { ItemType, ItemRarity } = require('./schemas/ItemTypes');

  // Validate that the table category exists
  if (!config.lootTables.categories.includes(tableCategory)) {
    logger.error(`Invalid loot table category: ${tableCategory}`);
    return [];
  }

  const result = [];
  const typeRules = config.lootTables.typeRules;

  for (const item of items.values()) {
    // Apply type-based rules

    // Quest items are NEVER spawnable
    if (item.itemType === ItemType.QUEST) {
      if (typeRules.quest && typeRules.quest.neverSpawnable) {
        continue;
      }
    }

    // Artifact rarity items are NEVER spawnable
    if (item.rarity === ItemRarity.ARTIFACT) {
      if (typeRules.artifact && typeRules.artifact.neverSpawnable) {
        continue;
      }
    }

    // Currency items are ALWAYS spawnable with defaults
    if (item.itemType === ItemType.CURRENCY) {
      if (typeRules.currency && typeRules.currency.alwaysSpawnable) {
        // Check explicit lootTables first, otherwise use defaults
        if (item.lootTables && item.lootTables.includes(tableCategory)) {
          result.push(item);
          continue;
        } else if (typeRules.currency.defaultTables.includes(tableCategory)) {
          result.push(item);
          continue;
        }
      }
    }

    // For all other items, check if they have the loot table tag
    if (item.lootTables && item.lootTables.includes(tableCategory)) {
      result.push(item);
    }
  }

  return result;
}

/**
 * Get all registered item IDs
 * @returns {Array<string>} Array of item IDs
 */
function getAllItemIds() {
  return Array.from(items.keys());
}

/**
 * Get all registered items
 * @returns {Array<Object>} Array of all item definitions
 */
function getAllItems() {
  return Array.from(items.values());
}

/**
 * Get all registered domains
 * @returns {Array<string>} Array of domain names
 */
function getAllDomains() {
  return Array.from(domains.keys());
}

/**
 * Check if an item ID exists in the registry
 * @param {string} id - Item ID to check
 * @returns {boolean} True if item exists
 */
function hasItem(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return items.has(id.toLowerCase());
}

/**
 * Get registry statistics
 * @returns {Object} Statistics about the registry
 */
function getStats() {
  const stats = {
    totalItems: items.size,
    totalDomains: domains.size,
    totalKeywords: keywords.size,
    byDomain: {},
    byType: {}
  };

  // Count items by domain
  for (const [domain, itemIds] of domains.entries()) {
    stats.byDomain[domain] = itemIds.size;
  }

  // Count items by type
  for (const item of items.values()) {
    stats.byType[item.itemType] = (stats.byType[item.itemType] || 0) + 1;
  }

  return stats;
}

/**
 * Clear all registered items (useful for testing)
 */
function clearRegistry() {
  items.clear();
  domains.clear();
  keywords.clear();
  logger.log('Item registry cleared');
}

/**
 * Unregister an item by ID (useful for dynamic content)
 * @param {string} id - Item ID to unregister
 * @returns {boolean} True if item was unregistered, false if not found
 */
function unregisterItem(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const normalized = id.toLowerCase();
  const item = items.get(normalized);

  if (!item) {
    return false;
  }

  // Remove from items map
  items.delete(normalized);

  // Remove from domain tracking
  const domainItems = domains.get(item.domain);
  if (domainItems) {
    domainItems.delete(normalized);
    if (domainItems.size === 0) {
      domains.delete(item.domain);
    }
  }

  // Remove from keyword index
  if (item.keywords) {
    for (const keyword of item.keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      const keywordItems = keywords.get(normalizedKeyword);
      if (keywordItems) {
        keywordItems.delete(normalized);
        if (keywordItems.size === 0) {
          keywords.delete(normalizedKeyword);
        }
      }
    }
  }

  logger.log(`Unregistered item: ${normalized}`);
  return true;
}

module.exports = {
  registerItem,
  getItem,
  findItemsByKeyword,
  getItemsByDomain,
  getItemsByLootTable,
  getAllItemIds,
  getAllItems,
  getAllDomains,
  hasItem,
  getStats,
  clearRegistry,
  unregisterItem
};
