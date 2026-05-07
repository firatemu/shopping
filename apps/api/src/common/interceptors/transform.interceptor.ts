import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Transform all API responses into a consistent envelope format:
 * { success: true, data: {...}, timestamp: "..." }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  { success: boolean; data: T; timestamp: string }
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<{ success: boolean; data: T; timestamp: string }> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
