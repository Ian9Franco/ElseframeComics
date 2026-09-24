import type { NextRequest } from "next/server";

const DEFAULT_MASTER_PASSWORD = "spiderman";

/**
 * Contraseña maestra de Elseframe.
 * Desbloquea cualquier saga/capítulo en borrador y es la única que habilita el modo edición.
 * Se puede sobreescribir con la variable de entorno PREVIEW_PASSWORD.
 */
export function getMasterPassword(): string {
  return process.env.PREVIEW_PASSWORD || DEFAULT_MASTER_PASSWORD;
}

export function isMasterPassword(password: string | undefined | null): boolean {
  return Boolean(password) && password === getMasterPassword();
}

/**
 * Valida acceso al editor: solo la contraseña maestra habilita editar.
 * Acepta el header `x-editor-password` o la cookie `preview_password`.
 */
export function validateMasterEditorAccess(request: NextRequest): boolean {
  const headerPass = request.headers.get("x-editor-password");
  const cookiePass = request.cookies.get("preview_password")?.value;
  return isMasterPassword(headerPass || cookiePass);
}
