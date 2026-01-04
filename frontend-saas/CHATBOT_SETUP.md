# 챗봇 시스템 기술 구현 가이드

## 1. 필수 패키지 설치

```bash
npm install openai ai
```

**패키지 설명:**
- `openai`: OpenAI API 공식 SDK (GPT-4o-mini, 임베딩)
- `ai`: Vercel AI SDK (스트리밍, UI 헬퍼)

## 2. 환경변수 설정

`.env.local`에 추가:
```bash
# OpenAI API
OPENAI_API_KEY=sk-proj-...

# Chatbot Settings
CHATBOT_MODEL=gpt-4o-mini
CHATBOT_TEMPERATURE=0.7
CHATBOT_MAX_TOKENS=800
```

## 3. 데이터베이스 스키마

### 3.1 대화 히스토리 테이블

```sql
-- chat_conversations: 대화 세션
CREATE TABLE chat_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_context VARCHAR(100), -- 어느 페이지에서 시작했는지
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_created_at ON chat_conversations(created_at DESC);

-- chat_messages: 개별 메시지
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
  content TEXT NOT NULL,
  function_name VARCHAR(100), -- Function calling 사용 시
  function_args JSONB, -- Function 파라미터
  function_result JSONB, -- Function 실행 결과
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
```

### 3.2 FAQ Vector Store 테이블

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- faq_embeddings: FAQ 임베딩 저장
CREATE TABLE faq_embeddings (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- 'pricing', 'revision', 'service', 'account'
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[], -- 검색 최적화용 키워드
  embedding vector(1536), -- OpenAI text-embedding-3-small 차원
  metadata JSONB, -- 추가 정보 (예: 관련 페이지 URL)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Vector 유사도 검색 인덱스 (HNSW 알고리즘)
CREATE INDEX idx_faq_embeddings_vector ON faq_embeddings
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_faq_embeddings_category ON faq_embeddings(category);
```

### 3.3 사용자 피드백 테이블

```sql
-- chatbot_feedback: 답변 품질 피드백
CREATE TABLE chatbot_feedback (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- 1~5점
  feedback_type VARCHAR(20) CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'irrelevant')),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chatbot_feedback_message_id ON chatbot_feedback(message_id);
CREATE INDEX idx_chatbot_feedback_rating ON chatbot_feedback(rating);
```

## 4. 핵심 기술 구현 순서

### Phase 1: 기본 인프라 (1일)
1. ✅ 데이터베이스 마이그레이션 실행
2. ✅ Drizzle ORM 스키마 정의
3. ✅ FAQ 데이터 준비 (30~50개)
4. ✅ FAQ 임베딩 생성 스크립트

### Phase 2: 챗봇 API (2일)
1. ✅ `/api/chatbot` 엔드포인트 구현
2. ✅ OpenAI GPT-4o-mini 통합
3. ✅ Vector 유사도 검색 구현
4. ✅ 대화 히스토리 관리

### Phase 3: Function Calling (2일)
1. ✅ 공고 검색 Function 구현
2. ✅ 자격요건 확인 Function 구현
3. ✅ 수정권 조회 Function 구현
4. ✅ FastAPI 백엔드 연동

### Phase 4: 컨텍스트 인지 (1일)
1. ✅ 페이지별 컨텍스트 전달
2. ✅ 사용자 프로필 자동 로드
3. ✅ 대화 세션 관리

### Phase 5: 최적화 (1일)
1. ✅ 응답 스트리밍
2. ✅ 캐싱 전략
3. ✅ 에러 핸들링
4. ✅ Rate limiting

## 5. 기술적 고려사항

### 5.1 토큰 최적화
```typescript
// 대화 히스토리 제한 (최근 10개 메시지만)
const recentMessages = await getRecentMessages(conversationId, 10);

// FAQ 검색 결과 제한 (상위 3개만)
const topFAQs = await searchFAQs(query, { limit: 3 });

