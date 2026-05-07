/**
 * check-rls.ts — PostgreSQL RLS (Row Level Security) Policy Validator
 *
 * Runs against a live PostgreSQL instance (via DATABASE_URL) and verifies:
 *  1. RLS is enabled on all business tables
 *  2. A policy exists for each table (at minimum one)
 *  3. Reports any tables that are missing RLS or policies
 *
 * Usage:
 *   npm run check:rls
 *   DATABASE_URL=postgresql://... npx ts-node scripts/check-rls.ts
 *
 * Exit codes:
 *   0 = all tables have RLS enabled with at least one policy
 *   1 = one or more tables missing RLS or policies (CI FAIL)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tables that MUST have RLS enabled and at least one policy
// This list should be kept in sync with the Prisma schema business models
const BUSINESS_TABLES = [
  'users',
  'products',
  'product_variants',
  'orders',
  'order_items',
  'payments',
  'campaigns',
  'gift_vouchers',
  'product_categories',
  'product_brands',
  'product_colors',
  'size_sets',
  'stock_movements',
  'customers',
  'ledger_movements',
  'bank_accounts',
  'bank_account_movements',
  'partner_finance_operations',
  'cash_register_sessions',
  'cash_register_adjustments',
  'expense_categories',
  'expenses',
  'sales_targets',
  'notifications',
  'branches',
  'stock_transfers',
  'stock_transfer_items',
  'integrations',
  'label_templates',
  'tenants',
  'refresh_tokens',
  'audit_logs',
];

async function checkRls(): Promise<void> {
  console.log('🔍 Checking PostgreSQL RLS policies...\n');

  const missingRls: string[] = [];
  const missingPolicies: string[] = [];

  for (const table of BUSINESS_TABLES) {
    // 1. Check if RLS is enabled on the table
    const rlsResult = await prisma.$queryRaw<{ rowsecurity: boolean }[]>`
      SELECT rowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ${table}
    `;

    if (rlsResult.length === 0) {
      console.warn(`⚠️  Table "${table}" not found in public schema — skipping`);
      continue;
    }

    const rlsEnabled = rlsResult[0].rowsecurity;
    if (!rlsEnabled) {
      missingRls.push(table);
      console.error(`❌ [RLS OFF]   ${table}`);
    } else {
      console.log(`✅ [RLS ON]    ${table}`);
    }

    // 2. Check if at least one RLS policy exists
    const policyResult = await prisma.$queryRaw<{ policyname: string }[]>`
      SELECT policyname
      FROM pg_policy
      WHERE polrelid = (
        SELECT oid FROM pg_class WHERE relname = ${table}
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      )
    `;

    if (policyResult.length === 0) {
      missingPolicies.push(table);
      console.error(`❌ [NO POLICY] ${table} — RLS is on but no policy defined`);
    } else {
      console.log(`✅ [POLICY OK] ${table} (${policyResult.length} policy[ies])`);
    }
  }

  console.log('\n' + '='.repeat(60));
  if (missingRls.length > 0) {
    console.error(`\n❌ RLS NOT ENABLED on ${missingRls.length} table(s):`);
    missingRls.forEach((t) => console.error(`   - ${t}`));
  }
  if (missingPolicies.length > 0) {
    console.error(`\n❌ NO POLICY on ${missingPolicies.length} table(s):`);
    missingPolicies.forEach((t) => console.error(`   - ${t}`));
  }

  if (missingRls.length === 0 && missingPolicies.length === 0) {
    console.log('\n✅ All business tables have RLS enabled with at least one policy.');
    await prisma.$disconnect();
    process.exit(0);
  } else {
    console.error('\n💥 RLS check FAILED — fix missing tables before proceeding.');
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkRls().catch(async (err) => {
  console.error('💥 Unexpected error during RLS check:', err);
  await prisma.$disconnect();
  process.exit(1);
});