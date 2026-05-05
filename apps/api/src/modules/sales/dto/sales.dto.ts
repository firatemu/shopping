import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsNumber,
    IsEnum,
    IsArray,
    ValidateNested,
    Min,
    IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemDto {
    @ApiProperty({ description: 'Barcode or variant ID' })
    @IsNotEmpty()
    @IsString()
    barcode: string;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @Min(1)
    quantity: number;
}

export enum PaymentTypeEnum {
    CASH = 'CASH',
    CREDIT_CARD = 'CREDIT_CARD',
    BANK_TRANSFER = 'BANK_TRANSFER',
    OPEN_ACCOUNT = 'OPEN_ACCOUNT',
    GIFT_VOUCHER = 'GIFT_VOUCHER',
}

export class PaymentItemDto {
    @ApiProperty({ enum: PaymentTypeEnum })
    @IsEnum(PaymentTypeEnum)
    type: PaymentTypeEnum;

    @ApiProperty({ example: 129.90 })
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiPropertyOptional({ description: 'Card ref, transfer ref, voucher code' })
    @IsOptional()
    @IsString()
    reference?: string;
}

export class CreateOrderDto {
    @ApiProperty({ type: [CartItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CartItemDto)
    items: CartItemDto[];

    @ApiPropertyOptional({ description: 'Customer ID for open_account payments' })
    @IsOptional()
    @IsString()
    customerId?: string;

    @ApiProperty({ type: [PaymentItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PaymentItemDto)
    payments: PaymentItemDto[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class ReturnItemDto {
    @ApiProperty({ description: 'Order item ID' })
    @IsNotEmpty()
    @IsString()
    orderItemId: string;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reason?: string;
}

export class CreateReturnDto {
    @ApiProperty({ description: 'Original order ID' })
    @IsNotEmpty()
    @IsString()
    orderId: string;

    @ApiProperty({ type: [ReturnItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReturnItemDto)
    items: ReturnItemDto[];

    @ApiPropertyOptional({
        description: 'True ise iade tutarı kadar yeni hediye çeki oluşturulur',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    issueGiftVoucher?: boolean;
}
