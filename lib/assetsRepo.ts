/**
 * El repo de fotos pasó de theboyz-comic-v1 a Elseframe-comic-v1.
 * GitHub API redirige el nombre viejo; GitHub Pages y jsDelivr no.
 * NEXT_PUBLIC_ASSETS_BASE_URL en Vercel sigue con el slug viejo, así que
 * las URLs se corrigen acá hasta que se actualice la variable.
 */

export const ASSETS_REPO = "Elseframe-comic-v1";

const LEGACY_ASSETS_REPOS = ["theboyz-comic-v1", "the-boyz-comic"];

export function rewriteLegacyAssetsUrl(url: string): string {
  let out = url;
  for (const legacy of LEGACY_ASSETS_REPOS) {
    out = out.split(`/${legacy}`).join(`/${ASSETS_REPO}`);
  }
  return out;
}

export function getAssetsBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "").replace(/\/$/, "");
  return raw ? rewriteLegacyAssetsUrl(raw) : "";
}

export function resolveAssetsRepo(): string {
  const configured = (process.env.GITHUB_ASSETS_REPO || "").trim();
  if (!configured || LEGACY_ASSETS_REPOS.includes(configured)) return ASSETS_REPO;
  return configured;
}
