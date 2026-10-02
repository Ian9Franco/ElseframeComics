# Elseframe Comics — Editor web/mobile en producción sin base de datos

**Objetivo:** convertir el editor actual de Elseframe Comics en un editor realmente utilizable desde la web de producción —incluido iPhone/mobile— sin depender de `localhost`, sin introducir una base de datos y conservando el flujo real de publicación que hoy hace `npm run publish:all`.

**Repos actuales involucrados**
- App principal: `Ian9Franco/ElseframeComics`
- Assets: `Ian9Franco/theboyz-comic-v1`
- Rama pública objetivo: `main`

---

## 1. Estado actual que hay que respetar

La base ya existe y no conviene reescribirla.

### Editor y publicación

Ya existe:

- `components/editor-v2/EditorV2.tsx`
- `components/reader/PublishModal.tsx`
- `app/api/editor/publish/route.ts`
- `app/api/chapters/[id]/dialogues/route.ts`
- `app/api/editor/pages/route.ts`
- `app/api/editor/meta/route.ts`
- `app/api/editor/structure/route.ts`

`PublishModal.tsx` ya tiene la UX de **Publicar Proyecto**.

El problema es el backend actual: `/api/editor/publish` ejecuta:

```bash
npm run publish:all
```

mediante `child_process.exec()` dentro del servidor.

Eso funciona en local porque ahí sí existen:

1. el repo principal;
2. el repo hermano de assets;
3. un filesystem persistente;
4. Git configurado;
5. credenciales para `git push`.

En Vercel no hay que depender de ninguna de esas condiciones.

### Guardado de diálogos

Actualmente:

`app/api/chapters/[id]/dialogues/route.ts`

termina haciendo:

```ts
fs.writeFileSync(dialoguesFilePath, compactJson, "utf-8");
```

En local está perfecto. En producción no debe considerarse persistencia real.

### Assets

Ya existe una decisión arquitectónica correcta:

`lib/githubComics.ts`

lee las páginas del repo `theboyz-comic-v1` usando GitHub API en producción.

Esto es importante: **GitHub ya forma parte de la arquitectura de producción.** No estamos agregando un sistema completamente ajeno.

### `publish:all`

El script actual hace trabajo real, no solamente un commit:

1. `npm run convert` en el repo de assets.
2. `npm run compress` en la app.
3. `npm run compress:audio`.
4. `npm run sync` desde assets.
5. `git add`.
6. genera mensaje de commit.
7. `git commit`.
8. `git push` de ambos repos.

Además, el conversor del repo de assets usa `sharp`, convierte PNG/JPG/JPEG/TIFF/BMP a WebP con calidad 85 y elimina el original.

**Ese comportamiento debe mantenerse.**

---

# 2. Arquitectura final

No usar Supabase ni una base de datos.

Usar tres piezas:

```text
TELÉFONO / PC
     │
     ▼
Editor web de Elseframe
     │
     ├── Guardar borrador ─────► GitHub API
     │                           rama editor-workspace
     │
     └── Publicar ─────────────► GitHub Actions
                                  │
                                  ├─ checkout app
                                  ├─ checkout assets
                                  ├─ npm run publish:all
                                  ├─ WebP / audio / sync
                                  ├─ commit
                                  └─ push a main
                                           │
                                           ▼
                                         Vercel
```

La regla es:

- **Guardar** = persistir trabajo editable.
- **Publicar** = ejecutar el pipeline completo y actualizar producción.

No conviene que cada movimiento de un globo provoque un deploy de Vercel.

---

# 3. Crear una rama de trabajo del editor

Crear en **ambos repos**:

```text
editor-workspace
```

Esta rama funciona como almacenamiento persistente del editor.

No es una base de datos: son los mismos JSON, Markdown e imágenes que ya usa el proyecto, pero versionados en Git.

## Repo principal

Contendrá borradores de:

- `dialogues.json`
- `chapter.json`
- `saga.json`
- documentos Markdown editados desde el editor
- configuración/contexto del editor
- cualquier placeholder que corresponda

## Repo de assets

Contendrá:

- imágenes nuevas
- imágenes todavía no convertidas
- cambios de orden
- páginas eliminadas
- portada
- assets relacionados al capítulo

## Regla de producción

El lector público sigue consumiendo `main`.

El modo editor debe poder consumir `editor-workspace`.

---

# 4. Crear un helper GitHub server-side

Crear:

