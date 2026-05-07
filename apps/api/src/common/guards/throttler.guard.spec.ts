import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantAwareThrottlerGuard } from './throttler.guard';
import { THROTTLE_PROFILE_KEY } from '../decorators/throttle.decorator';

describe('TenantAwareThrottlerGuard', () => {
  let guard: TenantAwareThrottlerGuard;

  const mockRes = () => ({ setHeader: jest.fn() });

  const makeContext = (tenantId = 'tenant-123', ip = '10.0.0.1', profile?: string) => {
    jest.spyOn(Reflector.prototype, 'get').mockImplementation((key: unknown) => {
      if (key === THROTTLE_PROFILE_KEY) return profile;
      return undefined;
    });
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          'x-tenant-id': tenantId,
          ip,
          headers: { 'x-forwarded-for': ip },
        }),
        getResponse: () => mockRes(),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantAwareThrottlerGuard, Reflector],
    }).compile();
    guard = module.get(TenantAwareThrottlerGuard);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows request when under limit', async () => {
    const result = await guard.canActivate(makeContext());
    expect(result).toBe(true);
  });

  it('blocks and throws 429 when limit exceeded', async () => {
    for (let i = 0; i < 200; i++) {
      await guard.canActivate(makeContext('tenant-abc', '1.1.1.1', 'DEFAULT'));
    }
    await expect(
      guard.canActivate(makeContext('tenant-abc', '1.1.1.1', 'DEFAULT')),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('applies AUTH profile (10 req / 15min)', async () => {
    for (let i = 0; i < 10; i++) {
      await guard.canActivate(makeContext('t1', '1.1.1.1', 'AUTH'));
    }
    await expect(guard.canActivate(makeContext('t1', '1.1.1.1', 'AUTH'))).rejects.toMatchObject({
      status: 429,
    });
  });

  it('applies BARCODE profile (300 req / min)', async () => {
    for (let i = 0; i < 300; i++) {
      const result = await guard.canActivate(makeContext('t1', '1.1.1.1', 'BARCODE'));
      expect(result).toBe(true);
    }
    await expect(guard.canActivate(makeContext('t1', '1.1.1.1', 'BARCODE'))).rejects.toMatchObject({
      status: 429,
    });
  });

  it('uses tenant:ip as the rate limit tracker key — separate tenants share IP but not counter', async () => {
    await guard.canActivate(makeContext('tenant-xyz', '192.168.0.99'));
    const result = await guard.canActivate(makeContext('tenant-other', '192.168.0.99'));
    expect(result).toBe(true);
  });

  it('falls back to DEFAULT when no decorator present', async () => {
    for (let i = 0; i < 200; i++) {
      await guard.canActivate(makeContext('t1', '1.1.1.1'));
    }
    await expect(guard.canActivate(makeContext('t1', '1.1.1.1'))).rejects.toMatchObject({
      status: 429,
    });
  });

  it('sets X-RateLimit headers on every request', async () => {
    const res = mockRes();
    const reqCtx = {
      switchToHttp: () => ({
        getRequest: () => ({ 'x-tenant-id': 't1', ip: '1.1.1.1', headers: {} }),
        getResponse: () => res,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
    await guard.canActivate(reqCtx);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '200');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
  });

  it('sets Retry-After header when rate limited', async () => {
    const res = mockRes();
    const reqCtx = {
      switchToHttp: () => ({
        getRequest: () => ({ 'x-tenant-id': 't2', ip: '2.2.2.2', headers: {} }),
        getResponse: () => res,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
    for (let i = 0; i < 200; i++) await guard.canActivate(makeContext('t2', '2.2.2.2', 'DEFAULT'));
    await expect(guard.canActivate(reqCtx)).rejects.toThrow(HttpException);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });
});
