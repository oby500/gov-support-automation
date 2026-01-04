/**
 * 결제 시스템 통합 테스트
 *
 * 테스트 시나리오:
 * 1. Application Writer 티어 결제 → 수정권 할당 → 신청서 생성
 * 2. 수정권 단독 구매 → 잔액 확인
 * 3. 티어 업그레이드 (Basic → Standard → Premium)
 * 4. 티어 다운그레이드 방지 확인
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

describe('Payment Flow Integration Tests', () => {
  const testUserId = `test-user-${Date.now()}`;
  const testAnnouncementId = 'test-announcement-001';

  beforeAll(async () => {
    console.log('🧪 Payment Flow Integration Tests 시작');
    console.log(`Test User ID: ${testUserId}`);
  });

  afterAll(async () => {
    console.log('✅ Payment Flow Integration Tests 완료');
  });

  describe('Application Writer 티어 결제 플로우', () => {
    it('Basic 티어 결제 → 2회 수정권 할당', async () => {
      const response = await fetch(`${API_URL}/api/application/payment-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: `test-basic-${Date.now()}`,
          user_id: testUserId,
          tier: 'basic',
          amount: 4900,
          announcement_id: testAnnouncementId,
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      console.log('Basic 티어 결제 완료:', data);

      expect(data.tier_credits).toBe(2);
      expect(data.current_tier).toBe('basic');
      expect(data.total_available).toBe(2);
    });

    it('Standard 티어로 업그레이드 → 3회 수정권 할당', async () => {
      const response = await fetch(`${API_URL}/api/application/payment-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: `test-standard-${Date.now()}`,
          user_id: testUserId,
          tier: 'standard',
          amount: 14900,
          announcement_id: testAnnouncementId,
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      console.log('Standard 티어로 업그레이드:', data);

      expect(data.tier_credits).toBe(3);
      expect(data.current_tier).toBe('standard');
      expect(data.total_available).toBe(3);
    });

    it('Premium 티어로 업그레이드 → 4회 수정권 할당', async () => {
      const response = await fetch(`${API_URL}/api/application/payment-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: `test-premium-${Date.now()}`,
          user_id: testUserId,
          tier: 'premium',
          amount: 29900,
          announcement_id: testAnnouncementId,
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      console.log('Premium 티어로 업그레이드:', data);

      expect(data.tier_credits).toBe(4);
      expect(data.current_tier).toBe('premium');
      expect(data.total_available).toBe(4);
    });

    it('티어 다운그레이드 방지 (Premium → Basic 불가)', async () => {
      const response = await fetch(`${API_URL}/api/application/payment-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: `test-downgrade-${Date.now()}`,
          user_id: testUserId,
          tier: 'basic',
          amount: 4900,
          announcement_id: testAnnouncementId,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const errorData = await response.json();
      console.log('다운그레이드 방지 확인:', errorData);
      expect(errorData.detail).toContain('downgrade');
    });
  });

  describe('수정권 구매 플로우', () => {
    it('수정권 1회 구매', async () => {
      const response = await fetch(`${API_URL}/api/application/purchase-revision-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: testUserId,
          quantity: 1,
          payment_id: `test-revision-1-${Date.now()}`,
          order_id: `revision_${Date.now()}`,
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      console.log('수정권 1회 구매 완료:', data);

      expect(data.purchased_credits).toBe(1);
      expect(data.total_available).toBe(5); // 티어 4회 + 구매 1회
    });

    it('수정권 5회 구매 (가장 인기)', async () => {
      const response = await fetch(`${API_URL}/api/application/purchase-revision-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: testUserId,
          quantity: 5,
          payment_id: `test-revision-5-${Date.now()}`,
          order_id: `revision_${Date.now()}`,
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      console.log('수정권 5회 구매 완료:', data);

      expect(data.purchased_credits).toBe(6); // 기존 1 + 신규 5
      expect(data.total_available).toBe(10); // 티어 4회 + 구매 6회
    });

    it('수정권 10회 구매 (최대 할인)', async () => {
      const response = await fetch(`${API_URL}/api/application/purchase-revision-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: testUserId,
          quantity: 10,
          payment_id: `test-revision-10-${Date.now()}`,
          order_id: `revision_${Date.now()}`,
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      console.log('수정권 10회 구매 완료:', data);

      expect(data.purchased_credits).toBe(16); // 기존 6 + 신규 10
      expect(data.total_available).toBe(20); // 티어 4회 + 구매 16회
    });
  });

  describe('수정권 잔액 조회', () => {
    it('현재 수정권 잔액 확인', async () => {
      const response = await fetch(
        `${API_URL}/api/application/revision-credits/${testUserId}`
      );

      expect(response.ok).toBe(true);

      const data = await response.json();
      console.log('현재 수정권 잔액:', data);

      expect(data.tier_credits).toBe(4); // Premium 티어
      expect(data.purchased_credits).toBe(16);
      expect(data.total_available).toBe(20);
      expect(data.current_tier).toBe('premium');
    });
  });

  describe('에러 케이스', () => {
    it('유효하지 않은 티어', async () => {
      const response = await fetch(`${API_URL}/api/application/payment-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: `test-invalid-${Date.now()}`,
          user_id: testUserId,
          tier: 'invalid-tier',
          amount: 9999,
          announcement_id: testAnnouncementId,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('유효하지 않은 수정권 수량', async () => {
      const response = await fetch(`${API_URL}/api/application/purchase-revision-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: testUserId,
          quantity: 999,
          payment_id: `test-invalid-qty-${Date.now()}`,
          order_id: `revision_${Date.now()}`,
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it('필수 파라미터 누락', async () => {
      const response = await fetch(`${API_URL}/api/application/payment-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: `test-missing-${Date.now()}`,
          // user_id, tier, amount, announcement_id 누락
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(422); // FastAPI validation error
    });
  });
});
