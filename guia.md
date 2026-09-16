# Guía de Elseframe Comics

Documento de referencia rápida para desarrollo, publicación y control de acceso.

---

## Repositorios

| Repo | Propósito | Puerto Dev |
|---|---|---|
| `the-boys` | App Next.js — UI, diálogos, código | `3000` |
| `the-boyz-comic` | Assets pesados — imágenes en alta resolución | `8080` |

---

## Comandos rápidos

### `the-boys`
```bash
npm run dev          # Levanta la web en localhost:3000
npm run sync-assets  # Sincroniza marcadores de assets desde the-boyz-comic
npm run build        # Verifica que compila sin errores antes de pushear
```

### `the-boyz-comic`
```bash
npm run dev     # Servidor de imágenes en localhost:8080 (CORS habilitado)
npm run convert # Convierte todas las imágenes a .webp optimizado
npm run sync    # Sincroniza hacia the-boys (equivalente a sync-assets)
```

---

## Flujo para agregar un capítulo nuevo

```
1. Crear carpeta en the-boyz-comic/comics/
   └── #4 nombre-saga/
       └── #1 nombre-capitulo/
           ├── portada.png     ← portada del capítulo
           ├── 1.png
           ├── 2.png ...

2. Convertir a WebP (en the-boyz-comic):
   npm run convert

3. Sincronizar hacia la web (en cualquiera de los dos):
   npm run sync  /  npm run sync-assets

   → Crea saga.json y chapter.json en draft automáticamente
   → Copia portada.webp real
   → Crea marcadores vacíos (0 bytes) para el resto

4. Editar diálogos:
   - Tener corriendo ambos dev servers (3000 y 8080)
   - Ir a localhost:3000, entrar al capítulo, activar editor con contraseña
   - Posicionar globos, zooms, guardar

5. Publicar (ver sección de bloqueo abajo)

6. Push en ambos repos:
   git add . && git commit -m "feat: ..." && git push
```

---

## 🔒 Bloqueo y desbloqueo de sagas / capítulos

El sistema usa el campo **`"status"`** en los JSON de cada capítulo o saga.

### Estados posibles

| `status` | Comportamiento |
|---|---|
| `"draft"` | **Bloqueado.** Solo accesible con contraseña (`PREVIEW_PASSWORD` o la contraseña de saga). |
| `"published"` | **Público.** Visible para todos sin contraseña. |

---

### Bloquear / desbloquear un **capítulo**

Editá el archivo `chapter.json` de ese capítulo:

```
the-boys/public/comics/#3 El Silencio del Dragon/#1 Un Lugar/chapter.json
```

```json
{
  "title": "Un Lugar",
  "number": 1,
  "status": "draft"      ← bloqueado
}
```

```json
{
  "title": "Un Lugar",
  "number": 1,
  "status": "published"  ← público
}
```

---

### Bloquear / desbloquear una **saga completa**

Editá el `saga.json` de esa saga:

```
the-boys/public/comics/#3 El Silencio del Dragon/saga.json
```

```json
{
  "title": "Hush: El Silencio del Dragón",
  "status": "draft",     ← toda la saga bloqueada
  "password": "hush"     ← contraseña específica para esta saga (opcional)
}
```

```json
{
  "title": "Hush: El Silencio del Dragón",
  "status": "published"  ← toda la saga pública
}
```

> Si la saga tiene `"status": "draft"` pero un capítulo tiene `"status": "published"`, **el capítulo sigue bloqueado** porque el sistema evalúa ambos niveles.

---

### 🌟 Destacar Sagas (Último Lanzamiento y Próximamente)

En el archivo `saga.json` de cada saga, además del `"status"`, podés configurar dos propiedades booleanas opcionales para destacar y diferenciar sagas en la cartelera principal:

| Propiedad | Tipo | Comportamiento | Estilo Visual |
|---|---|---|---|
| `"nuevo"` | `boolean` | **Último lanzamiento.** Destaca la saga como la más nueva en la plataforma. | Borde pop-art con sombra del color de la saga, badge animado de `"¡NUEVA!"` y cartelera de `"¡ÚLTIMO LANZAMIENTO!"` en la esquina superior. |
| `"proximamente"` | `boolean` | **Próximo proyecto.** Presenta la saga como un teaser en desarrollo. | Borde discontinuo (`dashed`), fondo de plano/construcción (`blueprint`), portada oscurecida y con marca de `"PROYECTO EN CURSO"`, botón alternativo de avance y bloqueo automático de todos sus capítulos. |

**Ejemplo de saga nueva (`public/comics/#3 El Silencio del Dragon/saga.json`):**
```json
{
  "title": "Hush: El Silencio del Dragón",
  "status": "published",
  "nuevo": true
}
```

**Ejemplo de saga próxima (`public/comics/#5 Distrito Nulo/saga.json`):**
```json
{
  "title": "Distrito Nulo",
  "status": "draft",
  "proximamente": true
}
```

