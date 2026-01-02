'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';
import type { UserProfile } from '@/lib/db/schema';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIProfileBuilderProps {
  onComplete?: (profile: UserProfile) => void;
}

export function AIProfileBuilder({ onComplete }: AIProfileBuilderProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요! 귀사에 딱 맞는 지원금을 찾아드리기 위해 몇 가지 여쭤볼게요. 어떤 사업을 하고 계신가요?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    // 사용자 메시지 추가
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // AI 프로필 추출 API 호출
      const response = await fetch('/api/profile/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
        })
      });

      const data = await response.json();

      if (data.success) {
        // AI 응답 추가
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply
        }]);

        // 프로필 업데이트
        if (data.extractedInfo) {
          setProfile(data.extractedInfo);
          setCompletionPercentage(data.completionPercentage || 0);
          setIsCompleted(data.completed || false);

          // 완성되었으면 콜백 호출
          if (data.completed && onComplete) {
            onComplete(data.extractedInfo);
          }
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '죄송합니다. 정보를 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.'
        }]);
      }

    } catch (error) {
      console.error('[AIProfileBuilder] Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 서버와 통신 중 오류가 발생했습니다.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 대화창 */}
      <Card className="p-6 flex flex-col h-[600px]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">AI 프로필 수집</h3>
          <p className="text-sm text-gray-500">대화를 통해 자연스럽게 정보를 입력해주세요</p>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 p-3 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>입력하신 정보를 분석하고 있습니다...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 우리는 식사제 소스를 제조하는 회사입니다"
            className="flex-1"
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </Card>

      {/* 실시간 프로필 미리보기 */}
      <Card className="p-6 h-[600px] overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">수집된 정보</h3>
            {isCompleted && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">완성!</span>
              </div>
            )}
          </div>

          {/* 완성도 표시 */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>프로필 완성도</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  completionPercentage >= 70 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <ProfileField label="회사명" value={profile.companyName} />
          <ProfileField label="산업 분류" value={profile.industry} />
          <ProfileField label="세부 산업" value={profile.subIndustry} />
          <ProfileField label="주요 제품/서비스" value={profile.productService} longText />
          <ProfileField label="지역" value={profile.region} />
          <ProfileField label="사업 연차" value={profile.businessYears} />
          <ProfileField label="직원 수" value={profile.employeeCount} />
          <ProfileField label="연 매출" value={profile.annualRevenue} />
          <ProfileField label="사업 형태" value={profile.businessType} />
          <ProfileField
            label="관심 분야"
            value={profile.interestedFields ? JSON.parse(profile.interestedFields as string).join(', ') : undefined}
          />
        </div>

        {isCompleted && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ 프로필이 완성되었습니다! 이제 맞춤형 지원금 추천을 받을 수 있습니다.
            </p>
          </div>
        )}

        {!isCompleted && completionPercentage > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 {completionPercentage < 30 && '아직 시작 단계입니다. 계속해서 정보를 입력해주세요.'}
              {completionPercentage >= 30 && completionPercentage < 50 && '절반 정도 완성되었습니다!'}
              {completionPercentage >= 50 && completionPercentage < 70 && '거의 다 왔습니다! 조금만 더 입력해주세요.'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function ProfileField({
  label,
  value,
  longText = false
}: {
  label: string;
  value?: string | null;
  longText?: boolean;
}) {
  return (
    <div className={`flex ${longText ? 'flex-col' : 'justify-between'} py-2 border-b`}>
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      <span className={`text-sm ${value ? 'text-gray-900' : 'text-gray-400'} ${longText ? 'mt-1' : ''}`}>
        {value || '-'}
      </span>
    </div>
  );
}
