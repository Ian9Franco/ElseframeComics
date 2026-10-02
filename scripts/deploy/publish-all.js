const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

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

const siblingRoot = getSiblingRoot(projectRoot);

const commitMsg = process.argv[2] || "chore: sync y actualizaciones de diálogos/cómics";

console.log("🚀 Iniciando flujo de publicación unificado...\n");
console.log(`Mensaje de commit: "\x1b[32m${commitMsg}\x1b[0m"\n`);

// ── 1. Optimizar y sincronizar assets (Imágenes y Audios) ──────────────────
console.log("--- 🎨 Preparando Assets ---");
try {
  console.log("⏳ Corriendo optimización de imágenes locales de cómics (convert en the-boyz-comic)...");
  execSync("npm run convert", { cwd: siblingRoot, stdio: "inherit" });

  console.log("⏳ Corriendo optimización general de imágenes (compress en the-boys)...");
  execSync("npm run compress", { cwd: projectRoot, stdio: "inherit" });

  console.log("⏳ Corriendo compresión de audios (compress:audio en the-boys)...");
  execSync("npm run compress:audio", { cwd: projectRoot, stdio: "inherit" });
  
  console.log("⏳ Sincronizando marcadores con el proyecto principal (sync en the-boyz-comic)...");
  execSync("npm run sync", { cwd: siblingRoot, stdio: "inherit" });
} catch (error) {
  console.error("⚠️ Ocurrió un error al procesar/sincronizar los assets. Continuando con git push...", error.message);
}
console.log();

// Helper para generar mensaje de commit dinámico
function generateCommitMessage(statusText, baseMsg) {
  const lines = statusText.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return baseMsg;

  let dialoguesModified = 0;
  let dialoguesAdded = 0;
  let configsModified = 0;
  let configsAdded = 0;
  let imagesModified = 0;
  let imagesAdded = 0;
  let audioModified = 0;
  let audioAdded = 0;
  let codeModified = 0;
  let codeAdded = 0;
  let deletedCount = 0;
  let othersCount = 0;

  const affectedChapters = new Set();
  const affectedSagas = new Set();

  for (const line of lines) {
    if (line.length < 3) continue;
    const type = line.substring(0, 2).trim();
    let filePath = line.substring(2).trim();

    // Quitar comillas que Git agrega a las rutas con espacios o caracteres especiales
    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1);
    }
    filePath = filePath.replace(/"/g, '');

    // Extraer saga y capítulo de la ruta si aplica
    const comicMatch = filePath.match(/public[/\\]comics[/\\]([^/\\]+)(?:[/\\]([^/\\]+))?/);
    if (comicMatch) {
      if (comicMatch[1]) affectedSagas.add(comicMatch[1].replace(/^#\d+\s+/, ''));
      if (comicMatch[2]) affectedChapters.add(comicMatch[2].replace(/^#\d+\s+/, ''));
    }

    const isAdded = type === "??" || type === "A";
    const isDeleted = type === "D";

    if (isDeleted) {
      deletedCount++;
    } else if (filePath.endsWith("dialogues.json")) {
      if (isAdded) dialoguesAdded++;
      else dialoguesModified++;
    } else if (filePath.endsWith("chapter.json") || filePath.endsWith("saga.json")) {
      if (isAdded) configsAdded++;
      else configsModified++;
    } else if (/\.(png|jpe?g|webp|gif|svg)$/i.test(filePath)) {
      if (isAdded) imagesAdded++;
      else imagesModified++;
    } else if (/\.(mp3|wav|ogg)$/i.test(filePath)) {
      if (isAdded) audioAdded++;
      else audioModified++;
    } else if (/\.(tsx?|jsx?|css)$/i.test(filePath)) {
      if (isAdded) codeAdded++;
      else codeModified++;
    } else {
      othersCount++;
    }
  }

  const parts = [];
  if (dialoguesModified > 0) parts.push(`${dialoguesModified} diálogos modif.`);
  if (dialoguesAdded > 0) parts.push(`${dialoguesAdded} diálogos añad.`);
  
  if (imagesAdded > 0) parts.push(`${imagesAdded} imágenes añad.`);
  if (imagesModified > 0) parts.push(`${imagesModified} imágenes modif.`);
  
  if (audioAdded > 0) parts.push(`${audioAdded} audios añad.`);
  if (audioModified > 0) parts.push(`${audioModified} audios modif.`);
  
  if (configsAdded > 0 || configsModified > 0) {
    const totalConf = configsAdded + configsModified;
    parts.push(`${totalConf} config modif.`);
  }
  
  if (codeAdded > 0) parts.push(`${codeAdded} cód. añad.`);
  if (codeModified > 0) parts.push(`${codeModified} cód. modif.`);
  
  if (deletedCount > 0) parts.push(`${deletedCount} eliminados`);
  if (othersCount > 0) parts.push(`${othersCount} otros`);

  let context = "";
  if (affectedChapters.size > 0) {
    context = ` en [${Array.from(affectedChapters).join(", ")}]`;
  } else if (affectedSagas.size > 0) {
    context = ` en saga [${Array.from(affectedSagas).join(", ")}]`;
  }

  const changeSummary = parts.length > 0 ? parts.join(", ") : "actualización";
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timeStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return `editor [${timeStr}] - ${changeSummary}${context} (${baseMsg})`;
}

// Helper para publicar un repositorio
function publishRepo(name, dir) {
  console.log(`--- 📤 Publicando repo: ${name} ---`);
  try {
    console.log("Staging de archivos...");
    execSync("git add .", { cwd: dir, stdio: "inherit" });

    const status = execSync("git status --porcelain", { cwd: dir }).toString().trim();
    if (!status) {
      console.log(`✅ No hay cambios pendientes en ${name}.\n`);
      return;
    }

    console.log("Creando commit...");
    const dynamicCommitMsg = generateCommitMessage(status, commitMsg);
    console.log(`Mensaje dinámico generado: "\x1b[32m${dynamicCommitMsg}\x1b[0m"\n`);

    const commitResult = spawnSync("git", ["commit", "-m", dynamicCommitMsg], { cwd: dir, stdio: "inherit" });
    if (commitResult.status !== 0) {
      throw new Error("git commit falló");
    }

    console.log("Haciendo git push...");
    const publishTarget = process.env.PUBLISH_TARGET_BRANCH;
    if (publishTarget) {
      execSync(`git push origin HEAD:${publishTarget}`, { cwd: dir, stdio: "inherit" });
      execSync("git push origin HEAD:editor-workspace --force-with-lease", { cwd: dir, stdio: "inherit" });
    } else {
      execSync("git push", { cwd: dir, stdio: "inherit" });
    }

    console.log(`🎉 ¡${name} publicado con éxito!\n`);
  } catch (error) {
    console.error(`❌ Error al publicar ${name}:`, error.message);
    console.log();
  }
}

// ── 2. Hacer commit y push de ambos repositorios ──────────────────────────
publishRepo("the-boyz-comic (Assets)", siblingRoot);
publishRepo("the-boys (Main App)", projectRoot);

console.log("🏁 ¡Flujo de publicación unificado completado!");
