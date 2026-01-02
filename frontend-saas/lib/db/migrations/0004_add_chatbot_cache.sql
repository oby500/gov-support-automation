-- 챗봇 응답 캐시 테이블 추가
CREATE TABLE IF NOT EXISTS chatbot_response_cache (
  id SERIAL PRIMARY KEY,
  question_hash VARCHAR(64) NOT NULL UNIQUE, -- MD5 hash of normalized question
  question TEXT NOT NULL, -- 원본 질문
  answer TEXT NOT NULL, -- 캐싱된 응답
  question_type VARCHAR(20) NOT NULL DEFAULT 'FAQ', -- 'FAQ', 'GENERAL', 'CUSTOM'
  category VARCHAR(50), -- FAQ 카테고리 (pricing, revision, service 등)
  hit_count INTEGER DEFAULT 1, -- 캐시 히트 횟수
  last_used_at TIMESTAMP NOT NULL DEFAULT NOW(), -- 마지막 사용 시간
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_chatbot_cache_question_hash ON chatbot_response_cache(question_hash);
CREATE INDEX idx_chatbot_cache_question_type ON chatbot_response_cache(question_type);
CREATE INDEX idx_chatbot_cache_category ON chatbot_response_cache(category);
CREATE INDEX idx_chatbot_cache_last_used ON chatbot_response_cache(last_used_at DESC);

-- 캐시 통계 뷰 생성
CREATE OR REPLACE VIEW chatbot_cache_stats AS
SELECT
  question_type,
  category,
  COUNT(*) as total_cached,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_question,
  MAX(last_used_at) as last_cache_hit
FROM chatbot_response_cache
GROUP BY question_type, category;

COMMENT ON TABLE chatbot_response_cache IS '챗봇 응답 캐시 - FAQ 성격 질문의 응답을 저장하여 API 호출 비용 절감';
COMMENT ON COLUMN chatbot_response_cache.question_hash IS '정규화된 질문의 MD5 해시';
COMMENT ON COLUMN chatbot_response_cache.hit_count IS '이 캐시가 사용된 횟수 (인기도 측정)';
COMMENT ON COLUMN chatbot_response_cache.question_type IS 'FAQ: 일반적 질문, GENERAL: 일반 질문, CUSTOM: 맞춤형 질문';
