# Persistence System - Quick Start Guide

**For developers who need to fix the bugs NOW**

---

## 30-Second Overview

Two critical bugs block production:

1. **Item Duplication** (CRITICAL) - Items appear in both container and player inventory
2. **Player Position Loss** (HIGH) - Players respawn at starting area after shutdown

**Fix time:** 4-7 hours (includes testing)
**Complexity:** Low (simple implementation oversights)

---

## 5-Minute Fast Track

### Bug #1: Item Duplication

**Problem:** Line 373 in `put.js` doesn't update item location metadata

**Fix:**
```javascript
// In /home/micah/wumpy/src/commands/containers/put.js:373
// Replace: containerObj.inventory.push(item);

// With:
const itemData = {
  instanceId: item.instanceId,
  definitionId: item.definitionId,
  quantity: item.quantity || 1,
  // ... copy other properties ...
  location: { type: 'container', containerId: containerId }  // ← KEY FIX
};
containerObj.inventory.push(itemData);
```

**Also fix:** Line 429 (same bug in portable containers)

---

### Bug #2: Player Position Loss

**Problem:** `ShutdownHandler.js` doesn't save player positions

**Fix:**
```javascript
// In /home/micah/wumpy/src/server/ShutdownHandler.js
// Add this method:
savePlayerStates() {
  const { playerDB, players } = this.components;
  for (const player of players) {
    if (player.username && player.state === 'playing') {
      playerDB.savePlayer(player);
    }
  }
}

// Call it in handleShutdown() before other saves:
this.savePlayerStates();  // ← ADD THIS LINE
this.saveTimers();
this.saveCorpses();
this.saveContainers();
```

---

## 10-Minute Implementation

1. **Apply code fixes** (see [FIXES_GUIDE.md](FIXES_GUIDE.md) for exact changes)
2. **Run data cleanup:**
   ```bash
   node scripts/fix-container-locations.js
   ```
3. **Test:**
   - Put item in container
   - Restart server
   - Verify item only in container (not duplicated)

---

## Need More Detail?

- **Complete fixes:** [FIXES_GUIDE.md](FIXES_GUIDE.md)
- **Testing procedures:** [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Data cleanup:** [DATA_CLEANUP.md](DATA_CLEANUP.md)
- **Full documentation:** [INDEX.md](INDEX.md)

---

## Critical Files

| File | Line | What to Change |
|------|------|----------------|
| `src/commands/containers/put.js` | 373 | Add location metadata sanitization |
| `src/commands/containers/put.js` | 429 | Same fix for portable containers |
| `src/server/ShutdownHandler.js` | 96+ | Add savePlayerStates() method |
| `src/server/ShutdownHandler.js` | 45 | Call savePlayerStates() |

---

## Validation

After fixes:
```bash
# Test data is clean
node scripts/test-container-fix.js

# Should output: "✅ ALL TESTS PASSED"
```

---

**Need help?** Start with [INDEX.md](INDEX.md)
