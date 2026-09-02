import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { loginTokens, people, sessions, type Person } from "@/db/schema";

/* Magic-link auth per the epic: allowlisted family emails (the people
   table IS the allowlist), Resend for delivery, one-time short-lived
   login tokens, and a long-lived DB-backed session behind an httpOnly
   cookie. Server-only — never import from client components. */

export const SESSION_COOKIE = "myturn_session";
const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000; // "you're in for a year"
const SEND_WINDOW_MS = 10 * 60 * 1000;
const SEND_MAX_PER_WINDOW = 3;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Create a login token for an allowlisted email and send the link.
 * Deliberately quiet about outcomes: unknown emails and rate-limited
 * sends return normally so the UI can't be used to probe the allowlist.
 */
export async function requestMagicLink(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();

  await db.delete(loginTokens).where(lt(loginTokens.expiresAt, new Date()));

  const recent = await db
    .select({ id: loginTokens.id })
    .from(loginTokens)
    .where(
      and(
        eq(loginTokens.email, email),
        gt(loginTokens.createdAt, new Date(Date.now() - SEND_WINDOW_MS)),
      ),
    );
  if (recent.length >= SEND_MAX_PER_WINDOW) return;

  const person = await db
    .select()
    .from(people)
    .where(eq(people.email, email))
    .get();
  if (!person) return;

  const token = newToken();
  await db.insert(loginTokens).values({
    id: randomUUID(),
    email,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
  });

  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const link = `${base}/auth/verify?token=${token}`;
  await sendLoginEmail(person, link);
}

async function sendLoginEmail(person: Person, link: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    /* Dev without Resend configured: the link in the server log IS the
       email. Never runs in production (the key ships with #12's ops
       setup). */
    console.log(`[auth] magic link for ${person.email}: ${link}`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "myturn <onboarding@resend.dev>",
      to: person.email,
      subject: "Welcome to MyTurn - Another Fine Creation from TODDTECH LLC",
      text: `Hi ${person.name},\n\nMyTurn keeps honest track of whose turn it is to pick — so nobody gets skipped, and nobody gets cheated out of their choice.\n\nTap to open MyTurn:\n${link}\n\nThe link works for 15 minutes, on the phone you'll use the app with. If you didn't ask for it, ignore this email.`,
    }),
  });
  if (!response.ok) {
    console.error(
      `[auth] Resend send failed (${response.status}): ${await response.text()}`,
    );
  }
}

/**
 * Redeem a one-time login token: marks it used, opens a year-long
 * session, sets the cookie. Returns the person, or null for an invalid,
 * expired, or already-used token.
 */
export async function verifyMagicLink(token: string): Promise<Person | null> {
  const row = await db
    .select()
    .from(loginTokens)
    .where(
      and(
        eq(loginTokens.tokenHash, sha256(token)),
        isNull(loginTokens.usedAt),
        gt(loginTokens.expiresAt, new Date()),
      ),
    )
    .get();
  if (!row) return null;

  await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(eq(loginTokens.id, row.id));

  const person = await db
    .select()
    .from(people)
    .where(eq(people.email, row.email))
    .get();
  if (!person) return null;

  const sessionToken = newToken();
  await db.insert(sessions).values({
    id: randomUUID(),
    personId: person.id,
    tokenHash: sha256(sessionToken),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
  return person;
}

/**
 * The signed-in person, or null. The real session check — every page
 * and action calls this; proxy.ts is only a redirect convenience.
 */
export async function getSessionPerson(): Promise<Person | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await db
    .select({ person: people })
    .from(sessions)
    .innerJoin(people, eq(sessions.personId, people.id))
    .where(
      and(
        eq(sessions.tokenHash, sha256(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .get();
  return row?.person ?? null;
}

/** Delete the session row and clear the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
    cookieStore.delete(SESSION_COOKIE);
  }
}

/* Fixed-window in-memory limiter for the verify route (single in-process
   server; a restart resetting counts is acceptable — epic #1). */
const verifyHits = new Map<string, { count: number; windowStart: number }>();
const VERIFY_WINDOW_MS = 60 * 1000;
const VERIFY_MAX_PER_WINDOW = 10;

export function allowVerifyAttempt(key: string): boolean {
  const now = Date.now();
  const hit = verifyHits.get(key);
  if (!hit || now - hit.windowStart > VERIFY_WINDOW_MS) {
    verifyHits.set(key, { count: 1, windowStart: now });
    return true;
  }
  hit.count += 1;
  return hit.count <= VERIFY_MAX_PER_WINDOW;
}
