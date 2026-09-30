import fs from "fs";
import path from "path";

const ROOT = path.join(
  process.cwd(),
  "public/comics/#11 Inmortal/#1 La noche que volvio"
);
const DIALOGUES_PATH = path.join(ROOT, "dialogues.json");
// Páginas reales: D:/.CodeProjects/the-boyz-comic/comics/#11 Inmortal/#1 La noche que volvio
// (public/… en este repo = placeholders de peso)

function L(text, speaker, opts = {}) {
  const line = {
    text,
    size: "small",
    posX: opts.px ?? 20,
    posY: opts.py ?? 10,
    tailX: 40,
    tailY: 24,
    tailWidth: 6,
    tailCurvature: -22,
    width: opts.w ?? 150,
    fontSize: 8,
    borderRadius: 18,
    speaker,
  };
  if (opts.style) line.style = opts.style;
  if (opts.tail) line.tail = opts.tail;
  if (opts.offscreen) {
    line.offscreen = true;
    line.showSpeakerName = true;
  }
  if (opts.thought) {
    line.style = "thought";
    line.tail = "none";
  }
  return line;
}

function cap(text, py, px = 12, w = 200) {
  return L(text, "Narración", {
    style: "caption",
    tail: "none",
    px,
    py,
    w,
  });
}

function panel(focusY, lines) {
  const p = { focusY, dialogue: lines };
  if (lines.length) {
    const py = lines[0].posY ?? Math.round(focusY * 100);
    p.zoomRects = [{ x: 0, y: Math.max(0, py - 8), w: 100, h: 24 }];
  }
  return p;
}

