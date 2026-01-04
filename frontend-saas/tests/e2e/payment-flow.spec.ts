import { test, expect, Page } from '@playwright/test';

/**
 * E2E 테스트: 결제 플로우
 *
 * 사용자가 공고를 선택하고 티어를 구매하여
 * 수정권을 획득하는 전체 플로우를 테스트
 */

// 테스트 설정
test.describe('Payment Flow', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'test-password-123',
  };

  const testAnnouncement = {
    id: 'KS_123456',
    title: '창업지원금 공고',
  };

  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그인
    await loginUser(page, testUser.email, testUser.password);
  });

  test('Complete payment flow with notification', async ({ page }) => {
    // 1. 공고 상세 페이지 이동
    await page.goto(`/announcement/${testAnnouncement.id}`);
    await expect(page.locator('h1')).toContainText(testAnnouncement.title);

    // 2. 신청서 작성하기 버튼 클릭
    await page.click('button:has-text("신청서 작성하기")');

    // 3. 티어 선택 페이지 확인
    await expect(page).toHaveURL(/\/payment/);
    await expect(page.locator('h2')).toContainText('티어 선택');

    // 4. Standard 티어 선택
    await page.click('[data-testid="tier-standard"]');

    // 티어 정보 확인
    await expect(page.locator('[data-testid="tier-name"]')).toContainText('Standard');
    await expect(page.locator('[data-testid="tier-credits"]')).toContainText('3');
    await expect(page.locator('[data-testid="tier-price"]')).toContainText('29,000');

    // 5. 결제하기 버튼 클릭
    await page.click('button:has-text("결제하기")');

    // 6. PortOne 결제 팝업 처리 (테스트 모드)
    // Note: 실제 PortOne 팝업은 iframe으로 처리되므로 mock 필요
    await handlePortOnePayment(page, {
      method: 'card',
      success: true,
    });

    // 7. 결제 완료 다이얼로그 확인
    await expect(page.locator('[data-testid="payment-success-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('결제가 완료되었습니다');

    // 8. 수정권 정보 확인
    const creditsDisplay = page.locator('[data-testid="credits-display"]');
    await expect(creditsDisplay).toContainText('3');

    // 9. 데이터베이스 확인
    const credits = await getRevisionCredits(testUser.email);
    expect(credits.tier_credits_total).toBe(3);
    expect(credits.current_tier).toBe('standard');

    // 10. 알림 발송 확인 (notification_logs 테이블)
    const notifications = await getNotificationLogs(testUser.email);
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0].type).toBe('payment_success');
    expect(notifications[0].status).toBe('sent');
  });

  test('Payment flow with backend error and retry', async ({ page }) => {
    // 1. 공고 선택 및 티어 선택
    await page.goto(`/announcement/${testAnnouncement.id}`);
    await page.click('button:has-text("신청서 작성하기")');
    await page.click('[data-testid="tier-basic"]');
    await page.click('button:has-text("결제하기")');

    // 2. PortOne 결제 완료
    await handlePortOnePayment(page, { method: 'card', success: true });

    // 3. 백엔드 에러 시뮬레이션 (첫 번째 시도 실패)
    // Note: 실제로는 MSW 등으로 네트워크 레벨에서 mocking 필요
    await page.route('**/api/application/payment-complete', async (route, request) => {
      // 첫 번째 요청은 500 에러 반환
      if (request.url().includes('payment-complete')) {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ detail: 'Internal server error' }),
        });
      }
    });

    // 4. 로딩 오버레이 확인 (재시도 중)
    await expect(page.locator('[data-testid="payment-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-message"]')).toContainText('처리 중');

    // 5. 재시도 후 성공
    // 두 번째 요청부터는 성공 응답
    await page.unroute('**/api/application/payment-complete');

    // 6. 최종 성공 확인
    await expect(page.locator('[data-testid="payment-success-dialog"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('Payment cancellation', async ({ page }) => {
    // 1. 결제 프로세스 시작
    await page.goto(`/announcement/${testAnnouncement.id}`);
    await page.click('button:has-text("신청서 작성하기")');
    await page.click('[data-testid="tier-premium"]');
    await page.click('button:has-text("결제하기")');

    // 2. PortOne 결제 취소
    await handlePortOnePayment(page, { method: 'card', success: false, reason: 'user_cancel' });

    // 3. 취소 메시지 확인
    await expect(page.locator('[data-testid="payment-cancelled-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-cancelled-message"]')).toContainText('결제가 취소되었습니다');

    // 4. 데이터베이스 확인 (수정권 부여되지 않음)
    const credits = await getRevisionCredits(testUser.email);
    expect(credits).toBeNull(); // 또는 이전 상태 유지
  });

  test('Invalid tier handling', async ({ page }) => {
    // 1. 잘못된 티어로 API 직접 호출
    const response = await page.request.post('/api/application-writer/payment-complete', {
      data: {
        paymentId: 'test-payment-123',
        tier: 'ultra', // 잘못된 티어
        amount: 99000,
        announcementId: testAnnouncement.id,
      },
    });

    // 2. 에러 응답 확인
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid tier');
  });

  test('Network error handling', async ({ page }) => {
    // 1. 네트워크 연결 끊기
    await page.context().setOffline(true);

    // 2. 결제 시도
    await page.goto(`/announcement/${testAnnouncement.id}`);
    await page.click('button:has-text("신청서 작성하기")');
    await page.click('[data-testid="tier-standard"]');
    await page.click('button:has-text("결제하기")');

    await handlePortOnePayment(page, { method: 'card', success: true });

    // 3. 네트워크 에러 메시지 확인
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('네트워크');

    // 4. 재시도 버튼 확인
    await expect(page.locator('button:has-text("다시 시도")')).toBeVisible();
  });
});

// Helper functions

async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

async function handlePortOnePayment(
  page: Page,
  options: {
    method: 'card' | 'transfer' | 'vbank';
    success: boolean;
    reason?: string;
  }
) {
  // PortOne 팝업 시뮬레이션
  // 실제로는 PortOne의 테스트 환경에서 처리되어야 함

  // Mock PortOne callback
  await page.evaluate((opts) => {
    // @ts-ignore
    window.PortOne = {
      requestPayment: async () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            if (opts.success) {
              resolve({
                code: 'SUCCESS',
                paymentId: `test-payment-${Date.now()}`,
              });
            } else {
              resolve({
                code: 'USER_CANCEL',
                message: opts.reason || 'User cancelled payment',
              });
            }
          }, 1000);
        });
      },
    };
  }, options);
}

async function getRevisionCredits(email: string) {
  // 테스트용 데이터베이스 쿼리
  // 실제로는 test database connection 필요
  const response = await fetch(`http://localhost:8000/test/revision-credits?email=${email}`);
  if (response.ok) {
    return await response.json();
  }
  return null;
}

async function getNotificationLogs(email: string) {
  // 테스트용 데이터베이스 쿼리
  const response = await fetch(`http://localhost:8000/test/notification-logs?email=${email}`);
  if (response.ok) {
    return await response.json();
  }
  return [];
}
