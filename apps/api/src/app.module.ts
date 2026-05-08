import { Module, NestModule, MiddlewareConsumer, Provider } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductModule } from './modules/product/product.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { ReceiptModule } from './modules/receipt/receipt.module';
import { CustomerModule } from './modules/customer/customer.module';
import { CashRegisterModule } from './modules/cash-register/cash-register.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { StaffPerformanceModule } from './modules/staff-performance/staff-performance.module';
import { NotificationModule } from './modules/notification/notification.module';
import { BranchModule } from './modules/branch/branch.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { GiftVoucherModule } from './modules/gift-voucher/gift-voucher.module';
import { LabelTemplateModule } from './modules/label-template/label-template.module';
import { PartnerFinanceModule } from './modules/partner-finance/partner-finance.module';
import { StorageModule } from './modules/storage/storage.module';
import { EventsModule as WebSocketModule } from './modules/events/events.module';
import { CacheModule } from './common/services/cache.module';
import { EventsModule as DomainEventsModule } from './common/events/events.module';
import { WorkerModule } from './common/workers/worker.module';
import { configValidationSchema } from './config/config.validation';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { TenantAwareThrottlerGuard } from './common/guards/throttler.guard';

/**
 * Rate limit profiles:
 *  AUTH    — 10 req / 15 min   (login, register, refresh)
 *  BARCODE — 300 req / min     (barkod lookup, high frequency)
 *  REPORT  — 20 req / min      (heavy aggregation queries)
 *  BULK    — 30 req / min      (bulk operations)
 *  DEFAULT — 200 req / min     (general endpoints)
 */
const THROTTLER_PROFILES = [
  { name: 'auth', ttl: 900_000, limit: 10 },
  { name: 'barcode', ttl: 60_000, limit: 300 },
  { name: 'report', ttl: 60_000, limit: 20 },
  { name: 'bulk', ttl: 60_000, limit: 30 },
  { name: 'default', ttl: 60_000, limit: 200 },
];

const THROTTLER_GUARD: Provider = {
  provide: APP_GUARD,
  useClass: TenantAwareThrottlerGuard,
};

@Module({
  imports: [
    // Serve product images at /uploads/* (before global /api/v1 prefix)
    // uploads dir: /app/apps/api/uploads, cwd: /app
    ServeStaticModule.forRoot({
      rootPath: process.cwd() + '/apps/api/uploads',
      serveRoot: '/uploads',
      serveStaticOptions: { maxAge: '7d' },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      validationOptions: { abortEarly: true },
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
    ThrottlerModule.forRoot(THROTTLER_PROFILES),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD', ''),
        },
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ProductModule,
    InventoryModule,
    SalesModule,
    CampaignModule,
    ReceiptModule,
    CustomerModule,
    CashRegisterModule,
    ReportingModule,
    ExpenseModule,
    StaffPerformanceModule,
    NotificationModule,
    BranchModule,
    IntegrationModule,
    CatalogModule,
    GiftVoucherModule,
    LabelTemplateModule,
    PartnerFinanceModule,
    StorageModule,
    WebSocketModule,
    CacheModule,
    DomainEventsModule,
    WorkerModule,
  ],
  providers: [THROTTLER_GUARD],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