/** @type {Record<string, ReturnType<typeof panel>[]>} */
const PATCH = {
  "11": [
    panel(0.15, [cap("Horas después.", 8, 38, 120), cap("3:07 AM.", 18, 38, 90)]),
    panel(0.38, [
      cap("Luces blancas. Asfalto húmedo.", 30, 12, 210),
    ]),
    panel(0.62, [
      L("Todavía me falta la yerba...", "Uandi", {
        thought: true,
        px: 15,
        py: 55,
        w: 175,
      }),
    ]),
    panel(0.85, [
      L("Buenas.", "Uandi", { px: 20, py: 78, w: 80 }),
    ]),
  ],
  "12": [
    panel(0.18, [
      L("Buenas...", "Empleado YPF", { px: 62, py: 8, w: 100 }),
    ]),
    panel(0.42, [
      L("Decime que tenés yerba.", "Uandi", { px: 12, py: 36, w: 165 }),
      L("Segundo pasillo.", "Empleado YPF", { px: 58, py: 40, w: 130 }),
    ]),
    panel(0.62, [
      L("...", "Uandi", { thought: true, px: 42, py: 58, w: 60 }),
    ]),
    panel(0.84, [
      L("Sos un héroe.", "Uandi", { px: 18, py: 72, w: 110 }),
      L("Decís eso porque son las tres de la mañana.", "Empleado YPF", {
        px: 52,
        py: 76,
        w: 195,
      }),
      L("Principalmente.", "Uandi", { px: 22, py: 86, w: 120 }),
    ]),
  ],
  "13": [
    panel(0.18, [
      cap("Ninguno de los dos presta demasiada atención.", 8, 10, 220),
    ]),
    panel(0.42, [
      cap("Capucha. Mano en el bolsillo.", 35, 12, 180),
    ]),
    panel(0.65, [
      L("...", "Uandi", { thought: true, px: 40, py: 58, w: 60 }),
    ]),
    panel(0.88, [
      L("¡No te muevas!", "Ladrón", { px: 55, py: 76, w: 120 }),
    ]),
  ],
  "14": [
    panel(0.15, [
      L("La billetera.", "Ladrón", { px: 18, py: 6, w: 110 }),
      L("Todo.", "Ladrón", { px: 65, py: 10, w: 70 }),
    ]),
    panel(0.32, [
      L("Está bien.", "Uandi", { px: 15, py: 26, w: 95 }),
      L("Te lo voy a dar.", "Uandi", { px: 58, py: 30, w: 130 }),
    ]),
    panel(0.52, [
      L("Despacio.", "Ladrón", { px: 20, py: 48, w: 95 }),
    ]),
    panel(0.68, [
      L("Che.", "Uandi", { px: 18, py: 62, w: 60 }),
      L("¡Callate!", "Ladrón", { px: 62, py: 66, w: 100 }),
    ]),
    panel(0.88, [
      cap("BANG.", 78, 42, 80),
    ]),
  ],
  "15": [
    panel(0.2, [
      cap("Uandi intenta respirar. No puede.", 10, 12, 210),
    ]),
    panel(0.5, [
      cap("El ladrón corre con la billetera.", 42, 12, 200),
    ]),
    panel(0.82, [
      cap("No hay Aegis. Solo un hombre intentando respirar.", 68, 10, 230),
      cap("Después... nada.", 82, 38, 120),
    ]),
  ],
  "16": [
    panel(0.12, [
      L("¿Sí?", "Peter", { px: 25, py: 6, w: 70 }),
    ]),
    panel(0.32, [
      L("Habla la policía.", "Policía", { offscreen: true, px: 55, py: 26, w: 140 }),
    ]),
    panel(0.52, [
      L("Se trata de Uandi.", "Policía", { offscreen: true, px: 52, py: 46, w: 150 }),
    ]),
    panel(0.72, [
      L("¿Está vivo?", "Peter", { px: 28, py: 66, w: 110 }),
    ]),
    panel(0.9, [
      cap("Los mates se hacen pedazos en el piso.", 82, 15, 210),
    ]),
  ],
  "17": [
    panel(0.2, [
      cap("A la mañana siguiente.", 8, 28, 150),
      cap("Cinta amarilla en la YPF.", 18, 12, 180),
    ]),
    panel(0.55, [
      L("...", "Peter", { thought: true, px: 35, py: 50, w: 60 }),
    ]),
    panel(0.85, [
      L("Llegaste.", "Jaz", { px: 58, py: 76, w: 95 }),
    ]),
  ],
  "23": [
    panel(0.18, [
      L("Entró normal.", "Empleado YPF", { px: 12, py: 6, w: 120 }),
      L("¿Uandi intentó atacarlo?", "Sheriff", { px: 52, py: 10, w: 175 }),
    ]),
    panel(0.38, [L("No.", "Empleado YPF", { px: 22, py: 32, w: 60 })]),
    panel(0.58, [
      L("Le decía que se llevara la plata.", "Empleado YPF", {
        px: 12,
        py: 52,
        w: 200,
      }),
    ]),
    panel(0.82, [
      L("Se puso en el medio.", "Empleado YPF", { px: 15, py: 72, w: 155 }),
      L("Y le disparó.", "Empleado YPF", { px: 58, py: 76, w: 115 }),
    ]),
  ],
  "27": [
    panel(0.18, [
      L("Eso es todo lo que tenemos por ahora.", "Sheriff", {
        px: 12,
        py: 8,
        w: 210,
      }),
    ]),
    panel(0.42, [
      L("Gracias.", "Ian", { px: 22, py: 36, w: 80 }),
      L("Cualquier cosa nos avisás.", "Valery", { px: 55, py: 40, w: 165 }),
    ]),
    panel(0.65, [
      cap("Se van sin respuestas.", 58, 12, 170),
    ]),
    panel(0.88, [
      L("No hagas mi trabajo por tu cuenta.", "Sheriff", {
        px: 12,
        py: 76,
        w: 210,
      }),
    ]),
  ],
  "28": [
    panel(0.15, [
      cap("El Sheriff no dice nada.", 10, 12, 170),
    ]),
    panel(0.38, [
      cap("Una explicación demasiado simple.", 30, 10, 210),
    ]),
    panel(0.55, [
      cap("Dos investigaciones separadas por años.", 48, 10, 230),
    ]),
    panel(0.72, [
      cap("Todavía sin conexión.", 62, 22, 165),
    ]),
    panel(0.9, [
      cap("Otra vez.", 82, 38, 90),
      cap("Todavía.", 90, 42, 80),
    ]),
  ],
};

const data = JSON.parse(fs.readFileSync(DIALOGUES_PATH, "utf8"));

for (const [key, panels] of Object.entries(PATCH)) {
  if (!data.pages[key]) throw new Error(`missing page ${key}`);
  data.pages[key].panels = panels;
}

fs.writeFileSync(DIALOGUES_PATH, JSON.stringify(data, null, 2) + "\n");
console.log("Wrote", DIALOGUES_PATH);
console.log("Patched pages:", Object.keys(PATCH).join(", "));
