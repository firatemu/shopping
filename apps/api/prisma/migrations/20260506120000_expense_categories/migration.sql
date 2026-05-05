-- Gelir/gider kategorileri + expenses.category_id
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ExpenseType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_categories_tenant_id_name_kind_key" ON "expense_categories"("tenant_id", "name", "kind");
CREATE INDEX "expense_categories_tenant_id_idx" ON "expense_categories"("tenant_id");
CREATE INDEX "expense_categories_tenant_id_kind_idx" ON "expense_categories"("tenant_id", "kind");

ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses" ADD COLUMN "category_id" UUID;

INSERT INTO "expense_categories" ("id", "tenant_id", "name", "kind", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), d."tenant_id", d."category", d."type", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "tenant_id", "category", "type" FROM "expenses"
) d;

UPDATE "expenses" e
SET "category_id" = ec."id"
FROM "expense_categories" ec
WHERE e."tenant_id" = ec."tenant_id"
  AND e."category" = ec."name"
  AND e."type" = ec."kind";

ALTER TABLE "expenses" ALTER COLUMN "category_id" SET NOT NULL;

DROP INDEX IF EXISTS "expenses_tenant_id_category_idx";

ALTER TABLE "expenses" DROP COLUMN "category";

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");
