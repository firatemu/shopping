import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto, RefreshTokenDto, AuthResponseDto } from './dto/auth.dto';
import { UserRole, Prisma } from '@prisma/client';
import { resolvedJwtAccessExpiry } from './jwt-expiry.util';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly MAX_FAILED_ATTEMPTS = 5;
    private readonly LOCKOUT_MINUTES = 15;
    private readonly ACCESS_TOKEN_EXPIRY: string;
    private readonly REFRESH_TOKEN_DAYS = 30;

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) {
        this.ACCESS_TOKEN_EXPIRY = resolvedJwtAccessExpiry(this.config.get<string>('JWT_ACCESS_EXPIRY'));
    }

    /**
     * Authenticate user with brute-force protection.
     * 5 failed attempts → 15-minute lockout (Rule: Architecture Sprint 3)
     */
    async login(dto: LoginDto): Promise<AuthResponseDto> {
        const scopedTenantId = await this.resolveLoginTenantScope(dto.tenantId);

        const where: Prisma.UserWhereInput = {
            isDeleted: false,
            OR: [{ email: dto.identifier }, { username: dto.identifier }],
        };
        if (scopedTenantId) {
            where.tenantId = scopedTenantId;
        }

        const user = await this.prisma.user.findFirst({ where });

        if (!user) {
            throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre');
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingMinutes = Math.ceil(
                (user.lockedUntil.getTime() - Date.now()) / 60000,
            );
            this.logger.warn(
                `[tenantId=${scopedTenantId ?? 'any'}] Account locked: userId=${user.id} — ${remainingMinutes} min remaining`,
            );
            throw new UnauthorizedException(
                `Hesabınız kilitlendi. ${remainingMinutes} dakika sonra tekrar deneyin.`,
            );
        }

        // Verify password (invalid hash must not become 500)
        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        } catch {
            throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre');
        }

        if (!isPasswordValid) {
            // Increment failed attempts
            const newFailedAttempts = user.failedAttempts + 1;
            const updateData: any = { failedAttempts: newFailedAttempts };

            if (newFailedAttempts >= this.MAX_FAILED_ATTEMPTS) {
                updateData.lockedUntil = new Date(
                    Date.now() + this.LOCKOUT_MINUTES * 60 * 1000,
                );
                this.logger.warn(
                    `[tenantId=${scopedTenantId ?? 'any'}] Account locked after ${this.MAX_FAILED_ATTEMPTS} failed attempts: userId=${user.id}`,
                );
            }

            await this.prisma.user.update({
                where: { id: user.id },
                data: updateData,
            });

            throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre');
        }

        // Reset failed attempts on successful login
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
            },
        });

        // Generate tokens
        return this.generateTokens(user);
    }

    /** When body has no tenantId, optionally scope by DEFAULT_LOGIN_TENANT_CODE (e.g. DEM from seed). */
    private async resolveLoginTenantScope(tenantIdFromDto?: string): Promise<string | undefined> {
        const trimmed = tenantIdFromDto?.trim();
        if (trimmed) {
            return trimmed;
        }
        const code = this.config.get<string>('DEFAULT_LOGIN_TENANT_CODE')?.trim();
        if (!code) {
            return undefined;
        }
        const tenant = await this.prisma.tenant.findFirst({
            where: { code, isActive: true },
        });
        return tenant?.id;
    }

    /**
     * Register a new user within a tenant.
     */
    async register(dto: RegisterDto, tenantId: string): Promise<AuthResponseDto> {
        // Check if email or username already exists in tenant
        const existingUser = await this.prisma.user.findFirst({
            where: {
                tenantId,
                isDeleted: false,
                OR: [
                    { email: dto.email },
                    { username: dto.username },
                ],
            },
        });

        if (existingUser) {
            throw new ConflictException(
                existingUser.email === dto.email
                    ? 'Bu e-posta adresi zaten kullanılıyor'
                    : 'Bu kullanıcı adı zaten kullanılıyor',
            );
        }

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const user = await this.prisma.user.create({
            data: {
                tenantId,
                email: dto.email,
                username: dto.username,
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: UserRole.SALES_STAFF, // Default role
            },
        });

        this.logger.log(
            `[tenantId=${tenantId}] New user registered: userId=${user.id} role=${user.role}`,
        );

        return this.generateTokens(user);
    }

    /**
     * Refresh access token using opaque refresh token.
     * Rotates refresh token on every use (security best practice).
     */
    async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
        // Find refresh token in database
        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { token: dto.refreshToken },
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            if (storedToken) {
                // Delete expired token
                await this.prisma.refreshToken.delete({
                    where: { id: storedToken.id },
                });
            }
            throw new UnauthorizedException('Refresh token geçersiz veya süresi dolmuş');
        }

        // Find the user
        const user = await this.prisma.user.findFirst({
            where: {
                id: storedToken.userId,
                tenantId: storedToken.tenantId,
                isDeleted: false,
                isActive: true,
            },
        });

        if (!user) {
            await this.prisma.refreshToken.delete({
                where: { id: storedToken.id },
            });
            throw new UnauthorizedException('Kullanıcı bulunamadı');
        }

        // Delete old refresh token (rotation)
        await this.prisma.refreshToken.delete({
            where: { id: storedToken.id },
        });

        return this.generateTokens(user);
    }

    /**
     * Logout — delete all refresh tokens for the user.
     */
    async logout(userId: string, tenantId: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({
            where: { userId, tenantId },
        });
        this.logger.log(`[tenantId=${tenantId}] User logged out: userId=${userId}`);
    }

    /**
     * Generate JWT access token + opaque refresh token.
     */
    private async generateTokens(user: {
        id: string;
        tenantId: string;
        email: string;
        username: string;
        firstName: string;
        lastName: string;
        role: UserRole;
    }): Promise<AuthResponseDto> {
        const payload = {
            sub: user.id,
            tenantId: user.tenantId,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.ACCESS_TOKEN_EXPIRY,
        });

        // Generate opaque refresh token
        const refreshToken = uuidv4();
        const expiresAt = new Date(
            Date.now() + this.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        );

        // Store refresh token in database
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tenantId: user.tenantId,
                token: refreshToken,
                expiresAt,
            },
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: 900, // 15 minutes in seconds
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                tenantId: user.tenantId,
            },
        };
    }
}
