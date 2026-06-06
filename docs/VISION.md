# Lassi LAB Digital Atelier Vision

This document stores the longer-term product direction. It is a future vision, not an immediate implementation plan.

## Local-First Digital Atelier

Lassi LAB Storyboard should behave like a local digital atelier for visual storytelling work. The author owns the project folders, files, drafts, exports and snapshots. The app should help organize production work without requiring accounts, login, cloud sync or realtime collaboration.

The app is a production vault first. Order, safety and traceability come before clever automation.

## Manifest As Source Of Truth

The project folder and `project.llstory.json` remain the single source of truth. UI state such as panel widths, collapsed docks, selected tabs or startup preferences may live in local app storage, but project content belongs in the manifest and managed project folders.

Future features should avoid hidden databases or cloud-only state unless there is a very clear reason and an explicit migration plan.

## Shot Means Creative Intention

A Shot is not an image, video file, generated output or imported asset.

A Shot represents a creative intention or visual idea. It describes what image, mood, gesture, symbol, movement or story beat should be realized. Prompts, assets and outputs are later attempts to realize that intention.

This keeps the workflow stable:

```text
Scene -> Shot -> Prompt -> Output
```

The Shot should stay understandable even if every generated image or video is replaced later.

## AI As Assistant, Not Autopilot

AI may become an atelier assistant or apprentice, not an autopilot. It can help:

- suggest prompt variations,
- summarize scene intent,
- compare outputs against a shot,
- prepare production notes,
- organize alternatives.

It should not silently overwrite the author's structure, source text, timing, scenes or selected creative decisions.

Every AI-assisted step should remain traceable and reversible.

## Timeline Board As Emotional Map

The future Timeline Board is not meant to become a full video editor. Final editing can stay in tools such as Edius.

The Timeline Board should be an emotional and story map:

- where the song, poem or narration changes state,
- where scenes begin and end,
- where shots should land,
- where visual tension rises or releases,
- where references, prompts and outputs belong.

It should help planning before final editing, not replace the final edit system.

## Bridge From Vision To Realization

Lassi LAB Storyboard should bridge the fragile middle part of production:

```text
source text / audio
-> timing
-> scenes
-> shots
-> prompts
-> generated or selected outputs
-> exports for final edit
```

The app should help the author move from a poetic or visual idea toward concrete production material, while preserving why each item exists.

## Future Backlog, Not Now

These ideas belong to the future backlog:

- AI atelier assistant,
- prompt architect,
- emotional Timeline Board,
- stronger shot-to-output evaluation,
- cross-project motif memory.

They should wait until the local project package, Text & Timing and Scenes & Shots workflows are tested in real projects.
