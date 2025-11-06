/**
 * Item Validation Utilities
 *
 * Validates item definitions and instances against the schema.
 * Provides detailed error messages for debugging.
 */

const { ItemTypeValidation, ItemType } = require('./ItemTypes');
const config = require('../../config/itemsConfig');
const { isValidDiceString } = require('../../utils/dice');

/**
 * Validate an item definition
 * @param {Object} definition - Item definition object
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateItemDefinition(definition) {
  const errors = [];

  // Required fields
  if (!definition.id || typeof definition.id !== 'string') {
    errors.push('Item must have a string "id" property');
  }

  if (!definition.name || typeof definition.name !== 'string') {
    errors.push('Item must have a string "name" property');
  } else if (definition.name.length > config.validation.maxNameLength) {
    errors.push(`Item name exceeds maximum length of ${config.validation.maxNameLength}`);
  }

  if (!definition.description || typeof definition.description !== 'string') {
    errors.push('Item must have a string "description" property');
  } else if (definition.description.length > config.validation.maxDescriptionLength) {
    errors.push(`Item description exceeds maximum length of ${config.validation.maxDescriptionLength}`);
  }

  if (!definition.keywords || !Array.isArray(definition.keywords)) {
    errors.push('Item must have an array "keywords" property');
  }

  // Item type validation
  if (!definition.itemType) {
    errors.push('Item must have an "itemType" property');
  } else if (!ItemTypeValidation.isValidItemType(definition.itemType)) {
    errors.push(`Invalid itemType: ${definition.itemType}`);
  }

  // Numeric validations
  if (typeof definition.weight !== 'number' || definition.weight < 0) {
    errors.push('Item weight must be a non-negative number');
  } else if (definition.weight > config.validation.maxWeight) {
    errors.push(`Item weight exceeds maximum of ${config.validation.maxWeight}`);
  }

  if (typeof definition.value !== 'number' || definition.value < 0) {
    errors.push('Item value must be a non-negative number');
  } else if (definition.value > config.validation.maxValue) {
    errors.push(`Item value exceeds maximum of ${config.validation.maxValue}`);
  }

  // Rarity validation
  if (definition.rarity && !ItemTypeValidation.isValidRarity(definition.rarity)) {
    errors.push(`Invalid rarity: ${definition.rarity}`);
  }

  // Equipment slot validation
  if (definition.slot && !ItemTypeValidation.isValidEquipmentSlot(definition.slot)) {
    errors.push(`Invalid equipment slot: ${definition.slot}`);
  }

  // Loot table validation
  if (definition.lootTables !== undefined) {
    if (!Array.isArray(definition.lootTables)) {
      errors.push('Item "lootTables" must be an array if specified');
    } else {
      // Validate each loot table category
      const validCategories = config.lootTables.categories;
      for (const table of definition.lootTables) {
        if (typeof table !== 'string') {
          errors.push('Each loot table entry must be a string');
        } else if (!validCategories.includes(table)) {
          errors.push(`Invalid loot table category: ${table}. Valid categories: ${validCategories.join(', ')}`);
        }
      }
    }
  }

  // Type-specific validations
  if (definition.itemType === ItemType.WEAPON && definition.weaponProperties) {
    const weaponErrors = validateWeaponProperties(definition.weaponProperties);
    errors.push(...weaponErrors);
  }

  if (definition.itemType === ItemType.ARMOR && definition.armorProperties) {
    const armorErrors = validateArmorProperties(definition.armorProperties);
    errors.push(...armorErrors);
  }

  if (definition.itemType === ItemType.CONSUMABLE && definition.consumableProperties) {
    const consumableErrors = validateConsumableProperties(definition.consumableProperties);
    errors.push(...consumableErrors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate weapon properties
 * @param {Object} props - Weapon properties object
 * @returns {string[]} Array of error messages
 */
