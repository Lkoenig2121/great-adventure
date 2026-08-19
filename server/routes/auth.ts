import { Router } from "express";
import {
  cookieName,
  createSession,
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
  verifyPassword,
  type AuthedRequest,
} from "../auth";
import { query } from "../db";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const username = String(req.body?.username ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required." });
    return;
  }
  const result = await query<{
    id: string;
    username: string;
    display_name: string;
    password_hash: string;
    role: "guest_wall" | "ride_ops" | "supervisor" | "flash_pass";
    site_code: string | null;
    unit_code: string | null;
  }>(
    `SELECT id, username, display_name, password_hash, role, site_code, unit_code
     FROM operators WHERE username = $1`,
    [username],
  );
  const row = result.rows[0];
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    res.status(401).json({ error: "Those credentials are not on today's roster." });
    return;
  }
  const token = await createSession(row.id);
  setSessionCookie(res, token);
  res.json({
    operator: {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      siteCode: row.site_code,
      unitCode: row.unit_code,
    },
  });
});

authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[cookieName()] as string | undefined;
  if (token) {
    const { hashToken } = await import("../auth");
    await query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ operator: req.operator });
});
