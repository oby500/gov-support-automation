# 알림 시스템 구현 완료 리포트

**작성일**: 2025-11-13
**작업 범위**: 카카오 알림톡 + 네이버 SENS SMS 알림 시스템 통합
**상태**: ✅ 구현 완료 (배포 준비 완료)

---

## 📋 목차

1. [구현 개요](#구현-개요)
2. [완료된 작업](#완료된-작업)
3. [파일 구조](#파일-구조)
4. [데이터베이스 변경사항](#데이터베이스-변경사항)
5. [사용 방법](#사용-방법)
6. [배포 전 체크리스트](#배포-전-체크리스트)
7. [비용 예상](#비용-예상)
8. [다음 단계](#다음-단계)

---

## 구현 개요

### 핵심 기능
- ✅ 카카오 알림톡 통합 (4가지 메시지 타입)
- ✅ 네이버 SENS SMS/LMS 통합
- ✅ 하이브리드 발송 전략 (알림톡 → SMS 폴백)
- ✅ 알림 발송 로그 시스템
- ✅ 환경 변수 검증 자동화

### 알림 시나리오 (4가지)
1. **결제 완료**: 티어 구매 완료 시 즉시 발송
2. **수정권 구매**: 수정권 추가 구매 완료 시
3. **Writing Analysis 완료**: 공고 분석 완료 시 (약 7분 소요)
4. **신청서 생성 완료**: AI 신청서 작성 완료 시

### 하이브리드 발송 전략
```
1차: 카카오 알림톡 시도 (도달률 95%, 비용 7원/건)
     ↓ 실패 시
2차: 네이버 SENS SMS (도달률 100%, 비용 30원/건)
```

**예상 비용** (월 1000명 기준):
- 알림톡 성공 (90%): 900건 × 7원 = 6,300원
- SMS 백업 (10%): 100건 × 30원 = 3,000원
- **총 비용**: 약 **9,300원/월**

---

## 완료된 작업

### 1. 환경 변수 설정 ✅

#### 파일: `scripts/validate-env.ts`
- 알림 시스템 환경 변수 6개 추가 (선택 사항)
- 자동 검증 로직 구현
- 전화번호 형식 검증 (02-1234-5678, 010-1234-5678)

#### 파일: `.env.example`
- 카카오 알림톡 설정 (2개 변수)
- 네이버 SENS 설정 (4개 변수)
- 상세한 주석과 발급 방법 안내

**추가된 환경 변수**:
```bash
# 카카오 알림톡 (선택)
KAKAO_SENDER_KEY=
KAKAO_ALIMTALK_API_KEY=

# 네이버 SENS (선택)
NAVER_SENS_ACCESS_KEY=
NAVER_SENS_SECRET_KEY=
NAVER_SENS_SERVICE_ID=
NAVER_SENS_FROM_NUMBER=
```

### 2. 데이터베이스 스키마 확장 ✅

#### 파일: `lib/db/schema.ts`
**Users 테이블 확장**:
```typescript
phone: varchar('phone', { length: 20 })  // 전화번호
notificationEnabled: boolean('notification_enabled').default(true)  // 알림 수신 동의
```

**새 테이블: notification_logs**:
- 알림 발송 이력 추적
- 실패 로그 기록 및 재시도 관리
- 통계 및 모니터링 지원

**새 Enum 타입**:
```typescript
NotificationType: payment_success, revision_credit_purchased, writing_analysis_complete, application_generated
NotificationChannel: kakao, sms
NotificationStatus: pending, sent, failed
```

#### 파일: `lib/db/migrations/0002_add_notification_system.sql`
- Users 테이블 ALTER 쿼리
- notification_logs 테이블 CREATE 쿼리
- 인덱스 4개 생성 (user_id, type, status, created_at)
- 컬럼 설명 주석 추가

### 3. 카카오 알림톡 구현 ✅

#### 파일: `lib/notifications/kakao-alimtalk.ts`
**기능**:
- 4가지 템플릿 메시지 함수
- REST API 통합 (Bearer 인증)
- 버튼 액션 지원 (웹 링크)
- 개발 환경 안전 모드

**함수 목록**:
```typescript
sendAlimtalk()  // 기본 발송 함수
sendPaymentSuccessAlimtalk()  // 결제 완료
sendRevisionCreditPurchasedAlimtalk()  // 수정권 구매
sendWritingAnalysisCompleteAlimtalk()  // 분석 완료
sendApplicationGeneratedAlimtalk()  // 신청서 완료
sendAlimtalkSafe()  // 개발 환경용
```

### 4. 네이버 SENS 구현 ✅

#### 파일: `lib/notifications/naver-sens.ts`
**기능**:
- HMAC-SHA256 서명 인증
- SMS/LMS 자동 타입 선택 (80자 기준)
- 4가지 메시지 함수
- 비용 계산 유틸리티

**함수 목록**:
```typescript
makeSignature()  // HMAC 서명 생성
sendSMS()  // 기본 발송 함수
sendPaymentSuccessSMS()  // 결제 완료
sendRevisionCreditPurchasedSMS()  // 수정권 구매
sendWritingAnalysisCompleteSMS()  // 분석 완료
sendApplicationGeneratedSMS()  // 신청서 완료
sendSMSSafe()  // 개발 환경용
calculateSMSCost()  // 비용 계산
```

### 5. 알림 로깅 시스템 ✅

#### 파일: `lib/notifications/logger.ts`
**기능**:
- 알림 발송 시도/성공/실패 로그 기록
- 재시도 대상 조회
- 사용자별 알림 이력 조회
- 통계 및 모니터링 지원

**함수 목록**:
```typescript
logNotification()  // 일반 로그 기록
logNotificationAttempt()  // 시도 기록 (pending)
logNotificationSuccess()  // 성공 업데이트
logNotificationFailure()  // 실패 업데이트
getRecentNotifications()  // 최근 알림 조회
getFailedNotifications()  // 실패 알림 조회
```

### 6. 통합 발송 시스템 ✅

#### 파일: `lib/notifications/send.ts`
**하이브리드 전략 구현**:
1. 카카오 알림톡 시도
2. 실패 시 자동으로 SMS 발송
3. 모든 시도 로그 기록

**함수 목록**:
```typescript
sendPaymentNotification()  // 결제 완료 (하이브리드)
sendRevisionCreditNotification()  // 수정권 구매 (하이브리드)
sendApplicationNotification()  // 신청서 완료 (하이브리드)
sendNotificationSafe()  // 개발 환경 안전 발송
```

**반환 타입**:
```typescript
interface NotificationResult {
  success: boolean
  channel?: 'kakao' | 'sms'  // 실제 발송된 채널
  messageId?: string  // 메시지 ID
  error?: string  // 에러 메시지
}
```

---

## 파일 구조

```
frontend-saas/
├── .env.example  [수정] 알림 시스템 환경 변수 추가
├── scripts/
│   └── validate-env.ts  [수정] 알림 변수 검증 추가
├── lib/
│   ├── db/
│   │   ├── schema.ts  [수정] users 테이블 + notification_logs 테이블 추가
│   │   └── migrations/
│   │       └── 0002_add_notification_system.sql  [신규] 마이그레이션 SQL
│   └── notifications/  [신규 디렉토리]
│       ├── kakao-alimtalk.ts  [신규] 카카오 알림톡
│       ├── naver-sens.ts  [신규] 네이버 SENS
│       ├── logger.ts  [신규] 로깅 시스템
│       └── send.ts  [신규] 통합 발송 (하이브리드)
└── NOTIFICATION_SETUP_GUIDE.md  [기존] 설정 가이드
```

---

## 데이터베이스 변경사항

### 1. Users 테이블 (ALTER)
```sql
ALTER TABLE users
ADD COLUMN phone VARCHAR(20),  -- 전화번호
ADD COLUMN notification_enabled BOOLEAN DEFAULT true;  -- 알림 수신 동의
```

### 2. notification_logs 테이블 (CREATE)
```sql
CREATE TABLE notification_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,  -- 알림 타입
  channel VARCHAR(20) NOT NULL,  -- 발송 채널
  status VARCHAR(20) NOT NULL,  -- 상태
  phone_number VARCHAR(20),  -- 발송 번호
  message_id VARCHAR(255),  -- 메시지 ID
  error_message TEXT,  -- 에러 메시지
  metadata TEXT,  -- JSON 메타데이터
  sent_at TIMESTAMP,  -- 발송 시각
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_type ON notification_logs(type);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at DESC);
```

### 마이그레이션 실행 방법
```bash
# Drizzle Kit으로 마이그레이션 생성
pnpm db:generate

# 마이그레이션 실행
pnpm db:migrate

# 또는 수동 실행
psql $POSTGRES_URL < lib/db/migrations/0002_add_notification_system.sql
```

---

## 사용 방법

### 1. 결제 완료 알림 발송 예시

**파일**: `app/api/application-writer/payment-complete/route.ts`

```typescript
import { sendPaymentNotification } from '@/lib/notifications/send'
import { getCurrentUser } from '@/lib/auth/get-user'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  // 결제 처리 로직...

  // 알림 발송 (비동기, 실패해도 결제는 성공)
  if (user.phone && user.notificationEnabled) {
    sendPaymentNotification({
      userId: user.id,
      phoneNumber: user.phone,
      userName: user.name,
      tier: 'basic',
      credits: 2,
      amount: 9900,
      paymentDate: new Date().toLocaleString('ko-KR'),
    }).catch(error => {
      console.error('Notification failed:', error)
      // 알림 실패는 결제 성공에 영향 없음
    })
  }

  return NextResponse.json({ success: true })
}
```

### 2. 수정권 구매 알림 발송 예시

```typescript
import { sendRevisionCreditNotification } from '@/lib/notifications/send'

// 수정권 구매 완료 후
const result = await sendRevisionCreditNotification({
  userId: user.id,
  phoneNumber: user.phone,
  userName: user.name,
  credits: 5,  // 구매한 수정권
  totalCredits: 8,  // 총 보유 수정권
  amount: 20000,
})

if (result.success) {
  console.log(`알림 발송 성공: ${result.channel}`)  // 'kakao' 또는 'sms'
} else {
  console.error(`알림 발송 실패: ${result.error}`)
}
```

### 3. 신청서 완성 알림 발송 예시

```typescript
import { sendApplicationNotification } from '@/lib/notifications/send'

// 신청서 완성 후
const result = await sendApplicationNotification({
  userId: user.id,
  phoneNumber: user.phone,
  userName: user.name,
  announcementTitle: '2025년 예비창업패키지',
  applicationId: 'app_123456',
})
```

### 4. 개발 환경 안전 발송

```typescript
import { sendNotificationSafe } from '@/lib/notifications/send'

// 개발: 콘솔 로그만, 프로덕션: 실제 발송
const result = await sendNotificationSafe('payment', {
  userId: 1,
  phoneNumber: '010-1234-5678',
  userName: '홍길동',
  tier: 'basic',
  credits: 2,
  amount: 9900,
  paymentDate: new Date().toLocaleString('ko-KR'),
})
```

---

## 배포 전 체크리스트

### 1. 환경 변수 설정 (선택 사항)

알림 시스템을 사용하려면 아래 환경 변수를 설정하세요. **설정하지 않으면 알림이 발송되지 않지만, 시스템은 정상 작동합니다.**

#### 카카오 알림톡 설정
```bash
KAKAO_SENDER_KEY=your-sender-key
KAKAO_ALIMTALK_API_KEY=your-rest-api-key
```

**발급 방법**: `NOTIFICATION_SETUP_GUIDE.md` 참고
- 카카오 비즈니스 채널 생성 (3-5일 소요)
- 알림톡 서비스 신청
- 템플릿 4개 등록 및 승인 대기 (1-3일)
- REST API 키 발급

#### 네이버 SENS 설정
```bash
NAVER_SENS_ACCESS_KEY=your-access-key
NAVER_SENS_SECRET_KEY=your-secret-key
NAVER_SENS_SERVICE_ID=ncp:sms:kr:123456789012:your-service-id
NAVER_SENS_FROM_NUMBER=02-1234-5678
```

**발급 방법**: `NOTIFICATION_SETUP_GUIDE.md` 참고
- 네이버 클라우드 플랫폼 가입
- SENS 서비스 신청
- 발신번호 등록 및 승인 (1-3일)
- 인증키 발급

### 2. 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행
pnpm db:migrate

# 또는
psql $POSTGRES_URL < lib/db/migrations/0002_add_notification_system.sql
```

### 3. 환경 변수 검증

```bash
# 모든 환경 변수 검증 (알림 시스템 포함)
pnpm validate-env
```

알림 시스템 변수는 **선택 사항**이므로 설정하지 않아도 검증이 통과됩니다.

### 4. 빌드 테스트

```bash
# TypeScript 컴파일 확인
pnpm build

# 타입 에러 없이 빌드 성공 확인
```

### 5. 로컬 테스트 (개발 모드)

```bash
# 개발 서버 실행
pnpm dev

# 결제 플로우 테스트
# → 콘솔에 알림 로그만 출력됨 (실제 발송 X)
```

### 6. 프로덕션 배포

```bash
# Vercel 배포
vercel --prod

# 환경 변수 설정 (Vercel Dashboard)
# → Settings → Environment Variables
# → 알림 시스템 변수 6개 추가 (선택)
```

---

## 비용 예상

### 카카오 알림톡
- **기본료**: 무료
- **발송 단가**: 7원/건
- **도달률**: 95% (카카오톡 사용자)
- **특징**: 버튼 액션, 브랜딩, 높은 도달률

### 네이버 SENS
- **기본료**: 무료
- **SMS (단문)**: 9원/건 (80자 이하)
- **LMS (장문)**: 30원/건 (2000자 이하)
- **도달률**: 100% (모든 휴대폰)
- **특징**: 템플릿 승인 불필요, 즉시 발송

### 하이브리드 전략 비용 (월 1000명 기준)

| 시나리오 | 발송 건수 | 채널 | 단가 | 비용 |
|---------|----------|------|------|------|
| 알림톡 성공 | 900건 | 카카오 | 7원 | 6,300원 |
| SMS 백업 | 100건 | 네이버 | 30원 | 3,000원 |
| **합계** | **1000건** | - | - | **9,300원** |

**월 평균 비용**: 약 **9,300원** (사용자당 9.3원)

### 시나리오별 비용 예측

**월 사용자 100명**:
- 알림톡 90건 × 7원 = 630원
- SMS 10건 × 30원 = 300원
- **총 비용**: 약 930원/월

**월 사용자 5,000명**:
- 알림톡 4,500건 × 7원 = 31,500원
- SMS 500건 × 30원 = 15,000원
- **총 비용**: 약 46,500원/월

**월 사용자 10,000명**:
- 알림톡 9,000건 × 7원 = 63,000원
- SMS 1,000건 × 30원 = 30,000원
- **총 비용**: 약 93,000원/월

---

## 다음 단계

### 즉시 가능한 작업
1. ✅ **마이그레이션 실행**: 데이터베이스 스키마 업데이트
2. ✅ **환경 변수 설정**: 알림 서비스 계정 생성 및 키 발급
3. ✅ **템플릿 등록**: 카카오 알림톡 템플릿 4개 등록 및 승인 대기

### 향후 추가 기능 (선택)
1. **사용자 전화번호 수집**
   - 회원가입 시 전화번호 입력란 추가
   - 본인 인증 연동 (옵션)

2. **알림 설정 페이지**
   - 마이페이지에서 알림 수신 동의 관리
   - 알림 타입별 수신 설정

3. **알림 통계 대시보드**
   - 발송 성공률 모니터링
   - 채널별 비용 분석
   - 시간대별 발송 현황

4. **재발송 스케줄러**
   - 실패한 알림 자동 재시도
   - 배치 작업으로 구현

5. **A/B 테스트**
   - 메시지 템플릿 효과 측정
   - 발송 시간 최적화

---

## 기술 스택

- **언어**: TypeScript
- **프레임워크**: Next.js 15
- **데이터베이스**: PostgreSQL (Drizzle ORM)
- **알림 서비스**:
  - 카카오 비즈니스 메시지 API
  - 네이버 클라우드 플랫폼 SENS
- **인증**: HMAC-SHA256 (Naver SENS), Bearer Token (Kakao)

---

## 참고 문서

1. **[NOTIFICATION_SETUP_GUIDE.md](./NOTIFICATION_SETUP_GUIDE.md)**: 상세 설정 가이드
2. **[카카오 비즈니스 메시지 API](https://developers.kakao.com/docs/latest/ko/message/rest-api)**
3. **[네이버 SENS API](https://api.ncloud-docs.com/docs/ai-application-service-sens-smsv2)**

---

**작성자**: AI Application Writer Team
**최종 업데이트**: 2025-11-13
**버전**: 1.0.0
