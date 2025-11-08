# Inventory Persistence - Manual Testing Guide

## Quick Test: Verify Shop Persistence Works

### Setup
1. Start the server: `node src/server.js`
2. Connect via telnet: `telnet localhost 4000`
3. Login or create a character

### Test 1: Shop Stock Depletion Persists

**What to test:** Shop stock decreases when you buy items and stays decreased after restart.

**Steps:**
1. Go to the shop:
   ```
   go general store
   ```

2. Check initial stock:
   ```
   list
   ```
   Note: Leather Cap should show quantity 8

3. Buy a leather cap:
   ```
   buy leather cap
   ```

4. Check stock again:
   ```
   list
   ```
   Note: Leather Cap should now show quantity 7

5. **IMPORTANT:** Stop and restart the server
   - Press Ctrl+C in the server terminal
   - Restart: `node src/server.js`

6. Reconnect and go back to the shop:
   ```
   telnet localhost 4000
   [login]
   go general store
   list
   ```

7. **VERIFY:** Leather Cap should still show quantity 7 (NOT reset to 8)
   - ✓ PASS if quantity is 7
   - ✗ FAIL if quantity reset to 8

---

### Test 2: Player-Sold Items Persist in Shop

**What to test:** Items you sell to the shop stay there after restart.

**Steps:**
1. Make sure you have an item to sell (if not, spawn one as admin):
   ```
   inventory
   ```

2. Sell an item to the shop:
   ```
   sell [item name]
   ```

3. Check that the shop now has your item:
   ```
   list
   ```
   Your sold item should appear in the shop listing

4. **IMPORTANT:** Stop and restart the server
   - Press Ctrl+C in the server terminal
   - Restart: `node src/server.js`

5. Reconnect and check the shop:
   ```
   telnet localhost 4000
   [login]
   go general store
   list
   ```

6. **VERIFY:** Your sold item should still be in the shop
   - ✓ PASS if your item is listed
   - ✗ FAIL if your item disappeared

---

### Test 3: Player Inventory Persists

**What to test:** Items you buy stay in your inventory after logout/login.

**Steps:**
1. Check your inventory:
   ```
   inventory
   ```
   Note what you have

2. Buy something from the shop:
   ```
   buy chocolate chip cookie
   ```

3. Check inventory:
   ```
   inventory
   ```
   Cookie should be there

4. Logout (don't restart server):
   ```
   quit
   ```

5. Login again:
   ```
   telnet localhost 4000
   [login with same character]
   inventory
   ```

6. **VERIFY:** Cookie should still be in your inventory
   - ✓ PASS if item is there
   - ✗ FAIL if inventory was cleared

---

### Test 4: Currency Persists

**What to test:** Your money is saved after transactions.

**Steps:**
1. Check your money:
   ```
   money
   ```
   Note the amount (should start with 1 silver, 0 copper = 100 copper)

2. Buy something:
   ```
   buy milk bottle
   ```
   (costs 15 copper)

3. Check money again:
   ```
   money
   ```
   Should show 0 silver, 85 copper (or equivalent)

4. Logout and login:
   ```
   quit
   [reconnect]
   [login]
   money
   ```

5. **VERIFY:** Money should be 85 copper, not reset to 100
   - ✓ PASS if currency persisted
   - ✗ FAIL if currency reset

---

## Where is Data Stored?

### Player Data
**File:** `/home/micah/wumpy/players.json`

Contains:
- Player inventory (serialized items)
- Currency wallet
- HP, XP, level
- Equipped items
- Character stats

### Shop Data
**Directory:** `/home/micah/wumpy/data/shops/`

Files:
- `hoopers_store.json` - Hooper's General Store inventory

Each file contains:
- Current shop inventory with quantities
- Items sold by players
- Last save timestamp

---

## Inspecting Saved Data

### View Player Data
```bash
cat players.json | grep -A 50 "yourusername"
```

### View Shop Data
```bash
cat data/shops/hoopers_store.json
```

### Check Last Save Time
```bash
ls -lah data/shops/
```

---

## Troubleshooting

### Shop Inventory Not Persisting

**Symptom:** Stock quantities reset after restart

**Check:**
1. Does `/home/micah/wumpy/data/shops/hoopers_store.json` exist?
   ```bash
   ls -la data/shops/
   ```

2. Check server logs for "Saved inventory for shop" messages
   ```bash
   # Look for this in server output:
   # "Saved inventory for shop: Hooper's General Store (hoopers_store)"
   ```

3. Verify file is being updated:
   ```bash
   # Before buying: note timestamp
   ls -la data/shops/hoopers_store.json

   # Buy something in-game

   # After buying: timestamp should change
   ls -la data/shops/hoopers_store.json
   ```

### Player Inventory Not Persisting

**Symptom:** Inventory cleared after login

**Check:**
1. Verify players.json is being written:
   ```bash
   ls -la players.json
   # Should show recent modification time after buying/selling
   ```

2. Check that InventorySerializer is working:
   ```bash
   # Look for this in server logs:
   # "Restored X/Y items for [username]"
   ```

### Currency Not Persisting

**Symptom:** Money resets to starting amount

**This should not happen** - currency persistence is working.

If it does:
1. Check players.json has "currency" field for your character
2. Verify buy/sell commands are calling updatePlayerCurrency()

---

## Reset Test Data

### Reset Shop Inventory to Default
```bash
rm data/shops/hoopers_store.json
# Restart server - shop will use original definition
```

### Reset Player (DANGEROUS - deletes character)
```bash
# Edit players.json and remove your character's entry
# OR delete entire file to reset all players:
rm players.json
# WARNING: This deletes ALL characters!
```

---

## Expected Results Summary

| Test | Expected Behavior |
|------|-------------------|
| Shop Stock | Decreases on purchase, persists after restart |
| Player-Sold Items | Appear in shop, persist after restart |
| Player Inventory | Items remain after logout/login |
| Currency | Balance persists after logout/login |

---

## Need Help?

If tests fail:
1. Check server logs for errors
2. Verify file permissions on `data/shops/` directory
3. Review `/home/micah/wumpy/docs/reports/INVENTORY_PERSISTENCE_IMPLEMENTATION.md`
4. Run automated test: `node tests/test-shop-persistence.js`

---

**End of Testing Guide**
