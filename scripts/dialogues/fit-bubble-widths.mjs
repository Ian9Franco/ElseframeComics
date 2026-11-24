/**
 * Apply editor "Ajustar ancho" (suggestBubbleWidth) to every dialogue line — width only.
 * Usage: node scripts/dialogues/fit-bubble-widths.mjs <path-to-dialogues.json>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function comicTextContainment(fontSizePx, legacyExtraPad = 0, opts = {}) {
  const mobile = opts.mobile ?? false;
  const speech = opts.speechBalloon ?? false;
  let extra = legacyExtraPad;
  if (speech) {
    extra = mobile ? fontSizePx * 0.1 : fontSizePx * 0.22;
  }
  let padX;
  if (mobile) {
    padX = Math.max(6, fontSizePx * 0.38) + extra;
  } else {
    padX = Math.max(10, fontSizePx * 0.48) + extra;
  }
  return { paddingLeft: `${padX}px` };
}

/** Mirror of components/reader/readerUtils.ts suggestBubbleWidth (desktop). */
function suggestBubbleWidth(line) {
  const size = line.size ?? "medium";
  const style = line.style ?? "normal";
  let baseFontSize = line.fontSize;
  if (!baseFontSize) {
    baseFontSize =
      style === "sfx"
        ? size === "small"
          ? 18
          : size === "large"
            ? 48
            : 32
        : size === "small"
          ? 12
          : size === "large"
            ? 18
            : 14;
  }
  const mobile = false;
  const isSpeech = style === "normal" || style === "whisper";
  const pad = comicTextContainment(baseFontSize, 0, {
    mobile,
    speechBalloon: isSpeech,
  });
  const padX = parseFloat(pad.paddingLeft) || 10;
  const textLen = (line.text || "").length || 4;
  if (style === "cinematic") {
    return Math.min(960, Math.max(280, textLen * baseFontSize * 0.55 + padX * 2));
  }
  if (style === "caption") {
    return Math.min(220, Math.max(72, textLen * baseFontSize * 0.5 + padX * 2));
  }
  return Math.min(280, Math.max(72, textLen * baseFontSize * 0.42 + padX * 2));
}

function walkDialogues(root, onLine) {
  if (!root?.pages) return;
  for (const page of Object.values(root.pages)) {
    if (page.dialogue?.length) {
      page.dialogue.forEach((line, i) => onLine(line, { i }));
    }
    if (page.panels?.length) {
      for (const panel of page.panels) {
        panel.dialogue?.forEach((line, i) => onLine(line, { i }));
      }
    }
  }
}

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/dialogues/fit-bubble-widths.mjs <dialogues.json>");
  process.exit(1);
}

const absolutePath = path.resolve(target);
if (!fs.existsSync(absolutePath)) {
  console.error(`Not found: ${absolutePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(absolutePath, "utf8");
const data = JSON.parse(raw);

const backupDir = path.join(path.dirname(absolutePath), ".dialogues-backups");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `dialogues-before-fit-width-${stamp}.json`);
fs.writeFileSync(backupPath, raw, "utf8");

let total = 0;
let changed = 0;

walkDialogues(data, (line) => {
  total++;
  const w = Math.round(suggestBubbleWidth(line) * 100) / 100;
  const prev = line.width;
  if (prev !== w) {
    changed++;
    line.width = w;
  }
});

fs.writeFileSync(absolutePath, JSON.stringify(data), "utf8");

const formatScript = path.join(__dirname, "..", "assets", "format-dialogues.js");
const { spawnSync } = await import("child_process");
const fmt = spawnSync(process.execPath, [formatScript, absolutePath], { encoding: "utf8" });
if (fmt.status !== 0) {
  console.error(fmt.stderr || fmt.stdout);
  process.exit(1);
}

console.log(`Backup: ${backupPath}`);
console.log(`Bubbles: ${total}, width updated: ${changed}`);
console.log(`Saved: ${absolutePath}`);