import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res, Headers } from "@nestjs/common";
import { Request, Response } from "express";
import { progressSchema } from "@gbs/shared";
import { ReaderService } from "./reader.service";
import { ZodValidationPipe } from "../common/zod.pipe";
import { RequireAuth } from "../common/auth.decorator";
import * as fs from "fs";
import * as path from "path";
import { config } from "../config/config";

@Controller("reader")
export class ReaderController {
  constructor(private reader: ReaderService) {}

  @RequireAuth()
  @Get("library")
  library(@Req() req: any) {
    return this.reader.library(req.user.id);
  }

  @RequireAuth()
  @Post("formats/:formatId/delivery")
  delivery(@Req() req: any, @Param("formatId") formatId: string, @Headers("x-forwarded-for") ip?: string) {
    return this.reader.issueDeliveryUrl(req.user.id, formatId, ip);
  }

  /** Streams the private file. Not behind session auth: the signed token is the credential. */
  @Get("file")
  async file(@Query("t") token: string, @Res() res: Response) {
    const { filePath } = await this.reader.resolveDelivery(token ?? "");
    const absolute = path.resolve(config.storageDir, filePath);
    const root = path.resolve(config.storageDir);
    // Prevent path traversal even if a stored key is malformed.
    if (!absolute.startsWith(root + path.sep) || !fs.existsSync(absolute)) {
      return res.status(404).json({ message: "File not found" });
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "inline");
    fs.createReadStream(absolute).pipe(res);
  }

  @RequireAuth()
  @Get("formats/:formatId/sample")
  async sample(@Param("formatId") formatId: string, @Res() res: Response) {
    const { filePath } = await this.reader.sample(formatId);
    const absolute = path.resolve(config.storageDir, filePath);
    if (!absolute.startsWith(path.resolve(config.storageDir) + path.sep) || !fs.existsSync(absolute)) {
      return res.status(404).json({ message: "Sample not found" });
    }
    res.setHeader("Cache-Control", "private, no-store");
    fs.createReadStream(absolute).pipe(res);
  }

  @RequireAuth()
  @Put("progress")
  progress(@Req() req: any, @Body(new ZodValidationPipe(progressSchema)) body: any) {
    return this.reader.saveProgress(req.user.id, body.bookId, body.locator, body.percent);
  }

  @RequireAuth()
  @Get("books/:bookId/bookmarks")
  bookmarks(@Req() req: any, @Param("bookId") bookId: string) {
    return this.reader.listBookmarks(req.user.id, bookId);
  }

  @RequireAuth()
  @Post("books/:bookId/bookmarks")
  addBookmark(@Req() req: any, @Param("bookId") bookId: string, @Body() body: { locator: string; note?: string }) {
    return this.reader.addBookmark(req.user.id, bookId, body.locator, body.note);
  }

  @RequireAuth()
  @Delete("bookmarks/:id")
  removeBookmark(@Req() req: any, @Param("id") id: string) {
    return this.reader.removeBookmark(req.user.id, id);
  }
}
