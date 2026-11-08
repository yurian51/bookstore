import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { PricingService } from "./pricing.service";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService, PricingService],
  exports: [OrdersService, PricingService],
})
export class OrdersModule {}
