# Image Censor

Client-only image redaction app built with Next.js App Router, TypeScript, Tailwind, shadcn/ui, Bun and Biome.

## Features

- 100% local processing in browser
- Image import via file picker, drag and drop, and clipboard paste
- Redaction tools: rectangle, ellipse, line, freehand
- Redaction modes: pixelated blur and solid color fill
- Non-destructive edit model with deterministic re-render
- Undo/redo, object selection, move/resize, and delete
- Shape copy/paste and duplicate placement
- PNG export (flattened output)
- Dark mode only UI
- Static export-friendly setup (`next.config.ts` with `output: "export"`)

## Stack

- Bun
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Biome
- Playwright (smoke verification)
- Devbox

## Local setup

```bash
devbox init
devbox add bun nodejs git
devbox run -- bun install
```

## Run

```bash
devbox run -- bun dev
```

## Quality checks

```bash
devbox run -- bun lint
devbox run -- bun run build
```

## Playwright smoke checks

Start the app in another terminal:

```bash
devbox run -- bun dev
```

Run smoke:

```bash
bash src/dev/playwright/run-smoke.sh
```

Artifacts are written to `output/playwright/`.

## Project structure

- `src/app`: app router entry and global styles
- `src/features/editor`: editor domain (components, hooks, rendering, state, geometry)
- `src/components/ui`: shadcn/ui primitives
- `src/dev/playwright`: smoke script and manual checklist
