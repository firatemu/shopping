import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { StorageService } from '../storage/storage.service';

type UploadCallback = (error: Error | null, acceptFile: boolean) => void;
type UploadedMulterFile = {
  filename: string;
  mimetype: string;
  originalname: string;
  buffer?: Buffer;
};

@ApiTags('Products — Images')
@Controller('products/images')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class ProductImageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload product image (returns public URL)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req: unknown, file: UploadedMulterFile, cb: UploadCallback) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Sadece görsel dosyalar yüklenebilir'), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file?: UploadedMulterFile, @TenantId() tenantId?: string) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');

    const safeExt = extname(file.originalname || '').slice(0, 10) || '.bin';
    const key = `${tenantId}/products/${randomUUID()}${safeExt}`;

    const url = await this.storageService.upload(file.buffer!, key, file.mimetype);
    return { path: url };
  }
}
