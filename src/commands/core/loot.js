/**
 * Loot Command - Quick-loot all items from a container (corpse)
 * This is a convenience wrapper around "get all from <container>"
 */

const colors = require('../../colors');
const ItemRegistry = require('../../items/ItemRegistry');
const ItemFactory = require('../../items/ItemFactory');
const InventoryManager = require('../../systems/inventory/InventoryManager');
const InventorySerializer = require('../../systems/inventory/InventorySerializer');

/**
 * Execute the loot command
 * @param {Object} player - Player executing the command
 * @param {Array} args - Command arguments
 * @param {Object} context - Shared command context
 */
function execute(player, args, context) {
  const { world, playerDB } = context;

  // Ghosts cannot loot
  if (player.isGhost) {
    player.send('\n' + colors.error('You are a ghost and cannot interact with physical objects.\n'));
    return;
  }

  if (args.length === 0) {
    player.send('\n' + colors.error('Loot what? Try "loot <container>"\n'));
    return;
  }

  const room = world.getRoom(player.currentRoom);
  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  // Initialize player inventory if it doesn't exist
  if (!player.inventory) {
    player.inventory = [];
  }

  const containerTarget = args.join(' ').toLowerCase();
  const container = findContainerInRoom(room, containerTarget);

  if (!container) {
    player.send('\n' + colors.error(`You don't see "${args.join(' ')}" here.\n`));
    return;
  }

  // Check player corpse ownership
  if (container.containerType === 'player_corpse') {
    const CorpseManager = require('../../systems/corpses/CorpseManager');
    if (!CorpseManager.canLootPlayerCorpse(container, player)) {
      player.send('\n' + colors.error("This is someone else's corpse. You cannot loot it.\n"));
      return;
    }
  }

  if (!container.inventory || container.inventory.length === 0) {
    // Destroy empty player corpses immediately (they were already looted)
    if (container.containerType === 'player_corpse') {
      const CorpseManager = require('../../systems/corpses/CorpseManager');
      const destroyed = CorpseManager.destroyPlayerCorpse(container.id, world);
      if (destroyed) {
        player.send('\n' + colors.dim(`The ${container.name} crumbles to dust.\n`));
      } else {
        player.send('\n' + colors.info(`The ${container.name} is empty.\n`));
      }
    } else {
      player.send('\n' + colors.info(`The ${container.name} is empty.\n`));
    }
    return;
  }

  // Track what we looted
  let itemsTaken = [];
  let totalItems = 0;
  let failures = [];

  // Take each item from the container (iterate backwards to avoid index issues)
  for (let i = container.inventory.length - 1; i >= 0; i--) {
    const item = container.inventory[i];
    const itemDef = ItemRegistry.getItem(item.definitionId);

    if (!itemDef) {
      failures.push(`broken item (report this bug)`);
      continue;
    }

    // Restore item instance
    const itemInstance = ItemFactory.restoreItem(item, itemDef);
    itemInstance.location = { type: 'inventory', owner: player.username };

    // Call onPickup hook (handles currency conversion, etc.)
    const pickupResult = itemInstance.onPickup(player, room);

    // Handle pickup result
    if (pickupResult === false || (typeof pickupResult === 'object' && !pickupResult.success)) {
      let failName = itemInstance.getDisplayName();
      if (itemInstance.quantity > 1) {
        failName += ` x${itemInstance.quantity}`;
      }
      failures.push(failName);
      continue;
    }

    // Check if item prevented inventory add (currency auto-conversion)
    const preventAddToInventory = (typeof pickupResult === 'object' && pickupResult.preventAddToInventory) || false;

    if (preventAddToInventory) {
      // Item handled its own pickup (e.g., currency to wallet)
      container.inventory.splice(i, 1);

      // Format item name with quantity
      let itemName = itemInstance.getDisplayName();
      if (itemInstance.quantity > 1) {
        itemName += ` x${itemInstance.quantity}`;
      }
      itemsTaken.push(itemName);
      totalItems += itemInstance.quantity || 1;
    } else {
      // Normal item pickup - try to add to inventory
      const addResult = InventoryManager.addItem(player, itemInstance);
      if (addResult.success) {
        // Remove from container
        container.inventory.splice(i, 1);

        // Format item name with quantity
        let itemName = itemInstance.getDisplayName();
        if (itemInstance.quantity > 1) {
          itemName += ` x${itemInstance.quantity}`;
        }
        itemsTaken.push(itemName);
        totalItems += itemInstance.quantity || 1;
      } else {
        // Track failures (usually due to encumbrance)
        let failName = itemInstance.getDisplayName();
        if (itemInstance.quantity > 1) {
          failName += ` x${itemInstance.quantity}`;
        }
        failures.push(failName);
      }
    }
  }

  // Handle currency from player corpses
  let currencyTaken = null;
  if (container.containerType === 'player_corpse' && container.currency) {
    const CurrencyManager = require('../../systems/economy/CurrencyManager');

    // Check if corpse has any currency
    const hasCurrency = !CurrencyManager.isEmpty(container.currency);

    if (hasCurrency) {
      // Transfer currency to player wallet
      const result = CurrencyManager.addToWalletExact(player, container.currency);

      if (result.success) {
        currencyTaken = CurrencyManager.format(container.currency);

        // Clear corpse currency
        container.currency = {
          platinum: 0,
          gold: 0,
          silver: 0,
          copper: 0
        };

        // Save player currency
        playerDB.updatePlayerCurrency(player.username, result.newBalance);
      }
    }
  }

  // Save player inventory if we took anything
  if (itemsTaken.length > 0) {
    const serialized = InventorySerializer.serializeInventory(player);
    playerDB.updatePlayerInventory(player.username, serialized);
  }

  // Build result message
  if (itemsTaken.length === 0 && !currencyTaken) {
    if (failures.length > 0) {
      player.send('\n' + colors.error(`You can't carry anything from the ${container.name}. You're too encumbered!\n`));
    } else {
      player.send('\n' + colors.error(`You couldn't take anything from the ${container.name}.\n`));
    }
    return;
  }

  let message = colors.success(`You loot the ${container.name}:\n`);
  for (const itemName of itemsTaken) {
    message += colors.dim(`  - ${itemName}\n`);
  }

  // Add currency to message if any was taken
  if (currencyTaken) {
    message += colors.dim(`  - ${currencyTaken}\n`);
  }

  if (failures.length > 0) {
    message += colors.warning(`\nToo heavy to take:\n`);
    for (const itemName of failures) {
      message += colors.dim(`  - ${itemName}\n`);
    }
  }

  // Show updated encumbrance
  const stats = InventoryManager.getInventoryStats(player);
  message += '\n' + colors.dim(`Weight: ${stats.weight.current.toFixed(1)}/${stats.weight.max} lbs | Slots: ${stats.slots.current}/${stats.slots.max}`);

  player.send('\n' + message + '\n');

  // Announce to other players
  if (context.allPlayers) {
    const otherPlayers = Array.from(context.allPlayers).filter(p =>
      p.currentRoom === player.currentRoom &&
      p.username !== player.username
    );
    if (otherPlayers.length > 0) {
      const announcement = `${player.username} loots the ${container.name}.`;
      otherPlayers.forEach(p => p.send('\n' + colors.dim(announcement) + '\n'));
    }
  }

  // Check if container is now empty and destroy player corpses immediately
  const CurrencyManager = require('../../systems/economy/CurrencyManager');
  const isCorpseEmpty = container.inventory.length === 0 && CurrencyManager.isEmpty(container.currency);

  if (isCorpseEmpty) {
    if (container.containerType === 'player_corpse') {
      // Destroy empty player corpses immediately - no need to keep them around
      const CorpseManager = require('../../systems/corpses/CorpseManager');
      const destroyed = CorpseManager.destroyPlayerCorpse(container.id, world);
      if (destroyed) {
        player.send(colors.dim(`The ${container.name} crumbles to dust.\n`));
      }
    } else if (container.containerType === 'npc_corpse') {
      player.send(colors.dim(`The ${container.name} is now empty.\n`));
    }
  }
}

/**
 * Find a container (like corpse) in room by keywords
 * @param {Object} room - Room object
 * @param {string} keyword - Keyword to search for
 * @returns {Object|null} Container object or null
 */
function findContainerInRoom(room, keyword) {
  if (!room.items || room.items.length === 0) {
    return null;
  }

  const normalizedKeyword = keyword.toLowerCase();

  for (const item of room.items) {
    // Check if item is a container (has inventory property)
    if (!item.inventory) {
      continue;
    }

    // Check item name
    if (item.name && item.name.toLowerCase().includes(normalizedKeyword)) {
      return item;
    }

    // Check keywords
    if (item.keywords && item.keywords.some(kw => kw.toLowerCase() === normalizedKeyword || kw.toLowerCase().includes(normalizedKeyword))) {
      return item;
    }
  }

  return null;
}

module.exports = {
  name: 'loot',
  aliases: [],
  description: 'Quickly loot all items from a container (corpse)',
  usage: 'loot <container>',
  execute
};
