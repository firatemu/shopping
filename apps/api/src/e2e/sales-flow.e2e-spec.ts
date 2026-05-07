/**
 * E2E Test: Full Sales Flow
 * Tests the complete lifecycle: create product → add stock → checkout → return
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('Sales Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Seed a test tenant and user
    const tenant = await prisma.tenant.create({
      data: {
        name: 'E2E Test Store',
        code: 'E2E',
        settings: { currency: 'TRY', defaultKdvRate: 20 },
      },
    });
    tenantId = tenant.id;

    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('Test1234!', 12);
    await prisma.user.create({
      data: {
        tenantId,
        email: 'e2e@test.com',
        username: 'e2eadmin',
        firstName: 'E2E',
        lastName: 'Admin',
        role: 'TENANT_ADMIN',
        passwordHash: hash,
      },
    });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'e2eadmin', password: 'Test1234!' });
    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.tenant.deleteMany({ where: { code: 'E2E' } });
    await app.close();
  });

  describe('Complete sales cycle', () => {
    let productId: string;
    let variantId: string;
    let orderId: string;

    it('1. should create a product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          name: 'E2E Test Tişört',
          brand: 'TestBrand',
          category: 'Üst Giyim',
          subcategory: 'Tişört',
          gender: 'Unisex',
          costPrice: 50,
          salePrice: 100,
          kdvRate: 20,
        })
        .expect(201);

      productId = res.body.id;
      expect(productId).toBeDefined();
    });

    it('2. should create a variant with stock', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/products/${productId}/variants`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({ color: 'Siyah', colorCode: 'SYH', size: 'M', sizeCode: '0M', stockQuantity: 50 })
        .expect(201);

      variantId = res.body.id;
      expect(res.body.stockQuantity).toBe(50);
    });

    it('3. should create an order (checkout)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sales/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          items: [{ variantId, quantity: 2, unitPrice: 100 }],
          payments: [{ method: 'CASH', amount: 200 }],
        })
        .expect(201);

      orderId = res.body.id;
      expect(res.body.orderNumber).toBeDefined();
      expect(res.body.totalAmount).toBe(200);
    });

    it('4. should verify stock decreased', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}/variants`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      const variant = res.body.find((v: any) => v.id === variantId);
      expect(variant.stockQuantity).toBe(48); // 50 - 2
    });

    it('5. should process partial return', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/sales/${orderId}/return`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .send({ items: [{ variantId, quantity: 1, reason: 'Beden uyumsuzluğu' }] })
        .expect(201);

      expect(res.body.returnedItems).toBe(1);
    });

    it('6. should verify stock restored after return', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}/variants`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      const variant = res.body.find((v: any) => v.id === variantId);
      expect(variant.stockQuantity).toBe(49); // 48 + 1
    });
  });
});
