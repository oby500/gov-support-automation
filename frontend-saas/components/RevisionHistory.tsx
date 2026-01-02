'use client'

/**
 * RevisionHistory 컴포넌트
 *
 * 사용자의 수정권 사용 내역을 표시
 * - 수정 요청 목록
 * - 수정 유형 및 상태
 * - 수정 완료 시간
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Edit, Clock, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react'

interface RevisionUsage {
  id: string
  application_id: string
  revision_type: 'typo' | 'expression' | 'section_rewrite' | 'style_change' | 'full_restructure'
  instructions: string
  credit_type: 'tier' | 'purchased'
  status: 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  error_message?: string
}

interface RevisionHistoryProps {
  userId: string
}

const revisionTypeNames: Record<string, string> = {
  typo: '오타 및 맞춤법 수정',
  expression: '표현 개선',
  section_rewrite: '섹션 재작성',
  style_change: '스타일 변경',
  full_restructure: '전체 재구성'
}

const creditTypeNames: Record<string, string> = {
  tier: '티어 포함',
  purchased: '추가 구매'
}

export function RevisionHistory({ userId }: RevisionHistoryProps) {
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<RevisionUsage[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [userId])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/application-writer/revision-history?user_id=${userId}`)

      if (!response.ok) {
        throw new Error('수정 내역 조회에 실패했습니다.')
      }

      const data = await response.json()
      setHistory(data.revisions || [])
    } catch (err: any) {
      setError(err.message || '수정 내역 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <Badge className="bg-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            처리 중
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            완료
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            실패
          </Badge>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-gray-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Edit className="h-6 w-6 text-gray-700" />
          수정권 사용 내역
        </CardTitle>
        <CardDescription className="text-base">
          신청서 AI 수정 요청 기록입니다 ({history.length}건)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {history.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div className="bg-white rounded-full p-4 w-20 h-20 mx-auto mb-4 shadow-sm">
              <Edit className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-1">아직 수정 내역이 없습니다</p>
            <p className="text-sm text-gray-500">신청서를 생성한 후 AI 수정 기능을 사용해보세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => {
              const isProcessing = item.status === 'processing'
              const isCompleted = item.status === 'completed'
              const isFailed = item.status === 'failed'

              return (
                <div
                  key={item.id}
                  className={`border-2 rounded-xl p-5 transition-all ${
                    isProcessing
                      ? 'border-yellow-300 bg-yellow-50 shadow-md'
                      : isCompleted
                      ? 'border-green-200 bg-green-50 hover:shadow-md'
                      : isFailed
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* 헤더 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">
                          {['📝', '✍️', '📄', '🎨', '🔄'][['typo', 'expression', 'section_rewrite', 'style_change', 'full_restructure'].indexOf(item.revision_type)]}
                        </span>
                        <h4 className="font-bold text-base text-gray-900">{revisionTypeNames[item.revision_type]}</h4>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 bg-white/50 p-2 rounded border border-gray-200">
                        💬 {item.instructions}
                      </p>
                    </div>
                  </div>

                  {/* 메타 정보 */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                    <div className="flex items-center gap-2 bg-white/50 p-2 rounded border border-gray-200">
                      <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">요청 시간</p>
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} {new Date(item.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/50 p-2 rounded border border-gray-200">
                      <CreditCard className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">사용 수정권</p>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {creditTypeNames[item.credit_type]}
                        </Badge>
                      </div>
                    </div>

                    {item.completed_at && (
                      <div className="flex items-center gap-2 bg-green-100 p-2 rounded border border-green-300">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-green-700">완료 시간</p>
                          <p className="text-xs font-medium text-green-900 truncate">
                            {new Date(item.completed_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )}

                    {item.error_message && (
                      <div className="col-span-2 md:col-span-3 flex items-start gap-2 bg-red-100 p-3 rounded border border-red-300">
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-red-900 mb-1">오류 발생</p>
                          <p className="text-xs text-red-700">{item.error_message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