```text
lib/githubEditor.ts
```

Nunca enviar el token GitHub al navegador.

Variables de entorno de Vercel:

```text
GITHUB_EDITOR_TOKEN=
GITHUB_EDITOR_BRANCH=editor-workspace
GITHUB_OWNER=Ian9Franco
GITHUB_MAIN_REPO=ElseframeComics
GITHUB_ASSETS_REPO=theboyz-comic-v1
```

Para una primera versión, usar un **fine-grained PAT** limitado solamente a estos dos repos.

Permisos mínimos necesarios:

- Contents: Read and write
- Actions: Read and write
- Metadata: Read

Más adelante puede reemplazarse por GitHub App.

El helper debe implementar, como mínimo:

```ts
getFile(repo, path, ref)
putFile(repo, path, content, message, branch, sha?)
deleteFile(repo, path, message, branch, sha)
listDirectory(repo, path, ref)
dispatchWorkflow(workflowId, ref, inputs?)
```

Para operaciones de muchas páginas, agregar luego:

```ts
createAtomicTreeCommit(...)
```

usando Git Data API.

Esto evita hacer veinte renames independientes y quedar a mitad de camino.

---

# 5. Guardar `dialogues.json` desde producción

Modificar:

```text
app/api/chapters/[id]/dialogues/route.ts
```

## Desarrollo local

Puede conservarse el comportamiento actual con filesystem:

```ts
if (process.env.NODE_ENV === "development") {
    // fs.writeFileSync actual
}
```

## Producción

En producción:

1. resolver saga y capítulo;
2. mantener la limpieza/compactación que ya hace el endpoint;
3. serializar `dialogues.json`;
4. obtener SHA actual del archivo en `editor-workspace`;
5. actualizarlo usando GitHub API;
6. devolver el SHA/commit resultante.

Conceptualmente:

```ts
if (isDev) {
  saveToFilesystem(...)
} else {
  await saveToGithub({
    repo: "ElseframeComics",
    branch: "editor-workspace",
    path: `public/comics/${sagaFolder}/${chapterFolder}/dialogues.json`,
    content: compactJson,
  })
}
```

## Importante: conflictos

Nunca sobrescribir silenciosamente.

La UI debe conservar el SHA/version que cargó.

Si el SHA remoto cambió mientras se editaba:

```text
409 Conflict
```

y mostrar:

> Hay una versión más nueva en GitHub. Recargá antes de sobrescribir.

---

# 6. Lectura del editor desde `editor-workspace`

El lector público y el editor no deben necesariamente leer la misma fuente.

Agregar un modo explícito:

```text
public
editor
```

### Public

- Assets: `main`
- diálogos: deployment actual / `main`

### Editor

- Assets: `editor-workspace`
- diálogos: `editor-workspace`

Extender `lib/githubComics.ts` para aceptar `ref`:

```ts
fetchComicPages(sagaFolder, chapterFolder, ref = "main")
```

En modo editor:

```ts
ref = "editor-workspace"
```

Esto permite guardar desde el teléfono y volver diez minutos después sin haber publicado todavía.

---

# 7. Publicación: mover `publish-all` a GitHub Actions

Este es el reemplazo del `exec()` actual en Vercel.

Crear:

```text
.github/workflows/publish-editor.yml
```

## Workflow sugerido

```yaml
name: Publish Elseframe Editor

on:
  workflow_dispatch:
    inputs:
      message:
        description: Commit message
        required: false
        default: "publish from web editor"

permissions:
  contents: write

concurrency:
  group: elseframe-editor-publish
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout main app workspace
        uses: actions/checkout@v4
        with:
          repository: Ian9Franco/ElseframeComics
          ref: editor-workspace
          path: the-boys
          token: ${{ secrets.ELSEFRAME_PUBLISH_TOKEN }}
          fetch-depth: 0

      - name: Checkout assets workspace
        uses: actions/checkout@v4
        with:
          repository: Ian9Franco/theboyz-comic-v1
          ref: editor-workspace
          path: theboyz-comic-v1
          token: ${{ secrets.ELSEFRAME_PUBLISH_TOKEN }}
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install app dependencies
        working-directory: the-boys
        run: npm ci

      - name: Install asset dependencies
        working-directory: theboyz-comic-v1
        run: npm ci

      - name: Configure Git
        run: |
          git config --global user.name "Elseframe Editor"
          git config --global user.email "actions@github.com"

      - name: Publish
        working-directory: the-boys
        env:
          PUBLISH_TARGET_BRANCH: main
        run: npm run publish:all "${{ inputs.message }}"
```

