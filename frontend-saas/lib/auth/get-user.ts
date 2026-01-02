import { auth } from '@/auth';

/**
 * 현재 로그인한 사용자 정보 가져오기
 *
 * Server Component나 Server Action에서 사용
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id || '',
    email: session.user.email || '',
    name: session.user.name || '',
  };
}

/**
 * 현재 로그인한 사용자 ID 가져오기
 *
 * @throws {Error} 로그인하지 않은 경우 에러 발생
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    throw new Error('Unauthorized: User not logged in');
  }

  return user.id;
}

/**
 * 사용자 인증 여부 확인
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}
