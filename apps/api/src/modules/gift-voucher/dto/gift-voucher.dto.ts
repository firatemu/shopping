import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCorporateGiftVoucherDto {
  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Özel kod (yoksa otomatik üretilir)', example: 'HEDIYE2026' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ example: 'ACME A.Ş.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'ISO date — çekin son kullanma tarihi' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class LookupGiftVoucherQueryDto {
  @ApiProperty({ description: 'Hediye çeki numarası' })
  @IsNotEmpty()
  @IsString()
  code: string;
}
