/**
 * Fase 1: págs. 16–28 — investigación (arte en the-boyz-comic).
 * Reemplazo total de panels en dialogues.json.
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
  "16": [
    panel(0.1, [cap("El teléfono de la casa suena.", 6, 15, 190)]),
    panel(0.28, [
      L("¿Sí?", "Peter", { px: 22, py: 22, w: 70 }),
      L("¿Peter?", "Desconocido", { offscreen: true, px: 58, py: 26, w: 90 }),
    ]),
    panel(0.45, [
      L("Habla la policía.", "Policía", { offscreen: true, px: 55, py: 40, w: 130 }),
      L("¿Qué pasó?", "Peter", { px: 18, py: 44, w: 95 }),
    ]),
    panel(0.62, [
      L("Necesitamos que venga a la comisaría.", "Policía", {
        offscreen: true,
        px: 12,
        py: 56,
        w: 210,
      }),
      L("Se trata de Uandi.", "Policía", { offscreen: true, px: 52, py: 62, w: 145 }),
    ]),
    panel(0.82, [
      L("¿Dónde está Uandi?", "Peter", { px: 20, py: 74, w: 140 }),
      L("Hubo un incidente en una estación de servicio.", "Policía", {
        offscreen: true,
        px: 12,
        py: 80,
        w: 225,
      }),
    ]),
    panel(0.94, [
      L("¿Está vivo?", "Peter", { px: 28, py: 86, w: 110 }),
      cap("Silencio. Los mates se hacen pedazos en el piso.", 90, 12, 220),
    ]),
  ],
  "17": [
    panel(0.18, [
      cap("A la mañana siguiente.", 8, 28, 150),
      cap("Cinta amarilla en la YPF.", 18, 12, 180),
    ]),
    panel(0.48, [
      cap("Forenses. Oficiales. Un cuerpo bajo lona.", 40, 10, 220),
    ]),
    panel(0.72, [
      L("...", "Peter", { thought: true, px: 35, py: 66, w: 60 }),
    ]),
    panel(0.9, [
      L("Llegaste.", "Jaz", { px: 55, py: 82, w: 95 }),
      L("Lo sé.", "Peter", { px: 18, py: 86, w: 70 }),
    ]),
  ],
  "18": [
    panel(0.2, [
      cap("Peter y Jaz miran la escena.", 8, 12, 180),
      L("¿Uandi?", "Jaz", { px: 62, py: 12, w: 80 }),
    ]),
    panel(0.42, [
      L("...", "Peter", { px: 38, py: 36, w: 60 }),
      L("Peter.", "Jaz", { px: 58, py: 40, w: 70 }),
    ]),
    panel(0.62, [
      L("Voy a hacerte algunas preguntas.", "Sheriff", { px: 12, py: 56, w: 195 }),
      L("Ya sé cómo funciona.", "Peter", { px: 52, py: 60, w: 155 }),
    ]),
    panel(0.85, [
      L("Bien.", "Sheriff", { px: 20, py: 76, w: 60 }),
      L("Empecemos acá.", "Sheriff", { px: 55, py: 80, w: 130 }),
    ]),
  ],
  "19": [
    panel(0.15, [
      L("¿Cuándo fue la última vez que viste a Uandi?", "Sheriff", {
        px: 10,
        py: 6,
        w: 220,
      }),
      L("En casa.", "Peter", { px: 58, py: 10, w: 85 }),
    ]),
    panel(0.32, [
      L("¿Hora?", "Sheriff", { px: 18, py: 26, w: 70 }),
      L("Una... una y pico.", "Peter", { px: 55, py: 30, w: 130 }),
      L("¿Discutieron?", "Sheriff", { px: 12, py: 36, w: 110 }),
      L("No.", "Peter", { px: 68, py: 40, w: 50 }),
    ]),
    panel(0.5, [
      L("¿Algo fuera de lo normal?", "Sheriff", { px: 12, py: 44, w: 175 }),
      L("Nos atacó un vampiro.", "Peter", { px: 52, py: 48, w: 155 }),
    ]),
    panel(0.66, [
      L("¿Me creés?", "Peter", { px: 22, py: 60, w: 100 }),
      L("Todavía no decidí nada. Contame.", "Sheriff", { px: 48, py: 64, w: 195 }),
    ]),
    panel(0.82, [
      L("Balanar. El callejón. La pelea.", "Peter", { px: 12, py: 74, w: 200 }),
      L("Yo me dormí.", "Peter", { px: 55, py: 78, w: 110 }),
      L("Por eso no me despertó.", "Peter", { px: 12, py: 86, w: 165 }),
    ]),
    panel(0.94, [
      L("¿Uandi tenía enemigos?", "Sheriff", { px: 12, py: 88, w: 175 }),
      L("Nadie que le pegara un tiro comprando yerba.", "Peter", {
        px: 12,
        py: 92,
        w: 230,
      }),
      L("Tendría que haber estado ahí.", "Peter", { px: 42, py: 96, w: 195 }),
    ]),
  ],
  "20": [
    panel(0.2, [
      L("¿Peter?", "Ian", { offscreen: true, px: 55, py: 10, w: 80 }),
      L("Ian...", "Peter", { px: 18, py: 14, w: 70 }),
    ]),
    panel(0.42, [
      L("¿Qué pasó?", "Ian", { offscreen: true, px: 58, py: 34, w: 95 }),
      L("Uandi está muerto.", "Peter", { px: 15, py: 38, w: 145 }),
    ]),
    panel(0.58, [
      L("¿Dónde estás?", "Ian", { offscreen: true, px: 52, py: 52, w: 115 }),
      L("Con la policía.", "Peter", { px: 18, py: 56, w: 120 }),
      L("Voy para allá.", "Ian", { offscreen: true, px: 55, py: 62, w: 115 }),
    ]),
    panel(0.75, [
      L("Traé a Jaz.", "Peter", { px: 20, py: 70, w: 100 }),
      L("No sé cómo llamar a Mati.", "Peter", { px: 12, py: 76, w: 185 }),
      L("Primero ocupémonos de Uandi.", "Ian", { offscreen: true, px: 48, py: 82, w: 195 }),
    ]),
    panel(0.9, [
      cap("Ian cuelga. El laboratorio queda en silencio.", 84, 12, 220),
      L("Tenemos que ir.", "Ian", { px: 22, py: 88, w: 120 }),
    ]),
  ],
  "21": [
    panel(0.18, [
      cap("Ian, Jaz y Valery llegan al playón.", 6, 10, 210),
      L("Ahí está.", "Jaz", { px: 58, py: 12, w: 90 }),
    ]),
    panel(0.38, [
      cap("Jaz lo abraza. Peter tarda en responder.", 28, 10, 220),
      L("...", "Peter", { px: 40, py: 36, w: 60 }),
    ]),
    panel(0.55, [
      L("Yo estaba durmiendo.", "Peter", { px: 15, py: 50, w: 155 }),
      L("Lo sé.", "Ian", { px: 62, py: 54, w: 70 }),
      L("Salió solo.", "Peter", { px: 15, py: 60, w: 100 }),
    ]),
    panel(0.72, [
      L("No estabas ahí.", "Ian", { px: 18, py: 66, w: 130 }),
      L("Exacto.", "Peter", { px: 62, py: 70, w: 80 }),
    ]),
    panel(0.88, [
      L("¿Quién lo hizo?", "Ian", { px: 20, py: 80, w: 115 }),
      L("Todavía no saben.", "Peter", { px: 55, py: 84, w: 140 }),
    ]),
  ],
  "22": [
    panel(0.15, [
      L("Contame otra vez.", "Sheriff", { px: 12, py: 6, w: 140 }),
      L("Desde el principio.", "Sheriff", { px: 55, py: 10, w: 145 }),
    ]),
    panel(0.35, [
      L("Volvimos. Pizza. Dormimos.", "Peter", { px: 12, py: 28, w: 175 }),
      L("Él salió sin despertarme.", "Peter", { px: 52, py: 32, w: 165 }),
    ]),
    panel(0.52, [
      L("¿Vampiro?", "Deputy", { px: 18, py: 46, w: 90 }),
      L("Con alas.", "Peter", { px: 58, py: 50, w: 100 }),
      L("Anoche. En la calle.", "Peter", { px: 12, py: 56, w: 145 }),
    ]),
    panel(0.7, [
      L("Eso no explica un tiro en la YPF.", "Sheriff", { px: 10, py: 64, w: 210 }),
      L("Lo sé.", "Peter", { px: 62, py: 68, w: 70 }),
    ]),
    panel(0.88, [
      L("Lo que necesito es quién sí estuvo.", "Sheriff", { px: 12, py: 80, w: 215 }),
      L("El empleado vio más que yo.", "Peter", { px: 12, py: 88, w: 195 }),
    ]),
  ],
  "23": [
    panel(0.15, [
      L("Entró normal.", "Empleado YPF", { px: 12, py: 6, w: 120 }),
      L("¿Uandi?", "Sheriff", { px: 55, py: 10, w: 80 }),
      L("Sí. Venía seguido de noche.", "Empleado YPF", { px: 12, py: 16, w: 195 }),
    ]),
    panel(0.32, [
      L("Compró. Pagó. Salió al playón.", "Empleado YPF", { px: 10, py: 26, w: 210 }),
      L("¿El hombre armado lo esperaba?", "Sheriff", { px: 12, py: 34, w: 200 }),
    ]),
    panel(0.5, [
      L("No creo. Cuando entró ni lo miró.", "Empleado YPF", { px: 12, py: 44, w: 210 }),
      L("Fue al surtidor.", "Empleado YPF", { px: 55, py: 50, w: 130 }),
    ]),
    panel(0.68, [
      L("¿Uandi intentó atacarlo?", "Sheriff", { px: 12, py: 62, w: 185 }),
      L("No.", "Empleado YPF", { px: 62, py: 66, w: 50 }),
      L("Hablaba.", "Empleado YPF", { px: 12, py: 72, w: 90 }),
    ]),
    panel(0.85, [
      L("Le decía que se llevara la plata.", "Empleado YPF", { px: 10, py: 78, w: 210 }),
      L("Se puso en el medio.", "Empleado YPF", { px: 12, py: 86, w: 155 }),
      L("Y le disparó.", "Empleado YPF", { px: 58, py: 90, w: 115 }),
    ]),
  ],
  "24": [
    panel(0.18, [
      L("¿Viste al sospechoso salir?", "Sheriff", { px: 12, py: 8, w: 195 }),
      L("Corriendo. Con una billetera.", "Empleado YPF", { px: 12, py: 16, w: 200 }),
    ]),
    panel(0.38, [
      cap("Peter pasa con abrigo y anteojos.", 32, 10, 200),
      L("...", "Deputy", { thought: true, px: 55, py: 36, w: 60 }),
    ]),
    panel(0.58, [
      cap("Ian, Jaz y Valery llegan al cordón.", 52, 10, 210),
      L("Ahí.", "Ian", { px: 20, py: 56, w: 60 }),
    ]),
    panel(0.82, [
      L("Ustedes tres. Afuera.", "Sheriff", { px: 12, py: 74, w: 155 }),
      L("Sheriff.", "Valery", { px: 55, py: 78, w: 80 }),
      L("Ahora.", "Sheriff", { px: 20, py: 86, w: 70 }),
    ]),
  ],
  "25": [
    panel(0.2, [
      L("Adentro.", "Sheriff", { px: 55, py: 10, w: 85 }),
      L("Los tres. Conmigo.", "Sheriff", { px: 12, py: 14, w: 145 }),
    ]),
    panel(0.42, [
      L("¿Podemos ayudar?", "Ian", { px: 18, py: 36, w: 125 }),
      L("Pueden responder.", "Sheriff", { px: 52, py: 40, w: 140 }),
    ]),
    panel(0.62, [
      cap("La comisaría huele a café recalentado.", 56, 10, 220),
      L("Volvé a tu puesto.", "Sheriff", { px: 55, py: 60, w: 155 }),
    ]),
    panel(0.85, [
      L("Sí, señor.", "Deputy", { px: 58, py: 78, w: 95 }),
      cap("Oficina del Sheriff.", 84, 28, 140),
    ]),
  ],
  "26": [
    panel(0.18, [
      L("Voy a preguntar cosas que les parezcan irrelevantes.", "Sheriff", {
        px: 10,
        py: 6,
        w: 230,
      }),
      L("Las irrelevantes suelen importar.", "Ian", { px: 12, py: 14, w: 210 }),
    ]),
    panel(0.38, [
      L("¿Uandi tenía problemas económicos?", "Sheriff", { px: 12, py: 32, w: 210 }),
      L("No especialmente.", "Ian", { px: 55, py: 36, w: 140 }),
      L("¿Deudas?", "Sheriff", { px: 12, py: 42, w: 80 }),
      L("No que sepamos.", "Jaz", { px: 55, py: 46, w: 140 }),
    ]),
    panel(0.55, [
      L("¿Alguien quería verlo muerto?", "Sheriff", { px: 12, py: 50, w: 195 }),
      L("No conozco a nadie.", "Ian", { px: 12, py: 58, w: 155 }),
      L("Uandi se mete donde no lo llaman.", "Jaz", { px: 48, py: 62, w: 195 }),
    ]),
    panel(0.72, [
      L("El empleado dijo algo parecido.", "Sheriff", { px: 10, py: 66, w: 210 }),
      L("Demasiado.", "Ian", { px: 58, py: 70, w: 95 }),
    ]),
    panel(0.88, [
      L("Entonces veamos lo que sí sabemos.", "Sheriff", { px: 12, py: 80, w: 215 }),
      cap("Fotos del playón sobre el escritorio.", 88, 12, 210),
    ]),
  ],
  "27": [
    panel(0.15, [
      cap("La imagen de seguridad de la YPF.", 6, 12, 200),
      L("Sin sonido. Baja calidad.", "Sheriff", { px: 52, py: 10, w: 155 }),
    ]),
    panel(0.32, [
      L("¿Lo reconocen?", "Sheriff", { px: 12, py: 26, w: 125 }),
      L("No.", "Jaz", { px: 62, py: 30, w: 50 }),
      L("Nunca le vi la cara.", "Ian", { px: 12, py: 36, w: 155 }),
    ]),
    panel(0.5, [
      L("Sale del local. Va al surtidor.", "Sheriff", { px: 10, py: 44, w: 200 }),
      L("Entra después de Uandi.", "Sheriff", { px: 48, py: 50, w: 175 }),
      L("Eso reduce que lo esperara adentro.", "Ian", { px: 10, py: 56, w: 220 }),
    ]),
    panel(0.68, [
      cap("Arma. Manos arriba. Disparo.", 62, 28, 160),
      L("Ya está.", "Jaz", { px: 18, py: 68, w: 80 }),
      L("¿Fue un robo?", "Jaz", { px: 52, py: 72, w: 115 }),
      L("Eso parece.", "Sheriff", { px: 12, py: 78, w: 100 }),
      L("Parece.", "Ian", { px: 55, py: 82, w: 75 }),
      L("¿Tenés otra teoría?", "Sheriff", { px: 12, py: 88, w: 155 }),
      L("Todavía no.", "Ian", { px: 58, py: 92, w: 100 }),
    ]),
    panel(0.88, [
      L("Si encontramos algo, los llamo.", "Sheriff", { px: 10, py: 80, w: 210 }),
      L("Gracias.", "Jaz", { px: 55, py: 84, w: 80 }),
      L("No hagas mi trabajo por tu cuenta.", "Sheriff", { px: 10, py: 90, w: 215 }),
      L("No estaba planeando hacerlo.", "Ian", { px: 48, py: 94, w: 195 }),
    ]),
  ],
  "28": [
    panel(0.12, [
      cap("El Sheriff queda solo.", 8, 28, 150),
      cap("La imagen del homicida congelada en pantalla.", 16, 10, 230),
    ]),
    panel(0.3, [
      cap("Algo le resulta familiar. No el hombre. La sensación.", 26, 10, 230),
      cap("Una explicación demasiado simple.", 36, 12, 200),
    ]),
    panel(0.48, [
      cap("Abre el cajón. Carpeta sin clasificación oficial.", 44, 10, 230),
      cap("Fotografías. Demasiado borrosas para probar nada.", 54, 10, 230),
    ]),
    panel(0.66, [
      cap("Central Park. Una figura roja entre el grano.", 62, 10, 220),
      cap("VOPS. Naves. Criaturas. Informes sin respuesta.", 72, 10, 230),
    ]),
    panel(0.88, [
      cap("El Sheriff no dice nada.", 80, 22, 170),
      cap("Otra vez.", 86, 38, 90),
      cap("Dos investigaciones separadas por años.", 90, 10, 230),
      cap("Todavía.", 94, 42, 80),
    ]),
  ],
};

const data = JSON.parse(fs.readFileSync(DIALOGUES_PATH, "utf8"));
for (const [key, panels] of Object.entries(PAGES)) {
  data.pages[key] = { panels };
}
fs.writeFileSync(DIALOGUES_PATH, JSON.stringify(data, null, 2) + "\n");
const lines = Object.values(PAGES).flat().reduce((a, p) => a + p.dialogue.length, 0);
console.log("Phase 1: wrote pages", Object.keys(PAGES).join(", "), "| lines:", lines);
