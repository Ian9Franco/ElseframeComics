/**
 * El repo de fotos pasó de Elseframe-comic-v1 a ElseframeComics-assets-v1.
 * La API de GitHub redirige el nombre viejo. GitHub Pages no: el sitio
 * https://ian9franco.github.io/Elseframe-comic-v1 responde 404.
 * NEXT_PUBLIC_ASSETS_BASE_URL en Vercel puede seguir con un slug viejo;
 * las URLs se corrigen acá.
 */

export const ASSETS_REPO = "ElseframeComics-assets-v1";

const LEGACY_ASSETS_REPOS = ["Elseframe-comic-v1", "theboyz-comic-v1", "the-boyz-comic"];

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