## Muy importante: nombres de carpetas

Usar exactamente:

```text
the-boys
theboyz-comic-v1
```

El motivo es que hoy hay scripts que buscan el repo hermano por esos nombres, y el `package.json` del repo de assets ejecuta:

```text
node ../the-boys/scripts/deploy/sync-placeholders.js
```

Por lo tanto los paths del checkout importan.

---

# 8. Ajustar `publish-all.js` para GitHub Actions

Actualmente `publish-all.js` hace:

```bash
git push
```

Eso empujaría la rama actualmente checkout.

Agregar soporte para:

```text
PUBLISH_TARGET_BRANCH
```

Ejemplo conceptual:

```js
const publishTarget = process.env.PUBLISH_TARGET_BRANCH;

if (publishTarget) {
  execSync(`git push origin HEAD:${publishTarget}`, {
    cwd: dir,
    stdio: "inherit"
  });
} else {
  execSync("git push", {
    cwd: dir,
    stdio: "inherit"
  });
}
```

Después del push exitoso a `main`, sincronizar también `editor-workspace` con ese mismo commit para que el siguiente ciclo empiece exactamente desde lo publicado:

```bash
git push origin HEAD:editor-workspace --force-with-lease
```

**No usar `--force` ciego.**

Si `main` avanzó desde otro lugar mientras se editaba, abortar la publicación y pedir sincronización.

---

# 9. Token cross-repo para GitHub Actions

El `GITHUB_TOKEN` automático del workflow no debe asumirse como suficiente para empujar a otro repo.

Crear secret del repo principal:

```text
ELSEFRAME_PUBLISH_TOKEN
```

Fine-grained token limitado a:

```text
Ian9Franco/ElseframeComics
Ian9Franco/theboyz-comic-v1
```

Permiso:

```text
Contents: Read and write
```

El mismo token puede usarse durante checkout y push.

Para mayor seguridad, separar luego:

```text
ELSEFRAME_EDITOR_TOKEN
ELSEFRAME_PUBLISH_TOKEN
```

---

# 10. Cambiar `/api/editor/publish`

No ejecutar `child_process.exec()` en producción.

En:

```text
app/api/editor/publish/route.ts
```

hacer:

```text
POST
  └─ valida master password
  └─ llama workflow_dispatch de publish-editor.yml
  └─ devuelve run/request id
```

El botón actual de `PublishModal.tsx` puede conservarse.

## Estado/logs

La UI actual consulta:

```text
GET /api/editor/publish
```

cada 2 segundos.

Con GitHub Actions:

1. `POST` guarda el ID de ejecución o devuelve identificador;
2. `GET` consulta el workflow run en GitHub;
3. traduce:

```text
queued       -> running
in_progress  -> running
completed + success -> success
completed + failure -> error
```

Los logs completos pueden agregarse después.

Para MVP alcanza mostrar:

```text
Preparando...
Convirtiendo assets...
Sincronizando...
Publicando...
Vercel desplegando...
Listo.
```

---

# 11. Administrador de páginas

Crear un componente dedicado:

```text
components/editor-v2/PageManager.tsx
```

No meter toda esta lógica dentro de `EditorLeftSidebar`.

Debe abrirse como pantalla/panel separado.

## Funciones necesarias

- ver todas las páginas como miniaturas;
- selección múltiple;
- subir imágenes;
- elegir portada;
- ordenar;
- ordenar inicialmente por fecha;
- drag & drop;
- botones subir/bajar como alternativa táctil;
- eliminar;
- reemplazar;
- renumerar;
- vista previa del resultado;
- aplicar cambios;
- deshacer antes de guardar;
- mostrar cambios pendientes.

---

# 12. Subida inicial sin nombres correctos

El flujo buscado es:

```text
Seleccionar 60 imágenes
        ↓
leer File.lastModified
        ↓
ordenar más vieja → más nueva
        ↓
mostrar thumbnails
        ↓
corregir manualmente si hace falta
        ↓
Aplicar numeración
        ↓
1, 2, 3, 4...
```

No depender de GitHub para recordar la fecha original.

GitHub no debe ser la fuente de la “fecha del archivo”.

La fecha se captura cuando el navegador recibe los archivos.

Orden inicial:

