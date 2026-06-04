# Handoff Notes

## 2026-06-04 Project Package v1 Folder Picker

Observed local state before the fix:

- Folder picker works in the desktop app.
- The user can choose a folder path from the UI.
- Creating a new project failed when the selected folder already existed and was not empty.
- Observed selected path on screen: `F:\Môj disk\T`.
- Current error shown in Slovak: `Pre nový projekt vyber prázdny priečinok alebo zadaj novú cestu.`

Reason:

- The current safety rule treats the entered path as the final project root.
- If that folder exists and contains anything, the app refuses to create a project there.
- This is safe, but awkward for a normal user workflow.

Implemented fix in the current working tree:

- Keep the safety rule: never delete, move or overwrite user files.
- Change create flow so the user can choose a parent folder.
- The app should create a new project subfolder inside that parent folder, probably from the title/slug.
- Example: choose `F:\Môj disk\Storyboard Projects`, title `Pradávny kód`, app creates `F:\Môj disk\Storyboard Projects\pradavny-kod`.
- If the target subfolder already exists, refuse unless it is empty and has no `project.llstory.json`.
- UI should make this clear in Slovak: `Vybrať nadradený priečinok` / `Projekt sa vytvorí v novom podpriečinku`.

Still in scope:

- Create managed folders.
- Create `project.llstory.json`.
- Open existing project folder with manifest validation.

Still out of scope:

- Drag and drop import.
- Thumbnails.
- Cloud sync.
- Accounts/login.
- AI generation.
- Video editor/timeline.
