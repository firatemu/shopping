import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
    IsOptional,
    ValidateIf,
    IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'admin@demo.com', description: 'Email or username' })
    @IsNotEmpty()
    @IsString()
    identifier: string;

    @ApiProperty({ example: 'Demo1234!', description: 'Password' })
    @IsNotEmpty()
    @IsString()
    password: string;

    @ApiPropertyOptional({
        description: 'Tenant UUID; optional. If omitted, set DEFAULT_LOGIN_TENANT_CODE on the API (e.g. DEM) for single-tenant login.',
        format: 'uuid',
    })
    @IsOptional()
    @ValidateIf((_o, v) => v != null && `${v}`.trim() !== '')
    @IsUUID('4')
    tenantId?: string;
}

export class RegisterDto {
    @ApiProperty({ example: 'user@store.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'johndoe' })
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    username: string;

    @ApiProperty({ example: 'SecurePass123!' })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ example: 'John' })
    @IsNotEmpty()
    @IsString()
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsNotEmpty()
    @IsString()
    lastName: string;
}

export class RefreshTokenDto {
    @ApiProperty({ description: 'Refresh token' })
    @IsNotEmpty()
    @IsString()
    refreshToken: string;
}

export class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
        id: string;
        email: string;
        username: string;
        firstName: string;
        lastName: string;
        role: string;
        tenantId: string;
    };
}
