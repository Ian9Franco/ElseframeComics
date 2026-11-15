"use client";

export function NewsTicker({ sagas }: { sagas: any[] }) {
  // Extract all chapter titles to scroll, or generic titles if empty
  const items = sagas.flatMap((saga) =>
    saga.chapters.map((ch: any) => `${saga.title.toUpperCase()} - ${ch.title.toUpperCase()} (#${ch.number})`)
  );

  const loadingItems = [
    "CARGANDO ÚLTIMAS NOVEDADES...",
    "PREPARATE PIBE...",
    "ELSEFRAME COMICS...",
  ];

  const scrollItems = items.length > 0 ? items : loadingItems;
  // Duplicate array to ensure seamless infinite scroll loop
  const list = [...scrollItems, ...scrollItems, ...scrollItems];

  return (
    <div
      className="overflow-hidden select-none"
      style={{ background: "#1b4332", borderTop: "3px solid #0a0a0f", borderBottom: "3px solid #0a0a0f" }}
    >
      <div className="flex animate-marquee whitespace-nowrap py-3">
        {list.map((item, i) => (
          <span
            key={i}
            className="font-[var(--font-bangers)] text-xl tracking-[0.25em] text-white inline-block px-10"
          >
            ★ {item}
          </span>
        ))}
      </div>
    </div>
  );
}
