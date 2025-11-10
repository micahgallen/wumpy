# Action Plan: Documentation Index Reconciliation

**Date:** 2025-11-10
**Based On:** _INDEX_ASSESSMENT.md comprehensive analysis

## Quick Summary

_INDEX.md is NOT outdated - it's the most current index (updated today). However, it needs minor corrections and should explicitly document the dual organizational system (Wiki + Library). The docs/README.md describes a different but complementary system and needs updating to acknowledge both.

## Critical Issues Found

1. **Status Mismatch**: _INDEX.md says "In Reorganization" but work is substantially complete
2. **Missing Directories**: 4 directories exist but aren't documented (architecture, design, proposals, _TEMPLATES)
3. **Broken References**: docs/README.md references non-existent reports/ directory
4. **Dual System Undocumented**: Two organizational systems coexist but relationship is not explained
5. **Legacy Confusion**: Unclear what's "legacy" vs "active" in library/ and systems/

## Recommended Actions

### Phase 1: Immediate Fixes (30 minutes)

#### 1. Update _INDEX.md Header
```markdown
# Wumpy MUD Documentation Index

**Last Updated:** 2025-11-10
**Status:** Reorganization Complete - Maintenance Phase
```

#### 2. Add Missing Directories to _INDEX.md

After line 125, update the "Still Active" section:
```markdown
**Still Active:**
- `/docs/library/` - Practical guides and topical documentation
- `/docs/systems/` - Deep technical design docs by subsystem
- `/docs/architecture/` - Architecture documentation and diagrams
- `/docs/proposals/` - Feature proposals and design drafts
- `/docs/design/` - Design documents
- `/docs/plans-roadmaps/` - Project roadmaps and future plans
- `/docs/operations/` - Operational playbooks and checklists
- `/docs/_TEMPLATES/` - Documentation templates for contributors
```

#### 3. Fix Legacy Section in _INDEX.md

Replace "Completed Reorganization" section (lines 113-118):
```markdown
**Completed Reorganization:**
- `/docs/implementation/` - Moved to `/docs/archive/phase-reports/` ✓
- `/docs/reports/` - MOVED to `/docs/archive/phase-reports/reports/` ✓
- `/docs/reviews/` - Moved to `/docs/archive/old-reviews/` ✓
- Item system docs - Consolidated into wiki, originals in `/docs/archive/superseded/` ✓

**Note:** reports/ directory no longer exists at top level. All reports moved to archive.
```

#### 4. Update docs/README.md - Fix Broken Link

Line 14 currently says:
```markdown
- `reports/` — Completed work: bugfix write-ups, postmortems, and phase summaries.
```

Change to:
```markdown
- `reports/` — MOVED TO ARCHIVE: See `archive/phase-reports/reports/` for completed work.
```

Line 22 currently says:
```markdown
- Latest combat implementation status: `reports/combat/COMBAT_IMPLEMENTATION_STATUS.md`
```

Change to:
```markdown
- Latest combat implementation status: `archive/phase-reports/reports/combat/COMBAT_IMPLEMENTATION_STATUS.md`
```

### Phase 2: Documentation Philosophy (1 hour)

#### 5. Add Philosophy Section to _INDEX.md

Add after "Quick Start" section (after line 22):

```markdown
## Documentation Philosophy

Wumpy uses **two complementary organizational systems**:

### System 1: Wiki (Primary for System Documentation)
- **Location:** `/docs/wiki/`
- **Purpose:** Authoritative documentation on how systems work
- **Maintained by:** Active development (DOC_STANDARDS.md enforced)
- **Organization:** By documentation type (systems, mechanics, architecture, patterns)
- **Use when:** Understanding how code works, contributing changes, architectural decisions

**Navigation:** See [Wiki Index](wiki/_wiki-index.md)

### System 2: Library/Systems (Practical Guides)
- **Location:** `/docs/library/`, `/docs/systems/`, `/docs/operations/`
- **Purpose:** Practical guides, examples, operational runbooks
- **Maintained by:** As needed for specific features
- **Organization:** By topic and development phase
- **Use when:** Quick reference, running operations, implementation examples

**Navigation:** See [Documentation Library](README.md)

### Relationship Between Systems

These are **complementary, not redundant**:
- **Wiki** = "How does combat work?" (system documentation)
- **Library** = "How do I use combat commands?" (practical guide)
- **Reference** = "What are the combat formulas?" (quick lookup)

**Example:**
- Combat system understanding → `wiki/systems/combat-overview.md`
- Combat quick reference → `library/combat/COMBAT_QUICK_START.md`
- Combat stats table → `reference/combat-stats.md`

All three serve different purposes and should be maintained.
```

