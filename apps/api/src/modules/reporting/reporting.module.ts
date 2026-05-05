import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { ExportService } from '../../common/services/export.service';

@Module({
    controllers: [ReportingController],
    providers: [ReportingService, ExportService],
    exports: [ReportingService, ExportService],
})
export class ReportingModule { }
