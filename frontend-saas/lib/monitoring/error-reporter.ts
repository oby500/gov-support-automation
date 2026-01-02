/**
 * Error Reporting and Monitoring System
 *
 * 프론트엔드 에러를 수집하고 분석하는 시스템
 * - 클라이언트 에러 수집
 * - 백엔드 API 에러 추적
 * - 에러 패턴 분석
 */

export interface ErrorReport {
  id: string;
  timestamp: string;
  type: 'client' | 'api' | 'network' | 'validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context: {
    url: string;
    userAgent: string;
    userId?: string;
    sessionId?: string;
    component?: string;
    action?: string;
  };
  metadata?: Record<string, any>;
}

class ErrorReporter {
  private static instance: ErrorReporter;
  private errors: ErrorReport[] = [];
  private readonly maxErrors = 100; // 메모리에 보관할 최대 에러 수

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  /**
   * 에러 보고
   */
  report(error: Error | string, context?: Partial<ErrorReport['context']>, metadata?: Record<string, any>) {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      type: this.determineErrorType(error, metadata),
      severity: this.determineSeverity(error, metadata),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        ...context,
      },
      metadata,
    };

    this.errors.push(errorReport);

    // 메모리 관리: 최대 개수 초과 시 오래된 에러 제거
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // 콘솔에 에러 출력
    this.logToConsole(errorReport);

    // 프로덕션 환경에서는 외부 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(errorReport);
    }

    return errorReport.id;
  }

  /**
   * API 에러 보고
   */
  reportApiError(
    url: string,
    method: string,
    status: number,
    error: Error | string,
    context?: Partial<ErrorReport['context']>
  ) {
    return this.report(error, {
      ...context,
      action: `API_${method}_${status}`,
    }, {
      api: {
        url,
        method,
        status,
      },
    });
  }

  /**
   * 결제 에러 보고
   */
  reportPaymentError(
    error: Error | string,
    paymentData: {
      paymentId?: string;
      tier?: string;
      amount?: number;
      step: string;
    },
    context?: Partial<ErrorReport['context']>
  ) {
    return this.report(error, {
      ...context,
      action: `PAYMENT_ERROR_${paymentData.step}`,
      component: 'PaymentFlow',
    }, {
      payment: paymentData,
    });
  }

  /**
   * 네트워크 에러 보고
   */
  reportNetworkError(
    url: string,
    error: Error | string,
    context?: Partial<ErrorReport['context']>
  ) {
    return this.report(error, {
      ...context,
      action: 'NETWORK_ERROR',
    }, {
      network: {
        url,
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      },
    });
  }

  /**
   * 에러 조회
   */
  getErrors(filters?: {
    type?: ErrorReport['type'];
    severity?: ErrorReport['severity'];
    userId?: string;
    since?: Date;
  }): ErrorReport[] {
    let filtered = [...this.errors];

    if (filters) {
      if (filters.type) {
        filtered = filtered.filter((e) => e.type === filters.type);
      }
      if (filters.severity) {
        filtered = filtered.filter((e) => e.severity === filters.severity);
      }
      if (filters.userId) {
        filtered = filtered.filter((e) => e.context.userId === filters.userId);
      }
      if (filters.since) {
        filtered = filtered.filter((e) => new Date(e.timestamp) >= filters.since!);
      }
    }

    return filtered;
  }

  /**
   * 에러 통계
   */
  getStats() {
    const total = this.errors.length;
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byComponent: Record<string, number> = {};

    this.errors.forEach((error) => {
      byType[error.type] = (byType[error.type] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      if (error.context.component) {
        byComponent[error.context.component] = (byComponent[error.context.component] || 0) + 1;
      }
    });

    return {
      total,
      byType,
      bySeverity,
      byComponent,
      lastError: this.errors[this.errors.length - 1],
    };
  }

  /**
   * 에러 초기화
   */
  clear() {
    this.errors = [];
  }

  // Private methods

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineErrorType(
    error: Error | string,
    metadata?: Record<string, any>
  ): ErrorReport['type'] {
    if (metadata?.api) return 'api';
    if (metadata?.network) return 'network';
    if (metadata?.validation) return 'validation';

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('fetch') || message.includes('network')) return 'network';
    if (message.includes('API') || message.includes('backend')) return 'api';
    if (message.includes('validation') || message.includes('invalid')) return 'validation';

    return 'client';
  }

  private determineSeverity(
    error: Error | string,
    metadata?: Record<string, any>
  ): ErrorReport['severity'] {
    const message = error instanceof Error ? error.message : String(error);

    // Critical: 결제 실패, 데이터 손실
    if (
      message.includes('payment') ||
      message.includes('transaction') ||
      message.includes('data loss') ||
      metadata?.payment
    ) {
      return 'critical';
    }

    // High: API 에러, 인증 실패
    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('500') ||
      message.includes('authentication')
    ) {
      return 'high';
    }

    // Medium: 네트워크 에러, 일시적 실패
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('retry')
    ) {
      return 'medium';
    }

    // Low: 검증 에러, UI 에러
    return 'low';
  }

  private logToConsole(report: ErrorReport) {
    const severityColors = {
      low: 'color: #3b82f6',
      medium: 'color: #eab308',
      high: 'color: #f97316',
      critical: 'color: #dc2626; font-weight: bold',
    };

    console.groupCollapsed(
      `%c[${report.severity.toUpperCase()}] ${report.type} error: ${report.message}`,
      severityColors[report.severity]
    );
    console.log('Error ID:', report.id);
    console.log('Timestamp:', report.timestamp);
    console.log('Context:', report.context);
    if (report.metadata) {
      console.log('Metadata:', report.metadata);
    }
    if (report.stack) {
      console.log('Stack trace:', report.stack);
    }
    console.groupEnd();
  }

  private async sendToExternalService(report: ErrorReport) {
    try {
      // TODO: Sentry, DataDog, LogRocket 등의 서비스로 전송
      // 현재는 API 엔드포인트로 전송
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch (error) {
      // 에러 보고 중 에러 발생 시 무시 (무한 루프 방지)
      console.error('Failed to send error report:', error);
    }
  }
}

// Singleton instance
export const errorReporter = ErrorReporter.getInstance();

/**
 * React Error Boundary에서 사용할 수 있는 헬퍼 함수
 */
export function reportComponentError(
  error: Error,
  errorInfo: { componentStack: string },
  componentName: string
) {
  return errorReporter.report(error, {
    component: componentName,
    action: 'COMPONENT_ERROR',
  }, {
    componentStack: errorInfo.componentStack,
  });
}

/**
 * API 호출 래퍼 (자동 에러 보고)
 */
export async function fetchWithErrorReporting<T>(
  url: string,
  options?: RequestInit,
  context?: Partial<ErrorReport['context']>
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = new Error(`API error: ${response.status} ${response.statusText}`);
      errorReporter.reportApiError(
        url,
        options?.method || 'GET',
        response.status,
        error,
        context
      );
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorReporter.reportNetworkError(url, error, context);
    } else if (!(error instanceof Error && error.message.includes('API error'))) {
      errorReporter.reportApiError(
        url,
        options?.method || 'GET',
        0,
        error as Error,
        context
      );
    }
    throw error;
  }
}
