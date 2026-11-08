import { Body, Controller, Get, Param, Post, Req, Delete } from "@nestjs/common";
import { reviewSchema } from "@gbs/shared";
import { ReviewsService } from "./reviews.service";
import { ZodValidationPipe } from "../common/zod.pipe";
import { RequireAuth } from "../common/auth.decorator";

@Controller()
@RequireAuth()
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Post("reviews")
  review(@Req() req: any, @Body(new ZodValidationPipe(reviewSchema)) body: any) {
    return this.reviews.upsert(req.user.id, body.bookId, body.rating, body.title, body.body);
  }

  @Get("wishlist")
  wishlist(@Req() req: any) {
    return this.reviews.wishlist(req.user.id);
  }

  @Post("wishlist/:bookId")
  add(@Req() req: any, @Param("bookId") bookId: string) {
    return this.reviews.toggleWishlist(req.user.id, bookId, true);
  }

  @Delete("wishlist/:bookId")
  remove(@Req() req: any, @Param("bookId") bookId: string) {
    return this.reviews.toggleWishlist(req.user.id, bookId, false);
  }
}
