# Data Model

## Manifest File

Each production package uses a manifest named:

```text
project.llstory.json
```

The manifest and the project folder are the source of truth.

## Manifest V1

```json
{
  "appName": "Lassi LAB Storyboard",
  "schemaVersion": 1,
  "projectId": "llstory_1780509600000_pradavny-kod",
  "title": "Pradavny kod",
  "slug": "pradavny-kod",
  "createdAt": "2026-06-03T18:00:00.000Z",
  "updatedAt": "2026-06-03T18:00:00.000Z",
  "text": null,
  "timing": [],
  "audio": [],
  "brief": {
    "mainIdea": "",
    "visualConcept": "",
    "notes": ""
  },
  "scenes": [],
  "shots": [],
  "assets": [],
  "prompts": [],
  "outputs": []
}
```

`text` may be `null` in a new or older package until the first Text & Timing save. After saving, it is stored as:

```json
{
  "body": "",
  "notes": "",
  "updatedAt": "2026-06-03T18:10:00.000Z"
}
```

`timing` stores simple time-coded text blocks:

```json
[
  {
    "id": "timing_001",
    "start": "00:00",
    "end": "00:07",
    "text": "",
    "section": "",
    "voice": "",
    "notes": "",
    "linkedShotIds": [],
    "linkedAssetIds": [],
    "linkedOutputIds": []
  }
]
```

## Managed Folder Structure

```text
01_TEXT/
02_TIMING/
03_AUDIO/
04_BRIEF/
05_STORYBOARD/
06_REFERENCES/
07_PROMPTS/
08_OUTPUTS/
09_EXPORTS/
.thumbs/
```

## Entity Sketches

### Asset

Assets describe files copied into the managed project structure.

```json
{
  "id": "asset_001",
  "kind": "source-audio",
  "originalName": "demo.wav",
  "relativePath": "03_AUDIO/demo.wav",
  "mimeType": "audio/wav",
  "createdAt": "2026-06-03T18:00:00.000Z",
  "notes": ""
}
```

### Text

Project text is the full source text for a song, poem, voiceover, archive narration or other visual storytelling material.

```json
{
  "body": "Full project text",
  "notes": "Text notes, versions or open questions",
  "updatedAt": "2026-06-03T18:10:00.000Z"
}
```

### Timing Block

Timing blocks are lightweight text/time rows. They are not a video timeline. They are meant to prepare later shot, asset and output linking.

```json
{
  "id": "timing_001",
  "start": "00:00",
  "end": "00:07",
  "text": "First line",
  "section": "verse",
  "voice": "",
  "notes": "",
  "linkedShotIds": [],
  "linkedAssetIds": [],
  "linkedOutputIds": []
}
```

### Scene

Draft definition:

Scene is a narrative/story unit inside a visual storytelling project. It groups shots that belong together by story beat, location, emotional phase, visual chapter or production logic.

```json
{
  "id": "scene_001",
  "title": "",
  "description": "",
  "notes": "",
  "startTime": null,
  "endTime": null,
  "order": 1
}
```

### Shot

Draft definition:

Shot represents a creative intention or visual idea. It is not a concrete image, video file or generated output. One Shot may later link to multiple prompts, assets and outputs as attempts to realize that intention. These links are not implemented in the Scenes & Shots v1 draft yet.

```json
{
  "id": "shot_001",
  "sceneId": "scene_001",
  "title": "",
  "description": "",
  "visualIntent": "",
  "emotion": "",
  "motifs": [],
  "notes": "",
  "status": "draft",
  "order": 1
}
```

### Project -> Scene -> Shot Draft

```text
Project
└─ Scene
   └─ Shot
```

Example for `Pradávny kód`:

```text
Scene 01 - Sucho
Shots:
- Bosá noha vstupuje do hliny
- Črep v zemi
- Prvá kvapka dopadne na prach
```

This is a documentation draft only. It does not change `schemaVersion`, save/load logic or the current manifest writer.

### Prompt

```json
{
  "id": "prompt_001",
  "shotId": "shot_001",
  "version": 1,
  "text": "",
  "createdAt": "2026-06-03T18:00:00.000Z",
  "notes": ""
}
```

### Output

```json
{
  "id": "output_001",
  "shotId": "shot_001",
  "promptId": "prompt_001",
  "kind": "image",
  "relativePath": "08_OUTPUTS/output_001.png",
  "isHero": false,
  "createdAt": "2026-06-03T18:00:00.000Z",
  "notes": ""
}
```

## Schema Notes

- All file paths should be relative to the project folder.
- IDs should be stable within the project package.
- Future schema changes should increment `schemaVersion`.
- Text & Timing v1 keeps `schemaVersion` at 1.
- Saving Text & Timing updates `text`, `timing` and root `updatedAt` while preserving unrelated manifest fields.
- Text & Timing import reads TXT/SRT or pasted text into editable `timing` blocks; it does not create a separate import entity.
- Create Project writes `project.llstory.json` only when no manifest already exists.
- Create Project refuses non-empty folders that are not already Storyboard projects.
- Open Project validates `appName` and `schemaVersion` before displaying metadata.
- Import code, when added later, must copy files into managed folders and then add manifest entries.
