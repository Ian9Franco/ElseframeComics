const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const projectRoot = process.env.PUBLISH_PROJECT_ROOT || path.join(__dirname, "..", "..");

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

const siblingRoot = process.env.PUBLISH_ASSETS_ROOT || getSiblingRoot(projectRoot);
const skipAssetsPush = process.env.PUBLISH_SKIP_ASSETS_PUSH === "1";

const commitMsg = process.argv[2] || "chore: sync y actualizaciones de diálogos/cómics";

console.log("🚀 Iniciando flujo de publicación unificado...\n");
console.log(`Mensaje de commit: "\x1b[32m${commitMsg}\x1b[0m"\n`);

// ── 0. Integrar main antes de tocar archivos (el merge necesita working tree limpio) ──
if (process.env.PUBLISH_TARGET_BRANCH) {
  try {
    console.log("--- 🔀 Integrando rama destino antes de sincronizar ---");
    mergeTargetBranchBeforePublish(projectRoot, process.env.PUBLISH_TARGET_BRANCH);
    if (!skipAssetsPush) {
      mergeTargetBranchBeforePublish(siblingRoot, process.env.PUBLISH_TARGET_BRANCH);
    }
    console.log();
  } catch (error) {
    reportError(error.message);
    process.exit(1);
  }
}

// ── 1. Optimizar y sincronizar assets (Imágenes y Audios) ──────────────────
const skipOptimize = process.env.PUBLISH_SKIP_OPTIMIZE === "1";
console.log("--- 🎨 Preparando Assets ---");
if (skipOptimize) {
  console.log("⏭️ PUBLISH_SKIP_OPTIMIZE=1: omitiendo convert/compress (típico en GitHub Actions).");
  console.log("⏳ Sincronizando marcadores...");
  const syncResult = spawnSync(process.execPath, [path.join(__dirname, "sync-placeholders.js")], {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, PUBLISH_PROJECT_ROOT: projectRoot, PUBLISH_ASSETS_ROOT: siblingRoot },
  });
  if (syncResult.status !== 0) {
    reportError("Falló la sincronización de marcadores entre assets y la app.");
    process.exit(1);
  }
} else {
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

function assertAllowedPublishBranch(branch) {
  if (branch !== "main" && branch !== "editor-workspace") {
    throw new Error(`Rama de publicación no permitida: ${branch}`);
  }
}

function gitSpawn(args, dir, inherit = false) {
  const result = spawnSync("git", args, {
    cwd: dir,
    encoding: "utf-8",
    stdio: inherit ? "inherit" : "pipe",
  });
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `git ${args.join(" ")}`;
    throw new Error(detail);
  }
  return (result.stdout || "").trim();
}

