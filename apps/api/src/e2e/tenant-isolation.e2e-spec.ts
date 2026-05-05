/**
 * E2E Test: Tenant Isolation
 * Verifies that data from one tenant is never visible to another tenant.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('Tenant Isolation (E2E)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let tokenA: string;
    let tokenB: string;
    let tenantAId: string;
    let tenantBId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        prisma = app.get(PrismaService);
        const bcrypt = require('bcrypt');
        const hash = await bcrypt.hash('Test1234!', 12);

        // Create Tenant A
        const tenA = await prisma.tenant.create({
            data: { name: 'Tenant A', code: 'TNA', settings: {} },
        });
        tenantAId = tenA.id;
        await prisma.user.create({
            data: { tenantId: tenantAId, email: 'a@test.com', username: 'usera', firstName: 'A', lastName: 'User', role: 'TENANT_ADMIN', passwordHash: hash },
        });

        // Create Tenant B
        const tenB = await prisma.tenant.create({
            data: { name: 'Tenant B', code: 'TNB', settings: {} },
        });
        tenantBId = tenB.id;
        await prisma.user.create({
            data: { tenantId: tenantBId, email: 'b@test.com', username: 'userb', firstName: 'B', lastName: 'User', role: 'TENANT_ADMIN', passwordHash: hash },
        });

        // Login both
        const resA = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ username: 'usera', password: 'Test1234!' });
        tokenA = resA.body.accessToken;
        const resB = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ username: 'userb', password: 'Test1234!' });
        tokenB = resB.body.accessToken;
    });

    afterAll(async () => {
        await prisma.tenant.deleteMany({ where: { code: { in: ['TNA', 'TNB'] } } });
        await app.close();
    });

    it('Tenant A product should NOT be visible to Tenant B', async () => {
        // Create product as Tenant A
        const createRes = await request(app.getHttpServer())
            .post('/api/v1/products')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('x-tenant-id', tenantAId)
            .send({ name: 'Secret Product A', brand: 'BrandA', category: 'Test', costPrice: 10, salePrice: 20, kdvRate: 20 })
            .expect(201);

        const productAId = createRes.body.id;

        // Try to access from Tenant B
        const listRes = await request(app.getHttpServer())
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${tokenB}`)
            .set('x-tenant-id', tenantBId)
            .expect(200);

        const found = listRes.body.data?.find((p: any) => p.id === productAId);
        expect(found).toBeUndefined();
    });

    it('Tenant B customer should NOT be visible to Tenant A', async () => {
        // Create customer as Tenant B
        await request(app.getHttpServer())
            .post('/api/v1/customers')
            .set('Authorization', `Bearer ${tokenB}`)
            .set('x-tenant-id', tenantBId)
            .send({ name: 'BCustomer', surname: 'Secret' })
            .expect(201);

        // Try to list from Tenant A
        const listRes = await request(app.getHttpServer())
            .get('/api/v1/customers')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('x-tenant-id', tenantAId)
            .expect(200);

        const found = listRes.body.data?.find((c: any) => c.name === 'BCustomer');
        expect(found).toBeUndefined();
    });

    it('Direct ID access across tenants should return 404', async () => {
        // Create branch as Tenant A
        const branchRes = await request(app.getHttpServer())
            .post('/api/v1/branches')
            .set('Authorization', `Bearer ${tokenA}`)
            .set('x-tenant-id', tenantAId)
            .send({ name: 'A Branch', code: 'ABR' })
            .expect(201);

        // Try to access from Tenant B by ID
        await request(app.getHttpServer())
            .get(`/api/v1/branches/${branchRes.body.id}`)
            .set('Authorization', `Bearer ${tokenB}`)
            .set('x-tenant-id', tenantBId)
            .expect(404);
    });
});
