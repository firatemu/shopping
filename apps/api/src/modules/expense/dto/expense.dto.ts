import {
  IsUUID,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  Max,
  MaxLength,
} from 'class-validator';
import { ExpenseType } from '@prisma/client';

export class CreateExpenseCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsEnum(ExpenseType)
  kind: ExpenseType;
}

export class CreateExpenseDto {
  @IsEnum(ExpenseType)
  type: ExpenseType;

  @IsUUID('4')
  categoryId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  recurringDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}