#### 6. Update docs/README.md Header

Replace lines 1-4 with:
```markdown
# Documentation Library

**Navigation:** This describes the Library/Systems organizational structure. For wiki-based system documentation, see [Wiki Index](wiki/_wiki-index.md). For a complete documentation map, see [Documentation Index](_INDEX.md).

This folder separates active references, operational guides, in-progress plans, and historical archives. The **library** contains practical guides, while the **wiki** contains authoritative system documentation. Both systems are actively maintained and serve complementary purposes.
```

#### 7. Add Directory List to docs/README.md

After line 15, add:
```markdown
- `wiki/` — Wiki-based system documentation (architecture, patterns, mechanics)
- `reference/` — Quick lookup tables (combat stats, item properties)
- `work-logs/` — Chronological session logs documenting development
```

### Phase 3: Enhanced Navigation (2 hours)

#### 8. Create docs/_NAVIGATION.md

Create new file to help users choose their path:

```markdown
# Documentation Navigation Guide

**Lost? Start here.** This guide helps you find the right documentation for your needs.

## Choose Your Path

### I Want to Understand How a System Works
→ **Start with [Wiki Index](wiki/_wiki-index.md)**

The wiki contains authoritative system documentation:
- [Combat System](wiki/systems/combat-overview.md) - How combat works
- [Item System](wiki/systems/item-system.md) - How items work
- [Corpse System](wiki/systems/corpse-system.md) - How corpses work
- [Architecture](wiki/architecture/) - Code structure and patterns
- [Patterns](wiki/patterns/) - How-to guides for common tasks

### I Need Quick Reference Data
→ **Check [Reference](reference/)**

Quick lookup tables with no prose:
- [Combat Stats](reference/combat-stats.md) - Formulas, HP, proficiency
- [Item Properties](reference/item-properties.md) - Item attributes and types

### I Want Practical Examples and Guides
→ **Browse [Library](library/) and [Systems](systems/)**

Topically-organized practical documentation:
- [Combat Quick Start](library/combat/COMBAT_QUICK_START.md) - Player guide
- [Agent Guides](library/general/AGENTS.md) - For AI contributors
- [Admin System](library/admin/admin-system.md) - Admin tools
- [Combat Design](systems/combat/) - Deep technical docs

### I Want to Implement Something New
**Step-by-step:**
1. Check [Wiki Patterns](wiki/patterns/) for how-to guides
2. Read [DOC_STANDARDS.md](../.claude/DOC_STANDARDS.md) for rules
3. Use [Templates](_TEMPLATES/) for any new docs
4. Check [Library](library/) and [Systems](systems/) for examples

**Common tasks:**
- [Adding Commands](wiki/patterns/adding-commands.md)
- [Creating Items](wiki/patterns/creating-items-basics.md)
- [Creating NPCs](wiki/patterns/creating-npcs.md)

### I Want to See Recent Work
→ **Check [Work Logs](work-logs/README.md)**

Chronological development logs:
- [2025-11 Work Logs](work-logs/2025-11/)

### I Want to Plan Future Work
→ **Check [Plans & Roadmaps](plans-roadmaps/)**

- [Features Roadmap](plans-roadmaps/FEATURES_ROADMAP.md)
- [Future Improvements](plans-roadmaps/FUTURE_IMPROVEMENTS.md)

### I Need Historical Context
→ **Check [Archives](archive/)**

- [Phase Reports](archive/phase-reports/) - Completed implementation phases
- [Old Reviews](archive/old-reviews/) - Historical code reviews
- [Superseded Docs](archive/superseded/) - Replaced documentation

### I Want a Complete Map
→ **See [Documentation Index](_INDEX.md)**

Comprehensive map of all documentation with status tracking.

## For AI Agents

**First time contributing?**
1. Read [DOC_STANDARDS.md](../.claude/DOC_STANDARDS.md) - REQUIRED
2. Check [Wiki Index](wiki/_wiki-index.md) - Your primary resource
3. Check [Documentation Index](_INDEX.md) - Complete map
4. Use [Templates](_TEMPLATES/) - For approved new docs

**Key Rules:**
- Update existing wiki pages, don't create new files
- Work logs only for session summaries
- Follow templates for structure
- Link related pages

## Documentation Systems

Wumpy maintains two complementary documentation systems:

| System | Location | Purpose | Use When |
|--------|----------|---------|----------|
| **Wiki** | wiki/ | Authoritative system docs | Understanding code, contributing |
| **Library** | library/, systems/ | Practical guides | Using features, examples |
| **Reference** | reference/ | Quick lookup tables | Finding stats/formulas |
| **Work Logs** | work-logs/ | Development history | Session recovery, context |
| **Archives** | archive/ | Historical context | Understanding past decisions |

Both Wiki and Library are actively maintained. They serve different purposes and are not redundant.

## Still Confused?

Check the [Documentation Index](_INDEX.md) for a complete map with detailed descriptions.
```

