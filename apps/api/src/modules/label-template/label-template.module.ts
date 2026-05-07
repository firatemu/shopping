import { Module } from '@nestjs/common';
import { LabelTemplateController } from './label-template.controller';
import { LabelTemplateService } from './label-template.service';

@Module({
  controllers: [LabelTemplateController],
  providers: [LabelTemplateService],
})
export class LabelTemplateModule {}
