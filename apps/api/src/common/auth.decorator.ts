import { applyDecorators, UseGuards } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";

/** Requires a valid session. Use on controllers or handlers. */
export function RequireAuth() {
  return applyDecorators(UseGuards(AuthGuard));
}
