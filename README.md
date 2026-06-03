# Lassi LAB Storyboard

Lassi LAB Storyboard is a local-first desktop production vault for visual storytelling projects: music videos, poetry films, AI-assisted clips, reference boards, prompts, outputs and storyboard packages.

This project is separate from Lassi LAB Songbook. It does not assume tablet concert use, A4 print rendering, chords, setlists or PWA-first behavior.

## Product Philosophy

- No accounts.
- No login.
- No cloud dependency.
- No realtime sync.
- Desktop-first, wide-screen PC workflow.
- Manual project folder and snapshot workflow.
- The project folder and `project.llstory.json` manifest are the source of truth.
- Imports must copy files into managed project folders. They must never move or delete source files.

## Current Status

This first pass is only the foundation:

- Vite + React + TypeScript renderer.
- Minimal Tauri desktop shell.
- Desktop-first three-panel UI skeleton.
- Documentation for product direction, architecture, data model and next tasks.
- No file import, cloud sync, accounts or AI generation logic.

## Local Development

Install dependencies:

```bash
npm install
```

Run the web renderer:

```bash
npm run dev
```

Run the desktop shell:

```bash
npm run tauri:dev
```

Build the renderer:

```bash
npm run build
```

Build the desktop app:

```bash
npm run tauri:build
```

Tauri requires a Rust toolchain. The renderer can still be developed with Node.js alone.

## Repository Layout

```text
docs/                 Product and architecture documentation
src/                  React renderer
src-tauri/            Minimal Tauri desktop shell
project.llstory.json  Future per-project manifest name, documented only for now
```

## Out Of Scope For This Pass

- File import.
- Cloud sync.
- Accounts or authentication.
- Realtime collaboration.
- AI generation.
- Persistent project storage beyond the documented manifest concept.

