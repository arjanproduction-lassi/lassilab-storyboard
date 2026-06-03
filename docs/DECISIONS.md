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

