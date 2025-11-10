# Corpse & Respawn System - Review Summary

**Date:** 2025-11-08
**Reviewer:** Combat Systems Architect
**Status:** ✅ APPROVED FOR IMPLEMENTATION

---

## Quick Reference

### Primary Documents
1. **Combat Integration Review** - `/docs/reviews/CORPSE_RESPAWN_COMBAT_INTEGRATION_REVIEW.md` (30+ pages)
2. **Test Specification** - `/docs/testing/CORPSE_SYSTEM_TEST_SPECIFICATION.md` (40+ tests)
3. **Design Specification** - `/docs/systems/containers/CORPSE_CONTAINER_SPEC.md` (original design)

---

## Executive Summary

The corpse and respawn system integration has been thoroughly reviewed from a combat mechanics perspective. The system is **ready for implementation** with clean integration points identified and comprehensive testing planned.

### Verdict: READY TO BUILD ✅

**Confidence Level:** HIGH

**Primary Blocker:** Container system infrastructure (does not exist yet)

**Estimated Implementation Time:** 10-14 hours for complete MVP

---

## Key Findings

### What Works
- ✅ Combat system has perfect integration points (`removeNPCFromRoom()`)
- ✅ LootGenerator is fully implemented and ready to use
- ✅ Respawn service exists with clear modification points
- ✅ NPC death flow is clean and well-structured
- ✅ XP award happens before corpse creation (correct order)

### What's Missing
- ❌ Container system (base class, manager, subclasses)
- ❌ Corpse-specific container implementation
- ❌ Decay timer processing loop
- ❌ Loot command implementation
- ❌ NPC loot configuration (lootTables property)

---

## Implementation Phases

### Phase 1: Container Foundation (2-3 hours)
**Priority:** CRITICAL
**Deliverables:**
- `/src/systems/containers/Container.js` - Base container class
- `/src/systems/containers/ContainerManager.js` - Global manager singleton
- `/src/systems/containers/CorpseContainer.js` - Corpse subclass
- Add `room.corpses = []` to world initialization

**Integration Point:**
```javascript
// In CombatEncounter.removeNPCFromRoom()
const corpse = ContainerManager.createCorpse({
    npcId: npcId,
    npcName: npc.name,
    roomId: room.id,
    items: LootGenerator.generateNPCLoot(npc).items,
    decayTime: Date.now() + config.corpses.npc.decayTime[npc.tier]
});

room.corpses.push(corpse);
```

### Phase 2: Combat Integration (2-3 hours)
**Priority:** HIGH
**Files to Modify:**
- `/src/combat/CombatEncounter.js` - Add corpse creation to `removeNPCFromRoom()`
- `/world/sesame_street/npcs/*.js` - Add lootTables, challengeRating to all NPCs

**Example NPC Update:**
```json
{
    "id": "red_wumpy",
    "name": "Red Wumpy",
    "level": 1,
    "hp": 20,
    "challengeRating": 1,
    "lootTables": ["trash_loot"],
    "tier": "trash"
}
```

### Phase 3: Looting System (1-2 hours)
**Priority:** HIGH
**Files to Create:**
- `/src/commands/core/loot.js` - New loot command

**Command Signature:**
```
loot <corpse>
loot corpse of red wumpy
```

### Phase 4: Decay & Respawn (2-3 hours)
**Priority:** HIGH
**Files to Modify:**
- `/src/systems/containers/ContainerManager.js` - Add decay processing
- `/src/respawnService.js` - Add corpse awareness

**Decay Loop:**
```javascript
// In ContainerManager
static startDecayLoop(world, allPlayers) {
    setInterval(() => {
        this.processCorpseDecay(world, allPlayers);
    }, 60000);  // Every minute
}
```

**Respawn Check:**
```javascript
// In RespawnService
checkAndRespawn() {
    const missingNpcIds = initialRoom.npcs.filter(npcId => {
        if (currentRoom.npcs.includes(npcId)) return false;
        if (this.hasActiveCorpse(npcId, currentRoom)) return false;
        return true;
    });
    // ... respawn logic
}
```

