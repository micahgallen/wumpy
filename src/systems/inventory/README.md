# Inventory System

Phase 2 implementation of the Item System: Inventory & Encumbrance.

## Overview

The inventory system manages player inventories with hybrid encumbrance (slots + weight), intelligent item stacking, death-based durability loss, and full persistence support.

## Architecture

```
src/systems/inventory/
├── InventoryManager.js      - Core inventory operations
├── InventorySerializer.js   - Persistence layer
├── DeathHandler.js          - Death durability system
└── README.md                - This file
```

## Module Exports

All modules export singleton instances for ease of use:

```javascript
const InventoryManager = require('./systems/inventory/InventoryManager');
const InventorySerializer = require('./systems/inventory/InventorySerializer');
const DeathHandler = require('./systems/inventory/DeathHandler');
```

## Quick Reference

### InventoryManager

Core inventory operations with encumbrance and stacking.

```javascript
// Add item (checks encumbrance, auto-stacks if possible)
const result = InventoryManager.addItem(player, itemInstance);
// Returns: {success: boolean, reason?: string, stackedWith?: instanceId}

// Remove item by instance ID
const item = InventoryManager.removeItem(player, instanceId);

// Find item by keyword
const item = InventoryManager.findItemByKeyword(player, 'sword');

// Check if item can be added
const canAdd = InventoryManager.canAddItem(player, itemDefinition, quantity);
// Returns: {canAdd: boolean, reason?: string}

// Get inventory stats
const stats = InventoryManager.getInventoryStats(player);
// Returns: {weight: {current, max, percent}, slots: {current, max, percent}, itemCount}

// Query methods
const weight = InventoryManager.getWeight(player);
const maxWeight = InventoryManager.getMaxWeight(player);
const slots = InventoryManager.getSlots(player);
const maxSlots = InventoryManager.getMaxSlots(player);

// Stacking operations
const stackResult = InventoryManager.stackItem(player, itemInstance);
const splitResult = InventoryManager.splitStack(player, instanceId, quantity);

// Get items
const equipped = InventoryManager.getEquippedItems(player);
const unequipped = InventoryManager.getUnequippedItems(player);
const weapons = InventoryManager.getItemsByType(player, ItemType.WEAPON);

// Sort inventory
const sorted = InventoryManager.sortInventory(player, 'name'); // 'name', 'weight', 'value', 'type', 'rarity'
```

### InventorySerializer

Handles saving/loading inventories to JSON.

```javascript
// Serialize inventory for storage
const serialized = InventorySerializer.serializeInventory(player);

// Deserialize inventory from storage
player.inventory = InventorySerializer.deserializeInventory(player, serializedData);

// Validate inventory data
const validation = InventorySerializer.validateInventoryData(inventoryData);
// Returns: {valid: boolean, errors: Array<string>}

// Clean invalid entries
const cleaned = InventorySerializer.cleanInventoryData(inventoryData);

// Create backup
const backup = InventorySerializer.createBackup(inventoryData);

// Restore from backup
const restored = InventorySerializer.restoreFromBackup(backupJson);
```

### DeathHandler

Manages durability loss on death and repairs.

```javascript
// Handle player death (apply durability loss to equipped items)
const result = DeathHandler.handlePlayerDeath(player);
// Returns: {success, affectedItems, brokenItems, messages, items}

// Get broken items
const brokenItems = DeathHandler.getBrokenItems(player);

// Get items needing repair (below threshold %)
const needsRepair = DeathHandler.getItemsNeedingRepair(player, 50);

// Calculate repair cost
const cost = DeathHandler.getRepairCost(item, amount);

// Repair item
const result = DeathHandler.repairItem(player, item, amount);
// Returns: {success, repairedAmount, newDurability, cost}

// Get total repair cost for all items
const totalCost = DeathHandler.getTotalRepairCost(player);
// Returns: {totalCost, itemCount, brokenCount, items}
```

## Encumbrance System

Players have two inventory limits, both must be respected:

### Slot Limit
- Formula: `baseSlots + (STR modifier × slotsPerStrength)`
- Default: 20 base slots + 2 per STR modifier point
- Each item/stack occupies 1 slot
- Stackable items don't use additional slots

### Weight Limit
- Formula: `baseWeight + (STR × weightPerStrength)`
- Default: 150 lbs base + 15 lbs per STR point
- Weight = Σ(item.weight × item.quantity)

**Both limits are checked when adding items. If either is exceeded, the item cannot be added.**

## Stacking Rules

Items stack automatically when added if all conditions are met:

1. Both items have `isStackable: true`
2. Same `definitionId` (same item type)
3. Neither item is bound
4. Neither item is equipped
5. No enchantments on either item
6. Stack is not at maximum capacity

### Stack Sizes
- Equipment: NEVER stacks (1 item = 1 instance)
- Consumables: 99 max
- Currency: 9999 max
- Materials: 999 max
- Default: 99 max

## Death Durability

When a player dies:

1. Each **equipped** item loses 10% of its max durability (rounded up)
2. Items at 0 durability are flagged as broken
3. Unequipped items are not affected

