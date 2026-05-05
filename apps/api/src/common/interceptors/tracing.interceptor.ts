import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * OpenTelemetry-style tracing interceptor.
 *
 * For production, replace with @opentelemetry/sdk-node + @opentelemetry/auto-instrumentations-node.
 * This provides structured trace logging compatible with OTLP format.
 *
 * Each request gets a traceId for distributed tracing across services.
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('Tracing');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const startTime = Date.now();

        // Generate trace ID (in production: use OpenTelemetry propagation)
        const traceId = request.headers['x-trace-id'] ?? this.generateTraceId();
        const spanId = this.generateSpanId();

        // Set trace headers on response
        response.setHeader('x-trace-id', traceId);
        response.setHeader('x-span-id', spanId);

        const tenantId = request.headers['x-tenant-id'] ?? 'unknown';
        const method = request.method;
        const url = request.url;
        const controller = context.getClass().name;
        const handler = context.getHandler().name;

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - startTime;
                    this.logger.log(
                        JSON.stringify({
                            traceId,
                            spanId,
                            tenantId,
                            method,
                            url,
                            controller,
                            handler,
                            statusCode: response.statusCode,
                            duration: `${duration}ms`,
                            timestamp: new Date().toISOString(),
                        }),
                    );
                },
                error: (err) => {
                    const duration = Date.now() - startTime;
                    this.logger.error(
                        JSON.stringify({
                            traceId,
                            spanId,
                            tenantId,
                            method,
                            url,
                            controller,
                            handler,
                            statusCode: err.status ?? 500,
                            error: err.message,
                            duration: `${duration}ms`,
                            timestamp: new Date().toISOString(),
                        }),
                    );
                },
            }),
        );
    }

    private generateTraceId(): string {
        return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }

    private generateSpanId(): string {
        return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
}
