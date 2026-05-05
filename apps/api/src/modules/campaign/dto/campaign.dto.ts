import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsNumber,
    IsEnum,
    IsDateString,
    IsBoolean,
    IsArray,
    Min,
    Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CampaignType {
    PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
    FIXED_DISCOUNT = 'FIXED_DISCOUNT',
    BUY_X_GET_Y = 'BUY_X_GET_Y',
    SECOND_ITEM_PERCENT = 'SECOND_ITEM_PERCENT',
    FREE_GIFT = 'FREE_GIFT',
}

export class CreateCampaignDto {
    @ApiProperty({ example: 'Yaz İndirimi %20' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: CampaignType })
    @IsEnum(CampaignType)
    type: CampaignType;

    @ApiPropertyOptional({ example: 20, description: 'Discount percentage (0-100)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    discountPercent?: number;

    @ApiPropertyOptional({ example: 50, description: 'Fixed discount amount' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountAmount?: number;

    @ApiPropertyOptional({ example: 3, description: 'Buy X items' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    buyQuantity?: number;

    @ApiPropertyOptional({ example: 1, description: 'Get Y items free' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    getQuantity?: number;

    @ApiPropertyOptional({ example: 100, description: 'Minimum order amount' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minOrderAmount?: number;

    @ApiPropertyOptional({ description: 'Apply to specific categories', type: [String] })
    @IsOptional()
    @IsArray()
    categories?: string[];

    @ApiPropertyOptional({ description: 'Apply to specific brands', type: [String] })
    @IsOptional()
    @IsArray()
    brands?: string[];

    @ApiProperty({ example: '2026-06-01' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2026-08-31' })
    @IsDateString()
    endDate: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateCampaignDto {
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
    @IsNumber()
    @Min(0)
    @Max(100)
    discountPercent?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountAmount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    minOrderAmount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class CreateGiftVoucherDto {
    @ApiProperty({ example: 100, description: 'Voucher value' })
    @IsNumber()
    @Min(1)
    amount: number;

    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}
