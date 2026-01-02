/**
 * OpenAI Function Calling 정의
 *
 * 챗봇이 호출할 수 있는 함수들 (공고 검색, 자격요건 확인, 수정권 조회 등)
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// ==================== Function 정의 ====================

export const chatbotFunctions: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'searchAnnouncements',
      description:
        '정부지원 공고를 하이브리드 검색합니다 (벡터 70% + 키워드 30%). ' +
        '사용자가 키워드, 자연어 질의, 정확한 공고명으로 검색할 때 사용합니다. ' +
        '예: "AI 스타트업 지원", "우리는 구두 제작 회사인데...", "2025년 클라우드 산업발전..."',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              '검색 쿼리 (키워드, 자연어 문장, 정확한 공고명 모두 가능). ' +
              '예: "창업 자금 지원", "AI 기술로 의료 분야 창업했는데 지원사업 있나요?", ' +
              '"2025년 소상공인 디지털 전환 지원사업"',
          },
          source: {
            type: 'string',
            description: '검색 대상 (all: 전체, kstartup: K-Startup만, bizinfo: BizInfo만)',
            enum: ['all', 'kstartup', 'bizinfo'],
            default: 'all',
          },
          limit: {
            type: 'number',
            description: '검색 결과 개수 (기본: 5, 최대: 20)',
            default: 5,
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getAnnouncementDetail',
      description: '특정 공고의 상세 정보를 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          announcementId: {
            type: 'string',
            description: '공고 ID (예: KS175386, PBLN_115735)',
          },
        },
        required: ['announcementId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkEligibility',
      description: '사용자가 특정 공고에 신청 가능한지 자격요건을 확인합니다.',
      parameters: {
        type: 'object',
        properties: {
          announcementId: {
            type: 'string',
            description: '공고 ID',
          },
          userId: {
            type: 'number',
            description: '사용자 ID (자동으로 전달됨)',
          },
        },
        required: ['announcementId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRevisionCredits',
      description: '사용자의 현재 수정권 잔액과 사용 내역을 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'number',
            description: '사용자 ID (자동으로 전달됨)',
          },
        },
        required: ['userId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getUserApplications',
      description: '사용자가 작성한 신청서 목록을 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'number',
            description: '사용자 ID (자동으로 전달됨)',
          },
          limit: {
            type: 'number',
            description: '조회할 신청서 개수 (기본: 5)',
            default: 5,
          },
        },
        required: ['userId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirmAndSearch',
      description:
        '사용자가 확인한 후 정부지원사업을 검색합니다. ' +
        '지역, 업종 등을 확인한 후 사용자가 "네", "응", "맞아" 등으로 확인하면 이 함수를 호출하세요.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색 쿼리 (지역 + 업종 조합). 예: "경기도 제조업", "서울 IT"',
          },
          region: {
            type: 'string',
            description: '광역시/도 (예: 경기도, 서울특별시, 부산광역시, 전국)',
          },
          industry: {
            type: 'string',
            description: '업종 카테고리 (예: 제조업, 서비스업, IT/정보통신업)',
          },
          source: {
            type: 'string',
            description: '검색 대상 (all: 전체, kstartup: K-Startup만, bizinfo: BizInfo만)',
            enum: ['all', 'kstartup', 'bizinfo'],
            default: 'all',
          },
          limit: {
            type: 'number',
            description: '검색 결과 개수 (기본: 10)',
            default: 10,
          },
        },
        required: ['query', 'region', 'industry'],
      },
    },
  },
];

// ==================== Function 실행 핸들러 ====================

interface FunctionHandlers {
  [key: string]: (args: any, context: FunctionContext) => Promise<any>;
}

export interface FunctionContext {
  userId?: number;
  backendUrl: string;
}

/**
 * Function 실행 핸들러
 */
