import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Global interceptor that automatically logs all mutating requests
 * (POST, PUT, PATCH, DELETE) to the AuditLog table.
 *
 * Extracts tenantId and userId from the request context (set by TenantGuard + JWT).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutating operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const tenantId = request.headers['x-tenant-id'];
    const userId = request.user?.id;
    const path = request.route?.path ?? request.url;
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const duration = Date.now() - startTime;
          const entityId = responseBody?.id ?? request.params?.id ?? null;

          if (tenantId && userId) {
            this.prisma.auditLog
              .create({
                data: {
                  tenantId,
                  userId,
                  entityType: controllerName.replace('Controller', ''),
                  entityId: entityId ?? '00000000-0000-0000-0000-000000000000',
                  action: `${method} ${handlerName}`,
                  newValue: {
                    path,
                    method,
                    duration: `${duration}ms`,
                    body: this.sanitizeBody(request.body),
                  },
                },
              })
              .catch((err: Error) => {
                this.logger.warn(`Audit log failed: ${err.message}`);
              });
          }
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          if (tenantId && userId) {
            this.prisma.auditLog
              .create({
                data: {
                  tenantId,
                  userId,
                  entityType: controllerName.replace('Controller', ''),
                  entityId: request.params?.id ?? '00000000-0000-0000-0000-000000000000',
                  action: `${method} ${handlerName} [ERROR]`,
                  newValue: {
                    path,
                    method,
                    duration: `${duration}ms`,
                    error: err.message,
                    statusCode: err.status ?? 500,
                  },
                },
              })
              .catch((logErr: Error) => {
                this.logger.warn(`Audit error log failed: ${logErr.message}`);
              });
          }
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    const sanitized = { ...body };
    // Never log passwords or tokens
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'apiKey'];
    for (const key of sensitiveKeys) {
      if (sanitized[key]) sanitized[key] = '[REDACTED]';
    }
    return sanitized;
  }
}
