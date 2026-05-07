import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Body for POST /cash-register/open */
export class OpenCashRegisterDto {
  @IsNumber()
  @Min(0)
  openingBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/** Body for POST /cash-register/:id/close */
export class CloseCashRegisterDto {
  @IsNumber()
  @Min(0)
  physicalCount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export enum CashMovementTypeEnum {
  IN = 'IN',
  OUT = 'OUT',
}

/** Body for POST /cash-register/:id/movement */
export class CashMovementDto {
  @IsEnum(CashMovementTypeEnum)
  type: CashMovementTypeEnum;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;
}
