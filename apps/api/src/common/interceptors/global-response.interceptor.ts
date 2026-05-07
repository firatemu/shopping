import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * GlobalResponseInterceptor — wraps all HTTP responses in a consistent envelope.
 *
 * - Normal responses:  { data: T, meta: { timestamp, requestId } }
 * - List responses with pagination meta: { data: T[], meta: { timestamp, pagination } }
 * - Errors: handled by GlobalExceptionFilter (not intercepted here)
 *
 * This ensures all clients (web, mobile, desktop) receive a predictable shape
 * regardless of the endpoint that served the response.
 */

@Injectable()
export class GlobalResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const request = context.switchToHttp().getRequest<any>();
    const requestId = request?.headers?.['x-request-id'] || undefined;

    const responseMeta = {
      timestamp: new Date().toISOString(),
      requestId,
    };

    return next.handle().pipe(
      map((payload) => {
        if (!payload || typeof payload !== 'object') {
          return { data: payload, meta: responseMeta };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = payload as Record<string, any>;

        // Already wrapped — pass through
        if (p.__alreadyWrapped__) return payload;

        // Paginated list response — merge pagination into meta
        if (
          Array.isArray(p.data) &&
          p.meta &&
          typeof p.meta === 'object' &&
          'pagination' in p.meta
        ) {
          return {
            data: p.data,
            meta: {
              ...responseMeta,
              pagination: p.meta.pagination,
            },
          };
        }

        return { data: payload, meta: responseMeta };
      }),
    );
  }
}
