/**
 * Item Factory
 *
 * Factory functions for creating item instances from definitions.
 * Automatically applies appropriate mixins based on item type.
 */

const BaseItem = require('./BaseItem');
const { ItemType } = require('./schemas/ItemTypes');
const { applyWeaponMixin } = require('./mixins/WeaponMixin');
const { applyArmorMixin } = require('./mixins/ArmorMixin');
const { applyConsumableMixin } = require('./mixins/ConsumableMixin');
const { applyQuestItemMixin } = require('./mixins/QuestItemMixin');
const logger = require('../logger');

/**
 * Create an item instance from a definition
 * @param {Object|string} definitionOrId - Item definition from registry, or item ID string
 * @param {Object} [options={}] - Instance-specific options
 * @returns {BaseItem} Item instance with appropriate mixins applied
 */
function createItem(definitionOrId, options = {}) {
  if (!definitionOrId) {
    throw new Error('Cannot create item: definition is required');
  }

  // If passed a string ID, look up the definition
  let definition = definitionOrId;
  if (typeof definitionOrId === 'string') {
    const ItemRegistry = require('./ItemRegistry');
    definition = ItemRegistry.getItem(definitionOrId);
    if (!definition) {
      throw new Error(`Cannot create item: definition not found for ID "${definitionOrId}"`);
    }
  }

  // Create base item
  const item = new BaseItem(definition, options);

  // Apply type-specific mixins
  switch (definition.itemType) {
    case ItemType.WEAPON:
      applyWeaponMixin(item);
      break;

    case ItemType.ARMOR:
      applyArmorMixin(item);
      break;

    case ItemType.CONSUMABLE:
      applyConsumableMixin(item);
      break;

    case ItemType.QUEST:
      applyQuestItemMixin(item);
      break;

    case ItemType.JEWELRY:
      // Jewelry is like armor but for jewelry slots
      applyArmorMixin(item);
      break;

    // Other types use base item functionality
    case ItemType.COSMETIC:
    case ItemType.MATERIAL:
    case ItemType.CONTAINER:
    case ItemType.CURRENCY:
    case ItemType.MISC:
    default:
      // No additional mixins needed
      break;
  }

  // Apply quest item mixin if flagged as quest item
  if (definition.isQuestItem && definition.itemType !== ItemType.QUEST) {
    applyQuestItemMixin(item);
  }

  logger.log(`Created item instance: ${item.name} (${item.instanceId})`);

  return item;
}

/**
 * Create a weapon item
 * Convenience function for creating weapons
 * @param {Object} definition - Weapon definition
 * @param {Object} [options={}] - Instance options
 * @returns {BaseItem} Weapon instance
 */
function createWeapon(definition, options = {}) {
  if (definition.itemType !== ItemType.WEAPON) {
    throw new Error('Cannot create weapon: definition is not a weapon type');
  }
  return createItem(definition, options);
}

/**
 * Create an armor item
 * Convenience function for creating armor
 * @param {Object} definition - Armor definition
 * @param {Object} [options={}] - Instance options
 * @returns {BaseItem} Armor instance
 */
function createArmor(definition, options = {}) {
  if (definition.itemType !== ItemType.ARMOR) {
    throw new Error('Cannot create armor: definition is not an armor type');
  }
  return createItem(definition, options);
}

/**
 * Create a consumable item
 * Convenience function for creating consumables
 * @param {Object} definition - Consumable definition
 * @param {Object} [options={}] - Instance options
 * @returns {BaseItem} Consumable instance
 */
function createConsumable(definition, options = {}) {
  if (definition.itemType !== ItemType.CONSUMABLE) {
    throw new Error('Cannot create consumable: definition is not a consumable type');
  }
  return createItem(definition, options);
}

/**
 * Restore an item from serialized data
 * @param {Object} data - Serialized item data
 * @param {Object} definition - Item definition from registry
 * @returns {BaseItem} Restored item instance
 */
function restoreItem(data, definition) {
  if (!data || !definition) {
    throw new Error('Cannot restore item: data and definition are required');
  }

  // Create item with restored data
  const options = {
    instanceId: data.instanceId,
    location: data.location,
    quantity: data.quantity,
    durability: data.durability,
    isEquipped: data.isEquipped,
    equippedSlot: data.equippedSlot,
    boundTo: data.boundTo,
    isAttuned: data.isAttuned,
    attunedTo: data.attunedTo,
    isIdentified: data.isIdentified,
    enchantments: data.enchantments || [],
    customName: data.customName,
    customDescription: data.customDescription,
    createdAt: data.createdAt,
    modifiedAt: data.modifiedAt
  };

  return createItem(definition, options);
}

/**
 * Clone an item instance
 * @param {BaseItem} item - Item to clone
 * @param {Object} [overrides={}] - Properties to override
 * @returns {BaseItem} Cloned item with new instance ID
 */
function cloneItem(item, overrides = {}) {
  if (!item || !item.definitionId) {
    throw new Error('Cannot clone item: invalid item instance');
  }

  // Look up definition from registry (avoids circular reference)
  const ItemRegistry = require('./ItemRegistry');
  const definition = ItemRegistry.getItem(item.definitionId);

  if (!definition) {
    throw new Error(`Cannot clone item: definition not found for ${item.definitionId}`);
  }

  const data = item.toJSON();

  // Remove instance ID to generate a new one
  delete data.instanceId;

  // Apply overrides
  Object.assign(data, overrides);

  return restoreItem(data, definition);
}

module.exports = {
  createItem,
  createWeapon,
  createArmor,
  createConsumable,
  restoreItem,
  cloneItem
};
