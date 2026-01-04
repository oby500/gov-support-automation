# 챗봇 기반 통합 검색 시스템 설계

## 개요

기존 검색창과 챗봇 기능을 통합하여, 챗봇이 모든 검색 기능을 담당하도록 개선합니다.

### 핵심 인사이트

**사용자의 핵심 발견:**
- ✅ 챗봇 → 검색창 기능: 가능 (키워드 검색, 필터 적용, AI 추천 모두 가능)
- ❌ 검색창 → 챗봇 기능: 불가능 (맞춤형 추천, 대화형 상담 불가능)
- **결론**: 챗봇을 개선하여 검색창 기능까지 모두 담당

## 1. 통합 검색 아키텍처

```
┌─────────────────────────────────────────────────┐
│          AI Search Bar (챗봇 기반)               │
├─────────────────────────────────────────────────┤
│  "우리 회사는 식사제 소스를 제조하는 회사야"      │
│  "서울 지역, 3년차 제조업 지원금 찾아줘"         │
└─────────────────────────────────────────────────┘
                     ↓
            ┌────────────────┐
            │ Intent Analysis │
            │   (AI 의도 분석)  │
            └────────────────┘
                     ↓
        ┌────────────┴────────────┐
        ↓                         ↓
┌───────────────┐       ┌──────────────────┐
│ KEYWORD_SEARCH│       │ FILTERED_SEARCH  │
│ "제조업 지원금" │       │ region: "서울"    │
│               │       │ years: "3년차"    │
└───────────────┘       └──────────────────┘
        ↓                         ↓
┌───────────────┐       ┌──────────────────┐
│ CUSTOM_SEARCH │       │ AI_RECOMMEND     │
│ "식사제 소스   │       │ 맞춤형 추천       │
│  제조 회사"    │       │ 대화형 상담       │
└───────────────┘       └──────────────────┘
```

## 2. API 엔드포인트 설계

### 2.1 통합 검색 API

**파일**: `frontend-saas/app/api/chatbot/search/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { message, userId } = await request.json();

  // 1. 의도 분석
  const intent = await analyzeSearchIntent(message);

  // 2. 의도별 처리
  switch (intent.type) {
    case 'KEYWORD_SEARCH':
      return handleKeywordSearch(intent.keywords);

    case 'FILTERED_SEARCH':
      return handleFilteredSearch(intent.filters);

    case 'CUSTOM_SEARCH':
      return handleCustomSearch(message, userId);

    case 'AI_RECOMMEND':
      return handleAIRecommendation(message, userId);
  }
}
```

### 2.2 의도 분석 함수

```typescript
interface SearchIntent {
  type: 'KEYWORD_SEARCH' | 'FILTERED_SEARCH' | 'CUSTOM_SEARCH' | 'AI_RECOMMEND';
  keywords?: string[];
  filters?: {
    region?: string;
    businessYears?: string;
    industry?: string;
    amount?: number;
  };
  customQuery?: string;
}

async function analyzeSearchIntent(message: string): Promise<SearchIntent> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `당신은 검색 의도를 분석하는 AI입니다.

사용자 메시지를 분석하여 다음 중 하나로 분류하세요:
1. KEYWORD_SEARCH: 단순 키워드 검색 (예: "제조업 지원금")
2. FILTERED_SEARCH: 필터 조건이 포함된 검색 (예: "서울 지역 3년차 제조업")
3. CUSTOM_SEARCH: 맞춤형 추천 요청 (예: "우리 회사에 맞는 지원금")
4. AI_RECOMMEND: 대화형 상담 요청 (예: "어떤 지원금이 좋을까요?")

JSON 형식으로 응답하세요:
{
  "type": "FILTERED_SEARCH",
  "filters": {
    "region": "서울",
    "businessYears": "3년차",
    "industry": "제조업"
  }
}`
      },
      { role: 'user', content: message }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}
```

## 3. 대화형 사용자 프로필 수집

