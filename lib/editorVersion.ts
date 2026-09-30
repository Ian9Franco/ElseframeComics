export type EditorVersion = "v1" | "v2";

const STORAGE_KEY = "editor_version";

export function readEditorVersion(): EditorVersion {
  if (typeof window === "undefined") return "v1";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "v2" ? "v2" : "v1";
}

export function writeEditorVersion(version: EditorVersion) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, version);
}
