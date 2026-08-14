# 001 — Preserve useful reduced-motion feedback

- **Status**: DONE
- **Commit**: ff3f449
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 2 files, small

## Problem

`src/index.css:49-61` forces every animation and transition to `0.01ms`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

This removes useful opacity and color feedback as well as positional movement.
The avatar already branches with `useReducedMotion`, so the global override is
broader than necessary.

## Target

Keep a reduced-motion media query that disables smooth scrolling and the named
decorative skeleton animation. Preserve opacity and color transitions at up to
`200ms cubic-bezier(0.23, 1, 0.32, 1)`. Positional avatar motion continues to be
disabled by the existing `useReducedMotion()` branches.

## Repo conventions to follow

- `src/components/MoteAvatar.tsx:346-364` already branches avatar movement with
  `useReducedMotion()`.
- Add `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` to `:root` in
  `src/index.css` and reuse it.

## Steps

1. In `src/index.css`, remove the universal duration override and keep only
   `html { scroll-behavior: auto; }`.
2. In `src/App.css`, stop `.skeleton::after` under reduced motion and leave a
   static highlight rather than removing the loading state.
3. Verify every transform animation in React remains guarded by
   `useReducedMotion()` or `motion-safe:`.

## Boundaries

- Do not remove focus, color, or opacity feedback.
- Do not add dependencies.
- Do not change avatar choreography values.

## Verification

- **Mechanical**: `npm run lint && npm test && npm run build` exits zero.
- **Feel check**: emulate reduced motion; the avatar does not drift, morph, turn,
  or auto-blink, while button focus/color feedback and the static loading state
  remain legible.
- **Done when**: no global `0.01ms !important` rule remains and reduced-motion
  tests cover the static avatar and loading state.
