# Item & Combat Design Interview Notes

Record each decision after discussing with the user. Keep the explanations handy so they can give an informed answer.

## 1. Encumbrance System
- **Prompt:** How do you want inventory limits to work at launch?
- **Context:** Slot-only is simple, weight-based makes STR matter, hybrid adds both systems but is more complex.
- **Answer:** Favor the hybrid approach so we can enforce both slot counts and STR-based weight limits out of the gate.

## 2. Weapon Proficiency Penalties
- **Prompt:** What should happen when someone wields a weapon they aren’t trained for?
- **Context:** Blocking the equip prevents misuse, attack penalties allow experimentation, damage penalties are another balancing lever but add math.
- **Answer:** Apply attack penalties so off-proficiency use stays possible but meaningfully weaker.

## 3. Armor DEX Modifier Caps
- **Prompt:** Should heavy armor reduce how much DEX can contribute to AC?
- **Context:** No caps keep things simple, tiered caps mimic D&D 5e, percentage reductions offer a middle ground but add calculation overhead.
- **Answer:** Use tiered caps so light armor stays flexible, medium armor caps modestly, and heavy armor ignores DEX bonuses.

## 4. Item Durability (Items Doc)
- **Prompt:** Do you want items to wear down and need repairs?
- **Context:** No durability keeps maintenance low, full durability adds realism and gold sinks, death-only loss offers a focused penalty without constant upkeep.
- **Answer:** Go with death-only durability loss so normal play stays maintenance-free but deaths still sting.

## 5. Magical Item Identification
- **Prompt:** Should magical properties be hidden until players identify items?
- **Context:** Full visibility removes friction, manual identification adds mystery and gameplay loops, gradual discovery is immersive but more complex.
- **Answer:** Require manual identification so magical loot keeps its mystery and supports identify spells/NPCs.

## 6. Item Binding Rules
- **Prompt:** How tightly should special items be bound to a character?
- **Context:** No binding fuels trading, bind-on-equip protects quest rewards yet allows previews, bind-on-pickup locks items immediately but can feel restrictive.
- **Answer:** Default to no binding for now, but keep bind-on-equip available as an optional flag for future special cases.

## 7. Currency Structure
- **Prompt:** What currency model should shops and loot use?
- **Context:** Gold-only is straightforward, multi-currency delivers D&D flavor with conversions, realm currencies add theme but require exchange mechanics.
- **Answer:** Adopt the classic copper/silver/gold/platinum ladder so pricing scales smoothly and keeps the D&D vibe.

## 8. Group Loot Distribution
- **Prompt:** How should loot be shared when a party downs an enemy?
- **Context:** Individual loot avoids disputes but inflates drops, round-robin feels fair but needs order tracking, free-for-all is fast yet encourages ninja-looting.
- **Answer:** Go free-for-all to keep combat fast-paced and let party dynamics handle loot etiquette.

## 9. Item Stacking
- **Prompt:** Do identical items combine in inventory?
- **Context:** No stacking keeps each item unique but clutters bags, infinite stacks help convenience but can undercut limits, capped stacks balance both extremes.
- **Answer:** Keep equipment unstacked but allow consumables/currency to stack with tunable caps for balance.

## 10. Starting Equipment
- **Prompt:** What gear should brand-new players spawn with?
- **Context:** Unarmed nudges them into systems immediately, a basic kit cushions onboarding, guild-specific loadouts create identity but depend on guild implementation.
- **Answer:** Start players unarmed so the opening quest can deliver their first real equipment.

## 11. Dual-Wielding Model
- **Prompt:** How should dual-wielding attacks resolve during combat?
- **Context:** Full D&D uses bonus-action pacing, the simplified option auto-swings twice with lighter math, blending both weapons into one attack is the simplest but least authentic.
- **Answer:** Use the simplified model: auto-second attack each round with reduced damage for the off-hand.

## 12. Heavy Armor Mitigation
- **Prompt:** Should heavy armor grant flat damage reduction in addition to AC?
- **Context:** AC-only mirrors D&D and is easy to balance, adding damage reduction makes armor feel weighty but complicates tuning and risks trivializing weak mobs.
- **Answer:** Stick with AC-only so armor remains straightforward and balance stays predictable.

## 13. Attunement Policy
- **Prompt:** Do powerful magical items require attunement slots?
- **Context:** Full attunement (3 slots) limits stacking, no attunement keeps things simple but risks power creep, light attunement (5 slots) is a compromise.
- **Answer:** Implement full attunement with three slots to rein in legendary item stacking.

## 14. Combat-Side Durability
- **Prompt:** Should combat itself ever degrade equipment durability?
- **Context:** Skipping durability avoids “un-fun tax,” while introducing combat-triggered decay later could act as an economy sink or class hook.
- **Answer:** Skip combat-driven durability for now; we can revisit if the economy needs another sink.
