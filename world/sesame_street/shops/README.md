# Sesame Street Shop System - Testing Guide

## Overview

Hooper's General Store on Sesame Street is a fully-functional shop implementation for testing the Phase 5 Economy System. This guide will help you test all shop features including buying, selling, identification, and repair services.

---

## Shop Location

**Room:** `general_store` (Hooper's General Store)
**Shopkeeper:** Mr. Hooper
**Access:** From Sesame Street main area, enter shop (direction: east from sesame_street_01)

---

## Available Items & Pricing

### Consumables - Food & Drink

| Item | Price | Stock | Healing | Notes |
|------|-------|-------|---------|-------|
| Chocolate Chip Cookie | 25c | 50 | 5 HP | Classic favorite |
| Sugar Cookie | 20c | 50 | 4 HP | Simple and sweet |
| Oatmeal Cookie | 30c | 40 | 6 HP | Healthier option |
| Milk Bottle | 15c | 30 | 5 HP | Cold and refreshing |
| Birdseed | 10c | 20 | 2 HP | For birds (mostly) |
| Sardine Can | 12c | 15 | 3 HP | Questionable quality |
| Health Potion | 50c | 20 | 25 HP | Proper healing |

### Equipment - Weapons

| Item | Price | Stock | Damage | Notes |
|------|-------|-------|--------|-------|
| Wooden Practice Sword | 50c | 10 | 1d4 | Starter weapon, has durability |

### Equipment - Armor

| Item | Price | Stock | AC | Notes |
|------|-------|-------|-----|-------|
| Leather Cap | 100c (1s) | 8 | +1 | Light head armor |

### Special Items - Magical

| Item | Price | Stock | Notes |
|------|-------|-------|-------|
| Mysterious Amulet | 500c (5s) | 3 | Requires identification, +2 WIS, +1 INT |

---

## Shop Configuration

- **Stock Type:** Limited (quantities decrease with purchases)
- **Buyback Rate:** 50% (shop pays half of item value)
- **Markup:** 1.0x (items sold at base value)
- **Services:** Identify (yes), Repair (yes)
- **Accepts:** Consumables, Weapons, Armor, Jewelry

---

## Currency System

The shop uses a four-tier currency system:

- **Copper (c):** Base unit
- **Silver (s):** 100 copper = 1 silver
- **Gold (g):** 10 silver = 1 gold (1000 copper)
- **Platinum (p):** 10 gold = 1 platinum (10000 copper)

**Display Format:** `5g 32s 8c` = 5 gold, 32 silver, 8 copper

---

## Testing the Shop System

### Prerequisites

Before testing, ensure you have:
1. Started the MUD server
2. Created a player character
3. Navigated to Hooper's General Store
4. Have some starting currency (see "Getting Starting Currency" below)

### Getting Starting Currency

**Option 1: Admin Command**
```
@givecurrency <username> 500c
```
This gives 500 copper (5 silver) for testing.

**Option 2: Starter Kit**
New players should receive a starter kit with 100 copper and basic items.

**Option 3: Manual Currency Set**
Use admin tools to set player.currency:
```javascript
player.currency = { copper: 500, silver: 0, gold: 0, platinum: 0 }
```

---

## Test Cases

### 1. Viewing Shop Inventory

**Command:** `list`

**Expected Output:**
- Display of all items with prices
- Shows stock quantities
- Currency formatted properly (e.g., "25c", "1s", "5g")
- Items grouped by category

**What to Check:**
- All 11 items appear in list
- Prices match the table above
- Stock quantities are correct
- Formatting is clear and readable

---

### 2. Checking Your Currency

**Command:** `money`

**Expected Output:**
- Display your current currency balance
- Format: "You have 5 silver and 25 copper" or similar
- Breakdown by currency type

**What to Check:**
- Currency displays correctly
- Auto-conversion working (e.g., 100c shows as 1s)

---

### 3. Buying Items - Basic

**Test A: Buy Single Item**
```
buy cookie
```
or
```
buy chocolate chip cookie
```

**Expected:**
- Item added to inventory
- Currency deducted from wallet
- Shop stock decremented by 1
- Success message with price paid

**Test B: Buy Multiple Items**
```
buy 3 cookie
```

**Expected:**
- 3 cookies added to inventory (stacked)
- Currency deducted (3 × 25c = 75c)
- Shop stock decremented by 3
- Success message with total cost

**What to Check:**
- Correct item received
- Correct amount charged
- Inventory updates properly
- Shop stock decreases
- Can't buy if insufficient funds
- Can't buy more than available stock

---

### 4. Buying Items - Edge Cases

**Test C: Insufficient Funds**
```
buy mysterious amulet
```
(with less than 500c)

**Expected:**
- Transaction fails
- Error message: "You need 5s but only have [amount]"
- No item added
- No currency deducted

**Test D: Out of Stock**
Buy all 3 mysterious amulets, then try to buy a 4th.

**Expected:**
- Transaction fails
- Error message about out of stock
- Shop shows 0 quantity

**Test E: Invalid Item**
```
buy dragon
```

**Expected:**
- Error message: "Shop doesn't sell that item"

---

### 5. Selling Items

**Test A: Sell to Shop**
First, buy an item, then sell it back:
```
buy wooden practice sword
sell wooden practice sword
```

**Expected:**
- Item removed from inventory
- Receive 50% of value (25c for sword)
- Success message with amount received

**Test B: Sell Stackable Items**
```
buy 5 cookie
sell 2 cookie
```

**Expected:**
- 2 cookies removed from stack
- Receive payment for 2 cookies (2 × 25c × 50% = 25c)
- 3 cookies remain in inventory

**What to Check:**
- Correct buyback percentage applied (50%)
- Currency added to wallet properly
- Can't sell quest items
- Can't sell equipped items
- Can't sell items you don't have

---

### 6. Valuing Items

**Command:** `value wooden practice sword`

**Expected:**
- Shows how much shop will pay
- Format: "Shop will pay [amount] for [item]"
- Should show 50% of item value

**What to Check:**
- Value is 50% of base item value
- Works for items in inventory
- Shows "0" or refuses quest items

---

### 7. Item Identification Service

**Test A: Buy Unidentified Item**
```
buy mysterious amulet
examine mysterious amulet
```

**Expected:**
- Item description is vague/mysterious
- Stats not visible or shown as "???"
- Item marked as unidentified

**Test B: Identify Item**
```
identify mysterious amulet
```

**Expected:**
- Charge identification fee (based on rarity)
- Item becomes identified
- Full stats now visible
- Item description updated

**Cost Formula:**
- Common: 10c
- Uncommon: 50c
- Rare: 1g (1000c)
- Epic: 5g
- Legendary: 10g

**What to Check:**
- Can't identify already-identified items
- Correct cost charged
- Stats reveal properly
- Can't identify if insufficient funds

---

### 8. Repair Service

**Test A: Damage an Item**
Use the wooden practice sword in combat or use admin command to damage it:
```
@damage wooden_practice_sword 50
```
This should set durability to 50/100.

**Test B: Check Repair Cost**
```
examine wooden practice sword
```
Should show durability (50/100) and repair cost.

**Test C: Repair Item**
```
repair wooden practice sword
```

**Expected:**
- Charge repair cost (percentage of item value)
- Durability restored to maximum
- Success message

**Cost Formula:**
- Repair cost = (Item Value × Damage %) × 25%
- Example: 50c sword at 50% durability = 50c × 50% × 25% = 6.25c (rounded)

**What to Check:**
- Can't repair items at full durability
- Can't repair if insufficient funds
- Durability restored to max
- Works for armor and weapons

---

### 9. Inventory Management

**Test A: Full Inventory**
1. Fill inventory to capacity
2. Try to buy an item

**Expected:**
- Transaction fails
- Error: "You can't carry that"
- No currency deducted
- Item not added

**Test B: Weight Limits**
Buy many heavy items and test weight limits.

**Expected:**
- Follows hybrid encumbrance system
- Warns when approaching limits

---

### 10. Currency Conversion

**Test A: Auto-Conversion on Purchase**
Start with 2s 50c (250 copper)
Buy item for 75c

**Expected:**
- New balance: 1s 75c (175 copper)
- Display properly converts

**Test B: Large Purchase**
Have 1g (1000c)
Buy item for 5s (500c)

**Expected:**
- New balance: 5s (500c) displayed as "5s"
- Or "50s" if format varies

**What to Check:**
- Currency properly converts between tiers
- Display format is consistent
- Math is always correct (no rounding errors!)

---

### 11. Shop Stock Management

**Test A: Limited Stock Depletion**
Buy all 3 mysterious amulets (1500c total)

**Expected:**
- Stock decrements with each purchase: 3 → 2 → 1 → 0
- `list` command shows updated quantities
- Can't buy when stock = 0

**Test B: Stock Replenishment (Future)**
Currently, stock doesn't replenish automatically. This is for future implementation.

---

### 12. Multiple Players

**Test A: Concurrent Shopping**
Have two players in the shop:
1. Player A buys item
2. Player B tries to buy same item

**Expected:**
- Both see updated stock
- No race conditions
- Stock properly tracked

**Test B: Concurrent Purchase of Limited Item**
Two players try to buy the last item simultaneously.

**Expected:**
- One succeeds, one fails
- No duplication bugs
- Stock = 0 after

---

## Common Issues & Troubleshooting

### Issue: "Shop not found"
**Solution:**
- Ensure you're in the general_store room
- Check that shop is loaded: shops should be loaded at server start
- Verify room has `"shop": "hoopers_store"` property

### Issue: Currency not displaying
**Solution:**
- Use `money` command to check balance
- Verify player.currency object exists
- Check CurrencyManager is loaded

### Issue: Can't buy anything
**Solutions:**
- Check you have enough currency: `money`
- Verify shop has stock: `list`
- Ensure item keyword is correct
- Check inventory isn't full

### Issue: Shop commands not working
**Solution:**
- Verify you're in a shop room
- Check command spelling
- Ensure economy commands are loaded in server

### Issue: Identification not working
**Solution:**
- Check item requires identification (examine it)
- Verify you have enough currency
- Item must be in your inventory

### Issue: Repair not working
**Solution:**
- Item must have durability system
- Item must be damaged (not at max durability)
- Must have enough currency for repair cost

---

## Admin Testing Commands

For easier testing, use these admin commands:

### Give Currency
```
@givecurrency <player> <amount>
```
Examples:
- `@givecurrency alice 1000c` - Give 1000 copper
- `@givecurrency bob 5g` - Give 5 gold

### Set Currency
```
@setcurrency <player> <amount>
```
Sets exact amount, overwriting current balance.

### Spawn Items
```
@spawn wooden_practice_sword
@spawn mysterious_amulet
```
Create items for testing selling/repair/identify.

### Damage Items
```
@damage <item> <durability>
```
Set item durability for repair testing.

### Reset Shop Stock
```
@resetshop hoopers_store
```
Restore shop to initial stock levels.

---

## Expected Results Summary

After completing all tests, you should have verified:

1. **Buy System:**
   - ✅ Single item purchase works
   - ✅ Multiple item purchase works
   - ✅ Currency deducted correctly
   - ✅ Shop stock decrements
   - ✅ Insufficient funds handled
   - ✅ Out of stock handled

2. **Sell System:**
   - ✅ Items sell for 50% of value
   - ✅ Currency added to wallet
   - ✅ Stackable items handled
   - ✅ Can't sell quest items
   - ✅ Can't sell equipped items

3. **Identify System:**
   - ✅ Unidentified items remain mysterious
   - ✅ Identification reveals stats
   - ✅ Correct cost charged by rarity
   - ✅ Can't identify already-identified items

4. **Repair System:**
   - ✅ Damaged items show durability
   - ✅ Repair restores to max
   - ✅ Correct cost charged
   - ✅ Can't repair undamaged items

5. **Currency System:**
   - ✅ Four-tier system works
   - ✅ Auto-conversion between tiers
   - ✅ Display formatting correct
   - ✅ No rounding errors
   - ✅ No duplication bugs

6. **Shop Management:**
   - ✅ Limited stock tracked correctly
   - ✅ Stock displays accurately
   - ✅ Multiple players supported
   - ✅ No race conditions

---

## Performance Testing

### Load Testing
- Test with 10+ players in shop simultaneously
- Verify no lag or crashes
- Check database persistence

### Economy Balance
- Verify prices feel balanced
- Check if grinding/farming is possible
- Test for economic exploits
- Ensure no infinite money bugs

---

## Integration Testing

Verify shop integrates with:
- ✅ Inventory system (capacity, weight, stacking)
- ✅ Equipment system (can't sell equipped items)
- ✅ Combat system (durability decreases)
- ✅ Item system (all item types supported)
- ✅ Player persistence (currency saves)
- ✅ Command system (all commands work)

---

## Future Enhancements

Features to add later:
- Shop stock replenishment (daily/weekly reset)
- Shop hours (open/close times)
- Haggling/negotiation system
- Bulk discounts
- Player reputation affecting prices
- Special shop events/sales
- Quest integration (special items available after quests)
- Shopkeeper dialogue system
- Different shops in different areas
- Specialized shops (weapon shop, potion shop, etc.)

---

## Reporting Bugs

When reporting bugs, include:
1. Exact command used
2. Expected behavior
3. Actual behavior
4. Your currency before/after
5. Shop stock before/after
6. Any error messages
7. Steps to reproduce

Report to: Project issue tracker or lead developer

---

## Files Reference

**Shop Definition:**
- `/world/sesame_street/shops/hoopersStore.js`

**Shop Loader:**
- `/world/sesame_street/shops/loadShops.js`

**Item Definitions:**
- `/world/sesame_street/items/consumables/*.js`
- `/world/sesame_street/items/equipment/*.js`

**Room Definition:**
- `/world/sesame_street/rooms/general_store.js`

**NPC Definition:**
- `/world/sesame_street/npcs/shopkeeper.js`

**Economy Systems:**
- `/src/systems/economy/CurrencyManager.js`
- `/src/systems/economy/ShopManager.js`

---

## Quick Test Sequence

For rapid testing, execute this sequence:

1. Enter shop: `go east` (from sesame_street_01)
2. Check inventory: `list`
3. Check currency: `money`
4. Buy cheap item: `buy cookie`
5. Buy expensive item: `buy health potion`
6. Value an item: `value cookie`
7. Sell an item: `sell cookie`
8. Buy magical item: `buy mysterious amulet`
9. Identify it: `identify amulet`
10. Buy weapon: `buy wooden practice sword`
11. (Damage it somehow)
12. Repair it: `repair sword`

If all 12 steps work, the shop system is functional!

---

**Last Updated:** Phase 5 Implementation
**Version:** 1.0
**Status:** Ready for Testing
