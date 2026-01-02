/**
 * 카카오 알림톡 발송 시스템
 *
 * 카카오 비즈니스 메시지 API를 사용하여 알림톡 발송
 * https://developers.kakao.com/docs/latest/ko/message/rest-api
 */

interface AlimtalkTemplate {
  templateCode: string
  templateName: string
}

// 알림톡 템플릿 코드 (카카오 비즈니스 채널에서 발급)
const TEMPLATES: Record<string, AlimtalkTemplate> = {
  PAYMENT_SUCCESS: {
    templateCode: 'payment_success_001',
    templateName: '결제 완료 안내',
  },
  REVISION_CREDIT_PURCHASED: {
    templateCode: 'revision_credit_001',
    templateName: '수정권 구매 완료',
  },
  WRITING_ANALYSIS_COMPLETE: {
    templateCode: 'analysis_complete_001',
    templateName: 'Writing Analysis 완료',
  },
  APPLICATION_GENERATED: {
    templateCode: 'application_ready_001',
    templateName: '신청서 생성 완료',
  },
}

interface SendAlimtalkParams {
  phoneNumber: string
  templateCode: string
  templateParams: Record<string, string>
  buttons?: Array<{
    name: string
    type: 'WL' | 'AL' | 'DS' | 'BK' | 'MD'
    url_mobile?: string
    url_pc?: string
  }>
}

/**
 * 카카오 알림톡 발송
 *
 * @param params 발송 파라미터
 * @returns 발송 성공 여부
 */
export async function sendAlimtalk(params: SendAlimtalkParams): Promise<boolean> {
  try {
    const apiUrl = process.env.KAKAO_ALIMTALK_API_URL || 'https://alimtalk-api.biz.kakao.com/v2/sender/send'
    const apiKey = process.env.KAKAO_ALIMTALK_API_KEY
    const senderKey = process.env.KAKAO_SENDER_KEY

    if (!apiKey || !senderKey) {
      console.error('Kakao Alimtalk API credentials not configured')
      return false
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        senderKey,
        templateCode: params.templateCode,
        recipientNo: params.phoneNumber.replace(/[^0-9]/g, ''), // 숫자만 추출
        templateParameter: params.templateParams,
        buttons: params.buttons,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Kakao Alimtalk send failed:', errorData)
      return false
    }

    const result = await response.json()
    console.log('Kakao Alimtalk sent successfully:', result)
    return true

  } catch (error) {
    console.error('Kakao Alimtalk error:', error)
    return false
  }
}

/**
 * 결제 완료 알림톡 발송
 */
export async function sendPaymentSuccessAlimtalk(params: {
  phoneNumber: string
  userName: string
  tier: 'basic' | 'standard' | 'premium'
  credits: number
  amount: number
  paymentDate: string
}): Promise<boolean> {
  const tierNames = {
    basic: '베이직',
    standard: '스탠다드',
    premium: '프리미엄',
  }

  return sendAlimtalk({
    phoneNumber: params.phoneNumber,
    templateCode: TEMPLATES.PAYMENT_SUCCESS.templateCode,
    templateParams: {
      userName: params.userName,
      tier: tierNames[params.tier],
      credits: params.credits.toString(),
      amount: params.amount.toLocaleString(),
      paymentDate: params.paymentDate,
    },
    buttons: [
      {
        name: '마이페이지 확인',
        type: 'WL',
        url_mobile: `${process.env.NEXT_PUBLIC_BASE_URL}/mypage`,
        url_pc: `${process.env.NEXT_PUBLIC_BASE_URL}/mypage`,
      },
    ],
  })
}

/**
 * 수정권 구매 완료 알림톡 발송
 */
export async function sendRevisionCreditPurchasedAlimtalk(params: {
  phoneNumber: string
  userName: string
  credits: number
  totalCredits: number
  amount: number
}): Promise<boolean> {
  return sendAlimtalk({
    phoneNumber: params.phoneNumber,
    templateCode: TEMPLATES.REVISION_CREDIT_PURCHASED.templateCode,
    templateParams: {
      userName: params.userName,
      credits: params.credits.toString(),
      totalCredits: params.totalCredits.toString(),
      amount: params.amount.toLocaleString(),
    },
    buttons: [
      {
        name: '수정권 사용하기',
        type: 'WL',
        url_mobile: `${process.env.NEXT_PUBLIC_BASE_URL}/mypage`,
        url_pc: `${process.env.NEXT_PUBLIC_BASE_URL}/mypage`,
      },
    ],
  })
}

/**
 * Writing Analysis 완료 알림톡 발송
 */
export async function sendWritingAnalysisCompleteAlimtalk(params: {
  phoneNumber: string
  userName: string
  announcementTitle: string
  estimatedTime: string
}): Promise<boolean> {
  return sendAlimtalk({
    phoneNumber: params.phoneNumber,
    templateCode: TEMPLATES.WRITING_ANALYSIS_COMPLETE.templateCode,
    templateParams: {
      userName: params.userName,
      announcementTitle: params.announcementTitle,
      estimatedTime: params.estimatedTime,
    },
    buttons: [
      {
        name: '회사 정보 입력하기',
        type: 'WL',
        url_mobile: `${process.env.NEXT_PUBLIC_BASE_URL}/mypage`,
        url_pc: `${process.env.NEXT_PUBLIC_BASE_URL}/mypage`,
      },
    ],
  })
}

/**
 * 신청서 생성 완료 알림톡 발송
 */
export async function sendApplicationGeneratedAlimtalk(params: {
  phoneNumber: string
  userName: string
  announcementTitle: string
  applicationId: string
}): Promise<boolean> {
  return sendAlimtalk({
    phoneNumber: params.phoneNumber,
    templateCode: TEMPLATES.APPLICATION_GENERATED.templateCode,
    templateParams: {
      userName: params.userName,
      announcementTitle: params.announcementTitle,
    },
    buttons: [
      {
        name: '신청서 확인하기',
        type: 'WL',
        url_mobile: `${process.env.NEXT_PUBLIC_BASE_URL}/applications/${params.applicationId}`,
        url_pc: `${process.env.NEXT_PUBLIC_BASE_URL}/applications/${params.applicationId}`,
      },
      {
        name: '다운로드',
        type: 'WL',
        url_mobile: `${process.env.NEXT_PUBLIC_BASE_URL}/api/applications/${params.applicationId}/download`,
        url_pc: `${process.env.NEXT_PUBLIC_BASE_URL}/api/applications/${params.applicationId}/download`,
      },
    ],
  })
}

/**
 * 개발 환경에서는 콘솔 로그만 출력
 */
export async function sendAlimtalkSafe(params: SendAlimtalkParams): Promise<boolean> {
  if (process.env.NODE_ENV === 'development') {
    console.log('📱 [DEV] Kakao Alimtalk (not sent in development):', {
      phoneNumber: params.phoneNumber,
      templateCode: params.templateCode,
      templateParams: params.templateParams,
    })
    return true
  }

  return sendAlimtalk(params)
}
