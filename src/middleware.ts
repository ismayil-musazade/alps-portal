import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

/**
 * Edge gate: anything under /app requires a session.
 * (Fine-grained per-role checks happen server-side in each page/route —
 * this is only the outer fence.)
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  const path = req.nextUrl.pathname;
  const isApp = path.startsWith("/app");
  const isLogin = path === "/login";
  const isChangePw = path === "/app/change-password";

  if (isApp && !session.userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  // temporary-password accounts are confined to the change-password screen
  if (isApp && session.userId && session.mustChangePassword && !isChangePw) {
    return NextResponse.redirect(new URL("/app/change-password", req.url));
  }
  if (isLogin && session.userId) {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  return res;
}

export const config = { matcher: ["/app/:path*", "/login"] };
