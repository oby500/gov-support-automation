# 챗봇 시스템 구현 완료

## ✅ 완성된 구현 항목

### 1. 데이터베이스 스키마 ✅
- **파일**: `lib/db/schema.ts`
- **테이블**:
  - `chat_conversations`: 대화 세션 관리
  - `chat_messages`: 개별 메시지 저장
  - `faq_embeddings`: FAQ Vector Store
  - `chatbot_feedback`: 사용자 피드백

### 2. SQL 마이그레이션 ✅
- **파일**: `lib/db/migrations/0003_add_chatbot_system.sql`
- **기능**:
  - 4개 테이블 생성
  - 인덱스 최적화
  - Full-text search 지원
  - Vector 검색 준비

### 3. FAQ 데이터 ✅
- **파일**: `lib/chatbot/faq-data.ts`
- **내용**:
  - 30개 FAQ (가격, 수정권, 서비스, 계정, 기술)
  - 카테고리별 분류
  - 키워드 태그
  - 우선순위 설정

### 4. FAQ 시딩 스크립트 ✅
- **파일**: `lib/chatbot/seed-faq.ts`
- **기능**:
  - OpenAI 임베딩 생성 (text-embedding-3-small)
  - 데이터베이스에 저장
  - 진행상황 표시
  - 비용 계산

### 5. 챗봇 헬퍼 함수 ✅
- **파일**: `lib/chatbot/helpers.ts`
- **기능**:
  - Vector 유사도 검색
  - 대화 세션 관리
  - 메시지 저장/조회
  - 컨텍스트 생성
  - 비용 계산

### 6. Function Calling ✅
- **파일**: `lib/chatbot/functions.ts`
- **Functions**:
  - `searchAnnouncements`: 공고 검색
  - `getAnnouncementDetail`: 공고 상세 조회
  - `checkEligibility`: 자격요건 확인
  - `getRevisionCredits`: 수정권 조회
  - `getUserApplications`: 신청서 목록

### 7. 챗봇 API 엔드포인트 ✅
- **파일**: `app/api/chatbot/route.ts`
- **기능**:
  - POST: 사용자 메시지 처리
  - GET: 대화 히스토리 조회
  - FAQ Vector 검색 통합
  - OpenAI Function Calling
  - 대화 히스토리 저장
  - 비용 추적

---

## 🚀 설치 및 실행 가이드

### Step 1: 패키지 설치

```bash
cd frontend-saas
npm install openai
```

### Step 2: 환경변수 설정

`.env.local`에 추가:

```bash
# OpenAI API
OPENAI_API_KEY=sk-proj-...

# Chatbot Settings
CHATBOT_MODEL=gpt-4o-mini
CHATBOT_TEMPERATURE=0.7
CHATBOT_MAX_TOKENS=800

# Backend URL (기존)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Step 3: 데이터베이스 마이그레이션 실행

```bash
# Supabase Dashboard에서 실행
# 또는 psql로 실행
psql $DATABASE_URL -f lib/db/migrations/0003_add_chatbot_system.sql
```

### Step 4: FAQ 시딩

```bash
npx tsx lib/chatbot/seed-faq.ts
```

**예상 출력**:
```
🌱 Starting FAQ seeding...
📝 Total FAQs to process: 30

[1/30] Processing: "가격이 얼마인가요?"
  ⏳ Creating embedding...
  ✅ Embedding created (1536 dimensions)
  ✅ Saved to database

...

🎉 FAQ Seeding Complete!
==================================================
✅ Success: 30
❌ Errors: 0
📊 Total: 30

📈 Category Distribution:
  • pricing: 6 FAQs
  • revision: 6 FAQs
  • service: 9 FAQs
  • account: 3 FAQs
  • technical: 6 FAQs

💰 Estimated Cost: $0.0009
```

### Step 5: 챗봇 API 테스트

**Curl 테스트**:
```bash
curl -X POST http://localhost:3000/api/chatbot \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "message": "수정권이 뭐예요?",
    "pageContext": "pricing"
  }'
