export type ProductVariant = {
  id: string;
  barcode: string;
  color?: string | null;
  size?: string | null;
  stockQuantity: number;
  reservedQty?: number;
  salePrice?: string | number | null;
};

export type Product = {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  salePrice: string | number;
  kdvRate: string | number;
  totalStock?: number;
  variants?: ProductVariant[];
};

export type ProductListResponse = {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type BarcodeLookupResponse = {
  id: string;
  barcode: string;
  color?: string | null;
  size?: string | null;
  stockQuantity: number;
  reservedQty?: number;
  salePrice?: string | number | null;
  product: {
    id: string;
    name: string;
    brand?: string | null;
    category?: string | null;
    salePrice: string | number;
    kdvRate?: string | number | null;
    imageUrl?: string | null;
  };
};
