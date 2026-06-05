# Next Tasks

## Completed: Project Package V1

- Create a new empty project package through Tauri commands.
- Write an initial `project.llstory.json`.
- Create managed folders `01_TEXT` through `09_EXPORTS` plus `.thumbs`.
- Open an existing project folder by reading its manifest.
- Validate `appName` and `schemaVersion`.
- Display project metadata and counts on the dashboard.

## Current: Safe Form-Based Text And Timing Foundation

- Keep Text & Timing v1 as a safe form-based foundation.
- Prioritize reliable saving to `project.llstory.json` and reopening work after app restart.
- Keep import as an explicit draft step: paste/read source, add blocks, edit, then save project.
- Avoid building a full video/audio editor until the manifest workflow is reliable.

## Completed: Text And Timing Split Workbench Layout

- Use a horizontal split workspace for Text & Timing on wide desktop screens.
- Keep project text visible beside the timing list instead of stacked above it.
- Keep the right inspector docked for selected timing block editing.
- Keep timing rows dense so more blocks are visible at once.
- Keep the top toolbar as the compact project/save status strip.

## Open Design Note: Text Panel Modes

- Leave the third text mode in practical use for now instead of polishing it endlessly.
- Future direction may become wider text, larger font, reading mode, hidden notes or linking a text verse with a timing row.
- Let real project work decide which option is most useful.

## Later: Timeline Board

- Add a horizontal timing strip inspired by audio/video editors.
- Display timing blocks as segments along a time axis.
- Add zoom in/out for dense and detailed timing views.
- Allow future drag/resize editing of block start/end times.
- Use voices/sections as visual grouping or color layers.
- Keep this separate from Text & Timing v1 until the safe manifest workflow is solid.

## Next: Audio Metadata

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
