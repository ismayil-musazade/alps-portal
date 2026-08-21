import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { can, type Capability } from "@/lib/permissions";

/**
 * API-route gate: resolves the session and checks one capability.
 * Usage:  const gate = await requireCapability("leads.edit");
 *         if (gate instanceof NextResponse) return gate;  // 401/403
 *         const user = gate;
 */
export async function requireCapability(capability: Capability) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can(user.role, capability)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  return user;
}
