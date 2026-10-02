import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { AUDIO_FILE_NAME_REGEX, getAssetsSoundsDir } from '@/lib/serverData';
import { fetchGithubSoundFiles } from '@/lib/githubSounds';
import { filterSoundsForEditorPicker } from '@/lib/readerSystemSounds';

function getFilesRecursively(dir: string, baseDir: string, filesList: Array<{ name: string; path: string }> = []) {
  if (!existsSync(dir)) return filesList;
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, baseDir, filesList);
    } else if (stat.isFile() && AUDIO_FILE_NAME_REGEX.test(item)) {
      const relPath = '/sounds/' + relative(baseDir, fullPath).replace(/\\/g, '/');
      const cleanPath = relPath.startsWith('/sounds/sounds/') ? relPath.replace('/sounds/sounds/', '/sounds/') : relPath;
      filesList.push({
        name: item,
        path: cleanPath,
      });
    }
  }
  return filesList;
}

export async function GET() {
  try {
    const publicSounds = join(process.cwd(), 'public', 'sounds');
    const comicAssetsSounds = getAssetsSoundsDir();

    const map = new Map<string, { name: string; path: string }>();

    if (existsSync(publicSounds)) {
      getFilesRecursively(publicSounds, publicSounds).forEach((s) => map.set(s.path, s));
    }

    if (existsSync(comicAssetsSounds)) {
      getFilesRecursively(comicAssetsSounds, comicAssetsSounds).forEach((s) => {
        if (!map.has(s.path)) {
          map.set(s.path, s);
        }
      });
    }

    const remote = await fetchGithubSoundFiles();
    remote.forEach((s) => {
      if (!map.has(s.path)) map.set(s.path, s);
    });

    const sounds = filterSoundsForEditorPicker(
      Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
    );
    return Response.json(sounds);
  } catch (error) {
    console.error('Error reading sounds directory:', error);
    return Response.json([]);
  }
}
