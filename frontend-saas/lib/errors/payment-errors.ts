/**
 * Payment Error Handling and Retry Logic
 *
 * Comprehensive error handling for payment flows with automatic retry logic
 * and user-friendly error messages.
 */

export enum PaymentErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Validation errors
  INVALID_TIER = 'INVALID_TIER',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  MISSING_PARAMETERS = 'MISSING_PARAMETERS',

  // Payment provider errors
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_TIMEOUT = 'PAYMENT_TIMEOUT',
  PAYMENT_PROVIDER_ERROR = 'PAYMENT_PROVIDER_ERROR',

  // Backend errors
  BACKEND_ERROR = 'BACKEND_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CREDIT_ALLOCATION_FAILED = 'CREDIT_ALLOCATION_FAILED',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface PaymentError {
  code: PaymentErrorCode;
  message: string;
  userMessage: string;
  retryable: boolean;
  statusCode?: number;
  originalError?: Error;
}

/**
 * Create a payment error from various error sources
 */
export function createPaymentError(
  error: unknown,
  context?: string
): PaymentError {
  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: PaymentErrorCode.NETWORK_ERROR,
      message: 'Network request failed',
      userMessage: '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.',
      retryable: true,
      originalError: error,
    };
  }

  // Handle HTTP response errors
  if (error && typeof error === 'object' && 'status' in error) {
    const statusCode = (error as { status: number }).status;

    switch (statusCode) {
      case 401:
        return {
          code: PaymentErrorCode.UNAUTHORIZED,
          message: 'User not authenticated',
          userMessage: '로그인이 필요합니다. 다시 로그인해주세요.',
          retryable: false,
          statusCode,
        };

      case 400:
        return {
          code: PaymentErrorCode.MISSING_PARAMETERS,
          message: 'Invalid request parameters',
          userMessage: '요청 정보가 올바르지 않습니다. 다시 시도해주세요.',
          retryable: false,
          statusCode,
        };

      case 408:
      case 504:
        return {
          code: PaymentErrorCode.TIMEOUT,
          message: 'Request timeout',
          userMessage: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
          retryable: true,
          statusCode,
        };

      case 500:
      case 502:
      case 503:
        return {
          code: PaymentErrorCode.BACKEND_ERROR,
          message: 'Backend service error',
          userMessage: '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
          retryable: true,
          statusCode,
        };

      default:
        return {
          code: PaymentErrorCode.UNKNOWN_ERROR,
          message: `HTTP error: ${statusCode}`,
          userMessage: '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          retryable: true,
          statusCode,
        };
    }
  }

  // Handle PortOne errors
  if (error && typeof error === 'object' && 'code' in error) {
    const portoneError = error as { code: string; message: string };

    if (portoneError.code === 'PAYMENT_CANCELLED') {
      return {
        code: PaymentErrorCode.PAYMENT_CANCELLED,
        message: 'Payment cancelled by user',
        userMessage: '결제가 취소되었습니다.',
        retryable: false,
      };
    }

    if (portoneError.code === 'PAYMENT_TIMEOUT') {
      return {
        code: PaymentErrorCode.PAYMENT_TIMEOUT,
        message: 'Payment timeout',
        userMessage: '결제 시간이 초과되었습니다. 다시 시도해주세요.',
        retryable: true,
      };
    }

    return {
      code: PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
      message: `PortOne error: ${portoneError.code}`,
      userMessage: portoneError.message || '결제 처리 중 오류가 발생했습니다.',
      retryable: false,
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      code: PaymentErrorCode.UNKNOWN_ERROR,
      message: error.message,
      userMessage: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      retryable: true,
      originalError: error,
    };
  }

  // Default error
  return {
    code: PaymentErrorCode.UNKNOWN_ERROR,
    message: 'Unknown error occurred',
    userMessage: '알 수 없는 오류가 발생했습니다. 고객센터에 문의해주세요.',
    retryable: false,
  };
}

/**
 * Retry configuration for payment operations
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: PaymentError | undefined;
  let delay = retryConfig.initialDelay;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = createPaymentError(error);

      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }

      // Don't retry if this was the last attempt
      if (attempt === retryConfig.maxAttempts) {
        throw lastError;
      }

      // Log retry attempt
      console.warn(
        `Payment operation failed (attempt ${attempt}/${retryConfig.maxAttempts}): ${lastError.message}`
      );

      // Wait before retrying with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed');
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Handle payment API response
 */
export async function handlePaymentResponse<T>(
  response: Response
): Promise<T> {
  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'Unknown error' };
    }

    const error = createPaymentError({
      status: response.status,
      message: errorData.message || errorData.error || 'Payment failed',
    });

    throw error;
  }

  try {
    return await response.json();
  } catch (error) {
    throw createPaymentError(error, 'Failed to parse response');
  }
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  const paymentError = createPaymentError(error);
  return paymentError.userMessage;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const paymentError = createPaymentError(error);
  return paymentError.retryable;
}

/**
 * Log payment error with context
 */
export function logPaymentError(
  error: unknown,
  context: string,
  metadata?: Record<string, any>
): void {
  const paymentError = createPaymentError(error, context);

  console.error('Payment Error:', {
    context,
    code: paymentError.code,
    message: paymentError.message,
    userMessage: paymentError.userMessage,
    retryable: paymentError.retryable,
    statusCode: paymentError.statusCode,
    metadata,
    timestamp: new Date().toISOString(),
  });

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to Sentry, LogRocket, or other error tracking service
  }
}
