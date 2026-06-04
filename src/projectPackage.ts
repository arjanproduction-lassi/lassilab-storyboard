import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type ProjectCounts = {
  scenes: number;
  shots: number;
  assets: number;
  prompts: number;
  outputs: number;
};

export type ProjectText = {
  body: string;
  notes: string;
  updatedAt: string;
};

export type TimingBlock = {
  id: string;
  start: string;
  end: string;
  text: string;
  section: string;
  voice: string;
  notes: string;
  linkedShotIds: string[];
  linkedAssetIds: string[];
  linkedOutputIds: string[];
};

export type ProjectPackage = {
  appName: "Lassi LAB Storyboard";
  schemaVersion: 1;
  projectId: string;
  title: string;
  slug: string;
  parentFolderPath: string | null;
  folderPath: string;
  createdAt: string;
  updatedAt: string;
  text: ProjectText;
  timing: TimingBlock[];
  counts: ProjectCounts;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function hasDesktopProjectRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export function createProjectPackage(title: string, folderPath: string) {
  return invoke<ProjectPackage>("create_project_package", {
    request: {
      title,
      folderPath,
      timestamp: new Date().toISOString(),
    },
  });
}

export function openProjectPackage(folderPath: string) {
  return invoke<ProjectPackage>("open_project_package", {
    request: {
      folderPath,
    },
  });
}

export function saveProjectTextTiming(folderPath: string, text: ProjectText, timing: TimingBlock[]) {
  return invoke<ProjectPackage>("save_text_timing", {
    request: {
      folderPath,
      text,
      timing,
      timestamp: new Date().toISOString(),
    },
  });
}

export function readTextTimingImportFile(filePath: string) {
  return invoke<string>("read_text_timing_file", {
    request: {
      filePath,
    },
  });
}

export async function chooseProjectFolder(title: string) {
  const selected = await open({
    directory: true,
    multiple: false,
    title,
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  return selected;
}

export async function chooseTextTimingImportFile() {
  const selected = await open({
    directory: false,
    filters: [
      {
        name: "Text alebo SRT",
        extensions: ["txt", "srt"],
      },
    ],
    multiple: false,
    title: "Vyber textový alebo SRT súbor",
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  return selected;
}
