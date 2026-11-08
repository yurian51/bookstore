import {
  Body, Controller, Get, Param, Post, Req, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z } from "zod";
import { bookInputSchema, currencySchema } from "@gbs/shared";
import { AuthorsService } from "./authors.service";
import { ZodValidationPipe } from "../common/zod.pipe";
import { RequireAuth } from "../common/auth.decorator";
import { Roles, RolesGuard } from "../common/roles";

const FORMAT_TYPES = ["PHYSICAL", "PDF", "EPUB", "AUDIOBOOK"] as const;
const digitalTypes = z.enum(["PDF", "EPUB", "AUDIOBOOK"]);
const formatSchema = z.object({
  type: z.enum(FORMAT_TYPES),
  priceMinor: z.number().int().positive(),
  currency: currencySchema,
});
const declarationSchema = z.object({ declaration: z.string().min(20).max(5000) });

const FILE_LIMIT = 500 * 1024 * 1024;
const COVER_LIMIT = 5 * 1024 * 1024;

@Controller("author")
@RequireAuth()
@UseGuards(RolesGuard)
@Roles("AUTHOR", "PUBLISHER", "VENDOR")
export class AuthorsController {
  constructor(private authors: AuthorsService) {}

  @Get("profile")
  profile(@Req() req: any) {
    return this.authors.getProfile(req.user.id);
  }

  @Get("books")
  books(@Req() req: any) {
    return this.authors.myBooks(req.user.id);
  }

  @Get("books/:id")
  book(@Req() req: any, @Param("id") id: string) {
    return this.authors.getBook(req.user.id, id);
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
  addFormat(@Req() req: any, @Param("id") id: string, @Body(new ZodValidationPipe(formatSchema)) body: any) {
    return this.authors.addFormat(req.user.id, id, body);
  }

  @Post("books/:id/formats/:type/file")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: FILE_LIMIT } }))
  uploadFormat(
    @Req() req: any,
    @Param("id") id: string,
    @Param("type") type: string,
    @UploadedFile() file: any,
  ) {
    const parsed = digitalTypes.safeParse(type);
    if (!parsed.success) throw new BadRequestException("Only PDF, EPUB and AUDIOBOOK take files");
    return this.authors.attachFile(req.user.id, id, parsed.data, file);
  }

  @Post("books/:id/cover")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: COVER_LIMIT } }))
  uploadCover(@Req() req: any, @Param("id") id: string, @UploadedFile() file: any) {
    return this.authors.attachCover(req.user.id, id, file);
  }

  @Post("books/:id/submit")
  submit(@Req() req: any, @Param("id") id: string, @Body(new ZodValidationPipe(declarationSchema)) body: any) {
    return this.authors.submitForReview(req.user.id, id, body.declaration);
  }
}
