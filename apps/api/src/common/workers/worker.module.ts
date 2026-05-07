import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduledTasksProcessor } from './scheduled-tasks.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'scheduled-tasks' })],
  providers: [ScheduledTasksProcessor],
  exports: [BullModule],
})
export class WorkerModule {}
