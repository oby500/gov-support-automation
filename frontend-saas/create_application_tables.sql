-- application_sessions 테이블 생성
CREATE TABLE IF NOT EXISTS application_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  announcement_id VARCHAR(50) NOT NULL,
  announcement_source VARCHAR(20) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  total_applications INTEGER NOT NULL,
  total_cost_krw INTEGER,
  total_tokens INTEGER,
  style_recommendation TEXT,
  selected_base_styles TEXT,
  selected_combination_styles TEXT,
  company_info_snapshot TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  credit_transaction_id INTEGER REFERENCES credit_transactions(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- generated_applications 테이블 생성
CREATE TABLE IF NOT EXISTS generated_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  announcement_id VARCHAR(50) NOT NULL,
  announcement_source VARCHAR(20) NOT NULL,
  announcement_title VARCHAR(500),
  tier VARCHAR(20) NOT NULL,
  style VARCHAR(30) NOT NULL,
  style_name VARCHAR(50),
  style_type VARCHAR(20),
  style_rank INTEGER,
  is_recommended BOOLEAN DEFAULT FALSE,
  content TEXT NOT NULL,
  char_count INTEGER,
  section_count INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_krw INTEGER,
  model_used VARCHAR(50),
  style_recommendation TEXT,
  company_info_snapshot TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'generated',
  user_rating INTEGER,
  user_feedback TEXT,
  credit_transaction_id INTEGER REFERENCES credit_transactions(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_application_sessions_user_id ON application_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_application_sessions_announcement_id ON application_sessions(announcement_id);
CREATE INDEX IF NOT EXISTS idx_generated_applications_user_id ON generated_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_applications_announcement_id ON generated_applications(announcement_id);
CREATE INDEX IF NOT EXISTS idx_generated_applications_style ON generated_applications(style);

COMMENT ON TABLE application_sessions IS '신청서 생성 세션 정보';
COMMENT ON TABLE generated_applications IS '생성된 신청서 데이터';
