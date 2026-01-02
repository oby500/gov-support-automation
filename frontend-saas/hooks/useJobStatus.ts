'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Job 상태 타입
 */
export type JobStatusType = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/**
 * Job 상태 응답 인터페이스
 */
export interface JobStatusResponse {
  job_id: string
  status: JobStatusType
  progress: number
  progress_message: string | null
  current_style: string | null
  styles: string[]
  result: Record<string, any> | null
  error: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

/**
 * useJobStatus Hook 반환 타입
 */
export interface UseJobStatusReturn {
  /** 현재 Job 상태 */
  status: JobStatusType | null
  /** 진행률 (0-100) */
  progress: number
  /** 진행 상태 메시지 */
  progressMessage: string | null
  /** 현재 처리 중인 스타일 */
  currentStyle: string | null
  /** 생성할 스타일 목록 */
  styles: string[]
  /** 완료된 결과 */
  result: Record<string, any> | null
  /** 에러 메시지 */
  error: string | null
  /** 폴링 중인지 여부 */
  isPolling: boolean
  /** 로딩 중인지 여부 (첫 상태 조회 전) */
  isLoading: boolean
  /** 폴링 시작 */
  startPolling: () => void
  /** 폴링 중지 */
  stopPolling: () => void
  /** Job 취소 */
  cancelJob: () => Promise<boolean>
  /** 전체 상태 데이터 */
  fullStatus: JobStatusResponse | null
  /** 네트워크 오류 안내 메시지 (있으면 사용자에게 표시) */
  networkError: string | null
}

/**
 * useJobStatus Hook
 *
 * Job 상태를 3초 간격으로 폴링하여 진행 상황을 추적합니다.
 *
 * @param jobId - 추적할 Job ID (null이면 폴링하지 않음)
 * @param options - 옵션
 * @returns Job 상태 및 제어 함수들
 *
 * @example
 * ```tsx
 * const { status, progress, result, startPolling, cancelJob } = useJobStatus(jobId)
 *
 * useEffect(() => {
 *   if (jobId) startPolling()
 * }, [jobId])
 *
 * if (status === 'completed') {
 *   // 결과 처리
 * }
 * ```
 */
export function useJobStatus(
  jobId: string | null,
  options: {
    /** 폴링 간격 (ms), 기본값: 3000 */
    pollInterval?: number
    /** 자동 시작 여부, 기본값: false */
    autoStart?: boolean
    /** 상태 변경 콜백 */
    onStatusChange?: (status: JobStatusType, data: JobStatusResponse) => void
    /** 완료 콜백 */
    onComplete?: (result: Record<string, any>) => void
    /** 실패 콜백 */
    onError?: (error: string) => void
  } = {}
): UseJobStatusReturn {
  const {
    pollInterval = 3000,
    autoStart = false,
    onStatusChange,
    onComplete,
    onError,
  } = options

  // 상태
  const [fullStatus, setFullStatus] = useState<JobStatusResponse | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [networkError, setNetworkError] = useState<string | null>(null)

  // Refs (콜백 안정성을 위해)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const onStatusChangeRef = useRef(onStatusChange)
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)

  // Ref 업데이트
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
  }, [onStatusChange, onComplete, onError])

  /**
   * 상태 조회 함수
   */
  const fetchStatus = useCallback(async () => {
    if (!jobId) return

    try {
      const response = await fetch(`/api/jobs/${jobId}/status`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Status check failed: ${response.status}`)
      }

      const data: JobStatusResponse = await response.json()
      setFullStatus(data)
      setIsLoading(false)
      setNetworkError(null)

      // 상태 변경 콜백
      if (onStatusChangeRef.current) {
        onStatusChangeRef.current(data.status, data)
      }

      // 완료/실패/취소 시 폴링 중지
      if (['completed', 'failed', 'cancelled'].includes(data.status)) {
        setIsPolling(false)

        if (data.status === 'completed' && data.result && onCompleteRef.current) {
          onCompleteRef.current(data.result)
        }

        if (data.status === 'failed' && data.error && onErrorRef.current) {
          onErrorRef.current(data.error)
        }
      }
    } catch (err) {
      console.error('[useJobStatus] Fetch error:', err)
      // 네트워크 오류는 폴링을 중지하지 않음 (일시적 장애일 수 있음)
      setNetworkError('네트워크 오류로 상태 확인에 실패했습니다. 잠시 후 다시 시도합니다.')
    }
  }, [jobId])

  /**
   * 폴링 시작
   */
  const startPolling = useCallback(() => {
    if (!jobId) {
      console.warn('[useJobStatus] Cannot start polling: jobId is null')
      return
    }
    setIsPolling(true)
    setIsLoading(true)
    // 즉시 첫 조회 실행
    fetchStatus()
  }, [jobId, fetchStatus])

  /**
   * 폴링 중지
   */
  const stopPolling = useCallback(() => {
    setIsPolling(false)
  }, [])

  /**
   * Job 취소
   */
  const cancelJob = useCallback(async (): Promise<boolean> => {
    if (!jobId) {
      console.warn('[useJobStatus] Cannot cancel: jobId is null')
      return false
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Cancel failed: ${response.status}`)
      }

      const data = await response.json()

      // 취소 성공 시 상태 업데이트
      if (data.status === 'cancelled') {
        setFullStatus(prev => prev ? { ...prev, status: 'cancelled' } : null)
        setIsPolling(false)
      }

      return data.status === 'cancelled'
    } catch (err) {
      console.error('[useJobStatus] Cancel error:', err)
      return false
    }
  }, [jobId])

  // 폴링 인터벌 관리
  useEffect(() => {
    if (isPolling && jobId) {
      intervalRef.current = setInterval(fetchStatus, pollInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPolling, jobId, pollInterval, fetchStatus])

  // 자동 시작
  useEffect(() => {
    if (autoStart && jobId) {
      startPolling()
    }
  }, [autoStart, jobId, startPolling])

  // jobId 변경 시 상태 초기화
  useEffect(() => {
    if (!jobId) {
      setFullStatus(null)
      setIsPolling(false)
      setIsLoading(true)
    }
  }, [jobId])

  return {
    status: fullStatus?.status ?? null,
    progress: fullStatus?.progress ?? 0,
    progressMessage: fullStatus?.progress_message ?? null,
    currentStyle: fullStatus?.current_style ?? null,
    styles: fullStatus?.styles ?? [],
    result: fullStatus?.result ?? null,
    error: fullStatus?.error ?? null,
    isPolling,
    isLoading,
    startPolling,
    stopPolling,
    cancelJob,
    fullStatus,
    networkError,
  }
}

export default useJobStatus
