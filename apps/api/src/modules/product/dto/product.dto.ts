import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  IsUUID,
  ArrayNotEmpty,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiPropertyOptional({
    description: 'Manuel barkod (boşsa sistem üretir)',
    example: 'DEM000001SYH0M07',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  barcode?: string;

  @ApiProperty({ example: 'Siyah' })
  @IsNotEmpty()
  @IsString()
  color: string;

  @ApiProperty({ example: 'SYH' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(3)
  colorCode: string;

  @ApiProperty({ example: 'M' })
  @IsNotEmpty()
  @IsString()
  size: string;

  @ApiProperty({ example: 'MD' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2)
  sizeCode: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional({ example: 50.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 139.9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Basic Tişört' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'TextileBrand' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Üst Giyim' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Tişört' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ example: '2025 Yaz' })
  @IsOptional()
  @IsString()
  season?: string;

  @ApiPropertyOptional({ example: 'Unisex' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Tedarikçi kodu', example: 'SUP-123' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  supplierCode?: string;

  @ApiPropertyOptional({ description: 'Tedarikçi firma (Cari ID)' })
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @ApiProperty({ example: 45.0, description: 'Cost price (DECIMAL 12,2)' })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 129.9, description: 'Sale price (DECIMAL 12,2)' })
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiProperty({ example: 20, description: 'KDV rate: 0, 10, or 20' })
  @IsNumber()
  kdvRate: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  season?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  kdvRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkCreateVariantsDto {
  @ApiProperty({ description: 'Katalog renkleri (çoklu seçim)', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  colorIds: string[];

  @ApiProperty({ description: 'Beden seti ID' })
  @IsNotEmpty()
  @IsUUID('4')
  sizeSetId: string;

  @ApiPropertyOptional({
    description:
      'Beden etiketine göre stok. Eksik bedenler için varsayılan 1 kullanılır. Örn: {\"S\": 2, \"M\": 0}',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  stockBySize?: Record<string, number>;
}

export class BarcodeSearchDto {
  @ApiProperty({ example: 'DEM000001SYH0M07' })
  @IsNotEmpty()
  @IsString()
  barcode: string;
}
