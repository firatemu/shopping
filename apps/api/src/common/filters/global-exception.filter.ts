import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaClientInitializationError } from '@prisma/client/runtime/library';

/**
 * Global exception filter — catches all unhandled exceptions.
 * Prod: never returns raw DB internals. Dev (NODE_ENV≠production): clearer Prisma/error text for debugging.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isDev = process.env.NODE_ENV !== 'production';

    const tenantId = (request as any).tenantId ?? 'unknown';
    const userId = (request as any).user?.id ?? 'anonymous';

    let status: number;
    let message: string;
    let error: string;
    let devDetails: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) ?? exception.message;
        error = (resp.error as string) ?? exception.name;
      }
    } else if (exception instanceof PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = isDev ? `Veritabanı kullanılamıyor: ${exception.message}` : 'Service unavailable';
      error = 'ServiceUnavailable';

      this.logger.error(
        `[tenantId=${tenantId}] [userId=${userId}] Prisma init / DB unreachable: ${exception.message}`,
        exception.stack,
      );
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const schemaOutOfDate = exception.code === 'P2021' || exception.code === 'P2022';
      const schemaMessage =
        'Veritabanı şeması güncel değil. Yönetici: npm run db:migrate veya npx prisma migrate deploy çalıştırın.';

      if (schemaOutOfDate) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = isDev
          ? `${schemaMessage} (${exception.code}: ${exception.message})`
          : schemaMessage;
        error = 'ServiceUnavailable';
        if (isDev) {
          devDetails = { prismaCode: exception.code, prismaMeta: exception.meta };
        }
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = isDev
          ? `Prisma ${exception.code}: ${exception.message}`
          : 'Internal server error';
        error = 'InternalServerError';
        if (isDev) {
          devDetails = { prismaCode: exception.code, prismaMeta: exception.meta };
        }
      }

      this.logger.error(
        `[tenantId=${tenantId}] [userId=${userId}] Prisma ${exception.code}: ${exception.message} — meta=${JSON.stringify(exception.meta)}`,
        exception.stack,
      );
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = isDev ? exception.message : 'Internal server error';
      error = 'InternalServerError';

      this.logger.error(
        `[tenantId=${tenantId}] [userId=${userId}] Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'UnknownError';
    }

    if (status < 500) {
      this.logger.warn(
        `[tenantId=${tenantId}] [userId=${userId}] ${status} ${error}: ${message} — ${request.method} ${request.url}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(isDev && devDetails ? { devDetails } : {}),
    });
  }
}
