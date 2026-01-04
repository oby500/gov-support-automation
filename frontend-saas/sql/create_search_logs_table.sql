-- Search Logs Table
-- 사용자 검색 활동 추적 및 분석용 테이블

CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 정보
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT, -- 비회원 검색 추적용

  -- 검색 쿼리 정보
  query TEXT NOT NULL,
  is_ai_search BOOLEAN DEFAULT FALSE,
  search_type TEXT DEFAULT 'keyword', -- 'keyword' | 'natural_language' | 'filter'

  -- 검색 필터
  status_filter TEXT DEFAULT 'all',
  source_filter TEXT DEFAULT 'all',

  -- 검색 결과
  result_count INTEGER DEFAULT 0,
  result_announcement_ids TEXT[], -- 결과 공고 ID 배열

  -- 사용자 행동
  clicked_announcement_id TEXT,
  click_position INTEGER,
  time_to_click INTEGER, -- 밀리초

  -- 성능 메트릭
  response_time_ms INTEGER,

  -- 컨텍스트
  page_context TEXT DEFAULT 'home',

  -- 메타 정보
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- 'desktop' | 'mobile' | 'tablet'

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query);
CREATE INDEX IF NOT EXISTS idx_search_logs_is_ai_search ON search_logs(is_ai_search);
CREATE INDEX IF NOT EXISTS idx_search_logs_session_id ON search_logs(session_id);

-- RLS (Row Level Security) 정책
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 로그 조회 가능
CREATE POLICY "Admins can view all search logs"
  ON search_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::integer
      AND users.role = 'admin'
    )
  );

-- 사용자는 자신의 로그만 조회 가능
CREATE POLICY "Users can view their own search logs"
  ON search_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::integer);

-- 서비스 키로는 모든 작업 가능 (로그 삽입용)
CREATE POLICY "Service role can do anything"
  ON search_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 업데이트 타임스탬프 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_search_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_logs_updated_at_trigger
  BEFORE UPDATE ON search_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_search_logs_updated_at();

-- 코멘트 추가
COMMENT ON TABLE search_logs IS '사용자 검색 활동 로그 및 분석 데이터';
COMMENT ON COLUMN search_logs.user_id IS '로그인 사용자 ID (비회원은 NULL)';
COMMENT ON COLUMN search_logs.session_id IS '비회원 세션 추적 ID';
COMMENT ON COLUMN search_logs.query IS '검색어';
COMMENT ON COLUMN search_logs.is_ai_search IS 'AI 자연어 검색 여부';
COMMENT ON COLUMN search_logs.result_count IS '검색 결과 개수';
COMMENT ON COLUMN search_logs.response_time_ms IS '검색 응답 시간 (밀리초)';
