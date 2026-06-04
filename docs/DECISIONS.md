# Decisions

## 001. Build A Local-First Desktop Vault

Decision: Lassi LAB Storyboard is a local-first desktop app.

Reason: Visual production packages need stable file ownership, manual control and traceability. A hosted account system would add complexity before the core workflow is reliable.

## 002. Keep This Separate From Songbook

Decision: Do not reuse Lassi LAB Songbook assumptions.

Reason: Storyboard is for visual production workflows, not tablet performance, A4 song sheets, chords, setlists or PWA-first behavior.

## 003. Use Project Folders As Source Of Truth

Decision: A project folder plus `project.llstory.json` is the source of truth.

Reason: The user can inspect, back up and snapshot their work without depending on a service.

## 004. Copy Files During Import

Decision: Future import logic must copy source files into managed folders.

Reason: Moving or deleting source files would be unsafe for archive material and production assets.

## 005. Delay AI Generation

Decision: Do not implement AI generation in the foundation pass.

Reason: The first job is order, safety and traceability. Prompt and output records should exist before generation features.

## 006. Desktop-First UI

Decision: Start with a wide three-panel desktop layout.

Reason: The target workflow involves comparing project structure, production context and item details on a PC screen.

## 007. Project Package V1 Uses Manual Paths

Decision: Project Package v1 accepts an absolute project folder path and creates the managed package there.

Reason: The current Tauri setup does not include a folder picker plugin. Manual absolute paths keep the implementation small while still enabling the first real local project workflow.

## 008. Refuse Non-Empty Folders For New Projects

Decision: Creating a new project refuses non-empty folders unless the user opens an existing Storyboard manifest instead.

Reason: This avoids accidentally mixing managed Storyboard files into unrelated user folders.

## 009. Text And Timing V1 Is A Safe Form-Based Foundation

Decision: Text & Timing v1 should remain a safe form-based foundation, not the final production workspace.

Reason: The first responsibility is reliable local saving, reopening and traceability through `project.llstory.json`. The current large form panels are acceptable for proving the data flow, but future UX should reduce visual noise and give the user more real working space.

## 010. Timeline Editing Comes After Manifest Reliability

Decision: A horizontal timeline-style view is a later pass, not part of the current foundation.

Reason: Timeline zooming, block resizing and editor-like interactions are useful for visual storytelling, but they should be built only after text, timing, import and save/reopen behavior are stable.
