import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { bookInputSchema } from "@gbs/shared";
import { AuthorsService } from "./authors.service";
import { ZodValidationPipe } from "../common/zod.pipe";
import { RequireAuth } from "../common/auth.decorator";
import { Roles } from "../common/roles";
import { RolesGuard } from "../common/roles";
import { UseGuards } from "@nestjs/common";

@Controller("author")
@RequireAuth()
@UseGuards(RolesGuard)
@Roles("AUTHOR", "PUBLISHER", "VENDOR")
export class AuthorsController {
  constructor(private authors: AuthorsService) {}

  @Get("books")
  books(@Req() req: any) {
    return this.authors.myBooks(req.user.id);
  }

  @Get("sales")
  sales(@Req() req: any) {
    return this.authors.salesSummary(req.user.id);
  }

  @Post("books")
  create(@Req() req: any, @Body(new ZodValidationPipe(bookInputSchema)) body: any) {
    return this.authors.createBook(req.user.id, body);
  }

  @Post("books/:id/formats")
  addFormat(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.authors.addFormat(req.user.id, id, body);
  }

  @Post("books/:id/submit")
  submit(@Req() req: any, @Param("id") id: string, @Body() body: { declaration: string }) {
    return this.authors.submitForReview(req.user.id, id, body.declaration);
  }
}
