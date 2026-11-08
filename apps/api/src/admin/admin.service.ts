import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { config } from "../config/config";
import { splitSale } from "@gbs/shared";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async overview() {
    const paidStatuses = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] as const;
    const [users, authors, publishers, vendors, books, orders, revenue, pendingBooks, pendingVendors] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.authorProfile.count(),
      this.prisma.publisher.count(),
      this.prisma.vendor.count({ where: { status: "APPROVED" } }),
      this.prisma.book.count(),
      this.prisma.order.count({ where: { status: { in: [...paidStatuses] } } }),
      this.prisma.order.aggregate({ where: { status: { in: [...paidStatuses] } }, _sum: { totalMinor: true } }),
      this.prisma.book.count({ where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
      this.prisma.vendor.count({ where: { status: "PENDING" } }),
    ]);
    return {
      users, authors, publishers, vendors, books, orders,
      revenueMinor: revenue._sum.totalMinor ?? 0,
      pendingBookApprovals: pendingBooks,
      pendingVendorApplications: pendingVendors,
    };
  }

  async reviewQueue() {
    return this.prisma.book.findMany({
      where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      orderBy: { createdAt: "asc" },
      include: {
        authors: { include: { author: true } },
        formats: true,
        copyrightDecls: { orderBy: { acceptedAt: "desc" }, take: 1 },
      },
    });
  }

  /** Editors approve or reject. Approval makes the book purchasable. */
  async decideBook(adminId: string, bookId: string, decision: "APPROVE" | "REJECT" | "PUBLISH" | "UNPUBLISH", reason?: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException("Book not found");

    const transitions: Record<string, { from: string[]; to: string }> = {
      APPROVE: { from: ["SUBMITTED", "IN_REVIEW"], to: "APPROVED" },
      REJECT: { from: ["SUBMITTED", "IN_REVIEW", "APPROVED"], to: "REJECTED" },
      PUBLISH: { from: ["APPROVED", "UNPUBLISHED"], to: "PUBLISHED" },
      UNPUBLISH: { from: ["PUBLISHED"], to: "UNPUBLISHED" },
    };
    const t = transitions[decision];
    if (!t.from.includes(book.status)) {
      throw new BadRequestException(`Cannot ${decision.toLowerCase()} a book in status ${book.status}`);
    }
    if (decision === "REJECT" && !reason) throw new BadRequestException("A reason is required to reject");

    const updated = await this.prisma.book.update({
      where: { id: bookId },
      data: {
        status: t.to as any,
        rejectionReason: decision === "REJECT" ? reason : null,
        publishedAt: decision === "PUBLISH" ? new Date() : book.publishedAt,
      },
    });
    await this.audit(adminId, `BOOK_${decision}`, "Book", bookId, { from: book.status, to: t.to, reason });
    return updated;
  }

  async decideVendor(adminId: string, vendorId: string, status: "APPROVED" | "REJECTED" | "SUSPENDED") {
    const vendor = await this.prisma.vendor.update({ where: { id: vendorId }, data: { status } });
    await this.audit(adminId, `VENDOR_${status}`, "Vendor", vendorId, {});
    return vendor;
  }

  async setRoles(adminId: string, userId: string, roles: string[]) {
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.userRole.createMany({
        data: [...new Set(["CUSTOMER", ...roles])].map((role) => ({ userId, role: role as any })),
      }),
    ]);
    await this.audit(adminId, "ROLES_SET", "User", userId, { roles });
    return { ok: true };
  }

  /** Revenue split by platform commission and seller net, using the shared commission math. */
  async commissionReport() {
    const items = await this.prisma.orderItem.findMany({
      where: { order: { status: { in: ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] } } },
      select: { lineTotalMinor: true, commissionMinor: true, sellerNetMinor: true },
    });
    return {
      grossMinor: items.reduce((s, i) => s + i.lineTotalMinor, 0),
      platformCommissionMinor: items.reduce((s, i) => s + i.commissionMinor, 0),
      sellerNetMinor: items.reduce((s, i) => s + i.sellerNetMinor, 0),
      defaultCommissionBps: config.platformCommissionBps,
    };
  }

  async geographicSales() {
    const orders = await this.prisma.order.findMany({
      where: { status: { in: ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] } },
      select: { totalMinor: true, currency: true, address: { select: { country: true } }, user: { select: { country: true } } },
    });
    const byCountry: Record<string, { orders: number; totalMinor: number; currency: string }> = {};
    for (const o of orders) {
      const c = o.address?.country ?? o.user.country;
      byCountry[c] ??= { orders: 0, totalMinor: 0, currency: o.currency };
      byCountry[c].orders += 1;
      byCountry[c].totalMinor += o.totalMinor;
    }
    return byCountry;
  }

  async listUsers(q?: string) {
    return this.prisma.user.findMany({
      where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {},
      take: 100,
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, country: true, createdAt: true, disabledAt: true, roles: { select: { role: true } } },
    });
  }

  async disableUser(adminId: string, userId: string, disabled: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { disabledAt: disabled ? new Date() : null } });
    if (disabled) await this.prisma.session.deleteMany({ where: { userId } });
    await this.audit(adminId, disabled ? "USER_DISABLED" : "USER_ENABLED", "User", userId, {});
    return { ok: true };
  }

  async audit(actorId: string | null, action: string, entityType: string, entityId: string | null, meta: unknown) {
    await this.prisma.auditLog.create({ data: { actorId, action, entityType, entityId, meta: meta as any } });
  }
}
