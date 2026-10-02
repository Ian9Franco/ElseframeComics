const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, "..", "..");

function getSiblingRoot(root) {
  const possibleNames = ["the-boyz-comic", "theboyz-comic-v1", "theboyz-comic"];
  for (const name of possibleNames) {
    const p = path.join(root, "..", name);
    if (fs.existsSync(p)) {
      return p;
    }
  }
  try {
    const parentDir = path.join(root, "..");
    const files = fs.readdirSync(parentDir);
    for (const file of files) {
      if (file.toLowerCase().includes("the-boyz-comic") || file.toLowerCase().includes("theboyz-comic")) {
        const p = path.join(parentDir, file);
        if (fs.statSync(p).isDirectory()) {
          return p;
        }
      }
    }
  } catch (e) {}
  return path.join(root, "..", "the-boyz-comic");
}

const appRoot = process.env.PUBLISH_PROJECT_ROOT || projectRoot;
const siblingRoot = process.env.PUBLISH_ASSETS_ROOT || getSiblingRoot(appRoot);
const SOURCE_DIR = path.join(siblingRoot, 'comics');
const DEST_DIR = path.join(appRoot, 'public', 'comics');

// En CI los dos repos se clonan con segundos de diferencia: comparar mtimes copiaría
// JSON viejo de assets encima de lo guardado por el editor. Con "web", la app manda.
const WEB_IS_JSON_SOURCE = process.env.SYNC_JSON_SOURCE === 'web';

function sameFileContent(a, b) {
  const sa = fs.statSync(a);
  const sb = fs.statSync(b);
  if (sa.size !== sb.size) return false;
  return fs.readFileSync(a).equals(fs.readFileSync(b));
}

function dirContainsJson(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() ? dirContainsJson(full) : entry.name.toLowerCase().endsWith('.json')) {
      return true;
    }
  }
  return false;
}

