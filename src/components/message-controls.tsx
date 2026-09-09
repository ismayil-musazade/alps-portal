"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls } from "@/components/ui";

/** Write to a colleague. */
export function Composer({ recipientId, recipientName }: { recipientId: string; recipientName: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, body }),
    });
    if (res.ok) {
      setBody("");
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Could not send");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={send} className="mt-3">
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`Message ${recipientName}…`}
        className={inputCls}
        onKeyDown={(e) => {
          // Enter sends, Shift+Enter starts a new line — what a chat box does
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            (e.currentTarget.form as HTMLFormElement).requestSubmit();
          }
        }}
      />
      {error && <p className="mt-1 text-sm text-brand-dark">{error}</p>}
      <button
        disabled={busy || !body.trim()}
        className="mt-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </form>
  );
}

/**
 * Opening a thread is reading it, so tell the server once the page is on
 * screen. Doing it here rather than while rendering keeps a link prefetch from
 * silently marking messages read that nobody has looked at.
 */
export function MarkThreadRead({ withUserId, unread }: { withUserId: string; unread: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!unread) return;
    let cancelled = false;
    fetch("/api/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withUserId }),
    }).then(() => {
      if (!cancelled) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [withUserId, unread, router]);

  return null;
}