#### 9. Add AI Agent Quick Reference to _INDEX.md

Add after "Quick Start (For AI Agents)" section (around line 22):

```markdown
## AI Agent Workflow

**Contributing code?** Follow this workflow:

1. **Before starting:**
   - Read [DOC_STANDARDS.md](../.claude/DOC_STANDARDS.md)
   - Check wiki for existing system docs
   - Check library for practical examples

2. **During work:**
   - Update wiki pages as you modify systems
   - Reference library for patterns
   - Check reference for stats

3. **After session:**
   - Create work log in `/docs/work-logs/YYYY-MM/`
   - Update wiki pages with changes
   - Do NOT create new standalone docs

**Common tasks quick reference:**
- Working on combat? → `wiki/systems/combat-overview.md` + `reference/combat-stats.md`
- Working on items? → `wiki/systems/item-system.md` + `reference/item-properties.md`
- Adding command? → `wiki/patterns/adding-commands.md`
- Creating NPC? → `wiki/patterns/creating-npcs.md`
```

#### 10. Update Main README.md Documentation Section

In /home/micah/wumpy/README.md, update the "For the Organized Minds" section (around line 50):

```markdown
## For the Organized Minds (Green Wumpy Approved)

Our documentation uses two complementary systems - choose your path:

### Navigation Hub
**[Documentation Navigation Guide](docs/_NAVIGATION.md)** - Lost? Start here to find your way

**[Documentation Index](docs/_INDEX.md)** - Complete map of all documentation (yes, we have maps)

**[Wiki](docs/wiki/_wiki-index.md)** - Authoritative system documentation (how things work)

### Quick Paths by Purpose

**Understanding Systems (Wiki):**
- **Systems**: [Combat](docs/wiki/systems/combat-overview.md), [Items](docs/wiki/systems/item-system.md), [Corpses](docs/wiki/systems/corpse-system.md)
- **Architecture**: [Commands](docs/wiki/architecture/command-system.md), [Combat Flow](docs/wiki/architecture/combat-flow.md), [Timers](docs/wiki/architecture/timer-system.md), [Events](docs/wiki/architecture/event-system.md), [Data Schemas](docs/wiki/architecture/data-schemas.md)
- **Patterns**: [Adding Commands](docs/wiki/patterns/adding-commands.md), [Creating Items](docs/wiki/patterns/creating-items-basics.md), [Creating NPCs](docs/wiki/patterns/creating-npcs.md)

**Quick Reference Tables:**
- [Combat Stats](docs/reference/combat-stats.md)
- [Item Properties](docs/reference/item-properties.md)

**Practical Guides (Library):**
- [Combat Quick Start](docs/library/combat/COMBAT_QUICK_START.md) - Player guide
- [Agent Guidelines](docs/library/general/AGENTS.md) - For AI contributors
- [Features Roadmap](docs/plans-roadmaps/FEATURES_ROADMAP.md) - Planned features
```

