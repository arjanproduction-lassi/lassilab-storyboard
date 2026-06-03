# Next Tasks

## Pass 2: Local Project Package

- Add a project package service in Tauri.
- Create a new empty project folder chosen by the user.
- Write an initial `project.llstory.json`.
- Create managed folders: `assets/source`, `assets/references`, `assets/generated`, `thumbnails`, `exports`, `snapshots`.
- Load an existing project folder by reading its manifest.
- Keep all paths relative to the selected project folder.

## Pass 3: Text, Timing And Audio Metadata

- Add text/lyrics/poem editor placeholder.
- Add SRT or time-coded lyric map metadata.
- Add audio metadata without importing files yet.
- Define validation for missing or inconsistent timing.

## Pass 4: Safe Import

- Implement copy-only file import.
- Never move or delete source files.
- Record original filename, managed relative path and asset kind.
- Add basic duplicate handling.

## Pass 5: Scenes And Shots

- Add scene list.
- Add shot list.
- Link shots to timing ranges.
- Attach references to shots.

## Pass 6: Prompt And Output Traceability

- Add prompt versions linked to shots.
- Add generated output records linked to prompts.
- Mark selected hero outputs.
- Add snapshot/export workflow.

## Later

- Thumbnail generation.
- Contact sheet export.
- Manual Google Drive folder workflow through user-managed snapshots.
- Optional AI provider integrations after traceability is solid.

