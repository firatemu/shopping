import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEmail,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CustomerTypeEnum {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  BOTH = 'BOTH',
}

export class CreateCustomerDto {
  @ApiPropertyOptional({ description: 'Cari kodu (boşsa sistem üretir)', example: 'ABC-C000001' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ enum: CustomerTypeEnum, default: CustomerTypeEnum.CUSTOMER })
  @IsOptional()
  @IsEnum(CustomerTypeEnum)
  type?: CustomerTypeEnum;

  @ApiProperty({ example: 'Ahmet' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Yılmaz' })
  @IsOptional()
  @IsString()
  surname?: string;

  @ApiPropertyOptional({ example: 'Yılmaz Tekstil Ltd.' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'Kadıköy VD' })
  @IsOptional()
  @IsString()
  taxOffice?: string;

  @ApiPropertyOptional({ example: '+905551234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'ahmet@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'İstanbul' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Kadıköy' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 5000, description: 'Credit limit (TRY)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ example: 30, description: 'Varsayılan vade (gün)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDueDays?: number;

  @ApiPropertyOptional({ example: 0, description: 'Açılış bakiyesi (Borç +, Alacak -)' })
  @IsOptional()
  @IsNumber()
  openingBalance?: number;

  @ApiPropertyOptional({ example: 'TR00000000000000000000000000' })
  @IsOptional()
  @IsString()
  @MaxLength(34)
  iban?: string;

  @ApiPropertyOptional({ example: 'Ziraat Bankası' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional({ example: 'Türkiye' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ example: 'Caferağa Mah.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  neighborhood?: string;

  @ApiPropertyOptional({ example: '34710' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Ödeme/Tahsilat notları' })
  @IsOptional()
  @IsString()
  paymentNotes?: string;

  @ApiPropertyOptional({ enum: ['WARN', 'BLOCK'], default: 'WARN' })
  @IsOptional()
  @IsString()
  creditLimitAction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(CustomerTypeEnum) type?: CustomerTypeEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() surname?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxOffice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) defaultDueDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(34) iban?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) neighborhood?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() creditLimitAction?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export enum PaymentMethodEnum {
  CASH = 'PAYMENT_CASH',
  CARD = 'PAYMENT_CARD',
  TRANSFER = 'PAYMENT_TRANSFER',
  CHECK = 'PAYMENT_CHECK',
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @ApiProperty({ enum: PaymentMethodEnum })
  @IsEnum(PaymentMethodEnum)
  method: PaymentMethodEnum;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
