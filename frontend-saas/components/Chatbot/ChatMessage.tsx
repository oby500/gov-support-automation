'use client';

/**
 * 채팅 메시지 컴포넌트
 *
 * User/Assistant 메시지를 구분하여 표시
 * 에러 메시지와 재시도 버튼 지원
 * 검색 결과 카드 표시 지원
 */

import { User, Bot, RefreshCw } from 'lucide-react';
import { AnnouncementCard } from './AnnouncementCard';

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
  announcements?: Announcement[]; // 검색 결과 공고 목록
}

interface ChatMessageProps {
  message: Message;
  onRetry?: () => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isError = message.error === true;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 아바타 */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600' : isError ? 'bg-red-100' : 'bg-gray-200'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className={`w-5 h-5 ${isError ? 'text-red-600' : 'text-gray-600'}`} />
        )}
      </div>

      {/* 메시지 내용 */}
      <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block max-w-[85%] px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : isError
              ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }`}
        >
          {/* 줄바꿈 처리 */}
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* 재시도 버튼 */}
          {isError && message.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              다시 시도
            </button>
          )}
        </div>

        {/* 검색 결과 공고 카드 */}
        {!isUser && message.announcements && message.announcements.length > 0 && (
          <div className="mt-3 space-y-2 max-w-[85%]">
            {message.announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                compact={message.announcements!.length > 3}
              />
            ))}
          </div>
        )}

        {/* 타임스탬프 */}
        <div className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

/**
 * 시간 포맷팅 (HH:MM)
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
