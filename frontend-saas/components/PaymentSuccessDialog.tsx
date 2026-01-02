'use client'

/**
 * PaymentSuccessDialog 컴포넌트
 *
 * 결제 성공 시 표시되는 다이얼로그
 * - 축하 메시지
 * - 획득한 수정권 정보
 * - 다음 단계 안내
 */

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PaymentSuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tier?: 'basic' | 'standard' | 'premium'
  credits?: number
  totalCredits?: number
  revisionCredits?: number
  onContinue?: () => void
}

export function PaymentSuccessDialog({
  open,
  onOpenChange,
  tier,
  credits,
  totalCredits,
  revisionCredits,
  onContinue,
}: PaymentSuccessDialogProps) {
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (open) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [open])

  const tierNames = {
    basic: '베이직',
    standard: '스탠다드',
    premium: '프리미엄',
  }

  const tierColors = {
    basic: 'text-blue-600',
    standard: 'text-purple-600',
    premium: 'text-amber-600',
  }

  const handleContinue = () => {
    onOpenChange(false)
    if (onContinue) {
      onContinue()
    }
  }

  const handleGoToMyPage = () => {
    onOpenChange(false)
    router.push('/mypage')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              {showConfetti && (
                <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-2 -right-2 animate-pulse" />
              )}
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            결제가 완료되었습니다!
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {tier && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mt-4">
                  <p className="text-sm text-gray-600 mb-2">구매 티어</p>
                  <p className={`text-2xl font-bold ${tier ? tierColors[tier] : ''}`}>
                    {tier ? tierNames[tier] : ''} 플랜
                  </p>
                </div>

                <div className="bg-white border-2 border-green-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">획득한 수정권</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-3xl font-bold text-green-600">
                      +{credits}
                    </span>
                    <span className="text-lg text-gray-500">회</span>
                  </div>
                </div>

                {totalCredits !== undefined && (
                  <div className="text-sm text-gray-600">
                    현재 보유 수정권: <span className="font-semibold text-gray-900">{totalCredits}회</span>
                  </div>
                )}
              </div>
            )}

            {revisionCredits !== undefined && !tier && (
              <div className="space-y-4">
                <div className="bg-white border-2 border-green-100 rounded-lg p-4 mt-4">
                  <p className="text-sm text-gray-600 mb-2">구매한 수정권</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-3xl font-bold text-green-600">
                      +{revisionCredits}
                    </span>
                    <span className="text-lg text-gray-500">회</span>
                  </div>
                </div>

                {totalCredits !== undefined && (
                  <div className="text-sm text-gray-600">
                    현재 보유 수정권: <span className="font-semibold text-gray-900">{totalCredits}회</span>
                  </div>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-6">
          {onContinue && (
            <Button
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              AI 신청서 작성 시작
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          <Button
            onClick={handleGoToMyPage}
            variant="outline"
            className="w-full"
            size="lg"
          >
            마이페이지에서 확인
          </Button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            💡 수정권은 AI가 생성한 신청서를 수정할 때 사용됩니다.
            <br />
            마이페이지에서 언제든지 확인하실 수 있습니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
