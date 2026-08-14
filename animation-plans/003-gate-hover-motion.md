# 003 — Gate hover motion to precise pointers

- **Status**: DONE
- **Commit**: ff3f449
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 2 files, small

## Problem

Interactive controls such as `src/App.tsx:380-405` and
`src/App.tsx:460-516` apply hover color and transform utilities without checking
input capability. Touch browsers can retain a false hover after a tap.

## Target

Run hover-only transforms and color shifts inside
`@media (hover: hover) and (pointer: fine)`. Keep press feedback at
`scale(0.97)` with `160ms cubic-bezier(0.23, 1, 0.32, 1)` and keep visible
keyboard focus rings on every control.

## Repo conventions to follow

- Preserve Tailwind utilities for static appearance and focus state.
- Put reusable hover/press classes in `src/App.css`, beside other studio
  interaction styles.

## Steps

1. Add reusable `.mote-interactive` and `.mote-brand-mark` rules to
   `src/App.css`; gate their hover transforms with the precise-pointer query.
2. Replace transform-related hover utilities on the brand mark, stage controls,
   tabs, and inspector buttons with the reusable classes.
3. Keep `:active` press feedback outside the hover query and disable it for
   disabled controls.
4. Add a DOM test that confirms the reusable class is present on representative
   stage and inspector controls.

## Boundaries

- Do not change control labels or layout.
- Do not remove any focus-visible ring.
- Do not add dependencies.

## Verification

- **Mechanical**: `npm run lint && npm test && npm run build` exits zero.
- **Feel check**: on a touch viewport, tapping a control leaves no stuck hover;
  with a mouse, hover is subtle; keyboard focus remains unmistakable. Reduced
  motion preserves color feedback and drops nonessential transform movement.
- **Done when**: hover transforms are capability-gated and press/focus states
  still work independently.