// 시스템 프롬프트 최적화 (간결하게)
const systemPrompt = `당신은 정부지원금 신청서 작성 서비스의 AI 도우미입니다.
다음 FAQ를 참고하여 간결하고 정확하게 답변하세요.`;
```

### 5.2 Function Calling 설계
```typescript
const functions = [
  {
    name: "searchAnnouncements",
    description: "정부지원 공고 검색",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "지역 (예: 서울, 경기)" },
        target: { type: "string", description: "대상 (예: 소상공인, 스타트업)" },
        keyword: { type: "string", description: "검색 키워드" },
        limit: { type: "number", default: 3 }
      }
    }
  },
  {
    name: "checkEligibility",
    description: "공고 자격요건 확인",
    parameters: {
      type: "object",
      properties: {
        announcementId: { type: "string", required: true },
        userId: { type: "number", required: true }
      }
    }
  },
  {
    name: "getRevisionCredits",
    description: "수정권 잔액 조회",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "number", required: true }
      }
    }
  }
];
```

### 5.3 Vector 검색 최적화
```typescript
// Hybrid 검색: Vector + Keyword
const searchQuery = `
  SELECT
    id,
    question,
    answer,
    category,
    1 - (embedding <=> $1) AS similarity
  FROM faq_embeddings
  WHERE
    1 - (embedding <=> $1) > 0.7  -- 유사도 70% 이상
    AND (
      keywords && $2  -- 키워드 매칭
      OR category = $3  -- 카테고리 매칭
    )
  ORDER BY similarity DESC
  LIMIT 3
`;
```

### 5.4 비용 최적화
```typescript
// 1. 임베딩 캐싱 (자주 묻는 질문)
const embeddingCache = new Map<string, number[]>();

// 2. FAQ 검색 캐싱 (동일 질문)
const faqCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 60 }); // 1시간

// 3. 토큰 사용량 모니터링
await logTokenUsage({
  userId,
  model: 'gpt-4o-mini',
  promptTokens: usage.prompt_tokens,
  completionTokens: usage.completion_tokens,
  totalCost: calculateCost(usage)
});
```

## 6. 예상 비용 (월 1,000명 기준)

### 6.1 OpenAI API 비용
```
GPT-4o-mini:
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens

임베딩 (text-embedding-3-small):
- $0.020 / 1M tokens

예상 사용량:
- 대화: 3,000회 (1인당 3회)
- 평균 대화당 토큰: 200 input + 150 output
- 총 Input: 600K tokens → $0.09
- 총 Output: 450K tokens → $0.27
- 임베딩: 50K tokens (검색용) → $0.001

월 총 비용: $0.36 (매우 저렴!)
```

### 6.2 Supabase 비용
```
Vector 검색:
- 무료 플랜: 월 50만 요청
- 예상 사용: 3,000 요청
- 비용: $0 (무료 범위 내)

Database:
- 무료 플랜: 500MB
- 예상 사용: 50MB (메시지 저장)
- 비용: $0 (무료 범위 내)
```

### 6.3 총 운영 비용
```
월 $0.36 ~ $1 (사용량에 따라 변동)
```

## 7. 성능 목표

```yaml
응답 시간:
  - Vector 검색: < 100ms
  - OpenAI API: < 1000ms
  - 총 응답 시간: < 1500ms

처리량:
  - 동시 접속: 100명
  - 초당 요청: 10 RPS

정확도:
  - FAQ 매칭: > 90%
  - Function calling 성공률: > 95%
  - 사용자 만족도: > 85%
```

## 8. 다음 단계

1. ✅ 패키지 설치: `npm install openai ai`
2. ✅ 환경변수 설정
3. ✅ 데이터베이스 마이그레이션 실행
4. ✅ FAQ 데이터 준비
5. ✅ 챗봇 API 구현 시작

---

**준비 완료!** 이제 실제 코드 구현을 시작합니다.
