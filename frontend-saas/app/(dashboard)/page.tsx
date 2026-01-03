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
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecent();
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

  async function handleSearch() {
    if (!searchQuery.trim()) return;

    setLoading(true);

    try {
      const { data: kstartupData } = await supabase
        .from('kstartup_complete')
        .select('announcement_id, biz_pbanc_nm, pbanc_ntrp_nm, pbanc_rcpt_end_dt')
        .ilike('biz_pbanc_nm', `%${searchQuery}%`);

      const { data: bizinfoData } = await supabase
        .from('bizinfo_complete')
        .select('pblanc_id, pblanc_nm, organ_nm, reqst_end_ymd')
        .ilike('pblanc_nm', `%${searchQuery}%`);

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
                      if (e.key === 'Enter') handleSearch();
                    }}
                  />
                </div>
              </div>

              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 h-12 px-8">
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
                    <div className="flex-1"></div>
                    <div>
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
