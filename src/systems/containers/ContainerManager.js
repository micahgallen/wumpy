/**
 * Container Manager
 *
 * Manages containers (chests, barrels, crates, etc.) that can store items.
 * Containers have their own inventory separate from player inventory.
 *
 * Container Schema:
 * {
 *   id: string,
 *   name: string,
 *   description: string,
 *   keywords: Array<string>,
 *   containerType: string,
 *   capacity: number,              // Number of slots
 *   inventory: Array<BaseItem>,    // Items in container
 *   isLocked: boolean,
 *   lockDifficulty: number,
 *   keyItemId: string,             // Item ID that unlocks this container
 *   isOpen: boolean
 * }
 */

const logger = require('../../logger');
const config = require('../../config/itemsConfig');

class ContainerManager {
  constructor() {
    this.containers = new Map();
  }

  /**
   * Create a new container
   * @param {Object} definition - Container definition
   * @returns {Object} Container object
   */
  createContainer(definition) {
    const container = {
      id: definition.id || `container_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: definition.name || 'a container',
      description: definition.description || 'A container that can hold items.',
      keywords: definition.keywords || ['container'],
      containerType: definition.containerType || 'chest',
      capacity: definition.capacity || this.getDefaultCapacity(definition.containerType),
      inventory: definition.inventory || [],
      isLocked: definition.isLocked || false,
      lockDifficulty: definition.lockDifficulty || 10,
      keyItemId: definition.keyItemId || null,
      isOpen: definition.isOpen || false,
      location: definition.location || { type: 'void' }
    };

    this.containers.set(container.id, container);
    logger.log(`Created container: ${container.name} (${container.id})`);

    return container;
  }

  /**
   * Get default capacity for container type
   * @param {string} containerType - Container type
   * @returns {number} Default capacity
   */
  getDefaultCapacity(containerType) {
    const capacityByType = config.containers?.capacityByType;
    if (!capacityByType) {
      return config.containers?.defaultCapacity || 20;
    }

    return capacityByType[containerType] || config.containers.defaultCapacity || 20;
  }

  /**
   * Get a container by ID
   * @param {string} containerId - Container ID
   * @returns {Object|null} Container object or null
   */
  getContainer(containerId) {
    return this.containers.get(containerId) || null;
  }

  /**
   * Open a container
   * @param {Object} player - Player object
   * @param {Object} container - Container object
   * @returns {Object} {success: boolean, message: string}
   */
  openContainer(player, container) {
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    if (container.isOpen) {
      return { success: false, message: `${container.name} is already open.` };
    }

    if (container.isLocked) {
      return {
        success: false,
        message: `${container.name} is locked. You need a key to open it.`
      };
    }

    container.isOpen = true;
    logger.log(`Player ${player.username} opened ${container.name}`);

    return {
      success: true,
      message: `You open ${container.name}.`
    };
  }

  /**
   * Close a container
   * @param {Object} player - Player object
   * @param {Object} container - Container object
   * @returns {Object} {success: boolean, message: string}
   */
  closeContainer(player, container) {
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    if (!container.isOpen) {
      return { success: false, message: `${container.name} is already closed.` };
    }

    container.isOpen = false;
    logger.log(`Player ${player.username} closed ${container.name}`);

    return {
      success: true,
      message: `You close ${container.name}.`
    };
  }

  /**
   * Unlock a container with a key
   * @param {Object} player - Player object
   * @param {Object} container - Container object
   * @param {Object} keyItem - Key item instance
   * @returns {Object} {success: boolean, message: string}
   */
  unlockContainer(player, container, keyItem) {
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    if (!container.isLocked) {
      return { success: false, message: `${container.name} is not locked.` };
    }

    // Check if key matches
    if (container.keyItemId && keyItem.definitionId !== container.keyItemId) {
      return { success: false, message: `That key doesn't fit ${container.name}.` };
    }

    container.isLocked = false;
    logger.log(`Player ${player.username} unlocked ${container.name} with ${keyItem.name}`);

    return {
      success: true,
      message: `You unlock ${container.name} with ${keyItem.name}.`
    };
  }

  /**
   * Lock a container with a key
   * @param {Object} player - Player object
   * @param {Object} container - Container object
   * @param {Object} keyItem - Key item instance
   * @returns {Object} {success: boolean, message: string}
   */
  lockContainer(player, container, keyItem) {
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    if (container.isLocked) {
      return { success: false, message: `${container.name} is already locked.` };
    }

    // Check if key matches
    if (container.keyItemId && keyItem.definitionId !== container.keyItemId) {
      return { success: false, message: `That key doesn't fit ${container.name}.` };
    }

    container.isLocked = true;
    container.isOpen = false; // Locking also closes
    logger.log(`Player ${player.username} locked ${container.name} with ${keyItem.name}`);

    return {
      success: true,
      message: `You lock ${container.name} with ${keyItem.name}.`
    };
  }

