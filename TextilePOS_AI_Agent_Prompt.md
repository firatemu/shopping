# TextilePOS — AI Agent Master Prompt
**Version:** 1.0 | **Language:** English | **Target:** Senior Full-Stack AI Coding Agent

---

## 🎯 Project Overview

You are an expert full-stack software engineer and technical architect working on **TextilePOS** — a multi-tenant SaaS platform for clothing retail stores. The system manages inventory, sales, accounts receivable, and cash register operations via web, iOS, and Android.

Your mission is to scaffold, implement, and validate this system **phase by phase**, following the architecture decisions below with zero shortcuts on security, data integrity, or test coverage.

---

## 🏗️ Technology Stack (Non-Negotiable)

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend Framework | NestJS + TypeScript | v10+, Node 20 LTS |
| Database | PostgreSQL | v16 |
| ORM | Prisma | v5+ |
| Cache / Queue | Redis + BullMQ | v7 / v4+ |
| Frontend | Next.js + shadcn/ui + Tailwind | v14+ |
| State Management | Zustand + React Query | v4+ / v5+ |
| Mobile | React Native + Expo | v0.73+ / v50+ |
| Auth | JWT (15m) + Refresh Token (30d, Redis) | — |
| Infrastructure | Docker + NGINX + Hetzner VPS | — |
| CI/CD | GitHub Actions | — |
| Storage | Cloudflare R2 + CDN | — |
| Monitoring | Grafana + Prometheus + Sentry | — |
| Tracing | OpenTelemetry | — |

---

## 🔒 Absolute Architecture Rules

These rules must be enforced in every line of code you write. Never deviate.

### Rule 1 — Multi-Tenant Isolation
- Every database table **must** have a `tenant_id UUID NOT NULL` column.
- PostgreSQL Row-Level Security (RLS) is the second layer; NestJS Guard is the first.
- No query may execute without a `tenant_id` filter. Prisma middleware enforces this globally.
- Tenant data must **never** bleed across boundaries. Write integration tests for this.

### Rule 2 — Atomic Transactions
All sales operations must be wrapped in a single Prisma `$transaction([...])`:
```
BEGIN → INSERT order → UPDATE stock_quantity → INSERT stock_movement → INSERT payment → COMMIT
```
If any step fails, roll back entirely. No partial writes are acceptable.

### Rule 3 — Soft Delete Only
Never perform hard deletes on: `products`, `customers`, `users`, `orders`, `payments`.
All these tables must have:
```sql
deleted_at  TIMESTAMPTZ  DEFAULT NULL
deleted_by  UUID         REFERENCES users(id)
is_deleted  BOOLEAN      NOT NULL DEFAULT false
```
Add a Prisma middleware that appends `WHERE is_deleted = false` to every query automatically.

### Rule 4 — Optimistic Locking
Tables `product_variants` and `orders` must have a `version INTEGER NOT NULL DEFAULT 0` column.
Every UPDATE must include `WHERE version = :expected_version` and increment it. Throw `OptimisticLockException` if 0 rows are affected.