### Phase 4: Verification (30 minutes)

#### 11. Verify All Links

Run these commands to check for broken links:

```bash
cd /home/micah/wumpy/docs

# Check _INDEX.md links
grep -oP '\[.*?\]\(\K[^\)]+' _INDEX.md | while read link; do
  if [[ ! $link =~ ^http ]]; then
    [ -f "$link" ] || echo "BROKEN in _INDEX.md: $link"
  fi
done

# Check README.md links
grep -oP '\[.*?\]\(\K[^\)]+' README.md | while read link; do
  if [[ ! $link =~ ^http ]]; then
    [ -f "$link" ] || echo "BROKEN in README.md: $link"
  fi
done

# Check wiki index links
grep -oP '\[.*?\]\(\K[^\)]+' wiki/_wiki-index.md | while read link; do
  if [[ ! $link =~ ^http ]]; then
    [ -f "wiki/$link" ] || [ -f "$link" ] || echo "BROKEN in wiki/_wiki-index.md: $link"
  fi
done
```

#### 12. Create Link Verification Report

Document any broken links found and create tracking issue.

### Phase 5: Documentation (15 minutes)

#### 13. Update Work Logs

Create work log for this documentation reorganization work:
- File: `/home/micah/wumpy/docs/work-logs/2025-11/2025-11-10-index-reconciliation.md`
- Use template from `_TEMPLATES/WORK_LOG_TEMPLATE.md`

#### 14. Update _INDEX.md "Recent Updates" Section

Add entry to "Recent Updates" (around line 188):

```markdown
**Recent Updates:**
- 2025-11-10: Documentation index reconciliation
  - Updated status to "Reorganization Complete"
  - Added missing directories (architecture, design, proposals, _TEMPLATES)
  - Fixed legacy section inaccuracies
  - Added documentation philosophy section explaining Wiki + Library dual system
  - Created _NAVIGATION.md for easier navigation
  - Fixed broken links in docs/README.md
  - Added AI agent workflow guide
```

## Estimated Time

- Phase 1 (Immediate Fixes): 30 minutes
- Phase 2 (Philosophy): 1 hour
- Phase 3 (Navigation): 2 hours
- Phase 4 (Verification): 30 minutes
- Phase 5 (Documentation): 15 minutes

**Total:** ~4 hours of focused work

## Success Criteria

- [ ] _INDEX.md status updated to "Reorganization Complete"
- [ ] All existing directories documented in both _INDEX.md and docs/README.md
- [ ] No broken links in any index file
- [ ] Documentation philosophy section explains dual system
- [ ] _NAVIGATION.md created for easier wayfinding
- [ ] docs/README.md acknowledges wiki system
- [ ] Main README.md updated with clear navigation paths
- [ ] AI agent workflow documented
- [ ] Work log created for this session
- [ ] All changes tested and verified

## Long-term Maintenance

### Monthly Review
- Check for new directories not in indexes
- Verify links still work
- Update status of "in progress" items

### When Creating New Directories
- Add to both _INDEX.md and docs/README.md
- Update _NAVIGATION.md
- Document in work log

### When Archiving Content
- Update "Completed Reorganization" section
- Add note to archive/archives-README.md
- Remove from active sections of indexes

## Questions for User

Before proceeding with these changes, confirm:

1. Should both organizational systems (Wiki + Library) be preserved? (Recommendation: YES)
2. Should _NAVIGATION.md be created as a new entry point? (Recommendation: YES)
3. Should we update main README.md or leave it narrative-focused? (Recommendation: Update)
4. Priority order for phases? (Recommendation: 1 → 2 → 3 → 4 → 5)
5. Any directories that should be deprecated/archived?

## Notes

- All paths in this document use absolute references from /home/micah/wumpy/docs/
- Line numbers are approximate and may shift after edits
- Backup _INDEX.md and docs/README.md before making changes
- Test all navigation after Phase 3 completion
- This assessment was performed on 2025-11-10 and reflects that snapshot
