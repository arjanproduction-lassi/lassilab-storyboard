# Data Model

## Manifest File

Each production package will use a manifest named:

```text
project.llstory.json
```

The manifest and the project folder are the source of truth.

## Minimal Manifest Concept

```json
{
  "appName": "Lassi LAB Storyboard",
  "schemaVersion": "0.1.0",
  "projectId": "project_2026_0001",
  "projectTitle": "Pradavny kod",
  "createdAt": "2026-06-03T18:00:00.000Z",
  "updatedAt": "2026-06-03T18:00:00.000Z",
  "text": {
    "kind": "lyrics",
    "language": "sk",
    "sourceAssetId": null,
    "notes": ""
  },
  "timing": {
    "kind": "srt",
    "sourceAssetId": null,
    "timecodedMapAssetId": null,
    "notes": ""
  },
  "audio": {
    "primaryAssetId": null,
    "durationMs": null,
    "bpm": null,
    "notes": ""
  },
  "assets": [],
  "scenes": [],
  "shots": [],
  "prompts": [],
  "outputs": []
}
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
- Import code must copy files into managed folders and then add manifest entries.

