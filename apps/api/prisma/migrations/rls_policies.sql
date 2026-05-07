-- =============================================
-- SoftShopping — RLS (Row Level Security) Policies
-- Run AFTER prisma migrate dev
-- =============================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Create app role for NestJS connection
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user LOGIN PASSWORD 'app_secure_password';
    END IF;
END
$$;

-- Grant basic access
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- =============================================
-- RLS Policies: Tenant Isolation
-- Each policy restricts rows to current tenant via session variable
-- Set before each request: SET app.current_tenant_id = '<uuid>';
-- =============================================

-- Helper function
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Macro for creating standard tenant policies
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'users', 'products', 'product_variants', 'size_sets',
        'stock_movements', 'orders', 'order_items', 'payments',
        'campaigns', 'gift_vouchers', 'audit_logs',
        'customers', 'ledger_movements',
        'cash_register_sessions', 'cash_register_adjustments',
        'expenses', 'sales_targets', 'notifications',
        'branches', 'stock_transfers', 'integrations'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- SELECT policy
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT TO app_user USING (tenant_id = current_tenant_id())',
            'rls_select_' || tbl, tbl
        );
        -- INSERT policy
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR INSERT TO app_user WITH CHECK (tenant_id = current_tenant_id())',
            'rls_insert_' || tbl, tbl
        );
        -- UPDATE policy
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR UPDATE TO app_user USING (tenant_id = current_tenant_id())',
            'rls_update_' || tbl, tbl
        );
        -- DELETE policy
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR DELETE TO app_user USING (tenant_id = current_tenant_id())',
            'rls_delete_' || tbl, tbl
        );

        RAISE NOTICE 'RLS policies created for: %', tbl;
    END LOOP;
END
$$;

-- Tenants table: special policy (admin can see own tenant only)
CREATE POLICY rls_select_tenants ON tenants FOR SELECT TO app_user
    USING (id = current_tenant_id());
CREATE POLICY rls_update_tenants ON tenants FOR UPDATE TO app_user
    USING (id = current_tenant_id());

-- stock_transfer_items: no tenant_id — use parent relation
CREATE POLICY rls_select_sti ON stock_transfer_items FOR SELECT TO app_user
    USING (transfer_id IN (SELECT id FROM stock_transfers WHERE tenant_id = current_tenant_id()));
CREATE POLICY rls_insert_sti ON stock_transfer_items FOR INSERT TO app_user
    WITH CHECK (transfer_id IN (SELECT id FROM stock_transfers WHERE tenant_id = current_tenant_id()));

-- =============================================
-- Bypass for super_admin (prisma migrations, seeds)
-- =============================================
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
-- Note: The database owner / superuser bypasses RLS by default.
-- For production, ensure app connects as app_user, not postgres superuser.

RAISE NOTICE '✅ RLS policies applied to all 22 tables';
