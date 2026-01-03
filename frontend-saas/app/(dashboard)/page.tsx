'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Building2, Search } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  organization: string;
  end_date: string;
  source: string;
  relevance?: number;
}

interface FilterOptions {
  categories: string[];
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ categories: [] });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [useAISearch, setUseAISearch] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    fetchRecent();
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('bookmarkedAnnouncements') || '[]');
      setBookmarks(saved);
    } catch (error) {
      console.error('북마크 로드 실패:', error);
    }
  };

  const toggleBookmark = (announcementId: string) => {
    try {
      const saved = JSON.parse(localStorage.getItem('bookmarkedAnnouncements') || '[]');

      let updated: string[];
      if (saved.includes(announcementId)) {
        updated = saved.filter((id: string) => id !== announcementId);
      } else {
        updated = [...saved, announcementId];
      }

      localStorage.setItem('bookmarkedAnnouncements', JSON.stringify(updated));
      setBookmarks(updated);
    } catch (error) {
      console.error('북마크 토글 실패:', error);
    }
  };

  const isBookmarked = (announcementId: string) => {
    return bookmarks.includes(announcementId);
  };

  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const response = await fetch('/api/filters');
        const data = await response.json();

        if (data?.success && data?.filters?.categories) {
          setFilterOptions({ categories: data.filters.categories });
        }
      } catch (error) {
        console.error('필터 옵션 로딩 실패:', error);
      }
    }

    fetchFilterOptions();
  }, []);

  async function fetchRecent() {
    try {
      const { data: kstartupData } = await supabase
        .from('kstartup_complete')
        .select('announcement_id, biz_pbanc_nm, pbanc_ntrp_nm, pbanc_rcpt_end_dt')
        .gte('pbanc_rcpt_end_dt', new Date().toISOString().split('T')[0])
        .order('pbanc_rcpt_end_dt', { ascending: true })
        .limit(9);

      const { data: bizinfoData } = await supabase
        .from('bizinfo_complete')
        .select('pblanc_id, pblanc_nm, organ_nm, reqst_end_ymd')
        .gte('reqst_end_ymd', new Date().toISOString().split('T')[0])
        .order('reqst_end_ymd', { ascending: true })
        .limit(9);

      const combined: Announcement[] = [
        ...(kstartupData || []).map(item => ({
          id: item.announcement_id,
          title: item.biz_pbanc_nm,
          organization: item.pbanc_ntrp_nm,
          end_date: item.pbanc_rcpt_end_dt,
          source: 'kstartup'
        })),
        ...(bizinfoData || []).map(item => ({
          id: item.pblanc_id,
          title: item.pblanc_nm,
          organization: item.organ_nm,
          end_date: item.reqst_end_ymd,
          source: 'bizinfo'
        }))
      ];

      setAnnouncements(combined);
    } catch (error) {
      console.error('공고 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSemanticSearch() {
    if (!searchQuery.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/search/hybrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          source: 'all',
          limit: 20,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI 검색 실패: ${response.statusText}`);
      }

      const data = await response.json();

      const mapped: Announcement[] = (data?.results || []).map((item: any) => ({
        id: String(item?.announcement_id ?? ''),
        title: String(item?.title ?? ''),
        organization: String(item?.organization ?? ''),
        end_date: String(item?.end_date ?? ''),
        source: String(item?.source ?? ''),
        relevance: typeof item?.final_score === 'number'
          ? item.final_score
          : (typeof item?.vector_score === 'number' ? item.vector_score : undefined),
      }));

      setAnnouncements(mapped);
    } catch (error) {
      console.error('AI 검색 실패:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;

    setLoading(true);

    try {
      let kstartupQuery = supabase
        .from('kstartup_complete')
        .select('announcement_id, biz_pbanc_nm, pbanc_ntrp_nm, pbanc_rcpt_end_dt')
        .ilike('biz_pbanc_nm', `%${searchQuery}%`);

      if (selectedCategory) {
        kstartupQuery = kstartupQuery.eq('category', selectedCategory);
      }

      const { data: kstartupData } = await kstartupQuery;

      let bizinfoQuery = supabase
        .from('bizinfo_complete')
        .select('pblanc_id, pblanc_nm, organ_nm, reqst_end_ymd')
        .ilike('pblanc_nm', `%${searchQuery}%`);

      if (selectedCategory) {
        bizinfoQuery = bizinfoQuery.eq('category', selectedCategory);
      }

      const { data: bizinfoData } = await bizinfoQuery;

      const combined: Announcement[] = [
        ...(kstartupData || []).map((item) => ({
          id: item.announcement_id,
          title: item.biz_pbanc_nm,
          organization: item.pbanc_ntrp_nm,
          end_date: item.pbanc_rcpt_end_dt,
          source: 'kstartup',
        })),
        ...(bizinfoData || []).map((item) => ({
          id: item.pblanc_id,
          title: item.pblanc_nm,
          organization: item.organ_nm,
          end_date: item.reqst_end_ymd,
          source: 'bizinfo',
        })),
      ];

      setAnnouncements(combined);
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setLoading(false);
    }
  }

  // D-Day 계산 (순수 함수)
  const calculateDday = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto p-8">
          <div className="text-center py-12">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* K-Startup Style Header */}
      <header className="bg-white">
        {/* Top Gray Bar */}
        <div className="bg-gray-100 border-b border-gray-200">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>중소벤처기업부</span>
                <span className="text-gray-300">|</span>
                <span>창업진흥원</span>
                <span className="text-gray-300">|</span>
                <span>중소벤처기업진흥공단</span>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-xs text-gray-600 hover:text-gray-900">
                  로그인
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Header - Logo */}
        <div className="border-b">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between py-4">
              <Link href="/" className="flex items-center">
                <div className="w-40 h-12 bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center rounded">
                  <span className="text-white font-bold text-xl">로튼</span>
                </div>
              </Link>
              <div className="flex-1 max-w-2xl mx-8">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="검색어를 입력하세요"
                    className="pl-12 h-12 text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        useAISearch ? handleSemanticSearch() : handleSearch();
                      }
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ai-search"
                    checked={useAISearch}
                    onChange={(e) => setUseAISearch(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 flex-shrink-0"
                  />
                  <label
                    htmlFor="ai-search"
                    className="text-sm font-medium text-purple-900 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>✨</span>
                    <span>AI 검색</span>
                  </label>
                </div>

                <div className="mt-3">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    지원분야
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">전체</option>
                    {filterOptions.categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                onClick={useAISearch ? handleSemanticSearch : handleSearch}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-8"
              >
                검색
              </Button>
            </div>
          </div>
        </div>

        {/* Blue Navigation Bar */}
        <div className="bg-blue-700">
          <div className="container mx-auto px-6">
            <nav className="flex items-center gap-0">
              <Link href="/" className="px-6 py-4 text-sm font-medium text-white hover:bg-blue-800 transition-colors">
                사업소개
              </Link>
              <Link href="/" className="px-6 py-4 text-sm font-medium text-white hover:bg-blue-800 transition-colors">
                사업공고
              </Link>
              <Link href="/" className="px-6 py-4 text-sm font-medium text-white hover:bg-blue-800 transition-colors">
                양식마당
              </Link>
              <Link href="/" className="px-6 py-4 text-sm font-medium text-white hover:bg-blue-800 transition-colors">
                민원지원
              </Link>
              <Link href="/" className="px-6 py-4 text-sm font-medium text-white hover:bg-blue-800 transition-colors">
                고객센터
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">최근 공고</h1>
        
        {/* 3-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((announcement) => {
            const dday = calculateDday(announcement.end_date);
            const isDeadline = dday <= 7;

            return (
              <Link
                key={announcement.id}
                href={`/announcement/${announcement.id}`}
                className="block"
              >
                <div className="border-2 rounded-lg p-5 hover:shadow-lg hover:border-orange-300 transition-all cursor-pointer h-full">
                  {/* 상단: D-Day 배지 */}
                  <div className="flex items-start justify-between mb-3">
                    <button
                      type="button"
                      className="text-xl leading-none text-yellow-500"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleBookmark(announcement.id);
                      }}
                      aria-label="bookmark"
                    >
                      {isBookmarked(announcement.id) ? '⭐' : '☆'}
                    </button>
                    <div>
                      {typeof announcement.relevance === 'number' && (
                        <span className="inline-block px-2.5 py-1 bg-purple-600 text-white text-xs font-bold rounded mr-2">
                          AI {Math.round(announcement.relevance * 100)}
                        </span>
                      )}
                      {isDeadline ? (
                        <span className="inline-block px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded">
                          마감임박
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 bg-blue-500 text-white text-xs font-bold rounded">
                          D-{dday}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 제목 */}
                  <h3 className="text-base font-bold text-gray-900 mb-3 line-clamp-2 min-h-[3rem] hover:text-orange-500">
                    {announcement.title}
                  </h3>

                  {/* 기관 */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 pb-3 border-b">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{announcement.organization}</span>
                  </div>

                  {/* 마감일 */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>마감일자 {announcement.end_date}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {announcements.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            공고가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
