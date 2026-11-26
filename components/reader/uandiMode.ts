/** localStorage key for Modo Uandi (half-page prev/next when page vista is complete). */
export const READER_MODO_UANDI_STORAGE_KEY = "reader_modo_uandi";

export type UandiHalf = "left" | "right";

/** Which half of the visible page frame was tapped (screen coords). */
export function uandiHalfFromClientX(
  clientX: number,
  pageFrame: HTMLElement | null | undefined
): UandiHalf | null {
  if (!pageFrame) return null;
  const r = pageFrame.getBoundingClientRect();
  if (clientX < r.left || clientX > r.right || r.width <= 0) return null;
  return clientX < r.left + r.width / 2 ? "left" : "right";
}