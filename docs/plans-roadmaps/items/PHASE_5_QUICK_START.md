# Phase 5 Quick Start Guide

**Status:** Ready to implement
**Prerequisites:** Phases 0-4 complete (104/104 tests passing)

---

## Quick Command

To start Phase 5 in a fresh Claude Code session:

```
Read /home/micah/wumpy/docs/plans-roadmaps/items/PHASE_5_SESSION_PROMPT.md and implement Phase 5 using mud-architect, then review with mud-code-reviewer
```

---

## What Phase 5 Delivers

### Currency System
- Four-tier currency: copper, silver, gold, platinum
- Auto-conversion (100c = 1s, 10s = 1g, 10g = 1p)
- Currency wallet separate from inventory
- Display formatting ("5g 32s 8c")

### Shop System
- Buy/sell transactions
- Item pricing based on rarity and condition
- Special services (identify, repair)
- Shop inventory management
- Commands: list, buy, sell, value, identify, repair

### Enhanced Loot
- Currency drops from NPCs
- Mixed loot (items + currency)
- Free-for-all pickup
- Loot spawns as world entities

### Container System
- Chests, barrels, crates, sacks
- Open/close, lock/unlock
- Take/put items
- Container inventory management
- Commands: open, close, take from, put in

### Quest Rewards
- Currency + item rewards
- Multiple reward options
- Proper binding rules

---

## Key Design Decisions

**Wallet System:** Currency stored separately (doesn't use inventory slots)
**Shop Stock:** Configurable per shop (limited or unlimited)
**Repair Costs:** 25% of item value per 100% durability restored
**Identify Costs:** Based on rarity (10c common → 10g legendary)
**Container Capacity:** Slot-based (e.g., 20 slots per chest)
**Buy-back Rate:** Shops buy at 50% of item value

---

## Expected Deliverables

### New Files
- `/src/systems/economy/CurrencyManager.js`
- `/src/systems/economy/ShopManager.js`
- `/src/systems/containers/ContainerManager.js`
- `/src/commands/core/money.js`
- `/src/commands/economy/` - shop commands
- `/src/commands/containers/` - container commands
- `/tests/economyTests.js`
- Documentation files

### Modified Files
- `/src/items/BaseItem.js` - pricing methods
- `/src/config/itemsConfig.js` - economy config
- `/src/systems/loot/LootGenerator.js` - currency drops
- `/src/playerdb.js` - currency persistence

---

## Success Criteria

✅ 4-tier currency system working
✅ Shop buy/sell transactions functional
✅ Item pricing based on rarity
✅ Currency drops from NPCs
✅ Container system operational
✅ Quest rewards support currency
✅ Comprehensive economy tests passing
✅ All 104 existing tests still passing
✅ No currency duplication exploits
✅ No regressions

---

## Estimated Time

**Implementation:** 3-4 hours
**Testing:** 1 hour
**Review:** 30 minutes
**Total:** ~5 hours

---

## After Phase 5

**Next:** Phase 6 - Content & Domain Integration
- Build default item sets for realms
- Script tutorial quest
- Update worldbuilder docs
- Migration scripts

**Final:** Phase 7 - QA & Launch Checklist
- Regression testing
- Playtesting
- Balance review
- Deployment prep

---

## Current Test Status

**Before Phase 5:**
- Item tests: 35/35 ✓
- Spawn tests: 9/9 ✓
- Inventory tests: 23/23 ✓
- Equipment tests: 14/14 ✓
- Combat integration tests: 19/19 ✓
- **Total: 104/104 tests passing**

**After Phase 5 (Expected):**
- Economy tests: ~15-20 new tests
- **Total: ~120-125 tests passing**

---

**Ready to implement!** Copy the command above into a fresh Claude Code session.
