import type { NextRequest } from "next/server";
import { getDynamicSagas } from "@/lib/serverData";
import { isPreviewAuthBypassed } from "@/lib/previewAuth";

function getProvidedPassword(request: NextRequest): string | undefined {
  const headerPass = request.headers.get("x-editor-password");
  const cookiePass = request.cookies.get("preview_password")?.value;
  return headerPass || cookiePass || undefined;
}

export function validateMasterEditorAccess(request: NextRequest): boolean {
  if (isPreviewAuthBypassed()) return true;

  const masterPassword = process.env.PREVIEW_PASSWORD || "spiderman1999";
  const providedPassword = getProvidedPassword(request);
  if (!providedPassword) return false;
  return providedPassword === masterPassword;
}

export function validateEditorApiAccess(request: NextRequest): boolean {
  if (isPreviewAuthBypassed()) return true;

  const masterPassword = process.env.PREVIEW_PASSWORD || "spiderman1999";
  const providedPassword = getProvidedPassword(request);
  if (!providedPassword) return false;
  if (providedPassword === masterPassword) return true;

  return getDynamicSagas().some(
    (saga) => Boolean(saga.password) && saga.password === providedPassword
  );
}

export function validateEditorAccess(request: NextRequest, chapterId: string): boolean {
  if (isPreviewAuthBypassed()) return true;

  const masterPassword = process.env.PREVIEW_PASSWORD || "spiderman1999";
  const providedPassword = getProvidedPassword(request);

  if (!providedPassword) return false;
  if (providedPassword === masterPassword) return true;

  return getDynamicSagas().some(
    (saga) =>
      saga.chapters.some((chapter) => chapter.id === chapterId) &&
      Boolean(saga.password) &&
      saga.password === providedPassword
  );
}
