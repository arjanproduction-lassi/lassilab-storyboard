# Next Tasks

## Current Priority: Real Project Testing

- Continue real testing with `Pradávny kód`.
- Use the current Text & Timing, Project Overview and Scenes & Shots workflows in practice before adding larger modules.
- Watch whether the shared right dock width, collapse state, tabs and overview behavior feel natural across modules.
- Keep layout preferences in localStorage only.
- Do not write layout preferences into `project.llstory.json`.
- Keep the project dirty state unchanged while resizing panels or switching dock tabs.

## Follow-Ups From Shared Right Dock Pass

- Later consider a module-specific overview for `Text a časovanie`.
- Later consider editor mode polish in `Scény a zábery` only if real project work shows it is needed.
- Keep `Scény a zábery` overview as the current generated storyboard outline.
- Keep `Projekty` overview as the compact project package summary.

## Vision: Lassi LAB Digital Atelier

- Keep `docs/VISION.md` as the long-term product direction, not an implementation promise.
- Preserve the local-first atelier principle: the author owns the project folder, manifest, assets, drafts, exports and snapshots.
- Keep `project.llstory.json` as the source of truth for project content.
- Keep Shot as a creative intention, not a media file.
- Treat AI as an assistant/apprentice, not an autopilot.
- Treat the future Timeline Board as an emotional/story map, not a replacement for final editing in Edius.

## Future Backlog: Digital Atelier

- AI atelier assistant.
- Timeline / emotional story map.
- Prompt architect for turning shots into prompt versions.
- Output review helpers that compare results against shot intent.
- Cross-project motif memory, only after the local project workflows are stable.

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

## Completed: Text Timing Sync And Exact Match Tools

- Keep project text editable on the left.
- Keep timing rows editable in the center list and in the right inspector.
- Sync selection between project text lines and timing blocks during drafting.
- Add manual sync helpers: `Prevziať text z riadku` and `Prevziať text z časovania`.
- Generate, preview and copy clean text from timing blocks.
- Allow replacing the main project text from timing text only after confirmation.
- Add strict final match checking between project text and timing text.
- Add local undo/redo for Text & Timing draft edits.

## Open Design Note: Text Panel Modes

- Leave the third text mode in practical use for now instead of polishing it endlessly.
- Future direction may become wider text, larger font, reading mode, hidden notes or linking a text verse with a timing row.
- Let real project work decide which option is most useful.

## Recommended Next: Test Text & Timing In Practice

- Use real project work to test text matching, exact match checking, undo/redo and text-from-timing replacement.
- Watch for repeated lines, punctuation differences, long notes and dense timing edits.
- Do not start Timeline Board, audio playback or media import until the Text & Timing workflow feels reliable.

## Completed: Scenes And Shots V1 Minimal Implementation

- Create, edit and delete scenes.
- Create, edit and delete shots under a scene.
- Save and load scenes/shots through `project.llstory.json`.
- Keep Scene as a narrative/story unit.
- Keep Shot as a creative intention / visual idea, not an image, video or file.
- Allow future linking to prompts, assets and outputs, but do not implement those links yet.
- Keep the project manifest as the source of truth.
- Keep the implementation small and local-first.
- Do not implement assets, prompts, outputs, timeline engine, thumbnails, drag/drop media import or AI generation in this pass.

## Recommended Next: Test Scenes & Shots On Pradávny kód

- Create 3-5 scenes for the real project.
- Add the first 10-15 shots as creative intentions, not media files.
- Check whether fields `visualIntent`, `emotion`, `motifs`, `notes` and `status` feel natural in real work.
- Watch whether scene/shot ordering is enough before adding links to timing, assets, prompts or outputs.
- Do not start Timeline Board, media import or AI generation until this structure feels useful in practice.

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
