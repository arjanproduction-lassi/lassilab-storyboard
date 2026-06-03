# Next Tasks

## Completed: Project Package V1

- Create a new empty project package through Tauri commands.
- Write an initial `project.llstory.json`.
- Create managed folders `01_TEXT` through `09_EXPORTS` plus `.thumbs`.
- Open an existing project folder by reading its manifest.
- Validate `appName` and `schemaVersion`.
- Display project metadata and counts on the dashboard.

## Next: Text, Timing And Audio Metadata

- Add text/lyrics/poem editor placeholder.
- Add SRT or time-coded lyric map metadata.
- Add audio metadata without importing files yet.
- Define validation for missing or inconsistent timing.

## Later: Safe Import

- Implement copy-only file import.
- Never move or delete source files.
- Record original filename, managed relative path and asset kind.
- Add basic duplicate handling.

## Later: Scenes And Shots

- Add scene list.
- Add shot list.
- Link shots to timing ranges.
- Attach references to shots.

## Later: Prompt And Output Traceability

- Add prompt versions linked to shots.
- Add generated output records linked to prompts.
- Mark selected hero outputs.
- Add snapshot/export workflow.

## Later

- Thumbnail generation.
- Contact sheet export.
- Manual Google Drive folder workflow through user-managed snapshots.
- Optional AI provider integrations after traceability is solid.
