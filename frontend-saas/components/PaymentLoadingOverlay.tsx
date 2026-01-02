'use client'

/**
 * PaymentLoadingOverlay 컴포넌트
 *
 * 결제 처리 중 표시되는 전체 화면 오버레이
 * - 단계별 진행 상태 표시
 * - 사용자 이탈 방지 메시지
 */

import { useEffect, useState } from 'react'
import { Loader2, CreditCard, Server, CheckCircle2 } from 'lucide-react'

interface PaymentLoadingOverlayProps {
  show: boolean
  stage: 'payment' | 'processing' | 'allocating' | 'complete'
  message?: string
}

export function PaymentLoadingOverlay({
  show,
  stage,
  message,
}: PaymentLoadingOverlayProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (show) {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
      }, 500)
      return () => clearInterval(interval)
    }
  }, [show])

  if (!show) return null

  const stages = [
    {
      id: 'payment',
      icon: CreditCard,
      label: '결제 처리',
      description: '결제 정보를 확인하고 있습니다',
    },
    {
      id: 'processing',
      icon: Server,
      label: '결제 승인',
      description: '결제가 승인되었습니다',
    },
    {
      id: 'allocating',
      icon: CheckCircle2,
      label: '수정권 할당',
      description: '수정권을 할당하고 있습니다',
    },
    {
      id: 'complete',
      icon: CheckCircle2,
      label: '완료',
      description: '모든 처리가 완료되었습니다',
    },
  ]

  const currentStageIndex = stages.findIndex((s) => s.id === stage)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Main Loading Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-blue-100 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
          결제 처리 중{dots}
        </h3>

        {message && (
          <p className="text-sm text-center text-gray-600 mb-6">
            {message}
          </p>
        )}

        {/* Progress Steps */}
        <div className="space-y-4 mb-6">
          {stages.map((stageItem, index) => {
            const Icon = stageItem.icon
            const isActive = index === currentStageIndex
            const isCompleted = index < currentStageIndex
            const isPending = index > currentStageIndex

            return (
              <div
                key={stageItem.id}
                className={`flex items-start gap-3 transition-all duration-300 ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted
                      ? 'bg-green-100 text-green-600'
                      : isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon
                      className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      isActive || isCompleted
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {stageItem.label}
                  </p>
                  <p
                    className={`text-xs ${
                      isActive || isCompleted
                        ? 'text-gray-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {stageItem.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Warning Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800 text-center">
            ⚠️ 페이지를 닫거나 새로고침하지 마세요.
            <br />
            결제 처리가 완료될 때까지 잠시만 기다려주세요.
          </p>
        </div>
      </div>
    </div>
  )
}
