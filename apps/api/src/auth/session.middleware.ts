import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";

export const SESSION_COOKIE = "gbs_session";

/** Attaches req.user when a valid session cookie or bearer token is present. */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private auth: AuthService) {}

  async use(req: Request & { user?: unknown; cookies?: Record<string, string> }, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = bearer ?? req.cookies?.[SESSION_COOKIE];
    if (token) {
      const user = await this.auth.resolveSession(token);
      if (user) req.user = user;
    }
    next();
  }
}
