import { Module } from "@nestjs/common";
import { ReaderService } from "./reader.service";
import { ReaderController } from "./reader.controller";

@Module({
  controllers: [ReaderController],
  providers: [ReaderService],
})
export class ReaderModule {}
