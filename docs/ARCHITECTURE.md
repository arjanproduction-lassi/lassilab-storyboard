# Architecture

## Direction

Recommended stack:

- Tauri for the desktop shell and local filesystem access in future passes.
- React + TypeScript for the renderer.
- Local project folders as the source of truth.
- `project.llstory.json` as the project manifest.

This pass only creates the desktop shell and renderer foundation. It does not implement filesystem commands yet.

## Current Runtime Shape

```text
Tauri window
  -> Vite React renderer
      -> static desktop UI skeleton
```

There is no backend service, account layer, cloud sync client or realtime transport.

## Future Project Package Shape

```text
Project Folder/
  project.llstory.json
  assets/
    source/
    references/
    generated/
  thumbnails/
  exports/
  snapshots/
```

The manifest records what the app knows. The folder contains the actual files. Future import logic should copy source files into managed folders and keep references relative to the project package.

## Safety Rules

- Never move or delete source files during import.
- Never rewrite external user folders as part of project import.
- Keep manifest writes explicit and recoverable.
- Prefer snapshot/export workflows over hidden sync.
- Keep schema changes versioned and documented.

## UI Layout

The first UI is desktop-first:

- Left sidebar for production sections.
- Center workspace for dashboard and future focused work.
- Right inspector for the selected project item.

The layout is intentionally simple so future passes can add real project loading, import and manifest editing without redesigning the shell.

