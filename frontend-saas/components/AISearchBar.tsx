'use client';

import { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AISearchBarProps {
  onSearch: (query: string) => void;
  onResults?: (results: any) => void;
  placeholder?: string;
  className?: string;
}

export function AISearchBar({
  onSearch,
  onResults,
  placeholder = "자연어로 검색해보세요. 예: '서울 지역 3년차 제조업 지원금'",
  className = ''
}: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const searchQuery = query.trim();
    setLoading(true);
    onSearch(searchQuery);

    try {
      // AI 검색 API 호출
      const response = await fetch('/api/chatbot/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: searchQuery,
        })
      });

      const data = await response.json();

      if (data.success && onResults) {
        onResults(data);
      }

    } catch (error) {
      console.error('[AISearchBar] Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative flex items-center gap-2">
        {/* AI 아이콘 */}
        <div className="absolute left-3 flex items-center gap-1 text-blue-600">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-medium">AI</span>
        </div>

        {/* 검색 입력창 */}
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-14 pr-4 h-12 text-base"
          disabled={loading}
        />

        {/* 검색 버튼 */}
        <Button
          type="submit"
          disabled={loading || !query.trim()}
          className="h-12 px-6"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              검색
            </>
          )}
        </Button>
      </div>

      {/* 검색 예시 (옵션) */}
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="text-xs text-gray-500">예시:</span>
        {[
          '서울 지역 제조업 지원금',
          '우리 회사에 맞는 지원금',
          '3년차 스타트업 보조금',
          '5천만원 이상 융자'
        ].map((example, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setQuery(example)}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            disabled={loading}
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}
