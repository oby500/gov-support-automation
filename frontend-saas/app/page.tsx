'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Calendar, Building2 } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  organization: string;
  source: string;
  start_date: string;
  end_date: string;
  status: string;
  category?: string;
}

interface SearchFilters {
  source: 'all' | 'kstartup' | 'bizinfo';
  status: 'all' | 'ongoing' | 'deadline';
}

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    source: 'all',
    status: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const PAGE_SIZE = 20;

  // 검색 함수
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        page: currentPage.toString(),
        page_size: PAGE_SIZE.toString(),
      });

      if (filters.source !== 'all') {
        params.append('source', filters.source);
      }
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      const response = await fetch(`${API_URL}/api/search?${params}`);
      const data = await response.json();

      setAnnouncements(data.results || []);
      setTotalResults(data.total || 0);
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 최근 공고 불러오기 (초기 로딩)
  useEffect(() => {
    async function fetchRecent() {
      try {
        const response = await fetch(`${API_URL}/api/recent?limit=20`);
        const data = await response.json();
        setAnnouncements(data.results || []);
        setTotalResults(data.total || 0);
      } catch (error) {
        console.error('최근 공고 로딩 실패:', error);
      }
    }
    fetchRecent();
  }, []);

  // 엔터키로 검색
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 상태별 Badge 색상
  const getStatusBadge = (status: string) => {
    if (status === 'ongoing') return <Badge variant="success">진행중</Badge>;
    if (status === 'deadline') return <Badge variant="warning">마감임박</Badge>;
    return <Badge variant="default">종료</Badge>;
  };

  // 출처별 Badge
  const getSourceBadge = (source: string) => {
    if (source === 'kstartup') return <Badge variant="default">K-Startup</Badge>;
    return <Badge variant="default">BizInfo</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-blue-600">
              로튼
            </h1>
            <div className="text-sm text-gray-500">
              정부지원사업 통합 검색
            </div>
          </div>

          {/* 검색바 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="검색어를 입력하세요 (예: 창업, 중소기업, R&D)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? '검색 중...' : '검색'}
            </Button>
          </div>

          {/* 필터 */}
          <div className="flex gap-4 mt-4">
            <div className="flex gap-2 items-center">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">출처:</span>
              <Button
                variant={filters.source === 'all' ? 'default' : 'outline'}
                onClick={() => setFilters({ ...filters, source: 'all' })}
                className="h-8 text-xs"
              >
                전체
              </Button>
              <Button
                variant={filters.source === 'kstartup' ? 'default' : 'outline'}
                onClick={() => setFilters({ ...filters, source: 'kstartup' })}
                className="h-8 text-xs"
              >
                K-Startup
              </Button>
              <Button
                variant={filters.source === 'bizinfo' ? 'default' : 'outline'}
                onClick={() => setFilters({ ...filters, source: 'bizinfo' })}
                className="h-8 text-xs"
              >
                BizInfo
              </Button>
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium text-gray-700">상태:</span>
              <Button
                variant={filters.status === 'all' ? 'default' : 'outline'}
                onClick={() => setFilters({ ...filters, status: 'all' })}
                className="h-8 text-xs"
              >
                전체
              </Button>
              <Button
                variant={filters.status === 'ongoing' ? 'default' : 'outline'}
                onClick={() => setFilters({ ...filters, status: 'ongoing' })}
                className="h-8 text-xs"
              >
                진행중
              </Button>
              <Button
                variant={filters.status === 'deadline' ? 'default' : 'outline'}
                onClick={() => setFilters({ ...filters, status: 'deadline' })}
                className="h-8 text-xs"
              >
                마감임박
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* 결과 헤더 */}
        <div className="mb-4 text-gray-600">
          {searchQuery ? (
            <p>
              <span className="font-semibold text-gray-900">&quot;{searchQuery}&quot;</span> 검색 결과:{' '}
              <span className="font-semibold text-blue-600">{totalResults.toLocaleString()}</span>건
            </p>
          ) : (
            <p className="font-semibold text-gray-900">최근 공고</p>
          )}
        </div>

        {/* 검색 결과 리스트 */}
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/announcement/${announcement.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2 hover:text-blue-600">
                      {announcement.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {announcement.organization}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getSourceBadge(announcement.source)}
                    {getStatusBadge(announcement.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {announcement.start_date} ~ {announcement.end_date}
                    </span>
                  </div>
                  {announcement.category && (
                    <Badge variant="default">{announcement.category}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">검색 중...</p>
          </div>
        )}

        {/* 결과 없음 */}
        {!loading && announcements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">검색 결과가 없습니다.</p>
          </div>
        )}

        {/* 페이지네이션 (추후 구현) */}
        {totalResults > PAGE_SIZE && (
          <div className="mt-8 flex justify-center gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              이전
            </Button>
            <span className="py-2 px-4 text-sm text-gray-600">
              {currentPage} / {Math.ceil(totalResults / PAGE_SIZE)}
            </span>
            <Button
              variant="outline"
              disabled={currentPage >= Math.ceil(totalResults / PAGE_SIZE)}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
