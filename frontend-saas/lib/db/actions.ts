'use server';

import { db } from './drizzle';
import { userProfiles } from './schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

/**
 * Get User Profile - Server Action
 *
 * ⭐ 근본적인 해결 방법: Server Action으로 구현하여 Server-side에서 auth() 호출
 * Client Component에서 fetch()를 사용하면 HttpOnly 쿠키가 전송되지 않는 문제 해결
 *
 * Next.js 아키텍처:
 * - Server Actions는 반드시 별도 파일로 분리하고 파일 최상단에 'use server' 추가
 * - Client Component에서 import되는 파일에는 inline 'use server' 사용 불가
 */
export async function getUserProfile() {
  try {
    // 1. 인증된 사용자 조회 (Server-side에서 auth() 호출 → 쿠키 접근 가능)
    const session = await auth();

    if (!session?.user?.id) {
      console.log('[getUserProfile] No authenticated user found');
      return {
        success: false,
        has_profile: false,
        profile: null,
        error: 'Not authenticated'
      };
    }

    const userId = parseInt(session.user.id);
    console.log('[getUserProfile] Authenticated user ID:', userId);

    // 2. 프로필 조회
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      console.log('[getUserProfile] No profile found for user:', userId);
      return {
        success: true,
        has_profile: false,
        profile: null
      };
    }

    // 3. ApplicationWriter 형식으로 변환
    const profileData = {
      company_name: profile.companyName,
      business_registration_number: profile.businessNumber,
      business_field: profile.industry,
      founding_year: profile.establishmentYear,
      revenue: profile.annualRevenue,
      employee_count: profile.employeeCount ? parseInt(profile.employeeCount) : undefined,
      main_products: profile.mainProducts,
      target_goal: profile.targetGoal,
      technology: profile.technology,
      past_support: profile.pastSupport,
      additional_info: profile.additionalInfo,
    };

    console.log('[getUserProfile] ✅ Profile found and formatted for user:', userId);

    return {
      success: true,
      has_profile: true,
      profile: profileData,
      last_updated: profile.updatedAt
    };

  } catch (error) {
    console.error('[getUserProfile] Error:', error);
    return {
      success: false,
      has_profile: false,
      profile: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
