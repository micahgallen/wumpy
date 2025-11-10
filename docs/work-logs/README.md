# Work Logs

Chronological session logs documenting development work on the Wumpy MUD project.

## Purpose

Work logs provide:
1. **Session recovery** - Resume interrupted work with full context
2. **Development history** - Track what was done when
3. **AI context** - Help AI agents understand recent changes
4. **Decision tracking** - Record why choices were made

## Organization

Work logs are organized by year and month:

```
work-logs/
├── README.md (this file)
├── 2025-11/
│   ├── 2025-11-08-attunement-identify.md
│   ├── 2025-11-09-corpse-system-phase1.md
│   └── ...
└── 2025-12/
    └── ...
```

## Naming Convention

**Format:** `YYYY-MM-DD-brief-description.md`

**Examples:**
- `2025-11-09-corpse-system-phase1.md`
- `2025-11-08-attunement-identify.md`
- `2025-11-10-combat-bug-fixes.md`

## Work Log Template

Use the template at `/docs/_TEMPLATES/WORK_LOG_TEMPLATE.md` for all work logs.

**Key sections:**
- Session Goal - What you set out to do
- What Was Done - Prose summary (2-3 paragraphs)
- Files Changed - Created, modified, deleted
- Decisions Made - Table of key choices
- Known Issues - Problems discovered
- Next Session - What to tackle next
- Context for AI Resume - Links and key functions

## Guidelines

**DO:**
- Create one work log per significant session
- Use tables for decisions and file lists
- Keep prose summaries to 2-3 paragraphs
- Link to relevant wiki pages for context
- Include "Context for AI Resume" section

**DON'T:**
- Include code blocks (link to files instead)
- Create nested bullet lists
- Exceed 150 lines
- Duplicate information in wiki pages

## Finding Work Logs

**By date:** Navigate to `YYYY-MM/` folder
**By topic:** Use grep or search in your editor
**Recent work:** Check the latest month folder

## Integration with Wiki

Work logs are **historical records** of sessions.

For **current system documentation**, see `/docs/wiki/`.

Work logs capture the **development journey**. Wiki pages capture the **current state**.

## Work Logs vs Other Docs

| Type | Location | Purpose | When to Use |
|------|----------|---------|-------------|
| **Work Log** | `/docs/work-logs/` | Session history | After each dev session |
| **Wiki Page** | `/docs/wiki/` | Current system docs | When updating system understanding |
| **Spec** | `/docs/specs/` | Feature specifications | Before implementing new feature |
| **Decision Log** | `/docs/decisions/` | Important design decisions | For architectural choices |

## 2025-11 Logs

- [2025-11-08: Attunement & Identify](2025-11/2025-11-08-attunement-identify.md) - Implemented magical item identification and attunement system
- [2025-11-09: Corpse System Phase 1](2025-11/2025-11-09-corpse-system-phase1.md) - Core infrastructure for corpse management with TimerManager and CorpseManager

More logs will be added as work continues...
