/**
 * ApplicationFeedbackChatbot - 신청서 피드백 수집 챗봇
 *
 * 전체 신청서를 HTML로 보여주고 사용자 피드백을 받아 수정
 * - 빠른 피드백 버튼 (R&D 강조, 특허 부각, 톤 변경 등)
 * - 자유 텍스트 입력
 * - 수정권 차감 후 재생성
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { formatKSTDate } from '@/lib/utils';
import {
  Loader2,
  Send,
  CheckCircle2,
  RefreshCw,
  Download,
  Copy,
  Sparkles,
  MessageSquare,
  FileText,
  AlertCircle,
  ThumbsUp,
  Edit3,
  Zap,
} from 'lucide-react';

interface ApplicationContent {
  sections: Array<{
    title: string;
    content: string;
  }>;
  html_content?: string;
  plain_text?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ApplicationFeedbackChatbotProps {
  announcementId: string;
  announcementSource: 'kstartup' | 'bizinfo';
  announcementTitle: string;
  applicationContent: ApplicationContent;
  tier: 'basic' | 'standard' | 'premium';
  remainingRevisions: number;
  onRevisionComplete: (newContent: ApplicationContent) => void;
  onClose: () => void;
  onFinalize: () => void;
}

// 빠른 피드백 버튼 옵션
const QUICK_FEEDBACK_OPTIONS = [
  { id: 'emphasize_rd', label: 'R&D 역량 강조', icon: '🔬', description: '연구개발 능력을 더 부각' },
  { id: 'emphasize_patent', label: '특허/지재권 부각', icon: '📜', description: '특허, 지식재산권 강조' },
  { id: 'emphasize_team', label: '팀 역량 강조', icon: '👥', description: '팀 구성원 경험/역량 부각' },
  { id: 'more_specific', label: '더 구체적으로', icon: '🎯', description: '수치와 구체적 예시 추가' },
  { id: 'more_concise', label: '더 간결하게', icon: '✂️', description: '핵심만 남기고 압축' },
  { id: 'tone_confident', label: '자신감 있는 톤', icon: '💪', description: '확신있고 적극적인 어조' },
  { id: 'tone_humble', label: '겸손한 톤', icon: '🙏', description: '신중하고 겸손한 어조' },
  { id: 'add_market_data', label: '시장 데이터 추가', icon: '📊', description: '시장 규모/성장률 보강' },
];

export function ApplicationFeedbackChatbot({
  announcementId,
  announcementSource,
  announcementTitle,
  applicationContent,
  tier,
  remainingRevisions,
  onRevisionComplete,
  onClose,
  onFinalize,
}: ApplicationFeedbackChatbotProps) {
  // 상태 관리
  const [currentContent, setCurrentContent] = useState<ApplicationContent>(applicationContent);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [revisionCount, setRevisionCount] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copiedSectionIndex, setCopiedSectionIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 초기 메시지
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `신청서 초안이 완성되었습니다! 🎉\n\n위에 전체 신청서를 미리보기로 확인하실 수 있습니다.\n\n원하시는 수정 사항이 있으시면:\n• 아래 **빠른 피드백 버튼**을 선택하거나\n• **직접 텍스트로 입력**해주세요.\n\n수정권이 ${remainingRevisions}회 남아있습니다.`,
        timestamp: new Date(),
      },
    ]);
  }, [remainingRevisions]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * HTML 컨텐츠 생성
   */
  const generateHtmlContent = () => {
    console.log('[ApplicationFeedbackChatbot] generateHtmlContent 호출:', {
      has_html_content: !!currentContent.html_content,
      sections_count: currentContent.sections?.length || 0,
      has_plain_text: !!currentContent.plain_text,
    })

    // 1. 이미 HTML이 있으면 그대로 사용
    if (currentContent.html_content) {
      return currentContent.html_content;
    }

    // 2. sections 배열이 있으면 HTML 생성
    if (currentContent.sections && currentContent.sections.length > 0) {
      return currentContent.sections
        .map(
          (section) => `
          <div class="section" style="margin-bottom: 24px;">
            <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin-bottom: 12px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
              ${section.title}
            </h3>
            <div style="line-height: 1.8; color: #374151; white-space: pre-wrap;">
              ${section.content}
            </div>
          </div>
        `
        )
        .join('');
    }

    // 3. plain_text가 있으면 기본 HTML로 감싸서 반환
    if (currentContent.plain_text) {
      return `
        <div class="section" style="margin-bottom: 24px;">
          <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin-bottom: 12px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
            신청서 내용
          </h3>
          <div style="line-height: 1.8; color: #374151; white-space: pre-wrap;">
            ${currentContent.plain_text}
          </div>
        </div>
      `;
    }

    // 4. 아무 컨텐츠도 없으면 안내 메시지
    return `
      <div style="text-align: center; padding: 40px; color: #9ca3af;">
        <p>신청서 내용을 불러오는 중입니다...</p>
        <p style="font-size: 12px; margin-top: 8px;">잠시 후 다시 시도해주세요.</p>
      </div>
    `;
  };

  /**
   * 빠른 피드백 토글
   */
  const toggleFeedback = (feedbackId: string) => {
    setSelectedFeedback((prev) =>
      prev.includes(feedbackId)
        ? prev.filter((id) => id !== feedbackId)
        : [...prev, feedbackId]
    );
  };

  /**
   * 수정 요청 전송
   */
  const handleSubmitFeedback = async () => {
    // 피드백 내용 구성
    const quickFeedbackText = selectedFeedback
      .map((id) => QUICK_FEEDBACK_OPTIONS.find((opt) => opt.id === id)?.label)
      .filter(Boolean)
      .join(', ');

    const feedbackContent = [
      quickFeedbackText && `[빠른 피드백] ${quickFeedbackText}`,
      userInput && `[상세 요청] ${userInput}`,
    ]
      .filter(Boolean)
      .join('\n');

    if (!feedbackContent) {
      return;
    }

    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      role: 'user',
      content: feedbackContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // 입력 초기화
    setUserInput('');
    setSelectedFeedback([]);
    setIsGenerating(true);

    // AI 응답 (수정 중...)
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '피드백을 반영하여 신청서를 수정하고 있습니다... ⏳',
        timestamp: new Date(),
      },
    ]);

    try {
      // API 호출
      const response = await fetch('/api/application-writer/revise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          announcement_id: announcementId,
          source: announcementSource,
          current_content: currentContent,
          feedback: feedbackContent,
          tier,
          revision_number: revisionCount + 1,
        }),
      });

      if (!response.ok) {
        throw new Error('수정 요청 실패');
      }

      const data = await response.json();

      // 새 컨텐츠 업데이트
      setCurrentContent(data.revised_content);
      setRevisionCount((prev) => prev + 1);

      // 완료 메시지
      setMessages((prev) => [
        ...prev.slice(0, -1), // 로딩 메시지 제거
        {
          role: 'assistant',
          content: `수정이 완료되었습니다! ✨\n\n피드백 반영 내용:\n${feedbackContent}\n\n위에서 수정된 신청서를 확인해주세요.\n추가 수정이 필요하시면 말씀해주세요. (남은 수정권: ${remainingRevisions - revisionCount - 1}회)`,
          timestamp: new Date(),
        },
      ]);

      // 부모 컴포넌트에 알림
      onRevisionComplete(data.revised_content);
    } catch (error: any) {
      console.error('[ApplicationFeedbackChatbot] 수정 오류:', error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `수정 중 오류가 발생했습니다: ${error.message}\n다시 시도해주세요.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 클립보드 복사
   */
  const handleCopy = async () => {
    const plainText = currentContent.plain_text ||
      currentContent.sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n');

    await navigator.clipboard.writeText(plainText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const _htmlToPlainText = (html: string): string => {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return (doc.body?.textContent || '').trim();
    } catch {
      return String(html)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
  };

  const handleCopySection = async (sectionIndex: number) => {
    const section = currentContent.sections?.[sectionIndex];
    if (!section) return;

    const title = section.title || `섹션 ${sectionIndex + 1}`;
    const content = section.content || '';

    const hasTable = typeof content === 'string' && content.toLowerCase().includes('<table');

    if (hasTable) {
      const htmlFragment = `<h3>${title}</h3>\n${content}`;
      const plainFallback = `${title}\n\n${_htmlToPlainText(content)}`;

      try {
        const htmlBlob = new Blob([htmlFragment], { type: 'text/html' });
        const textBlob = new Blob([plainFallback], { type: 'text/plain' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = new (window as any).ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (navigator.clipboard as any).write([item]);
      } catch {
        await navigator.clipboard.writeText(plainFallback);
      }
    } else {
      const plain = `## ${title}\n\n${content}`;
      await navigator.clipboard.writeText(plain);
    }

    setCopiedSectionIndex(sectionIndex);
    setTimeout(() => setCopiedSectionIndex(null), 2000);
  };

  /**
   * HTML 다운로드
   */
  const handleDownload = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${announcementTitle} - 신청서</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; }
    h3 { color: #1e40af; margin-top: 32px; }
    .section { margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>${announcementTitle}</h1>
  <p style="color: #6b7280; margin-bottom: 32px;">AI 자동 작성 신청서 | 생성일: ${formatKSTDate(new Date())}</p>
  ${generateHtmlContent()}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `신청서_${announcementId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* 헤더 */}
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              AI 신청서 - 피드백 & 수정
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge className="bg-white/20 text-white">
                수정권 {remainingRevisions - revisionCount}회 남음
              </Badge>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </CardHeader>

        {/* 메인 컨텐츠 영역 */}
        <CardContent className="flex-1 overflow-hidden p-0 flex">
          {/* 좌측: 신청서 미리보기 */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            {/* 미리보기 헤더 */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">신청서 미리보기</span>
                {revisionCount > 0 && (
                  <Badge variant="secondary">v{revisionCount + 1}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-8"
                >
                  {copySuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  className="h-8"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 신청서 내용 (스크롤) */}
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: generateHtmlContent() }}
              />

              {currentContent.sections && currentContent.sections.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-sm text-gray-900">섹션별 복사</div>
                    <div className="text-xs text-gray-500">table 섹션은 HTML로 복사됩니다</div>
                  </div>

                  <div className="space-y-3">
                    {currentContent.sections.map((s, idx) => (
                      <Card key={idx} className="border border-gray-200">
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm font-bold text-gray-900">
                              {s.title || `섹션 ${idx + 1}`}
                            </CardTitle>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopySection(idx)}
                              className="h-8"
                            >
                              {copiedSectionIndex === idx ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                          <div className="text-xs text-gray-600 whitespace-pre-wrap">
                            {typeof s.content === 'string' ? s.content.slice(0, 240) : String(s.content).slice(0, 240)}
                            {typeof s.content === 'string' && s.content.length > 240 ? '…' : ''}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 우측: 피드백 챗봇 */}
          <div className="w-1/2 flex flex-col">
            {/* 채팅 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {msg.timestamp.toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 빠른 피드백 버튼 */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                빠른 피드백 (여러 개 선택 가능)
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_FEEDBACK_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    size="sm"
                    variant={selectedFeedback.includes(option.id) ? 'default' : 'outline'}
                    onClick={() => toggleFeedback(option.id)}
                    className="h-8 text-xs"
                    title={option.description}
                  >
                    {option.icon} {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 자유 텍스트 입력 */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Edit3 className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-500">상세 수정 요청 (자유 입력)</span>
              </div>
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="예: '3번 섹션에서 우리 회사의 특허 출원 현황을 더 자세히 설명해주세요', '전체적으로 좀 더 공격적인 톤으로 바꿔주세요'"
                className="min-h-[80px] resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* 액션 버튼 */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={
                    isGenerating ||
                    (selectedFeedback.length === 0 && !userInput.trim()) ||
                    revisionCount >= remainingRevisions
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      수정 중...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      수정 요청 전송
                    </>
                  )}
                </Button>

                <Button
                  onClick={onFinalize}
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isGenerating}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  이대로 완료
                </Button>
              </div>

              {revisionCount >= remainingRevisions && (
                <p className="text-xs text-orange-600 mt-2 text-center">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  수정권을 모두 사용했습니다. 추가 수정은 수정권을 구매해주세요.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
