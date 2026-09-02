"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { people } from "@/db/schema";
import { getSessionPerson } from "@/lib/auth";
import { saveAvatar } from "@/lib/avatars";

const MAX_BYTES = 2 * 1024 * 1024;

/* Stores a person's photo and points photoUrl at it. Own photo only —
   the target must be the session person (#35); the UI mirrors this but
   the server is the boundary. The client sends an already-cropped 512px
   JPEG; this trusts sizes, not content — magic bytes checked. */
export async function uploadAvatar(
  personId: string,
  formData: FormData,
): Promise<void> {
  const me = await getSessionPerson();
  if (!me || me.id !== personId) return;

  const person = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.id, personId))
    .get();
  if (!person) return;

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > MAX_BYTES) {
    return;
  }
  const bytes = Buffer.from(await photo.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return;

  await saveAvatar(person.id, bytes);
  await db
    .update(people)
    .set({ photoUrl: `/avatars/${person.id}?v=${Date.now()}` })
    .where(eq(people.id, person.id));
}
