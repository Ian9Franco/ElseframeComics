export function isPreviewAuthBypassed(): boolean {
  return process.env.SKIP_PREVIEW_AUTH === "true";
}
