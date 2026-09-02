import { type NextRequest } from "next/server";
import { getSessionPerson } from "@/lib/auth";
import { readAvatar } from "@/lib/avatars";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ personId: string }> },
) {
  if (!(await getSessionPerson())) {
    return new Response("Not signed in", { status: 401 });
  }
  const { personId } = await ctx.params;
  /* The id becomes a storage key — allow only our id alphabet. */
  if (!/^[a-z0-9-]{1,64}$/i.test(personId)) {
    return new Response("Not found", { status: 404 });
  }
  const bytes = await readAvatar(personId);
  if (!bytes) return new Response("Not found", { status: 404 });
  /* Fresh copy pins the ArrayBuffer type for BlobPart. */
  return new Response(new Blob([new Uint8Array(bytes)]), {
    headers: {
      "Content-Type": "image/jpeg",
      /* photoUrl busts with ?v= on upload, so cache hard. */
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
