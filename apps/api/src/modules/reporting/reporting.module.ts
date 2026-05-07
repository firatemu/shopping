import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { ExportModule } from '../../common/export.module';

@Module({
  imports: [ExportModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService, ExportModule],
})
export class ReportingModule {}