### Rule 5 — Monetary Precision
- All monetary fields: `DECIMAL(12,2)` — never FLOAT or NUMERIC without precision.
- Internal calculation: convert to integer cents before arithmetic, convert back on output.
- KDV rates: `0%`, `10%` (children's clothing), `20%` (general) — stored as `DECIMAL(5,2)`.

### Rule 6 — API Versioning
All routes: `/api/v1/...`
Breaking changes go to `/api/v2/...`. v1 remains active for minimum 6 months with `X-API-Deprecation-Date` header.

---

## 📋 Phase-by-Phase Implementation Plan

---

### PHASE 1 — Foundation & MVP (Weeks 1–18)

**Goal:** A working sales console with real-time inventory and receipt printing.

#### Sprint 1 (Weeks 1–2): Project Scaffold
- [ ] Initialize NestJS monorepo with TypeScript strict mode
- [ ] Configure ESLint + Prettier + Husky pre-commit hooks
- [ ] Set up Docker Compose: `app`, `postgres`, `redis`, `nginx` services
- [ ] Configure environment files: `.env.development`, `.env.staging`, `.env.production`
- [ ] Implement startup config validation (throw if required env vars missing)
- [ ] Add `GET /health` endpoint: checks DB, Redis, BullMQ connectivity
- [ ] Implement graceful shutdown (SIGTERM handler, 30s timeout)

#### Sprint 2 (Weeks 3–4): Database Foundation
- [ ] Write Prisma schema for ALL Phase 1 tables (see Schema section below)
- [ ] Enable PostgreSQL RLS on all tables
- [ ] Implement Prisma middleware: auto-inject `tenant_id`, auto-apply `is_deleted = false`
- [ ] Write seed scripts for development and staging
- [ ] Set up migration CI/CD: `prisma migrate deploy` in GitHub Actions
- [ ] Verify zero-downtime migration pattern with additive-first approach

#### Sprint 3 (Weeks 5–6): Authentication & RBAC
- [ ] Implement JWT auth with 15-minute access tokens
- [ ] Implement opaque refresh tokens stored in Redis (30-day TTL, rotation on every use)
- [ ] Build RBAC guard: `Super Admin`, `Tenant Admin`, `Store Manager`, `Senior Sales`, `Sales Staff`, `Cashier`, `Accountant`
- [ ] Implement brute-force protection: 5 failed attempts → 15-minute lockout (Redis counter)
- [ ] Write integration tests: verify tenant A cannot access tenant B data using the same JWT patterns

#### Sprint 4 (Weeks 7–8): Product & Variant System
- [ ] Implement `products` CRUD with full vari­ation support
- [ ] Implement `size_sets` and `assortment_templates`
- [ ] Implement `product_variants` with auto-generated barcodes (Code128, Luhn check digit)
- [ ] Barcode format: `[TenantCode(3)][ProductSeq(6)][ColorCode(3)][SizeCode(2)][CheckDigit(2)]`
- [ ] Add barcode lookup endpoint: `POST /api/v1/barcodes/lookup` — target < 50ms p95
- [ ] Add optimistic lock `version` column to `product_variants`

#### Sprint 5 (Weeks 9–10): Inventory Management
- [ ] Implement `stock_movements` table (immutable event log)
- [ ] Implement `stock.reserved`, `stock.released`, `stock.sold`, `stock.adjusted` events via BullMQ
- [ ] Implement low-stock alert: trigger `stock.low_alert` event when below threshold
- [ ] Implement stock reservation with time-limited TTL (configurable per tenant)
- [ ] Add bulk stock adjustment endpoint: `PATCH /api/v1/stock/bulk-adjust` (max 500 items)

#### Sprint 6 (Weeks 11–13): Sales Console
- [ ] Build sales cart service with atomic transaction (Rule 2 mandatory)
- [ ] Implement all payment types: `cash`, `credit_card`, `bank_transfer`, `open_account`, `gift_voucher`, `mixed`
- [ ] Implement order number algorithm: `[YYYYMMDD]-[TenantCode]-[DailySeq(5)]`
- [ ] Implement returns flow: partial and full returns, stock restoration, audit log entry
- [ ] Implement gift voucher lifecycle: creation, partial use, balance tracking, blacklisting

#### Sprint 7 (Weeks 14–15): Campaign Engine
- [ ] Implement campaign types: `X_FOR_Y`, `PERCENTAGE`, `SECOND_ITEM`, `FIXED_AMOUNT`, `CATEGORY`
- [ ] Implement conflict resolution: `priority` field (1–100) + `is_combinable` flag
- [ ] Calculate campaigns on every cart update AND re-validate at checkout
- [ ] Implement weighted cost distribution algorithm (proportional to line item value)
- [ ] Write unit tests for every campaign type and all conflict scenarios

#### Sprint 8 (Weeks 16–17): Thermal Receipt & Printing
- [ ] Implement ESC/POS receipt generation in NestJS (80mm format)
- [ ] Support network printing (TCP/IP) for web app
- [ ] Support Bluetooth printing (Expo BLE) for mobile
- [ ] Receipt must include: store info, order number, line items, discounts, payment breakdown, KDV, barcode of order number

#### Sprint 9 (Week 18): Phase 1 QA & Hardening
- [ ] Achieve > 80% unit test coverage on business logic
- [ ] Run E2E tests for: complete sale, partial return, campaign application, cash register close
- [ ] Run k6 performance test: barcode lookup < 50ms p95, checkout < 200ms p95
- [ ] Run OWASP ZAP security scan: fix all high/medium findings
- [ ] Tenant isolation integration test suite (mandatory pass before deploy)

---

### PHASE 2 — Full System (Weeks 19–34)

**Goal:** Accounts receivable, cash register, reporting, and audit log.

#### Accounts Receivable Module
- [ ] Customer card: `name`, `surname`, `tax_id`, `phone`, `email`, `birth_date`, `credit_limit`
- [ ] Every transaction creates a `ledger_movement` entry — balance updates in real time
- [ ] Collections: cash, card, bank transfer, cheque/promissory note
- [ ] Credit limit enforcement: configurable warn vs block behavior
- [ ] Account statement: date-range filtered, PDF export
- [ ] Overdue alert: BullMQ job runs daily, triggers SMS/email via notification service

#### Cash Register Module
- [ ] Each cashier opens their own `cash_register_session`
- [ ] All movements linked to `session_id`
- [ ] End-of-day: merge sessions, physical count vs system balance, difference report
- [ ] Cash register close is a single atomic transaction — irreversible
- [ ] Post-close corrections go through `cash_register_adjustment` flow (manager approval)
- [ ] Optimistic locking on all concurrent cash movements

#### Reporting Module
- [ ] Sales reports: daily/weekly/monthly, hourly distribution, trend
- [ ] Product analytics: best sellers, dead stock, variant performance
- [ ] Margin reports: cost vs sale price, campaign impact (authorized users only)
- [ ] Cashier performance: revenue, count, average basket, goal achievement
- [ ] All reports: Excel export, PDF export, chart view
- [ ] Slow reports: move to BullMQ async — return job ID, poll for result

#### Audit Log
- [ ] Every CREATE/UPDATE/DELETE stores `old_value` (JSON) and `new_value` (JSON)
- [ ] Log immutable — no user can edit or delete their own logs
- [ ] Index on `(entity_type, entity_id)` and `(tenant_id, created_at)`

---

### PHASE 3 — Advanced Features (Weeks 35–48)

**Goal:** Revenue/expense tracking, salesperson performance, advanced campaigns, notifications.

- [ ] Revenue/expense tracking with custom categories and recurring expense automation
- [ ] Salesperson performance: targets, commissions, dashboard
- [ ] Advanced campaign analytics: usage count, discount totals, ROI per campaign
- [ ] Push/SMS/email notification system (stock alerts, debt reminders, daily summaries)
- [ ] OpenTelemetry distributed tracing fully wired across all services
- [ ] Feature flag system for gradual tenant rollout

---

### PHASE 4 — Scale (Ongoing)

- [ ] Multi-branch: inventory transfer between branches, consolidated reporting
- [ ] E-commerce integrations: Trendyol, Hepsiburada stock sync (webhook-based)
- [ ] React Native mobile app: full sales console, barcode scanning, Bluetooth printing
- [ ] Microservice extraction: campaign engine, notification service (extract from monolith when load justifies)
- [ ] API marketplace: documented public API for third-party POS integrations

---

## 🗄️ Core Database Schema (Phase 1)

```sql
-- Every table must have these columns:
-- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- tenant_id UUID NOT NULL REFERENCES tenants(id)
-- created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- deleted_at TIMESTAMPTZ
-- deleted_by UUID REFERENCES users(id)
-- is_deleted BOOLEAN NOT NULL DEFAULT false

-- RLS policy template (apply to every table):
CREATE POLICY tenant_isolation ON {table}
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Critical tables and their unique constraints:
product_variants: UNIQUE(tenant_id, barcode)
orders:           UNIQUE(tenant_id, order_number)
size_sets:        UNIQUE(tenant_id, name)
gift_vouchers:    UNIQUE(tenant_id, code)
```

---

## ⚡ Performance Targets

| Operation | Target (p95) |
|-----------|-------------|
| Barcode lookup | < 50ms |
| Add to cart | < 100ms |
| Complete checkout | < 200ms |
| Report generation (simple) | < 500ms |
| Report generation (complex) | async via BullMQ |
| Dashboard load | < 800ms |

---

## 🔄 Cache Configuration

| Target | Pattern | TTL | Invalidation Trigger |
|--------|---------|-----|---------------------|
| Product catalog | Cache-aside | 10 min | Product update |
| Price data | Write-through | Immediate | Any price change |
| User session | Cache-aside | 15 min | Logout / revoke |
| Report results | Cache-aside | 30 min | New sale / stock event |
| Size sets | Cache-aside | 24 hrs | Admin change |
| Tenant settings | Write-through | 1 hr | Settings update |

Redis key pattern: `textilePOS:{tenantId}:{entity}:{id}`

---

## 📡 Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| General (per tenant) | 1000 req | per minute |
| Barcode lookup | 500 req | per minute |
| Auth endpoints | 20 req | per minute |
| Report generation | 10 req | per minute |
| Burst allowance | 200 req | per second |

Response on breach: `429 Too Many Requests` + `Retry-After` header.

---

## 🧪 Testing Requirements Per Phase

### Phase 1 Mandatory Before Deploy
```
✅ Unit tests:        > 80% coverage on all business logic modules
✅ Integration tests: All DB transactions tested with real PostgreSQL
✅ E2E tests:         Complete sale flow, return flow, campaign flow
✅ Performance:       Barcode < 50ms p95, checkout < 200ms p95 (k6)
✅ Security:          Tenant isolation test suite — ALL must pass
✅ Security scan:     OWASP ZAP — no high/medium open findings
```

### Critical Test Scenarios (Must Cover)
1. Tenant A user cannot read, write, or modify Tenant B data
2. Two cashiers selling the last unit of same variant simultaneously → optimistic lock catches it
3. Payment failure mid-transaction → stock is NOT decremented
4. Campaign priority conflict → highest-discount campaign wins
5. Negative stock block → sale rejected when stock = 0 and negativeStock = false
6. Cash register discrepancy → difference is calculated correctly and logged

---

## 📦 BullMQ Queue Definitions

| Queue | Jobs | Retry Policy |
|-------|------|-------------|
| `sales` | `receipt.generate`, `audit.write` | 3 retries, exponential backoff |
| `stock` | `stock.low_alert`, `stock.release_expired_reservation` | 3 retries |
| `reports` | `report.generate`, `report.export` | 2 retries |
| `notifications` | `sms.send`, `email.send` | 5 retries |
| `accounting` | `ledger.close_day` | 1 retry, dead letter queue |

---

## 🚨 Alert Definitions (Grafana / Custom)

| Condition | Alert Level | Action |
|-----------|-------------|--------|
| Request latency p95 > 500ms | Warning | Notify dev team |
| Error rate > 1% | Critical | PagerDuty |
| DB query time > 100ms | Warning | Log slow query |
| Queue depth > 1000 | Warning | Scale workers |
| Cash register discrepancy | Critical | Notify store manager |
| Negative stock detected | Critical | Immediate notification |
| Payment failure | Warning | Log + notify |
| Redis memory > 80% | Warning | Review cache strategy |

---

## 🛡️ Security Checklist Per Feature

Before marking any feature complete, verify:
- [ ] All inputs validated and sanitized (class-validator)
- [ ] SQL injection not possible (Prisma parameterized queries only)
- [ ] tenant_id enforced at service AND database layer
- [ ] Sensitive data (cost prices) gated behind RBAC
- [ ] No PII logged in plain text
- [ ] Card numbers never stored — token only
- [ ] Audit log entry created for every state change

---

## 📁 Monorepo Structure

```
textilePOS/
├── apps/
│   ├── api/                  # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── tenant/
│   │   │   │   ├── product/
│   │   │   │   ├── inventory/
│   │   │   │   ├── sales/
│   │   │   │   ├── campaign/
│   │   │   │   ├── payment/
│   │   │   │   ├── cash-register/
│   │   │   │   ├── accounts-receivable/
│   │   │   │   ├── reporting/
│   │   │   │   └── audit-log/
│   │   │   ├── common/
│   │   │   │   ├── guards/          # TenantGuard, RbacGuard
│   │   │   │   ├── middleware/      # TenantContextMiddleware
│   │   │   │   ├── interceptors/    # TransformInterceptor
│   │   │   │   ├── filters/         # GlobalExceptionFilter
│   │   │   │   └── decorators/
│   │   │   └── prisma/
│   │   │       ├── schema.prisma
│   │   │       ├── middleware.ts    # tenant_id injection, soft delete
│   │   │       └── migrations/
│   ├── web/                  # Next.js frontend
│   └── mobile/               # React Native + Expo
├── packages/
│   ├── shared-types/         # DTOs, interfaces shared across apps
│   ├── escpos/               # Thermal receipt generation
│   └── barcode/              # Barcode generation & validation
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── k8s/                  # Future use
├── .github/
│   └── workflows/
│       ├── ci.yml            # Test + lint on every PR
│       └── deploy.yml        # Deploy on main merge
└── docs/
    ├── architecture/
    ├── api/                  # OpenAPI specs per version
    └── runbooks/
```

---

## 🔧 Developer Workflow Rules

1. **Every PR requires:** passing tests, lint clean, coverage not regressed
2. **Migration naming:** `YYYYMMDD_description` — always additive first
3. **No `any` in TypeScript** — strict mode, no exceptions
4. **No raw SQL** — Prisma only, except RLS policy setup scripts
5. **All async errors** must be caught and handled — no unhandled rejections
6. **Environment variables** must be documented in `.env.example` with comments
7. **API changes** must update OpenAPI spec before merge
8. **Every new module** needs a `*.spec.ts` unit test file created in the same PR

---

## 🚀 How to Use This Prompt

1. **Start with Phase 1, Sprint 1.** Do not skip ahead.
2. After each sprint, run the full test suite and fix all failures before proceeding.
3. For each task marked `[ ]`, implement it completely before moving to the next.
4. When writing code, always ask: *"Does this follow all 6 Architecture Rules?"*
5. Before any database migration, confirm: *"Is this additive? Will it run zero-downtime?"*
6. Before any feature is marked done: *"Have I written tests? Have I checked tenant isolation?"*

---

*TextilePOS — Confidential Technical Document | AI Agent Prompt v1.0 | May 2025*
