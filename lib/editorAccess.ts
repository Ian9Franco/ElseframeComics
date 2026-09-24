import type { NextRequest } from "next/server";
import { validateMasterEditorAccess } from "@/lib/masterPassword";

/**
 * El modo edición está reservado a la contraseña maestra.
 * Las contraseñas por saga solo permiten previsualizar borradores, no editar.
 */
export function validateEditorAccess(request: NextRequest): boolean {
  return validateMasterEditorAccess(request);
}
