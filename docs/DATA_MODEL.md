# Data Model

## Manifest File

Each production package will use a manifest named:

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
  "text": {
    "status": "empty",
    "assetId": null,
    "notes": ""
  },
  "timing": {
    "status": "empty",
    "assetId": null,
    "notes": ""
  },
  "audio": {
    "status": "empty",
    "assetId": null,
    "durationMs": null,
    "notes": ""
  },
  "brief": {
    "summary": "",
    "visualConcept": "",
    "notes": ""
  },
  "assets": [],
  "scenes": [],
  "shots": [],
  "prompts": [],
  "outputs": []
}
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
  "relativePath": "assets/source/demo.wav",
  "mimeType": "audio/wav",
  "createdAt": "2026-06-03T18:00:00.000Z",
  "notes": ""
}
```

### Scene

```json
{
  "id": "scene_001",
  "title": "Opening archive",
  "order": 1,
  "summary": "",
  "shotIds": []
}
```

### Shot

```json
{
  "id": "shot_001",
  "sceneId": "scene_001",
  "order": 1,
  "timeStartMs": null,
  "timeEndMs": null,
  "description": "",
  "referenceAssetIds": [],
  "promptIds": [],
  "selectedOutputId": null
}
```

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
  "relativePath": "assets/generated/output_001.png",
  "isHero": false,
  "createdAt": "2026-06-03T18:00:00.000Z",
  "notes": ""
}
```

## Schema Notes

- All file paths should be relative to the project folder.
- IDs should be stable within the project package.
- Future schema changes should increment `schemaVersion`.
- Create Project writes `project.llstory.json` only when no manifest already exists.
- Create Project refuses non-empty folders that are not already Storyboard projects.
- Open Project validates `appName` and `schemaVersion` before displaying metadata.
- Import code, when added later, must copy files into managed folders and then add manifest entries.
