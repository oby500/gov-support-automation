import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';

/**
 * Error Monitoring API
 *
 * 프론트엔드에서 발생한 에러를 수집하고 저장
 * - 클라이언트 에러 로깅
 * - 에러 패턴 분석을 위한 데이터 수집
 */

interface ErrorReport {
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

export async function POST(request: NextRequest) {
  try {
    // 사용자 정보 조회 (선택적)
    const user = await getCurrentUser();

    const errorReport: ErrorReport = await request.json();

    // 사용자 ID 추가
    if (user?.id) {
      errorReport.context.userId = user.id;
    }

    // 콘솔에 로깅
    console.error('[CLIENT ERROR]', {
      id: errorReport.id,
      severity: errorReport.severity,
      type: errorReport.type,
      message: errorReport.message,
      userId: errorReport.context.userId,
      url: errorReport.context.url,
      component: errorReport.context.component,
      action: errorReport.context.action,
      timestamp: errorReport.timestamp,
    });

    // TODO: 데이터베이스에 저장
    // await db.insert(errorLogs).values({
    //   errorId: errorReport.id,
    //   userId: errorReport.context.userId ? parseInt(errorReport.context.userId) : null,
    //   type: errorReport.type,
    //   severity: errorReport.severity,
    //   message: errorReport.message,
    //   stack: errorReport.stack,
    //   url: errorReport.context.url,
    //   userAgent: errorReport.context.userAgent,
    //   component: errorReport.context.component,
    //   action: errorReport.context.action,
    //   metadata: errorReport.metadata ? JSON.stringify(errorReport.metadata) : null,
    //   createdAt: new Date(errorReport.timestamp),
    // });

    // TODO: Critical 에러는 Slack/Discord 알림
    if (errorReport.severity === 'critical') {
      // await sendSlackAlert(errorReport);
      console.error('🚨 CRITICAL ERROR:', errorReport.message);
    }

    return NextResponse.json({
      success: true,
      errorId: errorReport.id,
      message: 'Error report received',
    });

  } catch (error) {
    console.error('Failed to process error report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process error report',
      },
      { status: 500 }
    );
  }
}

/**
 * 에러 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const user = await getCurrentUser();

    if (!user || user.email !== 'admin@example.com') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // TODO: 데이터베이스에서 에러 통계 조회
    // const stats = await db.query.errorLogs.findMany({
    //   where: gt(errorLogs.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
    //   orderBy: [desc(errorLogs.createdAt)],
    //   limit: 100,
    // });

    const mockStats = {
      total: 0,
      last24Hours: 0,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      byType: {
        client: 0,
        api: 0,
        network: 0,
        validation: 0,
      },
      topErrors: [],
    };

    return NextResponse.json(mockStats);

  } catch (error) {
    console.error('Failed to fetch error stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error stats' },
      { status: 500 }
    );
  }
}
