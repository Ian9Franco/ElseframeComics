/**
 * githubComics.ts
 *
 * Módulo servidor que usa la GitHub API para listar archivos
 * del repo de imágenes (theboyz-comic-v1) en lugar de `fs`.
 *
 * Funciona tanto en local como en producción (Vercel), ya que
 * no depende del filesystem sino de solicitudes HTTP autenticadas.
 */

const GITHUB_OWNER = process.env.GITHUB_OWNER || "Ian9Franco";
const GITHUB_REPO  = process.env.GITHUB_ASSETS_REPO || "theboyz-comic-v1";
const GITHUB_BRANCH = "main";
const SUPPORTED_FORMATS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

/** Estructura que devuelve la GitHub Contents API por cada item */
interface GithubContentItem {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
}

/**
 * Arma los headers de autenticación para la GitHub API.
 * Usa GITHUB_TOKEN si está disponible (evita rate-limit de 60 req/h).
 */
function buildGithubHeaders(): HeadersInit {
  const token = process.env.GITHUB_EDITOR_TOKEN || process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Llama a la GitHub Contents API y devuelve la lista de items
 * en el path especificado dentro del repo de cómics.
 * Retorna null si el path no existe o hay un error de red.
 */
async function fetchGithubContents(
  repoPath: string,
  ref: string = GITHUB_BRANCH
): Promise<GithubContentItem[] | null> {
  const encodedPath = repoPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`;

  try {
    const res = await fetch(url, {
      headers: buildGithubHeaders(),
      // Cacheo de 60 segundos en el edge para evitar martillar la API
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    // La API devuelve un array para directorios, un objeto para archivos
    if (!Array.isArray(data)) return null;

    return data as GithubContentItem[];
  } catch {
    return null;
  }
}

/**
 * Construye la URL pública de una imagen del cómic.
 *
 * Prioridad:
 *  1. NEXT_PUBLIC_ASSETS_BASE_URL si está definida (GitHub Pages u otro CDN)
 *  2. download_url de la GitHub API (raw.githubusercontent.com)
 */
function buildAssetUrl(
  githubPath: string,
  downloadUrl: string | null,
  ref: string = GITHUB_BRANCH
): string {
  const baseUrl = process.env.NEXT_PUBLIC_ASSETS_BASE_URL?.replace(/\/$/, "");

  if (ref === GITHUB_BRANCH && baseUrl) {
    return `${baseUrl}/${githubPath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  }

  return downloadUrl ?? `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${encodeURIComponent(ref)}/${githubPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/** Verifica si un nombre de archivo es una imagen de cómic soportada */
function isSupportedImage(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return SUPPORTED_FORMATS.includes(ext);
}

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface ComicPagesResult {
  /** URLs ordenadas de las páginas (sin la portada) */
  pages: string[];
  /** URL de la portada (archivo llamado "portada.*") o primera página si no existe */
  cover: string | null;
}

export interface SagaFolderInfo {
  /** Nombre de carpeta tal como aparece en el repo, ej: "#1 green-truck" */
  folderName: string;
  /** Nombre limpio sin prefijo numérico, ej: "green-truck" */
  cleanName: string;
  /** Orden numérico extraído del prefijo, ej: 1 */
  order: number;
}

export interface ChapterFolderInfo {
  folderName: string;
  cleanName: string;
  order: number;
}

// ─── Funciones públicas ───────────────────────────────────────────────────────

/**
 * Parsea el prefijo numérico de un nombre de carpeta del repo.
 * Ejemplos: "#1 green-truck" → { order: 1, cleanName: "green-truck" }
 *           "01-titulo"      → { order: 1, cleanName: "titulo" }
 */
export function parseFolderPrefix(name: string): {
  order: number;
  cleanName: string;
} {
  const match = name.match(/^(?:#)?(\d+)[-_. ]+(.*)$/);
  if (match) {
    return {
      order: parseInt(match[1], 10),
      cleanName: match[2].trim(),
    };
  }
  return { order: 999, cleanName: name };
}

/**
 * Obtiene la lista de carpetas de sagas disponibles en el repo de cómics.
 * Llama a: GET /repos/.../contents/comics
 */
export async function fetchSagaFolders(ref: string = GITHUB_BRANCH): Promise<SagaFolderInfo[]> {
  const items = await fetchGithubContents("comics", ref);
  if (!items) return [];

  return items
    .filter((i) => i.type === "dir")
    .map((i) => {
      const { order, cleanName } = parseFolderPrefix(i.name);
      return { folderName: i.name, cleanName, order };
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * Obtiene la lista de carpetas de capítulos dentro de una saga.
 * Llama a: GET /repos/.../contents/comics/{sagaFolder}
 */
export async function fetchChapterFolders(
  sagaFolder: string,
  ref: string = GITHUB_BRANCH
): Promise<ChapterFolderInfo[]> {
  const items = await fetchGithubContents(`comics/${sagaFolder}`, ref);
  if (!items) return [];

  return items
    .filter((i) => i.type === "dir")
    .map((i) => {
      const { order, cleanName } = parseFolderPrefix(i.name);
      return { folderName: i.name, cleanName, order };
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * Obtiene las URLs de páginas e imagen de portada de un capítulo.
 *
 * @param sagaFolder   Nombre exacto de la carpeta de saga en el repo
 * @param chapterFolder Nombre exacto de la carpeta de capítulo en el repo
 */
export async function fetchComicPages(
  sagaFolder: string,
  chapterFolder: string,
  ref: string = GITHUB_BRANCH
): Promise<ComicPagesResult> {
  const repoPath = `comics/${sagaFolder}/${chapterFolder}`;
  const items = await fetchGithubContents(repoPath, ref);

  if (!items) return { pages: [], cover: null };

  const imageFiles = items.filter(
    (i) => i.type === "file" && isSupportedImage(i.name)
  );

  let coverUrl: string | null = null;
  const pageFiles: GithubContentItem[] = [];

  for (const file of imageFiles) {
    const baseName = file.name.slice(0, file.name.lastIndexOf(".")).toLowerCase();
    const assetUrl = buildAssetUrl(file.path, file.download_url, ref);

    if (baseName === "portada") {
      coverUrl = assetUrl;
    } else {
      pageFiles.push(file);
    }
  }

  // Ordenar páginas numéricamente por nombre de archivo
  const sortedPages = pageFiles
    .sort((a, b) => {
      const nameA = a.name.slice(0, a.name.lastIndexOf("."));
      const nameB = b.name.slice(0, b.name.lastIndexOf("."));
      return nameA.localeCompare(nameB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    })
    .map((f) => buildAssetUrl(f.path, f.download_url, ref));

  // Si no hay portada explícita, usar la primera página
  const finalCover = coverUrl ?? (sortedPages.length > 0 ? sortedPages[0] : null);

  return { pages: sortedPages, cover: finalCover };
}

/**
 * Busca la carpeta real de una saga/capítulo dado un cleanName.
 * Útil para resolver el nombre exacto de carpeta desde el id de saga/capítulo.
 *
 * @param folders Lista de carpetas obtenida de fetchSagaFolders/fetchChapterFolders
 * @param cleanNameTarget Clean name a buscar (case-insensitive)
 */
export function resolveFolderName(
  folders: Array<{ folderName: string; cleanName: string }>,
  cleanNameTarget: string
): string | null {
  const found = folders.find(
    (f) => f.cleanName.toLowerCase() === cleanNameTarget.toLowerCase()
  );
  return found?.folderName ?? null;
}
