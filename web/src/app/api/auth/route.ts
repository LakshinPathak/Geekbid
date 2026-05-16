import { NextRequest, NextResponse } from "next/server";
import { registerUser, loginUser, setRefreshCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, name, email, password, role } = body;

    // ─── REGISTER ────────────────────────────────────────────
    if (action === "register") {
      if (!name || !email || !password) {
        return NextResponse.json(
          { error: "Name, email, and password are required" },
          { status: 400 }
        );
      }

      const result = await registerUser(
        name,
        email,
        password,
        role ?? "freelancer"
      );

      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      // Set refresh token as HttpOnly cookie + return access token in body
      const response = NextResponse.json({
        accessToken: result.accessToken,
        user: result.user,
        expiresIn: 900, // 15 minutes in seconds
      });

      return setRefreshCookie(response, result.refreshToken);
    }

    // ─── LOGIN ───────────────────────────────────────────────
    if (action === "login") {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }

      const result = await loginUser(email, password);

      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: 401 }
        );
      }

      const response = NextResponse.json({
        accessToken: result.accessToken,
        user: result.user,
        expiresIn: 900,
      });

      return setRefreshCookie(response, result.refreshToken);
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'register' or 'login'" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[Auth Error]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