### Repair System

Broken or damaged items can be repaired:

- **Cost Formula:** `itemValue × (durabilityLost / maxDurability) × 0.2`
- **Example:** 100g sword, 50 durability lost = 100 × 0.5 × 0.2 = 10g

## Persistence

### Serialized Format

Items are serialized to JSON for storage in players.json:

```json
{
  "instanceId": "uuid",
  "definitionId": "item_id",
  "quantity": 1,
  "durability": 100,
  "maxDurability": 100,
  "isEquipped": false,
  "equippedSlot": null,
  "boundTo": null,
  "isAttuned": false,
  "attunedTo": null,
  "isIdentified": false,
  "enchantments": [],
  "customName": null,
  "customDescription": null,
  "createdAt": 1234567890,
  "modifiedAt": 1234567890
}
```

### PlayerDB Integration

The PlayerDB has been updated to use InventorySerializer:

```javascript
// Save player inventory
playerDB.savePlayerInventory(player);

// Load automatically deserializes on player login
const player = playerDB.authenticate(username, password);
// player.inventory is now array of item instances
```

## Configuration

All tunables are in `/src/config/itemsConfig.js`:

```javascript
module.exports = {
  encumbrance: {
    baseSlots: 20,
    slotsPerStrength: 2,
    weightPerStrength: 15,
    baseWeight: 150
  },

  stacking: {
    defaultStackSize: 99,
    currencyStackSize: 9999,
    consumableStackSize: 99,
    materialStackSize: 999
  },

  durability: {
    lossOnDeath: 10,              // Percentage
    repairCostMultiplier: 0.2,
    minDurability: 0,
    brokenItemPenalty: 0.5
  }
};
```

## Examples

### Adding an item with encumbrance check

```javascript
const sword = ItemFactory.createItem(ItemRegistry.getItem('iron_sword'));

const result = InventoryManager.addItem(player, sword);

if (result.success) {
  player.sendMessage('You receive an iron sword.');
} else {
  player.sendMessage(`Cannot add item: ${result.reason}`);
}
```

### Checking inventory capacity

```javascript
const stats = InventoryManager.getInventoryStats(player);

player.sendMessage(`Inventory: ${stats.slots.current}/${stats.slots.max} slots`);
player.sendMessage(`Weight: ${stats.weight.current.toFixed(1)}/${stats.weight.max} lbs`);

if (stats.weight.percent > 80) {
  player.sendMessage('You are heavily encumbered!');
}
```

### Handling player death

```javascript
// In combat system when player dies
const deathResult = DeathHandler.handlePlayerDeath(player);

for (const message of deathResult.messages) {
  player.sendMessage(message);
}

if (deathResult.brokenItems > 0) {
  player.sendMessage('Some of your equipment has broken and needs repair!');
}

// Save the updated inventory
playerDB.savePlayerInventory(player);
```

### Finding and using items

```javascript
// Find a potion
const potion = InventoryManager.findItemByKeyword(player, 'potion');

if (!potion) {
  player.sendMessage('You have no potions.');
  return;
}

// Use the potion (handled by item's onUse hook)
const success = potion.onUse(player);

if (success) {
  // Remove or reduce quantity
  if (potion.quantity > 1) {
    potion.quantity--;
  } else {
    InventoryManager.removeItem(player, potion.instanceId);
  }

  playerDB.savePlayerInventory(player);
}
```

### Stacking items

```javascript
// Create 10 potions
const potion1 = ItemFactory.createItem(ItemRegistry.getItem('health_potion'));
potion1.quantity = 10;

// Add to inventory
InventoryManager.addItem(player, potion1);

// Later, add 5 more - they will auto-stack
const potion2 = ItemFactory.createItem(ItemRegistry.getItem('health_potion'));
potion2.quantity = 5;

const result = InventoryManager.addItem(player, potion2);
if (result.stackedWith) {
  player.sendMessage('Potions stacked together.');
  // player.inventory now has 1 stack of 15 potions
}
```

## Testing

Comprehensive tests are in `/tests/inventoryTests.js`:

```bash
node tests/inventoryTests.js
```

**Current Status:** 23/23 tests passing (100%)

## Future Enhancements

- Container support (bags, chests with nested inventories)
- Weight reduction effects (bags of holding)
- Inventory UI commands
- Auto-stacking on login
- Bulk operations (drop all, repair all)
- Item filtering and advanced search

## Phase Integration

- **Phase 1 (Complete):** Item definitions, BaseItem, ItemFactory
- **Phase 2 (Current):** Inventory management ✓
- **Phase 3 (Next):** Equipment system
- **Phase 4 (Future):** Combat integration
- **Phase 5 (Future):** Economy and loot

## Documentation

- Full implementation report: `/docs/systems/inventory/PHASE2_IMPLEMENTATION_REPORT.md`
- Design document: `/docs/plans-roadmaps/items/ITEM_COMBAT_FINAL_IMPLEMENTATION_PLAN.md`
- Item system design: `/docs/systems/items/ITEM_SYSTEM_DESIGN.md`
