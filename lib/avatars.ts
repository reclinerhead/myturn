import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { list, put } from "@vercel/blob";

/* Avatar storage (#40): Vercel Blob in production (BLOB_READ_WRITE_TOKEN
   present — injected by Vercel), plain files under data/avatars in local
   dev. Either way the app serves photos through the session-gated
   /avatars/[personId] route, so family photos never get a public URL of
   record; photoUrl carries a ?v= cache-buster that changes on upload. */

const BLOB_PREFIX = "avatars/";

/* Named to avoid the use* prefix — ESLint treats that as a React hook. */
function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function avatarsDir(): string {
  return path.join(process.cwd(), "data", "avatars");
}

export function avatarFilePath(personId: string): string {
  return path.join(avatarsDir(), `${personId}.jpg`);
}

export async function saveAvatar(
  personId: string,
  bytes: Buffer,
): Promise<void> {
  if (blobEnabled()) {
    await put(`${BLOB_PREFIX}${personId}.jpg`, bytes, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/jpeg",
    });
    return;
  }
  mkdirSync(avatarsDir(), { recursive: true });
  writeFileSync(avatarFilePath(personId), bytes);
}

export async function readAvatar(
  personId: string,
): Promise<Uint8Array | null> {
  if (blobEnabled()) {
    const { blobs } = await list({
      prefix: `${BLOB_PREFIX}${personId}.jpg`,
      limit: 1,
    });
    if (!blobs.length) return null;
    const response = await fetch(blobs[0].url);
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  }
  try {
    return new Uint8Array(readFileSync(avatarFilePath(personId)));
  } catch {
    return null;
  }
}

/** Local avatar file for this person, if one exists — used by the seed
    to install photos at provisioning time. */
export function localAvatarBytes(personId: string): Buffer | null {
  return existsSync(avatarFilePath(personId))
    ? readFileSync(avatarFilePath(personId))
    : null;
}
