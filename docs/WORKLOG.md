# Worklog

## 2026-06-04

### Baselines

- `foundation-0.1` exists as the first clean foundation tag.
- `foundation-0.2` exists as the safe Slovak UI baseline tag.
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
