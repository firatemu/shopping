import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsNumber,
    IsEnum,
    IsArray,
    ValidateNested,
    Min,
    Max,
    ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StockAdjustmentReason {
    MANUAL_COUNT = 'MANUAL_COUNT',
    DAMAGE = 'DAMAGE',
    THEFT = 'THEFT',
    RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
    NEW_SHIPMENT = 'NEW_SHIPMENT',
    CORRECTION = 'CORRECTION',
}

export class StockAdjustmentItemDto {
    @ApiProperty({ description: 'Product variant ID' })
    @IsNotEmpty()
    @IsString()
    variantId: string;

    @ApiProperty({ description: 'New stock quantity', example: 25 })
    @IsNumber()
    @Min(0)
    newQuantity: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string;
}

export class BulkStockAdjustmentDto {
    @ApiProperty({ type: [StockAdjustmentItemDto], description: 'Max 500 items' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StockAdjustmentItemDto)
    @ArrayMaxSize(500)
    items: StockAdjustmentItemDto[];

    @ApiProperty({ enum: StockAdjustmentReason })
    @IsEnum(StockAdjustmentReason)
    reason: StockAdjustmentReason;
}

export class StockReservationDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    variantId: string;

    @ApiProperty({ example: 2 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiPropertyOptional({ description: 'Reservation TTL in seconds (default: tenant setting)' })
    @IsOptional()
    @IsNumber()
    @Min(60)
    @Max(3600)
    ttlSeconds?: number;
}
