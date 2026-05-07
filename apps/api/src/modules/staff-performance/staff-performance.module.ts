import { Module } from '@nestjs/common';
import { StaffPerformanceController } from './staff-performance.controller';
import { StaffPerformanceService } from './staff-performance.service';

@Module({
  controllers: [StaffPerformanceController],
  providers: [StaffPerformanceService],
  exports: [StaffPerformanceService],
})
export class StaffPerformanceModule {}
