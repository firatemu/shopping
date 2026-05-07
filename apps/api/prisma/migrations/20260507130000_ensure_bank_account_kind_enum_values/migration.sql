-- Bazı ortamlarda "BankAccountKind" tipi eski kalmış olabilir (POS_SETTLEMENT / CREDIT_CARD eksik).
-- card_collection ve card_payment sorguları böyle DB'lerde 500 üretir. PG 15+.
ALTER TYPE "BankAccountKind" ADD VALUE IF NOT EXISTS 'POS_SETTLEMENT';
ALTER TYPE "BankAccountKind" ADD VALUE IF NOT EXISTS 'CREDIT_CARD';