```ts
files.sort((a, b) => a.lastModified - b.lastModified)
```

Pero siempre mostrar una preview antes de confirmar.

---

# 13. Upload mobile

En mobile:

```html
<input
  type="file"
  accept="image/png,image/jpeg,image/webp"
  multiple
/>
```

Debe aceptar Fotos/Archivos de iOS.

Subir **un archivo por request** o en lotes pequeños.

No mandar 60 páginas gigantes dentro de una única request.

## Límite práctico

Agregar validación de:

- MIME;
- tamaño;
- cantidad;
- extensión;
- nombres duplicados.

Si las imágenes originales resultan demasiado grandes para pasar cómodamente por la API serverless, mantener la arquitectura y agregar **storage temporal de objetos** sólo para uploads.

Eso no requiere migrar el proyecto a una base de datos.

Primero implementar GitHub directo para los tamaños actuales y medir.

---

# 14. Nunca renumerar directamente 1 → 2 → 3

Esto provoca colisiones.

Ejemplo:

```text
1.webp
2.webp
3.webp
```

Si se intenta renombrar `1 → 2`, `2.webp` ya existe.

Usar dos fases.

### Fase temporal

```text
1.webp  -> __tmp_<uuid>_1.webp
2.webp  -> __tmp_<uuid>_2.webp
3.webp  -> __tmp_<uuid>_3.webp
```

### Fase final

```text
__tmp... -> 1.webp
__tmp... -> 2.webp
__tmp... -> 3.webp
```

Mejor todavía: usar Git Data API y generar un único tree/commit con todos los paths finales.

---

# 15. La renumeración NO puede tocar solamente imágenes

Este punto es obligatorio.

El proyecto obtiene la clave de página desde el nombre del archivo.

Ejemplo:

```text
/comics/.../12.webp
```

se convierte en:

```text
"12"
```

y esa clave se usa en `dialogues.json`.

Por lo tanto:

```text
59.webp -> 58.webp
```

implica también:

```json
"59": {...}
```

a:

```json
"58": {...}
```

---

# 16. Qué hay que remapear cuando cambia una página

Supongamos:

```text
57 -> 57
58 -> DELETE
59 -> 58
60 -> 59
61 -> 60
```

Crear:

```ts
const pageMap = {
  "57": "57",
  "58": null,
  "59": "58",
  "60": "59",
  "61": "60"
}
```

Aplicar ese mapa a todos estos lugares.

## A. `dialogues.pages`

```ts
dialogues.pages[oldKey]
```

debe pasar a:

```ts
dialogues.pages[newKey]
```

Si `newKey === null`, eliminar.

## B. Audio tracks

En `audioTracks`:

```ts
startPageKey
```

también debe remapearse.

## C. Stop triggers

Remapear:

```ts
stopTrigger.pageKey
```

para:

- `panelStart`
- `panelEnd`
- `pageStart`
- `pageEnd`

## D. Contexto narrativo por página

`DialogueContextConfig` también contiene:

```ts
pages: Record<string, DialoguePageContext>
```

Por lo tanto el archivo/config donde se persiste ese contexto también debe remapear sus claves.

## E. Cualquier referencia futura

Crear una sola función central:

```ts
remapPageReferences(...)
```

y no repartir esta lógica en componentes.

---

# 17. Qué hacer si se elimina una página con contenido

Antes de borrar mostrar:

```text
Esta página contiene:
• 4 diálogos
• 2 stops
• 3 máscaras
• 1 referencia de audio
• contexto narrativo asociado

¿Eliminar igualmente?
```

Opciones:

```text
Cancelar
Eliminar página y contenido
```

No conservar contenido huérfano por defecto.

---

# 18. Reordenar páginas con contenido

Si el usuario arrastra:

```text
Página 20
```

entre:

```text
5 y 6
```

el contenido debe viajar con la imagen.

La identidad durante la edición debe ser el archivo/ID original, no el número visible temporal.

Ejemplo interno:

```ts
{
  stableId: "blob-sha-o-uuid",
  originalPageKey: "20",
  proposedPageKey: "6",
  src: ...
}
```

Al confirmar, recién se genera el `pageMap`.

---

# 19. Botones útiles del Page Manager

Mobile primero:

```text
[ + Subir páginas ]

[ Ordenar por fecha ]
[ Renumerar 1…N ]

[ Portada ]
[ Reemplazar ]
[ Eliminar ]

[ ↑ ]
[ ↓ ]

[ Vista previa ]

[ Guardar borrador ]
```

