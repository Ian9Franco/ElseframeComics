/**
 * Fase 2: págs. 01–15 — lluvia, Balanar, casa, YPF (surtidor).
 */
import fs from "fs";
import path from "path";

const DIALOGUES_PATH = path.join(
  process.cwd(),
  "public/comics/#11 Inmortal/#1 La noche que volvio/dialogues.json"
);

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
  return L(text, "Narración", { style: "caption", tail: "none", px, py, w });
}

function panel(focusY, lines) {
  const p = { focusY, dialogue: lines };
  if (lines.length) {
    const py = lines[0].posY ?? Math.round(focusY * 100);
    p.zoomRects = [{ x: 0, y: Math.max(0, py - 8), w: 100, h: 24 }];
  }
  return p;
}

const PAGES = {
  "01": [
    panel(0.12, [
      cap("La lluvia lleva horas cayendo sobre la ciudad.", 6, 10, 230),
      L("Te estoy diciendo que era más barato el paquete grande.", "Peter", {
        px: 12,
        py: 14,
        w: 220,
      }),
      L("Vivimos dos personas.", "Uandi", { px: 55, py: 18, w: 140 }),
    ]),
    panel(0.35, [
      L("Yo como por tres.", "Peter", { px: 18, py: 30, w: 120 }),
      L("Ese no es el argumento que pensás que es.", "Uandi", { px: 48, py: 34, w: 195 }),
    ]),
    panel(0.58, [
      L("¿Me estás haciendo body shaming?", "Peter", { px: 15, py: 52, w: 175 }),
      L("Sí.", "Uandi", { px: 68, py: 56, w: 50 }),
      L("Forro.", "Peter", { px: 22, py: 62, w: 70 }),
    ]),
    panel(0.82, [
      cap("Por unos segundos son solo dos amigos volviendo a casa.", 72, 10, 230),
      L("...", "Balanar", { thought: true, px: 72, py: 82, w: 80 }),
    ]),
  ],
  "02": [
    panel(0.2, [
      L("Peter.", "Uandi", { px: 18, py: 10, w: 70 }),
      L("Atrás mío.", "Peter", { px: 55, py: 14, w: 110 }),
      L("¿Qué viste?", "Uandi", { px: 18, py: 22, w: 100 }),
      L("No sé.", "Peter", { px: 58, py: 26, w: 80 }),
    ]),
    panel(0.45, [
      cap("Después, alas.", 38, 28, 100),
      L("¡UANDI!", "Peter", { px: 38, py: 42, w: 100 }),
    ]),
    panel(0.72, [
      cap("El vaso sale volando.", 66, 20, 160),
      cap("Uandi golpea el pavimento.", 72, 12, 170),
    ]),
    panel(0.9, [
      L("¡Quedate ahí!", "Peter", { px: 55, py: 84, w: 120 }),
      L("Peter...", "Uandi", { px: 15, py: 88, w: 80 }),
    ]),
  ],
  "03": [
    panel(0.18, [
      L("¡No!", "Peter", { px: 22, py: 8, w: 60 }),
      L("¡Te dije que no!", "Peter", { px: 55, py: 12, w: 130 }),
    ]),
    panel(0.42, [
      L("Peter...", "Uandi", { px: 18, py: 36, w: 80 }),
      L("¡Quedate ahí!", "Peter", { px: 55, py: 40, w: 120 }),
      L("No te estoy ayudando mucho desde acá.", "Uandi", { px: 12, py: 48, w: 210 }),
    ]),
    panel(0.65, [
      L("Esa es exactamente la idea.", "Peter", { px: 12, py: 58, w: 175 }),
      L("Ni se te ocurra.", "Peter", { px: 55, py: 62, w: 130 }),
    ]),
    panel(0.88, [
      L("Probá.", "Peter", { px: 42, py: 82, w: 80 }),
      cap("Balanar sisea. Extiende las alas.", 86, 12, 200),
    ]),
  ],
  "04": [
    panel(0.2, [
      L("¿Terminaste?", "Uandi", { px: 18, py: 10, w: 115 }),
      L("No sé.", "Peter", { px: 62, py: 14, w: 75 }),
    ]),
    panel(0.45, [
      L("Bueno. Cuando sepas, avisame.", "Uandi", { px: 12, py: 38, w: 195 }),
      cap("Balanar despega entre los edificios.", 44, 12, 200),
    ]),
    panel(0.68, [
      L("¿Estás bien?", "Peter", { px: 18, py: 62, w: 100 }),
      L("Sí.", "Uandi", { px: 62, py: 66, w: 50 }),
      L("¿Seguro?", "Peter", { px: 18, py: 72, w: 80 }),
    ]),
    panel(0.88, [
      L("Peter.", "Uandi", { px: 22, py: 84, w: 70 }),
      L("¿Te pegó?", "Peter", { px: 55, py: 88, w: 95 }),
    ]),
  ],
  "05": [
    panel(0.2, [
      L("¿Te cortó?", "Peter", { px: 18, py: 10, w: 95 }),
      L("¿Te mordió?", "Peter", { px: 58, py: 14, w: 105 }),
      L("Pará.", "Uandi", { px: 18, py: 20, w: 60 }),
    ]),
    panel(0.45, [
      L("Tengo treinta años, no cinco.", "Uandi", { px: 12, py: 38, w: 195 }),
      L("Hace treinta segundos un vampiro con alas intentó comerme.", "Peter", {
        px: 12,
        py: 46,
        w: 230,
      }),
    ]),
    panel(0.68, [
      L("Capaz quería pedirte el Instagram.", "Peter", { px: 12, py: 62, w: 210 }),
      L("Eso sí murió.", "Peter", { px: 55, py: 68, w: 115 }),
      L("Era nuevo.", "Uandi", { px: 12, py: 74, w: 100 }),
    ]),
    panel(0.88, [
      cap("Uandi pisa una bolsa. Desaparece en la basura.", 80, 10, 220),
      L("Ni una palabra.", "Uandi", { px: 42, py: 88, w: 130 }),
    ]),
  ],
  "06": [
    panel(0.22, [
      L("Peter.", "Uandi", { px: 22, py: 12, w: 70 }),
      L("No dije nada.", "Peter", { px: 58, py: 16, w: 120 }),
      L("Te conozco.", "Uandi", { px: 18, py: 22, w: 100 }),
    ]),
    panel(0.48, [
      L("¡No te rías, hijo de puta!", "Uandi", { px: 12, py: 42, w: 185 }),
      cap("Por primera vez desde el ataque, Uandi también se ríe.", 48, 10, 230),
    ]),
    panel(0.75, [
      cap("Siguen caminando. La tensión empieza a desaparecer.", 68, 10, 230),
      cap("Más tarde, el departamento está en silencio.", 76, 10, 220),
    ]),
  ],
  "07": [
    panel(0.2, [
      L("Dejame dos.", "Uandi", { px: 18, py: 10, w: 100 }),
      L("No especificaste cuáles.", "Peter", { px: 55, py: 14, w: 165 }),
    ]),
    panel(0.45, [
      L("Las que tengan comida arriba.", "Uandi", { px: 12, py: 38, w: 175 }),
      L("Complicado.", "Peter", { px: 58, py: 42, w: 100 }),
    ]),
    panel(0.68, [
      L("Podría haberte acompañado antes.", "Peter", { px: 12, py: 60, w: 195 }),
      L("No vamos a empezar con esto.", "Uandi", { px: 48, py: 64, w: 195 }),
    ]),
    panel(0.88, [
      L("Ese tipo vino por vos.", "Peter", { px: 12, py: 80, w: 155 }),
      L("Estoy bien.", "Uandi", { px: 55, py: 84, w: 95 }),
      L("Dormí.", "Uandi", { px: 12, py: 90, w: 70 }),
    ]),
  ],
  "08": [
    panel(0.25, [
      L("Puedo intentarlo.", "Peter", { px: 18, py: 18, w: 130 }),
      L("Tenés seis manos. Comé más rápido.", "Uandi", { px: 48, py: 22, w: 195 }),
    ]),
    panel(0.55, [
      cap("La lluvia golpea suavemente las ventanas.", 48, 12, 210),
      cap("Comen pizza. Silencio cómodo.", 56, 12, 180),
    ]),
    panel(0.82, [
      cap("Peter sale de la ducha con toalla en la cabeza.", 74, 10, 230),
      cap("La casa junto al puerto, de noche.", 82, 22, 180),
    ]),
  ],
  "09": [
    panel(0.2, [
      L("Tengo hambre.", "Peter", { px: 55, py: 10, w: 110 }),
      cap("Horas después. Todo oscuro.", 6, 12, 170),
    ]),
    panel(0.45, [
      cap("La luz de la heladera ilumina a Uandi.", 38, 10, 220),
      L("Buenísimo...", "Uandi", { thought: true, px: 22, py: 44, w: 120 }),
    ]),
    panel(0.68, [
      cap("Peter duerme en el sillón. Tres brazos colgando.", 62, 10, 230),
      L("Dormí, boludo.", "Uandi", { px: 20, py: 68, w: 120 }),
    ]),
    panel(0.88, [
      cap("Toma las llaves. Cierra sin hacer ruido.", 82, 10, 220),
    ]),
  ],
  "10": [
    panel(0.18, [
      cap("3:07 AM.", 8, 38, 90),
      L("Buenísimo...", "Uandi", { thought: true, px: 25, py: 14, w: 120 }),
    ]),
    panel(0.48, [
      cap("Peter duerme con el control remoto en la mano.", 42, 10, 230),
      L("...", "Uandi", { thought: true, px: 40, py: 50, w: 60 }),
    ]),
    panel(0.75, [
      L("Dormí, boludo.", "Uandi", { thought: true, px: 20, py: 70, w: 130 }),
      cap("Sale hacia la Berlingo.", 76, 12, 160),
    ]),
  ],
  "11": [
    panel(0.15, [
      cap("Horas después.", 8, 38, 120),
      cap("La YPF está casi vacía. Asfalto húmedo.", 16, 10, 220),
    ]),
    panel(0.38, [
      cap("Uandi maneja hacia la estación.", 32, 12, 190),
      L("...", "Uandi", { thought: true, px: 45, py: 36, w: 60 }),
    ]),
    panel(0.62, [
      L("Todavía me falta la yerba...", "Uandi", { thought: true, px: 15, py: 55, w: 175 }),
    ]),
    panel(0.85, [
      L("Buenas.", "Uandi", { px: 20, py: 78, w: 80 }),
    ]),
  ],
  "12": [
    panel(0.18, [
      L("Buenas.", "Uandi", { px: 18, py: 8, w: 80 }),
      L("Buenas...", "Empleado YPF", { px: 62, py: 12, w: 100 }),
    ]),
    panel(0.42, [
      L("Decime que tenés yerba.", "Uandi", { px: 12, py: 36, w: 165 }),
      L("Segundo pasillo.", "Empleado YPF", { px: 58, py: 40, w: 130 }),
      L("Sos un héroe.", "Uandi", { px: 12, py: 48, w: 110 }),
    ]),
    panel(0.62, [
      L("Son las tres de la mañana.", "Empleado YPF", { px: 48, py: 58, w: 165 }),
      L("Principalmente.", "Uandi", { px: 18, py: 62, w: 120 }),
    ]),
    panel(0.84, [
      cap("Paga. Sale con el paquete bajo el brazo.", 72, 10, 220),
      L("Gracias.", "Uandi", { px: 22, py: 80, w: 80 }),
    ]),
  ],
  "13": [
    panel(0.18, [
      cap("Ninguno de los dos presta demasiada atención.", 8, 10, 220),
      cap("Capucha. Mano en el bolsillo.", 16, 12, 180),
    ]),
    panel(0.42, [
      L("...", "Uandi", { thought: true, px: 40, py: 38, w: 60 }),
      cap("Camina al surtidor con la yerba.", 36, 12, 200),
    ]),
    panel(0.65, [
      cap("Alguien lo observa desde las sombras.", 58, 10, 210),
    ]),
    panel(0.88, [
      L("¡No te muevas!", "Ladrón", { px: 55, py: 76, w: 120 }),
      L("La billetera.", "Ladrón", { px: 18, py: 82, w: 110 }),
    ]),
  ],
  "14": [
    panel(0.15, [
      L("Manos arriba.", "Ladrón", { px: 18, py: 6, w: 115 }),
      L("Todo.", "Ladrón", { px: 65, py: 10, w: 70 }),
    ]),
    panel(0.32, [
      L("Está bien.", "Uandi", { px: 15, py: 26, w: 95 }),
      L("Te lo voy a dar.", "Uandi", { px: 58, py: 30, w: 130 }),
    ]),
    panel(0.5, [
      L("Despacio.", "Ladrón", { px: 20, py: 48, w: 95 }),
      cap("Es joven. Más asustado que ellos. Eso es peor.", 46, 10, 230),
    ]),
    panel(0.68, [
      L("Che.", "Uandi", { px: 18, py: 62, w: 60 }),
      L("Nadie está haciendo nada.", "Uandi", { px: 42, py: 66, w: 175 }),
      L("¡Callate!", "Ladrón", { px: 62, py: 70, w: 100 }),
    ]),
    panel(0.88, [
      L("Pará—", "Uandi", { px: 38, py: 82, w: 70 }),
      cap("BANG.", 78, 42, 80),
    ]),
  ],
  "15": [
    panel(0.2, [
      cap("Uandi mira hacia abajo. Una mancha en la remera.", 10, 10, 230),
      L("...", "Uandi", { px: 40, py: 18, w: 60 }),
    ]),
    panel(0.48, [
      cap("Intenta respirar. No puede.", 42, 12, 180),
      cap("El ladrón corre con la billetera.", 50, 12, 200),
    ]),
    panel(0.72, [
      cap("No hay transformación. No hay Aegis.", 66, 10, 220),
      cap("Solo un hombre intentando respirar.", 74, 10, 210),
    ]),
    panel(0.9, [
      cap("Después... nada.", 84, 38, 120),
    ]),
  ],
};

const data = JSON.parse(fs.readFileSync(DIALOGUES_PATH, "utf8"));
for (const [key, panels] of Object.entries(PAGES)) {
  data.pages[key] = { panels };
}
fs.writeFileSync(DIALOGUES_PATH, JSON.stringify(data, null, 2) + "\n");
const lines = Object.values(PAGES).flat().reduce((a, p) => a + p.dialogue.length, 0);
console.log("Phase 2: wrote pages", Object.keys(PAGES).join(", "), "| lines:", lines);
