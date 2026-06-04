import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type ProjectCounts = {
  scenes: number;
  shots: number;
  assets: number;
  prompts: number;
  outputs: number;
};

export type ProjectPackage = {
  appName: "Lassi LAB Storyboard";
  schemaVersion: 1;
  projectId: string;
  title: string;
  slug: string;
  folderPath: string;
  createdAt: string;
  updatedAt: string;
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