Desktop puede sumar drag & drop.

No obligar al usuario mobile a arrastrar con precisión para realizar acciones esenciales.

---

# 20. UI mobile del editor

El editor actual tiene varias decisiones desktop que en teléfono quedan demasiado chicas.

Ejemplo actual: debajo de 1200 px, el sidebar usa aproximadamente:

```css
width: min(350px, 48vw)
```

En un teléfono eso deja un panel extremadamente angosto.

## Cambiar estrategia

### Desktop

Mantener:

```text
Sidebar | Canvas | Inspector
```

### Mobile

Usar:

```text
┌────────────────────────┐
│ Topbar                  │
├────────────────────────┤
│                        │
│       CANVAS           │
│                        │
├────────────────────────┤
│ toolbar inferior       │
└────────────────────────┘
```

y paneles como `bottom sheet` / pantalla completa:

```text
Páginas
Inspector
Diálogos
Stops
Máscaras
Audio
Más
```

---

# 21. Mobile: medidas mínimas

Usar targets táctiles de aproximadamente:

```text
44 x 44 px
```

Evitar acciones importantes de:

```text
text-[10px]
p-1
```

si son botones táctiles.

No depender de:

```text
hover:
whileHover
group-hover
```

para descubrir controles.

En mobile los botones esenciales deben estar siempre visibles.

---

# 22. Interacciones del canvas en mobile

Separar modos explícitos:

```text
Navegar
Globo
Stop
Máscara
```

### Navegar

- un dedo: mover página;
- pinch: zoom;
- doble tap: reset/fit.

### Editar elemento

- tap: seleccionar;
- drag: mover;
- handles grandes: redimensionar;
- inspector abajo.

Esto evita que un gesto de scroll/zoom mueva accidentalmente un globo.

---

# 23. Guardado mobile

No exigir Ctrl+S.

Barra inferior:

```text
● 3 cambios
[Guardar]
[Preview]
[Publicar]
```

Estados:

```text
Guardando...
Guardado ✓
Conflicto
Sin conexión
Publicando...
```

No perder cambios si Safari suspende la pestaña.

Mantener backup local adicional con:

```text
localStorage / IndexedDB
```

como recuperación local, pero **GitHub sigue siendo la persistencia real**.

---

# 24. Publicar desde el celular

Flujo final esperado:

```text
1. Abrir elseframe desde iPhone.
2. Entrar al editor.
3. Abrir Inmortal/Beyonders/etc.
4. Subir nuevas páginas.
5. Page Manager las ordena por fecha.
6. Corregir orden.
7. Eliminar/reemplazar páginas si hace falta.
8. Renumerar.
9. Editar diálogos.
10. Crear stops y máscaras.
11. Guardar borrador.
12. Preview.
13. Publicar.
14. GitHub Actions:
      - convierte imágenes a WebP
      - comprime
      - sincroniza placeholders
      - procesa audio
      - commitea
      - pushea ambos repos
15. Vercel detecta main.
16. Deploy.
17. Editor muestra “Publicado”.
```

Ese debe ser el criterio de éxito del proyecto.

---

# 25. Seguridad

Ya existe autenticación del editor mediante password.

Mantenerla, pero:

- el navegador nunca recibe `GITHUB_EDITOR_TOKEN`;
- `/api/editor/publish` debe exigir acceso master;
- validar rutas para impedir `../`;
- usar whitelist de repos;
- usar whitelist de carpetas editables;
- validar MIME/tamaño;
- sanitizar nombres;
- prohibir escribir fuera de:
  - `public/comics`
  - `docs`
  - paths explícitamente autorizados.

No aceptar un path arbitrario enviado por el cliente y pasarlo directamente a GitHub.

---

# 26. Bloqueo de publicación simultánea

GitHub Actions:

```yaml
concurrency:
  group: elseframe-editor-publish
  cancel-in-progress: false
```

La UI también debe deshabilitar:

```text
Publicar
```

si ya existe una publicación activa.

No permitir dos pipelines modificando los dos repos al mismo tiempo.

---

# 27. Validación previa a publicar

Antes de disparar workflow:

```text
Preflight
```

Debe comprobar:

