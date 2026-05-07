-- Bazı ortamlarda `_prisma_migrations` güncel görünüp `products` tablosu eski kalabiliyor (P2022).
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "supplier_code" VARCHAR(64);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "supplier_id" UUID;

CREATE INDEX IF NOT EXISTS "products_tenant_id_supplier_id_idx" ON "products" ("tenant_id", "supplier_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_supplier_id_fkey'
    ) THEN
        ALTER TABLE "products"
            ADD CONSTRAINT "products_supplier_id_fkey"
            FOREIGN KEY ("supplier_id") REFERENCES "customers" ("id")
            ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;
