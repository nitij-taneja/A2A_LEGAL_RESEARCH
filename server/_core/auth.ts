import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";

function readBody<T = any>(req: Request): T {
  return (req.body || {}) as T;
}

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    const { email, name } = readBody<{ email?: string; name?: string }>(req);
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    try {
      await db.upsertUser({
        openId: email,
        email,
        name: name ?? null,
        loginMethod: "local",
        lastSignedIn: new Date(),
      } as any);

      const token = await sdk.createSessionToken(email, {
        name: name ?? email,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[Auth] signup failed", e);
      res.status(500).json({ error: "signup failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, name } = readBody<{ email?: string; name?: string }>(req);
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    try {
      const existing = await db.getUserByOpenId(email);
      if (!existing) {
        await db.upsertUser({
          openId: email,
          email,
          name: name ?? null,
          loginMethod: "local",
          lastSignedIn: new Date(),
        } as any);
      }

      const token = await sdk.createSessionToken(email, {
        name: name ?? email,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[Auth] login failed", e);
      res.status(500).json({ error: "login failed" });
    }
  });
}
