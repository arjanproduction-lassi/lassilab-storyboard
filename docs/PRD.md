# Product Requirements Document

## Product

Lassi LAB Storyboard is a local-first desktop production system for visual storytelling projects such as music videos, poetry films, AI-generated clips and storyboard workflows.

The product is a production vault, not a magic AI generator. The first priority is order, safety and traceability. Fancy features come later.

## Core Workflow

Asset -> Shot -> Prompt -> Output

Each project should become a complete production package containing source material, planning context, prompt history, generated outputs, selections, exports and snapshots.

Example project types:

- Pradavny kod
- Zriadenie
- Moj Rim archive/import

## Product Principles

- Local-first project folders.
- No accounts, login or hosted backend.
- No cloud dependency.
- No realtime sync.
- Desktop-first wide-screen workflow.
- Manual snapshots and exports.
- Source files are never moved or deleted during import.
- The project folder and manifest are the source of truth.

## MVP Foundation Scope

This pass establishes:

- Clean React + TypeScript renderer.
- Minimal Tauri desktop shell.
- Wide desktop layout with left navigation, center dashboard and right inspector.
- Project Package v1 create/open workflow.
- Managed empty project folder structure.
- `project.llstory.json` manifest creation and validation.
- Documentation for product direction, architecture, data model and next tasks.
- Manifest concept for `project.llstory.json`.

## Explicit Non-Goals For This Pass

- No file import.
- No cloud sync.
- No account system.
- No AI generation.
- No thumbnail generation.
- No persistent project database.
- No migration from Lassi LAB Songbook.

## Future MVP Capabilities

- Create/open a local project folder.
- Generate a safe managed folder structure.
- Create and update `project.llstory.json`.
- Copy imported files into managed asset folders.
- Add text, timing and audio metadata.
- Create scenes and shots.
- Attach reference assets.
- Version prompts and link them to shots.
- Track generated outputs and selected hero outputs.
- Export snapshots that can be manually copied to Google Drive by the user.
