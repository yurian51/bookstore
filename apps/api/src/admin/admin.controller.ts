import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { OrdersService } from "../orders/orders.service";
import { RequireAuth } from "../common/auth.decorator";
import { Roles, RolesGuard } from "../common/roles";

@Controller("admin")
@RequireAuth()
@UseGuards(RolesGuard)
@Roles("ADMIN", "EDITOR", "FINANCE", "SUPPORT")
export class AdminController {
  constructor(private admin: AdminService, private orders: OrdersService) {}

  @Get("overview")
  overview() {
    return this.admin.overview();
  }

  @Get("review-queue")
  @Roles("ADMIN", "EDITOR")
  queue() {
    return this.admin.reviewQueue();
  }

  @Post("books/:id/decision")
  @Roles("ADMIN", "EDITOR")
  decide(@Req() req: any, @Param("id") id: string, @Body() body: { decision: any; reason?: string }) {
    return this.admin.decideBook(req.user.id, id, body.decision, body.reason);
  }

  @Post("vendors/:id/status")
  @Roles("ADMIN")
  vendorStatus(@Req() req: any, @Param("id") id: string, @Body() body: { status: any }) {
    return this.admin.decideVendor(req.user.id, id, body.status);
  }

  @Get("users")
  @Roles("ADMIN", "SUPPORT")
  users(@Query("q") q?: string) {
    return this.admin.listUsers(q);
  }

  @Post("users/:id/disabled")
  @Roles("ADMIN")
  disable(@Req() req: any, @Param("id") id: string, @Body() body: { disabled: boolean }) {
    return this.admin.disableUser(req.user.id, id, body.disabled);
  }

  @Post("users/:id/roles")
  @Roles("ADMIN")
  roles(@Req() req: any, @Param("id") id: string, @Body() body: { roles: string[] }) {
    return this.admin.setRoles(req.user.id, id, body.roles);
  }

  @Get("orders")
  @Roles("ADMIN", "FINANCE", "SUPPORT")
  listOrders(@Query("q") q?: string) {
    return this.orders.listAll(q);
  }

  @Post("orders/:number/refund")
  @Roles("ADMIN", "FINANCE")
  refund(@Req() req: any, @Param("number") number: string, @Body() body: { amountMinor?: number; reason: string }) {
    return this.orders.refund(number, body.amountMinor, body.reason, req.user.id);
  }

  @Get("reports/commission")
  @Roles("ADMIN", "FINANCE")
  commission() {
    return this.admin.commissionReport();
  }

  @Get("reports/geography")
  @Roles("ADMIN", "FINANCE")
  geography() {
    return this.admin.geographicSales();
  }
}
