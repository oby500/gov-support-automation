'use client'

/**
 * RevisionCreditsDisplay 컴포넌트
 *
 * 사용자의 수정권 잔액을 표시하고 관리하는 컴포넌트
 * - 티어별 수정권 잔액
 * - 구매한 수정권 잔액
 * - 전체 사용 가능 수정권
 * - 수정권 구매 링크
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShoppingCart, CreditCard } from 'lucide-react'
import Link from 'next/link'

interface RevisionCreditsBalance {
  current_tier: 'basic' | 'standard' | 'premium'
  tier_granted_at: string
  tier_credits_available: number
  purchased_credits_available: number
  total_available: number
}

interface RevisionCreditsDisplayProps {
  userId: string
  compact?: boolean  // 간단한 표시 모드
}

export function RevisionCreditsDisplay({ userId, compact = false }: RevisionCreditsDisplayProps) {
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<RevisionCreditsBalance | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCredits()
  }, [userId])

  const fetchCredits = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/application-writer/revision-credits?user_id=${userId}`)

      if (!response.ok) {
        throw new Error('수정권 조회에 실패했습니다.')
      }

      const data = await response.json()
      setCredits(data)
    } catch (err: any) {
      setError(err.message || '수정권 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getTierName = (tier: 'basic' | 'standard' | 'premium') => {
    return tier === 'basic' ? '베이직' : tier === 'standard' ? '스탠다드' : '프리미엄'
  }

  const getTierBadgeColor = (tier: 'basic' | 'standard' | 'premium') => {
    return tier === 'basic' ? 'bg-gray-500' : tier === 'standard' ? 'bg-blue-500' : 'bg-purple-500'
  }

  if (loading) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className="p-6">
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!credits) {
    return null
  }

  // 간단한 표시 모드
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
        <div className="flex items-center gap-3">
          <Badge className={`${getTierBadgeColor(credits.current_tier)} text-white px-3 py-1 text-sm font-semibold`}>
            {getTierName(credits.current_tier)}
          </Badge>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-xs text-gray-600">사용 가능한 수정권</p>
              <p className="text-lg font-bold text-gray-900">{credits.total_available}개</p>
            </div>
          </div>
        </div>
        {credits.total_available === 0 && (
          <Link href="/pricing">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-medium">
              <ShoppingCart className="h-4 w-4 mr-1" />
              구매하기
            </Button>
          </Link>
        )}
      </div>
    )
  }

  // 전체 표시 모드
  return (
    <Card className="border-2 border-orange-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
        <CardTitle className="flex items-center justify-between text-xl">
          <span className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-orange-600" />
            수정권 잔액
          </span>
          <Badge className={`${getTierBadgeColor(credits.current_tier)} text-white px-4 py-1.5 text-base font-bold`}>
            {getTierName(credits.current_tier)}
          </Badge>
        </CardTitle>
        <CardDescription className="text-base text-gray-700">
          신청서를 AI가 전문적으로 수정할 수 있는 수정권입니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {/* 전체 수정권 - 더 prominent하게 */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg">
          <div>
            <p className="text-sm opacity-90 font-medium mb-1">💳 전체 사용 가능</p>
            <p className="text-4xl font-bold">{credits.total_available}개</p>
            <p className="text-xs opacity-75 mt-2">약 ₩{(credits.total_available * 130).toLocaleString()} 상당</p>
          </div>
          <div className="bg-white/20 p-4 rounded-full">
            <CreditCard className="h-10 w-10" />
          </div>
        </div>

        {/* 티어별/구매 수정권 분석 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎁</span>
              <p className="text-xs font-semibold text-purple-900">티어 포함</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">{credits.tier_credits_available}개</p>
            <p className="text-xs text-purple-600 mt-1">매월 자동 갱신</p>
          </div>

          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💰</span>
              <p className="text-xs font-semibold text-green-900">추가 구매</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{credits.purchased_credits_available}개</p>
            <p className="text-xs text-green-600 mt-1">1년간 사용 가능</p>
          </div>
        </div>

        {/* 수정권 구매 버튼 - 상태별 다른 스타일 */}
        <Link href="/pricing" className="block">
          <Button
            className={`w-full h-12 text-base font-bold shadow-md ${
              credits.total_available === 0
                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
                : 'bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-900'
            }`}
            size="lg"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {credits.total_available === 0 ? '🚨 수정권 구매 필요' : '추가 수정권 구매'}
          </Button>
        </Link>

        {/* 정보 섹션 */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-2 mb-3">
            <span className="text-lg">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 mb-2">수정권 사용 안내</p>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• 티어 수정권은 매월 1일 자동으로 갱신됩니다</li>
                <li>• 구매한 수정권은 구매일로부터 1년간 사용 가능합니다</li>
                <li>• 티어 수정권을 먼저 사용하고, 부족하면 구매 수정권을 사용합니다</li>
              </ul>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {getTierName(credits.current_tier)} 티어 시작일: {new Date(credits.tier_granted_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
