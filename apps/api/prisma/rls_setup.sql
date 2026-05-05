-- ============================================
-- TextilePOS — Row-Level Security (RLS) Setup
-- ============================================
-- Architecture Rule #1: Second layer of tenant isolation
-- This script sets up RLS policies on all tenant-scoped tables.
-- Run this AFTER Prisma migrations create the tables.
--
-- Usage: psql -U textilepos -d textilepos -f rls_setup.sql
-- ============================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES — Template pattern
-- ============================================
-- Each table gets:
-- 1. tenant_isolation_select: Users can only read their tenant's data
-- 2. tenant_isolation_insert: Users can only insert into their tenant
-- 3. tenant_isolation_update: Users can only update their tenant's data
-- 4. tenant_isolation_delete: Users can only delete from their tenant

-- USERS
CREATE POLICY tenant_isolation_select ON users FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON users FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_update ON users FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_delete ON users FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- PRODUCTS
CREATE POLICY tenant_isolation_select ON products FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON products FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_update ON products FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_delete ON products FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- PRODUCT_VARIANTS
CREATE POLICY tenant_isolation_select ON product_variants FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON product_variants FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_update ON product_variants FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_delete ON product_variants FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- SIZE_SETS
CREATE POLICY tenant_isolation_select ON size_sets FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON size_sets FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_update ON size_sets FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_delete ON size_sets FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- STOCK_MOVEMENTS
CREATE POLICY tenant_isolation_select ON stock_movements FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON stock_movements FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- ORDERS
CREATE POLICY tenant_isolation_select ON orders FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON orders FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_update ON orders FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_delete ON orders FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- ORDER_ITEMS
CREATE POLICY tenant_isolation_select ON order_items FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON order_items FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- PAYMENTS
CREATE POLICY tenant_isolation_select ON payments FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON payments FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- CAMPAIGNS
CREATE POLICY tenant_isolation_select ON campaigns FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON campaigns FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_update ON campaigns FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_delete ON campaigns FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- GIFT_VOUCHERS
CREATE POLICY tenant_isolation_select ON gift_vouchers FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON gift_vouchers FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_update ON gift_vouchers FOR UPDATE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- AUDIT_LOGS (immutable — no update/delete)
CREATE POLICY tenant_isolation_select ON audit_logs FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON audit_logs FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- REFRESH_TOKENS
CREATE POLICY tenant_isolation_select ON refresh_tokens FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_insert ON refresh_tokens FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_delete ON refresh_tokens FOR DELETE
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- ============================================
-- BYPASS FOR SERVICE ACCOUNT
-- ============================================
-- The Prisma service account needs to bypass RLS for migrations.
-- In production, use a separate service account with bypassrls.
-- ALTER ROLE textilepos_app SET app.tenant_id = '';
-- For the application user, RLS is enforced:
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO textilepos_app;
