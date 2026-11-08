import { Body, Controller, Post, Req, BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { ZodValidationPipe } from "../common/zod.pipe";
import { RequireAuth } from "../common/auth.decorator";

const becomeAuthorSchema = z.object({
  displayName: z.string().min(2).max(120),
  bio: z.string().max(4000).optional(),
  country: z.string().length(2).optional(),
});

/** Any signed-in customer can apply to become an author. Verification happens in admin review. */
@Controller("account")
@RequireAuth()
export class AuthorOnboardingController {
  constructor(private prisma: PrismaService) {}

  @Post("become-author")
  async becomeAuthor(@Req() req: any, @Body(new ZodValidationPipe(becomeAuthorSchema)) body: z.infer<typeof becomeAuthorSchema>) {
    const existing = await this.prisma.authorProfile.findUnique({ where: { userId: req.user.id } });
    if (existing) throw new BadRequestException("You already have an author profile");

    await this.prisma.$transaction([
      this.prisma.authorProfile.create({
        data: { userId: req.user.id, displayName: body.displayName, bio: body.bio, country: body.country },
      }),
      this.prisma.userRole.upsert({
        where: { userId_role: { userId: req.user.id, role: "AUTHOR" } },
        update: {},
        create: { userId: req.user.id, role: "AUTHOR" },
      }),
    ]);
    return { ok: true };
  }
}
