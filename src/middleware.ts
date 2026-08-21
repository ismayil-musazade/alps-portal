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

  const isApp = req.nextUrl.pathname.startsWith("/app");
  const isLogin = req.nextUrl.pathname === "/login";

  if (isApp && !session.userId) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  if (isLogin && session.userId) {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  return res;
}

export const config = { matcher: ["/app/:path*", "/login"] };
