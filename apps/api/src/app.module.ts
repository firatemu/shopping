import {
    Module,
    NestModule,
    MiddlewareConsumer,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { WorkerModule } from './common/workers/worker.module';
import { configValidationSchema } from './config/config.validation';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: configValidationSchema,
            validationOptions: { abortEarly: true },
            envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
        }),
        ThrottlerModule.forRoot([
            { name: 'short', ttl: 1000, limit: 200 },
            { name: 'medium', ttl: 60000, limit: 1000 },
        ]),
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
        WorkerModule,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(TenantContextMiddleware).forRoutes('*');
    }
}
