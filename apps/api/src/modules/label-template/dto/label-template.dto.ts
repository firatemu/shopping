import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLabelTemplateDto {
  @ApiProperty({ example: '100x60 Ürün Etiketi' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Raf ve ürün barkod etiketi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(10)
  @Max(300)
  widthMm: number;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(10)
  @Max(300)
  heightMm: number;

  @ApiProperty({ description: 'Label Designer JSON state' })
  @IsObject()
  design: Record<string, unknown>;

  @ApiProperty({ description: 'Generated ZPL template' })
  @IsNotEmpty()
  @IsString()
  zpl: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLabelTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  widthMm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  heightMm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  design?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zpl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
