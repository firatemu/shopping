import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

interface HealthCheckResponse {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    uptime: number;
    version: string;
    services: {
        database: { status: string; latency?: number };
        redis: { status: string; latency?: number };
    };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get()
    @ApiOperation({ summary: 'System health check' })
    @ApiResponse({ status: 200, description: 'System is healthy' })
    @ApiResponse({ status: 503, description: 'System is unhealthy' })
    async check(): Promise<HealthCheckResponse> {
        return this.healthService.check();
    }
}
