# Phase 5 Implementation Prompt - Economy & Loot

**Copy and paste this entire prompt into a fresh Claude Code session to begin Phase 5.**

---

I'm ready to implement Phase 5 (Economy & Loot) of the item system. Please use the mud-architect agent to implement the economy and loot systems based on the design documents, then use the mud-code-reviewer agent to review the implementation.

## Context Documents (Read These First)

1. **Implementation Plan:**
   `/docs/plans-roadmaps/items/ITEM_COMBAT_FINAL_IMPLEMENTATION_PLAN.md`
   - Read the Phase 5 section for detailed requirements

2. **Progress Tracking:**
   `/docs/plans-roadmaps/items/IMPLEMENTATION_PROGRESS.md`
   - Shows Phases 0, 1, 2, 3, and 4 are COMPLETE
   - Phase 5 is next (Economy & Loot)

3. **Combat Integration Summary:**
   `/docs/reports/PHASE_4_COMBAT_INTEGRATION_SUMMARY.md`
   - Phase 4 completion details
   - Combat system now fully integrated with equipment

4. **Current Configuration:**
   `/src/config/itemsConfig.js`
   - Existing item configuration
   - Loot generation settings
   - Spawn weights and rarity

5. **Existing Systems:**
   - `/src/items/BaseItem.js` - Item base class
   - `/src/systems/loot/LootGenerator.js` - Loot generation (already partially implemented)
   - `/src/systems/inventory/InventoryManager.js` - Inventory management
   - `/src/systems/equipment/EquipmentManager.js` - Equipment system
   - `/src/combat/` - Combat system with equipment integration

6. **Test Infrastructure:**
   - `/tests/runAllTests.js` - Test runner
   - Current status: 104/104 tests passing
   - Need to create `/tests/economyTests.js` for new functionality

## Current State (Phase 4 Complete)

**What's Working:**
- ✅ Equipment system fully functional
- ✅ Combat integration complete (weapon damage, AC, proficiency penalties)
- ✅ Dual wielding operational
- ✅ Stat bonus system from equipment
- ✅ Attunement system (3 slots)
- ✅ Spawn system with tags, weights, loot tables
- ✅ Inventory with hybrid encumbrance
- ✅ 104/104 tests passing

**Existing Loot Infrastructure:**
- LootGenerator service with weighted random selection
- Tag-based filtering (ANY/ALL mode)
- Loot table matching
- Level gating for rare items
- Currency generation (basic implementation exists)

**Test Equipment Available:**
- `/world/core/items/testEquipmentSet.js` - 17 test items
- `/world/core/items/sampleItems.js` - Sample weapons and armor
- `/world/sesame_street/items/` - 6 consumable items

## Phase 5 Requirements - Economy & Loot

### 1. Currency Engine
**Location:** Create `/src/systems/economy/CurrencyManager.js`

**Requirements:**
- Four-tier currency system: copper, silver, gold, platinum
- Conversion rates:
  - 100 copper = 1 silver
  - 10 silver = 1 gold
  - 10 gold = 1 platinum
- Auto-conversion helpers (e.g., convert 250 copper to "2 silver, 50 copper")
- Display formatting (e.g., "5g 32s 8c" for 5 gold, 32 silver, 8 copper)
- Currency addition/subtraction with auto-conversion
- Currency comparison (has enough funds?)
- Integration with existing inventory currency items
- Wallet system separate from inventory items (optional: discuss design choice)

### 2. Shop System
**Location:** Create `/src/systems/economy/ShopManager.js`

**Requirements:**
- Shop definition schema (shop ID, name, inventory, buy/sell rates)
- Price items using four-tier currency
- Buy transactions (player purchases from shop)
- Sell transactions (player sells to shop)
- Shop inventory management (limited stock vs unlimited)
- Buy-back percentage (e.g., shops buy items at 50% of value)
- Special services pricing:
  - Item identification service
  - Item repair service (restore durability)
  - Attunement services (if needed)
- Shop commands:
  - `list` - View shop inventory with prices
  - `buy <item>` - Purchase item from shop
  - `sell <item>` - Sell item to shop
  - `value <item>` - Check item worth
  - `identify <item>` - Pay for identification
  - `repair <item>` - Pay for repairs

### 3. Item Pricing System
**Location:** Extend BaseItem with pricing, update `/src/config/itemsConfig.js`

**Requirements:**
- Base value for all items (in copper)
- Rarity multipliers (common 1x, uncommon 5x, rare 25x, etc.)
- Condition modifiers (damaged items worth less)
- Magical item pricing (identified vs unidentified)
- Quest item pricing (typically worthless to shops)
- Consumable pricing (stack-aware)
- Weapon/armor pricing based on stats
- Configuration for default price ranges by item type

### 4. Loot Drop System Enhancement
**Location:** Enhance `/src/systems/loot/LootGenerator.js`

