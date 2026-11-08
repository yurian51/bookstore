import { Controller, Get, Query, Req, Res, ServiceUnavailableException } from "@nestjs/common";
import { Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { SESSION_COOKIE } from "./session.middleware";
import { randomToken } from "../common/crypto";
import { config } from "../config/config";

const STATE_COOKIE = "gbs_oauth_state";
const NEXT_COOKIE = "gbs_oauth_next";
const shortCookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 10 * 60 * 1000 };
const sessionCookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

function safeNext(next?: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

function callbackUrl(): string {
  return process.env.GOOGLE_CALLBACK_URL ?? `http://localhost:${config.port}/api/auth/google/callback`;
}

/**
 * Google sign-in. The state value is bound to a cookie to prevent login CSRF.
 * Accounts are never linked automatically to an existing password account, because
 * that would let whoever registered the email first reach the Google identity's data.
 */
@Controller("auth/google")
export class GoogleAuthController {
  constructor(private auth: AuthService, private prisma: PrismaService) {}

  @Get()
  start(@Query("next") next: string | undefined, @Res() res: Response) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new ServiceUnavailableException("Google sign-in is not configured");
    const state = randomToken(24);
    res.cookie(STATE_COOKIE, state, shortCookie);
    res.cookie(NEXT_COOKIE, safeNext(next), shortCookie);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl(),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  @Get("callback")
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const fail = (reason: string) => res.redirect(`${config.webOrigin}/login?error=${reason}`);
    const expectedState = req.cookies?.[STATE_COOKIE];
    const next = safeNext(req.cookies?.[NEXT_COOKIE]);
    res.clearCookie(STATE_COOKIE, { path: "/" });
    res.clearCookie(NEXT_COOKIE, { path: "/" });

    const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
    if (!code || !state || !expectedState || state !== expectedState || !clientId || !clientSecret) {
      return fail("google");
    }

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl(),
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) return fail("google");
      const { access_token } = (await tokenRes.json()) as { access_token: string };

      const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!infoRes.ok) return fail("google");
      const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
      if (!info.sub || !info.email || info.email_verified !== true) return fail("unverified");
      const email = info.email.toLowerCase();

      let user = await this.prisma.user.findUnique({ where: { googleId: info.sub } });
      if (!user) {
        const byEmail = await this.prisma.user.findUnique({ where: { email } });
        if (byEmail) {
          if (byEmail.passwordHash) return fail("link_required");
          user = await this.prisma.user.update({ where: { id: byEmail.id }, data: { googleId: info.sub } });
        } else {
          user = await this.prisma.user.create({
            data: {
              email,
              name: info.name ?? email.split("@")[0],
              googleId: info.sub,
              country: config.defaultCountry,
              roles: { create: [{ role: "CUSTOMER" }] },
            },
          });
        }
      }
      if (user.disabledAt) return fail("disabled");

      const { token, expiresAt } = await this.auth.issueSession(user.id);
      res.cookie(SESSION_COOKIE, token, { ...sessionCookie, expires: expiresAt });
      return res.redirect(`${config.webOrigin}${next}`);
    } catch {
      return fail("google");
    }
  }
}
