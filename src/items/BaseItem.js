/**
 * Base Item Class
 *
 * Defines the core item interface with lifecycle hooks.
 * All items in the game are instances of BaseItem or its subclasses.
 *
 * Lifecycle hooks:
 * - onEquip: Called when item is equipped
 * - onUnequip: Called when item is unequipped
 * - onUse: Called when item is used/consumed
 * - onDrop: Called when item is dropped
 * - onPickup: Called when item is picked up
 * - onExamine: Called when item is examined
 * - onIdentify: Called when item is identified
 * - onAttune: Called when item is attuned
 * - onUnattune: Called when item is unattuned
 * - onBind: Called when item becomes bound
 */

const logger = require('../logger');
const config = require('../config/itemsConfig');
const { ItemType, ItemRarity } = require('./schemas/ItemTypes');

class BaseItem {
  /**
   * Create a new item instance
   * @param {Object} definition - Item definition from registry
   * @param {Object} [options={}] - Instance-specific options
   */
  constructor(definition, options = {}) {
    // Instance identity
    this.instanceId = options.instanceId || this.generateInstanceId();
    this.definitionId = definition.id;
    // NOTE: We do NOT store the definition reference to avoid circular references
    // Use getDefinition() method to retrieve it when needed

    // Core properties from definition
    this.name = definition.name;
    this.description = definition.description;
    this.keywords = [...definition.keywords];
    this.itemType = definition.itemType;
    this.subType = definition.subType || null;
    this.weight = definition.weight;
    this.value = definition.value;
    this.rarity = definition.rarity || 'common';

    // Flags
    this.isTakeable = definition.isTakeable !== false;  // Default true
    this.isDroppable = definition.isDroppable !== false;  // Default true
    this.isEquippable = definition.isEquippable || false;
    this.isTradeable = definition.isTradeable !== false;  // Default true
    this.isQuestItem = definition.isQuestItem || false;
    this.isStackable = definition.isStackable || false;
    this.isIdentified = options.isIdentified || false;

    // Location
    this.location = options.location || { type: 'void' };

    // State
    this.quantity = options.quantity || 1;
    this.durability = options.durability || definition.maxDurability || null;
    this.maxDurability = definition.maxDurability || null;
    this.isEquipped = options.isEquipped || false;
    this.equippedSlot = options.equippedSlot || null;

    // Binding and attunement
    this.boundTo = options.boundTo || null;
    this.isAttuned = options.isAttuned || false;
    this.attunedTo = options.attunedTo || null;
    this.requiresAttunement = definition.requiresAttunement || false;
    this.bindOnEquip = definition.bindOnEquip || false;
    this.bindOnPickup = definition.bindOnPickup || false;

    // Equipment properties
    this.slot = definition.slot || null;
    this.requiredLevel = definition.requiredLevel || 0;
    this.requiredClass = definition.requiredClass || null;

    // Stats and properties (copied to avoid mutation)
    this.statModifiers = definition.statModifiers ? { ...definition.statModifiers } : null;
    this.weaponProperties = definition.weaponProperties ? { ...definition.weaponProperties } : null;
    this.armorProperties = definition.armorProperties ? { ...definition.armorProperties } : null;
    this.consumableProperties = definition.consumableProperties ? { ...definition.consumableProperties } : null;

    // Enchantments and modifications
    this.enchantments = options.enchantments || [];
    this.customName = options.customName || null;
    this.customDescription = options.customDescription || null;

    // Timestamps
    this.createdAt = options.createdAt || Date.now();
    this.modifiedAt = options.modifiedAt || Date.now();

    // Metadata
    this.realm = definition.realm || null;
    this.domain = definition.domain || 'core';
  }

