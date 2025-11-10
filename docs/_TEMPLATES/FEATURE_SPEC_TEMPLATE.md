---
title: [Feature Name] Specification
status: draft | approved | implemented
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# [Feature Name] Specification

## Overview

[2-3 paragraphs describing the feature, its purpose, and why it's needed]

## Goals

| Goal | Success Criteria |
|------|------------------|
| Primary goal | How we measure success |
| Secondary goal | How we measure success |

## User Stories

**As a [user type], I want to [action] so that [benefit].**

Examples:
- As a player, I want to loot corpses so that I can recover items from dead NPCs
- As a creator, I want to define custom loot tables so that different NPCs drop different items

## Requirements

### Functional Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| REQ-1: Description | Must Have | Details |
| REQ-2: Description | Should Have | Details |
| REQ-3: Description | Nice to Have | Details |

### Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Performance | < 50ms response | Timer metrics |
| Reliability | 99.9% uptime | Error logs |

## Design

### Data Model

[Tables showing data structures]

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| field1 | string | What it stores | "value" |

### API Design

[Table of functions/methods]

| Function | Parameters | Returns | Purpose |
|----------|------------|---------|---------|
| `doSomething()` | (player, item) | boolean | Description |

### User Interface

[Describe player-facing commands, messages, and interactions]

## Implementation Plan

### Phase 1: [Phase Name]

| Task | Estimate | Dependencies |
|------|----------|--------------|
| Task 1 | 2 hours | None |
| Task 2 | 3 hours | Task 1 |

### Phase 2: [Phase Name]

[Continue for each phase]

## Testing Strategy

| Test Type | Coverage | Approach |
|-----------|----------|----------|
| Unit Tests | Core functions | Jest/Mocha |
| Integration Tests | Full workflow | Manual testing |

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Risk 1 | High | Medium | How to prevent/handle |

## Open Questions

- Question 1?
- Question 2?

## References

- [Related System](../wiki/systems/related.md)
- [Related Spec](other-spec.md)

---

**Max Length:** 500 lines
**Format:** Tables for requirements, data models, and planning
**Prose:** For overview, design rationale, and context
