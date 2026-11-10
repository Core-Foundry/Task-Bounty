# Database Backup and Restore Guide

**Document:** `DATABASE_BACKUP_RESTORE.md`  
**Tracking Issue:** [#164](https://github.com/Core-Foundry/Task-Bounty/issues/164)  
**Related Documents:** [DATA_RETENTION.md](DATA_RETENTION.md), [DEPLOYMENT.md](DEPLOYMENT.md), [SETUP.md](SETUP.md)  

---

## 1. Overview & Architecture

TaskBounty relies on PostgreSQL for persistent off-chain indexing, user notification delivery, task metadata caching, waitlist submissions, and Soroban contract event telemetry. While the Soroban smart contracts on the Stellar network serve as the immutable source of truth for on-chain escrows and disbursements, the off-chain database is critical for low-latency queries, task search, analytics, and notification delivery.

This document defines the operational procedures for backing up, verifying, and safely restoring the TaskBounty database across development, staging, and production environments.

### Target Recovery Objectives
- **RPO (Recovery Point Objective):** < 1 hour (daily automated snapshots + transaction logs)
- **RTO (Recovery Time Objective):** < 15 minutes to complete restoration and sanity validation

---

## 2. Required Precautions & Safety Checklist

Before initiating any backup or restore operation, ensure compliance with the following security and operational precautions:

### 2.1 Security & Access
- **Never hardcode credentials:** Never commit plaintext database passwords or access keys into scripts, configuration files, or command histories. Always utilize `.pgpass`, environment variables (`PGPASSWORD`), or secret managers (AWS Secrets Manager, Doppler, Vault).
- **Encrypt backups at rest:** Encrypt all backup archives using GPG or AES-256 before transferring them to external storage or cloud buckets (e.g., AWS S3, Cloudflare R2).
- **Least privilege access:** The backup database user requires only `SELECT` permissions across all tables and `SELECT` on sequences. The restore database user requires `SUPERUSER` or `CREATE` and schema modification rights.

### 2.2 Operational Safety
- **Disk Space Verification:** Ensure the backup target volume has at least **2.5×** the current database size in free disk space to accommodate raw dumps, compression overhead, and temporary sorting buffers:
  ```bash
  df -h /var/backups
  ```
- **Transaction Consistency:** Always run logical backups with `--single-transaction` to capture a mathematically consistent snapshot across all tables without locking read operations.
- **Connection Draining on Restore:** Prior to executing a destructive restore, terminate active application connections to avoid locking conflicts or partial writes:
  ```sql
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = 'taskbounty' AND pid <> pg_backend_pid();
  ```

---

## 3. Backup Procedures

### 3.1 Custom Format Backup (`.dump` - Recommended)
The PostgreSQL custom format (`-Fc`) is compressed, allows selective table restoration, and enables multi-threaded restoration (`pg_restore -j`).

```bash
# Set environment
export PGHOST="localhost"
export PGPORT="5432"
export PGDATABASE="taskbounty"
export PGUSER="taskbounty_admin"

# Define backup filename with timestamp
BACKUP_DIR="/var/backups/taskbounty"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/taskbounty_backup_$(date +%Y%m%d_%H%M%S).dump"

# Execute consistent logical dump
pg_dump \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="$BACKUP_FILE" \
  "$PGDATABASE"

# Generate SHA-256 checksum for cryptographic verification
sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"

echo "Backup completed successfully: $BACKUP_FILE"
```

### 3.2 Plain SQL Compressed Backup (`.sql.gz`)
Useful for human-readable audit trails and cross-version database migrations:

```bash
pg_dump \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --format=plain \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "$PGDATABASE" | gzip -9 > "${BACKUP_DIR}/taskbounty_plain_$(date +%Y%m%d_%H%M%S).sql.gz"
```

### 3.3 Automated Scheduled Backup Script
Create `scripts/backup-db.sh` for cron execution:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_PATH:-/var/backups/taskbounty}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/taskbounty_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting TaskBounty automated database backup..."
pg_dump -Fc -Z 9 -f "$BACKUP_FILE" "${DATABASE_URL:-taskbounty}"
sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"

# Rotate and purge backups older than retention policy
echo "[$(date -Iseconds)] Purging backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "taskbounty_*.dump*" -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date -Iseconds)] Backup job completed."
```

---

## 4. Restore Procedures

### 4.1 Full Restoration to a Fresh Database

Follow this procedure during disaster recovery or when restoring to a new staging instance:

```bash
# 1. Verify archive integrity
sha256sum -c /var/backups/taskbounty/taskbounty_backup_YYYYMMDD_HHMMSS.dump.sha256

# 2. Terminate existing application connections (if restoring over existing DB)
psql -h "$PGHOST" -U "$PGUSER" -d postgres -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = '$PGDATABASE' AND pid <> pg_backend_pid();
"

# 3. Drop and recreate database for a clean slate
dropdb -h "$PGHOST" -U "$PGUSER" --if-exists "$PGDATABASE"
createdb -h "$PGHOST" -U "$PGUSER" -O "$PGUSER" "$PGDATABASE"

