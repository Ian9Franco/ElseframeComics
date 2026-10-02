/**
 * List audio files from the assets repo (theboyz-comic-v1/sounds) via GitHub API.
 * Used in production where the sibling sounds folder is not on disk.
 */

import { AUDIO_FILE_NAME_REGEX } from "@/lib/serverData";

const GITHUB_OWNER = process.env.GITHUB_OWNER || "Ian9Franco";
const GITHUB_REPO = process.env.GITHUB_ASSETS_REPO || "theboyz-comic-v1";
const GITHUB_BRANCH = process.env.GITHUB_ASSETS_BRANCH || "main";

type SoundEntry = { name: string; path: string };

function getGithubReadToken(): string | undefined {
  return process.env.GITHUB_TOKEN || undefined;
}

function buildGithubHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { Accept: "application/vnd.github.v3+json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Fetches all file paths under `sounds/` using the git trees API (single request).
 */
export async function fetchGithubSoundFiles(ref: string = GITHUB_BRANCH): Promise<SoundEntry[]> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
  const readToken = getGithubReadToken();

  try {
    let res = await fetch(url, {
      headers: buildGithubHeaders(readToken),
      next: { revalidate: 300 },
    });
    if ((res.status === 401 || res.status === 403) && readToken) {
      res = await fetch(url, { headers: buildGithubHeaders(), next: { revalidate: 300 } });
    }
    if (!res.ok) {
      console.error(`[githubSounds] tree API ${res.status} for ${GITHUB_REPO}@${ref}`);
      return [];
    }

    const data = (await res.json()) as { tree?: Array<{ path?: string; type?: string }> };
    const tree = data.tree ?? [];
    const soundsPrefix = "sounds/";

    const out: SoundEntry[] = [];
    for (const node of tree) {
      if (node.type !== "blob" || !node.path?.startsWith(soundsPrefix)) continue;
      const name = node.path.slice(node.path.lastIndexOf("/") + 1);
      if (!AUDIO_FILE_NAME_REGEX.test(name)) continue;
      const publicPath = `/${node.path}`.replace(/\/+/g, "/");
      out.push({ name, path: publicPath });
    }

    return out.sort((a, b) => a.path.localeCompare(b.path));
  } catch (err) {
    console.error("[githubSounds] failed to list sounds:", err);
    return [];
  }
}