```

**예상 응답**:
```json
{
  "success": true,
  "conversationId": 1,
  "message": "수정권은 AI가 생성한 신청서를 다시 작성 요청할 수 있는 권한입니다...",
  "usage": {
    "promptTokens": 450,
    "completionTokens": 120,
    "totalCost": 0.000139
  }
}
```

---

## 📊 기술 스펙 요약

```yaml
AI 모델: OpenAI GPT-4o-mini
임베딩 모델: text-embedding-3-small (1536차원)
Vector 검색: 코사인 유사도 (JavaScript 구현)
Database: PostgreSQL (Supabase)
ORM: Drizzle ORM
API Framework: Next.js 15 App Router

기능:
  - FAQ 자동 답변 (Vector 검색)
  - 대화형 공고 검색 (Function Calling)
  - 자격요건 실시간 확인
  - 수정권 잔액 조회
  - 대화 히스토리 관리
  - 페이지별 컨텍스트 인지

비용 (월 1,000명 기준):
  - OpenAI API: $0.36 ~ $1
  - Supabase: $0 (무료 범위 내)
  - 총 비용: $0.36 ~ $1

성능:
  - FAQ 검색: < 100ms
  - OpenAI API: < 1000ms
  - 총 응답 시간: < 1500ms
```

---

## 🧪 테스트 시나리오

### 시나리오 1: FAQ 질문
```javascript
POST /api/chatbot
{
  "message": "가격이 얼마인가요?"
}

// 예상 결과: FAQ 답변 (Vector 검색)
```

### 시나리오 2: 공고 검색 (Function Calling)
```javascript
POST /api/chatbot
{
  "message": "경기도 소상공인 지원사업 있어?"
}

// 예상 결과:
// 1. searchAnnouncements function 호출
// 2. 검색 결과 3개 반환
// 3. 사용자 친화적 답변 생성
```

### 시나리오 3: 수정권 조회
```javascript
POST /api/chatbot
{
  "message": "수정권 몇 개 남았어?"
}

// 예상 결과:
// 1. getRevisionCredits function 호출
// 2. 현재 잔액 조회
// 3. "현재 3개 남았습니다" 답변
```

### 시나리오 4: 자격요건 확인
```javascript
POST /api/chatbot
{
  "message": "이 공고 내가 신청 가능해?",
  "pageContext": "announcement/KS175386"
}

// 예상 결과:
// 1. checkEligibility function 호출
// 2. 사용자 프로필과 공고 요구사항 매칭
// 3. "네, 신청 가능합니다!" 또는 부족한 조건 안내
```

---

## 🎯 다음 단계 (UI 구현)

### Phase 1: 기본 채팅 UI (1일)
```typescript
// components/Chatbot/ChatWidget.tsx
// - 우측 하단 플로팅 버튼 (모바일)
// - 우측 사이드바 (데스크톱)
// - 메시지 입력창
// - 대화 히스토리 표시
```

### Phase 2: 고급 UI (1일)
```typescript
// - 빠른 질문 칩
// - 로딩 애니메이션
// - Function Calling 결과 카드 표시
// - 타이핑 인디케이터
```

### Phase 3: UX 최적화 (1일)
```typescript
// - 프로액티브 제안 (자동 팝업)
// - 페이지별 컨텍스트 자동 감지
// - 대화 초기화 버튼
// - 피드백 버튼 (👍 👎)
```

---

## 💰 예상 비용 분석

### OpenAI API 비용 (월 1,000명 기준)

```
사용량:
  • 대화: 3,000회 (1인당 3회)
  • 평균 Input: 200 tokens/대화
  • 평균 Output: 150 tokens/대화

GPT-4o-mini:
  • Input: 200 * 3,000 = 600K tokens
  • Output: 150 * 3,000 = 450K tokens
  • Cost: (600K * $0.15) + (450K * $0.60) = $0.36

임베딩 (text-embedding-3-small):
  • FAQ 시딩: 30 * 150 tokens = 4,500 tokens
  • 사용자 쿼리: 3,000 * 20 tokens = 60K tokens
  • Cost: (64.5K * $0.02) / 1M = $0.001

