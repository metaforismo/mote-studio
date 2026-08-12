# Contributing

Thanks for improving Mote Studio.

## Development workflow

1. Create a focused branch from `main`.
2. Install exact dependencies with `npm ci`.
3. Keep UI changes keyboard-operable and compatible with reduced motion.
4. Add or update tests for behavior changes.
5. Run `npm run check` before opening a pull request.

Keep pull requests small enough to review visually and technically. Describe the user-facing change, include before/after captures for visual work, and call out any behavior that could affect exported files.

## Shape presets

All morphable body paths must keep the same command topology. Add new presets through the point-ring helpers in `src/lib/shapes.ts`, then extend the path compatibility tests.

## Reporting issues

Use the repository issue template for reproducible bugs. For security or privacy concerns, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
