"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { useState } from "react";

const NAV: Record<Role, { href: string; label: string }[]> = {
  MANAGER: [
    { href: "/app", label: "Dashboard" },
    { href: "/app/leads", label: "Leads" },
    { href: "/app/students", label: "Students" },
    { href: "/app/groups", label: "Courses" },
    { href: "/app/attendance", label: "Attendance" },
    { href: "/app/tasks", label: "Tasks" },
    { href: "/app/users", label: "Users" },
  ],
  STAFF: [
    { href: "/app", label: "Dashboard" },
    { href: "/app/leads", label: "Leads" },
    { href: "/app/students", label: "Students" },
    { href: "/app/tasks", label: "My tasks" },
  ],
  TEACHER: [
    { href: "/app", label: "Dashboard" },
    { href: "/app/students", label: "Students" },
    { href: "/app/attendance", label: "Attendance" },
    { href: "/app/tasks", label: "My tasks" },
  ],
  STUDENT: [
    { href: "/app", label: "My Progress" },
  ],
  PARENT: [
    { href: "/app", label: "My Child" },
  ],
};

export function AppNav({
  role,
  name,
  dueCount = 0,
  showBell = false,
  unreadCount = 0,
  showInbox = false,
}: {
  role: Role;
  name: string;
  dueCount?: number;
  showBell?: boolean;
  unreadCount?: number;
  showInbox?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const items = NAV[role];

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/app" className="flex items-center gap-2 font-extrabold tracking-wide">
          <svg viewBox="0 0 100 100" className="h-7 w-7" aria-hidden>
            <path fill="#b0322c" d="M44 6h12l40 88H70L52 54 40 78l8 2-16 14H4z" />
          </svg>
          <span className="hidden sm:inline">ALPS</span>
        </Link>

        <nav className="hidden gap-0.5 md:flex">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                pathname === i.href
                  ? "bg-brand-tint text-brand-dark"
                  : "text-ink/70 hover:bg-black/5"
              }`}
            >
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {showInbox && (
            <Link
              href="/app/messages"
              aria-label={unreadCount ? `Messages — ${unreadCount} unread` : "Messages"}
              title={unreadCount ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}` : "Messages"}
              className={`relative rounded-full p-1.5 hover:bg-black/5 ${
                pathname.startsWith("/app/messages") ? "bg-brand-tint text-brand-dark" : "text-ink/60"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2.5" y="5" width="19" height="14" rx="2" />
                <path d="m3 6.5 9 6 9-6" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-[17px] rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-[17px] text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          {showBell && (
            <Link
              href="/app/reminders"
              aria-label={dueCount ? `Reminders — ${dueCount} due` : "Reminders"}
              title={dueCount ? `${dueCount} reminder${dueCount === 1 ? "" : "s"} due` : "Reminders"}
              className={`relative rounded-full p-1.5 hover:bg-black/5 ${
                pathname === "/app/reminders" ? "bg-brand-tint text-brand-dark" : "text-ink/60"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {dueCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-[17px] rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-[17px] text-white">
                  {dueCount > 9 ? "9+" : dueCount}
                </span>
              )}
            </Link>
          )}
          <span className="hidden whitespace-nowrap text-sm text-ink/60 lg:inline">
            {name} · <span className="font-semibold">{role.toLowerCase()}</span>
          </span>
          <Link href="/app/change-password" className="hidden text-xs font-semibold text-ink/50 hover:text-brand xl:inline">
            password
          </Link>
          <button
            onClick={logout}
            className="whitespace-nowrap rounded-full border border-black/15 px-3 py-1 text-sm font-medium hover:bg-black/5"
          >
            Sign out
          </button>
          <button
            className="rounded-lg border border-black/15 p-1.5 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-black/10 bg-white px-4 py-2 md:hidden">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === i.href ? "bg-brand-tint text-brand-dark" : "text-ink/70"
              }`}
            >
              {i.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