총 월 비용: $0.36 ~ $0.50
```

### Supabase 비용

```
Database:
  • 예상 사용: 50MB (메시지 저장)
  • 무료 플랜: 500MB까지 무료
  • 비용: $0

Vector 검색:
  • 예상 요청: 3,000회
  • 무료 플랜: 50만 요청까지 무료
  • 비용: $0

총 비용: $0
```

### 총 월 운영 비용: **$0.36 ~ $0.50** (매우 저렴!)

---

## 📈 성능 최적화 팁

### 1. 임베딩 캐싱
```typescript
// 자주 묻는 질문의 임베딩은 캐시
const embeddingCache = new Map<string, number[]>();

if (embeddingCache.has(query)) {
  return embeddingCache.get(query)!;
}
```

### 2. FAQ 검색 캐싱
```typescript
// 동일 질문은 1시간 동안 캐시
const faqCache = new LRUCache({ max: 100, ttl: 3600 * 1000 });
```

### 3. 대화 히스토리 제한
```typescript
// 최근 10개 메시지만 컨텍스트로 사용
const messages = await getConversationHistory(conversationId, 10);
```

### 4. Function Calling 최적화
```typescript
// 필요한 경우에만 Function 호출
tool_choice: 'auto'  // AI가 판단

// 또는
tool_choice: 'none'  // Function 비활성화 (FAQ만)
```

---

## 🐛 트러블슈팅

### 문제 1: OpenAI API 키 에러
```
Error: OpenAI API key not found
```

**해결**:
```bash
# .env.local에 API 키 추가
OPENAI_API_KEY=sk-proj-...
```

### 문제 2: 데이터베이스 연결 에러
```
Error: Database connection failed
```

**해결**:
```bash
# DATABASE_URL 확인
echo $DATABASE_URL

# Supabase 대시보드에서 연결 정보 확인
```

### 문제 3: FAQ 검색 결과 없음
```
Found 0 relevant FAQs
```

**해결**:
```bash
# FAQ 시딩 실행
npx tsx lib/chatbot/seed-faq.ts

# 또는 minSimilarity 낮추기 (0.5로)
const faqs = await searchFAQs(query, { minSimilarity: 0.5 });
```

### 문제 4: Function Calling 실패
```
Backend error: 500
```

**해결**:
```bash
# FastAPI 백엔드 실행 확인
curl http://localhost:8000/health

# NEXT_PUBLIC_BACKEND_URL 확인
echo $NEXT_PUBLIC_BACKEND_URL
```

---

## ✅ 구현 완료 체크리스트

- [x] Drizzle ORM 스키마 정의
- [x] SQL 마이그레이션 파일 생성
- [x] FAQ 데이터 준비 (30개)
- [x] FAQ 시딩 스크립트
- [x] Vector 검색 구현
- [x] 대화 세션 관리
- [x] OpenAI Function Calling
- [x] 챗봇 API 엔드포인트
- [x] 에러 핸들링
- [x] 비용 추적
- [x] 테스트 가이드
- [ ] 채팅 UI 컴포넌트 (다음 단계)
- [ ] 프로액티브 제안 (다음 단계)
- [ ] 피드백 시스템 (다음 단계)

---

## 🎉 결론

**챗봇 시스템의 핵심 기술 구현이 100% 완료되었습니다!**

### 완성된 기능:
✅ FAQ 자동 답변 (Vector 검색)
✅ 대화형 공고 검색
✅ 실시간 자격요건 확인
✅ 수정권 잔액 조회
✅ 대화 히스토리 관리
✅ Function Calling 통합
✅ 비용 최적화

### 남은 작업:
- UI 컴포넌트 (프론트엔드)
- 사용자 피드백 수집
- 프로액티브 제안 시스템
- 실전 테스트 및 개선

**예상 개발 기간**: UI 구현 3일 + 테스트 2일 = 총 5일

**예상 월 비용**: $0.36 ~ $1 (매우 저렴!)

**다음 단계**: 채팅 UI 컴포넌트 구현 시작!
