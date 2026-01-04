# 통합 테스트 가이드

## 개요

이 디렉토리에는 결제 시스템 통합 테스트가 포함되어 있습니다.

## 테스트 시나리오

### 1. Application Writer 티어 결제 플로우
- ✅ Basic 티어 결제 → 2회 수정권 할당
- ✅ Standard 티어로 업그레이드 → 3회 수정권 할당
- ✅ Premium 티어로 업그레이드 → 4회 수정권 할당
- ✅ 티어 다운그레이드 방지 (Premium → Basic 불가)

### 2. 수정권 구매 플로우
- ✅ 수정권 1회 구매 (₩500)
- ✅ 수정권 5회 구매 (₩2,000, 가장 인기)
- ✅ 수정권 10회 구매 (₩3,500, 최대 할인)

### 3. 수정권 잔액 조회
- ✅ 현재 티어 수정권 확인
- ✅ 구매한 수정권 확인
- ✅ 총 사용 가능한 수정권 확인

### 4. 에러 케이스
- ✅ 유효하지 않은 티어
- ✅ 유효하지 않은 수정권 수량
- ✅ 필수 파라미터 누락

## 실행 방법

### 전제 조건

1. **FastAPI 백엔드 실행** (포트 8000)
```bash
cd E:\gov-support-automation\frontend
python -m uvicorn app:app --reload
```

2. **Supabase 연결** (.env 파일 확인)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 테스트 실행

```bash
# 1. 의존성 설치
cd E:\gov-support-automation\frontend-saas
npm install --save-dev @jest/globals jest ts-jest @types/jest

# 2. Jest 설정 파일 생성 (jest.config.js)
npx jest --init

# 3. 통합 테스트 실행
npm test tests/integration/payment-flow.test.ts

# 4. 전체 테스트 실행
npm test
```

### Jest 설정 (jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

## 수동 테스트 방법

### 1. Postman/Thunder Client 사용

#### Application Writer 결제 완료
```http
POST http://localhost:8000/api/application/payment-complete
Content-Type: application/json

{
  "payment_id": "test-payment-001",
  "user_id": "test-user-001",
  "tier": "basic",
  "amount": 4900,
  "announcement_id": "test-announcement-001"
}
```

#### 수정권 구매
```http
POST http://localhost:8000/api/application/purchase-revision-credits
Content-Type: application/json

{
  "user_id": "test-user-001",
  "quantity": 5,
  "payment_id": "test-revision-001",
  "order_id": "revision_1700000000000"
}
```

#### 수정권 잔액 조회
```http
GET http://localhost:8000/api/application/revision-credits/test-user-001
```

### 2. curl 사용

```bash
# Basic 티어 결제
curl -X POST http://localhost:8000/api/application/payment-complete \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": "test-basic-001",
    "user_id": "test-user-001",
    "tier": "basic",
    "amount": 4900,
    "announcement_id": "test-announcement-001"
  }'

# 수정권 5회 구매
curl -X POST http://localhost:8000/api/application/purchase-revision-credits \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-001",
    "quantity": 5,
    "payment_id": "test-revision-001",
    "order_id": "revision_'$(date +%s)'"
  }'

# 수정권 잔액 조회
curl http://localhost:8000/api/application/revision-credits/test-user-001
```

## 테스트 결과 예시

### 성공 케이스

#### Basic 티어 결제 완료
```json
{
  "user_id": "test-user-001",
  "tier_credits": 2,
  "purchased_credits": 0,
  "total_available": 2,
  "current_tier": "basic",
  "announcement_id": "test-announcement-001"
}
```

#### 수정권 5회 구매 완료
```json
{
  "user_id": "test-user-001",
  "tier_credits": 2,
  "purchased_credits": 5,
  "total_available": 7,
  "current_tier": "basic"
}
```

### 실패 케이스

#### 티어 다운그레이드 시도
```json
{
  "detail": "Cannot downgrade from premium to basic"
}
```

#### 유효하지 않은 티어
```json
{
  "detail": "Invalid tier: invalid-tier"
}
```

## 데이터베이스 확인

### Supabase SQL Editor

```sql
-- 수정권 테이블 확인
SELECT * FROM revision_credits
WHERE user_id = 'test-user-001';

-- 수정권 구매 내역 확인
SELECT * FROM revision_purchases
WHERE user_id = 'test-user-001'
ORDER BY created_at DESC;

-- 수정권 사용 내역 확인
SELECT * FROM revision_usage
WHERE user_id = 'test-user-001'
ORDER BY created_at DESC;
```

## 트러블슈팅

### 문제 1: FastAPI 백엔드 연결 실패
**증상**: `ECONNREFUSED` 에러
**해결**:
```bash
# 백엔드가 실행 중인지 확인
cd E:\gov-support-automation\frontend
python -m uvicorn app:app --reload --port 8000
```

### 문제 2: Supabase 연결 실패
**증상**: `Connection refused` 또는 `Authentication failed`
**해결**:
- `.env` 파일에 `SUPABASE_URL`과 `SUPABASE_SERVICE_KEY` 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 문제 3: 결제 완료 후 수정권이 할당되지 않음
**증상**: 결제는 완료되었으나 DB에 반영 안 됨
**해결**:
- FastAPI 로그 확인: `tail -f logs/app.log`
- Supabase 테이블 확인: `SELECT * FROM revision_credits;`
- 네트워크 로그 확인: Browser DevTools → Network

## 다음 단계

1. ✅ 통합 테스트 스크립트 작성
2. ⏳ PortOne Webhook 시그니처 검증 구현
3. ⏳ 결제 완료 이메일 발송 기능
4. ⏳ 에러 처리 및 재시도 로직 강화
5. ⏳ 프로덕션 배포 및 모니터링