---

### Contraseñas de acceso

Hay **dos niveles** de contraseña:

| Tipo | Dónde se define | Quién la usa |
|---|---|---|
| **Master** | Variable de entorno `PREVIEW_PASSWORD` (`.env.local` + Vercel) | Desbloquea cualquier saga/capítulo + acceso al editor de diálogos |
| **Por saga** | Campo `"password"` en `saga.json` | Desbloquea solo esa saga (sin dar acceso al editor) |

**Ejemplo saga con contraseña propia:**
```json
{
  "title": "Hush: El Silencio del Dragón",
  "status": "draft",
  "password": "hush"
}
```
Cualquiera que ingrese `hush` en el modal de contraseña podrá ver esa saga, sin conocer la master password.

---

## Variables de entorno

### `.env.local` (desarrollo)
```env
NEXT_PUBLIC_ASSETS_BASE_URL="http://localhost:8080"
PREVIEW_PASSWORD="tu_contraseña_secreta"
```

### Vercel (producción)
| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_ASSETS_BASE_URL` | `https://cdn.jsdelivr.net/gh/Ian9Franco/theboyz-comic-v1@main` |
| `PREVIEW_PASSWORD` | `tu_contraseña_secreta` |

---

## Unlock temporal sin editar JSON (admin local)

En `localhost:3000`, abrí la consola del navegador y ejecutá:

```js
localStorage.setItem("unlock-all", "true")
window.dispatchEvent(new Event("unlockAllChanged"))
```

Esto desbloquea todo visualmente **solo en tu navegador** para poder revisar el contenido sin cambiar los JSON. Para volver al estado normal:

```js
localStorage.removeItem("unlock-all")
window.dispatchEvent(new Event("unlockAllChanged"))
```




comando para correr el entorno: npm run dev:all
comando para publicar: npm run publish:all

---

## 🔓 Sistema de Desbloqueo de Personajes (Spoilers)

El sistema de personajes oculta automáticamente la ficha y detalles de un personaje si el usuario no ha completado la lectura del capítulo asociado.

Las reglas de desbloqueo se configuran en el archivo:
`the-boys/lib/characterData/unlockRules.ts`

### Formato de Regla

El archivo exporta una constante `UNLOCK_RULES` que mapea el `id` de cada personaje (definido en sus respectivos archivos de datos en `lib/characterData/`) a un array de nombres de capítulos que habilitan su desbloqueo:

```typescript
export const UNLOCK_RULES: Record<string, string[]> = {
  // Siempre desbloqueado (público desde el inicio)
  ian: [],

  // Desbloqueado solo cuando el lector termina un capítulo específico
  kenji: ['Un Lugar'],

  // Nunca desbloqueable directamente (oculto permanentemente hasta futuras sagas)
  matapobre: ['never-unlocked']
};
```

### Cómo agregar un nuevo desbloqueo al final de una saga o episodio

1. **Obtener el ID del Personaje**:
   Busca el ID del personaje en los archivos de `lib/characterData/` (por ejemplo, `pibes.ts`, `secundarios.ts`, `antagonistas.ts`). Es la propiedad `id` de la ficha del personaje.

2. **Obtener el ID del Capítulo**:
   Usa el nombre limpio de la carpeta del capítulo como identificador (por ejemplo, para la carpeta `#1 Un Lugar` es `Un Lugar`; para `#2 Kenji` es `Kenji`; para `#4 no-turning-back` es `no-turning-back`).
   *Nota: La comparación de IDs en el sistema no es sensible a mayúsculas ni espacios, pero se recomienda usar exactamente el nombre limpio del capítulo.*

3. **Configurar la Regla**:
   Abre `lib/characterData/unlockRules.ts` y actualiza la entrada del personaje.
   - Si quieres que el personaje se desbloquee al terminar el **Capítulo A**:
     ```typescript
     mi_personaje_id: ['Capitulo A']
     ```
   - Si quieres que se desbloquee al terminar **cualquiera** de varios capítulos (por ejemplo, el capítulo final de la Saga A o el de la Saga B):
     ```typescript
     mi_personaje_id: ['Capitulo A', 'Capitulo B']
     ```

4. **Cómo funciona bajo el capó**:
   Cuando un usuario lee un capítulo (por ejemplo, la ruta `/chapters/Un Lugar`), la aplicación Next.js guarda el ID del capítulo leído en el `localStorage` del navegador bajo la clave `read-chapters` (como un array JSON).
   El componente `CharacterRoster.tsx` consulta este `localStorage` y compara los capítulos leídos con las reglas de `UNLOCK_RULES`. Si el usuario ha leído al menos uno de los capítulos requeridos, el personaje se muestra de inmediato sin el velo de incógnito ("PRÓXIMAMENTE").

