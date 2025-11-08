# Hooper's Store - Quick Start Guide

## For Players

### Basic Commands

```
list              - View shop inventory and prices
buy <item>        - Purchase an item
sell <item>       - Sell an item to the shop
value <item>      - Check what the shop will pay for an item
identify <item>   - Identify a magical item (costs money)
repair <item>     - Repair a damaged item (costs money)
money             - Check your currency balance
```

### Getting Started

1. **Navigate to the shop:**
   From Sesame Street main area, go to Hooper's General Store

2. **Check your money:**
   ```
   money
   ```

3. **Browse the shop:**
   ```
   list
   ```

4. **Buy something cheap:**
   ```
   buy cookie
   ```

5. **Sell something:**
   ```
   sell cookie
   ```

### Starter Items for Testing

If you need money to test:
- Ask an admin to use: `@givecurrency <yourname> 500c`
- Or spawn some items to sell

### Price Reference (Quick)

**Cheap Items (10-30c):**
- Birdseed: 10c
- Sardine Can: 12c
- Milk: 15c
- Sugar Cookie: 20c
- Chocolate Chip Cookie: 25c
- Oatmeal Cookie: 30c

**Mid-range (50-100c):**
- Health Potion: 50c
- Wooden Practice Sword: 50c
- Leather Cap: 100c (1 silver)

**Expensive (500c+):**
- Mysterious Amulet: 500c (5 silver) - needs identification

---

## For Developers

### File Structure

```
world/sesame_street/
├── shops/
│   ├── hoopersStore.js          # Shop definition
│   ├── loadShops.js             # Shop loader
│   ├── README.md                # Full testing guide
│   └── QUICK_START.md           # This file
├── items/
│   ├── consumables/             # 7 consumable items (updated with prices)
│   ├── equipment/               # 3 equipment items (NEW)
│   └── special/                 # 1 starter kit (NEW)
└── rooms/
    └── general_store.js         # Room with shop reference
```

### New Items Created

**Consumables:**
- `health_potion` - 50c, heals 25 HP

**Equipment:**
- `wooden_practice_sword` - 50c, 1d4 damage, has durability
- `leather_cap` - 100c, +1 AC, light armor
- `mysterious_amulet` - 500c, requires identification, +2 WIS +1 INT

**Special:**
- `starter_kit` - Contains starting items and 100 copper

### Price Updates

All existing Sesame Street consumables updated:
- `chocolate_chip_cookie`: 2c → 25c
- `sugar_cookie`: 2c → 20c
- `oatmeal_cookie`: 3c → 30c
- `milk_bottle`: 2c → 15c
- `birdseed`: 1c → 10c
- `sardine_can`: 1c → 12c

### Integration Points

**Server Load Sequence:**
1. Items load (core + sesame_street)
2. Shops load (sesame_street shops)
3. World initializes
4. Rooms reference shops

**Shop Commands:**
Located in `/src/commands/economy/`
- `list.js`
- `buy.js`
- `sell.js`
- `value.js`
- `identify.js` (if exists)
- `repair.js` (if exists)

**Room Integration:**
`general_store.js` now has:
```json
"shop": "hoopers_store"
```

### Testing Checklist

- [ ] Server starts without errors
- [ ] Shop loads successfully
- [ ] All 10 items appear in `list`
- [ ] Can buy items with sufficient funds
- [ ] Can't buy with insufficient funds
- [ ] Can't buy out-of-stock items
- [ ] Can sell items for 50% value
- [ ] Currency displays properly
- [ ] Shop stock decrements
- [ ] Identify service works
- [ ] Repair service works

### Admin Commands for Testing

```
@givecurrency <player> 1000c     - Give test currency
@spawn wooden_practice_sword     - Spawn item to test selling
@damage wooden_practice_sword 50 - Damage item to test repair
```

### Quick Test

```javascript
// In MUD as a player with 1000c:
list
buy cookie
buy health potion
buy wooden practice sword
value cookie
sell cookie
money
buy mysterious amulet
identify amulet
// (damage sword somehow)
repair sword
```

### Configuration

**Shop Config (`hoopersStore.js`):**
- Stock: Limited (not unlimited)
- Buyback: 50%
- Markup: 1.0x (no markup)
- Services: Identify (yes), Repair (yes)

**To Adjust:**
- Change prices: Edit item `value` field
- Change stock: Edit shop `inventory[].quantity`
- Change buyback rate: Edit shop `buyback` (0.5 = 50%)
- Add items: Add to shop `inventory` array

### Common Issues

**Shop not found:**
- Check `loadShops.js` is called in `server.js`
- Verify shop ID matches room reference

**Items not appearing:**
- Ensure items are registered before shops load
- Check item IDs match exactly

**Commands not working:**
- Verify player is in shop room
- Check economy commands are loaded
- Ensure ShopManager is initialized

---

## Architecture Notes

### Shop System Flow

1. **Room** has `shop` property with shop ID
2. **ShopManager** stores shop definitions
3. **Commands** query ShopManager for shop in current room
4. **Transactions** update player currency and inventory
5. **Stock** tracked per shop (if not unlimited)

### Currency Flow

```
Player Wallet (player.currency)
    ↓
CurrencyManager (conversion/formatting)
    ↓
ShopManager (buy/sell/services)
    ↓
InventoryManager (item add/remove)
```

### Item Pricing

```
Base Value (item.value in copper)
    ↓
Rarity Multiplier (applied if needed)
    ↓
Condition Modifier (durability affects value)
    ↓
Shop Markup (default 1.0x)
    ↓
Final Price
```

### Buyback Calculation

```
Item Value: 100c
Shop Buyback: 50% (0.5)
Player Receives: 50c
```

---

## Next Steps

### Future Enhancements

1. **More Shops:**
   - Weapon shop in arena area
   - Potion shop near hotel
   - Specialized vendors

2. **Advanced Features:**
   - Shop stock replenishment (daily reset)
   - Dynamic pricing (supply/demand)
   - Haggling system
   - Bulk discounts
   - Player reputation affects prices

3. **Quest Integration:**
   - Special items unlock after quests
   - Quest rewards give shop discounts
   - Shopkeeper quests

4. **Container Loot:**
   - Chests in rooms with currency
   - Boss loot containers
   - Hidden treasure

### Immediate Testing Priorities

1. All basic transactions (buy/sell/value)
2. All services (identify/repair)
3. Edge cases (no money, no stock, invalid items)
4. Multiple players simultaneously
5. Currency conversion accuracy
6. Stock management
7. Integration with combat (durability loss)

---

**Created:** Phase 5 Implementation
**Last Updated:** Session End
**Status:** Ready for Testing
