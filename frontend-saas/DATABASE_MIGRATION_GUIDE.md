# 데이터베이스 마이그레이션 가이드

## 📋 목차
1. [개요](#개요)
2. [마이그레이션 파일 구조](#마이그레이션-파일-구조)
3. [실행 방법](#실행-방법)
4. [검증 방법](#검증-방법)
5. [롤백 방법](#롤백-방법)
6. [문제 해결](#문제-해결)

---

## 개요

알림 시스템을 위한 데이터베이스 스키마 변경이 필요합니다.

### 변경 내용
- ✅ `users` 테이블에 `phone`, `notification_enabled` 컬럼 추가
- ✅ `notification_logs` 테이블 생성
- ✅ 인덱스 추가 (성능 최적화)

---

## 마이그레이션 파일 구조

### 파일 위치
```
frontend-saas/
├── lib/
│   └── db/
│       ├── schema.ts                 # Drizzle ORM 스키마 정의
│       └── migrations/
│           └── 0002_add_notification_system.sql  # SQL 마이그레이션
```

### 마이그레이션 파일 내용

**파일**: `lib/db/migrations/0002_add_notification_system.sql`

```sql
-- Migration: Add Notification System
-- Created: 2025-11-13
-- Description: Adds phone number and notification settings to users table, creates notification_logs table

-- Step 1: Add notification fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;

-- Step 2: Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  phone_number VARCHAR(20),
  message_id VARCHAR(255),
  error_message TEXT,
  metadata TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);

-- Step 4: Add comments for documentation
COMMENT ON TABLE notification_logs IS 'Stores logs of all notification attempts (Kakao Alimtalk and Naver SENS)';
COMMENT ON COLUMN notification_logs.type IS 'Notification type: payment_success, revision_credit_purchased, writing_analysis_complete, application_generated';
COMMENT ON COLUMN notification_logs.channel IS 'Notification channel: kakao (Alimtalk), sms (Naver SENS)';
COMMENT ON COLUMN notification_logs.status IS 'Notification status: pending, sent, failed';
COMMENT ON COLUMN notification_logs.metadata IS 'JSON string containing additional notification data';

COMMENT ON COLUMN users.phone IS 'User phone number for notifications (format: 010-1234-5678)';
COMMENT ON COLUMN users.notification_enabled IS 'Whether user has consented to receive notifications';
```

---

## 실행 방법

### 방법 1: Supabase Dashboard (권장)

#### 1단계: Supabase Dashboard 접속
```
https://supabase.com/dashboard/project/<your-project-id>
```

#### 2단계: SQL Editor 열기
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭

#### 3단계: 마이그레이션 실행
1. 마이그레이션 파일 내용 복사:
   ```bash
   cat E:/gov-support-automation/frontend-saas/lib/db/migrations/0002_add_notification_system.sql
   ```

2. SQL Editor에 붙여넣기

3. **Run** 버튼 클릭

4. 성공 메시지 확인:
   ```
   Success. No rows returned
   ```

---

### 방법 2: psql CLI

#### 1단계: 환경 변수 확인
```bash
# .env 파일에서 DATABASE_URL 확인
cat .env | grep POSTGRES_URL
```

#### 2단계: psql로 접속
```bash
# Windows (PowerShell)
$env:PGPASSWORD="your-password"
psql -h your-host.supabase.co -p 5432 -U postgres -d postgres

# Linux/Mac
PGPASSWORD="your-password" psql -h your-host.supabase.co -p 5432 -U postgres -d postgres
```

#### 3단계: 마이그레이션 실행
```sql
-- 파일에서 직접 실행
\i E:/gov-support-automation/frontend-saas/lib/db/migrations/0002_add_notification_system.sql

-- 또는 복사해서 붙여넣기
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;

-- ... (나머지 SQL)
```

---

### 방법 3: Node.js 스크립트 (자동화)

#### 1단계: 마이그레이션 스크립트 생성

**파일**: `scripts/run-migration.ts`

```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

async function runMigration() {
  const databaseUrl = process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error('❌ POSTGRES_URL environment variable not set');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  const sql = postgres(databaseUrl);

  try {
    const migrationPath = resolve(
      __dirname,
      '../lib/db/migrations/0002_add_notification_system.sql'
    );

    console.log('📄 Reading migration file...');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Running migration...');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Verifying changes...');

    // Verify users table columns
    const usersColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('phone', 'notification_enabled')
      ORDER BY column_name;
    `;

    console.log('\n✓ Users table columns:');
    usersColumns.forEach((col) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Verify notification_logs table exists
    const notificationLogsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'notification_logs'
      );
    `;

    if (notificationLogsExists[0].exists) {
      console.log('\n✓ notification_logs table created');

      const notificationLogsColumns = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'notification_logs'
        ORDER BY ordinal_position;
      `;

      console.log('  Columns:');
      notificationLogsColumns.forEach((col) => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }

    // Verify indexes
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'notification_logs'
      ORDER BY indexname;
    `;

    console.log('\n✓ Indexes created:');
    indexes.forEach((idx) => {
      console.log(`  - ${idx.indexname}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
```

#### 2단계: 스크립트 실행
```bash
cd frontend-saas
pnpm tsx scripts/run-migration.ts
```

---

## 검증 방법

### 1. 테이블 구조 확인

#### users 테이블 확인
```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('phone', 'notification_enabled')
ORDER BY column_name;
```

**예상 결과**:
```
 column_name          | data_type         | is_nullable | column_default
----------------------+-------------------+-------------+----------------
 notification_enabled | boolean           | YES         | true
 phone                | character varying | YES         | NULL
```

---

#### notification_logs 테이블 확인
```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'notification_logs'
ORDER BY ordinal_position;
```

**예상 결과**:
```
 column_name    | data_type         | is_nullable
----------------+-------------------+-------------
 id             | integer           | NO
 user_id        | integer           | NO
 type           | character varying | NO
 channel        | character varying | NO
 status         | character varying | NO
 phone_number   | character varying | YES
 message_id     | character varying | YES
 error_message  | text              | YES
 metadata       | text              | YES
 sent_at        | timestamp         | YES
 created_at     | timestamp         | NO
```

---

### 2. 인덱스 확인
```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'notification_logs'
ORDER BY indexname;
```

**예상 결과**:
```
 indexname                              | indexdef
----------------------------------------+--------------------------------------------------
 idx_notification_logs_created_at       | CREATE INDEX ... ON notification_logs (created_at DESC)
 idx_notification_logs_status           | CREATE INDEX ... ON notification_logs (status)
 idx_notification_logs_type             | CREATE INDEX ... ON notification_logs (type)
 idx_notification_logs_user_id          | CREATE INDEX ... ON notification_logs (user_id)
 notification_logs_pkey                 | CREATE UNIQUE INDEX ... ON notification_logs (id)
```

---

### 3. 외래 키 확인
```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'notification_logs';
```

**예상 결과**:
```
 constraint_name               | table_name        | column_name | foreign_table_name | foreign_column_name
-------------------------------+-------------------+-------------+--------------------+---------------------
 notification_logs_user_id_fkey| notification_logs | user_id     | users              | id
```

---

### 4. 코멘트 확인
```sql
-- 테이블 코멘트
SELECT
  obj_description('notification_logs'::regclass, 'pg_class') AS table_comment;

-- 컬럼 코멘트
SELECT
  cols.column_name,
  pg_catalog.col_description('notification_logs'::regclass::oid, cols.ordinal_position) AS column_comment
FROM information_schema.columns cols
WHERE cols.table_name = 'notification_logs'
  AND pg_catalog.col_description('notification_logs'::regclass::oid, cols.ordinal_position) IS NOT NULL;
```

---

### 5. 테스트 데이터 삽입

#### users 테이블 테스트
```sql
-- 기존 사용자 업데이트 테스트
UPDATE users
SET phone = '010-1234-5678',
    notification_enabled = true
WHERE id = (SELECT id FROM users LIMIT 1);

-- 확인
SELECT id, email, phone, notification_enabled
FROM users
WHERE phone IS NOT NULL
LIMIT 5;
```

---

#### notification_logs 테이블 테스트
```sql
-- 테스트 로그 삽입
INSERT INTO notification_logs (
  user_id,
  type,
  channel,
  status,
  phone_number,
  message_id,
  metadata,
  created_at
) VALUES (
  (SELECT id FROM users LIMIT 1),
  'payment_success',
  'kakao',
  'sent',
  '010-1234-5678',
  'test-message-id-123',
  '{"tier": "standard", "amount": 29000}',
  CURRENT_TIMESTAMP
);

-- 확인
SELECT
  id,
  user_id,
  type,
  channel,
  status,
  phone_number,
  created_at
FROM notification_logs
ORDER BY created_at DESC
LIMIT 5;
```

---

## 롤백 방법

마이그레이션을 취소해야 하는 경우:

### 롤백 SQL

**파일**: `lib/db/migrations/0002_rollback_notification_system.sql`

```sql
-- Rollback: Remove Notification System
-- Created: 2025-11-13

-- Step 1: Drop notification_logs table
DROP TABLE IF EXISTS notification_logs CASCADE;

-- Step 2: Remove columns from users table
ALTER TABLE users
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS notification_enabled;
```

### 실행 방법

#### Supabase Dashboard
1. SQL Editor에서 위 롤백 SQL 실행

#### psql CLI
```bash
psql -h your-host.supabase.co -p 5432 -U postgres -d postgres -f lib/db/migrations/0002_rollback_notification_system.sql
```

---

## 문제 해결

### 문제 1: "ALTER TABLE" 권한 없음

**에러 메시지**:
```
ERROR: permission denied for table users
```

**원인**: 일반 사용자 권한으로 실행 시도

**해결**:
- Supabase Dashboard의 SQL Editor 사용 (postgres 권한)
- 또는 `service_role` 키 사용

---

### 문제 2: 컬럼이 이미 존재함

**에러 메시지**:
```
ERROR: column "phone" of relation "users" already exists
```

**원인**: 마이그레이션을 이미 실행함

**해결**:
- 정상 상황입니다. `IF NOT EXISTS` 구문으로 안전하게 처리됨
- 검증 쿼리로 확인:
  ```sql
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'users'
    AND column_name IN ('phone', 'notification_enabled');
  ```

---

### 문제 3: 외래 키 제약 조건 위반

**에러 메시지**:
```
ERROR: insert or update on table "notification_logs" violates foreign key constraint
```

**원인**: 존재하지 않는 `user_id` 참조 시도

**해결**:
```sql
-- 유효한 user_id 확인
SELECT id FROM users LIMIT 10;

-- 해당 user_id로 삽입
INSERT INTO notification_logs (user_id, ...)
VALUES ((SELECT id FROM users WHERE email = 'test@example.com'), ...);
```

---

### 문제 4: 인덱스 생성 실패

**에러 메시지**:
```
ERROR: relation "idx_notification_logs_user_id" already exists
```

**원인**: 인덱스를 이미 생성함

**해결**:
- 정상 상황입니다. `IF NOT EXISTS` 구문으로 안전하게 처리됨
- 인덱스 확인:
  ```sql
  SELECT indexname
  FROM pg_indexes
  WHERE tablename = 'notification_logs';
  ```

---

### 문제 5: 타임존 관련 문제

**증상**: `created_at`, `sent_at` 시간이 이상함

**원인**: 타임존 설정 문제

**해결**:
```sql
-- 현재 타임존 확인
SHOW timezone;

-- 한국 시간으로 변경
SET timezone = 'Asia/Seoul';

-- 또는 쿼리에서 명시적 변환
SELECT
  created_at AT TIME ZONE 'Asia/Seoul' AS created_at_kst
FROM notification_logs;
```

---

## 자동화 스크립트

### package.json에 스크립트 추가

```json
{
  "scripts": {
    "db:migrate": "tsx scripts/run-migration.ts",
    "db:rollback": "tsx scripts/run-rollback.ts",
    "db:verify": "tsx scripts/verify-migration.ts"
  }
}
```

### 사용 방법
```bash
# 마이그레이션 실행
pnpm db:migrate

# 롤백
pnpm db:rollback

# 검증
pnpm db:verify
```

---

## 배포 체크리스트

프로덕션 배포 전 확인 사항:

- [ ] 로컬 환경에서 마이그레이션 테스트 완료
- [ ] 스테이징 환경에서 마이그레이션 테스트 완료
- [ ] 롤백 스크립트 준비 완료
- [ ] 데이터베이스 백업 완료
- [ ] 마이그레이션 실행 시간 확인 (대용량 테이블의 경우)
- [ ] 외래 키 제약 조건 확인
- [ ] 인덱스 생성 시간 확인
- [ ] 프로덕션 환경에서 마이그레이션 실행
- [ ] 검증 쿼리로 최종 확인
- [ ] 애플리케이션 재시작 및 동작 확인

---

## 관련 문서

- [백엔드-프론트엔드 통합 연동 가이드](./BACKEND_FRONTEND_INTEGRATION_GUIDE.md)
- [알림 시스템 구현 가이드](./NOTIFICATION_SYSTEM_IMPLEMENTATION.md)
- [Drizzle ORM 스키마](./lib/db/schema.ts)

---

## 변경 이력

### 2025-11-13
- ✅ 알림 시스템 마이그레이션 작성
- ✅ users 테이블에 phone, notification_enabled 추가
- ✅ notification_logs 테이블 생성
- ✅ 인덱스 및 외래 키 제약 조건 추가