### 3.1 AI Profile Builder 컴포넌트

**파일**: `frontend-saas/components/AIProfileBuilder.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ProfileData {
  industry?: string;
  subIndustry?: string;
  product?: string;
  region?: string;
  businessYears?: string;
  employeeCount?: string;
  annualRevenue?: string;
}

export function AIProfileBuilder() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: 'assistant',
      content: '안녕하세요! 귀사에 딱 맞는 지원금을 찾아드리기 위해 몇 가지 여쭤볼게요. 어떤 사업을 하고 계신가요?'
    }
  ]);
  const [input, setInput] = useState('');
  const [profile, setProfile] = useState<ProfileData>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 사용자 메시지 추가
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // AI 프로필 추출 API 호출
    const response = await fetch('/api/profile/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input,
        currentProfile: profile
      })
    });

    const data = await response.json();

    // AI 응답 추가
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.reply
    }]);

    // 프로필 업데이트
    if (data.extractedInfo) {
      setProfile(prev => ({ ...prev, ...data.extractedInfo }));
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 대화창 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">AI 프로필 수집</h3>
        <div className="space-y-4 h-96 overflow-y-auto mb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-100 ml-12'
                  : 'bg-gray-100 mr-12'
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 우리는 식사제 소스를 제조하는 회사입니다"
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <Button type="submit">전송</Button>
        </form>
      </Card>

      {/* 실시간 프로필 미리보기 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">수집된 정보</h3>
        <div className="space-y-3">
          <ProfileField label="산업" value={profile.industry} />
          <ProfileField label="세부 산업" value={profile.subIndustry} />
          <ProfileField label="주요 제품" value={profile.product} />
          <ProfileField label="지역" value={profile.region} />
          <ProfileField label="사업 연차" value={profile.businessYears} />
          <ProfileField label="직원 수" value={profile.employeeCount} />
          <ProfileField label="연 매출" value={profile.annualRevenue} />
        </div>
        <Button
          className="w-full mt-6"
          disabled={Object.keys(profile).length < 3}
        >
          프로필 저장
        </Button>
      </Card>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-2 border-b">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value || '-'}</span>
    </div>
  );
}
```

### 3.2 프로필 수집 API

**파일**: `frontend-saas/app/api/profile/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(request: NextRequest) {
  const { message, currentProfile } = await request.json();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `당신은 사용자 프로필을 수집하는 AI 어시스턴트입니다.

사용자의 자연스러운 대화에서 다음 정보를 추출하세요:
- industry: 산업 분류 (예: 제조업, 서비스업, IT)
- subIndustry: 세부 산업 (예: 식품제조, 소프트웨어 개발)
- product: 주요 제품/서비스
- region: 지역
- businessYears: 사업 연차
- employeeCount: 직원 수
- annualRevenue: 연 매출

예시:
입력: "우리는 식사제 소스를 제조하는 회사입니다"
출력:
{
  "extractedInfo": {
    "industry": "제조업",
    "subIndustry": "식품제조",
    "product": "식사제 소스"
  },
  "reply": "식사제 소스를 제조하시는군요! 혹시 어느 지역에서 사업을 하고 계신가요?"
}

현재 수집된 정보: ${JSON.stringify(currentProfile)}

부족한 정보를 자연스럽게 물어보고, 새로운 정보를 추출하세요.`
      },
      { role: 'user', content: message }
    ],
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');

  return NextResponse.json(result);
}
```

## 4. 검색 필터 자동 프로필 업데이트

### 4.1 필터 변경 감지 및 프로필 업데이트

