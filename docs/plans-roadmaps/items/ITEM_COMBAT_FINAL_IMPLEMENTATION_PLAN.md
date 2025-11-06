# Item & Combat Integration – Final Implementation Plan

**Audience:** Claude Code implementation agent  
**Source Docs:** `docs/systems/items/ITEM_SYSTEM_DESIGN.md`, `docs/systems/combat/COMBAT_ITEM_INTEGRATION.md`, `docs/tmp/item_combat_interview.md`  
**Goal:** Deliver the MVP item + combat integration that honors all confirmed design decisions.

---

## Confirmed Product Decisions
- **Encumbrance:** Hybrid (slot + STR-based weight).  
- **Weapon proficiency penalty:** Allow equip; apply attack penalty.  
- **Armor DEX caps:** D&D-style tiered caps.  
- **Durability:** Items lose durability only on player death; no combat tick decay.  
- **Magical identification:** Properties hidden until identified.  
- **Binding:** Default unbound; optional bind-on-equip flag available.  
- **Currency:** Copper, silver, gold, platinum.  
- **Group loot:** Free-for-all pickup.  
- **Stacking:** Equipment never stacks; consumables & currency stack with configurable caps.  
- **Starting kit:** Players spawn unarmed; intro quest grants gear.  
- **Dual wield:** Simplified auto off-hand attack each round with reduced damage.  
- **Heavy armor mitigation:** AC-only (no flat damage reduction).  
- **Attunement:** Full system with three attunement slots.  
- **Combat durability:** Skip for now (only death-based loss applies).

Keep these constraints at hand during every phase; raise questions before deviating.

---

## Phase 0 – Project Setup & Validation
1. **Audit existing repos:** Inspect `/src/items`, `/src/combat`, `/src/systems`, `/world` for pre-existing code or stubs.  
2. **Schema extraction:** Translate the design schemas into TypeScript/JavaScript interfaces in `/src/items/schemas`.  
3. **Validation tooling:** Wire up JSON schema or zod validators to enforce definitions at load time.  
4. **Testing harness:** Extend existing Jest suite (if present) or add `items.test.js` with helpers for dice, stacking, encumbrance math.

**Exit criteria:** Shared schema module compiled; base test scaffold green.

---

## Phase 1 – Core Item Framework
1. **Registry:** Implement singleton item registry (`/src/items/ItemRegistry.js`) mirroring command/emote patterns; support domain registration.  
2. **Item base class:** Define `BaseItem` with hooks for equip/unequip, use, identify, attune, bind logic.  
3. **Property mixins:** Provide modules for weapon, armor, consumable, quest item behavior.  
4. **Serialization:** Add load/save utilities handling stack counts, durability (death counter), binding state, attunement flags.  
5. **Attunement tracking:** Introduce `/src/systems/equipment/AttunementManager.js` supporting three slots and validation.

**Exit criteria:** Registry loads sample data, attunement limits enforced via unit tests.

---

## Phase 2 – Inventory & Encumbrance
1. **Inventory structure:** Implement `/src/systems/inventory/InventoryManager.js` with slot list + total weight.  
2. **Hybrid limits:** Calculate max slots (configurable) and weight (based on STR modifier). Block adds when either limit exceeded.  
3. **Stacking rules:** Allow stacking for flagged items with configurable cap; ensure equipment is always non-stackable.  
4. **Death durability:** On player death trigger, reduce equipped item durability and flag repair requirement.  
5. **Starting loadout:** Update character creation to spawn inventory empty; hook the tutorial quest to grant starter gear.  
6. **Persistence:** Ensure serialization captures stack counts, binding flags, durability, attunement.

**Exit criteria:** Automated tests cover encumbrance edge cases, stacking, death durability, persistence round-trip.

---

## Phase 3 – Equipment Mechanics
1. **Equipment manager:** Create `/src/systems/equipment/EquipmentManager.js` managing slots (weapon main/off-hand, armor pieces, jewelry).  
2. **Tiered DEX caps:** Integrate armor metadata to cap DEX bonus during AC calculation.  
3. **Binding flag:** Respect `bindOnEquip` flag at first equip; block trade/drop if bound.  
4. **Attunement flow:** Require attunement before equipping flagged magical items; include rest-time requirement if needed.  
5. **UI/Command layer:** Implement `equip`, `unequip`, `attune`, `identify`, and `inspect` commands with validation and messaging.  
6. **Manual identification:** Add identify spell/scroll/NPC API; hide magical properties until identified.

