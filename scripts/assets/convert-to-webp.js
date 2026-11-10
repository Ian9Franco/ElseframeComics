const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const sharp = require('sharp');

// --- CONFIGURACIÓN ---
const args = process.argv.slice(2);
const deleteOriginals = true; // Por defecto siempre eliminar originales
const dryRun = args.includes('--dry-run');
const quality = 85; // Mejor calidad
const effort = 6; // Mayor compresión

const projectRoot = path.join(__dirname, "..", "..");
const localPublicDir = path.join(projectRoot, "public");

function getSiblingRoot(root) {
  const possibleNames = ["Elseframe-comic-v1", "the-boyz-comic", "theboyz-comic-v1", "theboyz-comic"];
  for (const name of possibleNames) {
    const p = path.join(root, "..", name);
    if (fsSync.existsSync(p)) {
      return p;
    }
  }
  try {
    const parentDir = path.join(root, "..");
    const files = fsSync.readdirSync(parentDir);
    for (const file of files) {
      if (file.toLowerCase().includes("elseframe-comic") || file.toLowerCase().includes("the-boyz-comic") || file.toLowerCase().includes("theboyz-comic")) {
        const p = path.join(parentDir, file);
        if (fsSync.statSync(p).isDirectory()) {
          return p;
        }
      }
    }
  } catch (e) {}
  return null;
}

const siblingRoot = getSiblingRoot(projectRoot);
const targetDirs = [localPublicDir];

if (siblingRoot) {
  const siblingComicsDir = path.join(siblingRoot, "comics");
  const siblingPublicDir = path.join(siblingRoot, "public");
  
  if (fsSync.existsSync(siblingComicsDir)) {
    targetDirs.push(siblingComicsDir);
  } else if (fsSync.existsSync(siblingPublicDir)) {
    targetDirs.push(siblingPublicDir);
  }
}

const PROTECTED_ASSETS = ['logo.png', 'ian.png', 'jaz.png', 'julian.png', 'mati.png', 'uandi.png', 'volvo.png', 'matapobre.png', 'sofi.png'];

// Contadores globales
let stats = { found: 0, converted: 0, deleted: 0, savedBytes: 0, errors: 0 };

async function convertImage(fullPath, ext) {
  const webpPath = fullPath.substring(0, fullPath.length - ext.length) + '.webp';
  
  try {
    const fileStat = await fs.stat(fullPath);
    const originalSize = fileStat.size;

    if (dryRun) {
      console.log(`[Dry Run] Would convert: ${path.basename(fullPath)}`);
      return;
    }

    const info = await sharp(fullPath).webp({ quality, effort }).toFile(webpPath);
    stats.converted++;
    stats.savedBytes += (originalSize - info.size);

    console.log(`[Converted] ${path.basename(fullPath)} -> ${((originalSize - info.size) / 1024).toFixed(1)} KB saved`);

    if (deleteOriginals) {
      await fs.unlink(fullPath);
      stats.deleted++;
    }
  } catch (err) {
    stats.errors++;
    console.error(`[Error] Failed to process ${fullPath}:`, err.message);
  }
}

async function walkDir(dir) {
  if (!fsSync.existsSync(dir)) return;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await walkDir(fullPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.avif', '.tiff', '.bmp'].includes(ext)) {
        const isProtected = PROTECTED_ASSETS.includes(entry.name.toLowerCase());
        const isInComics = fullPath.includes('comics') || fullPath.includes('comics\\') || fullPath.includes('comics/');
        const isInPersonajes = fullPath.includes('personajes') || fullPath.includes('personajes\\') || fullPath.includes('personajes/');
        
        if (isProtected && !isInComics && !isInPersonajes) {
          continue;
        }
        
        stats.found++;
        await convertImage(fullPath, ext);
      }
    }
  }
}

// Ejecución principal
(async () => {
  console.log('Iniciando conversión...');
  for (const dir of targetDirs) {
    console.log(`\n🔍 Escaneando directorio: ${dir}`);
    await walkDir(dir);
  }
  
  console.log('\n--- 📊 Resumen de Conversión ---');
  console.log(`Imágenes encontradas: ${stats.found}`);
  console.log(`Convertidas con éxito: ${stats.converted}`);
  if (stats.errors > 0) console.log(`⚠️ Errores: ${stats.errors}`);
  console.log(`Espacio ahorrado: ${(stats.savedBytes / (1024 * 1024)).toFixed(2)} MB`);
})();