'use client';

/**
 * 챗봇 위젯 컴포넌트
 *
 * 반응형 레이아웃:
 * - 데스크톱: 우측 사이드바 (접기/펼치기)
 * - 모바일: 우하단 플로팅 버튼 → 전체화면 모달
 */

import { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, Send, Loader2, ChevronDown, Bot, RotateCcw } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { QuickQuestions } from './QuickQuestions';

interface Announcement {
  id: string;
  source: string;
  title: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  region?: string;
  industry?: string;
  hasWritableContent?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
  retryable?: boolean;
  announcements?: Announcement[];
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const maxRetries = 3;

  // 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 대화 히스토리 로딩
  const loadConversationHistory = async () => {
    if (!conversationId) return;

    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/chatbot?conversationId=${conversationId}`);
      const data = await response.json();

      if (data.success && data.messages?.length > 0) {
        const historyMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id.toString(),
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 웰컴 메시지 또는 히스토리 로딩
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      if (conversationId) {
        // 기존 대화가 있으면 히스토리 로딩
        loadConversationHistory();
      } else {
        // 새 대화면 웰컴 메시지
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: '안녕하세요! 👋\n무엇을 도와드릴까요?',
            timestamp: new Date(),
          },
        ]);
      }
    }
  }, [isOpen]);

  // 지연 함수 (재시도 로직용)
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // 에러 유형 판단
  const getErrorType = (error: any): 'network' | 'server' | 'auth' | 'ratelimit' | 'unknown' => {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return 'network';
    }
    if (error.status === 401 || error.status === 403) {
      return 'auth';
    }
    if (error.status === 429) {
      return 'ratelimit';
    }
    if (error.status >= 500) {
      return 'server';
    }
    return 'unknown';
  };

  // 에러 메시지 생성
  const getErrorMessage = (errorType: string, canRetry: boolean): string => {
    const messages: Record<string, string> = {
      network: '네트워크 연결을 확인해주세요.',
      server: '서버에 일시적인 문제가 발생했습니다.',
      auth: '로그인이 필요합니다. 다시 로그인해주세요.',
      ratelimit: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      unknown: '일시적인 오류가 발생했습니다.',
    };

    const baseMessage = messages[errorType] || messages.unknown;
    return canRetry ? `${baseMessage}\n아래 "다시 시도" 버튼을 눌러주세요.` : baseMessage;
  };

  // 메시지 전송 (재시도 로직 포함)
  const handleSendMessage = async (text?: string, retryAttempt: number = 0) => {
    const messageText = text || inputMessage.trim();
    if (!messageText || isLoading) return;

    // 사용자 메시지 추가 (첫 시도일 때만)
    if (retryAttempt === 0) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputMessage('');
    }

    setIsLoading(true);

    try {
      // 챗봇 API 호출
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationId,
          pageContext: getPageContext(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, data };
      }

      if (data.success) {
        // Function Calling 결과에서 announcements 추출
        let announcements: Announcement[] | undefined;

        if (data.functionCalls && Array.isArray(data.functionCalls)) {
          // confirmAndSearch 또는 searchAnnouncements 함수 호출 결과 찾기
          const searchCall = data.functionCalls.find(
            (fc: any) => fc.name === 'confirmAndSearch' || fc.name === 'searchAnnouncements'
          );

          if (searchCall) {
            // 함수 호출 결과는 서버 로그에만 저장되고, 실제 검색 결과는 message에 포함
            // data에서 직접 announcements를 찾거나, message를 파싱
            // 서버에서 반환하는 구조 확인 필요
            console.log('[ChatWidget] Search function called:', searchCall);
          }
        }

        // metadata에서 announcements 추출 (서버가 제공하는 경우)
        if (data.metadata?.announcements) {
          announcements = data.metadata.announcements;
        }

        // Assistant 메시지 추가
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          announcements, // 검색 결과 포함
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Conversation ID 저장
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }

        // 성공 시 재시도 카운트 초기화
        setRetryCount(0);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error: any) {
      console.error('Chatbot error:', error);

      const errorType = getErrorType(error);
      const canRetry = retryAttempt < maxRetries && errorType !== 'auth';

      // 자동 재시도 (네트워크 또는 서버 에러이고 재시도 가능할 때)
      if (canRetry && (errorType === 'network' || errorType === 'server')) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryAttempt), 10000); // 최대 10초
        console.log(`Retrying in ${backoffDelay}ms... (attempt ${retryAttempt + 1}/${maxRetries})`);

        await delay(backoffDelay);
        return handleSendMessage(text, retryAttempt + 1);
      }

      // 에러 메시지 표시
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getErrorMessage(errorType, canRetry && errorType !== 'ratelimit'),
        timestamp: new Date(),
        error: true,
        retryable: canRetry && errorType !== 'ratelimit',
      };

      setMessages((prev) => [...prev, errorMessage]);
      setRetryCount(retryAttempt);
    } finally {
      setIsLoading(false);
    }
  };

  // 재시도 핸들러
  const handleRetry = () => {
    if (messages.length < 2) return;

    // 마지막 사용자 메시지 찾기
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === 'user');

    if (lastUserMessage) {
      // 에러 메시지 제거
      setMessages((prev) => prev.filter((msg) => !msg.error));
      // 재시도
      handleSendMessage(lastUserMessage.content, retryCount);
    }
  };

  // Enter 키 전송
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 현재 페이지 컨텍스트 감지
  const getPageContext = () => {
    if (typeof window === 'undefined') return undefined;
    const path = window.location.pathname;

    if (path.includes('/pricing')) return 'pricing';
    if (path.includes('/announcement')) return 'announcements';
    if (path.includes('/mypage')) return 'mypage';
    return undefined;
  };

  // 빠른 질문 클릭 핸들러
  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  // 대화 새로고침 (새 대화 시작)
  const handleNewConversation = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '안녕하세요! 👋\n무엇을 도와드릴까요?',
        timestamp: new Date(),
      },
    ]);
    setConversationId(null);
    setRetryCount(0);
  };

  // 데스크톱 UI (≥1024px)
  const DesktopUI = () => (
    <div
      className={`fixed right-0 top-16 bottom-0 bg-white border-l border-gray-200 shadow-lg transition-all duration-300 z-40 ${
        isOpen ? 'w-96' : 'w-0'
      } hidden lg:block`}
    >
      {isOpen && (
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">AI 도우미</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewConversation}
                disabled={messages.length <= 1 || isLoading}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="새 대화 시작"
                title="새 대화 시작"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="챗봇 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 히스토리 로딩 */}
            {isLoadingHistory && (
              <div className="flex items-center justify-center gap-2 text-gray-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">대화 불러오는 중...</span>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={message.retryable ? handleRetry : undefined}
              />
            ))}

            {/* 빠른 질문 (메시지가 적을 때만) */}
            {messages.length <= 1 && !isLoadingHistory && (
              <QuickQuestions onQuestionClick={handleQuickQuestion} />
            )}

            {/* 타이핑 인디케이터 */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="inline-block bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-gray-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="chatbot-input-desktop" className="sr-only">
                메시지 입력
              </label>
              <input
                id="chatbot-input-desktop"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                disabled={isLoading}
                aria-label="챗봇 메시지 입력"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                aria-label="메시지 전송"
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // 모바일 UI (<1024px)
  const MobileUI = () => (
    <>
      {/* 플로팅 버튼 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="AI 챗봇 열기"
          className="fixed right-4 bottom-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110 z-50 lg:hidden flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* 전체화면 모달 */}
      {isOpen && (
        <div className="fixed inset-0 bg-white z-50 lg:hidden flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">AI 도우미</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewConversation}
                disabled={messages.length <= 1 || isLoading}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="새 대화 시작"
                title="새 대화 시작"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="챗봇 닫기"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 히스토리 로딩 */}
            {isLoadingHistory && (
              <div className="flex items-center justify-center gap-2 text-gray-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">대화 불러오는 중...</span>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={message.retryable ? handleRetry : undefined}
              />
            ))}

            {/* 빠른 질문 */}
            {messages.length <= 1 && !isLoadingHistory && (
              <QuickQuestions onQuestionClick={handleQuickQuestion} />
            )}

            {/* 타이핑 인디케이터 */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="inline-block bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="chatbot-input-mobile" className="sr-only">
                메시지 입력
              </label>
              <input
                id="chatbot-input-mobile"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                disabled={isLoading}
                aria-label="챗봇 메시지 입력"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                aria-label="메시지 전송"
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );

  // 데스크톱 토글 버튼 (사이드바가 닫혔을 때)
  const DesktopToggleButton = () => (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="AI 챗봇 열기"
          className="fixed right-4 bottom-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110 z-40 hidden lg:flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </>
  );

  return (
    <>
      <DesktopUI />
      <DesktopToggleButton />
      <MobileUI />
    </>
  );
}
