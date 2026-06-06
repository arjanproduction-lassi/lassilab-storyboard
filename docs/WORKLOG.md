# Worklog

## 2026-06-04

### Baselines

- `foundation-0.1` exists as the first clean foundation tag.
- `foundation-0.2` exists as the safe Slovak UI baseline tag.
- `project-package-v1` exists as the first local project package milestone tag.
- `text-timing-v1` exists as the safe Text & Timing v1 milestone tag.
- Current work continues from `foundation-0.2`.

### Completed

- Slovak MVP UI is applied.
- Desktop launcher workflow works locally.
- Project Package v1 create/open workflow is implemented.
- Native folder picker was added through the Tauri dialog plugin.
- New project creation now treats the selected folder as a parent folder.
- The app creates a new project subfolder from the project title/slug.
- Created projects include managed folders and `project.llstory.json`.
- Dashboard shows active project metadata and counts.
- Basic layout polish was added for long project paths and variable desktop widths.

### Verified

- `npm run build` passes.
- `cargo check` passes.
- Local desktop app launches from the Windows shortcut.
- User confirmed that creating a project package now works.

### Safety Notes

- The app does not delete user files.
- The app does not move user files.
- Creating a project refuses to overwrite an existing manifest.
- If the target project subfolder exists and is not empty, creation is refused.
- No cloud sync, accounts/login, AI generation, drag/drop import, thumbnails or video editor features are implemented.

### Open Items

- Commit and push the current Project Package v1 changes after final safety verification.
- Consider a dedicated responsive layout pass for smaller and wider desktop windows.
- Improve path display with copy/open-folder affordances later.
- Add a clearer user-facing explanation of parent folder vs project folder.
- Future: text/timing/audio metadata workflow.
- Future: safe copy-only import.

### UX Direction Note

- Current Text & Timing work is intentionally a safe form-based foundation.
- This proves local save/reopen behavior before heavier editor interactions.
- The current large cards and textarea-heavy rows are not the desired final working desk.
- Future UX should compact project metadata, reduce informational frames and give more space to actual text/timing work.
- A later Timeline Board can show timing blocks on a horizontal time axis with zoom in/out and future drag/resize editing.

### Text & Timing V1 Milestone

- Commit `806545848a579b42389f40b6f33f2bc1ea2b6136` was tagged as `text-timing-v1`.
- This milestone includes Text & Timing v1, TXT/SRT/copy-paste import into editable timing blocks and the save-state fix.
- The milestone remains a safe form-based foundation, not the final compact production workspace.
- `cargo fmt --check` now works after installing the `rustfmt` component.

## 2026-06-05

### Desktop Workbench Layout Pass

- Current work is an uncommitted layout/UX pass after `text-timing-v1`.
- Goal is not to copy Photoshop, Edius, Cakewalk or any other app.
- The direction is the general desktop workbench principle: compact toolbar, narrow navigation rail, central work area, docked inspector and dense lists.
- The visible UI remains Slovak.
- Internal code keys, manifest shape and storage logic remain unchanged.

### Completed In This Pass

- Left navigation was narrowed into a denser desktop-style rail.
- A compact top project/status bar now carries app context, project title, active section, save state, last saved time and the `Uložiť` action.
- Project dashboard cards are kept mainly in the `Projekty` section.
- `Text a časovanie` now prioritizes the timing table as the central workspace.
- The full text editor is a secondary collapsible dock and is closed by default.
- TXT/SRT import remains collapsible and secondary.
- Selected timing block editing is handled only in the right inspector.
- Duplicate timing edit fields were removed from the main timing table area.
- The timing table has denser rows, its own scroll area and a sticky header.
- A bottom dock placeholder remains prepared for future timeline/status work.

### Verified

- `npm run build` passes.
- `cargo check` passes.
- Browser layout metrics showed no horizontal overflow.
- Measured preview layout: sidebar about `148px`, inspector about `304px`, topbar about `38px`.

### Safety Notes

- No manifest schema changes were made.
- No save/load logic changes were made.
- No Tauri command changes were made.
- No timeline engine, pop-out windows, drag/drop import, thumbnails or audio playback were implemented.
- No user source files are deleted or moved.

