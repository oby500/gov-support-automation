# 백엔드-프론트엔드 동기화 문제 해결 로그

## 날짜: 2025-01-15

## 문제 요약

사용자가 반복적으로 겪는 백엔드-프론트엔드 동기화 이슈:
- "하루에도 수십번 이런 현상이잖아"
- 페이지 변경 시 데이터가 제대로 로딩되지 않음
- 브라우저에서 변경사항이 반영되지 않음

## 근본 원인 분석

### 1. 중복 서버 인스턴스 실행 문제
**발견 내용**:
```
Python 프로세스: 5개 실행 중 (PID: 18680, 56416, 69208, 70312, 71808)
- 백엔드 서버가 포트 8000에서 중복 실행
- 어떤 서버가 응답하는지 예측 불가능

Node.js 프로세스: 28개 실행 중
- 프론트엔드 서버가 포트 3003에서 중복 실행 (PID: 59804, 48876, 53460, 43588)
- 의존성 패키지 포함 다수의 Node 프로세스
```

**영향**:
- 코드 변경 후에도 이전 버전의 서버가 응답할 수 있음
- 브라우저 캐시와 결합하여 동기화 문제 심화

### 2. 프론트엔드 페이지네이션 구현 오류
**현재 구현** (`frontend-saas/app/(dashboard)/page.tsx`):
```typescript
const handlePageChange = (page: number) => {
  setCurrentPage(page);
  // 문제: API 호출 없음, 로컬 상태만 변경
};
```

**문제점**:
- 초기 로딩 시 한 번만 API 호출
- 페이지 변경 시 클라이언트 사이드 페이지네이션만 수행
- 백엔드에서 페이지별 데이터를 준비해도 프론트엔드가 호출하지 않음

### 3. 백엔드 fetch_limit 변경 이력
**변경 과정**:
```python
# 초기: max(100, page * limit * 2)  → 최대 120개 정도만 로딩
# 중간: 10000                       → 전체 6,968개 모두 로딩 (성능 문제)
# 최종: page * limit * 3             → 페이지별 필요한 만큼만 로딩
```

**의도**:
- 사용자 요구사항: "제한은 두지 말고, 처음부터 모두 로딩하지 말고 페이지 넘길때 로딩하게"
- 백엔드는 수정됨
- **프론트엔드가 페이지 변경 시 API를 호출하지 않아 의미 없음**

## 수행한 작업

### 1. UI 개선 (완료)
**파일**: `frontend-saas/components/AutoSlideCarousel.tsx`

**변경 내용**:
```typescript
// 카드 여백 축소
<CardContent className="p-3">  // 변경 전: p-4

// 폰트 크기 증가
<h3 className="text-base">     // 변경 전: text-sm
<p className="text-sm">        // 변경 전: text-xs
<div className="text-sm">      // 변경 전: text-xs

// 슬라이드 버그 수정
const SLIDE_BY = 2;            // 변경 전: 1
transform: `translateX(-${(currentIndex / 2) * (100 / COLS)}%)`
```

### 2. 페이지네이션 UI 개선 (완료)
**파일**: `frontend-saas/app/(dashboard)/page.tsx`

**슬라이딩 윈도우 페이지네이션**:
```typescript
// 5개 페이지 버튼만 표시, 현재 페이지 중심으로 슬라이딩
const maxVisiblePages = 5;
let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
```

### 3. 마감 공고 표시 (완료)
**파일**: `frontend-saas/app/(dashboard)/page.tsx`

```typescript
{announcement.status === 'closed' && (
  <span className="px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-300">
    마감
  </span>
)}
```

### 4. 백엔드 fetch_limit 조정 (완료)
**파일**: `frontend/app.py` (라인 2222-2239)

```python
# 페이지별 필요한 만큼만 로딩
fetch_limit = page * limit * 3

async def fetch_ks():
    return supabase.table('kstartup_complete')\
        .select("announcement_id,biz_pbanc_nm,pbanc_ntrp_nm,pbanc_rcpt_bgng_dt,pbanc_rcpt_end_dt,created_at")\
        .order('created_at', desc=True)\
        .limit(fetch_limit)\
        .execute()
```

## 미완료 작업 (CRITICAL)

### 1. 프론트엔드 API 호출 수정 필요
**파일**: `frontend-saas/app/(dashboard)/page.tsx`

**현재 코드**:
```typescript
const handlePageChange = (page: number) => {
  setCurrentPage(page);
  // 문제: API 호출 없음
};
```

