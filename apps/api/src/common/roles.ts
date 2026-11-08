import { SetMetadata, CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export const ROLES_KEY = "roles";
export type AppRole = "CUSTOMER" | "AUTHOR" | "PUBLISHER" | "VENDOR" | "EDITOR" | "SUPPORT" | "FINANCE" | "ADMIN";

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as { roles: AppRole[] } | undefined;
    if (!user) throw new UnauthorizedException();
    if (user.roles.includes("ADMIN")) return true;
    if (!required.some((r) => user.roles.includes(r))) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