**Requirements:**
- Currency drops from NPCs (based on NPC level/type)
- Mixed loot (items + currency in same drop)
- Loot spawns as world entities (items appear in room)
- Free-for-all pickup (first come, first served)
- Loot tables specify currency ranges
- Boss loot tables with higher currency rewards
- Container loot generation:
  - Chests, crates, barrels
  - Respect stacking rules
  - Currency piles auto-stack
- Display loot on ground with pickup commands

### 5. Container System
**Location:** Create `/src/systems/containers/ContainerManager.js`

**Requirements:**
- Container definition (storage capacity, locked/unlocked)
- Container types: chest, barrel, crate, sack, etc.
- Open/close container commands
- Lock/unlock with keys
- Take items from containers
- Put items into containers
- Container inventory separate from player inventory
- Containers as room objects
- **Corpse containers (documentation only):**
  - Document corpse container design
  - Defer full implementation (placeholder for future)
  - Note: Corpses will hold defeated character loot
  - Include ownership/decay rules in design doc

### 6. Quest Reward System
**Location:** Create `/src/systems/quests/QuestRewardManager.js` or extend existing quest system

**Requirements:**
- Quest completion rewards (items + currency)
- Quest items remain unbound unless `bindOnEquip` flag set
- Reward claiming mechanism
- Multiple reward options (choose one of three)
- Currency rewards with proper formatting
- Experience/reputation rewards (if applicable)
- Integration with existing quest system (if one exists)

### 7. Currency Commands
**Files to create:**
- `/src/commands/core/money.js` - Display player currency
- `/src/commands/core/give.js` - Give currency/items to other players (if not exists)
- Update existing commands to handle currency

**Requirements:**
- `money` command shows currency breakdown
- `give <amount> <currency> to <player>` transfers currency
- Currency persists in player database
- Transaction logging for debugging

### 8. Testing
**Create:** `/tests/economyTests.js`

**Test coverage:**
- Currency conversion (copper to silver to gold to platinum)
- Currency addition and subtraction
- Shop buy/sell transactions
- Item pricing calculations
- Rarity multipliers
- Condition-based pricing
- Shop inventory management
- Container open/close/take/put
- Loot generation with currency
- Quest reward distribution
- Currency persistence
- Edge cases (insufficient funds, full inventory, etc.)

## Implementation Steps

### Step 1: Architect Implementation
Use the **mud-architect** agent to:

1. Read all context documents (implementation plan, progress, config)
2. Design currency system architecture (wallet vs inventory items)
3. Implement CurrencyManager with conversion helpers
4. Implement ShopManager with buy/sell logic
5. Add pricing system to BaseItem and configuration
6. Enhance LootGenerator with currency drops
7. Implement ContainerManager (basic functionality)
8. Create quest reward system or extend existing
9. Implement all economy-related commands
10. Create comprehensive tests
11. Run all tests to ensure no regressions
12. Document corpse container design (placeholder)

### Step 2: Code Review
Use the **mud-code-reviewer** agent to:

1. Review the implementation for:
   - Integration quality with existing inventory/combat systems
   - Adherence to design document requirements
   - Bug-free currency calculations (no money duplication exploits!)
   - Edge case handling (negative currency, overflow, etc.)
   - Test coverage completeness
   - Shop transaction security
2. Verify all 104 existing tests still pass
3. Verify new economy tests pass
4. Check for economic exploits or balance issues
5. Ensure currency display is clear and user-friendly

## Exit Criteria for Phase 5

✅ Currency engine functional with four-tier system
✅ Auto-conversion between currency types working
✅ Shop system operational (buy/sell/identify/repair)
✅ Item pricing system based on rarity and condition
✅ Loot drops include currency
✅ Free-for-all loot spawns in world
✅ Container system functional (open/close/take/put)
✅ Quest rewards support items + currency
✅ Currency commands created and working
✅ Comprehensive economy tests created and passing
✅ All 104 existing tests still passing
✅ No regressions in combat, equipment, or inventory
✅ No currency duplication exploits
✅ Corpse container design documented
✅ Code reviewed by mud-code-reviewer agent

## Design Constraints

From the implementation plan, these decisions are locked:

- **Currency:** Copper, silver, gold, platinum (4-tier system)
- **Conversion:** 100 copper = 1 silver, 10 silver = 1 gold, 10 gold = 1 platinum
- **Group loot:** Free-for-all pickup (no auto-distribution)
- **Stacking:** Currency piles stack correctly
- **Quest items:** Unbound by default unless `bindOnEquip` flag
- **Shop buy-back:** Shops buy at reduced percentage (configurable, suggest 50%)
- **Corpse containers:** Document design, defer implementation
- **Magical pricing:** Unidentified items worth less than identified

## Design Decisions to Make

The architect should decide or ask about:

