import path from "node:path";

/* Avatar files live beside the database (./data/avatars locally,
   /data/avatars on the Docker volume) so one mount carries all family
   data — and one backup (#12) covers photos too. Served by
   /avatars/[personId]; photoUrl carries a ?v= cache-buster that changes
   on every upload. */

export function avatarsDir(): string {
  const dbPath = process.env.DATABASE_PATH ?? "./data/myturn.db";
  return path.join(path.dirname(dbPath), "avatars");
}

export function avatarFilePath(personId: string): string {
  return path.join(avatarsDir(), `${personId}.jpg`);
}