- `dialogues.json` parsea;
- no hay dos páginas con el mismo número;
- no faltan números si se eligió numeración continua;
- `audioTracks.startPageKey` apunta a página válida;
- `stopTrigger.pageKey` apunta a página válida;
- contexto narrativo no apunta a páginas inexistentes;
- portada existe;
- no quedan nombres temporales `__tmp_*`;
- no quedan uploads incompletos.

Si falla:

```text
NO PUBLICAR
```

y mostrar el problema.

---

# 28. Backups y rollback

Git ya da historial, pero agregar una protección simple.

Antes de una renumeración masiva:

```text
editor backup: before page reorder <timestamp>
```

o tag/commit identificable.

Antes de publicar mostrar:

```text
47 archivos modificados
6 eliminados
3 agregados
dialogues.json actualizado
```

Si algo sale mal, revertir el commit.

---

# 29. Fases de implementación recomendadas

## Fase 1 — Persistencia GitHub

Objetivo:

```text
Editar diálogo desde producción
Guardar
Cerrar Safari
Volver
El cambio sigue ahí
```

Implementar:

- `lib/githubEditor.ts`;
- `editor-workspace`;
- save de `dialogues.json`;
- lectura de diálogos desde workspace;
- conflicto por SHA.

**No avanzar hasta que esto funcione.**

---

## Fase 2 — Publicar con GitHub Actions

Objetivo:

```text
Publicar desde producción
```

y obtener exactamente el efecto funcional de:

```bash
npm run publish:all
```

Implementar:

- `publish-editor.yml`;
- token cross-repo;
- adaptar `publish-all.js`;
- `/api/editor/publish` -> workflow dispatch;
- estado de workflow en modal.

Probar primero sin imágenes nuevas y después con PNG/JPG.

---

## Fase 3 — Page Manager

Objetivo:

```text
No volver a necesitar Explorer de Windows para ordenar páginas.
```

Implementar:

- multi-upload;
- sort por `lastModified`;
- thumbnails;
- reorder;
- portada;
- reemplazo;
- borrado;
- renumeración;
- `pageMap`;
- remap de dialogues/audio/context;
- commit atómico.

---

## Fase 4 — Mobile UX

Objetivo:

```text
Editar un capítulo completo desde iPhone sin abrir una PC.
```

Implementar:

- bottom sheets;
- toolbar inferior;
- targets 44px;
- canvas touch;
- upload desde Fotos/Archivos;
- botones siempre visibles;
- sin dependencia de hover;
- safe areas iPhone;
- evitar teclado tapando inputs.

CSS útil:

```css
padding-bottom: env(safe-area-inset-bottom);
padding-top: env(safe-area-inset-top);
```

---

# 30. Tests obligatorios

## Guardado

- editar un diálogo;
- guardar;
- refrescar;
- continúa;
- abrir otro dispositivo;
- continúa.

## Página nueva

- subir PNG desde iPhone;
- guardar;
- verla en editor;
- publicar;
- confirmar WebP en assets;
- confirmar original eliminado según comportamiento actual.

## Orden

Partir de:

```text
1 2 3 4 5
```

mover 5 a posición 2.

Resultado:

```text
1 5 2 3 4
```

después de normalizar:

```text
1 2 3 4 5
```

pero cada diálogo debe permanecer con su imagen original.

## Delete

Partir de:

```text
57 58 59 60
```

borrar 58.

Resultado:

```text
57 58 59
```

donde:

```text
old 59 -> new 58
old 60 -> new 59
```

y verificar:

- dialogues;
- stops;
- masks;
- audio startPageKey;
- audio stopTrigger.pageKey;
- page context.

## Publicación

Subir:

```text
PNG
JPG
```

Publicar.

Verificar:

- aparecen WebP;
- originales procesados según `convert.js`;
- placeholders sincronizados;
- ambos repos reciben commit;
- Vercel redeploya;
- lector público abre páginas correctas.

## Mobile

En iPhone:

- portrait;
- landscape;
- abrir/cerrar paneles;
- pinch zoom;
- drag de bubble;
- máscara;
- teclado;
- subir varias imágenes;
- reorder;
- save;
- preview;
- publish.

---

# 31. Archivos actuales que probablemente deben cambiar

### Principal

