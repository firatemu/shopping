import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsDateString,
  IsIn,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** API değerleri; POS_SETTLEMENT DB'de CHECKING + colorTag (pos_settlement) olarak saklanır — Postgres enum'u POS_SETTLEMENT içermese de çalışır. */
export const BANK_ACCOUNT_KIND_VALUES = ['CHECKING', 'POS_SETTLEMENT', 'CREDIT_CARD'] as const;
export type BankAccountKindInput = (typeof BANK_ACCOUNT_KIND_VALUES)[number];
const KIND_VALIDATION_MESSAGE = `kind şunlardan biri olmalıdır: ${BANK_ACCOUNT_KIND_VALUES.join(', ')}`;

export class CreateBankAccountDto {
  @ApiProperty({ example: 'Ana TL Hesabı' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'Ziraat Bankası' })
  @IsString()
  @MaxLength(120)
  bankName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  accountNumber?: string;

  @ApiPropertyOptional({ default: 'TRY' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: [...BANK_ACCOUNT_KIND_VALUES] })
  @IsOptional()
  @IsIn([...BANK_ACCOUNT_KIND_VALUES], { message: KIND_VALIDATION_MESSAGE })
  kind?: BankAccountKindInput;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  openingBalanceAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  colorTag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  labelIcon?: string;
}

export class UpdateBankAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: [...BANK_ACCOUNT_KIND_VALUES] })
  @IsOptional()
  @IsIn([...BANK_ACCOUNT_KIND_VALUES], { message: KIND_VALIDATION_MESSAGE })
  kind?: BankAccountKindInput;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  colorTag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  labelIcon?: string;
}

export const BANK_ACCOUNT_PURPOSE_VALUES = [
  'bank_transfer',
  'card_collection',
  'card_payment',
] as const;

export class ListBankAccountsQueryDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: BANK_ACCOUNT_PURPOSE_VALUES,
    description:
      'bank_transfer: vadesiz, card_collection: POS mutabakat, card_payment: firma kredi kartı',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  @IsIn([...BANK_ACCOUNT_PURPOSE_VALUES])
  purpose?: (typeof BANK_ACCOUNT_PURPOSE_VALUES)[number];
}
