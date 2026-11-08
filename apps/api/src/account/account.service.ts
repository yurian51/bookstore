import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { id: "asc" }],
    });
  }

  async addAddress(userId: string, data: {
    fullName: string; phone?: string; line1: string; line2?: string;
    city: string; region?: string; postalCode?: string; country: string;
  }) {
    const country = data.country.toUpperCase();
    const count = await this.prisma.address.count({ where: { userId } });
    return this.prisma.address.create({
      data: { ...data, country, userId, isDefault: count === 0 },
    });
  }

  async setDefault(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException("Address not found");
    await this.prisma.$transaction([
      this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return { ok: true };
  }

  async removeAddress(userId: string, id: string) {
    await this.prisma.address.deleteMany({ where: { id, userId } });
    return { ok: true };
  }
}