1. **Currency storage:** Separate wallet vs currency as inventory items?
   - **Wallet approach:** Currency doesn't take inventory space (cleaner UX)
   - **Inventory approach:** Currency are items (more realistic, uses slots)
   - **Recommendation:** Wallet approach for better UX

2. **Shop stock:** Limited inventory or unlimited?
   - **Recommendation:** Configurable per shop (some limited, some unlimited)

3. **Repair costs:** Fixed price or percentage of item value?
   - **Recommendation:** Percentage (e.g., 25% of full value to repair from 0% durability)

4. **Identify costs:** Fixed or based on rarity?
   - **Recommendation:** Based on rarity (10c common, 1g rare, 10g legendary)

5. **Container capacity:** Slot-based or weight-based or both?
   - **Recommendation:** Slot-based for simplicity (e.g., chest has 20 slots)

## Agent Instructions

**For mud-architect:**
- Implement Phase 5 Economy & Loot following the design document
- Make reasonable decisions for ambiguous requirements (document choices)
- Use established patterns from existing systems
- Ensure no currency duplication exploits
- Write comprehensive tests
- Return summary of implementation with test results

**For mud-code-reviewer:**
- Review implementation after architect completes
- Check for economic exploits (duplication, underflow/overflow)
- Verify integration quality and bug-free operation
- Verify test coverage
- Ensure no regressions
- Return review findings and recommendations

---

## Quick Start Command

After pasting this prompt, Claude Code should automatically:
1. Launch mud-architect agent to implement Phase 5
2. Launch mud-code-reviewer agent to review the code
3. Report results and test status

---

## Notes for Implementation

### Currency Conversion Example
```javascript
// 1532 copper should convert to:
// 1 gold, 5 silver, 32 copper
// OR: 15 silver, 32 copper
// Display: "1g 5s 32c" or "15s 32c"
```

### Shop Transaction Example
```javascript
// Player buys a longsword (50 silver)
// Player has: 2g 30s 15c (= 2030 + 15 = 2045 copper)
// Longsword costs: 50s (= 5000 copper)
// After purchase: 1g 80s 15c (= 10000 + 8000 + 15 = 18015 copper)
```

### Loot Drop Example
```javascript
// Goblin dies, drops:
// - Rusty dagger (item)
// - 15 copper (currency)
// - Bread (consumable)
// All spawn in room as pickable entities
```

### Container Example
```javascript
// Chest in dungeon room:
// - open chest -> reveals contents
// - take potion from chest -> moves to inventory
// - put sword in chest -> stores item
// - close chest -> hides contents
```

### Economic Balance Targets

**Suggested Pricing (in copper):**
- Common dagger: 200c (2 silver)
- Common longsword: 1,500c (15 silver)
- Common leather armor: 1,000c (10 silver)
- Uncommon +1 longsword: 7,500c (75 silver or 7.5 gold)
- Rare +2 longsword: 37,500c (375 silver or 37.5 gold)
- Health potion (50 HP): 50c (5 copper)
- Identify service: 50c-10,000c based on rarity
- Repair service: 25% of item value per 100% durability restored

**Suggested NPC Currency Drops:**
- Goblin (CR 1): 5-20c
- Bandit (CR 2): 10-50c
- Orc (CR 3): 25-100c
- Boss (CR 5+): 1-10 gold

These are suggestions - architect can adjust for game balance.

---

## Files to Create (Suggested)

1. `/src/systems/economy/CurrencyManager.js`
2. `/src/systems/economy/ShopManager.js`
3. `/src/systems/containers/ContainerManager.js`
4. `/src/systems/quests/QuestRewardManager.js` (or extend existing)
5. `/src/commands/core/money.js`
6. `/src/commands/economy/list.js` (shop list)
7. `/src/commands/economy/buy.js`
8. `/src/commands/economy/sell.js`
9. `/src/commands/economy/value.js`
10. `/src/commands/containers/open.js`
11. `/src/commands/containers/close.js`
12. `/tests/economyTests.js`
13. `/docs/systems/economy/CURRENCY_SYSTEM.md`
14. `/docs/systems/economy/SHOP_SYSTEM.md`
15. `/docs/systems/containers/CONTAINER_DESIGN.md`
16. `/docs/systems/containers/CORPSE_CONTAINER_SPEC.md` (design only)

## Files to Modify (Likely)

1. `/src/items/BaseItem.js` - Add pricing methods
2. `/src/config/itemsConfig.js` - Add economy configuration
3. `/src/systems/loot/LootGenerator.js` - Enhanced currency drops
4. `/src/systems/inventory/InventoryManager.js` - Currency integration
5. `/src/playerdb.js` - Currency persistence
6. `/world/core/items/sampleItems.js` - Add prices to sample items
7. `/tests/runAllTests.js` - Include economy tests

---

**Ready to implement Phase 5!** This will complete the economy foundation for the MUD, enabling shops, currency, containers, and quest rewards.
