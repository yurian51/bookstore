import { Body, Controller, Delete, Get, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { AccountService } from "./account.service";
import { ZodValidationPipe } from "../common/zod.pipe";
import { RequireAuth } from "../common/auth.decorator";

const addressSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().max(30).optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  region: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2),
});

@Controller("account")
@RequireAuth()
export class AccountController {
  constructor(private account: AccountService) {}

  @Get("addresses")
  list(@Req() req: any) {
    return this.account.listAddresses(req.user.id);
  }

  @Post("addresses")
  add(@Req() req: any, @Body(new ZodValidationPipe(addressSchema)) body: any) {
    return this.account.addAddress(req.user.id, body);
  }

  @Post("addresses/:id/default")
  setDefault(@Req() req: any, @Param("id") id: string) {
    return this.account.setDefault(req.user.id, id);
  }

  @Delete("addresses/:id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.account.removeAddress(req.user.id, id);
  }
}
