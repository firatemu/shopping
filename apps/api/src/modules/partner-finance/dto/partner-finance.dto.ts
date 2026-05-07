import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsEnum,
  Min,
  IsObject,
  IsDateString,
} from 'class-validator';
import { PartnerFinanceKind } from '@prisma/client';

export class CreatePartnerFinanceOperationDto {
  @ApiProperty({ enum: PartnerFinanceKind })
  @IsEnum(PartnerFinanceKind)
  kind: PartnerFinanceKind;

  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: 1500.5 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: '2026-05-06' })
  @IsDateString()
  operationDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Nakit tahsilat/ödeme için açık kasa oturumu' })
  @IsOptional()
  @IsUUID()
  cashRegisterSessionId?: string;

  @ApiPropertyOptional({
    description:
      'Havale/EFT: vadesiz banka; kart tahsilat: POS mutabakat; firma kartı ödemesi: firma kredi kartı hesabı',
  })
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @ApiPropertyOptional({
    description: 'Ek alanlar (taksit, POS, çek no, vade tarihi, IBAN vb.)',
    example: { checkNumber: '123', dueDate: '2026-12-01' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdatePartnerFinanceOperationDto {
  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  operationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
