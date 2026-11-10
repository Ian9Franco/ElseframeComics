# 📦 Propuesta de Solución: Almacenamiento de Páginas a Coste $0 para Crecimiento del Cómic

## 1. El Problema a Futuro
Actualmente, las páginas del cómic (imágenes limpias sin diálogos) se guardan localmente en la carpeta `/public/comics/`. A medida que el cómic crezca en capítulos y páginas:
1. **Límite de despliegue de Vercel**: El límite de tamaño de compilación y bundle en Vercel (de 328MB a 500MB según la cuenta) se verá excedido rápidamente.
2. **Tamaño del repositorio**: Un repositorio de GitHub con gigabytes de imágenes de alta resolución ralentiza el desarrollo (`git clone`, `git push`).
3. **Consumo de Ancho de Banda**: La transferencia mensual gratuita de Vercel (100 GB en plan Hobby) podría consumirse rápidamente con imágenes grandes y pesadas.

---

## 2. Requisitos de la Solución
Para que la solución sea ideal, debe cumplir lo siguiente:
- **Coste $0**: Sin cuotas mensuales de bases de datos o storage en la nube.
- **Impacto mínimo de código**: Mantener el editor, el gestor de paradas cinemáticas, el zoom interactivo, el arrastre de colas Bézier y la lectura modular **exactamente como funcionan hoy**.
- **Independencia geométrica**: El editor trabaja con porcentajes relativos (`posX: 0-100`, `posY: 0-100`). No importa si la imagen viene de local o de un CDN externo, las coordenadas se calculan sobre las dimensiones renderizadas reales en la pantalla.

---

## 3. Opciones de Almacenamiento a Coste $0

### Opción A: Repositorio de GitHub Independiente + CDN de jsDelivr (Recomendado)
Consiste en crear un segundo repositorio público de GitHub únicamente para hospedar las imágenes (ej. `Elseframe-comic-v1`). Las imágenes se cargan a través de la red global de distribución de contenido (CDN) de **jsDelivr**, la cual es gratuita e ilimitada para proyectos open source.

- **URL de carga local**: `/comics/saga/capitulo/pagina_1.jpg`
- **URL de carga CDN**: `https://cdn.jsdelivr.net/gh/Ian9Franco/Elseframe-comic-v1@main/comics/saga/capitulo/pagina_1.jpg`
- **Ventajas**:
  - **100% Gratuito y sin límites estrictos** de almacenamiento (GitHub permite repositorios de hasta 10GB de forma óptima).
  - Ancho de banda ilimitado y caché distribuida de jsDelivr.
  - No requiere configurar APIs de terceros.

---

### Opción B: ImageKit.io (Free Tier)
ImageKit ofrece un plan gratuito permanente que incluye:
- **20 GB** de almacenamiento en la nube.
- **20 GB** de transferencia mensual.
- **Optimización en tiempo real**: Transforma automáticamente las imágenes a formatos modernos más livianos como WebP o AVIF según el navegador del usuario, reduciendo el consumo de ancho de banda hasta un 70%.

- **URL de carga CDN**: `https://ik.imagekit.io/tu_ID/comics/saga/capitulo/pagina_1.jpg`

---

## 4. Implementación con Cambios Mínimos (Refactor de 5 minutos)

Para lograr esto sin romper nada, solo debemos parametrizar el prefijo de la URL de las imágenes usando una **Variable de Entorno** de Next.js.

### Paso 1: Configurar Variables de Entorno (`.env.local`)
En tu archivo local `.env.local` dejas la variable vacía para seguir usando la carpeta `/public` localmente durante el desarrollo:
```env
NEXT_PUBLIC_ASSETS_BASE_URL=""
```

En Vercel (Production) configuras la variable apuntando al CDN externo:
```env
# Ejemplo con GitHub + jsDelivr
NEXT_PUBLIC_ASSETS_BASE_URL="https://cdn.jsdelivr.net/gh/Ian9Franco/Elseframe-comic-v1@main"
```

