import { Module } from '@nestjs/common';
import { GiftVoucherController } from './gift-voucher.controller';
import { GiftVoucherService } from './gift-voucher.service';

@Module({
  controllers: [GiftVoucherController],
  providers: [GiftVoucherService],
  exports: [GiftVoucherService],
})
export class GiftVoucherModule {}
