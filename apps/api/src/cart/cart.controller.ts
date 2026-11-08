import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { addToCartSchema } from "@gbs/shared";
import { CartService } from "./cart.service";
import { ZodValidationPipe } from "../common/zod.pipe";
import { RequireAuth } from "../common/auth.decorator";

@Controller("cart")
@RequireAuth()
export class CartController {
  constructor(private cart: CartService) {}

  @Get()
  get(@Req() req: any) {
    return this.cart.get(req.user.id);
  }

  @Post("items")
  add(@Req() req: any, @Body(new ZodValidationPipe(addToCartSchema)) body: any) {
    return this.cart.add(req.user.id, body.bookId, body.formatId, body.quantity);
  }

  @Patch("items/:id")
  update(@Req() req: any, @Param("id") id: string, @Body() body: { quantity: number }) {
    return this.cart.update(req.user.id, id, Number(body.quantity));
  }

  @Delete("items/:id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.cart.remove(req.user.id, id);
  }

  @Patch("currency")
  setCurrency(@Req() req: any, @Body() body: { currency: string }) {
    return this.cart.setCurrency(req.user.id, body.currency);
  }
}