### Paso 2: Crear una utilidad para construir rutas
En `components/reader/readerUtils.ts`, añadimos una función auxiliar simple:

```typescript
/**
 * Devuelve la URL absoluta de una imagen del cómic.
 * Si NEXT_PUBLIC_ASSETS_BASE_URL está configurado, la cargará del CDN externo.
 * De lo contrario, usará la ruta local relativa en /public.
 */
export function getComicPageUrl(relativePath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "";
  
  // Asegurarse de que comience con '/' si no hay base URL, o quitarlo si la base URL ya tiene sufijo
  if (baseUrl) {
    const cleanPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
    return `${baseUrl}${cleanPath}`;
  }
  
  return relativePath;
}
```

### Paso 3: Aplicar en el Lector y Canvas
En `components/reader/ReaderCanvas.tsx` y en cualquier visualizador (como `app/chapters/[id]/page.tsx`), reemplazamos el atributo `src` de las etiquetas `<img>` para pasar por esta utilidad:

```diff
-src={pages[pageIdx]}
+src={getComicPageUrl(pages[pageIdx])}
```

---

## 5. Permanencia de `dialogues.json` en la Web

> [!IMPORTANT]
> Los archivos `dialogues.json` creados por el editor **deben permanecer en el proyecto web principal (Vercel/Next.js)** y NO moverse al CDN.
> 
> Dado que el JSON de diálogos es texto plano extremadamente ligero (apenas 10-30 KB por capítulo), mantenerlos en el proyecto web no influye en el límite de peso de Vercel. Esto nos permite seguir usando la API local de guardado `/api/chapters/[id]/dialogues` para guardar cambios al instante desde el editor sin configuraciones complejas.

### ¿Cómo sabe la API qué páginas existen si borramos las imágenes pesadas del servidor?

Nuestra API usa `fs.readdirSync()` para escanear los archivos de imagen en la carpeta del capítulo y devolver la lista ordenada al lector. Si borramos las imágenes para ahorrar espacio en Vercel, la API no encontrará páginas.

Para solucionar esto de forma limpia y con **cero cambios de código**, aplicamos el truco de los **archivos temporales de 0 bytes**:

1. En el repositorio web principal, dentro de la carpeta del capítulo (ej. `/public/comics/saga/capitulo/`), mantén los mismos archivos de imágenes (ej. `0.webp`, `1.webp`, `portada.webp`) pero **vacíalos para que pesen 0 bytes**.
2. Al pesar 0 bytes, ocupan exactamente **0 KB en el despliegue de Vercel y Git**, permitiéndote tener miles de páginas sin consumir espacio.
3. El servidor ejecutará `fs.readdirSync()` normalmente y le enviará la lista de nombres de archivos al cliente.
4. El navegador del usuario recibirá, por ejemplo, `/comics/saga/capitulo/1.webp`, y al pasar por `getComicPageUrl()`, el cliente cargará el archivo real de alta resolución desde el CDN de jsDelivr de manera instantánea.

---

## 6. Por qué esta solución es Segura y Estable
1. **El Editor no se entera del cambio**: Dado que el editor renderiza una etiqueta `<img>` HTML estándar apuntando a una URL, las funciones de cálculo de coordenadas en porcentaje (`e.clientX` con respecto al `getBoundingClientRect()` de la imagen) seguirán devolviendo valores idénticos de `0% a 100%`.
2. **CORS y Seguridad**: Tanto jsDelivr como ImageKit devuelven los headers CORS necesarios por defecto, lo que permite que el Canvas analice la imagen sin problemas si se requiere procesamiento gráfico adicional en el futuro.
3. **Escalabilidad**: Podrás subir cientos de capítulos sin tocar una sola línea de código en la aplicación principal ni preocuparte por exceder el límite de Vercel.

