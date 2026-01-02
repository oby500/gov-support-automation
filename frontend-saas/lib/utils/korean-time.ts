/**
 * 한국시간(KST) 유틸리티
 *
 * 모든 시간 관련 작업에서 new Date() 대신 이 모듈 사용
 *
 * 사용법:
 *   import { getKSTDate, getKSTISOString } from '@/lib/utils/korean-time';
 *
 *   const now = getKSTDate();  // 현재 KST Date 객체
 *   const isoStr = getKSTISOString();  // KST ISO 문자열 (+09:00 포함)
 */

/**
 * 현재 한국시간 Date 객체 반환
 *
 * 주의: JavaScript Date는 내부적으로 UTC를 사용하므로,
 * 이 함수는 실제로는 UTC 기준으로 동일한 순간을 반환합니다.
 * KST로 표시하려면 toLocaleString()이나 getKSTISOString() 사용
 */
export function getKSTDate(): Date {
  return new Date();
}

/**
 * 현재 한국시간을 KST 타임존이 포함된 ISO 문자열로 반환
 *
 * 예: "2025-12-08T13:45:30+09:00"
 */
export function getKSTISOString(): string {
  const now = new Date();

  // KST offset (+09:00)
  const kstOffset = 9 * 60; // 분 단위
  const utcOffset = now.getTimezoneOffset(); // 분 단위 (UTC - 로컬)

  // KST 기준 시간 계산
  const kstTime = new Date(now.getTime() + (kstOffset + utcOffset) * 60 * 1000);

  // ISO 형식으로 포맷팅
  const year = kstTime.getFullYear();
  const month = String(kstTime.getMonth() + 1).padStart(2, '0');
  const day = String(kstTime.getDate()).padStart(2, '0');
  const hours = String(kstTime.getHours()).padStart(2, '0');
  const minutes = String(kstTime.getMinutes()).padStart(2, '0');
  const seconds = String(kstTime.getSeconds()).padStart(2, '0');
  const ms = String(kstTime.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+09:00`;
}

/**
 * 현재 한국시간을 "YYYY-MM-DD HH:mm:ss" 형식으로 반환
 */
export function formatKSTDateTime(date?: Date): string {
  const now = date || new Date();
  return now.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\. /g, '-').replace('.', '').replace(' ', ' ');
}

/**
 * 현재 한국시간을 "YYYY-MM-DD" 형식으로 반환
 */
export function formatKSTDate(date?: Date): string {
  const now = date || new Date();
  return now.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\. /g, '-').replace('.', '');
}
