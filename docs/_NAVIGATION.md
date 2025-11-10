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
