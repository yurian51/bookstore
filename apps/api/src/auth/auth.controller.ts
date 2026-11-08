import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { Response, Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { registerSchema, loginSchema } from "@gbs/shared";
import { AuthService } from "./auth.service";
import { SESSION_COOKIE } from "./session.middleware";
import { ZodValidationPipe } from "../common/zod.pipe";
import { PrismaService } from "../prisma/prisma.service";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService, private prisma: PrismaService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("register")
  async register(@Body(new ZodValidationPipe(registerSchema)) body: any, @Res({ passthrough: true }) res: Response) {
    const { token, expiresAt } = await this.auth.register(body);
    res.cookie(SESSION_COOKIE, token, { ...cookieOpts, expires: expiresAt });
    return { ok: true };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(loginSchema)) body: any, @Res({ passthrough: true }) res: Response) {
    const { token, expiresAt } = await this.auth.login(body.email, body.password);
    res.cookie(SESSION_COOKIE, token, { ...cookieOpts, expires: expiresAt });
    return { ok: true };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) await this.auth.revoke(token);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  }

  @Get("me")
  async me(@Req() req: Request & { user?: { id: string; roles: string[] } }) {
    if (!req.user) return { user: null };
    const u = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, country: true, preferredLang: true },
    });
    return { user: { ...u, roles: req.user.roles } };
  }
}
