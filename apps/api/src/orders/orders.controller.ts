import { Body, Controller, Get, Param, Post, Req, Headers } from "@nestjs/common";
import { Request } from "express";
import { checkoutSchema } from "@gbs/shared";
import { OrdersService } from "./orders.service";
import { ZodValidationPipe } from "../common/zod.pipe";
import { RequireAuth } from "../common/auth.decorator";
import { config } from "../config/config";

@Controller("orders")
@RequireAuth()
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post("checkout")
  checkout(@Req() req: any, @Body(new ZodValidationPipe(checkoutSchema)) body: any, @Headers("origin") origin?: string) {
    // Only trust origins we explicitly allow, to keep return URLs from pointing at third parties.
    const safeOrigin = origin === config.webOrigin ? origin : undefined;
    return this.orders.checkout(req.user.id, body.currency, body.couponCode, body.shippingAddressId, safeOrigin);
  }

  @Get()
  list(@Req() req: any) {
    return this.orders.listForUser(req.user.id);
  }

  @Get(":number")
  get(@Req() req: any, @Param("number") number: string) {
    return this.orders.getForUser(req.user.id, number);
  }

  @Post(":number/cancel")
  cancel(@Req() req: any, @Param("number") number: string) {
    return this.orders.cancel(req.user.id, number);
  }
}
