import { Module } from '@nestjs/common';
import { ProductCategoryController } from './product-category.controller';
import { ProductCategoryService } from './product-category.service';
import { ProductBrandController } from './product-brand.controller';
import { ProductBrandService } from './product-brand.service';
import { ProductColorController } from './product-color.controller';
import { ProductColorService } from './product-color.service';
import { CatalogSizeSetController } from './catalog-size-set.controller';
import { CatalogSizeSetService } from './catalog-size-set.service';

@Module({
  controllers: [
    ProductCategoryController,
    ProductBrandController,
    ProductColorController,
    CatalogSizeSetController,
  ],
  providers: [
    ProductCategoryService,
    ProductBrandService,
    ProductColorService,
    CatalogSizeSetService,
  ],
  exports: [
    ProductCategoryService,
    ProductBrandService,
    ProductColorService,
    CatalogSizeSetService,
  ],
})
export class CatalogModule {}
