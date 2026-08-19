import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import type { Operator, OperatorRole } from "../lib/theme-park";
import { query } from "./db";

const scrypt = promisify(scryptCb);
const COOKIE = "ga_session";
const SESSION_MS = 12 * 60 * 60 * 1000;

export type AuthedRequest = Request & { operator?: Operator };

type OperatorRow = {
  id: string;
  username: string;
  display_name: string;
  role: OperatorRole;
  site_code: string | null;
  unit_code: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const derived = (await scrypt(password, Buffer.from(saltHex, "hex"), 64)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mapOperator(row: OperatorRow): Operator {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    siteCode: row.site_code as Operator["siteCode"],
    unitCode: row.unit_code,
  };
}

export async function createSession(operatorId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await query(
    `INSERT INTO sessions (token_hash, operator_id, expires_at)
     VALUES ($1, $2, $3)`,
    [hashToken(token), operatorId, new Date(Date.now() + SESSION_MS)],
  );
  return token;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MS,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

export async function operatorFromToken(token: string | undefined): Promise<Operator | null> {
  if (!token) return null;
  const result = await query<OperatorRow & { expires_at: Date }>(
    `SELECT o.id, o.username, o.display_name, o.role, o.site_code, o.unit_code, s.expires_at
     FROM sessions s
     JOIN operators o ON o.id = s.operator_id
     WHERE s.token_hash = $1`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]);
    return null;
  }
  return mapOperator(row);
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[COOKIE] as string | undefined;
  const operator = await operatorFromToken(token);
  if (!operator) {
    res.status(401).json({ error: "Sign in to see live park status." });
    return;
  }
  req.operator = operator;
  next();
}

export function cookieName() {
  return COOKIE;
}