function revCount(range, dir) {
  try {
    const out = gitSpawn(["rev-list", "--count", range], dir);
    const n = parseInt(out, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function isGitAncestor(ancestor, descendant, dir) {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
    cwd: dir,
    encoding: "utf-8",
  });
  return result.status === 0;
}

function fetchOriginBranchForMerge(dir, publishTarget, depth = 64) {
  gitSpawn(["fetch", `--depth=${depth}`, "origin", publishTarget], dir, true);
}

function mergeTargetBranchBeforePublish(dir, publishTarget) {
  assertAllowedPublishBranch(publishTarget);
  const remoteRef = `origin/${publishTarget}`;
  try {
    fetchOriginBranchForMerge(dir, publishTarget, 64);
  } catch (error) {
    throw new Error(`No se pudo hacer fetch de origin/${publishTarget}: ${error.message}`);
  }

  if (isGitAncestor(remoteRef, "HEAD", dir)) {
    return;
  }

  const behind = revCount(`HEAD..${remoteRef}`, dir);
  const label =
    behind > 0
      ? `${behind} commit(s) de ${remoteRef}`
      : `historial divergente con ${remoteRef}`;
  console.log(`Integrando ${label} antes de publicar...`);
  let mergeResult = spawnSync(
    "git",
    ["merge", remoteRef, "-m", `merge ${publishTarget} into workspace before publish`],
    { cwd: dir, stdio: "inherit" }
  );
  if (mergeResult.status !== 0) {
    console.log("Merge falló en clone superficial; profundizando historial y reintentando...");
    try {
      gitSpawn(["fetch", "--deepen=100", "origin", publishTarget], dir, true);
    } catch (deepenErr) {
      throw new Error(
        `Merge con ${remoteRef} falló y no se pudo profundizar el historial: ${deepenErr.message}`
      );
    }
    mergeResult = spawnSync(
      "git",
      ["merge", remoteRef, "-m", `merge ${publishTarget} into workspace before publish`],
      { cwd: dir, stdio: "inherit" }
    );
  }
  if (mergeResult.status !== 0) {
    throw new Error(
      `Merge con ${remoteRef} falló. Resolvé conflictos en editor-workspace antes de publicar.`
    );
  }
}

function pushHeadToBranch(dir, branch) {
  assertAllowedPublishBranch(branch);
  gitSpawn(["push", "origin", `HEAD:${branch}`], dir, true);
}

function pushToPublishTargets(dir, publishTarget) {
  try {
    pushHeadToBranch(dir, publishTarget);
  } catch (error) {
    const msg = error.message || "";
    if (!/rejected|non-fast-forward|fetch first/i.test(msg)) {
      throw error;
    }
    console.log("Push rechazado (non-fast-forward). Reintentando tras integrar main...");
    mergeTargetBranchBeforePublish(dir, publishTarget);
    pushHeadToBranch(dir, publishTarget);
  }
  try {
    gitSpawn(["push", "origin", "HEAD:editor-workspace", "--force-with-lease"], dir, true);
  } catch (error) {
    // Un guardado durante la publicación mueve editor-workspace; main ya quedó publicado
    // y el próximo Publicar integra lo nuevo.
    reportWarning(`No se actualizó editor-workspace tras publicar: ${error.message}`);
  }
}

function reportError(message) {
  console.error(`❌ ${message}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::error::${message.replace(/\r?\n/g, " ")}`);
}

function reportWarning(message) {
  console.warn(`⚠️ ${message}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning::${message.replace(/\r?\n/g, " ")}`);
}

// Helper para publicar un repositorio. Devuelve { pushed, error }.
function publishRepo(name, dir) {
  console.log(`--- 📤 Publicando repo: ${name} ---`);
  const publishTarget = process.env.PUBLISH_TARGET_BRANCH;
  let pushed = false;

  try {
    if (publishTarget) {
      mergeTargetBranchBeforePublish(dir, publishTarget);
    }

    console.log("Staging de archivos...");
    execSync("git add .", { cwd: dir, stdio: "inherit" });

    const status = gitSpawn(["status", "--porcelain"], dir);
    if (status) {
      console.log("Creando commit...");
      const dynamicCommitMsg = generateCommitMessage(status, commitMsg);
      console.log(`Mensaje dinámico generado: "\x1b[32m${dynamicCommitMsg}\x1b[0m"\n`);

      const commitResult = spawnSync("git", ["commit", "-m", dynamicCommitMsg], { cwd: dir, stdio: "inherit" });
      if (commitResult.status !== 0) {
        throw new Error("git commit falló");
      }
    } else {
      console.log(`✅ Working tree limpio en ${name}.`);
    }

    if (publishTarget) {
      assertAllowedPublishBranch(publishTarget);
      const ahead = revCount(`origin/${publishTarget}..HEAD`, dir);
      if (ahead > 0) {
        if (!status) {
          console.log(`📤 Nada que commitear, pero ${ahead} commit(s) por publicar a ${publishTarget}...`);
        }
        console.log("Haciendo git push...");
        pushToPublishTargets(dir, publishTarget);
        pushed = true;
        console.log(`🎉 ¡${name} publicado con éxito!\n`);
      } else if (!status) {
        console.log(`✅ No hay commits por publicar a ${publishTarget} en ${name}.\n`);
      }
    } else if (status) {
      console.log("Haciendo git push...");
      execSync("git push", { cwd: dir, stdio: "inherit" });
      pushed = true;
      console.log(`🎉 ¡${name} publicado con éxito!\n`);
    } else {
      console.log(`✅ No hay cambios pendientes en ${name}.\n`);
    }

    return { pushed, error: false };
  } catch (error) {
    reportError(`Error al publicar ${name}: ${error.message}`);
    console.log();
    return { pushed: false, error: true };
  }
}

// ── 2. Hacer commit y push de ambos repositorios ──────────────────────────
let hadError = false;
let mainAppPushed = false;

if (skipAssetsPush) {
  console.log("⏭️ PUBLISH_SKIP_ASSETS_PUSH=1: omitiendo push del repo de assets (PAT inválido en CI).\n");
} else {
  const assetsResult = publishRepo("the-boyz-comic (Assets)", siblingRoot);
  if (assetsResult.error) {
    reportError("No se publica la app porque falló el repo de assets (páginas y diálogos quedarían desalineados).");
    process.exit(1);
  }
}

const appResult = publishRepo("the-boys (Main App)", projectRoot);
if (appResult.error) hadError = true;
mainAppPushed = appResult.pushed;

if (mainAppPushed) {
  console.log("PUBLISH_MAIN_PUSHED=1");
}

console.log("🏁 ¡Flujo de publicación unificado completado!");

if (hadError) {
  process.exit(1);
}
