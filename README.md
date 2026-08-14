# Mote Studio

Mote Studio is a local-first character and motion lab for designing tiny animated SVG characters. Start with a silhouette, eyes, and color, or open the Motion Studio to build reusable expressions, multi-step animations, procedural surfaces, and multi-avatar projects.

The interface was built from scratch around a dark tool dock and a bright live canvas. Its motion language is inspired by playful shape studies: spring-based morphs, natural blinking and independent winks, pointer gaze, idle drift, and a continuously editable spherical face rig.

![Mote Studio on desktop](docs/screenshots/mote-studio-desktop.png)

<p align="center">
  <img src="docs/screenshots/mote-studio-mobile.png" width="390" alt="Mote Studio's responsive mobile interface" />
</p>

## Features

- Fourteen curated SVG silhouettes with smooth path morphing
- Twenty-five morphable eye expressions reconstructed from the technical reference
- Eleven contrast-aware colors and adaptive eye color
- Calm, playful, and kinetic motion personalities
- Automatic morph cycle with a visible pause control
- Twelve data-driven face performances combining 4–5 eye morph and rig keyframes with visible turn, spacing, scale, gaze, tilt, height, or depth choreography
- A versioned Animation Builder with reusable expressions, reorderable steps, hold and transition timing, spring/smooth/snappy transitions, and once/loop/ping-pong playback
- Pause, resume with preserved timing, stop, and replay controls
- Linked or independent left/right eye width, height, offset, and rotation editing
- Pointer-following gaze, spring-based expression changes, click-to-blink, and independent winks
- A procedural face rig with visual pose presets, a two-dimensional gaze pad, essential sliders, and progressive fine-tuning
- Optional Flat, Sphere, Cube, Cylinder, and Capsule surface projections with depth, pitch, yaw, and roll controls
- A local multi-avatar library with copy-on-write behavior: characters share defaults until one is edited
- Silhouette-aware eye clipping in the live preview, pose thumbnails, and exported SVG
- Local image textures with drag-and-drop and inline validation
- Versioned project JSON import and export with stable avatar, expression, animation, and step IDs
- Dependency-free SVG, 512/1024/2048 PNG Photo Mode, standalone JavaScript, and React component export
- Local MCP server for agent-generated Motes, editable projects, and resolved animation timelines
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
- Model Context Protocol TypeScript SDK 2
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

## Deployment

The repository includes a Vercel configuration for its Vite production build.
Once the GitHub repository is connected to a Vercel project, pushes to `main`
publish `dist` to production and pull requests receive isolated previews.

## Commands

```bash
npm run dev          # Start the development server
npm run test         # Run the test suite once
npm run test:watch   # Run tests in watch mode
npm run lint         # Run Oxlint
npm run format       # Format source and documentation
npm run build        # Type-check and create a production build
npm run check        # Run formatting, lint, tests, and build
npm run mcp:build    # Build the shared core and MCP server
npm run mcp:inspect  # Open the MCP Inspector against the local server
```

## Use with an AI agent

The repository includes a local [Model Context Protocol](https://modelcontextprotocol.io/) server. It exposes the same silhouette, eye-expression, state, palette, procedural rig, motion, and SVG-rendering logic used by the web app, so an agent can create a Mote for another project without scraping the interface.

Available tools:

| Tool                            | Purpose                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `list_mote_presets`             | Discover shapes, surfaces, eyes, expressions, built-in animations, colors, motion styles, and defaults         |
| `create_mote`                   | Generate a reproducible configuration and portable SVG from an optional seed                                   |
| `render_mote_svg`               | Render an exact configuration, procedural surface, and independent-eye transform as dependency-free inline SVG |
| `create_mote_project`           | Create a reproducible version-1 project with one to eight avatars and a shared behavior library                |
| `render_mote_project_animation` | Resolve any project animation into ordered SVG frames with hold and transition metadata                        |

Build the server once, then register its absolute path with Codex:

```bash
npm ci
npm run mcp:build
codex mcp add mote-studio -- node /absolute/path/to/mote-studio/packages/mcp/dist/cli.js
codex mcp list
```

For another MCP client, use the equivalent local command configuration:

```json
{
  "mcpServers": {
    "mote-studio": {
      "command": "node",
      "args": ["/absolute/path/to/mote-studio/packages/mcp/dist/cli.js"]
    }
  }
}
```

The MCP process uses standard input/output only for protocol messages. Its five tools are annotated as local, read-only, non-destructive, and closed-world; they do not read files, write files, or make network requests. Generated animated SVGs embed the selected eye morph and procedural rig performance with reduced-motion protection. Project tools preserve stable IDs and copy-on-write behavior. SVG generation also validates colors, escapes titles, and rejects non-image texture data URLs.

## Repository layout

```text
src/             React studio, animation player, project editor, and exports
packages/core/   Shared shapes, expressions, documents, generator, and SVG renderer
packages/mcp/    Local stdio MCP server and protocol tests
docs/screenshots README captures generated from the running app
```

## How morphing works

Every silhouette resolves to a closed ring of 32 points and every eye to a 16-point ring in `packages/core`. The path generator converts each family to the same number and order of cubic Bézier commands. Because each SVG command topology stays compatible, Motion can interpolate every `d` attribute directly instead of replacing nodes or crossfading between unrelated shapes. Hand-drawn presets such as Cloud, Brain, Teardrop, and Leaf are redistributed along their perimeter before rendering, preserving lobes and pointed profiles while keeping morphs safe.

The fourteen-shape set was redrawn as code-native geometry after reference-only silhouette studies. Cloud uses a dominant central crown, two nested shoulder lobes, soft outer puffs, and a grounded baseline. Brain is a separate asymmetric cortical silhouette whose alternating edge lobes stay readable at icon size. No generated bitmap or third-party AGPL source is included in the application, exports, or package output.

Procedural surfaces are a progressive layer over the recognizable Mote silhouette rather than a separate 3D modeller. Sphere, Cube, Cylinder, and Capsule generate highlights and projected planes in SVG; depth and rotation remain editable while the base 32-point path stays morph-compatible. This makes Mote Studio more complete without forcing every user into a dense geometry inspector.

Ambient movement is isolated from body morphing, expression morphing, gaze, blinking, and face turning. The rig follows a spherical projection: each eye travels around a virtual face, compresses with depth, and is clipped against the live silhouette as it reaches an edge. The same clip is embedded in portable SVG exports, so extreme poses never draw outside the character. All eight rig values are continuous and retarget interruptible springs from the pose already on screen. Blink and wink nodes remain mounted and retarget from their current eyelid position when interrupted.

Expressions store an eye contour, the complete face rig, and independent per-eye transforms. Animations reference expressions by stable ID and contain ordered steps with explicit hold and transition timing. Playback is a separate runtime state, so pause preserves the remaining step duration and editing the document never becomes confused with running it. Multi-avatar documents use copy-on-write behavior: avatars read the shared library until their first behavior edit creates a private copy.

## Accessibility

The studio uses semantic `fieldset` groups, labeled controls, roving keyboard tabs, live announcements, visible focus states, and contrast-tested text. `prefers-reduced-motion` disables ambient movement, automatic morphing, and pose performances while preserving the editing workflow. Keyboard pose selection is immediate rather than animated, so focus and state changes never wait on motion.

## Project status

Version 0.2 introduces the project and animation model. The public API may still evolve before version 1.0.

## License

MIT. See [LICENSE](LICENSE).
