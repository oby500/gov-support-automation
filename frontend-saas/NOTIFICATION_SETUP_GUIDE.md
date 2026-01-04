# 알림 시스템 설정 가이드

결제 완료, 신청서 생성 완료 등의 이벤트 발생 시 사용자에게 알림을 보내는 시스템입니다.

## 목차

1. [개요](#개요)
2. [카카오 알림톡 설정](#카카오-알림톡-설정)
3. [네이버 SENS (SMS/LMS) 설정](#네이버-sens-smslms-설정)
4. [환경 변수 설정](#환경-변수-설정)
5. [사용 방법](#사용-방법)
6. [비용 안내](#비용-안내)
7. [문제 해결](#문제-해결)

---

## 개요

### 구현된 알림 기능

**파일 위치**:
- `lib/notifications/kakao-alimtalk.ts` - 카카오 알림톡
- `lib/notifications/naver-sens.ts` - 네이버 SMS/LMS

### 알림 시나리오

1. **결제 완료**: 티어 구매 또는 수정권 구매 완료 시
2. **Writing Analysis 완료**: 공고 분석 완료 시 (약 7분 소요)
3. **신청서 생성 완료**: AI 신청서 작성 완료 시
4. **수정권 사용**: 신청서 수정 요청 시 (선택사항)

---

## 카카오 알림톡 설정

### 1. 카카오 비즈니스 채널 생성

**준비물**:
- 사업자등록증 또는 신분증
- 카카오톡 계정

**절차**:
1. [카카오 비즈니스](https://business.kakao.com/) 접속
2. "채널 개설" 클릭
3. 채널 정보 입력:
   - 채널 이름: "로텐"
   - 카테고리: IT/기술
   - 연락처: 고객센터 번호
4. 사업자 인증 (3-5일 소요)

### 2. 알림톡 서비스 신청

1. 카카오 비즈니스 > 메시지 > 알림톡
2. "서비스 신청" 클릭
3. 채널 연결
4. 발신 프로필 등록

### 3. 템플릿 등록

**필요한 템플릿** (총 4개):

#### 템플릿 1: 결제 완료 안내
```
[로텐] #{userName}님, 결제가 완료되었습니다!

✅ 구매 플랜: #{tier}
💰 결제 금액: #{amount}원
🎫 획득 수정권: +#{credits}회
📅 결제일시: #{paymentDate}

마이페이지에서 확인하세요.

감사합니다.
```

**변수**: userName, tier, amount, credits, paymentDate

**버튼**:
- 버튼명: "마이페이지 확인"
- 버튼 타입: 웹 링크 (WL)
- URL: https://your-domain.com/mypage

#### 템플릿 2: 수정권 구매 완료
```
[로텐] #{userName}님, 수정권 구매가 완료되었습니다!

💳 결제 금액: #{amount}원
🎫 구매 수정권: +#{credits}회
📊 보유 수정권: #{totalCredits}회

언제든지 AI 신청서 수정에 사용하세요.

감사합니다.
```

**변수**: userName, amount, credits, totalCredits

#### 템플릿 3: Writing Analysis 완료
```
[로텐] #{userName}님, Writing Analysis가 완료되었습니다!

📋 공고명: #{announcementTitle}
⏱️ 예상 소요시간: #{estimatedTime}

이제 회사 정보를 입력하시면 AI가 맞춤형 신청서를 작성해드립니다.
```

**변수**: userName, announcementTitle, estimatedTime

#### 템플릿 4: 신청서 생성 완료
```
[로텐] #{userName}님, AI 신청서가 완성되었습니다! 🎉

📋 공고명: #{announcementTitle}

지금 바로 확인하고 다운로드하세요.
필요 시 수정권을 사용하여 개선할 수 있습니다.

감사합니다.
```

**변수**: userName, announcementTitle

**버튼**:
1. 버튼명: "신청서 확인하기", URL: https://your-domain.com/applications/{id}
2. 버튼명: "다운로드", URL: https://your-domain.com/api/applications/{id}/download

### 4. 템플릿 승인 대기

- 카카오 검수팀 승인 필요 (1-3일 소요)
- 승인 완료 시 템플릿 코드 발급

### 5. API 키 발급

1. 카카오 개발자 > 내 애플리케이션
2. "앱 추가하기"
3. 플랫폼 설정 > REST API 키 복사
4. 카카오 비즈니스 > 메시지 > 발신키 발급

---

## 네이버 SENS (SMS/LMS) 설정

### 1. 네이버 클라우드 플랫폼 가입

1. [네이버 클라우드](https://console.ncloud.com/) 접속
2. 회원가입 (사업자 또는 개인)
3. 본인 인증 및 결제 수단 등록

### 2. SENS 서비스 신청

1. 콘솔 > Products > Application Service > SENS
2. "Simple Notification Service" 선택
3. "SMS 서비스 신청" 클릭

### 3. 발신번호 등록

1. SENS > SMS > 발신번호 관리
2. "발신번호 등록" 클릭
3. 전화번호 입력 (02-1234-5678 형식)
4. 서류 제출:
   - 사업자: 사업자등록증 사본
   - 개인: 통신서비스 이용증명원
5. 승인 대기 (1-3일)

### 4. 인증키 발급

1. 마이페이지 > 계정 관리 > 인증키 관리
2. "API 인증키 생성" 클릭
3. 다음 정보 저장:
   - Access Key ID
   - Secret Key

### 5. Service ID 확인

1. SENS > SMS > 프로젝트 관리
2. Service ID 복사

---

## 환경 변수 설정

### .env 파일에 추가

```bash
# ============================================================================
# 알림 시스템 (Kakao Alimtalk + Naver SENS)
# ============================================================================

# ----------------------------------------------------------------------------
# 카카오 알림톡
# ----------------------------------------------------------------------------
# 카카오 비즈니스 채널 발신키
KAKAO_SENDER_KEY=your-sender-key-here

# 카카오 REST API 키
KAKAO_ALIMTALK_API_KEY=your-rest-api-key-here

# 알림톡 API URL (기본값 사용)
KAKAO_ALIMTALK_API_URL=https://alimtalk-api.biz.kakao.com/v2/sender/send

# ----------------------------------------------------------------------------
# 네이버 SENS (SMS/LMS)
# ----------------------------------------------------------------------------
# 네이버 클라우드 Access Key
NAVER_SENS_ACCESS_KEY=your-access-key-here

# 네이버 클라우드 Secret Key
NAVER_SENS_SECRET_KEY=your-secret-key-here

# SENS Service ID
NAVER_SENS_SERVICE_ID=ncp:sms:kr:123456789012:your-service-id

# 발신 전화번호 (하이픈 포함)
NAVER_SENS_FROM_NUMBER=02-1234-5678
```

### 환경 변수 검증

```bash
# 검증 스크립트에 추가 필요
pnpm validate-env
```

---

## 사용 방법

### 1. 결제 완료 후 알림 발송

**파일**: `app/api/application-writer/payment-complete/route.ts`

```typescript
import { sendPaymentSuccessAlimtalk } from '@/lib/notifications/kakao-alimtalk'
import { sendPaymentSuccessSMS } from '@/lib/notifications/naver-sens'

export async function POST(request: NextRequest) {
  // ... 결제 처리 로직 ...

  // 알림 발송 (비동기, 실패해도 결제는 성공)
  Promise.all([
    sendPaymentSuccessAlimtalk({
      phoneNumber: user.phone,
      userName: user.name,
      tier,
      credits: tierCredits[tier],
      amount,
      paymentDate: new Date().toLocaleString('ko-KR'),
    }),
    sendPaymentSuccessSMS({
      phoneNumber: user.phone,
      userName: user.name,
      tier,
      credits: tierCredits[tier],
      amount,
    }),
  ]).catch(error => {
    console.error('Notification send failed:', error)
    // 알림 실패는 로그만 기록하고 에러 발생 안함
  })

  return NextResponse.json({ success: true, ... })
}
```

### 2. 신청서 완성 후 알림 발송

**파일**: `components/ApplicationWriter.tsx`

```typescript
const handleApplicationComplete = async (applicationId: string) => {
  // 신청서 완성 처리...

  // 알림 발송
  try {
    await Promise.all([
      sendApplicationGeneratedAlimtalk({
        phoneNumber: user.phone,
        userName: user.name,
        announcementTitle: announcement.title,
        applicationId,
      }),
      sendApplicationGeneratedSMS({
        phoneNumber: user.phone,
        userName: user.name,
        announcementTitle: announcement.title,
        applicationId,
      }),
    ])
  } catch (error) {
    console.error('Notification failed:', error)
  }
}
```

### 3. 개발 환경에서 테스트

개발 환경에서는 실제로 발송하지 않고 콘솔에만 로그 출력:

```typescript
import { sendSMSSafe } from '@/lib/notifications/naver-sens'

// 개발: 콘솔 로그만
// 프로덕션: 실제 발송
await sendSMSSafe({
  to: '010-1234-5678',
  content: '테스트 메시지',
})
```

---

## 비용 안내

### 카카오 알림톡

- **기본료**: 무료
- **발송 단가**: 약 6-8원/건
- **월 예상 비용** (1000건 기준): 6,000-8,000원
- **특징**:
  - 카카오톡 사용자에게 높은 도달률 (95%+)
  - 버튼을 통한 직접 이동 가능
  - 템플릿 사전 승인 필요

### 네이버 SENS

- **기본료**: 무료
- **SMS (단문, 80자 이하)**: 9원/건
- **LMS (장문, 2000자 이하)**: 30원/건
- **월 예상 비용** (1000건 기준): 9,000-30,000원
- **특징**:
  - 모든 휴대폰에 도달 가능
  - 즉시 발송 (템플릿 승인 불필요)
  - 카카오톡 미사용자 커버

### 권장 전략

**하이브리드 발송**:
1. 1차: 카카오 알림톡 시도 (저렴 + 높은 도달률)
2. 2차: 실패 시 네이버 SMS 발송 (모든 사용자 커버)

**예상 비용** (월 1000명 기준):
- 알림톡 성공 (90%): 900건 × 7원 = 6,300원
- SMS 백업 (10%): 100건 × 30원 = 3,000원
- **총 비용**: 약 9,300원/월

---

## 문제 해결

### 카카오 알림톡

#### 1. 템플릿 승인 거부

**원인**: 광고성 문구, 불명확한 내용

**해결**:
- 명확한 서비스 안내 문구 사용
- 광고성 표현 제거
- 필수 정보만 포함

#### 2. 발송 실패 (code: 3008)

**원인**: 템플릿 변수 불일치

**해결**:
```typescript
// 템플릿에 정의된 변수명과 정확히 일치해야 함
templateParams: {
  userName: '홍길동', // OK
  user_name: '홍길동', // ❌ 오류
}
```

#### 3. 발송 실패 (code: 4000)

**원인**: API 키 또는 발신키 오류

**해결**:
- 환경 변수 재확인
- 카카오 개발자 콘솔에서 키 재발급

### 네이버 SENS

#### 1. Signature 오류

**원인**: Access Key, Secret Key, Timestamp 불일치

**해결**:
```typescript
// 반드시 밀리초 단위 timestamp 사용
const timestamp = Date.now().toString()
```

#### 2. 발신번호 미등록 오류

**원인**: 발신번호 승인 전 발송 시도

**해결**:
- 네이버 클라우드 콘솔에서 발신번호 승인 상태 확인
- 승인 완료 후 재시도

#### 3. 일일 발송 한도 초과

**원인**: 일일 1000건 기본 한도

**해결**:
- 네이버 클라우드 고객센터에 한도 증설 요청
- 사업자 인증 시 더 높은 한도

---

## 다음 단계

### 구현 필요 사항

1. **사용자 전화번호 수집**
   - 회원가입 시 전화번호 입력란 추가
   - 본인 인증 연동 (선택사항)

2. **데이터베이스 스키마 업데이트**
   ```sql
   ALTER TABLE users ADD COLUMN phone VARCHAR(20);
   ALTER TABLE users ADD COLUMN notification_enabled BOOLEAN DEFAULT true;
   ```

3. **알림 설정 페이지**
   - 마이페이지에서 알림 수신 동의 관리
   - 알림 타입별 수신 설정

4. **발송 로그 기록**
   ```sql
   CREATE TABLE notification_logs (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     type VARCHAR(50), -- 'payment_success', 'analysis_complete' 등
     channel VARCHAR(20), -- 'kakao', 'sms'
     status VARCHAR(20), -- 'sent', 'failed'
     sent_at TIMESTAMP,
     error_message TEXT
   );
   ```

5. **재발송 로직**
   - 알림톡 실패 시 SMS 자동 재발송
   - 발송 실패 건에 대한 재시도 스케줄러

---

**마지막 업데이트**: 2025-11-13
