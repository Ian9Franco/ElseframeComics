export function isPreviewAuthBypassedClient(): boolean {
  return process.env.NEXT_PUBLIC_SKIP_PREVIEW_AUTH === "true";
}
