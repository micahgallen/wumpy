# Currency System

**Phase:** 5 - Economy & Loot
**Status:** Implemented
**Location:** `/src/systems/economy/CurrencyManager.js`

## Overview

The currency system implements a four-tier monetary system with automatic conversion between currency types. Currency is stored in a player wallet separate from inventory to avoid consuming inventory slots.

## Currency Types

The system uses four currency types with fixed conversion rates:

| Currency | Abbreviation | Value in Copper |
|----------|--------------|-----------------|
| Copper   | c            | 1               |
| Silver   | s            | 100             |
| Gold     | g            | 1,000           |
| Platinum | p            | 10,000          |

### Conversion Rates

- 100 copper = 1 silver
- 10 silver = 1 gold
- 10 gold = 1 platinum

## Design Decisions

### Wallet Approach

**Decision:** Currency is stored in a player wallet separate from inventory.

**Rationale:**
- Better UX - currency doesn't consume valuable inventory slots
- Simplified transactions - no need to manage currency item stacks
- Easier to prevent duplication exploits
- Aligns with modern MUD best practices

**Alternative Considered:** Currency as inventory items (rejected for UX reasons)

### Auto-Conversion

The system automatically converts currency to the most compact representation:

```javascript
// Example: 12,345 copper converts to:
// 1 platinum, 2 gold, 3 silver, 45 copper
const breakdown = CurrencyManager.fromCopper(12345);
// { platinum: 1, gold: 2, silver: 3, copper: 45 }
```

## API Reference

### Core Functions

**`toCopper(currency)`**
- Converts currency object to total copper value
- Returns: `number` (total copper)

**`fromCopper(copperAmount)`**
- Converts copper amount to currency breakdown
- Returns: `{platinum, gold, silver, copper}`

**`format(currency, hideZeros=true)`**
- Formats currency for display
- Example: `"1p 2g 3s 45c"`

**`formatLong(currency, hideZeros=true)`**
- Formats with full words
- Example: `"1 platinum, 2 gold, 3 silver and 45 copper"`

### Wallet Operations

**`getWallet(player)`**
- Gets player's currency wallet (initializes if needed)
- Returns: `{platinum, gold, silver, copper}`

**`setWallet(player, currency)`**
- Sets player's wallet to specific amount

**`addToWallet(player, amount)`**
- Adds currency to player's wallet
- Auto-converts to compact form
- Returns: new wallet balance

**`removeFromWallet(player, amount)`**
- Removes currency from player's wallet
- Returns: `{success, newBalance?, message?}`
- Prevents going negative

### Comparison Functions

**`compare(currency1, currency2)`**
- Compares two currency amounts
- Returns: `-1` (less), `0` (equal), `1` (greater)

**`hasEnough(playerCurrency, requiredCurrency)`**
- Checks if player has sufficient funds
- Returns: `boolean`

## Player Database Integration

New players start with 100 copper. Currency persists across sessions:

```javascript
// Player data structure
{
  username: "player",
  currency: {
    platinum: 0,
    gold: 0,
    silver: 0,
    copper: 100
  }
}
```

Existing players automatically receive 100 copper on first login (backwards compatibility).

## Security

### Duplication Prevention

1. All operations use immutable arithmetic
2. Wallet operations are atomic
3. Negative values are prevented
4. Overflow protection for very large amounts

### Transaction Logging

All currency operations are logged for debugging:

```
Added 5s to player1's wallet. New balance: 10s 50c
Removed 2g from player1's wallet. New balance: 8g
Transferred 1g from player1 to player2
```

## Usage Examples

### Giving Players Money

```javascript
const CurrencyManager = require('./systems/economy/CurrencyManager');

// Give player 500 copper (5 silver)
CurrencyManager.addToWallet(player, 500);

// Give player specific currency
CurrencyManager.addToWallet(player, { gold: 5, silver: 25 });
```

### Checking Affordability

```javascript
const cost = 1500; // 15 silver
if (CurrencyManager.hasEnough(player.currency, cost)) {
  // Player can afford it
  CurrencyManager.removeFromWallet(player, cost);
}
```

### Displaying Currency

```javascript
const wallet = CurrencyManager.getWallet(player);
player.send(`You have ${CurrencyManager.format(wallet)}.`);
// Output: "You have 5g 32s 8c."
```

## Command Integration

Currency can be viewed with the `money` command:

```
> money

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       YOUR CURRENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Gold:    5
  Silver:  32
  Copper:  8

Total: 5g 32s 8c
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Testing

All currency operations have comprehensive test coverage (26 tests):

- Conversion (copper ↔ breakdown)
- Formatting (short and long forms)
- Arithmetic (addition, subtraction)
- Comparison and validation
- Wallet operations
- Duplication prevention
- Overflow protection

Run tests: `node tests/economyTests.js`

## Future Enhancements

Possible future additions:

- Currency weight (if carrying physical coins)
- Bank storage system
- Currency exchange NPCs
- Regional currency variants
- Fractional currency (e.g., half-copper pieces)

## See Also

- [Shop System](./SHOP_SYSTEM.md) - Uses currency for transactions
- [Item Pricing](../items/ITEM_PRICING.md) - How items are valued
- [Loot Generation](../loot/LOOT_GENERATION.md) - Currency drops from NPCs
