"use server";

import { mkdirSync, writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { people } from "@/db/schema";
import { getSessionPerson } from "@/lib/auth";
import { avatarFilePath, avatarsDir } from "@/lib/avatars";

const MAX_BYTES = 2 * 1024 * 1024;

/* Stores a person's photo and points photoUrl at it — any signed-in
   family member can set anyone's photo (the crew strip's "Drop in your
   photos" is plural on purpose). The client sends an already-cropped
   512px JPEG; this trusts sizes, not content — magic bytes checked. */
export async function uploadAvatar(
  personId: string,
  formData: FormData,
): Promise<void> {
  if (!(await getSessionPerson())) return;

  const person = db
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

  mkdirSync(avatarsDir(), { recursive: true });
  writeFileSync(avatarFilePath(person.id), bytes);
  db.update(people)
    .set({ photoUrl: `/avatars/${person.id}?v=${Date.now()}` })
    .where(eq(people.id, person.id))
    .run();
}
