import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

const COOKIE = "readout_session";
const WEEK = 60 * 60 * 24 * 30;

const ORIGINS = new Set([
  "https://readout.fuyohaku.com",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
]);

export function requestOrigin(originHeader: string | undefined, requestUrl: string): string | null {
  if (originHeader && ORIGINS.has(originHeader)) return originHeader;
  const self = new URL(requestUrl).origin;
  return ORIGINS.has(self) ? self : null;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToB64(new Uint8Array(sig));
}

export async function sessionToken(secret: string, userId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const payload = `${userId}.${exp}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function userIdFromCookie(cookie: string | undefined, secret: string | undefined): Promise<string | null> {
  if (!secret) return null;
  const header = cookie ?? "";
  const raw = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const token = decodeURIComponent(raw.slice(COOKIE.length + 1));
  const [userId, exp, sig] = token.split(".");
  if (!userId || !exp || !sig) return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;
  const expected = await hmac(secret, `${userId}.${exp}`);
  if (expected !== sig) return null;
  return userId;
}

export function sessionCookie(token: string, secure: boolean, clear = false): string {
  const parts = [
    `${COOKIE}=${clear ? "" : encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${clear ? 0 : WEEK}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

async function saveChallenge(
  db: D1Database,
  challenge: string,
  kind: "register" | "login",
  email: string | null,
  userId: string | null,
) {
  await db
    .prepare(
      "INSERT INTO webauthn_challenges (challenge, kind, email, user_id, expires_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(challenge, kind, email, userId, Date.now() + 5 * 60 * 1000)
    .run();
}

export async function registrationOptions(db: D1Database, origin: string, email: string) {
  const userId = crypto.randomUUID();
  const options = await generateRegistrationOptions({
    rpName: "Readout",
    rpID: new URL(origin).hostname,
    userName: email,
    userDisplayName: email,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  await saveChallenge(db, options.challenge, "register", email, userId);
  return options;
}

export async function registrationVerify(
  db: D1Database,
  origin: string,
  response: RegistrationResponseJSON,
) {
  let matched: { email: string; user_id: string } | null = null;
  const verification = await verifyRegistrationResponse({
    response,
    expectedOrigin: origin,
    expectedRPID: new URL(origin).hostname,
    expectedChallenge: async (challenge) => {
      const row = await db
        .prepare(
          "SELECT email, user_id, expires_at FROM webauthn_challenges WHERE challenge = ? AND kind = 'register'",
        )
        .bind(challenge)
        .first<{ email: string; user_id: string; expires_at: number }>();
      if (!row || row.expires_at < Date.now()) return false;
      matched = row;
      return true;
    },
  });
  if (!verification.verified || !matched) return null;
  const saved = matched as { email: string; user_id: string };
  const credential = verification.registrationInfo.credential;
  await db.prepare("DELETE FROM webauthn_challenges WHERE user_id = ?").bind(saved.user_id).run();
  await db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").bind(saved.user_id, saved.email).run();
  await db
    .prepare("INSERT INTO credentials (id, user_id, public_key, counter) VALUES (?, ?, ?, ?)")
    .bind(credential.id, saved.user_id, bytesToB64(credential.publicKey), credential.counter)
    .run();
  return { userId: saved.user_id, email: saved.email };
}

export async function loginOptions(db: D1Database, origin: string) {
  const options = await generateAuthenticationOptions({
    rpID: new URL(origin).hostname,
    userVerification: "preferred",
  });
  await saveChallenge(db, options.challenge, "login", null, null);
  return options;
}

export async function loginVerify(
  db: D1Database,
  origin: string,
  response: AuthenticationResponseJSON,
) {
  const stored = await db
    .prepare("SELECT id, user_id, public_key, counter FROM credentials WHERE id = ?")
    .bind(response.id)
    .first<{ id: string; user_id: string; public_key: string; counter: number }>();
  if (!stored) return null;
  let usedChallenge = "";
  const verification = await verifyAuthenticationResponse({
    response,
    expectedOrigin: origin,
    expectedRPID: new URL(origin).hostname,
    credential: {
      id: stored.id,
      publicKey: b64ToBytes(stored.public_key),
      counter: stored.counter,
    },
    expectedChallenge: async (challenge) => {
      usedChallenge = challenge;
      const row = await db
        .prepare("SELECT expires_at FROM webauthn_challenges WHERE challenge = ? AND kind = 'login'")
        .bind(challenge)
        .first<{ expires_at: number }>();
      return !!row && row.expires_at >= Date.now();
    },
  });
  if (!verification.verified) return null;
  await db
    .prepare("UPDATE credentials SET counter = ? WHERE id = ?")
    .bind(verification.authenticationInfo.newCounter, stored.id)
    .run();
  await db.prepare("DELETE FROM webauthn_challenges WHERE challenge = ?").bind(usedChallenge).run();
  const user = await db
    .prepare("SELECT id, email FROM users WHERE id = ?")
    .bind(stored.user_id)
    .first<{ id: string; email: string }>();
  return user;
}