### Phase 5: Testing & Balance (2-3 hours)
**Priority:** MEDIUM
**Deliverables:**
- Unit tests for all components (40+ tests)
- Integration tests for full cycle
- Manual test execution
- Balance tuning

---

## Combat Balance Recommendations

### Respawn Timers
| NPC Type | Corpse Decay | Respawn Delay | Total |
|----------|--------------|---------------|-------|
| Trash (L1-5) | 5 minutes | Immediate | 5 min |
| Standard (L6-10) | 5 minutes | Immediate | 5 min |
| Elite | 10 minutes | Immediate | 10 min |
| Boss | 30 minutes | 30 minutes | 60 min |

**Rationale:**
- Prevents rapid farming
- Gives players time to loot
- Creates scarcity for bosses
- Balances against economy inflation

### Loot Configuration
| NPC Tier | Items | Bonus Chance | Empty Chance |
|----------|-------|--------------|--------------|
| Trash | 1 | 10% | 20% |
| Standard | 2 | 20% | 10% |
| Elite | 3 | 30% | 5% |
| Boss | 5 | 50% | 0% |

### Currency Ranges (Current Implementation)
- CR0: 1-5 copper (~3 avg)
- CR1: 5-20 copper (~12 avg)
- CR2: 10-50 copper (~30 avg)
- CR3: 25-100 copper (~62 avg)
- CR4: 50-200 copper (~125 avg)
- CR5+: 100-1000 copper (~550 avg)
- Boss: 1000-10000 copper (~5500 avg)

**Validation Needed:** Cross-reference with item prices and player progression to ensure economy balance.

---

## Critical Edge Cases

### 1. Multi-Player Combat
**Status:** NOT SUPPORTED IN MVP
**Current Limitation:** CombatEncounter only handles 2 participants (1v1)
**Design Decision:** Free-for-all looting (first player to loot gets items)
**Future Enhancement:** Group combat + loot instancing

### 2. Corpse Movement
**Decision:** ALLOW for MVP
**Implementation:**
- Corpse weight: ~150 lbs (very heavy)
- Respawn checks all rooms for corpse, not just spawn room
- Decay works regardless of location

### 3. Respawn While Players Present
**Decision:** RESPAWN REGARDLESS
**Rationale:**
- More predictable for players
- Prevents spawn camping (NPC attacks back)
- Adds risk/reward to looting

### 4. Server Restart with Active Corpses
**Decision:** DECAY ALL CORPSES ON RESTART (MVP)
**Rationale:**
- Simpler implementation
- Acceptable for MVP
- Can enhance later with persistence

### 5. Corpse Decay During Looting
**Handling:** Cancel loot operation, display message
**Message:** "The corpse decays to dust before you can loot it!"

---

## Integration Points (Code References)

### Current NPC Death Handling
**File:** `/src/combat/CombatEncounter.js`

**Lines 77-90:** Death during flee opportunity attack
**Lines 118-136:** Normal combat death
**Lines 178-196:** `endCombat()` method

**Key Method:** `removeNPCFromRoom(npc)` - Lines 203-219

This is the **PERFECT integration point** for corpse creation.

### Loot Generation
**File:** `/src/systems/loot/LootGenerator.js`

**Method:** `generateNPCLoot(npc)` - Lines 276-316

Returns: `{ items: Array<ItemInstance>, currency: number }`

**Ready to use** - no modifications needed.

### Respawn Service
**File:** `/src/respawnService.js`

**Method:** `checkAndRespawn()` - Lines 26-58

**Modification Required:** Add corpse existence check before respawning.

---

## Testing Checklist

### Unit Tests (40+ tests)
- [ ] Container base class (10 tests)
- [ ] Corpse container (8 tests)
- [ ] Container manager (10 tests)
- [ ] Loot generation (12+ tests)

### Integration Tests (15 tests)
- [ ] Combat → corpse creation (5 tests)
- [ ] Corpse decay → respawn (5 tests)
- [ ] Full cycle test (5 tests)

