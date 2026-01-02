// URL 쿼리 파라미터 유틸리티
// 검색 상태를 URL과 동기화하는 헬퍼 함수들

export interface SearchState {
  query: string;
  status: 'all' | 'ongoing' | 'deadline';
  categories?: string[];
  regions?: string[];
  targets?: string[];
  ages?: string[];
  businessYears?: string[];
  sort?: 'newest' | 'deadline' | 'views' | 'relevance';
  page?: number;
  aiSearch?: boolean;
}

/**
 * URL에서 검색 상태 읽기
 */
export function getSearchStateFromURL(): SearchState {
  if (typeof window === 'undefined') {
    return { query: '', status: 'all', page: 1 };
  }

  const params = new URLSearchParams(window.location.search);
  
  return {
    query: params.get('q') || '',
    status: (params.get('status') as any) || 'all',
    categories: params.get('categories')?.split(',').filter(Boolean),
    regions: params.get('regions')?.split(',').filter(Boolean),
    targets: params.get('targets')?.split(',').filter(Boolean),
    ages: params.get('ages')?.split(',').filter(Boolean),
    businessYears: params.get('businessYears')?.split(',').filter(Boolean),
    sort: (params.get('sort') as any) || 'newest',
    page: parseInt(params.get('page') || '1'),
    aiSearch: params.get('aiSearch') === 'true',
  };
}

/**
 * 검색 상태를 URL에 저장
 */
export function updateURLWithSearchState(state: Partial<SearchState>) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams();

  // 검색어
  if (state.query) {
    params.set('q', state.query);
  }

  // 상태
  if (state.status && state.status !== 'all') {
    params.set('status', state.status);
  }

  // 카테고리
  if (state.categories && state.categories.length > 0) {
    params.set('categories', state.categories.join(','));
  }

  // 지역
  if (state.regions && state.regions.length > 0) {
    params.set('regions', state.regions.join(','));
  }

  // 대상
  if (state.targets && state.targets.length > 0) {
    params.set('targets', state.targets.join(','));
  }

  // 연령
  if (state.ages && state.ages.length > 0) {
    params.set('ages', state.ages.join(','));
  }

  // 창업연력
  if (state.businessYears && state.businessYears.length > 0) {
    params.set('businessYears', state.businessYears.join(','));
  }

  // 정렬
  if (state.sort && state.sort !== 'newest') {
    params.set('sort', state.sort);
  }

  // 페이지
  if (state.page && state.page !== 1) {
    params.set('page', state.page.toString());
  }

  // AI 검색
  if (state.aiSearch) {
    params.set('aiSearch', 'true');
  }

  // URL 업데이트 (페이지 리로드 없이)
  const newURL = params.toString() ? `/?${params.toString()}` : '/';
  window.history.pushState({}, '', newURL);
}

/**
 * URL에서 특정 파라미터 제거
 */
export function removeURLParam(param: string) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  params.delete(param);

  const newURL = params.toString() ? `/?${params.toString()}` : '/';
  window.history.pushState({}, '', newURL);
}

/**
 * URL 완전 초기화 (검색 상태 모두 제거)
 */
export function clearURLParams() {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', '/');
}
