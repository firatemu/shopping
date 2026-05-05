import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReceiptService } from './receipt.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';

@ApiTags('Receipts')
@Controller('receipts')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class ReceiptController {
    constructor(private readonly receiptService: ReceiptService) { }

    @Get(':orderId')
    @ApiOperation({ summary: 'Generate receipt for order (text + ESC/POS)' })
    async generateReceipt(
        @TenantId() tenantId: string,
        @Param('orderId') orderId: string,
    ) {
        return this.receiptService.generateReceipt(tenantId, orderId);
    }
}
