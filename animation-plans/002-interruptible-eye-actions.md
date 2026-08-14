# 002 — Make blink and wink playback interruptible

- **Status**: DONE
- **Commit**: ff3f449
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 2 files, medium

## Problem

`src/components/MoteAvatar.tsx:412-478` remounts keyed Motion groups for every
blink and wink and replays fixed keyframe arrays:

```tsx
<motion.g key={blinkKey} animate={sharedBlinkAnimation} />
<motion.g key={`left-${winkTokens.left}`} animate={blinkAnimation} />
```

Rapid clicks restart from the initial open-eye state instead of retargeting from
the current eyelid position. Custom animation playback will need explicit
pause, resume, stop, and replay semantics rather than remount keys.

## Target

Use one persistent eye node per side. Drive eyelid scale with a Motion value and
`animate()` controls that are stopped before a new action begins. Preserve the
current three stages and `320ms` duration for intentional blinks, using
`cubic-bezier(0.23, 1, 0.32, 1)`. The future sequence player must preserve
remaining hold time on pause and must not reset the eye path on resume.

## Repo conventions to follow

- Reuse `EASE_OUT` from `src/components/MoteAvatar.tsx:52`.
- Follow the cleanup pattern used by the turn and performance effects in the
  same component: retain controls and call `.stop()` in cleanup.

## Steps

1. Replace keyed blink/wink wrapper groups with persistent groups whose
   `transform` is driven by side-specific Motion values.
2. On a blink or wink token change, stop prior side controls and animate the
   current value through closed and open states.
3. Keep transform origins at each eye center and keep all eyes clipped to the
   body silhouette.
4. Add tests that fire blink/wink actions rapidly and assert a single persistent
   eye node per side.

## Boundaries

- Do not alter eye SVG paths.
- Do not change the procedural face projection.
- Do not add dependencies.

## Verification

- **Mechanical**: `npm run lint && npm test && npm run build` exits zero.
- **Feel check**: at 10% playback speed, click blink twice mid-close and wink
  both sides quickly; neither eye flashes open from a remount and both settle
  fully open. Reduced motion keeps the static expression.
- **Done when**: the eye groups are persistent, interrupted actions stop their
  predecessor, and tests cover rapid input.
