import { Global, Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { GoogleAuthController } from "./google.controller";
import { SessionMiddleware } from "./session.middleware";

@Global()
@Module({
  controllers: [AuthController, GoogleAuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes("*");
  }
}
