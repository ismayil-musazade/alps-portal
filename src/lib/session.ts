import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export interface SessionData {
  userId?: string;
  role?: Role;
  name?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "alps_session",
  ttl: 60 * 60 * 12, // 12h
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/** Server-side gate for pages & API routes. Returns null if not authenticated. */
export async function currentUser() {
  const session = await getSession();
  if (!session.userId || !session.role) return null;
  return { id: session.userId, role: session.role, name: session.name ?? "" };
}
