import crypto from 'crypto';

/**
 * PortOne Webhook 시그니처 검증
 *
 * 보안을 위해 PortOne에서 전송하는 Webhook의 진위를 검증합니다.
 * https://developers.portone.io/docs/ko/webhook/guide
 */

export interface PortOneWebhookBody {
  type: string;
  timestamp: string;
  data: any;
}

/**
 * Webhook 시그니처 검증
 *
 * @param body - Webhook 요청 본문 (JSON string)
 * @param signature - PortOne-Signature 헤더 값
 * @param webhookSecret - PortOne Webhook Secret (환경변수)
 * @returns 검증 성공 여부
 */
export function verifyPortOneSignature(
  body: string,
  signature: string | null,
  webhookSecret: string
): boolean {
  if (!signature) {
    console.error('PortOne-Signature header is missing');
    return false;
  }

  if (!webhookSecret) {
    console.error('PORTONE_WEBHOOK_SECRET is not configured');
    return false;
  }

  try {
    // PortOne은 HMAC-SHA256을 사용하여 시그니처 생성
    // 시그니처 = HMAC_SHA256(webhook_secret, request_body)
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body, 'utf8')
      .digest('hex');

    // 타이밍 공격 방지를 위한 constant-time 비교
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Webhook 타임스탬프 검증 (Replay Attack 방지)
 *
 * @param timestamp - Webhook의 timestamp 필드
 * @param toleranceSeconds - 허용 시간 차이 (기본 5분)
 * @returns 타임스탬프 유효성
 */
export function verifyWebhookTimestamp(
  timestamp: string,
  toleranceSeconds: number = 300
): boolean {
  try {
    const webhookTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - webhookTime) / 1000;

    if (timeDiff > toleranceSeconds) {
      console.error(`Webhook timestamp is too old: ${timeDiff}s > ${toleranceSeconds}s`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Timestamp verification failed:', error);
    return false;
  }
}

/**
 * 종합 Webhook 검증 (시그니처 + 타임스탬프)
 *
 * @param body - Webhook 요청 본문 (JSON string)
 * @param signature - PortOne-Signature 헤더 값
 * @param webhookSecret - PortOne Webhook Secret
 * @param timestamp - Webhook의 timestamp 필드
 * @returns 검증 성공 여부
 */
export function verifyPortOneWebhook(
  body: string,
  signature: string | null,
  webhookSecret: string,
  timestamp?: string
): boolean {
  // 1. 시그니처 검증
  const signatureValid = verifyPortOneSignature(body, signature, webhookSecret);
  if (!signatureValid) {
    return false;
  }

  // 2. 타임스탬프 검증 (선택적)
  if (timestamp) {
    const timestampValid = verifyWebhookTimestamp(timestamp);
    if (!timestampValid) {
      return false;
    }
  }

  return true;
}

/**
 * 개발 환경에서 시그니처 검증 우회
 *
 * 프로덕션에서는 절대 사용하지 마세요!
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development';
}