**필요한 수정**:
```typescript
const handlePageChange = async (page: number) => {
  setLoading(true);
  setCurrentPage(page);

  try {
    const url = `${API_URL}/api/recent?page=${page}&limit=${PAGE_SIZE}${statusFilter ? `&status=${statusFilter}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();

    setAnnouncements(data.results || []);
    setTotalCount(data.total || 0);
  } catch (error) {
    console.error('[ERROR] 페이지 변경 실패:', error);
  } finally {
    setLoading(false);
  }
};
```

### 2. 중복 서버 프로세스 종료 필요
**백엔드 중복 서버**:
```bash
# 제거 대상 PID: 56416, 69208, 70312, 71808
# 유지: 18680

taskkill /F /PID 56416
taskkill /F /PID 69208
taskkill /F /PID 70312
taskkill /F /PID 71808
```

**프론트엔드 중복 서버**:
```bash
# 제거 대상 PID: 48876, 43588
# 유지: 59804, 53460 (개발 서버 + 의존성)

taskkill /F /PID 48876
taskkill /F /PID 43588
```

### 3. 브라우저 캐시 클리어 필요
- Ctrl + Shift + Delete
- 캐시된 이미지 및 파일 삭제
- 하드 새로고침 (Ctrl + F5)

## 재발 방지 방안

### 1. 서버 프로세스 관리
**권장사항**:
```bash
# 서버 시작 전 기존 프로세스 확인
netstat -ano | findstr :8000
netstat -ano | findstr :3003

# 중복 프로세스 종료 후 시작
```

**자동화 스크립트 필요**:
```bash
# start-servers.bat
@echo off
echo 기존 서버 프로세스 종료 중...
taskkill /F /IM "python.exe" /FI "WINDOWTITLE eq uvicorn*" 2>nul
timeout /t 2 /nobreak >nul

echo 백엔드 서버 시작 중...
start "Backend Server" cmd /k "cd E:\gov-support-automation\frontend && python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo 프론트엔드 서버 시작 중...
start "Frontend Server" cmd /k "cd E:\gov-support-automation\frontend-saas && pnpm dev"

echo 서버 시작 완료!
```

### 2. 개발 워크플로우 개선
1. **변경 사항 확인**:
   - 백엔드 변경 후 서버 재시작 확인
   - 프론트엔드 변경 후 hot-reload 확인
   - 브라우저에서 실제 반영 확인

2. **디버깅 체크리스트**:
   - [ ] 서버 프로세스 개수 확인 (`tasklist | findstr "python.exe node.exe"`)
   - [ ] 포트 사용 확인 (`netstat -ano | findstr :8000`)
   - [ ] 브라우저 캐시 클리어
   - [ ] 네트워크 탭에서 API 호출 확인
   - [ ] Console에서 에러 확인

3. **동기화 검증**:
   - 백엔드 로그 확인 (API 요청 수신 여부)
   - 프론트엔드 네트워크 탭 확인 (API 호출 여부)
   - 응답 데이터 구조 확인 (예상값과 일치 여부)

## 사용자 요구사항 정리

1. ✅ **카드 여백 축소 및 폰트 크기 증가** - 완료
2. ✅ **캐러셀 슬라이드 버그 수정** - 완료
3. ✅ **슬라이딩 페이지네이션 (5개 버튼)** - 완료
4. ✅ **전체 공고 개수 표시 (6,968개)** - 완료
5. ✅ **마감 공고 빨간색 표시** - 완료
6. ❌ **페이지별 데이터 로딩** - 미완료 (백엔드만 수정, 프론트엔드 미수정)
7. ❌ **동기화 문제 근본 해결** - 진행 중 (원인 파악 완료, 조치 필요)

## 다음 단계

### 즉시 수행 필요:
1. 프론트엔드 `handlePageChange` 함수 수정하여 API 호출 추가
2. 중복 서버 프로세스 종료
3. 브라우저 캐시 클리어 및 재시작
4. 기능 테스트:
   - 페이지 1 → 페이지 2 이동 시 API 호출 확인
   - 네트워크 탭에서 `/api/recent?page=2&limit=20` 호출 확인
   - 새로운 공고 데이터 표시 확인

### 장기 개선사항:
1. 서버 시작/종료 자동화 스크립트 작성
2. 개발 환경 프로세스 모니터링 도구 도입
3. API 호출 로깅 강화 (요청/응답 전체 기록)
4. 에러 바운더리 및 재시도 로직 추가

## 기술 스택 정보

- **프론트엔드**: Next.js 15.4.0-canary.47, React, TypeScript, Tailwind CSS
- **백엔드**: FastAPI, Python, Uvicorn
- **데이터베이스**: Supabase
- **개발 서버**:
  - Backend: http://localhost:8000
  - Frontend: http://localhost:3003

## 참고 파일

- `frontend-saas/components/AutoSlideCarousel.tsx` - 캐러셀 UI
- `frontend-saas/app/(dashboard)/page.tsx` - 메인 페이지, 페이지네이션
- `frontend/app.py` - 백엔드 API (라인 2222-2239)
- `frontend-saas/lib/db/queries.ts` - DB 쿼리 헬퍼
- `frontend-saas/auth.ts` - 인증 로직

## 결론

**핵심 문제**: 프론트엔드가 페이지 변경 시 백엔드 API를 호출하지 않음 + 중복 서버 인스턴스 실행

**해결 방법**:
1. `handlePageChange` 함수를 async로 변경하고 API 호출 추가
2. 중복 서버 프로세스 종료
3. 서버 관리 자동화 스크립트 도입

이 세 가지를 수행하면 "하루에도 수십번 발생하는" 동기화 문제가 근본적으로 해결될 것으로 예상됩니다.
