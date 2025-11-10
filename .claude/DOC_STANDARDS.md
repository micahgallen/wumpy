# Documentation Standards for AI Agents

## CRITICAL RULES

1. **NO NEW MARKDOWN FILES** without explicit user approval
2. **UPDATE EXISTING DOCS** in /docs/wiki/ instead of creating new files
3. **USE TEMPLATES** from /docs/_TEMPLATES/ for any new docs
4. **WORK LOGS ONLY** for session summaries (use /docs/work-logs/)

## Documentation Types

| Type | Location | Max Length | Format |
|------|----------|------------|--------|
| **System Overview** | /docs/wiki/systems/ | 400 lines | Tables + prose |
| **Mechanic Detail** | /docs/wiki/mechanics/ | 300 lines | Tables + formulas |
| **Architecture** | /docs/wiki/architecture/ | 350 lines | Diagrams + tables |
| **Pattern/How-To** | /docs/wiki/patterns/ | 250 lines | Steps + examples |
| **Reference** | /docs/reference/ | 200 lines | Tables only |
| **Work Log** | /docs/work-logs/ | 150 lines | Structured log |
| **Feature Spec** | /docs/specs/ | 500 lines | Formal spec |

## Formatting Rules

### NO BULLETS EXCEPT:

- Simple lists (3-5 items max)
- Feature checklists (completed/pending)
- File lists

### USE INSTEAD:

- **Tables** for properties, stats, comparisons
- **Prose summaries** for explanations (2-3 paragraphs)
- **Code blocks** with brief inline comments
- **Structured sections** with clear headers

### Example - WRONG:

```markdown
**Weapon Properties:**
- name: The display name of the weapon
- type: Must be 'weapon'
- weaponType: The specific weapon category (longsword, dagger, etc.)
  - Used for proficiency checks
  - Determines damage dice
- handedness: How many hands required
  - one-handed: Single hand, allows shield
  - two-handed: Both hands, no shield
  - versatile: Can use one or two hands
    - Different damage dice for each mode
```

### Example - CORRECT:

```markdown
## Weapon Properties

Weapons in Wumpy use the following property schema:

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `name` | string | Display name | "Longsword of Fire" |
| `type` | string | Must be "weapon" | "weapon" |
| `weaponType` | string | Category for proficiency | "longsword" |
| `handedness` | enum | Hand requirements | "versatile" |
| `damageDice` | string | One-handed damage | "1d8" |
| `damageDiceTwo` | string | Two-handed damage (versatile) | "1d10" |

**Handedness Options:**
- **one-handed**: Single hand, allows shield/off-hand weapon
- **two-handed**: Requires both hands, no off-hand items
- **versatile**: Player choice, uses `damageDice` or `damageDiceTwo`
```

## Navigation Requirements

Every wiki page must have frontmatter:

```markdown
---
title: Page Title
status: current | draft | deprecated
last_updated: YYYY-MM-DD
related: [page1, page2, page3]
---

[Opening paragraph with context]

## See Also

- [Related Page 1](../path/to/page1.md)
- [Related Page 2](../path/to/page2.md)
```

## Before Creating ANY New Doc

1. Check `/docs/_INDEX.md` - does this fit existing structure?
2. Check `/docs/wiki/` - can you update an existing page?
3. Check templates - are you using the right format?
4. Ask user for approval if creating a new category

## Session End Protocol

1. Update relevant wiki pages with new info
2. Create ONE work log in `/docs/work-logs/YYYY-MM/`
3. Update `/docs/_INDEX.md` if structure changed
4. DO NOT create reports, summaries, or standalone docs

## Content Guidelines

### Tables Over Bullets

Use tables for:
- Object properties/schemas
- Comparisons
- Reference data (stats, formulas, etc.)
- Status tracking
- Feature matrices

### Prose Over Nested Bullets

Use 2-3 paragraph prose summaries instead of deeply nested bullet points. Save bullets for simple 3-5 item lists only.

### Code Examples

Keep code examples brief:
- Show the essential pattern
- Use inline comments sparingly
- Link to actual source files for full implementation

### Length Limits

Respect maximum line counts:
- Forces focused, well-scoped docs
- Prevents "AI slop" dump docs
- Keeps docs readable and maintainable
- Fits better in AI context windows

If you need more space, split into multiple focused docs with linking.

## Wiki-Style Linking

Create a web of interconnected docs:
- Use "See Also" sections
- Reference related pages in prose
- Add `related` frontmatter field
- Think like Wikipedia - small focused articles with links
