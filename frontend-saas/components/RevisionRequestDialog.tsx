'use client'

/**
 * RevisionRequestDialog 컴포넌트
 *
 * 신청서 수정 요청 다이얼로그
 * - 수정 유형 선택
 * - 수정 지시사항 입력
 * - 수정권 차감 확인
 * - 수정 요청 제출
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Edit, AlertCircle, CheckCircle2 } from 'lucide-react'

interface RevisionRequestDialogProps {
  applicationId: string
  userId: string
  availableCredits: number
  onRevisionRequested?: () => void
}

type RevisionType = 'typo' | 'expression' | 'section_rewrite' | 'style_change' | 'full_restructure'

const revisionTypes: { value: RevisionType; label: string; description: string }[] = [
  {
    value: 'typo',
    label: '오타 및 맞춤법 수정',
    description: '간단한 오타와 맞춤법 오류를 수정합니다.'
  },
  {
    value: 'expression',
    label: '표현 개선',
    description: '전문적이고 설득력 있는 표현으로 개선합니다.'
  },
  {
    value: 'section_rewrite',
    label: '섹션 재작성',
    description: '특정 섹션을 완전히 재작성합니다.'
  },
  {
    value: 'style_change',
    label: '스타일 변경',
    description: '전체적인 작성 스타일을 변경합니다.'
  },
  {
    value: 'full_restructure',
    label: '전체 재구성',
    description: '신청서 전체를 재구성하고 개선합니다.'
  }
]

export function RevisionRequestDialog({
  applicationId,
  userId,
  availableCredits,
  onRevisionRequested
}: RevisionRequestDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [revisionType, setRevisionType] = useState<RevisionType>('typo')
  const [instructions, setInstructions] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!instructions.trim()) {
      setError('수정 지시사항을 입력해주세요.')
      return
    }

    if (availableCredits === 0) {
      setError('사용 가능한 수정권이 없습니다. 수정권을 구매해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/application-writer/revise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: applicationId,
          revision_type: revisionType,
          instructions: instructions.trim(),
          sections: null  // 필요시 섹션 목록 추가
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || '수정 요청에 실패했습니다.')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '수정 요청에 실패했습니다.')
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setInstructions('')
        setRevisionType('typo')
        onRevisionRequested?.()
      }, 2000)

    } catch (err: any) {
      setError(err.message || '수정 요청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className={availableCredits === 0
            ? "w-full bg-gray-300 cursor-not-allowed"
            : "w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-lg"
          }
          disabled={availableCredits === 0}
        >
          <Edit className="h-5 w-5 mr-2" />
          {availableCredits === 0 ? '수정권 없음 - 구매 필요' : '✨ AI 신청서 수정 요청'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">✨ AI 신청서 수정</DialogTitle>
          <DialogDescription className="text-base">
            <div className="flex items-center justify-between mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="font-medium text-blue-900">GPT-4o가 전문적으로 수정합니다</p>
                <p className="text-sm text-blue-700 mt-1">소요시간: 약 3-5분 | 비용: 수정권 1개 (₩130 상당)</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600">남은 수정권</p>
                <p className="text-2xl font-bold text-blue-900">{availableCredits}개</p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
            <div className="bg-white rounded-full p-4 mb-4 shadow-lg">
              <CheckCircle2 className="h-20 w-20 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-700 mb-2">수정 요청 완료! 🎉</p>
            <p className="text-base text-gray-700 mb-4">AI가 신청서를 전문적으로 수정하고 있습니다</p>
            <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-semibold text-gray-800">약 3-5분 소요 예정</span>
            </div>
            <p className="text-sm text-gray-600 mt-6">문서함에서 수정 진행 상황을 확인할 수 있습니다</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 수정 유형 선택 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">1️⃣ 수정 유형 선택</Label>
                <span className="text-xs text-gray-500">필수</span>
              </div>
              <RadioGroup value={revisionType} onValueChange={(value) => setRevisionType(value as RevisionType)}>
                {revisionTypes.map((type, index) => (
                  <div
                    key={type.value}
                    className={`flex items-start space-x-3 border-2 rounded-xl p-4 transition-all cursor-pointer ${
                      revisionType === type.value
                        ? 'border-orange-500 bg-orange-50 shadow-md'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                    }`}
                  >
                    <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={type.value} className="font-semibold text-base cursor-pointer flex items-center gap-2">
                        <span className="text-lg">{['📝', '✍️', '📄', '🎨', '🔄'][index]}</span>
                        {type.label}
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* 수정 지시사항 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="instructions" className="text-base font-semibold">2️⃣ 구체적인 수정 지시사항</Label>
                <span className="text-xs text-gray-500">필수</span>
              </div>
              <Textarea
                id="instructions"
                placeholder={`구체적인 수정 요청을 작성해주세요. 예시:

• "사업 배경 섹션의 시장 규모를 최근 3년 데이터로 보강해주세요"
• "기술 개발 계획의 일정을 더 구체적으로 작성해주세요"
• "예산 계획의 항목별 설명을 추가해주세요"
• "전체적인 어조를 더 전문적이고 설득력 있게 바꿔주세요"`}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={8}
                disabled={loading}
                className="text-base resize-none"
              />
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-lg">💡</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">더 좋은 수정 결과를 위한 팁</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• 수정이 필요한 섹션을 명확히 지정하세요</li>
                    <li>• 어떻게 수정되길 원하는지 구체적으로 작성하세요</li>
                    <li>• 필요한 경우 참고할 데이터나 정보를 포함하세요</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <Alert variant="destructive" className="border-2">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {/* 수정권 부족 경고 */}
            {availableCredits === 0 && (
              <Alert className="border-2 border-amber-400 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-base">
                  <p className="font-semibold text-amber-900 mb-2">사용 가능한 수정권이 없습니다</p>
                  <a href="/pricing" className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium">
                    수정권 구매하기 →
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!success && (
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 border-2"
              size="lg"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || availableCredits === 0}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  수정 요청 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  수정 요청하기 (수정권 1개 사용)
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
