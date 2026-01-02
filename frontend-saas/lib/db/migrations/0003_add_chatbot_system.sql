-- Migration: Add Chatbot System Tables
-- Created: 2025-01-13
-- Description: 챗봇 시스템용 테이블 (대화 세션, 메시지, FAQ, 피드백)

-- ==================== Step 1: 챗봇 대화 세션 테이블 ====================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_context VARCHAR(100), -- 어느 페이지에서 시작했는지
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_created_at ON chat_conversations(created_at DESC);

-- ==================== Step 2: 챗봇 메시지 테이블 ====================
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
  content TEXT NOT NULL,
  function_name VARCHAR(100), -- Function calling 사용 시
  function_args TEXT, -- JSON string
  function_result TEXT, -- JSON string
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_role ON chat_messages(role);

-- ==================== Step 3: FAQ 임베딩 테이블 ====================
CREATE TABLE IF NOT EXISTS faq_embeddings (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- 'pricing', 'revision', 'service', 'account', 'technical'
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT, -- JSON array string
  embedding TEXT, -- JSON array of numbers (will be converted to vector later)
  metadata TEXT, -- JSON string
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_faq_embeddings_category ON faq_embeddings(category);

-- Full-text search index for keywords
CREATE INDEX idx_faq_embeddings_question_gin ON faq_embeddings USING gin(to_tsvector('english', question));
CREATE INDEX idx_faq_embeddings_answer_gin ON faq_embeddings USING gin(to_tsvector('english', answer));

-- ==================== Step 4: 챗봇 피드백 테이블 ====================
CREATE TABLE IF NOT EXISTS chatbot_feedback (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_type VARCHAR(20) CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'irrelevant')),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chatbot_feedback_message_id ON chatbot_feedback(message_id);
CREATE INDEX idx_chatbot_feedback_user_id ON chatbot_feedback(user_id);
CREATE INDEX idx_chatbot_feedback_rating ON chatbot_feedback(rating);
CREATE INDEX idx_chatbot_feedback_created_at ON chatbot_feedback(created_at DESC);

-- ==================== Step 5: Updated_at 트리거 ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON chat_conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_embeddings_updated_at
BEFORE UPDATE ON faq_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==================== Step 6: Vector Search 준비 (선택적) ====================
-- pgvector extension이 설치된 경우에만 실행
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
--     -- embedding column을 vector 타입으로 변경
--     ALTER TABLE faq_embeddings
--     ALTER COLUMN embedding TYPE vector(1536)
--     USING embedding::text::vector;
--
--     -- Vector similarity 검색용 HNSW 인덱스
--     CREATE INDEX idx_faq_embeddings_vector ON faq_embeddings
--     USING hnsw (embedding vector_cosine_ops);
--   END IF;
-- END $$;

-- ==================== 완료 메시지 ====================
DO $$
BEGIN
  RAISE NOTICE 'Chatbot system tables created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run FAQ seeding script to populate faq_embeddings';
  RAISE NOTICE '2. (Optional) Install pgvector extension for vector search';
  RAISE NOTICE '3. Deploy chatbot API endpoint';
END $$;
