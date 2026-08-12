# Mote Studio

Mote Studio is a local-first character lab for designing tiny animated SVG characters. Pick a silhouette and color, generate a combination, add an image texture, then export the result as SVG or PNG.

The interface was built from scratch around a dark tool dock and a bright live canvas. Its motion language is inspired by playful shape studies: spring-based morphs, natural blinking, pointer gaze, idle drift, and short orbit bursts that connect state changes.

## Features

- Eight compatible SVG silhouettes with smooth path morphing
- Eleven contrast-aware colors and adaptive eye color
- Calm, playful, and kinetic motion personalities
- Automatic morph cycle with a visible pause control
- Pointer-following gaze and click-to-blink feedback
- Local image textures with drag-and-drop and inline validation
- Deterministic SVG and 1024 × 1024 PNG export
- Persistent preferences in browser storage
- Keyboard-operable tabs and controls
- Reduced-motion support and responsive layouts down to 320 px

Uploaded images never leave the browser. Mote Studio has no backend, account system, analytics, or network upload path.

## Stack

- React 19 and TypeScript
- Vite 8
- Tailwind CSS 4
- Motion for React
- Phosphor Icons
- Vitest and Testing Library
- Oxlint and Prettier

## Getting started

Requirements: Node.js 22 or newer and npm.

```bash
git clone https://github.com/metaforismo/mote-studio.git
cd mote-studio
npm install
npm run dev
```

Open the local URL printed by Vite.

## Commands

```bash
npm run dev          # Start the development server
npm run test         # Run the test suite once
npm run test:watch   # Run tests in watch mode
npm run lint         # Run Oxlint
npm run format       # Format source and documentation
npm run build        # Type-check and create a production build
npm run check        # Run formatting, lint, tests, and build
```

## How morphing works

Every silhouette resolves to a closed ring of 16 points. The path generator converts each ring to the same number and order of cubic Bézier commands. Because the SVG command topology stays compatible, Motion can interpolate the `d` attribute directly instead of replacing nodes or crossfading between unrelated shapes.

Ambient movement is isolated from path morphing, eye gaze, blinking, and orbit effects. Each layer animates only transforms, opacity, color, or the SVG path itself; layout properties are never animated.

## Accessibility

The studio uses semantic `fieldset` groups, labeled controls, roving keyboard tabs, live announcements, visible focus states, and contrast-tested text. `prefers-reduced-motion` disables ambient movement and automatic morphing while preserving the editing workflow.

## Project status

This is an early, functional release. The public API may evolve before version 1.0.

## License

MIT. See [LICENSE](LICENSE).
