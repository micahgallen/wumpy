# Shop Persistence System - Developer Guide

## Overview

The shop persistence system automatically saves and loads shop inventory state to disk, ensuring that player transactions persist across server restarts.

## Key Features

- **Async File I/O**: Non-blocking operations for better performance
- **Atomic Writes**: Uses temporary files to prevent corruption
- **Data Validation**: Filters invalid entries on load
- **Race Condition Prevention**: Ensures inventory quantities never go negative
- **Graceful Shutdown**: Automatically saves state on server stop

## Usage

### Registering a Shop

```javascript
const ShopManager = require('./src/systems/economy/ShopManager');

ShopManager.registerShop({
  id: 'unique_shop_id',
  name: 'Shop Name',
  description: 'Shop description',
  inventory: [
    { itemId: 'item_id', quantity: 10, price: 100 }
  ],
  unlimited: false,  // true = infinite stock
  buyback: 0.5,      // 50% of value when selling
  markup: 1.0,       // 100% of base value when buying
  services: {
    identify: true,
    repair: true
  }
});
```

### Buying Items (Async)

```javascript
// In a command handler
async function execute(player, args, context) {
  const result = await ShopManager.buyItem(
    player,
    'shop_id',
    'item_keyword',
    quantity
  );

  if (result.success) {
    player.send(result.message);
    // result.items contains the purchased items
  } else {
    player.send(result.message);
  }
}
```

### Selling Items (Async)

```javascript
async function execute(player, args, context) {
  const result = await ShopManager.sellItem(
    player,
    'shop_id',
    'item_keyword',
    quantity
  );

  if (result.success) {
    player.send(result.message);
    // result.payment contains copper earned
  } else {
    player.send(result.message);
  }
}
```

### Manual Save/Load

```javascript
// Save a specific shop
await ShopManager.saveShopInventory('shop_id');

// Load a specific shop
await ShopManager.loadShopInventory('shop_id');

// Save all shops
const result = await ShopManager.saveAllShops();
console.log(`Saved ${result.successCount} shops`);

// Load all shops
const result = await ShopManager.loadAllShops();
console.log(`Loaded ${result.successCount} shops`);
```

## Data Storage

### Location
Shop inventory files are stored in:
```
/home/micah/wumpy/data/shops/{shop_id}.json
```

### File Format
```json
{
  "id": "shop_id",
  "inventory": [
    {
      "itemId": "item_id",
      "quantity": 10,
      "price": 100
    }
  ],
  "lastSaved": 1234567890
}
```

### Git Ignore
Shop data files are excluded from version control via `.gitignore`:
```
data/shops/*.json
```

## Automatic Saving

Shop inventory is automatically saved in the following scenarios:

1. **After Buy Transaction**: `buyItem()` automatically saves
2. **After Sell Transaction**: `sellItem()` automatically saves
3. **Server Shutdown**: SIGTERM and SIGINT handlers save all shops

## Error Handling

### Invalid Data on Load
- Invalid entries are filtered out with warnings
- Shop falls back to definition inventory if data is corrupted
- Missing itemIds (not in registry) are removed

### Race Conditions
- Concurrent buy transactions are validated before inventory update
- Failed transactions are rolled back (items removed, currency refunded)

### Save Failures
- Logged but don't crash the server
- Atomic writes prevent partial file corruption

## Performance Considerations

### Async Operations
All file I/O is async to prevent event loop blocking:
- Average save time: 5-10ms (non-blocking)
- Multiple shops can save concurrently
- No impact on game server responsiveness

### Optimization Tips
1. Don't call `saveShopInventory()` manually (it's automatic)
2. Use `unlimited: true` for shops that don't need inventory tracking
3. Avoid excessive shop registrations (keep under 100 shops)

## Testing

### Unit Tests
Economy tests verify:
- Shop registration
- Buy/sell transactions
- Insufficient funds handling
- Currency calculations

### Running Tests
```bash
npm test
```

### Manual Testing
```bash
# Start server
node src/server.js

# Connect via telnet
telnet localhost 4000

# Test commands
list          # View shop inventory
buy dagger    # Purchase an item
sell dagger   # Sell an item
```

## Common Issues

### Shop Not Found
**Symptom**: "There is no shop here"
**Solution**: Ensure room has `shop: 'shop_id'` property

### Item Not in Shop
**Symptom**: "Shop doesn't sell that item"
**Solution**: Check shop inventory has the itemId registered

### Async Not Awaited
**Symptom**: Commands return undefined
**Solution**: Ensure command handler is async and uses await:
```javascript
async function execute(player, args, context) {
  const result = await ShopManager.buyItem(...);
}
```

### Data Not Persisting
**Symptom**: Inventory resets after restart
**Solution**: Check logs for save errors, verify directory permissions

## Migration Notes

### From Synchronous to Async
All ShopManager methods are now async. Update your code:

**Before**:
```javascript
const result = ShopManager.buyItem(player, shopId, item, qty);
```

**After**:
```javascript
const result = await ShopManager.buyItem(player, shopId, item, qty);
```

### Backward Compatibility
- Old shop data files load without modification
- Sync commands still work (command parser handles both)
- No breaking changes to shop definitions

## Best Practices

1. **Always await async methods**
   ```javascript
   await ShopManager.buyItem(...);
   ```

2. **Don't save manually** (it's automatic)
   ```javascript
   // DON'T DO THIS
   await ShopManager.buyItem(...);
   await ShopManager.saveShopInventory(shopId); // Redundant!
   ```

3. **Validate shop exists**
   ```javascript
   const shop = ShopManager.getShop(shopId);
   if (!shop) {
     return { success: false, message: 'Shop not found' };
   }
   ```

4. **Use proper error handling**
   ```javascript
   try {
     const result = await ShopManager.buyItem(...);
   } catch (err) {
     logger.error('Shop error:', err);
     player.send('Transaction failed');
   }
   ```

## API Reference

### ShopManager Methods

| Method | Async | Description |
|--------|-------|-------------|
| `registerShop(def)` | No | Register a new shop |
| `getShop(shopId)` | No | Get shop by ID |
| `getShopInventory(shopId)` | No | Get shop inventory with prices |
| `buyItem(player, shopId, keyword, qty)` | **Yes** | Purchase from shop |
| `sellItem(player, shopId, keyword, qty)` | **Yes** | Sell to shop |
| `valueItem(player, shopId, keyword)` | No | Get sell value |
| `identifyItem(player, shopId, keyword)` | No | Identify item service |
| `repairItem(player, shopId, keyword)` | No | Repair item service |
| `saveShopInventory(shopId)` | **Yes** | Save shop to disk |
| `loadShopInventory(shopId)` | **Yes** | Load shop from disk |
| `saveAllShops()` | **Yes** | Save all shops |
| `loadAllShops()` | **Yes** | Load all shops |
| `getAllShops()` | No | Get all registered shops |

### Return Formats

**Transaction Results**:
```javascript
{
  success: boolean,
  message: string,
  items?: Array<BaseItem>,    // For buy
  payment?: number            // For sell
}
```

**Save/Load Results**:
```javascript
{
  successCount: number,
  errorCount: number
}
```

## Further Reading

- [Economy System Documentation](./ECONOMY_SYSTEM.md)
- [Currency Manager Guide](./CURRENCY_MANAGER.md)
- [Item System Documentation](../items/ITEM_SYSTEM.md)
- [Shop Persistence Fixes Report](../../reports/SHOP_PERSISTENCE_CRITICAL_FIXES_COMPLETE.md)