**Exit criteria:** Commands function in integration tests; attunement limits enforced; DEX caps verified.

---

## Phase 4 – Combat Integration
1. **Weapon stats:** Modify `/src/combat/combatResolver.js` to pull damage dice, finesse, versatile, and magical bonuses from equipped weapon.  
2. **Attack penalty:** Inject weapon proficiency check; apply configured attack roll penalty when lacking proficiency.  
3. **Dual wield:** Implement simplified second attack with half-damage and separate hit roll when two light weapons equipped.  
4. **Armor AC:** Update armor calculations to respect base AC + capped DEX + magical modifiers; ensure heavy armor ignores DEX.  
5. **Attunement check:** Confirm attuned status before combat bonuses apply.  
6. **Magical effects:** Hook into pre/ post-attack triggers for autocast or extra damage as defined by item properties.  
7. **Death durability tie-in:** On player death within combat resolver, propagate durability loss event.  
8. **Corpse spawn stub:** Emit a `corpse` item spawn event when players or NPCs die; route it through the item registry but allow implementation to remain a placeholder for now.

**Exit criteria:** Combat test scenarios (proficient vs non, dual wield, armor types, magical bonuses) pass; no regressions in core combat suite.

---

## Phase 5 – Economy & Loot
1. **Currency engine:** Update currency representations across inventory, shops, and drops to support copper/silver/gold/platinum with auto conversion helpers.  
2. **Shop prices:** Adjust shop schemas to price items using the four-tier currency; include identify/repair services pricing.  
3. **Loot tables:** Respect free-for-all pickup; ensure loot spawns as world entities rather than auto-distributed.  
4. **Containers:** Update container loot generation to honor stacking rules; ensure currency piles stack correctly.  
5. **Corpse container roadmap:** Document corpse items as specialized containers that hold defeated character loot, including ownership/decay rules, but defer full implementation until respawn system work.  
6. **Quest rewards:** Keep special quest items unbound by default unless explicitly marked `bindOnEquip`.

**Exit criteria:** Shop transactions, loot pickup, and currency conversions covered by tests; FFA loot verified via simulated multi-player scenario.

---

## Phase 6 – Content & Domain Integration
1. **Default item set:** Build exemplar weapons/armor/consumables per design in `/world/<realm>/items`.  
2. **Tutorial quest:** Script the initial quest handing out starter gear once players complete onboarding.  
3. **Documentation:** Update worldbuilder docs to explain new item schema, binding options, attunement, stacking defaults.  
4. **Migration scripts:** If legacy items exist, add migration tooling to convert into new schema.

**Exit criteria:** Sesame Street sample items load cleanly; tutorial quest functional; docs published in `docs/systems`.

---

## Phase 7 – QA & Launch Checklist
1. **Regression tests:** Run full test suite, including combat benchmarks and performance profiling with 100+ unique items.  
2. **Playtest:** Execute scripted play sessions covering inventory limits, dual wield, identification, attunement, death durability.  
3. **Balance review:** Validate hit rates, AC progression, and economy pacing align with design.  
4. **Bug triage:** Track remaining issues in issue tracker; ensure blockers resolved before launch.  
5. **Deployment prep:** Update release notes, enable feature flags if needed, and schedule phased rollout.

**Exit criteria:** All tests green, no critical bugs outstanding, sign-off from design/stakeholders.

---

## Implementation Notes for Claude
- Favor modular files under `/src/items` and `/src/systems/equipment` to mirror existing architecture.  
- Keep configurations (slot counts, weight formulas, stack caps, penalties) in `/src/config/itemsConfig.js` for easy tuning.  
- Add concise inline comments only for non-obvious logic (e.g., hybrid encumbrance math).  
- Every phase should land with passing tests; do not roll into the next phase with red builds.  
- When in doubt, re-read the three source documents and confirm alignment with recorded decisions.  
- Corpse containers are future-facing: keep interfaces flexible so they can inherit from core container logic without major refactors.

Deliver progress phase-by-phase, opening PRs or change sets only once the phase exit criteria are met.
