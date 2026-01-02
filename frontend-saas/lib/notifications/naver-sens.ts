/**
 * 네이버 SENS (Simple & Easy Notification Service)
 *
 * 네이버 클라우드 플랫폼의 SMS/LMS 발송 서비스
 * https://api.ncloud-docs.com/docs/ai-application-service-sens-smsv2
 */

import crypto from 'crypto'

interface SendSMSParams {
  to: string // 수신 번호
  content: string // 메시지 내용
  subject?: string // LMS 제목 (장문 메시지)
  type?: 'SMS' | 'LMS' // SMS: 단문(80자), LMS: 장문(2000자)
}

interface SendSMSResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * HMAC-SHA256 서명 생성 (네이버 SENS API 인증)
 */
function makeSignature(timestamp: string): string {
  const serviceId = process.env.NAVER_SENS_SERVICE_ID || ''
  const accessKey = process.env.NAVER_SENS_ACCESS_KEY || ''
  const secretKey = process.env.NAVER_SENS_SECRET_KEY || ''

  const space = ' '
  const newLine = '\n'
  const method = 'POST'
  const url = `/sms/v2/services/${serviceId}/messages`

  const message = method + space + url + newLine + timestamp + newLine + accessKey

  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64')
}

/**
 * 네이버 SENS SMS/LMS 발송
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  try {
    const serviceId = process.env.NAVER_SENS_SERVICE_ID
    const accessKey = process.env.NAVER_SENS_ACCESS_KEY
    const fromNumber = process.env.NAVER_SENS_FROM_NUMBER

    if (!serviceId || !accessKey || !fromNumber) {
      console.error('Naver SENS credentials not configured')
      return { success: false, error: 'Configuration missing' }
    }

    // 메시지 타입 자동 결정 (80자 초과 시 LMS)
    const messageType = params.type || (params.content.length > 80 ? 'LMS' : 'SMS')

    const timestamp = Date.now().toString()
    const signature = makeSignature(timestamp)

    const response = await fetch(
      `https://sens.apigw.ntruss.com/sms/v2/services/${serviceId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'x-ncp-apigw-timestamp': timestamp,
          'x-ncp-iam-access-key': accessKey,
          'x-ncp-apigw-signature-v2': signature,
        },
        body: JSON.stringify({
          type: messageType,
          from: fromNumber,
          subject: params.subject || '',
          content: params.content,
          messages: [
            {
              to: params.to.replace(/[^0-9]/g, ''), // 숫자만 추출
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Naver SENS send failed:', errorData)
      return { success: false, error: errorData.error || 'Send failed' }
    }

    const result = await response.json()
    console.log('Naver SENS sent successfully:', result)

    return {
      success: true,
      messageId: result.requestId,
    }
  } catch (error) {
    console.error('Naver SENS error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 결제 완료 SMS 발송
 */
export async function sendPaymentSuccessSMS(params: {
  phoneNumber: string
  userName: string
  tier: 'basic' | 'standard' | 'premium'
  credits: number
  amount: number
}): Promise<SendSMSResult> {
  const tierNames = {
    basic: '베이직',
    standard: '스탠다드',
    premium: '프리미엄',
  }

  const content = `[로텐] ${params.userName}님, 결제가 완료되었습니다!

✅ 구매 플랜: ${tierNames[params.tier]}
💰 결제 금액: ${params.amount.toLocaleString()}원
🎫 획득 수정권: +${params.credits}회

마이페이지에서 확인하세요.
${process.env.NEXT_PUBLIC_BASE_URL}/mypage

감사합니다.`

  return sendSMS({
    to: params.phoneNumber,
    content,
    type: 'LMS',
    subject: '[로텐] 결제 완료 안내',
  })
}

/**
 * 수정권 구매 완료 SMS 발송
 */
export async function sendRevisionCreditPurchasedSMS(params: {
  phoneNumber: string
  userName: string
  credits: number
  totalCredits: number
  amount: number
}): Promise<SendSMSResult> {
  const content = `[로텐] ${params.userName}님, 수정권 구매가 완료되었습니다!

💳 결제 금액: ${params.amount.toLocaleString()}원
🎫 구매 수정권: +${params.credits}회
📊 보유 수정권: ${params.totalCredits}회

마이페이지에서 사용하세요.
${process.env.NEXT_PUBLIC_BASE_URL}/mypage

감사합니다.`

  return sendSMS({
    to: params.phoneNumber,
    content,
    type: 'LMS',
    subject: '[로텐] 수정권 구매 완료',
  })
}

/**
 * Writing Analysis 완료 SMS 발송
 */
export async function sendWritingAnalysisCompleteSMS(params: {
  phoneNumber: string
  userName: string
  announcementTitle: string
}): Promise<SendSMSResult> {
  const content = `[로텐] ${params.userName}님, Writing Analysis가 완료되었습니다!

📋 공고: ${params.announcementTitle}

이제 회사 정보를 입력하시면 AI가 맞춤형 신청서를 작성해드립니다.

${process.env.NEXT_PUBLIC_BASE_URL}/mypage`

  return sendSMS({
    to: params.phoneNumber,
    content,
    type: 'LMS',
    subject: '[로텐] Analysis 완료',
  })
}

/**
 * 신청서 생성 완료 SMS 발송
 */
export async function sendApplicationGeneratedSMS(params: {
  phoneNumber: string
  userName: string
  announcementTitle: string
  applicationId: string
}): Promise<SendSMSResult> {
  const content = `[로텐] ${params.userName}님, AI 신청서가 완성되었습니다! 🎉

📋 공고: ${params.announcementTitle}

지금 바로 확인하고 다운로드하세요.
${process.env.NEXT_PUBLIC_BASE_URL}/applications/${params.applicationId}

감사합니다.`

  return sendSMS({
    to: params.phoneNumber,
    content,
    type: 'LMS',
    subject: '[로텐] 신청서 완성',
  })
}

/**
 * 개발 환경에서는 콘솔 로그만 출력
 */
export async function sendSMSSafe(params: SendSMSParams): Promise<SendSMSResult> {
  if (process.env.NODE_ENV === 'development') {
    console.log('📱 [DEV] Naver SENS SMS (not sent in development):', {
      to: params.to,
      type: params.type,
      subject: params.subject,
      content: params.content,
    })
    return { success: true, messageId: 'dev-' + Date.now() }
  }

  return sendSMS(params)
}

/**
 * SMS 발송 비용 계산
 */
export function calculateSMSCost(content: string): { type: 'SMS' | 'LMS'; cost: number } {
  const isSMS = content.length <= 80
  return {
    type: isSMS ? 'SMS' : 'LMS',
    cost: isSMS ? 9 : 30, // SMS: 9원, LMS: 30원 (네이버 SENS 기준)
  }
}
