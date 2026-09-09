import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { currentUser } from "@/lib/session";
import { ALLOWED_TYPES, MAX_FILE_BYTES, uploadRefusal } from "@/lib/staff-tasks";

/**
 * Issues a short-lived token so the browser can upload straight to storage.
 *
 * Going direct is what makes files larger than ~4.5 MB possible at all: a file
 * routed through a serverless function has to fit inside one request body.
 * Nothing here trusts the browser — the token is scoped to this task's folder,
 * to the sizes and types we accept, and the row in the database is only written
 * once the server has confirmed the upload with storage itself.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // the task id comes from the URL, never from the browser's pathname
        const refusal = await uploadRefusal(await currentUser(), id, pathname);
        if (refusal) throw new Error(refusal);

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
        };
      },
      // The database row is written by the confirm step in ../files instead.
      // Storage cannot reach a laptop, so a callback would never fire in
      // development and the two environments would behave differently.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload rejected";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