**파일**: `frontend-saas/app/(dashboard)/page.tsx` (수정)

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnnouncementListPage() {
  const [filters, setFilters] = useState({
    region: '',
    businessYears: '',
    industry: ''
  });

  // 필터 변경 시 프로필 자동 업데이트
  useEffect(() => {
    const updateProfile = async () => {
      if (!filters.region && !filters.businessYears && !filters.industry) {
        return; // 필터가 비어있으면 업데이트 안 함
      }

      try {
        await fetch('/api/profile/auto-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'search_filters',
            filters: {
              region: filters.region,
              businessYears: filters.businessYears,
              industry: filters.industry
            }
          })
        });

        console.log('[Profile] Auto-updated from search filters');
      } catch (error) {
        console.error('[Profile] Auto-update failed:', error);
      }
    };

    // 디바운스: 1초 후 업데이트
    const timer = setTimeout(updateProfile, 1000);
    return () => clearTimeout(timer);
  }, [filters]);

  // ... 나머지 코드
}
```

### 4.2 자동 프로필 업데이트 API

**파일**: `frontend-saas/app/api/profile/auto-update/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(user.id);
    const { source, filters } = await request.json();

    // 현재 프로필 가져오기
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 기존 프로필과 병합
    const currentProfile = currentUser.profile as Record<string, any> || {};
    const updatedProfile = {
      ...currentProfile,
      // 새로운 필터 정보 추가 (기존 값이 없을 때만)
      region: currentProfile.region || filters.region,
      businessYears: currentProfile.businessYears || filters.businessYears,
      industry: currentProfile.industry || filters.industry,
      // 메타데이터 추가
      lastAutoUpdate: new Date().toISOString(),
      autoUpdateSource: source
    };

    // 프로필 업데이트
    await db
      .update(users)
      .set({
        profile: updatedProfile,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log('[Profile] Auto-updated:', {
      userId,
      source,
      changes: {
        region: filters.region,
        businessYears: filters.businessYears,
        industry: filters.industry
      }
    });

    return NextResponse.json({
      success: true,
      profile: updatedProfile
    });

  } catch (error) {
    console.error('[Profile] Auto-update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
```

## 5. 구현 우선순위

### Phase 1: AI 검색 통합 (우선)
- [ ] `/api/chatbot/search` 엔드포인트 생성
- [ ] 검색 의도 분석 함수 구현
- [ ] 기존 검색 UI를 AI 검색바로 교체
- [ ] 캐싱 시스템과 통합

**예상 효과:**
- 사용자가 자연어로 검색 가능
- 검색 정확도 향상 (AI 의도 분석)
- 필터 자동 생성으로 편의성 증가

### Phase 2: 대화형 프로필 수집
- [ ] AIProfileBuilder 컴포넌트 구현
- [ ] `/api/profile/chat` 엔드포인트 생성
- [ ] 프로필 추출 로직 구현
- [ ] 마이페이지에 통합

**예상 효과:**
- 더 풍부한 사용자 정보 수집
- 사용자 경험 개선 (대화형 입력)
- 맞춤형 추천 정확도 향상

### Phase 3: 자동 프로필 업데이트
- [ ] 필터 변경 감지 로직 추가
- [ ] `/api/profile/auto-update` 엔드포인트 생성
- [ ] 프로필 병합 로직 구현

**예상 효과:**
- 수동 입력 없이 프로필 풍부화
- 검색 행동 기반 개인화
- 사용자 편의성 극대화

## 6. 예상 비용 절감

### 캐싱 시스템 효과
- FAQ 질문 캐싱률: ~60%
- 월간 API 호출 감소: 약 1,500회
- 월간 비용 절감: 약 $10-15

### 검색 최적화 효과
- 불필요한 재검색 감소: ~40%
- 검색 만족도 향상: 키워드 검색 대비 +30%

## 7. 성능 목표

- 검색 응답 시간: < 2초
- 의도 분석 정확도: > 85%
- 프로필 추출 정확도: > 90%
- 캐시 히트율: > 60%

## 8. 다음 단계

1. **Phase 1 구현 시작**: AI 검색 통합
2. **사용자 테스트**: 베타 사용자 피드백 수집
3. **성능 모니터링**: 실제 사용 데이터 분석
4. **Phase 2, 3 순차 진행**: 우선순위에 따라 구현
