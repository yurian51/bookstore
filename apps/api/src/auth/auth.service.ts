import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword, verifyPassword, randomToken, sha256 } from "../common/crypto";
import { config } from "../config/config";
import type { AppRole } from "../common/roles";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(input: { email: string; password: string; name: string; country: string; preferredLanguage: string }) {
    const email = input.email.toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException("Email already registered");
    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name,
        country: input.country,
        preferredLang: input.preferredLanguage,
        passwordHash: await hashPassword(input.password),
        roles: { create: [{ role: "CUSTOMER" }] },
      },
    });
    return this.issueSession(user.id);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Same error path whether or not the user exists, to prevent enumeration.
    const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !ok || user.disabledAt) throw new UnauthorizedException("Invalid credentials");
    return this.issueSession(user.id);
  }

  async issueSession(userId: string) {
    const token = randomToken();
    const expiresAt = new Date(Date.now() + config.sessionTtlDays * 86_400_000);
    await this.prisma.session.create({
      data: { userId, tokenHash: sha256(token), expiresAt },
    });
    return { token, expiresAt };
  }

  async resolveSession(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { include: { roles: true } } },
    });
    if (!session || session.expiresAt < new Date() || session.user.disabledAt) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      roles: session.user.roles.map((r) => r.role) as AppRole[],
    };
  }

  async revoke(token: string) {
    await this.prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
}
