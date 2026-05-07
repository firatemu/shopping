# SoftShopping — Disaster Recovery Runbook

> Use this when the database is down, a deployment has failed, or data corruption is suspected.

---

## 1. Incident Classification

| Severity | Definition | Response Time |
|----------|-----------|-------------|
| P1 — Critical | API completely down, data loss suspected | Immediate |
| P2 — High | Partial outage, some tenants affected | < 30 min |
| P3 — Medium | Degraded performance, non-critical | < 4 hours |
| P4 — Low | Minor issue, workaround available | Next business day |

---

## 2. Database Backup & Restore

### 2.1 Manual Backup (Pre-deployment safety)

```bash
# Snapshot before migration
docker compose exec postgres pg_dump -U textilepos textilepos \
  --clean --if-exists --format=custom \
  --file=backups/pre-migration-$(date +%Y%m%d%H%M%S).dump
```

### 2.2 Restore from Backup

```bash
# Stop API to prevent writes
docker compose stop api

# Drop and recreate (WARNING: destroys current data)
docker compose exec postgres psql -U textilepos -d textilepos -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restore
docker compose exec -T postgres pg_restore -U textilepos -d textilepos \
  < backups/pre-migration-YYYYMMDDHHMMSS.dump

# Restart API
docker compose start api
```

### 2.3 Point-in-Time Recovery (PITR)

PostgreSQL WAL archiving must be enabled. Point-in-time recovery steps:

```bash
# Identify recovery target time
# Stop postgres, restore base backup, replay WAL to target time
# See: https://www.postgresql.org/docs/16/continuous-archiving.html
```

---

## 3. BullMQ / Redis Queue Recovery

### 3.1 Identify Stuck Jobs

```bash
# Inspect failed jobs
docker compose exec redis redis-cli KEYS "bull:*"
docker compose exec redis redis-cli LRANGE "bull:<queue-name>:wait" 0 99
```

### 3.2 Drain a Broken Queue

```bash
# Move all jobs in failed state back to wait
docker compose exec redis redis-cli --scan --pattern "bull:*failed" | \
  xargs -I{} docker compose exec redis redis-cli DEL {}
```

### 3.3 Restart Workers

```bash
# Force restart all workers
docker compose restart worker
```

---

## 4. Storage Recovery (R2/S3)

### 4.1 Verify Object Storage Connectivity

```bash
# Test R2/S3 endpoint
docker compose exec api node -e "
  const { S3Client } = require('@aws-sdk/client-s3');
  console.log('S3 client instantiated OK');
"
```

### 4.2 Fallback to Local Disk

If object storage is down, the API automatically falls back to local `/uploads` path.

---

## 5. Deployment Failure Rollback

### 5.1 Docker Compose Rollback

```bash
# Roll back to previous image/tag
docker compose pull && docker compose up -d

# Or pin to previous SHA
docker compose run --rm api \
  docker tag textilepos-api:<previous-sha> textilepos-api:latest
```

### 5.2 Database Migration Rollback

```bash
# Revert last migration
docker compose exec postgres psql -U textilepos -d textilepos \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker compose exec api npx prisma migrate deploy --to previous_migration
```

---

## 6. Health Check Failures

```bash
# Verify API health
curl http://localhost:4000/api/v1/health

# Verify DB connectivity
docker compose exec postgres pg_isready -U textilepos

# Verify Redis connectivity
docker compose exec redis redis-cli ping
```

---

## 7. Emergency Contacts

| Role | Responsibility |
|------|---------------|
| Atlas (Tech Lead) | Architecture decisions, escalation |
| Emir (DevOps) | Infrastructure, Docker, CI/CD |
| Kaan (Security) | Data breach, compliance |
| Deniz (Financial) | Transaction data integrity |

---

## 8. Post-Incident

1. Write incident report (timeline, root cause, impact)
2. Update this runbook with lessons learned
3. Schedule post-mortem within 48 hours
4. Open follow-up tickets for permanent fixes