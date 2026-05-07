-- Cari ödeme/tahsilat: banka hesapları, merkezi işlem kaydı, cari ekstre soft delete alanları

CREATE TYPE "BankAccountKind" AS ENUM ('CHECKING', 'POS_SETTLEMENT', 'CREDIT_CARD');

CREATE TYPE "PartnerFinanceKind" AS ENUM (
  'CASH_COLLECTION',
  'CARD_COLLECTION',
  'TRANSFER_IN',
  'CHECK_RECEIVED',
  'PROMISSORY_RECEIVED',
  'CASH_PAYMENT',
  'CARD_PAYMENT',
  'TRANSFER_OUT',
  'CHECK_ISSUED',
  'PROMISSORY_ISSUED',
  'DEBIT_VOUCHER',
  'CREDIT_VOUCHER'
);

ALTER TYPE "LedgerMovementType" ADD VALUE 'PAYMENT_OUT_CARD';
ALTER TYPE "LedgerMovementType" ADD VALUE 'DEBIT_VOUCHER';
ALTER TYPE "LedgerMovementType" ADD VALUE 'CREDIT_VOUCHER';

ALTER TABLE "ledger_movements" ADD COLUMN "partner_finance_operation_id" UUID;
ALTER TABLE "ledger_movements" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "ledger_movements" ADD COLUMN "deleted_by" UUID;
ALTER TABLE "ledger_movements" ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch_name" TEXT,
    "iban" VARCHAR(34),
    "account_number" VARCHAR(32),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "kind" "BankAccountKind" NOT NULL DEFAULT 'CHECKING',
    "opening_balance" DECIMAL(12,2) NOT NULL,
    "opening_balance_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_balance" DECIMAL(12,2) NOT NULL,
    "color_tag" VARCHAR(16),
    "label_icon" VARCHAR(32),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_finance_operations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "kind" "PartnerFinanceKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "operation_date" TIMESTAMP(3) NOT NULL,
    "document_no" VARCHAR(40) NOT NULL,
    "description" TEXT,
    "bank_account_id" UUID,
    "cash_register_session_id" UUID,
    "metadata" JSONB DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "partner_finance_operations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bank_account_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "partner_finance_operation_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "movement_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bank_account_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bank_accounts_tenant_id_idx" ON "bank_accounts"("tenant_id");
CREATE INDEX "bank_accounts_tenant_id_is_deleted_idx" ON "bank_accounts"("tenant_id", "is_deleted");

CREATE UNIQUE INDEX "partner_finance_operations_tenant_id_document_no_key" ON "partner_finance_operations"("tenant_id", "document_no");
CREATE INDEX "partner_finance_operations_tenant_id_idx" ON "partner_finance_operations"("tenant_id");
CREATE INDEX "partner_finance_operations_tenant_id_customer_id_idx" ON "partner_finance_operations"("tenant_id", "customer_id");
CREATE INDEX "partner_finance_operations_tenant_id_kind_idx" ON "partner_finance_operations"("tenant_id", "kind");
CREATE INDEX "partner_finance_operations_tenant_id_operation_date_idx" ON "partner_finance_operations"("tenant_id", "operation_date");

CREATE INDEX "bank_account_movements_tenant_id_idx" ON "bank_account_movements"("tenant_id");
CREATE INDEX "bank_account_movements_tenant_id_bank_account_id_idx" ON "bank_account_movements"("tenant_id", "bank_account_id");
CREATE INDEX "bank_account_movements_tenant_id_partner_finance_operation_id_idx" ON "bank_account_movements"("tenant_id", "partner_finance_operation_id");

CREATE INDEX "ledger_movements_tenant_id_partner_finance_operation_id_idx" ON "ledger_movements"("tenant_id", "partner_finance_operation_id");

ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_finance_operations" ADD CONSTRAINT "partner_finance_operations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_finance_operations" ADD CONSTRAINT "partner_finance_operations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "partner_finance_operations" ADD CONSTRAINT "partner_finance_operations_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "partner_finance_operations" ADD CONSTRAINT "partner_finance_operations_cash_register_session_id_fkey" FOREIGN KEY ("cash_register_session_id") REFERENCES "cash_register_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bank_account_movements" ADD CONSTRAINT "bank_account_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bank_account_movements" ADD CONSTRAINT "bank_account_movements_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bank_account_movements" ADD CONSTRAINT "bank_account_movements_partner_finance_operation_id_fkey" FOREIGN KEY ("partner_finance_operation_id") REFERENCES "partner_finance_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ledger_movements" ADD CONSTRAINT "ledger_movements_partner_finance_operation_id_fkey" FOREIGN KEY ("partner_finance_operation_id") REFERENCES "partner_finance_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
