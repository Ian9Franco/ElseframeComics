/**
 * Repo de fotos: ElseframeComics-assets-v1.
 * GitHub redirige los nombres anteriores en git y en la API.
 * GitHub Pages y jsDelivr no, así que las URLs viejas se reescriben acá.
 * Cubre el valor que todavía puede estar en NEXT_PUBLIC_ASSETS_BASE_URL.
 */

export const ASSETS_REPO = "ElseframeComics-assets-v1";

const LEGACY_ASSETS_REPOS = [
  "Elseframe-comic-v1",
  "theboyz-comic-v1",
  "the-boyz-comic",
];

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
