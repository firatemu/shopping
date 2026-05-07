import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductImageController } from './product-image.controller';
import { ProductService } from './product.service';

@Module({
  controllers: [ProductController, ProductImageController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