  /**
   * Generate a unique instance ID
   * Using crypto.randomUUID if available, otherwise fallback
   * @returns {string} Unique instance ID
   */
  generateInstanceId() {
    try {
      // Node.js 15.6.0+ has crypto.randomUUID
      return require('crypto').randomUUID();
    } catch (e) {
      // Fallback for older Node versions
      return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Get the item definition from the registry
   * This avoids storing circular references in the item instance
   * @returns {Object} Item definition
   */
  getDefinition() {
    const ItemRegistry = require('./ItemRegistry');
    return ItemRegistry.getItem(this.definitionId);
  }

  // Lifecycle Hooks

  /**
   * Called when item is equipped
   * @param {Object} player - Player equipping the item
   * @returns {boolean} True if equip succeeded, false to prevent
   */
  onEquip(player) {
    // Check if definition has custom onEquip hook
    const definition = this.getDefinition();
    if (definition.onEquip && typeof definition.onEquip === 'function') {
      return definition.onEquip(player, this);
    }

    // Handle bind-on-equip
    if (this.bindOnEquip && !this.boundTo) {
      this.boundTo = player.name;
      this.modifiedAt = Date.now();
      logger.log(`Item ${this.name} bound to ${player.name}`);
    }

    return true;
  }

  /**
   * Called when item is unequipped
   * @param {Object} player - Player unequipping the item
   * @returns {boolean} True if unequip succeeded, false to prevent
   */
  onUnequip(player) {
    const definition = this.getDefinition();
    if (definition.onUnequip && typeof definition.onUnequip === 'function') {
      return definition.onUnequip(player, this);
    }
    return true;
  }

  /**
   * Called when item is used
   * @param {Object} player - Player using the item
   * @param {Object} [context={}] - Additional context (target, location, etc.)
   * @returns {boolean} True if use succeeded, false otherwise
   */
  onUse(player, context = {}) {
    const definition = this.getDefinition();
    if (definition.onUse && typeof definition.onUse === 'function') {
      return definition.onUse(player, this, context);
    }
    return false;  // Default: items are not usable
  }

  /**
   * Called when item is dropped
   * @param {Object} player - Player dropping the item
   * @param {Object} room - Room where item is being dropped
   * @returns {boolean} True if drop succeeded, false to prevent
   */
  onDrop(player, room) {
    // Check if item is droppable
    if (!this.isDroppable) {
      return false;
    }

    // Check if item is bound
    if (this.boundTo && this.boundTo !== player.name) {
      return false;
    }

    const definition = this.getDefinition();
    if (definition.onDrop && typeof definition.onDrop === 'function') {
      return definition.onDrop(player, this, room);
    }

    return true;
  }

  /**
   * Called when item is picked up
   * @param {Object} player - Player picking up the item
   * @returns {boolean} True if pickup succeeded, false to prevent
   */
  onPickup(player) {
    // Handle bind-on-pickup
    if (this.bindOnPickup && !this.boundTo) {
      this.boundTo = player.name;
      this.modifiedAt = Date.now();
      logger.log(`Item ${this.name} bound to ${player.name} on pickup`);
    }

    const definition = this.getDefinition();
    if (definition.onPickup && typeof definition.onPickup === 'function') {
      return definition.onPickup(player, this);
    }

    return true;
  }

  /**
   * Called when item is examined
   * @param {Object} player - Player examining the item
   * @returns {string} Description text to show
   */
  onExamine(player) {
    const definition = this.getDefinition();
    if (definition.onExamine && typeof definition.onExamine === 'function') {
      return definition.onExamine(player, this);
    }

    return this.getDescription(player);
  }

  /**
   * Called when item is identified
   * @param {Object} player - Player identifying the item
   * @returns {boolean} True if identification succeeded
   */
  onIdentify(player) {
    if (this.isIdentified) {
      return false;  // Already identified
    }

    this.isIdentified = true;
    this.modifiedAt = Date.now();

    const definition = this.getDefinition();
    if (definition.onIdentify && typeof definition.onIdentify === 'function') {
      definition.onIdentify(player, this);
    }

    return true;
  }

  /**
   * Called when item is attuned
   * @param {Object} player - Player attuning the item
   * @returns {boolean} True if attunement succeeded
   */
  onAttune(player) {
    if (!this.requiresAttunement) {
      return false;  // Item doesn't require attunement
    }

    if (this.isAttuned && this.attunedTo === player.name) {
      return false;  // Already attuned to this player
    }

    this.isAttuned = true;
    this.attunedTo = player.name;
    this.modifiedAt = Date.now();

    const definition = this.getDefinition();
    if (definition.onAttune && typeof definition.onAttune === 'function') {
      definition.onAttune(player, this);
    }

    return true;
  }

  /**
   * Called when item attunement is broken
   * @param {Object} player - Player breaking attunement
   * @returns {boolean} True if unattunement succeeded
   */
  onUnattune(player) {
    if (!this.isAttuned) {
      return false;
    }

    this.isAttuned = false;
    this.attunedTo = null;
    this.modifiedAt = Date.now();

    const definition = this.getDefinition();
    if (definition.onUnattune && typeof definition.onUnattune === 'function') {
      definition.onUnattune(player, this);
    }

    return true;
  }

  // Utility Methods

  /**
   * Get item description based on identification status
   * @param {Object} player - Player viewing the item
   * @returns {string} Item description
   */
  getDescription(player) {
    let desc = this.customDescription || this.description;

    // Add equipment-specific information
    const equipInfo = [];

    // Slot information
    if (this.slot && this.slot !== 'none') {
      const ItemType = require('./schemas/ItemTypes').ItemType;

      // For weapons, show they can be equipped in either hand
      if (this.itemType === ItemType.WEAPON) {
        equipInfo.push('Slot: main hand or off-hand');
      } else {
        const slotName = this.slot.replace('_', ' ');
        equipInfo.push(`Slot: ${slotName}`);
      }
    }

    // Weapon information
    if (this.weaponProperties) {
      const wp = this.weaponProperties;
      const weaponDetails = [];

      // Damage
      if (wp.damageDice) {
        weaponDetails.push(`Damage: ${wp.damageDice}`);
      }

      // Weapon type and handedness
      const typeInfo = [];
      if (wp.isTwoHanded) {
        typeInfo.push('two-handed');
      } else {
        typeInfo.push('one-handed');
      }
      if (wp.isRanged) {
        typeInfo.push('ranged');
      } else {
        typeInfo.push('melee');
      }
      weaponDetails.push(`Type: ${typeInfo.join(', ')}`);

      // Light weapon (important for dual wield)
      if (wp.isLight) {
        weaponDetails.push('Light weapon (can dual wield)');
      }

      // Proficiency requirement
      if (wp.proficiency && wp.proficiency !== 'simple') {
        weaponDetails.push(`Requires ${wp.proficiency} weapon proficiency`);
      }

      equipInfo.push(...weaponDetails);
    }

    // Armor information
    if (this.armorProperties) {
      const ap = this.armorProperties;
      const armorDetails = [];

      // AC
      if (ap.armorClass !== undefined) {
        armorDetails.push(`Armor Class: ${ap.armorClass}`);
      }

      // Armor type and DEX cap
      if (ap.armorType) {
        let typeText = `Type: ${ap.armorType} armor`;
        const dexCap = config.ARMOR_DEX_CAPS[ap.armorType];
        if (dexCap !== undefined) {
          if (dexCap === 0) {
            typeText += ' (no DEX bonus)';
          } else if (dexCap < 99) {
            typeText += ` (max +${dexCap} DEX)`;
          }
        }
        armorDetails.push(typeText);
      }

      // Proficiency requirement
      if (ap.proficiency && ap.proficiency !== 'light') {
        armorDetails.push(`Requires ${ap.proficiency} armor proficiency`);
      }

      equipInfo.push(...armorDetails);
    }

    // Strength requirement
    if (this.requiresStrength && this.requiresStrength > 0) {
      equipInfo.push(`Requires ${this.requiresStrength} STR`);
    }

    // Attunement requirement
    if (this.requiresAttunement && !this.isAttuned) {
      equipInfo.push('Requires attunement');
    } else if (this.isAttuned && this.attunedTo) {
      equipInfo.push(`Attuned to ${this.attunedTo}`);
    }

    // Add equipment info to description
    if (equipInfo.length > 0) {
      desc += '\n\n' + equipInfo.join('\n');
    }

    // Add durability info if applicable
    if (this.maxDurability && this.durability !== null) {
      const durabilityPercent = (this.durability / this.maxDurability) * 100;
      if (durabilityPercent < 25) {
        desc += '\nThis item is in poor condition and needs repair.';
      } else if (durabilityPercent < 50) {
        desc += '\nThis item shows significant wear.';
      }
    }

    // Hide magical properties if not identified
    if (!this.isIdentified && this.hasHiddenProperties()) {
      desc += '\nThis item has properties that have not been identified.';
    }

    return desc;
  }

  /**
   * Check if item has properties that should be hidden when unidentified
   * @returns {boolean} True if item has hidden properties
   */
  hasHiddenProperties() {
    return this.statModifiers !== null ||
           this.enchantments.length > 0 ||
           (this.weaponProperties && this.weaponProperties.magicalProperties) ||
           this.rarity !== 'common';
  }

  /**
   * Get display name with custom name override
   * @returns {string} Display name
   */
  getDisplayName() {
    return this.customName || this.name;
  }

  /**
   * Check if item can stack with another item
   * @param {BaseItem} otherItem - Other item to check
   * @returns {boolean} True if items can stack
   */
  canStackWith(otherItem) {
    if (!this.isStackable || !otherItem.isStackable) {
      return false;
    }

    // Must be same definition
    if (this.definitionId !== otherItem.definitionId) {
      return false;
    }

    // Cannot stack if either is bound
    if (this.boundTo || otherItem.boundTo) {
      return false;
    }

    // Cannot stack if either is equipped
    if (this.isEquipped || otherItem.isEquipped) {
      return false;
    }

    // Cannot stack if they have different enchantments
    if (this.enchantments.length > 0 || otherItem.enchantments.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Reduce durability (called on death or damage events)
   * @param {number} amount - Amount to reduce
   * @returns {boolean} True if item broke
   */
  reduceDurability(amount) {
    if (this.maxDurability === null || this.durability === null) {
      return false;  // Item has no durability
    }

    this.durability = Math.max(0, this.durability - amount);
    this.modifiedAt = Date.now();

    if (this.durability === 0) {
      logger.log(`Item ${this.name} (${this.instanceId}) broke`);
      return true;
    }

    return false;
  }

  /**
   * Repair item durability
   * @param {number} amount - Amount to repair
   */
  repair(amount) {
    if (this.maxDurability === null || this.durability === null) {
      return;
    }

    this.durability = Math.min(this.maxDurability, this.durability + amount);
    this.modifiedAt = Date.now();
  }

  /**
   * Check if this item is spawnable (can appear in random loot)
   * Respects type-based override rules from config
   * @returns {boolean} True if item can spawn randomly
   */
  isSpawnable() {
    const typeRules = config.lootTables.typeRules;
    const definition = this.getDefinition();

    // Quest items are NEVER spawnable
    if (this.itemType === ItemType.QUEST) {
      if (typeRules.quest && typeRules.quest.neverSpawnable) {
        return false;
      }
    }

    // Artifact rarity items are NEVER spawnable
    if (this.rarity === ItemRarity.ARTIFACT) {
      if (typeRules.artifact && typeRules.artifact.neverSpawnable) {
        return false;
      }
    }

    // Currency is ALWAYS spawnable
    if (this.itemType === ItemType.CURRENCY) {
      if (typeRules.currency && typeRules.currency.alwaysSpawnable) {
        return true;
      }
    }

    // Check explicit spawnable flag (defaults to true if not specified)
    if (definition.spawnable !== undefined) {
      return definition.spawnable;
    }

    // If item has lootTables or spawnTags, it's spawnable by default
    if (definition.lootTables || definition.spawnTags) {
      return true;
    }

    // Default: not spawnable unless explicitly configured
    return false;
  }

  /**
   * Get all spawn tags for this item
   * Includes both explicit spawnTags and auto-generated tags
   * @returns {Array<string>} Array of spawn tags
   */
  getSpawnTags() {
    const tags = [];
    const definition = this.getDefinition();

    // Add explicit spawn tags from definition
    if (definition.spawnTags && Array.isArray(definition.spawnTags)) {
      tags.push(...definition.spawnTags);
    }

    // Add auto-generated tags if enabled
    if (config.spawn && config.spawn.autoTagging && config.spawn.autoTagging.enabled) {
      const autoRules = config.spawn.autoTagging.rules;

      // Auto-tag by item type
      if (autoRules[this.itemType]) {
        tags.push(...autoRules[this.itemType]);
      }

      // Auto-tag by rarity
      if (this.rarity && autoRules[this.rarity]) {
        tags.push(...autoRules[this.rarity]);
      }
    }

    // Return unique tags
    return [...new Set(tags)];
  }

  /**
   * Get the spawn weight for this item (used in weighted random selection)
   * Higher weight = more likely to spawn
   * @returns {number} Spawn weight (0 = never spawns)
   */
  getSpawnWeight() {
    // Non-spawnable items have weight 0
    if (!this.isSpawnable()) {
      return 0;
    }

    const definition = this.getDefinition();

    // Use explicit weight if defined
    if (definition.spawnWeight !== undefined) {
      return Math.max(0, definition.spawnWeight);
    }

    // Use rarity-based weight from config
    if (config.spawn && config.spawn.rarityWeights && this.rarity) {
      return config.spawn.rarityWeights[this.rarity] || 0;
    }

    // Default weight
    return 10;
  }

  /**
   * Get the loot tables this item can spawn in
   * Respects type-based override rules from config
   * @returns {Array<string>} Array of loot table categories, or empty array if not spawnable
   */
  getLootTables() {
    if (!this.isSpawnable()) {
      return [];
    }

    const typeRules = config.lootTables.typeRules;
    const definition = this.getDefinition();

    // Currency gets default tables if not specified
    if (this.itemType === ItemType.CURRENCY) {
      if (typeRules.currency && typeRules.currency.alwaysSpawnable) {
        if (definition.lootTables && definition.lootTables.length > 0) {
          return [...definition.lootTables];
        }
        return [...typeRules.currency.defaultTables];
      }
    }

    // For all other types, return the defined lootTables or empty array
    return definition.lootTables ? [...definition.lootTables] : [];
  }

  /**
   * Check if this item can spawn in a specific loot table category
   * @param {string} tableCategory - Loot table category to check
   * @returns {boolean} True if item can spawn in this table
   */
  isSpawnableIn(tableCategory) {
    if (!tableCategory || typeof tableCategory !== 'string') {
      return false;
    }

    const lootTables = this.getLootTables();
    return lootTables.includes(tableCategory);
  }

  /**
   * Check if this item matches a set of spawn tags
   * Used for filtering items by tags during loot generation
   * @param {Array<string>} filterTags - Tags to match against
   * @param {boolean} requireAll - If true, item must have ALL tags; if false, ANY tag matches
   * @returns {boolean} True if item matches the tag filter
   */
  matchesSpawnTags(filterTags, requireAll = false) {
    if (!filterTags || !Array.isArray(filterTags) || filterTags.length === 0) {
      return true; // No filter = everything matches
    }

    const itemTags = this.getSpawnTags();

    if (requireAll) {
      // Item must have ALL the filter tags
      return filterTags.every(tag => itemTags.includes(tag));
    } else {
      // Item must have AT LEAST ONE of the filter tags
      return filterTags.some(tag => itemTags.includes(tag));
    }
  }

  /**
   * Serialize item to JSON for storage
   * @returns {Object} Serialized item data
   */
  toJSON() {
    return {
      instanceId: this.instanceId,
      definitionId: this.definitionId,
      location: this.location,
      quantity: this.quantity,
      durability: this.durability,
      maxDurability: this.maxDurability,
      isEquipped: this.isEquipped,
      equippedSlot: this.equippedSlot,
      boundTo: this.boundTo,
      isAttuned: this.isAttuned,
      attunedTo: this.attunedTo,
      isIdentified: this.isIdentified,
      enchantments: this.enchantments,
      customName: this.customName,
      customDescription: this.customDescription,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt
    };
  }
}

module.exports = BaseItem;