# 4. Restore using pg_restore with parallel jobs
pg_restore \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --no-owner \
  --no-privileges \
  --jobs=4 \
  --verbose \
  /var/backups/taskbounty/taskbounty_backup_YYYYMMDD_HHMMSS.dump
```

### 4.2 Selective Table Restoration
If only specific tables (such as `notifications` or `tasks`) were corrupted:

```bash
# List contents of backup
pg_restore -l /var/backups/taskbounty/taskbounty_backup_YYYYMMDD_HHMMSS.dump | grep -E "tasks|notifications" > table_list.txt

# Restore only the specified tables
pg_restore \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --use-list=table_list.txt \
  /var/backups/taskbounty/taskbounty_backup_YYYYMMDD_HHMMSS.dump
```

### 4.3 Post-Restore Verification Checklist
Immediately following a restore, execute verification queries:

```sql
-- 1. Check table record counts
SELECT count(*) AS total_tasks FROM tasks;
SELECT count(*) AS total_submissions FROM submissions;
SELECT count(*) AS total_notifications FROM notifications;

-- 2. Verify sequence continuity
SELECT last_value FROM tasks_id_seq;

-- 3. Run VACUUM ANALYZE to refresh query planner statistics
VACUUM ANALYZE;
```

---

## 5. Sample Environment Testing Playbook

This hands-on walkthrough validates the backup and restore process using an isolated local Docker PostgreSQL environment.

### Step 1: Launch Isolated PostgreSQL Container
```bash
docker run --name taskbounty-backup-test \
  -e POSTGRES_DB=taskbounty_test \
  -e POSTGRES_USER=tb_tester \
  -e POSTGRES_PASSWORD=supersecuretestpassword \
  -p 5433:5432 \
  -d postgres:16-alpine
```

### Step 2: Seed Sample Data
Connect and initialize test tables:

```bash
docker exec -i taskbounty-backup-test psql -U tb_tester -d taskbounty_test << 'EOF'
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    bounty_amount NUMERIC(12, 2) NOT NULL,
    creator_wallet VARCHAR(56) NOT NULL,
    status VARCHAR(32) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
    submitter_wallet VARCHAR(56) NOT NULL,
    ipfs_hash VARCHAR(100) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tasks (title, bounty_amount, creator_wallet, status) VALUES
('Implement Stellar Dex Routing', 500.00, 'GDEXAMPLEKEYCREATOR1111111111111111111111111111111111111', 'open'),
('Soroban Contract Audit Pass', 1200.00, 'GDEXAMPLEKEYCREATOR2222222222222222222222222222222222222', 'in_review');

INSERT INTO submissions (task_id, submitter_wallet, ipfs_hash) VALUES
(1, 'GDEXAMPLEKEYSUBMITTER333333333333333333333333333333333333', 'QmExampleIPFSHashVerificationData123456789');
EOF
```

### Step 3: Execute Test Backup
```bash
docker exec -t taskbounty-backup-test pg_dump \
  -U tb_tester \
  -d taskbounty_test \
  -Fc \
  -f /tmp/sample_backup.dump

# Copy backup out of container
docker cp taskbounty-backup-test:/tmp/sample_backup.dump /tmp/sample_backup.dump
```

### Step 4: Simulate Catastrophic Data Loss
```bash
docker exec -i taskbounty-backup-test psql -U tb_tester -d taskbounty_test -c "DROP TABLE submissions; DROP TABLE tasks;"
```

Verify tables are gone:
```bash
docker exec -i taskbounty-backup-test psql -U tb_tester -d taskbounty_test -c "\dt"
# Output: Did not find any relations.
```

### Step 5: Execute Restoration
```bash
docker cp /tmp/sample_backup.dump taskbounty-backup-test:/tmp/sample_backup.dump

docker exec -i taskbounty-backup-test pg_restore \
  -U tb_tester \
  -d taskbounty_test \
  --clean \
  --if-exists \
  --no-owner \
  /tmp/sample_backup.dump
```

### Step 6: Confirm 100% Data Integrity
```bash
docker exec -i taskbounty-backup-test psql -U tb_tester -d taskbounty_test -c "SELECT id, title, bounty_amount, status FROM tasks;"
```

**Expected Verified Output:**
```text
 id |             title             | bounty_amount |  status   
----+-------------------------------+---------------+-----------
  1 | Implement Stellar Dex Routing |        500.00 | open
  2 | Soroban Contract Audit Pass   |       1200.00 | in_review
(2 rows)
```

### Step 7: Teardown Test Container
```bash
docker stop taskbounty-backup-test && docker rm taskbounty-backup-test
rm -f /tmp/sample_backup.dump
```

---

## 6. Summary of Standard Operating Procedures (SOP)

| Frequency | Task | Command / Method | Retention |
|---|---|---|---|
| **Daily (01:00 UTC)** | Automated Custom Dump | `scripts/backup-db.sh` | 7 Days Local, 30 Days S3 |
| **Weekly (Sunday)** | Cold Snapshot Archive | `pg_dump -Fc -Z 9` | 90 Days Cloud Storage |
| **Monthly** | Off-site Tape/Glacier Archive | Encrypted S3 Glacier Vault | 1 Year |
| **Quarterly** | DR Drill (Dry Run Restore) | Section 5 Test Procedure | Audit Log Record |
