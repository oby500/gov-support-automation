'use client'

/**
 * ProfileCollectionChatbot Component
 *
 * Collects company profile information through conversational AI
 * - Generates customized questions based on announcement analysis
 * - Uses AI to collect necessary information
 * - Automatically transitions to application writing when collection is complete
 */

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { X, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getUserProfile } from '@/lib/db/actions'

interface ProfileCollectionChatbotProps {
  announcementId: string
  announcementSource: 'kstartup' | 'bizinfo'
  announcementTitle: string
  announcementAnalysis?: any
  selectedTaskNumber?: number | null
  requiredInfoList?: string[]
  onClose: () => void
  onComplete: (profileData: CompanyProfile) => void
}

interface Message {
  role: 'assistant' | 'user'
  content: string
  timestamp: Date
}

interface CompanyProfile {
  company_name: string
  business_registration_number?: string
  business_field: string
  founding_year: number
  revenue?: string
  employee_count?: number
  main_products: string
  target_goal: string
  technology?: string
  past_support?: string
  additional_info?: string
  [key: string]: any
}

export function ProfileCollectionChatbot({
  announcementId,
  announcementSource,
  announcementTitle,
  announcementAnalysis,
  selectedTaskNumber,
  requiredInfoList,
  onClose,
  onComplete
}: ProfileCollectionChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(true)
  const [collectedData, setCollectedData] = useState<Partial<CompanyProfile>>({})
  const [completionProgress, setCompletionProgress] = useState(0)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [savedProfile, setSavedProfile] = useState<Partial<CompanyProfile> | null>(null)
  const [showProfileConfirm, setShowProfileConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load saved profile on mount
  useEffect(() => {
    loadSavedProfile()
  }, [])

  const loadSavedProfile = async () => {
    try {
      const data = await getUserProfile()
      console.log('[Profile Collection] Server Action Response:', data)

      if (!data.success || !data.has_profile) {
        console.log('[Profile Collection] No saved profile, starting fresh')
        startProfileCollection()
        return
      }

      if (data.success && data.has_profile && data.profile) {
        console.log('[Profile Collection] Found saved profile:', data.profile)
        setSavedProfile(data.profile)
        setCollectedData(data.profile)
        setCompletionProgress(100)
        setShowProfileConfirm(true)
        setAnalyzing(false)
      } else {
        console.log('[Profile Collection] No saved profile found, starting collection')
        startProfileCollection()
      }
    } catch (error) {
      console.error('[Profile Collection] Error loading saved profile:', error)
      startProfileCollection()
    }
  }

  // Auto-focus input when ready
  useEffect(() => {
    if (!analyzing && completionProgress < 60) {
      inputRef.current?.focus()
    }
  }, [analyzing, completionProgress])

  const startProfileCollection = async () => {
    setAnalyzing(true)
    console.log('[Profile Collection] ========== START PROFILE COLLECTION ==========')
    console.log('[Profile Collection] Calling API: /api/application-writer/profile-questions')
    console.log('[Profile Collection] Request body:', JSON.stringify({
      announcement_id: announcementId,
      announcement_source: announcementSource,
      announcement_title: announcementTitle,
      announcement_analysis: announcementAnalysis ? 'present' : 'missing',
      selectedTaskNumber: selectedTaskNumber,
      requiredInfoList: requiredInfoList
    }, null, 2))

    try {
      const analysisResponse = await fetch('/api/application-writer/profile-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement_id: announcementId,
          announcement_source: announcementSource,
          announcement_title: announcementTitle,
          announcement_analysis: announcementAnalysis,
          selectedTaskNumber: selectedTaskNumber,
          requiredInfoList: requiredInfoList
        })
      })

      console.log('[Profile Collection] API Response status:', analysisResponse.status)
      console.log('[Profile Collection] API Response ok:', analysisResponse.ok)

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text()
        console.error('[Profile Collection] API Error Response Body:', errorText)
        throw new Error(`API returned ${analysisResponse.status}: ${errorText}`)
      }

      const analysisData = await analysisResponse.json()
      const taskQuestions = analysisData.questions || []
      const taskNumber = analysisData.task_number
      const taskName = analysisData.task_name

      let welcomeContent = `안녕하세요! "${announcementTitle}" 신청서 작성을 도와드리겠습니다.\n\n`

      if (taskNumber && taskName) {
        welcomeContent += `선택된 과제: **과제 ${taskNumber} - ${taskName}**\n\n`
      }

      welcomeContent += `맞춤형 신청서를 작성하기 위해 몇 가지 질문을 드리겠습니다. 자연스럽게 답변해주세요!\n\n`

      if (taskQuestions.length > 0) {
        welcomeContent += `**${taskQuestions[0].question}**`
      } else {
        welcomeContent += `먼저, 회사명을 알려주세요.`
      }

      const welcomeMessage: Message = {
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date()
      }

      setMessages([welcomeMessage])
      setAnalyzing(false)
    } catch (error) {
      console.error('[Profile Collection] ========== ERROR ==========')
      console.error('[Profile Collection] Error type:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('[Profile Collection] Error message:', error instanceof Error ? error.message : String(error))
      console.error('[Profile Collection] Error stack:', error instanceof Error ? error.stack : 'N/A')
      console.error('[Profile Collection] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))

      const errorMessage: Message = {
        role: 'assistant',
        content: `죄송합니다, 시스템 오류가 발생했습니다. (${error instanceof Error ? error.message : '알 수 없는 오류'}) 다시 시도해주세요.`,
        timestamp: new Date()
      }
      setMessages([errorMessage])
      setAnalyzing(false)
    }
  }

  const handleSendMessage = async () => {
    if (!userInput.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: userInput.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setUserInput('')
    setLoading(true)

    try {
      console.log('[Profile Collection] Sending data:', {
        user_message: userInput.trim(),
        collected_data: collectedData,
        completion_progress: completionProgress
      })

      const response = await fetch('/api/application-writer/profile-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement_id: announcementId,
          announcement_source: announcementSource,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          user_message: userInput.trim(),
          collected_data: collectedData
        })
      })

      if (!response.ok) {
        throw new Error('AI response generation failed')
      }

      const data = await response.json()

      console.log('[Profile Collection] Response data:', {
        extracted_data: data.extracted_data,
        completion_percentage: data.completion_percentage,
        profile_data: data.profile_data
      })

      const aiMessage: Message = {
        role: 'assistant',
        content: data.ai_response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      if (data.extracted_data) {
        setCollectedData(prev => {
          const updated = { ...prev, ...data.extracted_data }
          console.log('[Profile Collection] Updated collectedData:', updated)
          return updated
        })
      }

      if (data.completion_percentage !== undefined) {
        console.log('[Profile Collection] Updating progress:', data.completion_percentage, '%')
        setCompletionProgress(data.completion_percentage)
      }

      if (data.completion_percentage < 60) {
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }

    } catch (error) {
      console.error('[Profile Collection] Message send failed:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: '죄송합니다, 응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])

      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCloseAttempt = () => {
    if (completionProgress > 0 && completionProgress < 100) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  const handleConfirmClose = () => {
    setShowCloseConfirm(false)
    onClose()
  }

  const handleCancelClose = () => {
    setShowCloseConfirm(false)
  }

  return (
    <>
      {/* Close confirmation dialog */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg font-bold text-gray-900">
                정보 수집 중단
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-gray-700 mb-6">
                수집된 모든 정보가 손실됩니다.<br />
                정말 닫으시겠습니까?
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelClose}
                  className="border-gray-300"
                >
                  계속하기
                </Button>
                <Button
                  onClick={handleConfirmClose}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  닫기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main chatbot UI */}
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
          {/* Header */}
          <CardHeader className="border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl font-bold text-gray-900">
                  신청서 정보 수집
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">{announcementTitle}</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${completionProgress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {completionProgress}%
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseAttempt}
                  className="hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Message area */}
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {analyzing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">저장된 기업 정보를 불러오는 중...</p>
                  <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
                </div>
              </div>
            ) : showProfileConfirm && savedProfile ? (
              // Saved profile confirmation UI
              <div className="flex items-center justify-center h-full">
                <div className="w-full max-w-2xl">
                  <Alert className="bg-blue-50 border-blue-200 mb-6">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <strong>저장된 기업 정보를 찾았습니다!</strong><br />
                      아래 정보를 확인하시고, 수정이 필요하시면 &quot;정보 수정&quot; 버튼을 클릭해주세요.
                    </AlertDescription>
                  </Alert>

                  <Card className="border-2 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900">저장된 기업 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {savedProfile.company_name && (
                        <div className="border-b pb-2">
                          <p className="text-sm text-gray-500">회사명</p>
                          <p className="font-medium text-gray-900">{savedProfile.company_name}</p>
                        </div>
                      )}
                      {savedProfile.business_field && (
                        <div className="border-b pb-2">
                          <p className="text-sm text-gray-500">사업 분야</p>
                          <p className="font-medium text-gray-900">{savedProfile.business_field}</p>
                        </div>
                      )}
                      {savedProfile.founding_year && (
                        <div className="border-b pb-2">
                          <p className="text-sm text-gray-500">설립년도</p>
                          <p className="font-medium text-gray-900">{savedProfile.founding_year}</p>
                        </div>
                      )}
                      {savedProfile.employee_count && (
                        <div className="border-b pb-2">
                          <p className="text-sm text-gray-500">직원 수</p>
                          <p className="font-medium text-gray-900">{savedProfile.employee_count}</p>
                        </div>
                      )}
                      {savedProfile.revenue && (
                        <div className="border-b pb-2">
                          <p className="text-sm text-gray-500">매출액</p>
                          <p className="font-medium text-gray-900">{savedProfile.revenue}</p>
                        </div>
                      )}
                      {savedProfile.main_products && (
                        <div className="border-b pb-2">
                          <p className="text-sm text-gray-500">주요 제품/서비스</p>
                          <p className="font-medium text-gray-900">{savedProfile.main_products}</p>
                        </div>
                      )}
                      {savedProfile.target_goal && (
                        <div className="border-b pb-2">
                          <p className="text-sm text-gray-500">목표</p>
                          <p className="font-medium text-gray-900">{savedProfile.target_goal}</p>
                        </div>
                      )}
                      {savedProfile.technology && (
                        <div className="border-b pb-2">
                          <p className="text-sm text-gray-500">보유 기술</p>
                          <p className="font-medium text-gray-900">{savedProfile.technology}</p>
                        </div>
                      )}
                      {savedProfile.past_support && (
                        <div className="border-b pb-2">
                          <p className="text-sm text-gray-500">과거 지원 이력</p>
                          <p className="font-medium text-gray-900">{savedProfile.past_support}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={() => {
                        console.log('[Profile Collection] Using saved profile with task:', selectedTaskNumber)
                        const profileWithTask = {
                          ...(savedProfile as CompanyProfile),
                          selectedTaskNumber,
                          requiredInfoList
                        }
                        onComplete(profileWithTask)
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                    >
                      이 정보로 신청서 작성 시작
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log('[Profile Collection] Editing profile')
                        setShowProfileConfirm(false)
                        setCompletionProgress(0)
                        startProfileCollection()
                      }}
                      className="flex-1 border-gray-300 py-3"
                    >
                      정보 수정
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                    </div>
                  </div>
                )}

                {completionProgress >= 60 && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <AlertDescription className="text-green-900">
                      <div className="space-y-3">
                        <div>
                          <strong>기본 정보 수집 완료! ({completionProgress}%)</strong><br />
                          이제 신청서 작성을 시작할 수 있습니다. 추가 정보는 나중에 보완할 수 있습니다.
                        </div>
                        <Button
                          onClick={async () => {
                            console.log('[Profile Collection] Saving profile before starting application with task:', selectedTaskNumber)
                            try {
                              const response = await fetch('/api/application-writer/save-profile', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ profile_data: collectedData })
                              })

                              if (!response.ok) {
                                console.error('[Profile Collection] Failed to save profile, but proceeding anyway')
                              } else {
                                console.log('[Profile Collection] Profile saved successfully')
                              }
                            } catch (error) {
                              console.error('[Profile Collection] Error saving profile:', error)
                            }

                            const profileWithTask = {
                              ...collectedData,
                              selectedTaskNumber,
                              requiredInfoList
                            } as CompanyProfile
                            onComplete(profileWithTask)
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                        >
                          신청서 작성 시작
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Input area - auto-hide when 60% complete */}
          {!analyzing && completionProgress < 60 && (
            <div className="border-t p-4 flex-shrink-0">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={inputRef}
                  placeholder="답변을 입력해주세요..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={loading}
                  className="flex-1 min-h-[60px] max-h-[200px] resize-y"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !userInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                자연스럽게 답변해주세요. Enter로 전송, Shift+Enter로 줄바꿈
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
