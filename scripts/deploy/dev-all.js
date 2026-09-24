const { spawn } = require("child_process");
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

console.log("🚀 Iniciando servidores de desarrollo para ambos proyectos...\n");

// ── Watch & Auto-generate characterImages.ts ──────────────────────────────
console.log("⏳ Sincronizando personajes desde GUIAS...");
try {
  const { syncCharacters } = require("../assets/sync-missing-characters.js");
  syncCharacters();
} catch (e) {
  console.error("Error al sincronizar personajes iniciales:", e.message);
}

console.log("⏳ Generando mapping de imágenes inicial...");
try {
  require("../assets/generate-character-images.js");
} catch (e) {
  console.error("Error al generar imágenes iniciales:", e.message);
}

const watchDirs = [
  path.join(projectRoot, "public", "personajes", "PORTADAS"),
  path.join(projectRoot, "public", "personajes", "Fichas"),
  path.join(projectRoot, "public", "personajes", "GUIAS"),
];

let debounceTimeout;
const handleWatchChange = (eventType, filename) => {
  // Ignore temporary/system files or generated file itself to prevent infinite loop
  if (filename && (filename.endsWith('.ts') || filename.endsWith('.js') || filename.startsWith('.'))) return;
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    console.log(`\n🔄 Cambio detectado en recursos (${filename || 'archivo'}). Regenerando mapping de imágenes...`);
    try {
      delete require.cache[require.resolve("../assets/sync-missing-characters.js")];
      const { syncCharacters } = require("../assets/sync-missing-characters.js");
      syncCharacters();

      delete require.cache[require.resolve("../assets/generate-character-images.js")];
      require("../assets/generate-character-images.js");
    } catch (e) {
      console.error("Error al regenerar imágenes:", e.message);
    }
  }, 1000);
};

watchDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      fs.watch(dir, { recursive: true }, handleWatchChange);
      console.log(`👁️  Vigilando cambios en: ${path.relative(projectRoot, dir)}`);
    } catch (e) {
      try {
        fs.watch(dir, handleWatchChange);
        console.log(`👁️  Vigilando cambios (no recursivo) en: ${path.relative(projectRoot, dir)}`);
      } catch (err) {}
    }
  }
});
console.log("");


function killPortSync(port) {
  const isWindows = process.platform === "win32";
  try {
    if (isWindows) {
      const { execSync } = require("child_process");
      // Find PIDs listening on port and kill them
      const result = execSync(
        `netstat -ano | findstr :${port}`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      );
      const pids = new Set();
      result.split("\n").forEach(line => {
        const parts = line.trim().split(/\s+/);
        // netstat line: Proto  LocalAddr  ForeignAddr  State  PID
        if (parts.length >= 5 && parts[3] === "LISTENING") {
          const pid = parseInt(parts[4], 10);
          if (!isNaN(pid)) pids.add(pid);
        }
      });
      pids.forEach(pid => {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
          console.log(`🔫 Liberado puerto ${port} (PID ${pid})`);
        } catch (e) {}
      });
    } else {
      const { execSync } = require("child_process");
      execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: "ignore" });
    }
  } catch (e) {
    // No process on that port, that's fine
  }
}

const NEXT_DEV_PORT = 616;

function runProcess(name, command, args, cwd, env = process.env) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: "pipe",
    shell: true,
  });

  child.stdout.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach(line => {
      console.log(`[\x1b[36m${name}\x1b[0m] ${line}`);
    });
  });

  child.stderr.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach(line => {
      console.error(`[\x1b[31m${name} ERROR\x1b[0m] ${line}`);
    });
  });

  child.on("close", (code) => {
    console.log(`[\x1b[33m${name}\x1b[0m] Proceso finalizado con código ${code}`);
  });

  return child;
}

// Free ports in case a previous dev:all left zombie processes
console.log(`🔍 Verificando puertos ${NEXT_DEV_PORT} y 8080...`);
killPortSync(NEXT_DEV_PORT);
killPortSync(8080);

const nextDevEnv = {
  ...process.env,
  PORT: String(NEXT_DEV_PORT),
  SKIP_PREVIEW_AUTH: "true",
  NEXT_PUBLIC_SKIP_PREVIEW_AUTH: "true",
};

console.log(`🌐 Next.js → http://localhost:${NEXT_DEV_PORT} (auth bypass activo)\n`);

const p1 = runProcess(
  "Next.js App",
  "npm",
  ["run", "dev", "--", "-p", String(NEXT_DEV_PORT)],
  projectRoot,
  nextDevEnv
);
const p2 = runProcess("Comic Assets", "npm", ["run", "dev"], siblingRoot);

// Handle graceful termination
const handleExit = () => {
  console.log("\nStopping dev servers...");
  p1.kill("SIGINT");
  p2.kill("SIGINT");
  process.exit();
};

process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);
