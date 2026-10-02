import type { Metadata, Viewport } from "next";
import { Inter, Bangers, Permanent_Marker, Bungee, Luckiest_Guy, Uncial_Antiqua, Nosifer } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const inter    = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bangers  = Bangers({ weight: "400", variable: "--font-bangers", subsets: ["latin"] });
const marker   = Permanent_Marker({ weight: "400", variable: "--font-marker", subsets: ["latin"] });
const bungee   = Bungee({ weight: "400", variable: "--font-bungee", subsets: ["latin"] });
const luckiest = Luckiest_Guy({ weight: "400", variable: "--font-luckiest", subsets: ["latin"] });
const arcane   = Uncial_Antiqua({ weight: "400", variable: "--font-arcane", subsets: ["latin"] });
const diabolic = Nosifer({ weight: "400", variable: "--font-diabolic", subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://theboyz.vercel.app"; // Fallback URL de producción

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Elseframe Comics",
  description: "Un sello para historias que rompen el cuadro. Perspectivas distintas. Otras posibilidades. Elseframe.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/marca/icono.webp", sizes: "32x32", type: "image/webp" }
    ],
    apple: "/marca/icono.webp",
  },
  openGraph: {
    title: "Elseframe Comics",
    description: "Un sello para historias que rompen el cuadro. Perspectivas distintas. Otras posibilidades. Elseframe.",
    siteName: "Elseframe Comics",
    url: "./",
    type: "website",
    images: [
      {
        url: "/marca/logo_light.webp",
        width: 1200,
        height: 630,
        alt: "Elseframe Comics Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elseframe Comics",
    description: "Un sello para historias que rompen el cuadro. Perspectivas distintas. Otras posibilidades. Elseframe.",
    images: ["/marca/logo_light.webp"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" suppressHydrationWarning className={`${inter.variable} ${bangers.variable} ${marker.variable} ${bungee.variable} ${luckiest.variable} ${arcane.variable} ${diabolic.variable}`}>
      <body className="antialiased min-h-screen flex flex-col font-sans brand-grain-light" suppressHydrationWarning>
        <NavBar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

/**
 * Footer — Elseframe Comics
 *
 * Diseño editorial inspirado en el manual de marca:
 * - Paleta Ink Black / Blood Red / Paper Cream
 * - Icono de marca como sello institucional
 * - Tagline canónica del sello
 * - Patrón de halftone y crack visual como elementos de identidad
 */
function Footer() {
  return (
    <footer
      className="brand-grain relative overflow-hidden pt-20 pb-12 px-6 sm:px-12 md:px-16"
      style={{
        borderTop: "3px solid #880D16",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      {/* ── Halftone pattern — marca registrada de identidad ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] z-0"
        style={{
          backgroundImage: "radial-gradient(circle, #880D16 1.5px, transparent 1.5px)",
          backgroundSize: "18px 18px",
        }}
      />

      {/* ── Blood Red accent line top ── */}
      <div
        className="absolute top-0 left-0 w-full h-[3px] pointer-events-none z-0"
        style={{
          background: "linear-gradient(90deg, transparent, #880D16 30%, #880D16 70%, transparent)",
        }}
      />

      <div className="max-w-3xl mx-auto relative z-10 flex flex-col items-stretch">

        {/* ══ SELLO INSTITUCIONAL ══════════════════════════════════════ */}
        <div className="flex flex-col items-center text-center mb-14">
          {/* Icono marca como sello */}
          <div className="relative mb-6">
            <img
              src="/marca/icono.webp"
              alt="Elseframe Comics Icon"
              className="w-24 h-auto object-contain opacity-90"
              style={{ filter: "drop-shadow(0 0 24px rgba(136,13,22,0.45))" }}
            />
          </div>

          {/* Logo completo versión light para fondo oscuro */}
          <img
            src="/marca/logo_dark.webp"
            alt="Elseframe Comics"
            className="w-72 h-auto object-contain mb-6 opacity-95"
          />

          {/* Tagline canónica del manual de marca */}
          <p className="font-[var(--font-bangers)] text-sm tracking-[0.35em] text-[#880D16] uppercase mb-2">
            NOT ALL STORIES STAY IN THEIR FRAMES.
          </p>
          <p className="text-xs tracking-[0.2em] text-[#F3EFE3]/30 uppercase font-sans">
            PUBLISHED TO OPEN NEW PANELS.
          </p>
        </div>

        {/* ── Divisor editorial ── */}
        <div className="w-full flex flex-col gap-[3px] mb-12 opacity-30">
          <div className="w-full h-[2px] bg-[#F3EFE3]" />
          <div className="w-full h-[0.5px] bg-[#F3EFE3]" />
        </div>

        {/* ══ AFTERWORD ════════════════════════════════════════════════ */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-[var(--font-bungee)] text-[#F3EFE3] tracking-[0.2em] select-none">
            AFTERWORD
          </h2>
          <p className="text-base font-[var(--font-marker)] text-[#880D16] tracking-[0.3em] uppercase mt-1">
            FROM THE CREATOR
          </p>
          <div className="w-16 h-[2px] bg-[#880D16] mx-auto mt-5" />

          <div className="max-w-xl mx-auto mt-8 font-[var(--font-marker)] text-[#F3EFE3]/50 text-base sm:text-lg leading-relaxed tracking-wider italic text-center">
            <span className="text-[#F3EFE3] font-serif">"</span> Algunas historias arrancan con un personaje. Otras con una pregunta. <strong className="text-[#F3EFE3] font-bold">Elseframe</strong> arrancó con las dos. <span className="text-[#F3EFE3] font-serif">"</span>
          </div>
        </div>

        {/* ── Divisor ── */}
        <div className="w-full flex flex-col gap-[3px] my-10 opacity-15">
          <div className="w-full h-[0.5px] bg-[#F3EFE3]" />
        </div>

        {/* ══ SECCIONES EDITORIALES ═══════════════════════════════════ */}

        {/* Narrativa */}
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 md:gap-8 my-4">
          <h3 className="font-[var(--font-bungee)] text-sm tracking-widest text-[#880D16] uppercase pt-1">
            NARRATIVA
          </h3>
          <div className="flex flex-col gap-6 text-[#F3EFE3]/40 text-[14px] sm:text-[15px] leading-7">
            <p>
              De <strong className="text-[#F3EFE3]/80">Jonathan Hickman</strong> (<span className="italic text-[#F3EFE3]/60">House of X / Powers of X</span>, <span className="italic text-[#F3EFE3]/60">East of West</span>) me obsesionó cómo arma universos gigantes sin perder de vista a sus personajes. De <strong className="text-[#F3EFE3]/80">Kevin Feige</strong> tomé esa locura por la continuidad y el detalle escondido, y de <strong className="text-[#F3EFE3]/80">James Gunn</strong> aprendí que la historia sí o sí necesita tener corazón.
            </p>
          </div>
        </div>

        <div className="w-full h-[0.5px] bg-[#F3EFE3]/10 my-8" />

        {/* Dirección Artística */}
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 md:gap-8 my-4">
          <h3 className="font-[var(--font-bungee)] text-sm tracking-widest text-[#880D16] uppercase pt-1">
            DIRECCIÓN ARTÍSTICA
          </h3>
          <div className="flex flex-col gap-6 text-[#F3EFE3]/40 text-[14px] sm:text-[15px] leading-7">
            <p>
              De <strong className="text-[#F3EFE3]/80">Sara Pichelli</strong> aprendí a darle movimiento a la página; de <strong className="text-[#F3EFE3]/80">Jorge Jiménez</strong> a guiar los ojos del lector en la viñeta; de <strong className="text-[#F3EFE3]/80">Greg Capullo</strong> a amar el contraste y el claroscuro; y de <strong className="text-[#F3EFE3]/80">Lee Garbett</strong> a entender que la elegancia suele estar en lo simple.
            </p>
          </div>
        </div>

        <div className="w-full h-[0.5px] bg-[#F3EFE3]/10 my-8" />

        {/* El Proceso */}
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 md:gap-8 my-4">
          <h3 className="font-[var(--font-bungee)] text-sm tracking-widest text-[#880D16] uppercase pt-1">
            EL PROCESO
          </h3>
          <div className="flex flex-col gap-6 text-[#F3EFE3]/40 text-[14px] sm:text-[15px] leading-7">
            <p>
              Cada página arranca con un guion tradicional y pasa por storyboard, dirección de arte y composición antes del render visual. La IA es una herramienta de producción, jamás un reemplazo creativo. De hecho, programé mi propio editor web para meter a mano cada globo de diálogo, efecto de sonido y animación, asegurándome de que la lectura fluya de manera orgánica.
            </p>
          </div>
        </div>

        {/* ── Divisor pesado ── */}
        <div className="w-full flex flex-col gap-[3px] mt-14 mb-10 opacity-30">
          <div className="w-full h-[2px] bg-[#F3EFE3]" />
          <div className="w-full h-[0.5px] bg-[#F3EFE3]" />
        </div>

        {/* ══ FIRMA ════════════════════════════════════════════════════ */}
        <div className="text-center my-10 flex flex-col items-center gap-4">
          <p className="font-[var(--font-marker)] text-2xl text-[#F3EFE3]/80 tracking-wide">
            Espero que lo disfrutes.
          </p>

          <div className="flex flex-col items-center mt-4">
            <a
              href="https://ian-pontorno-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-[var(--font-luckiest)] text-3xl text-[#F3EFE3] tracking-widest uppercase hover:scale-105 transition-transform hover:text-[#880D16] block select-none"
            >
              IAN PONTORNO
            </a>
            <span className="text-xs text-[#880D16] font-[var(--font-bangers)] tracking-[0.25em] uppercase mt-1">
              Creador — Elseframe Comics
            </span>
          </div>
        </div>

        {/* ══ COPYRIGHT ════════════════════════════════════════════════ */}
        <div className="w-full border-t border-[#F3EFE3]/5 pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] tracking-wider text-[#F3EFE3]/20 uppercase font-sans">
          <p>
            © {new Date().getFullYear()} Elseframe Comics. Todos los derechos reservados.
          </p>
          <p className="italic text-[#F3EFE3]/15 text-center sm:text-right max-w-sm leading-relaxed">
            * Cualquier similitud con la realidad es pura coincidencia. Obra de ficción. *
          </p>
        </div>

      </div>
    </footer>
  );
}