### Balance Tests (5 tests)
- [ ] Currency generation rates
- [ ] Item drop frequencies
- [ ] Respawn timer validation
- [ ] Economy impact analysis
- [ ] Boss vs trash loot comparison

### Manual Tests (5 scenarios)
- [ ] Basic death and looting
- [ ] Corpse decay and respawn
- [ ] Boss loot quality
- [ ] Multiple corpses in room
- [ ] Corpse movement (if applicable)

### Performance Tests (2 tests)
- [ ] 100 corpse accumulation
- [ ] Decay processing performance

---

## Configuration Files

### New Config File Required
**File:** `/src/config/corpsesConfig.js`

```javascript
module.exports = {
    npc: {
        decayTime: {
            trash: 300000,      // 5 min
            standard: 300000,   // 5 min
            elite: 600000,      // 10 min
            boss: 1800000       // 30 min
        },
        respawnDelay: {
            trash: 0,
            standard: 0,
            elite: 0,
            boss: 1800000       // 30 min
        },
        weight: 150,
        isMoveable: true,
        isOpen: true
    }
};
```

### NPC Definition Updates Required
All NPCs need:
- `challengeRating: <number>`
- `lootTables: [array of loot table names]`
- `tier: 'trash' | 'standard' | 'elite' | 'boss'`

---

## Success Criteria

### Functional Requirements
- ✅ NPC death creates corpse in room
- ✅ Corpse contains LootGenerator items
- ✅ Players can examine corpse
- ✅ Players can loot corpse
- ✅ Corpse decays after timer
- ✅ NPC respawns after decay
- ✅ Respawn restores full HP
- ✅ Respawn at original location

### Combat Integration
- ✅ XP awarded before corpse
- ✅ Combat state cleaned up
- ✅ Death messages correct
- ✅ No duplicate corpses
- ✅ Works with flee mechanic
- ✅ Works with off-hand attacks

### Balance
- ✅ Loot matches economy design
- ✅ Currency balanced for progression
- ✅ Respawn timers prevent farming
- ✅ Boss loot > trash loot
- ✅ No exploits

### Performance
- ✅ Decay processing < 10ms
- ✅ No memory leaks
- ✅ Efficient corpse lookup
- ✅ Handles 100+ corpses

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Container scope creep | HIGH | Build minimal, corpse-focused system only |
| Loot economy imbalance | MEDIUM | Start conservative, monitor, adjust |
| Respawn exploits | MEDIUM | Implement delays, monitoring, admin tools |
| Memory leaks | LOW | Decay loop guarantees cleanup |

---

## Next Steps

### For mud-architect Agent:
1. Review this summary and detailed documents
2. Implement Phase 1 (Container Foundation)
3. Implement Phase 2 (Combat Integration)
4. Implement Phase 3 (Looting System)
5. Implement Phase 4 (Decay & Respawn)
6. Test and iterate

### For Combat Systems Architect:
1. ✅ Review complete
2. ✅ Documents created
3. ✅ Integration points identified
4. ✅ Balance recommendations provided
5. ✅ Test specifications written
6. Standing by for implementation support

---

## Files Created in This Review

1. `/docs/reviews/CORPSE_RESPAWN_COMBAT_INTEGRATION_REVIEW.md` - 30+ page detailed analysis
2. `/docs/testing/CORPSE_SYSTEM_TEST_SPECIFICATION.md` - 40+ test specifications
3. `/docs/reviews/CORPSE_SYSTEM_REVIEW_SUMMARY.md` - This document

---

## Contact

**Combat Systems Architect**
- Focus: Combat mechanics, balance, integration
- Availability: On-demand for implementation questions
- Escalation: Critical balance issues or design conflicts

**mud-architect Agent**
- Focus: Implementation, testing, deployment
- Next Action: Phase 1 implementation
- Collaboration: Review findings and proceed

---

**Review Status:** ✅ COMPLETE & APPROVED

**Implementation Green Light:** YES - Proceed with Phase 1

**Last Updated:** 2025-11-08
