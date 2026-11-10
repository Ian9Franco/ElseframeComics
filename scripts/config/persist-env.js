/**
 * Persists .env.local outside the repo so API keys and secrets survive
 * fresh clones, npm install, and project folder renames.
 *
 * Storage:
 *   Windows: %LOCALAPPDATA%\elseframe\config\.env.local
 *   macOS/Linux: ~/.config/elseframe/.env.local
 *
 * Si todavía existe la carpeta vieja "the-boys", la primera restauración la copia.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const projectRoot = path.join(__dirname, "..", "..");
const envLocalPath = path.join(projectRoot, ".env.local");
const envExamplePath = path.join(projectRoot, ".env.example");

function configHome(folderName) {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(base, folderName, "config");
  }
  return path.join(os.homedir(), ".config", folderName);
}

function getPersistDir() {
  return configHome("elseframe");
}

function getLegacyPersistPath() {
  return path.join(configHome("the-boys"), ".env.local");
}

function getPersistPath() {
  return path.join(getPersistDir(), ".env.local");
}

function ensurePersistDir() {
  const dir = getPersistDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getMtime(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.statSync(filePath).mtimeMs;
}

function copyFile(from, to) {
  ensurePersistDir();
  fs.copyFileSync(from, to);
}

function save() {
  if (!fs.existsSync(envLocalPath)) {
    console.log("ℹ️  No hay .env.local en el proyecto; nada que guardar.");
    return false;
  }

  const persistPath = getPersistPath();
  const localMtime = getMtime(envLocalPath);
  const persistMtime = getMtime(persistPath);

  if (persistMtime > localMtime) {
    console.log("ℹ️  La copia persistente es más reciente; no se sobrescribe.");
    return false;
  }

  copyFile(envLocalPath, persistPath);
  console.log(`💾 Config guardada en: ${persistPath}`);
  return true;
}

function restore() {
  const persistPath = getPersistPath();
  const legacyPath = getLegacyPersistPath();
  if (!fs.existsSync(persistPath) && fs.existsSync(legacyPath)) {
    copyFile(legacyPath, persistPath);
    console.log(`♻️  Config movida desde la carpeta anterior hacia: ${persistPath}`);
  }

  if (!fs.existsSync(persistPath)) {
    if (!fs.existsSync(envLocalPath) && fs.existsSync(envExamplePath)) {
      console.log("ℹ️  No hay config guardada. Copiá .env.example → .env.local y completá tus claves.");
    }
    return false;
  }

  const localExists = fs.existsSync(envLocalPath);
  const localMtime = getMtime(envLocalPath);
  const persistMtime = getMtime(persistPath);

  if (!localExists || persistMtime > localMtime) {
    copyFile(persistPath, envLocalPath);
    console.log(`♻️  Config restaurada desde: ${persistPath}`);
    return true;
  }

  if (localExists && localMtime >= persistMtime) {
    copyFile(envLocalPath, persistPath);
    console.log(`💾 Config del proyecto sincronizada hacia: ${persistPath}`);
    return true;
  }

  return false;
}

function status() {
  const persistPath = getPersistPath();
  console.log("📁 Config persistente:", persistPath);
  console.log("   Existe:", fs.existsSync(persistPath) ? "sí" : "no");
  console.log("📁 .env.local del proyecto:", envLocalPath);
  console.log("   Existe:", fs.existsSync(envLocalPath) ? "sí" : "no");
}

const command = process.argv[2] || "restore";

switch (command) {
  case "save":
    save();
    break;
  case "restore":
    restore();
    break;
  case "status":
    status();
    break;
  default:
    console.error(`Comando desconocido: ${command}. Usá: save | restore | status`);
    process.exit(1);
}
