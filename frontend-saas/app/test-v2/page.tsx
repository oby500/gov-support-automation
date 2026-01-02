'use client'

/**
 * Application Writer V2 테스트 페이지
 *
 * V2 특징:
 * - 섹션별 프롬프트 (Grant_Guide 패턴)
 * - 멀티 AI 백엔드 (Paperless-AI 패턴)
 * - 양식에 맞는 구조화된 출력
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, AlertCircle, Copy, Download } from 'lucide-react'

interface V2Result {
  success: boolean
  version: string
  sections: Record<string, any>
  full_content: Record<string, string>
  formatted_output: string
  total_tokens: { input: number; output: number; total: number }
  total_cost: { usd: number; krw: number }
  generation_summary: {
    total_sections: number
    successful_sections: number
    failed_sections: string[]
    elapsed_seconds: number
    backend: string
    model: string
  }
}

interface V2Info {
  version: string
  features: string[]
  sections: Array<{
    id: string
    name: string
    depends_on: string[]
    output_fields: string[]
  }>
  available_backends: string[]
  current_backend: {
    name: string
    model: string
    pricing: { input: number; output: number }
  }
}

export default function TestV2Page() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [v2Info, setV2Info] = useState<V2Info | null>(null)
  const [result, setResult] = useState<V2Result | null>(null)
  const [copied, setCopied] = useState(false)

  // 테스트용 입력값
  const [announcementInfo, setAnnouncementInfo] = useState(`공고명: 2025년 2차 제조 AI 현장 적용 지원 사업
지원기관: 충주시
지원금액: 최대 1억원 (자부담 30%)
지원내용: 제조업 AI 솔루션 도입 지원
신청기간: 2025.01.01 ~ 2025.02.28

사업계획서 양식:
I. 사업 개요 (추진배경, 목적/필요성)
II. 세부 추진 계획 (AI 적용 대상, 솔루션 선정, 목표 설정 등)
III. 추진 체계 (조직도, 참여인력)
IV. 추진 일정 계획
V. 기대효과
VI. 예산 계획`)

  const [companyInfo, setCompanyInfo] = useState(`기업명: (주)스마트제조
업종: 금속가공업 (정밀부품 제조)
설립년도: 2015년
매출액: 80억원 (2024년)
종업원: 45명
주요제품: 자동차 부품, 전자기기 부품

현재 문제점:
- 품질검사 수작업으로 불량률 4.5%
- 검사 인력 부족으로 납기 지연 발생
- 숙련공 퇴직으로 품질 편차 증가

AI 도입 목적:
- 비전 AI 기반 자동 품질검사 시스템 구축
- 불량률 1.5% 이하로 감소 목표
- 검사 시간 70% 단축`)

  const [selectedBackend, setSelectedBackend] = useState('claude')

  // V2 정보 조회
  useEffect(() => {
    fetchV2Info()
  }, [])

  const fetchV2Info = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/api/application-writer-v2/info`)

      if (response.ok) {
        const data = await response.json()
        setV2Info(data)
      }
    } catch (err) {
      console.error('V2 info fetch error:', err)
    }
  }

  // V2 신청서 생성
  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

      const response = await fetch(`${backendUrl}/api/application-writer-v2/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement_id: 'PBLN_000000000116578',
          announcement_info: announcementInfo,
          company_info: companyInfo,
          backend: selectedBackend,
          test_mode: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'V2 생성 실패')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'V2 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 단일 섹션 테스트
  const handleTestSection = async (sectionId: string) => {
    setLoading(true)
    setError(null)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

      const response = await fetch(`${backendUrl}/api/application-writer-v2/section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          announcement_info: announcementInfo,
          company_info: companyInfo,
          backend: selectedBackend,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || '섹션 생성 실패')
      }

      const data = await response.json()
      alert(`섹션 ${sectionId} 생성 완료!\n\n비용: $${data.cost.usd} (${data.cost.krw}원)`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 복사
  const handleCopy = () => {
    if (result?.formatted_output) {
      navigator.clipboard.writeText(result.formatted_output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 다운로드
  const handleDownload = () => {
    if (result?.formatted_output) {
      const blob = new Blob([result.formatted_output], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'application_v2.txt'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Application Writer V2 테스트</h1>
        <p className="text-gray-600">
          섹션별 프롬프트 + 멀티 AI 백엔드
        </p>
      </div>

      {/* V2 정보 */}
      {v2Info && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="default">V2</Badge>
              시스템 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">핵심 기능</h4>
                <ul className="text-sm space-y-1">
                  {v2Info.features.map((f, i) => (
                    <li key={i}>- {f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">현재 백엔드</h4>
                <p className="text-sm">
                  <strong>{v2Info.current_backend.name}</strong> ({v2Info.current_backend.model})
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  가격: 입력 ${v2Info.current_backend.pricing.input}/1M, 출력 ${v2Info.current_backend.pricing.output}/1M
                </p>
              </div>
            </div>

            {/* 섹션 목록 */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">생성할 섹션 ({v2Info.sections.length}개)</h4>
              <div className="flex flex-wrap gap-2">
                {v2Info.sections.map((section) => (
                  <Badge
                    key={section.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-50"
                    onClick={() => handleTestSection(section.id)}
                  >
                    {section.name} ({section.output_fields.length}개 필드)
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * 섹션 클릭시 해당 섹션만 테스트 생성
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 입력 폼 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>공고 정보</CardTitle>
            <CardDescription>AI가 분석할 공고 내용</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={announcementInfo}
              onChange={(e) => setAnnouncementInfo(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>기업 정보</CardTitle>
            <CardDescription>신청 기업 정보</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={companyInfo}
              onChange={(e) => setCompanyInfo(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      </div>

      {/* 백엔드 선택 & 생성 버튼 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium mr-2">AI 백엔드:</label>
              <select
                value={selectedBackend}
                onChange={(e) => setSelectedBackend(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="claude">Claude Sonnet 4.5</option>
                <option value="openai">GPT-4o</option>
              </select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              size="lg"
              className="flex-1 max-w-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  V2 신청서 생성 중... (6개 섹션)
                </>
              ) : (
                'V2 전체 신청서 생성'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 에러 */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 결과 */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              V2 생성 완료
            </CardTitle>
            <CardDescription>
              {result.generation_summary.successful_sections}/{result.generation_summary.total_sections} 섹션 성공
              | {result.generation_summary.elapsed_seconds.toFixed(1)}초
              | ${result.total_cost.usd.toFixed(4)} ({result.total_cost.krw.toLocaleString()}원)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 액션 버튼 */}
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" />
                {copied ? '복사됨!' : '복사'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                다운로드
              </Button>
            </div>

            {/* 포맷팅된 출력 */}
            <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {result.formatted_output}
              </pre>
            </div>

            {/* 토큰/비용 상세 */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2">상세 정보</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">입력 토큰:</span>
                  <span className="font-mono ml-2">{result.total_tokens.input.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">출력 토큰:</span>
                  <span className="font-mono ml-2">{result.total_tokens.output.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">모델:</span>
                  <span className="font-mono ml-2">{result.generation_summary.model}</span>
                </div>
                <div>
                  <span className="text-gray-600">백엔드:</span>
                  <span className="font-mono ml-2">{result.generation_summary.backend}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
