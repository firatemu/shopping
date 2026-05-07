import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExportModule } from '../../common/export.module';
import { BankAccountController } from './bank-account.controller';
import { PartnerFinanceController } from './partner-finance.controller';
import { BankAccountService } from './bank-account.service';
import { PartnerFinanceService } from './partner-finance.service';

@Module({
  imports: [PrismaModule, ExportModule],
  controllers: [BankAccountController, PartnerFinanceController],
  providers: [BankAccountService, PartnerFinanceService],
  exports: [BankAccountService, PartnerFinanceService],
})
export class PartnerFinanceModule {}
