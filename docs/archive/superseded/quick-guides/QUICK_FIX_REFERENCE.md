# Quick Reference: Stat Persistence Fix

## The Three Stat Representations

| Name | Format | Where | Purpose |
|------|--------|-------|---------|
| `stats` | Long names (strength, dexterity, etc.) | Database | Backwards compatibility, persisted |
| `baseStats` | Long names (strength, dexterity, etc.) | Database | Base stats without equipment bonuses, persisted |
| Short names | `str`, `dex`, `con`, etc. | Runtime only | Combat system, NOT persisted |

## Key Rules

1. **Equipment bonuses NEVER modify `baseStats`**
   - Equipment bonuses are calculated at runtime
   - Effective stats = `baseStats` + equipment bonuses
   - Stored in short names (`player.str`, `player.dex`, etc.)

2. **Level-up stat gains ALWAYS modify `baseStats`**
   - `applyStatGains()` updates `baseStats.strength` etc.
   - Also updates `player.strength` for compatibility
   - Triggers recalculation to update short names

3. **Save operations write from `baseStats` to `stats`**
   - `savePlayer()` copies `baseStats` → `stats`
   - Short names are NEVER saved to database
   - On load, `stats` → `baseStats` → short names

## Common Operations

### Adding a Stat Bonus (Permanent)
```javascript
// Update baseStats, NOT effective stats
player.baseStats.strength += 2;

// Recalculate effective stats
EquipmentManager.recalculatePlayerStats(player, playerDB);
// This also saves automatically
```

### Adding Equipment Bonus
```javascript
// Equipment bonuses handled by EquipmentManager
// Never manually modify player.str directly!

item.statModifiers = { strength: 2 };
player.inventory.push(item);
item.isEquipped = true;

// Recalculate (automatically saves)
EquipmentManager.recalculatePlayerStats(player, playerDB);
```

### Level Up
```javascript
// Old system (legacy)
levelUp(player, playerDB);  // Calls applyStatGains internally

// New system (preferred)
checkAndApplyLevelUp(player, { playerDB });  // Automatically saves
```

### Manual Stat Check
```javascript
console.log('Base STR:', player.baseStats.strength);     // 10 (base)
console.log('Effective STR:', player.str);                // 12 (base + equipment)
console.log('Equipment bonus:', player.equipmentBonuses.strength); // 2
```

## When Stats Are Saved

Stats are automatically saved in these situations:

1. **Equipment changes** - `EquipmentManager.recalculatePlayerStats()`
2. **Level-ups** - `checkAndApplyLevelUp()`
3. **Player logout** - `server.js` disconnect handlers
4. **Admin commands** - `@addlevel`, etc.

## Migration Path

### Old Save Format (pre-fix)
```json
{
  "stats": {
    "strength": 10,
    "dexterity": 10
  }
  // No baseStats property
}
```

### New Save Format (post-fix)
```json
{
  "stats": {
    "strength": 10,
    "dexterity": 10
  },
  "baseStats": {
    "strength": 10,
    "dexterity": 10
  }
  // Short names NOT saved
}
```

**Migration:** `authenticate()` auto-creates `baseStats` from `stats` if missing

## Debugging Tips

### Check if stats are persisting
```javascript
// Before logout
console.log('Pre-save:', player.baseStats.strength);

// After login
console.log('Post-load:', loadedPlayer.baseStats.strength);
// Should match!
```

### Check equipment bonuses aren't persisting
```javascript
// With +2 STR ring equipped
console.log('Effective:', player.str);           // 12
console.log('Base:', player.baseStats.strength); // 10

// After save/load (without equipping ring)
console.log('Loaded base:', loaded.baseStats.strength); // Should be 10, not 12!
```

### Verify level-up gains persist
```javascript
// Level up, gain +1 STR
applyStatIncrease(player, 'str');
console.log('After level-up:', player.baseStats.strength); // 11

// Save and reload
playerDB.savePlayer(player);
const loaded = playerDB.authenticate('username', 'password');
console.log('After reload:', loaded.baseStats.strength); // Should be 11!
```

## Files to Check When Adding Stat Changes

When implementing new systems that modify stats:

1. **Always update `baseStats`, not effective stats**
2. **Always call `EquipmentManager.recalculatePlayerStats(player, playerDB)`**
3. **If playerDB not available, manually call `playerDB.savePlayer(player)`**

## Common Mistakes to Avoid

❌ **DON'T:**
```javascript
// Wrong - modifies effective stat, won't persist
player.str += 2;

// Wrong - modifies old format only
player.stats.strength += 2;

// Wrong - saves but doesn't recalculate
player.baseStats.strength += 2;
playerDB.save();
```

✓ **DO:**
```javascript
// Correct - modifies base and recalculates
player.baseStats.strength += 2;
EquipmentManager.recalculatePlayerStats(player, playerDB);

// Or use helper functions
applyStatGains(player, { strength: 2 });  // Handles everything
```

## Testing Checklist

Before deploying stat-related changes:

- [ ] Stats persist after server restart
- [ ] Equipment bonuses apply correctly
- [ ] Equipment bonuses don't persist to base stats
- [ ] Level-up gains persist
- [ ] Admin commands work correctly
- [ ] Old saves migrate without errors
- [ ] Short names calculate correctly

## Quick Test

```bash
# Run the stat persistence test suite
node tests/test_stat_persistence_fix.js

# Expected: 6/6 tests passed
```
