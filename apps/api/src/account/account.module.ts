import { Module } from "@nestjs/common";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { AuthorOnboardingController } from "./author-onboarding.controller";

@Module({
  controllers: [AccountController, AuthorOnboardingController],
  providers: [AccountService],
})
export class AccountModule {}
