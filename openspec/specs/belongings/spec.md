---
title: Personal Belongings Checklist
status: Draft
version: 1.0.0
created_at: 2026-06-30
updated_at: 2026-10-17
authors: [shunki]
---

# Specification: Personal Belongings Checklist

## 1. Executive Summary
- **Problem Statement**: Users need a simple way to track personal belongings to ensure nothing is left behind.
- **Target Users**: Individuals preparing for travel or moving.
- **Success Metrics**: 100% of items marked as packed are accounted for.

## 2. Scope
### 2.1 In Scope
- Adding items to the checklist.
- Marking items as packed.
- Viewing the checklist.

### 2.2 Out of Scope
- User authentication.
- Cloud synchronization.
- Categorization of items.

## 3. Functional Requirements
### 3.1 Checklist Management
#### FR-001: Add Item
- **Priority**: Must
- **Acceptance Criteria**:
  - Given the user is on the checklist page
  - WHEN user adds a new item
  - THEN the item appears in the checklist

#### FR-002: Mark Item as Packed
- **Priority**: Must
- **Acceptance Criteria**:
  - Given an item exists in the checklist
  - WHEN user marks an item as packed
  - THEN the item status is updated to "packed"

#### FR-003: Delete Checklist
- **Priority**: Must
- **Acceptance Criteria**:
  - Given multiple checklists exist and one checklist is selected
  - WHEN the user confirms deletion of the selected checklist
  - THEN the checklist is removed and the view returns to the all-checklists view with no checklist selected

## 4. Non-Functional Requirements
| Category | Requirement | Target |
|----------|-------------|--------|
| Performance | Load time | <1s |
| Accessibility | Keyboard navigation | Supported |

## 5. Data Model
- **Item**: { id: string, name: string, packed: boolean, created_at: datetime }

## 6. Test Strategy
| Test Type | Coverage Target |
|-----------|-----------------|
| Unit | >80% |
| E2E | Happy paths |

### 6.1 Coverage Scope
- The coverage denominator includes executable TypeScript in `src/components`, `src/hooks`, and `src/lib`, except `src/lib/types.ts` and declaration files. Vitest configuration and `scripts/check-coverage-gate.mjs` maintain the same source inventory.
- `src/app/page.tsx` and `src/app/layout.tsx` are outside the unit-coverage denominator because they are thin Next.js entrypoints. User-visible page flows are validated with Playwright E2E tests; revisit this exclusion if application logic is added to either entrypoint.
- Coverage represents execution of user-facing contracts and data-preserving behavior. Keep reachable interaction outcomes in scope, including dismissing the completion overlay, committing a rename on blur, rejecting empty list submission, and a drag ending at its original insertion position (which must not reorder items).
- Effective source exclusions are limited to the thin page/layout entrypoints and branches suppressed by working local V8 directives: the module-private `SidebarListPresentation` and `SidebarCreateEntry` helpers, plus the valid-name no-op side of new-list blur; successful debounced persistence (also verified by Playwright save/reload); `useDragReorder` missing-container and stale-index guards, a queued long-press callback after cleanup, cancellation without an active drag, the initial press having no previous timer to clear, and same-index pointer movement including Y-only `currentY` bookkeeping; the first-list/no-match selection no-op in `useChecklists`; and non-Enter keys in the item input. The same-index path only records `currentY`, which is not read for UI, indicator, drop-index, or final-order behavior; restore coverage if that changes. `SidebarListPresentation` is verified by Playwright tests `shows seed checklists in sidebar`, `selecting a checklist displays its items`, `show more / collapse`, and `deleting a checklist with confirmation`; `SidebarCreateEntry` is verified by `show more / collapse` and `adding a new checklist via sidebar`. The valid-name blur branch is exercised by `adding a new checklist via sidebar`; the blank-name blur branch remains in unit coverage. Each ignore carries its reason and reassessment condition; revisit the Sidebar helper exclusions if a named E2E is removed or its visibility/selection behavior changes, and revisit valid-name blur if it gains a user-visible effect.
- E2E verification does not generally remove source from the raw Vitest denominator. Only the helpers and branches listed above are excluded via local directives. Other E2E-confirmed behavior, including raw Sidebar presentation branches outside those helpers, remains subject to raw Vitest floors. Review-classified raw misses remain separate from implemented exclusions and do not alter raw Vitest totals or floors.
- Keep reachable interaction outcomes in scope, including reduced-motion behavior, keyboard list creation/cancellation, failed persistence notification, and drag completion at its original insertion position.
- Reassess exclusions when keyboard shortcuts, selection ordering, drag event ownership, list mounting, pointer movement side effects, or timer cleanup changes. Remove an exclusion and add behavior coverage if the path gains a supported user-visible outcome. Do not broaden exclusions to raise a percentage or avoid testing a meaningful interaction.
- Keep global and per-directory floors as raw Vitest thresholds in `vitest.config.ts` and validate the generated report against the configured source inventory through the coverage gate. E2E coverage validates behavior contracts separately and does not count toward the Vitest denominator or floors.