  /**
   * Take an item from a container
   * @param {Object} player - Player object
   * @param {Object} container - Container object
   * @param {string} itemKeyword - Item keyword
   * @param {number} [quantity=1] - Quantity to take
   * @returns {Object} {success: boolean, message: string, item?: BaseItem}
   */
  takeFromContainer(player, container, itemKeyword, quantity = 1) {
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    if (!container.isOpen) {
      return { success: false, message: `You must open ${container.name} first.` };
    }

    // Find item in container
    const normalizedKeyword = itemKeyword.toLowerCase();
    const item = container.inventory.find(item => {
      const itemName = item.name.toLowerCase();
      const keywords = item.keywords.map(kw => kw.toLowerCase());
      return itemName.includes(normalizedKeyword) || keywords.includes(normalizedKeyword);
    });

    if (!item) {
      return { success: false, message: `${container.name} doesn't contain that item.` };
    }

    // Check if player can carry it
    const InventoryManager = require('../inventory/InventoryManager');
    const canAdd = InventoryManager.canAddItem(player, item, quantity);
    if (!canAdd.canAdd) {
      return {
        success: false,
        message: `You can't carry that. ${canAdd.reason}`
      };
    }

    // Handle stacks
    let takenItem;
    if (item.isStackable && item.quantity > quantity) {
      // Split stack
      const ItemFactory = require('../../items/ItemFactory');
      takenItem = ItemFactory.cloneItem(item, { quantity: quantity });
      item.quantity -= quantity;
      item.modifiedAt = Date.now();
    } else {
      // Take entire item
      const index = container.inventory.indexOf(item);
      container.inventory.splice(index, 1);
      takenItem = item;
    }

    // Add to player inventory
    const addResult = InventoryManager.addItem(player, takenItem);
    if (!addResult.success) {
      // Put item back
      if (takenItem !== item) {
        item.quantity += quantity;
      } else {
        container.inventory.push(item);
      }
      return { success: false, message: addResult.reason };
    }

    logger.log(`Player ${player.username} took ${quantity}x ${item.name} from ${container.name}`);

    return {
      success: true,
      message: `You take ${quantity > 1 ? quantity + 'x ' : ''}${item.name} from ${container.name}.`,
      item: takenItem
    };
  }

  /**
   * Put an item into a container
   * @param {Object} player - Player object
   * @param {Object} container - Container object
   * @param {string} itemKeyword - Item keyword
   * @param {number} [quantity=1] - Quantity to put
   * @returns {Object} {success: boolean, message: string}
   */
  putInContainer(player, container, itemKeyword, quantity = 1) {
    if (!container) {
      return { success: false, message: 'Container not found.' };
    }

    if (!container.isOpen) {
      return { success: false, message: `You must open ${container.name} first.` };
    }

    // Find item in player inventory
    const InventoryManager = require('../inventory/InventoryManager');
    const item = InventoryManager.findItemByKeyword(player, itemKeyword);
    if (!item) {
      return { success: false, message: `You don't have that item.` };
    }

    if (item.isEquipped) {
      return { success: false, message: `You must unequip ${item.name} first.` };
    }

    // Check container capacity
    const currentSlots = container.inventory.length;
    if (currentSlots >= container.capacity) {
      return { success: false, message: `${container.name} is full.` };
    }

    // Handle stacks
    let putItem;
    if (item.isStackable && item.quantity > quantity) {
      // Split stack
      const ItemFactory = require('../../items/ItemFactory');
      putItem = ItemFactory.cloneItem(item, { quantity: quantity });
      item.quantity -= quantity;
      item.modifiedAt = Date.now();
    } else {
      // Put entire item
      InventoryManager.removeItem(player, item.instanceId);
      putItem = item;
    }

    // Try to stack with existing items in container
    const existingStack = container.inventory.find(containerItem => {
      return containerItem.canStackWith && containerItem.canStackWith(putItem);
    });

    if (existingStack) {
      // Stack with existing
      const InventoryManager = require('../inventory/InventoryManager');
      const maxStack = InventoryManager.getMaxStackSize(putItem);
      const availableSpace = maxStack - existingStack.quantity;

      if (availableSpace >= putItem.quantity) {
        existingStack.quantity += putItem.quantity;
        existingStack.modifiedAt = Date.now();
      } else {
        // Partial stack
        existingStack.quantity = maxStack;
        putItem.quantity -= availableSpace;
        container.inventory.push(putItem);
      }
    } else {
      // Add as new item
      container.inventory.push(putItem);
    }

    logger.log(`Player ${player.username} put ${quantity}x ${putItem.name} in ${container.name}`);

    return {
      success: true,
      message: `You put ${quantity > 1 ? quantity + 'x ' : ''}${putItem.name} in ${container.name}.`
    };
  }

  /**
   * Get container contents as formatted string
   * @param {Object} container - Container object
   * @returns {string} Formatted contents
   */
  getContentsDisplay(container) {
    if (!container) {
      return 'Container not found.';
    }

    if (!container.isOpen) {
      return `${container.name} is closed.`;
    }

    if (container.inventory.length === 0) {
      return `${container.name} is empty.`;
    }

    const lines = [`${container.name} contains:`];

    for (const item of container.inventory) {
      const quantity = item.isStackable && item.quantity > 1 ? `${item.quantity}x ` : '';
      lines.push(`  ${quantity}${item.name}`);
    }

    return lines.join('\n');
  }

  /**
   * Delete a container
   * @param {string} containerId - Container ID
   * @returns {boolean} True if deleted
   */
  deleteContainer(containerId) {
    return this.containers.delete(containerId);
  }
}

// Export singleton instance
module.exports = new ContainerManager();