### Current Uncommitted Files

- `src/App.tsx`
- `src/index.css`
- `docs/WORKLOG.md`

### Open Items For Next Session

- Review the new workbench feeling in the running Windows app.
- If the direction feels right, run final safety checks and commit the layout pass.
- Possible commit message: `Refine Text and Timing desktop workbench layout`.
- Continue to keep Text & Timing as a safe foundation before implementing Timeline Board, audio playback or media workflows.

### Text Timing Sync And Exact Match Tools

- Commit `d78a8cab382d85bde42ea15b206c29fc2c19b6d6` was pushed to `main` with message `Add Text Timing sync and exact match tools`.
- Text & Timing now uses the split workbench: project text on the left, editable timing list in the center and selected block inspector on the right.
- Project text remains an editable full-song/full-poem textarea, not a passive preview.
- Timing rows remain editable through compact row fields and through the right inspector.
- Clicking inside the project text can select a matching timing block using practical normalized matching for drafting.
- The inspector includes manual sync actions: `Prevziať text z riadku` and `Prevziať text z časovania`.
- Text from timing can be generated, previewed, copied and used to replace the main project text only after confirmation.
- Final exact match checking was added through `Skontrolovať zhodu textu a časovania`.
- Final checking is strict: punctuation, letter case, characters, repeated lines and line order must match.
- Local undo/redo controls were added for the Text & Timing draft state.

### Verified

- `npm run build` passes.
- `cargo check` passes.
- `git diff --check` passes.
- Working tree was clean after push.

### Safety Notes

- No manifest schema changes were made.
- No Tauri command changes were made.
- No cloud, account, drag/drop, thumbnail, audio playback, timeline engine or AI generation features were added.
- No user files are deleted or moved.
- Main project text is never overwritten from timing text without confirmation.

### Recommended Next Direction

- Test Text & Timing sync in real project work before starting a larger feature.
- The next recommended feature after that practical testing is `Scenes & Shots v1`.
- `Scenes & Shots v1` should link scenes and shots to existing timing blocks without changing the manifest more than necessary.
- Timeline Board, audio playback, DOCX/PDF export and media import should still wait.

## 2026-06-06

### Resizable Scenes & Shots Columns And Digital Atelier Vision

- Continued the `Sceny a zabery` desktop workbench direction with user-resizable columns.
- Added local UI layout state for scenes, shots, editor and right dock widths.
- Kept layout state in localStorage only, not in `project.llstory.json`.
- Added a `Reset rozlozenia` control for returning the Scenes & Shots workspace to default widths and expanded inspector state.
- Added `docs/VISION.md` as a future-facing Lassi LAB Digital Atelier note.
- Documented AI as an assistant/apprentice, Timeline Board as an emotional/story map and Shot as a creative intention.

### Safety Notes

- No manifest schema changes were made.
- No save/load data changes were made.
- No Tauri command changes were made.
- No AI, timeline engine, drag/drop, thumbnails, media import or prompt/output linking was implemented.

### Scenes & Shots V1 Minimal Implementation

- Added the first usable `Scény a zábery` module.
- Scene is treated as a narrative/story unit.
- Shot is treated as a creative intention or visual idea, not an image, video or file.
- Scenes and shots are stored in `project.llstory.json` as `scenes` and `shots`.
- Existing older projects without these fields load safely with empty arrays.
- The UI supports creating, editing, deleting and reordering scenes and shots.
- Scene delete is blocked while the scene still contains shots.
- Shot delete asks for confirmation.
- Shot motifs use a comma-separated UI field and are saved as a string array.
- Shot status supports `draft`, `approved`, `used`, `rejected` and `archived`.

### Safety Notes

- No user files are deleted or moved.
- No assets, prompts, outputs, thumbnails, timeline engine, audio playback, drag/drop import or AI generation were added.
- `schemaVersion` remains `1`.
- The next recommended step is testing the module on the real project `Pradávny kód` before adding links to timing/assets/prompts/outputs.
