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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';

type UploadCallback = (error: Error | null, acceptFile: boolean) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type UploadedMulterFile = {
    filename: string;
    mimetype: string;
    originalname: string;
};

@ApiTags('Products — Images')
@Controller('products/images')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class ProductImageController {
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
            storage: diskStorage({
                destination: 'uploads/products',
                filename: (_req: unknown, file: UploadedMulterFile, cb: FilenameCallback) => {
                    const safeExt = extname(file.originalname || '').slice(0, 10) || '.bin';
                    cb(null, `${randomUUID()}${safeExt}`);
                },
            }),
        }),
    )
    upload(@UploadedFile() file?: UploadedMulterFile) {
        if (!file) throw new BadRequestException('Dosya bulunamadı');
        return { path: `/uploads/products/${file.filename}` };
    }
}

