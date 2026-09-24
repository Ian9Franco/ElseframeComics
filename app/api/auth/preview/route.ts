import { NextRequest, NextResponse } from "next/server";
import { getDynamicSagas } from "@/lib/serverData";
import { isMasterPassword } from "@/lib/masterPassword";

export async function POST(request: NextRequest) {
  try {
    const { password, onlyMaster } = await request.json();
    if (!password) {
      return NextResponse.json({ success: false, error: "Contraseña requerida" }, { status: 400 });
    }

    let isValid = isMasterPassword(password);

    if (!isValid && !onlyMaster) {
      const sagas = getDynamicSagas();
      for (const saga of sagas) {
        if (saga.password && password === saga.password) {
          isValid = true;
          break;
        }
      }
    }

    if (isValid) {
      const response = NextResponse.json({ success: true });
      response.cookies.set("preview_password", password, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        sameSite: "lax",
      });
      return response;
    }

    return NextResponse.json({ success: false, error: "Contraseña incorrecta" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error en el servidor" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("preview_password", "", {
    path: "/",
    maxAge: 0,
  });
  return response;
}
