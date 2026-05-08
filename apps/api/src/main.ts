// Instrumentation must be first to capture all startup errors
import './instrumentation';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { TracingInterceptor } from './common/interceptors/tracing.interceptor';
import { GlobalResponseInterceptor } from './common/interceptors/global-response.interceptor';
import { PrismaService } from './prisma/prisma.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()) ?? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global interceptors
  const prismaService = app.get(PrismaService);
  app.useGlobalInterceptors(
    new TracingInterceptor(),
    new AuditInterceptor(prismaService),
    new GlobalResponseInterceptor(),
  );

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('SoftShopping API')
    .setDescription('Multi-tenant SaaS POS API for clothing retail stores')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header' }, 'tenant-id')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdown
  app.enableShutdownHooks();
  const shutdownTimeout = 30_000;

  process.on('SIGTERM', () => {
    logger.log(`SIGTERM received — shutting down gracefully (${shutdownTimeout / 1000}s timeout)`);
    setTimeout(() => {
      logger.error('Forced shutdown — timeout exceeded');
      process.exit(1);
    }, shutdownTimeout);
  });

  process.on('SIGINT', () => {
    logger.log('SIGINT received — shutting down gracefully');
  });

  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);

  logger.log(`🚀 SoftShopping API listening on http://${host}:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