export const functionHandlers: FunctionHandlers = {
  /**
   * 하이브리드 공고 검색 (벡터 70% + 키워드 30%)
   */
  async searchAnnouncements(
    args: { query: string; source?: string; limit?: number },
    context: FunctionContext
  ) {
    try {
      const { query, source = 'all', limit = 5 } = args;

      // Next.js API 호출 (하이브리드 검색)
      const response = await fetch('/api/search/hybrid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          source,
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      // 결과 포맷팅
      const formattedResults = data.results.map((result: any) => ({
        id: result.announcement_id,
        source: result.source,
        title: result.title,
        organization: result.organization,
        startDate: result.start_date,
        endDate: result.end_date,
        summary: result.summary,
        hasWritableContent: result.has_writable_content,
        relevanceScore: Math.round(result.final_score * 100),
      }));

      return {
        success: true,
        query: data.query,
        count: formattedResults.length,
        announcements: formattedResults,
        metadata: data.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * 공고 상세 조회
   */
  async getAnnouncementDetail(args: { announcementId: string }, context: FunctionContext) {
    try {
      const { announcementId } = args;

      // FastAPI 백엔드 호출
      const response = await fetch(
        `${context.backendUrl}/api/announcements/${announcementId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        announcement: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * 자격요건 확인
   */
  async checkEligibility(
    args: { announcementId: string; userId?: number },
    context: FunctionContext
  ) {
    try {
      const { announcementId } = args;
      const userId = args.userId || context.userId;

      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      // FastAPI 백엔드 호출
      const response = await fetch(`${context.backendUrl}/api/announcements/check-eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement_id: announcementId,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        eligible: data.eligible || false,
        requirements: data.requirements || [],
        missing: data.missing || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * 수정권 잔액 조회
   */
  async getRevisionCredits(args: { userId?: number }, context: FunctionContext) {
    try {
      const userId = args.userId || context.userId;

      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      // FastAPI 백엔드 호출
      const response = await fetch(`${context.backendUrl}/api/credits/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        credits: {
          tier_credits: data.tier_credits || 0,
          purchased_credits: data.purchased_credits || 0,
          total_available: data.total_available || 0,
          expires_at: data.expires_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * 사용자 신청서 목록 조회
   */
  async getUserApplications(args: { userId?: number; limit?: number }, context: FunctionContext) {
    try {
      const userId = args.userId || context.userId;
      const limit = args.limit || 5;

      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      // FastAPI 백엔드 호출
      const response = await fetch(
        `${context.backendUrl}/api/applications/user/${userId}?limit=${limit}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        count: data.applications?.length || 0,
        applications: data.applications || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * 확인 후 검색 실행 (지역 + 업종 필터링)
   */
  async confirmAndSearch(
    args: {
      query: string;
      region: string;
      industry: string;
      source?: string;
      limit?: number;
    },
    context: FunctionContext
  ) {
    try {
      const { query, region, industry, source = 'all', limit = 10 } = args;

      console.log('[confirmAndSearch] Executing search with filters:', {
        query,
        region,
        industry,
        source,
        limit,
      });

      // Next.js API 호출 (AI 검색 엔드포인트)
      const response = await fetch('/api/chatbot/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          filters: {
            region,
            industry,
            source,
          },
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      // 결과 포맷팅
      const formattedResults = (data.results || []).map((result: any) => ({
        id: result.announcement_id,
        source: result.source,
        title: result.title,
        organization: result.organization,
        startDate: result.start_date,
        endDate: result.end_date,
        summary: result.summary,
        region: result.region || '전국',
        industry: result.industry || '전체',
        hasWritableContent: result.has_writable_content,
      }));

      // 검색 결과 없을 때 대체 제안 생성 (AI의 강점 활용)
      let suggestions: string[] = [];
      if (formattedResults.length === 0) {
        console.log('[confirmAndSearch] Zero results - generating intelligent suggestions');

        // 1. 지역 확대 제안
        if (region && region !== '전국') {
          suggestions.push(`💡 "${region}" 대신 "전국" 공고도 확인해보시겠어요? 전국 단위 지원사업도 신청 가능합니다.`);
        }

        // 2. 업종 확대 제안 (AI 지능형 상위 카테고리 추천)
        if (industry) {
          const industryExpansions: Record<string, string> = {
            '헬스장': '서비스업 전반',
            '체육시설': '서비스업 전반',
            '음식점': '서비스업 또는 소상공인 전반',
            '카페': '서비스업 또는 소상공인 전반',
            '미용업': '서비스업 전반',
            '목공': '제조업 전반',
            '금속': '제조업 전반',
            '식품': '제조업 전반',
            '섬유': '제조업 전반',
          };

          const broader = industryExpansions[industry] || '전체 업종';
          suggestions.push(`💡 "${industry}" 대신 "${broader}" 공고도 함께 검색해드릴까요?`);
        }

        // 3. 창업업력 조건 완화 제안
        suggestions.push(`💡 검색 조건을 조금 넓혀서 다시 찾아보시겠어요? 비슷한 공고를 찾아드릴 수 있습니다.`);

        // 4. 마감임박 공고 확인 제안
        suggestions.push(`💡 마감이 임박한 공고를 먼저 확인해드릴까요?`);
      }

      return {
        success: true,
        searchExecuted: true,
        query: data.query || query,
        filters: {
          region,
          industry,
          source,
        },
        count: formattedResults.length,
        total: data.total || formattedResults.length,
        announcements: formattedResults,
        suggestions: formattedResults.length === 0 ? suggestions : undefined, // 결과 없을 때만 제안
        message: formattedResults.length === 0
          ? `"${region} ${industry}" 조건에 맞는 공고를 찾지 못했어요. 😢\n\n아래 제안을 참고해주세요:\n\n${suggestions.join('\n\n')}`
          : `"${region} ${industry}" 조건으로 ${formattedResults.length}개의 공고를 찾았어요! 🎉`,
      };
    } catch (error) {
      console.error('[confirmAndSearch] Error:', error);
      return {
        success: false,
        searchExecuted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

/**
 * Function 실행
 */
export async function executeFunction(
  functionName: string,
  args: any,
  context: FunctionContext
): Promise<any> {
  const handler = functionHandlers[functionName];

  if (!handler) {
    return {
      success: false,
      error: `Unknown function: ${functionName}`,
    };
  }

  try {
    return await handler(args, context);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
