# 환경 설정 가이드 (Environment Setup Guide)

AI Application Writer 결제 시스템을 위한 환경 설정 가이드입니다.

## 목차

1. [사전 요구사항](#사전-요구사항)
2. [환경 변수 설정](#환경-변수-설정)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [결제 시스템 설정](#결제-시스템-설정)
5. [AI 서비스 설정](#ai-서비스-설정)
6. [환경 검증](#환경-검증)
7. [문제 해결](#문제-해결)

---

## 사전 요구사항

### 필수 소프트웨어

- **Node.js**: v18 이상
- **pnpm**: v8 이상 (권장) 또는 npm
- **PostgreSQL**: v14 이상
- **Git**: 버전 관리용

### 필수 계정

다음 서비스의 계정이 필요합니다:

1. **Stripe** (https://stripe.com) - 결제 처리
2. **PortOne** (https://portone.io) - 한국 결제 게이트웨이
3. **Supabase** (https://supabase.com) - 데이터베이스 및 인증
4. **Anthropic** (https://www.anthropic.com) - Claude AI API
5. **OpenAI** (https://openai.com) - GPT API

---

## 환경 변수 설정

### 1. .env 파일 생성

```bash
# .env.example을 복사하여 .env 파일 생성
cp .env.example .env
```

### 2. 필수 환경 변수 설정

`.env` 파일을 열고 다음 변수들을 설정하세요:

#### 데이터베이스 (PostgreSQL)

```env
POSTGRES_URL=postgresql://user:password@host:5432/dbname
```

**설정 방법:**
1. PostgreSQL 데이터베이스 생성
2. 연결 URL 형식으로 입력
3. Supabase 사용 시 프로젝트 설정에서 확인 가능

#### 인증 (NextAuth)

```env
AUTH_SECRET=your-secret-key-here
```

**생성 방법:**
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

#### 결제 시스템 - Stripe

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**설정 방법:**
1. Stripe 대시보드 접속 (https://dashboard.stripe.com)
2. Developers → API keys에서 Secret key 복사
3. Developers → Webhooks에서 엔드포인트 추가:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`
4. Webhook signing secret 복사

#### 결제 시스템 - PortOne

```env
NEXT_PUBLIC_PORTONE_STORE_ID=store-...
PORTONE_WEBHOOK_SECRET=your-webhook-secret
```

**설정 방법:**
1. PortOne 콘솔 접속 (https://admin.portone.io)
2. 상점 설정에서 Store ID 확인
3. 웹훅 설정:
   - URL: `https://your-domain.com/api/portone/webhook`
   - 시크릿 키 생성 및 복사

#### 백엔드 API

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

**개발 환경:**
- `http://localhost:8000` (기본값)

**프로덕션 환경:**
- FastAPI 서버의 실제 URL 입력
- 예: `https://api.example.com`

#### AI 서비스

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

**설정 방법:**

**Anthropic (Claude):**
1. https://console.anthropic.com 접속
2. API Keys → Create Key
3. 생성된 키 복사

**OpenAI:**
1. https://platform.openai.com 접속
2. API keys → Create new secret key
3. 생성된 키 복사

#### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**설정 방법:**
1. Supabase 프로젝트 대시보드 접속
2. Settings → API에서 다음 정보 복사:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_KEY`

#### 베이스 URL

```env
BASE_URL=http://localhost:3000
```

**개발 환경:**
- `http://localhost:3000`

**프로덕션 환경:**
- 실제 도메인 입력
- 예: `https://app.example.com`

---

## 데이터베이스 설정

### 1. Supabase 프로젝트 생성

1. https://supabase.com 접속
2. "New Project" 클릭
3. 프로젝트 이름, 비밀번호, 리전 설정
4. 프로젝트 생성 완료 대기 (2-3분 소요)

### 2. 데이터베이스 스키마 생성

```bash
# Drizzle을 사용한 마이그레이션 실행
pnpm db:push

# 또는 수동으로 SQL 실행
# Supabase SQL Editor에서 lib/db/schema.ts의 스키마 실행
```

### 3. 테이블 생성 확인

필수 테이블:
- `users` - 사용자 정보
- `teams` - 팀 정보
- `user_credits` - 사용자 수정권 관리
- `payment_transactions` - 결제 기록

---

## 결제 시스템 설정

### Stripe 설정

#### 1. 테스트 모드 활성화

개발 중에는 테스트 모드 사용:
- API 키: `sk_test_...` 사용
- 테스트 카드 번호: `4242 4242 4242 4242`

#### 2. Webhook 엔드포인트 설정

```bash
# Stripe CLI 설치 (로컬 테스트용)
brew install stripe/stripe-cli/stripe

# Webhook 포워딩
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

#### 3. 프로덕션 배포 시

1. Stripe 대시보드에서 라이브 모드로 전환
2. 프로덕션 API 키로 환경 변수 업데이트
3. 프로덕션 도메인으로 Webhook URL 업데이트

### PortOne 설정

#### 1. 상점 및 PG 연동

1. PortOne 콘솔에서 상점 생성
2. PG사 연동 (테스트: 이니시스, KG이니시스 등)
3. Store ID 확인

#### 2. Webhook 설정

1. 콘솔 → 설정 → Webhook
2. URL 추가: `https://your-domain.com/api/portone/webhook`
3. 이벤트 선택: `payment.paid`, `payment.failed`
4. Webhook 시크릿 키 생성

#### 3. 결제 테스트

```typescript
// 테스트 결제 정보
{
  cardNumber: "1234-1234-1234-1234",
  expiry: "12/25",
  birth: "990101",
  pwd_2digit: "00"
}
```

---

## AI 서비스 설정

### Anthropic (Claude) 설정

#### 1. API 키 발급

1. https://console.anthropic.com 접속
2. API Keys → Create Key
3. 키 이름 입력 후 생성
4. 생성된 키를 `.env`에 추가

#### 2. 사용량 제한 설정

1. Settings → Usage Limits
2. 월별 사용량 한도 설정 (권장: 개발 시 $50-100)
3. 알림 설정

#### 3. 모델 선택

현재 사용 중인 모델:
- `claude-3-5-sonnet-20241022` (기본)
- `claude-3-opus-20240229` (고급 작성)

### OpenAI 설정

#### 1. API 키 발급

1. https://platform.openai.com 접속
2. API keys → Create new secret key
3. 키 이름 입력 후 생성
4. 생성된 키를 `.env`에 추가

#### 2. 사용량 제한 설정

1. Settings → Billing → Usage limits
2. 월별 한도 설정
3. 알림 이메일 설정

#### 3. 모델 선택

사용 가능한 모델:
- `gpt-4o` (고성능)
- `gpt-4o-mini` (비용 효율적)
- `gpt-3.5-turbo` (빠른 처리)

---

## 환경 검증

### 1. 환경 변수 검증 스크립트 실행

```bash
# TypeScript 실행을 위한 tsx 설치 (한 번만)
pnpm add -D tsx

# 환경 변수 검증
pnpm tsx scripts/validate-env.ts
```

### 2. 검증 항목

스크립트가 자동으로 확인하는 항목:
- ✅ 모든 필수 환경 변수 존재 여부
- ✅ 환경 변수 형식 유효성
- ✅ Node.js 버전 호환성
- ✅ 연결 URL 형식

### 3. 수동 검증

#### 데이터베이스 연결 테스트

```bash
pnpm db:studio
# Drizzle Studio가 열리면 연결 성공
```

#### API 연결 테스트

```bash
# FastAPI 서버 시작 (별도 터미널)
cd ../frontend
uvicorn app:app --reload

# Next.js 개발 서버 시작
pnpm dev

# 브라우저에서 http://localhost:3000 접속
```

#### 결제 시스템 테스트

1. 개발 서버 실행 후 `/pricing` 페이지 접속
2. 테스트 결제 진행:
   - Basic 티어 선택
   - 테스트 카드로 결제
   - 성공 메시지 확인
3. `/mypage`에서 수정권 할당 확인

---

## 문제 해결

### 일반적인 문제

#### 1. "AUTH_SECRET is not set" 오류

**원인:** AUTH_SECRET 환경 변수 미설정

**해결:**
```bash
# 새 시크릿 생성
openssl rand -base64 32

# .env 파일에 추가
echo "AUTH_SECRET=생성된-시크릿" >> .env
```

#### 2. "Database connection failed" 오류

**원인:** PostgreSQL 연결 정보 오류

**해결:**
1. POSTGRES_URL 형식 확인:
   ```
   postgresql://user:password@host:5432/database
   ```
2. Supabase 사용 시:
   - Settings → Database → Connection string 확인
   - "Connection Pooling" 사용 권장
   - URI 형식으로 복사

#### 3. "PortOne payment failed" 오류

**원인:** PortOne 설정 오류 또는 PG 연동 문제

**해결:**
1. Store ID 확인:
   ```env
   NEXT_PUBLIC_PORTONE_STORE_ID=store-your-actual-id
   ```
2. 테스트 결제 활성화 확인 (PortOne 콘솔)
3. Webhook URL 설정 확인
4. 브라우저 콘솔에서 자세한 에러 메시지 확인

#### 4. "Webhook signature verification failed" 오류

**원인:** Webhook 시크릿 불일치

**해결:**
1. PortOne 콘솔에서 Webhook 시크릿 재확인
2. `.env` 파일의 `PORTONE_WEBHOOK_SECRET` 업데이트
3. 서버 재시작

#### 5. "AI API key is invalid" 오류

**원인:** API 키 형식 오류 또는 만료

**해결:**
1. API 키 형식 확인:
   - Anthropic: `sk-ant-...`
   - OpenAI: `sk-...`
2. 콘솔에서 키 유효성 확인
3. 필요 시 새 키 발급

### 개발 환경 문제

#### 포트 충돌

```bash
# 다른 프로세스가 3000번 포트 사용 중인 경우

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID [PID번호] /F
```

#### 캐시 문제

```bash
# Next.js 캐시 삭제
rm -rf .next

# node_modules 재설치
rm -rf node_modules
pnpm install

# 서버 재시작
pnpm dev
```

### 프로덕션 배포 문제

#### 1. 환경 변수 미설정

**Vercel 배포 시:**
1. Project Settings → Environment Variables
2. 모든 환경 변수 추가 (`.env`의 내용)
3. Production, Preview, Development 환경 선택
4. 재배포

#### 2. Webhook URL 업데이트

프로덕션 배포 후:
1. Stripe 대시보드에서 Webhook URL 업데이트
2. PortOne 콘솔에서 Webhook URL 업데이트
3. 프로덕션 도메인 사용

#### 3. CORS 오류

**FastAPI 서버 설정 확인:**
```python
# frontend/app.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-production-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 보안 체크리스트

배포 전 필수 확인 사항:

- [ ] `.env` 파일을 `.gitignore`에 추가
- [ ] 프로덕션 API 키 사용 (테스트 키 제거)
- [ ] Webhook 시크릿 설정 및 검증 활성화
- [ ] HTTPS 사용 (HTTP 비활성화)
- [ ] CORS 설정 확인 (허용 도메인 제한)
- [ ] Rate limiting 설정
- [ ] 에러 메시지에 민감 정보 포함되지 않도록 확인
- [ ] 데이터베이스 백업 설정
- [ ] 모니터링 및 알림 설정

---

## 추가 리소스

### 공식 문서

- [Next.js 문서](https://nextjs.org/docs)
- [NextAuth.js 문서](https://next-auth.js.org)
- [Stripe 문서](https://stripe.com/docs)
- [PortOne 문서](https://portone.gitbook.io/docs)
- [Supabase 문서](https://supabase.com/docs)
- [Anthropic API 문서](https://docs.anthropic.com)
- [OpenAI API 문서](https://platform.openai.com/docs)

### 팀 문서

- [API 문서](./API_DOCUMENTATION.md)
- [테스트 가이드](./tests/README.md)
- [배포 가이드](./DEPLOYMENT_GUIDE.md)
- [운영 로그](../PROJECT_DOCS/OPERATION_LOG_2025_11.md)

---

## 지원

문제가 해결되지 않는 경우:

1. GitHub Issues에 문제 보고
2. 팀 Slack 채널에 질문
3. 운영 로그 확인 (`PROJECT_DOCS/OPERATION_LOG_2025_11.md`)

---

**마지막 업데이트:** 2025-11-13
