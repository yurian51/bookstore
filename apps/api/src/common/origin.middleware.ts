import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { config } from "../config/config";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Blocks cross-site state-changing requests. Browsers send Origin on cross-site POSTs,
 * so a foreign page cannot trigger purchases or changes with the user's cookie.
 * Requests without Origin are server-side or non-browser clients. Session cookies are
 * also SameSite=Lax, so this is a second layer rather than the only defence.
 */
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) return next();
    if (req.path === "/api/payments/webhook") return next(); // provider callbacks use signatures instead
    const origin = req.headers.origin;
    if (origin && origin !== config.webOrigin) {
      return res.status(403).json({ message: "Cross-site request blocked" });
    }
    next();
  }
}