if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`❌ El repositorio de assets no existe en: ${SOURCE_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

function titleCase(str) {
  return str
    .split(/[-_ ]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parsePrefix(name) {
  const match = name.match(/^(?:#)?(\d+)[-_. ]+(.*)$/);
  if (match) {
    return {
      order: parseInt(match[1], 10),
      cleanName: match[2],
    };
  }
  return { order: null, cleanName: name };
}

function syncDirectories(srcDir, destDir, depth = 0) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`📁 Creado directorio: ${path.relative(DEST_DIR, destDir)}`);
  }

  // Auto-generate saga.json if missing in Saga directory (depth === 1)
  if (depth === 1) {
    const sagaJsonPath = path.join(srcDir, 'saga.json');
    if (!fs.existsSync(sagaJsonPath)) {
      const folderName = path.basename(srcDir);
      const { order, cleanName } = parsePrefix(folderName);
      const sagaMeta = {
        title: titleCase(cleanName),
        tagline: "Una saga de cómics original.",
        description: "Una historia picante donde los pibes se mandan una tras otra.",
        color: "#1b4332",
        status: "draft"
      };
      if (order !== null) {
        sagaMeta.order = order;
      }
      fs.writeFileSync(sagaJsonPath, JSON.stringify(sagaMeta, null, 2), 'utf-8');
      console.log(`✨ Creado saga.json por defecto: ${folderName}/saga.json`);
    }
  }

  // Auto-generate chapter.json if missing in Chapter directory (depth === 2)
  if (depth === 2) {
    const chapterJsonPath = path.join(srcDir, 'chapter.json');
    if (!fs.existsSync(chapterJsonPath)) {
      const folderName = path.basename(srcDir);
      const { order, cleanName } = parsePrefix(folderName);
      const chapterMeta = {
        title: titleCase(cleanName),
        number: order !== null ? order : 1,
        status: "draft"
      };
      fs.writeFileSync(chapterJsonPath, JSON.stringify(chapterMeta, null, 2), 'utf-8');
      console.log(`✨ Creado chapter.json por defecto: ${path.basename(path.dirname(srcDir))}/${folderName}/chapter.json`);
    }
  }

  const items = fs.readdirSync(srcDir);
  const destItems = fs.existsSync(destDir) ? fs.readdirSync(destDir) : [];

  // 1. Sync files from Source to Dest
  for (const item of items) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      syncDirectories(srcPath, destPath, depth + 1);
    } else {
      const ext = path.extname(item).toLowerCase();
      if (ext === '.json') {
        const srcMtime = stat.mtimeMs;
        const destExists = fs.existsSync(destPath);
        const destMtime = destExists ? fs.statSync(destPath).mtimeMs : 0;

        if (WEB_IS_JSON_SOURCE) {
          if (!destExists) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`📝 JSON nuevo desde Assets: ${path.relative(DEST_DIR, destPath)}`);
          } else if (!sameFileContent(srcPath, destPath)) {
            fs.copyFileSync(destPath, srcPath);
            console.log(`🔄 JSON de la Web → Assets: ${path.relative(DEST_DIR, destPath)}`);
          }
        } else if (!destExists || srcMtime > destMtime + 1000) { // Add 1s buffer for FS precision
          fs.copyFileSync(srcPath, destPath);
          console.log(`📝 Copiado JSON a Web (Origen es más nuevo): ${path.relative(DEST_DIR, destPath)}`);
        } else if (destMtime > srcMtime + 1000) {
          fs.copyFileSync(destPath, srcPath);
          console.log(`🔄 Copiado JSON a Assets (Web es más nuevo/actualizado): ${path.relative(DEST_DIR, destPath)}`);
        }
      } else if (IMAGE_EXTS.includes(ext)) {
        const baseName = path.basename(item, ext).toLowerCase();
        if (baseName === 'portada') {
          const srcMtime = stat.mtimeMs;
          const destExists = fs.existsSync(destPath);
          const destMtime = destExists ? fs.statSync(destPath).mtimeMs : 0;

          if (WEB_IS_JSON_SOURCE) {
            if (!destExists || !sameFileContent(srcPath, destPath)) {
              fs.copyFileSync(srcPath, destPath);
              console.log(`🖼️ Portada desde Assets: ${path.relative(DEST_DIR, destPath)}`);
            }
          } else if (!destExists || srcMtime > destMtime + 1000) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`🖼️ Copiada portada real a Web: ${path.relative(DEST_DIR, destPath)}`);
          } else if (destMtime > srcMtime + 1000) {
            fs.copyFileSync(destPath, srcPath);
            console.log(`🔄 Copiada portada real a Assets (Web es más nueva): ${path.relative(DEST_DIR, destPath)}`);
          }
        } else {
          // Create a 0-byte placeholder for content pages
          const exists = fs.existsSync(destPath);
          const currentSize = exists ? fs.statSync(destPath).size : -1;
          if (!exists || currentSize > 0) {
            fs.writeFileSync(destPath, '');
            console.log(`⚡ Creado marcador de 0-bytes: ${path.relative(DEST_DIR, destPath)}`);
          }
        }
      }
    }
  }

  // 2. Clean up files in Dest that no longer exist in Source
  for (const destItem of destItems) {
    const srcPath = path.join(srcDir, destItem);
    const destPath = path.join(destDir, destItem);

    if (!fs.existsSync(srcPath)) {
      const stat = fs.statSync(destPath);
      if (stat.isDirectory()) {
        if (WEB_IS_JSON_SOURCE && dirContainsJson(destPath)) {
          console.warn(`⚠️ Carpeta solo en la Web (con JSON), no se elimina: ${path.relative(DEST_DIR, destPath)}`);
          continue;
        }
        fs.rmSync(destPath, { recursive: true, force: true });
        console.log(`🗑️ Eliminado directorio huérfano: ${path.relative(DEST_DIR, destPath)}`);
      } else {
        const ext = path.extname(destItem).toLowerCase();
        const baseName = path.basename(destItem, ext).toLowerCase();
        if (ext === '.json') {
          // Si el JSON existe en la Web pero no en Assets, es un archivo nuevo creado por el editor
          // (ej. dialogues.json). Lo copiamos a Assets en lugar de eliminarlo.
          fs.copyFileSync(destPath, srcPath);
          console.log(`🔄 Copiado JSON nuevo a Assets (Evitando eliminación): ${path.relative(DEST_DIR, destPath)}`);
        } else if (IMAGE_EXTS.includes(ext) && baseName === 'portada') {
          // Si la portada existe en la Web pero no en Assets, la copiamos a Assets en lugar de eliminarla.
          fs.copyFileSync(destPath, srcPath);
          console.log(`🔄 Copiada portada nueva a Assets (Evitando eliminación): ${path.relative(DEST_DIR, destPath)}`);
        } else {
          fs.unlinkSync(destPath);
          console.log(`🗑️ Eliminado archivo huérfano: ${path.relative(DEST_DIR, destPath)}`);
        }
      }
    }
  }
}

console.log('⏳ Sincronizando estructura y marcadores de posición desde el repositorio de assets...');
syncDirectories(SOURCE_DIR, DEST_DIR);
console.log('✅ Sincronización finalizada con éxito.');
