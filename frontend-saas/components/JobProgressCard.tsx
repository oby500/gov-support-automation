'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  FileText,
  AlertCircle
} from 'lucide-react'
import { JobStatusType } from '@/hooks/useJobStatus'

interface JobProgressCardProps {
  /** Job 상태 */
  status: JobStatusType | null
  /** 진행률 (0-100) */
  progress: number
  /** 진행 상태 메시지 */
  progressMessage: string | null
  /** 현재 처리 중인 스타일 */
  currentStyle: string | null
  /** 생성할 스타일 목록 */
  styles: string[]
  /** 에러 메시지 */
  error: string | null
  /** 로딩 중인지 여부 */
  isLoading?: boolean
  /** 취소 핸들러 */
  onCancel?: () => void
  /** 취소 가능 여부 */
  canCancel?: boolean
  /** 결과 보기 핸들러 */
  onViewResult?: () => void
  /** 다시 시도 핸들러 */
  onRetry?: () => void
}

/**
 * 스타일 이름 한글 매핑
 */
const STYLE_NAMES: Record<string, string> = {
  story: '스토리텔링',
  data: '데이터 중심',
  aggressive: '공격적',
  balanced: '균형잡힌',
  strategic: '전략적',
}

/**
 * 상태별 아이콘
 */
const StatusIcon: React.FC<{ status: JobStatusType | null; className?: string }> = ({
  status,
  className = 'h-5 w-5'
}) => {
  switch (status) {
    case 'pending':
      return <Clock className={`${className} text-yellow-500`} />
    case 'processing':
      return <Loader2 className={`${className} text-blue-500 animate-spin`} />
    case 'completed':
      return <CheckCircle2 className={`${className} text-green-500`} />
    case 'failed':
      return <XCircle className={`${className} text-red-500`} />
    case 'cancelled':
      return <Ban className={`${className} text-gray-500`} />
    default:
      return <FileText className={`${className} text-gray-400`} />
  }
}

/**
 * 상태별 텍스트
 */
const getStatusText = (status: JobStatusType | null): string => {
  switch (status) {
    case 'pending':
      return '대기 중'
    case 'processing':
      return '생성 중'
    case 'completed':
      return '완료'
    case 'failed':
      return '실패'
    case 'cancelled':
      return '취소됨'
    default:
      return '알 수 없음'
  }
}

/**
 * 상태별 배경색
 */
const getStatusBgColor = (status: JobStatusType | null): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-50 border-yellow-200'
    case 'processing':
      return 'bg-blue-50 border-blue-200'
    case 'completed':
      return 'bg-green-50 border-green-200'
    case 'failed':
      return 'bg-red-50 border-red-200'
    case 'cancelled':
      return 'bg-gray-50 border-gray-200'
    default:
      return 'bg-gray-50 border-gray-200'
  }
}

/**
 * JobProgressCard 컴포넌트
 *
 * Job 진행 상황을 시각적으로 표시하는 카드 컴포넌트입니다.
 */
export function JobProgressCard({
  status,
  progress,
  progressMessage,
  currentStyle,
  styles,
  error,
  isLoading = false,
  onCancel,
  canCancel = true,
  onViewResult,
  onRetry,
}: JobProgressCardProps) {
  const isPending = status === 'pending'
  const isProcessing = status === 'processing'
  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'
  const isCancelled = status === 'cancelled'
  const isFinished = isCompleted || isFailed || isCancelled

  // 로딩 중 상태
  if (isLoading && !status) {
    return (
      <Card className="border border-gray-200">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>상태 확인 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border ${getStatusBgColor(status)} transition-colors duration-300`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <StatusIcon status={status} />
          <span>신청서 생성 {getStatusText(status)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 진행률 바 */}
        {(isPending || isProcessing) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {progressMessage || (isPending ? '대기열에서 순서를 기다리고 있습니다...' : '생성 중...')}
              </span>
              <span className="font-medium text-blue-600">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* 현재 처리 중인 스타일 */}
        {isProcessing && currentStyle && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span>
              <strong>{STYLE_NAMES[currentStyle] || currentStyle}</strong> 스타일 생성 중...
            </span>
          </div>
        )}

        {/* 스타일 진행 상황 */}
        {styles.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm text-gray-500">스타일 진행 상황:</span>
            <div className="flex flex-wrap gap-2">
              {styles.map((style, index) => {
                const isCurrentStyle = currentStyle === style
                const isCompletedStyle = currentStyle
                  ? styles.indexOf(currentStyle) > index || isCompleted
                  : isCompleted

                return (
                  <span
                    key={style}
                    className={`
                      px-2 py-1 rounded-full text-xs font-medium transition-colors
                      ${isCompletedStyle
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : isCurrentStyle
                          ? 'bg-blue-100 text-blue-700 border border-blue-300 animate-pulse'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'}
                    `}
                  >
                    {isCompletedStyle && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
                    {isCurrentStyle && <Loader2 className="inline h-3 w-3 mr-1 animate-spin" />}
                    {STYLE_NAMES[style] || style}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* 완료 메시지 */}
        {isCompleted && (
          <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-700 font-medium">
              신청서 생성이 완료되었습니다!
            </span>
          </div>
        )}

        {/* 에러 메시지 */}
        {isFailed && error && (
          <div className="flex items-start gap-2 p-3 bg-red-100 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-red-700">
              <p className="font-medium">생성 중 오류가 발생했습니다</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 취소됨 메시지 */}
        {isCancelled && (
          <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
            <Ban className="h-5 w-5 text-gray-600" />
            <span className="text-gray-700">
              신청서 생성이 취소되었습니다.
            </span>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="flex gap-2 pt-2">
          {/* 취소 버튼 */}
          {(isPending || isProcessing) && canCancel && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Ban className="h-4 w-4 mr-1" />
              취소
            </Button>
          )}

          {/* 결과 보기 버튼 */}
          {isCompleted && onViewResult && (
            <Button
              variant="default"
              size="sm"
              onClick={onViewResult}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileText className="h-4 w-4 mr-1" />
              결과 보기
            </Button>
          )}

          {/* 다시 시도 버튼 */}
          {(isFailed || isCancelled) && onRetry && (
            <Button
              variant="default"
              size="sm"
              onClick={onRetry}
            >
              다시 시도
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default JobProgressCard