```text
lib/githubComics.ts
lib/githubEditor.ts                         NUEVO

app/api/chapters/[id]/route.ts
app/api/chapters/[id]/dialogues/route.ts

app/api/editor/pages/route.ts
app/api/editor/publish/route.ts
app/api/editor/meta/route.ts
app/api/editor/structure/route.ts

components/reader/PublishModal.tsx
components/reader/EditorLeftSidebar.tsx

components/editor-v2/EditorV2.tsx
components/editor-v2/PageManager.tsx        NUEVO
components/editor-v2/MobileEditorToolbar.tsx NUEVO

scripts/deploy/publish-all.js
scripts/editor/remap-pages.js               NUEVO
scripts/editor/preflight.js                 NUEVO

.github/workflows/publish-editor.yml         NUEVO
```

Según alcance, `docs` y `dialogue context` también deben migrar de escritura `fs` a GitHub en producción.

---

# 32. Regla para no romper el editor local

No eliminar el flujo local.

La aplicación debe soportar ambos:

```text
LOCAL
fs + repos hermanos + publish:all normal
```

y:

```text
PRODUCCIÓN
GitHub API + editor-workspace + GitHub Actions
```

Idealmente con una abstracción:

```ts
EditorStorage
```

Implementaciones:

```ts
LocalEditorStorage
GithubEditorStorage
```

Así los componentes React no necesitan saber dónde se guardan los archivos.

---

# 33. Definición de terminado

El trabajo se considera terminado únicamente cuando esta prueba funciona:

> Desde un iPhone, sin PC encendida y sin localhost, abrir un capítulo existente, subir varias páginas PNG/JPG con nombres aleatorios, ordenarlas por fecha, corregir manualmente el orden, borrar una página intermedia, renumerar automáticamente sin perder diálogos/stops/máscaras/audio/contexto, editar diálogos, guardar, cerrar y volver a entrar, previsualizar y pulsar Publicar. GitHub Actions debe ejecutar el equivalente funcional del `publish:all` actual, producir WebP, sincronizar los dos repos, actualizar `main` y provocar el deployment correcto en Vercel.

---

# 34. Orden de trabajo para Cursor / agente

Copiar estas instrucciones al agente de código:

```text
Implementá esta migración incrementalmente. No reescribas el editor.

1. Auditá los archivos indicados y documentá el flujo local actual.
2. Creá una abstracción EditorStorage con backend local y GitHub.
3. Creá soporte para la rama editor-workspace.
4. Migrá primero el guardado/carga de dialogues.json en producción.
5. Añadí control de conflictos por SHA.
6. Creá GitHub Action publish-editor.yml que haga checkout de ambos repos
   en carpetas hermanas llamadas exactamente:
   - the-boys
   - theboyz-comic-v1
7. Adaptá publish-all.js para que pueda publicar HEAD hacia main mediante
   PUBLISH_TARGET_BRANCH sin romper el uso local actual.
8. Cambiá /api/editor/publish para disparar GitHub Actions en producción.
9. Verificá que convert/compress/compress:audio/sync/commit/push continúen
   funcionando antes de tocar el Page Manager.
10. Implementá PageManager mobile-first.
11. Toda operación de reorder/delete debe generar un pageMap y remapear:
    - dialogues.pages
    - audioTracks.startPageKey
    - audioTracks.stopTrigger.pageKey
    - DialogueContextConfig.pages
12. No renombres archivos secuencialmente de forma destructiva.
    Usá nombres temporales o, preferentemente, un tree commit atómico.
13. Agregá preflight antes de publicar.
14. Adaptá EditorV2 a mobile con bottom sheets y toolbar inferior.
15. No dependas de hover para controles esenciales.
16. Conservá compatibilidad con local.
17. Ejecutá tests de build/lint y casos manuales descritos en este documento.
18. Dividí el cambio en PRs/fases pequeñas. No hagas un mega-PR.
```

---

# 35. PRs sugeridos

```text
PR 1 — Editor storage + GitHub workspace
PR 2 — Remote publish via GitHub Actions
PR 3 — Page Manager + safe renumber/remap
PR 4 — Mobile Editor V2 UX
PR 5 — Hardening, preflight, conflicts y rollback
```

Esto reduce muchísimo el riesgo frente a intentar cambiar persistencia, publicación, páginas y mobile en un único PR.

---

## Resultado

No hace falta convertir Elseframe en un CMS tradicional ni agregar una base de datos.

La arquitectura puede seguir siendo:

```text
JSON + archivos + Git
```

pero GitHub pasa a funcionar como filesystem persistente/versionado del editor, GitHub Actions como la “PC remota” que ejecuta el pipeline pesado, Vercel como frontend/backend web y el teléfono como cliente del editor.