function validateWeaponProperties(props) {
  const errors = [];

  if (!props.damageDice || typeof props.damageDice !== 'string') {
    errors.push('Weapon must have a string "damageDice" property');
  } else if (!isValidDiceString(props.damageDice)) {
    errors.push(`Invalid damageDice format: ${props.damageDice}`);
  }

  if (!props.damageType) {
    errors.push('Weapon must have a "damageType" property');
  } else if (!ItemTypeValidation.isValidDamageType(props.damageType)) {
    errors.push(`Invalid damageType: ${props.damageType}`);
  }

  if (!props.weaponClass) {
    errors.push('Weapon must have a "weaponClass" property');
  } else if (!ItemTypeValidation.isValidWeaponClass(props.weaponClass)) {
    errors.push(`Invalid weaponClass: ${props.weaponClass}`);
  }

  if (typeof props.isTwoHanded !== 'boolean') {
    errors.push('Weapon must have a boolean "isTwoHanded" property');
  }

  if (typeof props.isRanged !== 'boolean') {
    errors.push('Weapon must have a boolean "isRanged" property');
  }

  if (props.isLight !== undefined && typeof props.isLight !== 'boolean') {
    errors.push('Weapon "isLight" property must be boolean if specified');
  }

  if (props.isFinesse !== undefined && typeof props.isFinesse !== 'boolean') {
    errors.push('Weapon "isFinesse" property must be boolean if specified');
  }

  if (props.isVersatile !== undefined && typeof props.isVersatile !== 'boolean') {
    errors.push('Weapon "isVersatile" property must be boolean if specified');
  }

  if (props.versatileDamageDice && !isValidDiceString(props.versatileDamageDice)) {
    errors.push(`Invalid versatileDamageDice format: ${props.versatileDamageDice}`);
  }

  return errors;
}

/**
 * Validate armor properties
 * @param {Object} props - Armor properties object
 * @returns {string[]} Array of error messages
 */
function validateArmorProperties(props) {
  const errors = [];

  if (typeof props.baseAC !== 'number' || props.baseAC < 0) {
    errors.push('Armor must have a non-negative number "baseAC" property');
  }

  if (!props.armorClass) {
    errors.push('Armor must have an "armorClass" property');
  } else if (!ItemTypeValidation.isValidArmorClass(props.armorClass)) {
    errors.push(`Invalid armorClass: ${props.armorClass}`);
  }

  if (props.maxDexBonus !== undefined && typeof props.maxDexBonus !== 'number') {
    errors.push('Armor "maxDexBonus" must be a number if specified');
  }

  if (props.stealthDisadvantage !== undefined && typeof props.stealthDisadvantage !== 'boolean') {
    errors.push('Armor "stealthDisadvantage" must be boolean if specified');
  }

  return errors;
}

/**
 * Validate consumable properties
 * @param {Object} props - Consumable properties object
 * @returns {string[]} Array of error messages
 */
function validateConsumableProperties(props) {
  const errors = [];

  if (!props.consumableType) {
    errors.push('Consumable must have a "consumableType" property');
  } else if (!ItemTypeValidation.isValidConsumableType(props.consumableType)) {
    errors.push(`Invalid consumableType: ${props.consumableType}`);
  }

  if (props.onUse && typeof props.onUse !== 'function') {
    errors.push('Consumable "onUse" must be a function if specified');
  }

  return errors;
}

/**
 * Validate an item instance
 * @param {Object} instance - Item instance object
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateItemInstance(instance) {
  const errors = [];

  if (!instance.instanceId || typeof instance.instanceId !== 'string') {
    errors.push('Item instance must have a string "instanceId" property');
  }

  if (!instance.definitionId || typeof instance.definitionId !== 'string') {
    errors.push('Item instance must have a string "definitionId" property');
  }

  if (!instance.location || typeof instance.location !== 'object') {
    errors.push('Item instance must have an object "location" property');
  } else {
    if (!instance.location.type) {
      errors.push('Item instance location must have a "type" property');
    }
  }

  if (typeof instance.quantity !== 'number' || instance.quantity < 0) {
    errors.push('Item instance quantity must be a non-negative number');
  }

  if (instance.durability !== undefined) {
    if (typeof instance.durability !== 'number' || instance.durability < 0) {
      errors.push('Item instance durability must be a non-negative number');
    }
  }

  if (instance.maxDurability !== undefined) {
    if (typeof instance.maxDurability !== 'number' || instance.maxDurability < 0) {
      errors.push('Item instance maxDurability must be a non-negative number');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateItemDefinition,
  validateWeaponProperties,
  validateArmorProperties,
  validateConsumableProperties,
  validateItemInstance
};
