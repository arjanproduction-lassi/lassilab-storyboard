# Architecture

## Direction

Recommended stack:

- Tauri for the desktop shell and local filesystem access in future passes.
- React + TypeScript for the renderer.
- Local project folders as the source of truth.
- `project.llstory.json` as the project manifest.

Project Package v1 adds the first local filesystem commands for creating and opening empty project packages. It does not import files, generate thumbnails, sync cloud data or call AI providers.

## Current Runtime Shape

```text
Tauri window
  -> Vite React renderer
      -> desktop UI
      -> Tauri invoke commands
          -> create/open local project package
```

There is no backend service, account layer, cloud sync client or realtime transport.

## Future Project Package Shape

```text
Project Folder/
  project.llstory.json
  01_TEXT/
  02_TIMING/
  03_AUDIO/
  04_BRIEF/
  05_STORYBOARD/
  06_REFERENCES/
  07_PROMPTS/
  08_OUTPUTS/
  09_EXPORTS/
  .thumbs/
```

The manifest records what the app knows. The folder contains the actual files. Future import logic should copy source files into managed folders and keep references relative to the project package.

## Safety Rules

- Never move or delete source files during import.
- Never rewrite external user folders as part of project import.
- Keep manifest writes explicit and recoverable.
- Do not overwrite an existing manifest when creating a new project.
- Create new packages only in a new folder or an empty folder.
- Prefer snapshot/export workflows over hidden sync.
- Keep schema changes versioned and documented.

## UI Layout

The first UI is desktop-first:

- Left sidebar for production sections.
- Center workspace for dashboard and future focused work.
- Right inspector for the selected project item.

The layout is intentionally simple so future passes can add real project loading, import and manifest editing without redesigning the shell.
