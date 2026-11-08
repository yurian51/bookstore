import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CartModule } from "./cart/cart.module";
import { OrdersModule } from "./orders/orders.module";
import { ReaderModule } from "./reader/reader.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { AuthorsModule } from "./authors/authors.module";
import { AdminModule } from "./admin/admin.module";
import { AccountModule } from "./account/account.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    ReaderModule,
    ReviewsModule,
    AuthorsModule,
    AdminModule,
    AccountModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
