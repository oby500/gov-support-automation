# 백엔드-프론트엔드 통합 연동 가이드

## 📋 목차
1. [개요](#개요)
2. [API 연동 구조](#api-연동-구조)
3. [결제 완료 플로우](#결제-완료-플로우)
4. [알림 시스템 연동](#알림-시스템-연동)
5. [에러 핸들링](#에러-핸들링)
6. [테스트 가이드](#테스트-가이드)
7. [문제 해결](#문제-해결)

---

## 개요

이 문서는 Next.js 프론트엔드와 FastAPI 백엔드 간의 결제 시스템 및 알림 시스템 연동을 설명합니다.

### 주요 컴포넌트
- **프론트엔드**: Next.js 15 (App Router, Server Actions)
- **백엔드**: FastAPI (Python)
- **알림**: 카카오 알림톡 + 네이버 SENS SMS (하이브리드)
- **인증**: NextAuth v5
- **데이터베이스**: PostgreSQL (Supabase)

---

## API 연동 구조

### 1. 결제 완료 API

#### 프론트엔드 → 백엔드 요청

**엔드포인트**: `POST /api/application-writer/payment-complete`

**요청 헤더**:
```http
Content-Type: application/json
```

**요청 바디**:
```json
{
  "paymentId": "port-one-payment-id-123",
  "tier": "standard",
  "amount": 29000,
  "announcementId": "KS_123456",
  "announcementSource": "kstartup"
}
```

**필드 설명**:
- `paymentId` (string, 필수): PortOne 결제 ID
- `tier` (string, 필수): 선택한 티어 (`basic` | `standard` | `premium`)
- `amount` (number, 필수): 결제 금액 (원)
- `announcementId` (string, 필수): 공고 ID
- `announcementSource` (string, 선택): 공고 출처

---

#### 프론트엔드 API → FastAPI 백엔드 전달

**엔드포인트**: `POST /api/application/payment-complete`

**요청 바디**:
```json
{
  "payment_id": "port-one-payment-id-123",
  "user_id": "user-123",
  "tier": "standard",
  "amount": 29000,
  "announcement_id": "KS_123456"
}
```

**필드 변환**:
- `paymentId` → `payment_id` (snake_case 변환)
- `announcementId` → `announcement_id` (snake_case 변환)
- `user_id`는 NextAuth 세션에서 자동으로 추출 (보안)

---

#### 백엔드 응답 형식

**성공 응답** (200 OK):
```json
{
  "success": true,
  "message": "standard 티어 결제가 완료되었습니다. 수정권 3개가 부여되었습니다.",
  "credits": {
    "tier_credits": 3,
    "total_available": 3
  },
  "tier": "standard",
  "payment_id": "port-one-payment-id-123",
  "announcement_id": "KS_123456"
}
```

**중요**: `credits` 객체는 백엔드에서 **명시적으로 생성**됩니다:
- ✅ 수정 전: `{"tier_credits": 3, "total_balance": 3}` (최상위)
- ✅ 수정 후: `{"credits": {"tier_credits": 3, "total_available": 3}}` (중첩)

---

#### 프론트엔드 최종 응답

**클라이언트에게 반환**:
```json
{
  "success": true,
  "credits": {
    "tier_credits": 3,
    "total_available": 3
  },
  "message": "결제가 완료되고 수정권이 할당되었습니다."
}
```

---

## 결제 완료 플로우

### 전체 흐름도

```
[사용자]
   ↓ PortOne 결제 완료
[프론트엔드 - PortOne Callback]
   ↓ POST /api/application-writer/payment-complete
[Next.js API Route]
   ↓ 1. 세션 검증 (getCurrentUser)
   ↓ 2. 파라미터 검증
   ↓ 3. POST /api/application/payment-complete (withRetry)
[FastAPI 백엔드]
   ↓ 1. revision_credits 테이블 업데이트
   ↓ 2. 수정권 할당
   ↓ 3. 응답 반환 (credits 객체 포함)
[Next.js API Route]
   ↓ 1. 사용자 정보 조회 (전화번호)
   ↓ 2. 알림 발송 (카카오 → SMS 폴백)
   ↓ 3. 최종 응답 반환
[프론트엔드]
   ↓ PaymentSuccessDialog 표시
[사용자]
```

---

### 코드 흐름 상세

#### 1. Next.js API Route (`payment-complete/route.ts`)

```typescript
// 1단계: 인증 확인
const user = await getCurrentUser();
if (!user || !user.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// 2단계: 백엔드 호출 (재시도 로직 포함)
const result = await withRetry(async () => {
  const response = await fetch(`${backendUrl}/api/application/payment-complete`, {
    method: 'POST',
    body: JSON.stringify({
      payment_id: paymentId,
      user_id: userId,
      tier,
      amount,
      announcement_id: announcementId,
    }),
  });

  if (!response.ok) {
    // 5xx, 429, 408, 504는 재시도
    // 4xx는 즉시 실패
    throw new Error(/* ... */);
  }

  return await response.json();
}, {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
});

// 3단계: 알림 발송 (실패해도 결제는 성공)
try {
  const [userInfo] = await db
    .select({ phone: users.phone, notificationEnabled: users.notificationEnabled })
    .from(users)
    .where(eq(users.id, parseInt(userId)));

  if (userInfo?.notificationEnabled && userInfo.phone) {
    await sendNotificationSafe('payment', { /* ... */ });
  }
} catch (error) {
  console.error('Notification failed:', error);
  // 계속 진행 (알림 실패는 결제에 영향 없음)
}

// 4단계: 최종 응답
return NextResponse.json({
  success: true,
  credits: result.credits,
  message: '결제가 완료되고 수정권이 할당되었습니다.',
});
```

---

#### 2. FastAPI 백엔드 (`application_impl.py`)

```python
@router.post("/payment-complete")
async def handle_payment_complete(
    payment_id: str,
    user_id: str,
    tier: str,
    amount: int,
    announcement_id: str
):
    # 1단계: 티어별 수정권 개수 결정
    tier_credits_map = {
        "basic": 2,
        "standard": 3,
        "premium": 4
    }
    tier_credits = tier_credits_map.get(tier, 0)

    # 2단계: revision_credits 테이블 업데이트
    existing_credits = supabase.table("revision_credits").select("*").eq("user_id", user_id).execute()

    if not existing_credits.data:
        # 새 레코드 생성
        supabase.table("revision_credits").insert({
            "user_id": user_id,
            "current_tier": tier,
            "tier_credits_total": tier_credits,
            "tier_credits_used": 0,
        }).execute()
    else:
        # 기존 레코드 업데이트 (티어 업그레이드만 허용)
        supabase.table("revision_credits").update({
            "current_tier": tier,
            "tier_credits_total": tier_credits,
            "tier_credits_used": 0,  # 리셋
        }).eq("user_id", user_id).execute()

    # 3단계: 최종 잔액 조회
    final_balance = supabase.table("revision_credits").select("total_available").eq("user_id", user_id).execute()

    # 4단계: 응답 반환 (credits 객체로 감싸기)
    return {
        "success": True,
        "message": f"{tier} 티어 결제가 완료되었습니다. 수정권 {tier_credits}개가 부여되었습니다.",
        "credits": {
            "tier_credits": tier_credits,
            "total_available": final_balance.data[0]["total_available"]
        },
        "tier": tier,
        "payment_id": payment_id,
        "announcement_id": announcement_id
    }
```

---

## 알림 시스템 연동

### 하이브리드 전략

1. **1차 시도**: 카카오 알림톡 (7원, 95% 도달률)
2. **2차 시도**: 네이버 SENS SMS (30원, 100% 도달률)

### 발송 조건

알림은 다음 조건을 **모두 만족**할 때만 발송됩니다:
- ✅ `users.notification_enabled = true` (알림 수신 동의)
- ✅ `users.phone IS NOT NULL` (전화번호 등록됨)
- ✅ 개발 환경이 아님 (`NODE_ENV !== 'development'`)

### 알림 발송 플로우

```typescript
// 1단계: 사용자 정보 조회
const [userInfo] = await db
  .select({
    name: users.name,
    email: users.email,
    phone: users.phone,
    notificationEnabled: users.notificationEnabled,
  })
  .from(users)
  .where(eq(users.id, parseInt(userId)))
  .limit(1);

// 2단계: 발송 여부 확인
if (!userInfo?.notificationEnabled || !userInfo.phone) {
  console.log('Notification skipped');
  return; // 알림 건너뛰기
}

// 3단계: 알림 발송
await sendNotificationSafe('payment', {
  userId: parseInt(userId),
  phoneNumber: userInfo.phone,
  userName: userInfo.name || userInfo.email || '고객님',
  tier: tier as 'basic' | 'standard' | 'premium',
  credits: tierCreditsMap[tier],
  amount,
  paymentDate: new Date().toLocaleString('ko-KR'),
});
```

### 알림 내용

**카카오 알림톡**:
```
[AI 신청서 작성 도우미] 결제 완료

{userName}님, 결제가 완료되었습니다!

선택한 티어: {tier}
수정권 개수: {credits}개
결제 금액: {amount:,}원
결제 일시: {paymentDate}

지금 바로 AI 신청서 작성을 시작하세요!
```

**SMS 폴백**:
```
[AI 신청서 작성] 결제 완료
{tier} 티어, 수정권 {credits}개 부여
금액: {amount:,}원
```

---

## 에러 핸들링

### 재시도 로직

프론트엔드 API는 백엔드 호출 시 **자동 재시도**를 수행합니다:

- **재시도 조건**:
  - 5xx 서버 에러
  - 429 Rate Limit
  - 408 Request Timeout
  - 504 Gateway Timeout

- **재시도하지 않는 조건**:
  - 4xx 클라이언트 에러 (잘못된 요청)

- **재시도 설정**:
  - 최대 3회 시도
  - 지수 백오프: 1초 → 2초 → 4초

```typescript
await withRetry(async () => {
  const response = await fetch(/* ... */);

  if (!response.ok) {
    if (response.status >= 500 && response.status < 600) {
      throw new Error(`${PaymentErrorCode.SERVER_ERROR}: ...`);
    } else if (response.status === 429) {
      throw new Error(`${PaymentErrorCode.RATE_LIMIT}: ...`);
    } else if (response.status === 408 || response.status === 504) {
      throw new Error(`${PaymentErrorCode.TIMEOUT}: ...`);
    } else {
      throw new Error(`${PaymentErrorCode.VALIDATION_ERROR}: ...`);
    }
  }

  return await response.json();
}, {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
});
```

---

### 에러 응답 형식

#### 백엔드 에러 (FastAPI)

```json
{
  "detail": "Invalid tier: ultra"
}
```

#### 프론트엔드 에러 (Next.js)

```json
{
  "error": "Payment processing failed",
  "message": "VALIDATION_ERROR: Invalid tier: ultra"
}
```

---

### 알림 실패 처리

알림 발송 실패는 **결제 성공에 영향을 주지 않습니다**:

```typescript
try {
  await sendNotificationSafe('payment', { /* ... */ });
  console.log('Payment notification sent successfully');
} catch (notificationError) {
  // 로그만 남기고 계속 진행
  console.error('Failed to send payment notification:', notificationError);
}

// 알림 실패와 관계없이 결제 성공 응답 반환
return NextResponse.json({
  success: true,
  credits: result.credits,
  message: '결제가 완료되고 수정권이 할당되었습니다.',
});
```

---

## 테스트 가이드

### 1. 로컬 환경 테스트

#### 사전 준비

1. **백엔드 서버 실행**:
   ```bash
   cd E:/gov-support-automation/frontend
   uvicorn app:app --reload --port 8000
   ```

2. **프론트엔드 서버 실행**:
   ```bash
   cd E:/gov-support-automation/frontend-saas
   pnpm dev
   ```

3. **환경 변수 확인**:
   ```bash
   # frontend-saas/.env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   POSTGRES_URL=postgresql://...
   AUTH_SECRET=...
   ```

---

#### 테스트 시나리오

**시나리오 1: 정상 결제 플로우**

1. **로그인**: 테스트 사용자로 로그인
2. **공고 선택**: 공고 상세 페이지 이동
3. **티어 선택**: Standard 티어 선택
4. **결제 진행**: PortOne 테스트 결제
5. **결과 확인**:
   - PaymentSuccessDialog 표시 확인
   - 수정권 3개 부여 확인
   - 브라우저 콘솔에서 로그 확인
   - 네트워크 탭에서 API 호출 확인

**예상 로그**:
```
Application Writer payment complete: { paymentId: '...', tier: 'standard', ... }
Payment processing successful: { success: true, credits: { ... } }
Payment notification sent successfully (또는 Notification skipped)
```

---

**시나리오 2: 백엔드 일시 장애 (재시도 테스트)**

1. **백엔드 서버 중지**:
   ```bash
   # 백엔드 서버 터미널에서 Ctrl+C
   ```

2. **결제 시도**: 프론트엔드에서 결제 진행

3. **재시도 확인**:
   - 브라우저 콘솔에서 재시도 로그 확인
   - 1초, 2초, 4초 지연 확인

4. **백엔드 서버 재시작**:
   ```bash
   uvicorn app:app --reload --port 8000
   ```

5. **재시도 성공 확인**: 최종적으로 성공 메시지 표시

---

**시나리오 3: 잘못된 티어 (4xx 에러 테스트)**

1. **개발자 도구 열기**: F12
2. **Console에서 직접 호출**:
   ```javascript
   fetch('/api/application-writer/payment-complete', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       paymentId: 'test-123',
       tier: 'ultra', // 잘못된 티어
       amount: 10000,
       announcementId: 'KS_123',
     })
   }).then(res => res.json()).then(console.log);
   ```

3. **예상 응답**:
   ```json
   {
     "error": "Invalid tier",
     "status": 400
   }
   ```

---

**시나리오 4: 알림 발송 테스트**

1. **데이터베이스에서 사용자 확인**:
   ```sql
   SELECT id, email, phone, notification_enabled
   FROM users
   WHERE email = 'test@example.com';
   ```

2. **전화번호 및 알림 동의 설정**:
   ```sql
   UPDATE users
   SET phone = '010-1234-5678',
       notification_enabled = true
   WHERE email = 'test@example.com';
   ```

3. **결제 진행**: 정상 결제 플로우 수행

4. **알림 로그 확인**:
   ```sql
   SELECT *
   FROM notification_logs
   WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
   ORDER BY created_at DESC
   LIMIT 5;
   ```

5. **예상 결과**:
   - `status = 'sent'` (성공)
   - `channel = 'kakao'` (카카오 알림톡) 또는 `'sms'` (SMS 폴백)
   - `metadata`에 결제 정보 포함

---

### 2. API 직접 테스트

#### cURL로 백엔드 API 테스트

```bash
curl -X POST http://localhost:8000/api/application/payment-complete \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": "test-payment-123",
    "user_id": "user-123",
    "tier": "standard",
    "amount": 29000,
    "announcement_id": "KS_123456"
  }'
```

**예상 응답**:
```json
{
  "success": true,
  "message": "standard 티어 결제가 완료되었습니다. 수정권 3개가 부여되었습니다.",
  "credits": {
    "tier_credits": 3,
    "total_available": 3
  },
  "tier": "standard",
  "payment_id": "test-payment-123",
  "announcement_id": "KS_123456"
}
```

---

#### Postman/Insomnia로 프론트엔드 API 테스트

**주의**: 프론트엔드 API는 **세션 인증 필요**하므로, 브라우저에서 로그인 후 쿠키를 복사해야 합니다.

1. **브라우저에서 로그인**
2. **개발자 도구 → Application → Cookies**: `next-auth.session-token` 복사
3. **Postman에서 요청**:

```http
POST http://localhost:3000/api/application-writer/payment-complete
Content-Type: application/json
Cookie: next-auth.session-token=<복사한 토큰>

{
  "paymentId": "test-payment-456",
  "tier": "premium",
  "amount": 49000,
  "announcementId": "KS_789012"
}
```

---

### 3. 통합 테스트

#### E2E 테스트 시나리오

```typescript
// test/e2e/payment-flow.spec.ts
import { test, expect } from '@playwright/test';

test('Complete payment flow with notification', async ({ page }) => {
  // 1. 로그인
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'test-password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');

  // 2. 공고 선택
  await page.goto('/announcement/KS_123456');
  await page.click('button:has-text("신청서 작성하기")');

  // 3. 티어 선택
  await page.click('[data-tier="standard"]');
  await page.click('button:has-text("결제하기")');

  // 4. PortOne 결제 (테스트 모드)
  // ... (PortOne iframe 처리)

  // 5. 결제 완료 확인
  await page.waitForSelector('[data-testid="payment-success-dialog"]');
  const credits = await page.textContent('[data-testid="credits-display"]');
  expect(credits).toContain('3');

  // 6. 데이터베이스 확인
  const db = await getTestDatabase();
  const revisionCredits = await db.query(
    'SELECT * FROM revision_credits WHERE user_id = $1',
    ['test-user-id']
  );
  expect(revisionCredits[0].tier_credits_total).toBe(3);
  expect(revisionCredits[0].current_tier).toBe('standard');
});
```

---

## 문제 해결

### 1. "결제는 성공했는데 수정권이 부여되지 않음"

**원인**: 백엔드 API 호출 실패

**확인 방법**:
```typescript
// 브라우저 콘솔에서 확인
console.log('NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
```

**해결**:
1. `.env` 파일 확인:
   ```bash
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

2. 백엔드 서버 실행 상태 확인:
   ```bash
   curl http://localhost:8000/health
   ```

3. 네트워크 탭에서 API 호출 확인:
   - Status: 200 OK 확인
   - Response에 `credits` 객체 포함 확인

---

### 2. "알림이 발송되지 않음"

**원인 1**: 사용자가 알림 수신에 동의하지 않음

**해결**:
```sql
UPDATE users
SET notification_enabled = true,
    phone = '010-1234-5678'
WHERE id = <사용자 ID>;
```

---

**원인 2**: 개발 환경에서 실제 발송 차단

**확인**:
```typescript
// lib/notifications/send.ts
if (process.env.NODE_ENV === 'development') {
  console.log('🔔 [DEV] Notification not sent in development');
  return { success: true };
}
```

**해결**: 프로덕션 환경에서 테스트하거나, `NODE_ENV=production`으로 설정

---

**원인 3**: 카카오/네이버 API 키 미설정

**확인**:
```bash
# .env 파일 확인
KAKAO_SENDER_KEY=
KAKAO_ALIMTALK_API_KEY=
NAVER_SENS_ACCESS_KEY=
NAVER_SENS_SECRET_KEY=
NAVER_SENS_SERVICE_ID=
NAVER_SENS_FROM_NUMBER=
```

**해결**: 환경 변수 설정 후 서버 재시작

---

### 3. "API 응답에 `credits` 필드가 없음"

**원인**: 백엔드가 구버전 응답 형식 사용

**확인**:
```python
# frontend/routers/application_impl.py
return {
    "success": True,
    "tier_credits": tier_credits,  # ❌ 구버전
    "total_balance": balance_info["total_available"],  # ❌ 구버전
}
```

**해결**: 백엔드 응답 형식 수정
```python
return {
    "success": True,
    "credits": {  # ✅ 신버전
        "tier_credits": tier_credits,
        "total_available": balance_info["total_available"]
    },
}
```

---

### 4. "재시도 후에도 계속 실패함"

**원인**: 4xx 클라이언트 에러 (재시도하지 않음)

**확인**:
```
Backend payment processing failed: {
  status: 400,
  error: { detail: "Invalid tier: ultra" }
}
```

**해결**: 잘못된 파라미터 수정
- `tier`는 반드시 `basic`, `standard`, `premium` 중 하나여야 함

---

### 5. "데이터베이스에서 수정권이 보이지 않음"

**원인 1**: `revision_credits` 테이블 누락

**해결**:
```sql
-- 테이블 존재 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'revision_credits';

-- 테이블이 없으면 생성 (백엔드에서 자동 생성되어야 함)
```

---

**원인 2**: `user_id` 타입 불일치

**확인**:
```sql
-- user_id가 문자열인지 숫자인지 확인
SELECT user_id, pg_typeof(user_id)
FROM revision_credits
LIMIT 1;
```

**해결**: 프론트엔드 API에서 `parseInt(userId)` 사용 확인

---

## 추가 리소스

### 관련 문서
- [알림 시스템 구현 가이드](./NOTIFICATION_SYSTEM_IMPLEMENTATION.md)
- [결제 시스템 설정 가이드](./SETUP_GUIDE.md)
- [환경 변수 검증 스크립트](./scripts/validate-env.ts)

### 주요 파일 위치
- **프론트엔드 API**: `frontend-saas/app/api/application-writer/payment-complete/route.ts`
- **백엔드 API**: `frontend/routers/application_impl.py` (line 1018-1127)
- **알림 발송**: `frontend-saas/lib/notifications/send.ts`
- **재시도 로직**: `frontend-saas/lib/errors/payment-errors.ts`

### 데이터베이스 스키마
- **users**: 사용자 정보 (phone, notification_enabled)
- **revision_credits**: 수정권 잔액
- **notification_logs**: 알림 발송 로그

---

## 변경 이력

### 2025-11-13
- ✅ 백엔드 응답 형식 수정 (`credits` 객체로 중첩)
- ✅ 알림 시스템 연동 추가
- ✅ 재시도 로직 강화 (withRetry)
- ✅ 에러 핸들링 개선
- ✅ 통합 연동 가이드 작성
