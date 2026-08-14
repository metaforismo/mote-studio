# Mote Studio document architecture

Mote Studio 0.2 stores creative work as a versioned, local-first document.
Runtime playback is deliberately separate from durable project data.

## Durable model

- `MoteStudioDocument.version` gates migrations.
- Avatars, expressions, animations, and steps have stable string IDs.
- An avatar stores appearance and geometry in `config`.
- `behavior: null` means the avatar reads the shared expression and animation
  library.
- The first behavior edit clones that library into the avatar. Later edits are
  isolated. This is copy-on-write, not hidden global mutation.
- Animation steps reference expressions by ID and store hold time, transition
  time, and transition style.

The parser rejects unsupported versions, empty avatar sets, duplicate avatar
IDs, and missing behavior libraries. Numeric face and eye values are normalized
to the public rig ranges during import.

## Playback model

Playback owns transient status, the current step, direction, deadline, and
remaining duration. It supports `once`, `loop`, and `pingPong`. Pause records
the deadline delta; resume schedules only that remaining interval. Stop clears
the timer and runtime state. Expressions still morph through the existing
interruptible Motion springs.

## Progressive geometry

The original 32-point silhouette remains the canonical morph target. Optional
Sphere, Cube, Cylinder, and Capsule surfaces add code-generated SVG lighting and
projected planes clipped by that silhouette. This keeps the quick shape picker
simple while giving advanced users depth, pitch, yaw, and roll.

## MCP boundary

The MCP imports the same core package as the web app. It exposes five read-only,
closed-world tools and performs no file, network, or analytics operations.
Project animation rendering returns ordered, dependency-free SVG frames plus
timing metadata, allowing another agent to reuse a Mote without scraping the UI.

## License boundary

Reference projects were studied for product concepts only. Mote Studio's data
model, SVG geometry, rendering, controls, and copy are original MIT-licensed
implementations; no AGPL source code or generated reference bitmap ships here.
