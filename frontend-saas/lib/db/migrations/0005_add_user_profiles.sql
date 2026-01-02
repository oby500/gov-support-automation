-- 사용자 프로필 테이블 추가
-- 맞춤형 추천을 위한 상세 사용자 정보 저장

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- 회사 기본 정보
  company_name VARCHAR(255), -- 회사명
  business_number VARCHAR(50), -- 사업자 등록번호

  -- 산업 분류
  industry VARCHAR(100), -- 대분류: 제조업, 서비스업, IT, 건설업 등
  sub_industry VARCHAR(100), -- 중분류: 식품제조, 소프트웨어개발 등
  product_service TEXT, -- 주요 제품/서비스 설명

  -- 회사 규모
  employee_count VARCHAR(50), -- 직원 수: '1-5명', '6-10명', '11-50명', '51-100명', '100명 이상'
  annual_revenue VARCHAR(50), -- 연 매출: '1억 미만', '1억-5억', '5억-10억', '10억-50억', '50억 이상'
  establishment_year INTEGER, -- 설립 연도
  business_years VARCHAR(50), -- 사업 연차: '1년차', '2년차', '3년차', '4년차', '5년 이상'

  -- 지역 정보
  region VARCHAR(100), -- 지역: '서울', '경기', '인천', '부산' 등
  address TEXT, -- 상세 주소

  -- 사업 특성
  business_type VARCHAR(50), -- 사업 형태: '법인', '개인사업자', '예비창업자'
  venture_certified BOOLEAN DEFAULT false, -- 벤처 인증 여부
  innovative_sme BOOLEAN DEFAULT false, -- 혁신형 중소기업 여부
  social_enterprise BOOLEAN DEFAULT false, -- 사회적 기업 여부

  -- 기술 및 R&D
  has_rd_department BOOLEAN DEFAULT false, -- R&D 부서 보유 여부
  patent_count INTEGER DEFAULT 0, -- 보유 특허 수
  tech_certification TEXT, -- 기술 인증 (JSON array: ['ISO9001', 'GMP'] 등)

  -- 재무 정보
  credit_rating VARCHAR(20), -- 신용 등급
  export_experience BOOLEAN DEFAULT false, -- 수출 경험 여부

  -- 관심 분야 (맞춤 추천용)
  interested_fields TEXT, -- JSON array: ['기술개발', '마케팅', '수출', '인력채용'] 등
  target_support_amount VARCHAR(50), -- 희망 지원금 규모: '1천만원 미만', '1천-5천만원', '5천만원-1억', '1억 이상'

  -- 메타데이터
  profile_completed BOOLEAN DEFAULT false, -- 프로필 완성 여부
  last_updated_source VARCHAR(50), -- 마지막 업데이트 출처: 'manual', 'chat', 'search_filter'

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_industry ON user_profiles(industry);
CREATE INDEX idx_user_profiles_region ON user_profiles(region);
CREATE INDEX idx_user_profiles_business_years ON user_profiles(business_years);

-- 프로필 완성도 계산 함수
CREATE OR REPLACE FUNCTION calculate_profile_completeness(profile_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  completeness INTEGER := 0;
  total_fields INTEGER := 15; -- 중요 필드 개수
  filled_fields INTEGER := 0;
BEGIN
  SELECT
    CASE WHEN company_name IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN industry IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN sub_industry IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN product_service IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN employee_count IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN annual_revenue IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN establishment_year IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN business_years IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN region IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN business_type IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN interested_fields IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN target_support_amount IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN credit_rating IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN tech_certification IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN address IS NOT NULL THEN 1 ELSE 0 END
  INTO filled_fields
  FROM user_profiles
  WHERE id = profile_id;

  completeness := (filled_fields * 100) / total_fields;

  RETURN completeness;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_profiles IS '사용자 프로필 - 맞춤형 공고 추천을 위한 상세 사용자 정보';
COMMENT ON COLUMN user_profiles.product_service IS '대화형으로 수집된 상세 제품/서비스 설명 (예: "식사제 소스를 제조하는 회사")';
COMMENT ON COLUMN user_profiles.last_updated_source IS '프로필 업데이트 출처 추적 (manual: 직접 입력, chat: 대화형 수집, search_filter: 검색 필터 자동 수집)';
