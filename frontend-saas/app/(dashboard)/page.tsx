'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  organization: string;
  end_date: string;
  source: string;
}

export default function DashboardPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecent();
  }, []);

  async function fetchRecent() {
    try {
      // K-Startup 공고 조회
      const { data: kstartupData } = await supabase
        .from('kstartup_complete')
        .select('announcement_id, biz_pbanc_nm, instt_nm, end_date')
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('end_date', { ascending: true })
        .limit(9);

      // BizInfo 공고 조회
      const { data: bizinfoData } = await supabase
        .from('bizinfo_complete')
        .select('pblanc_id, pblanc_nm, instt_nm, rcept_endde')
        .gte('rcept_endde', new Date().toISOString().split('T')[0])
        .order('rcept_endde', { ascending: true })
        .limit(9);

      const combined: Announcement[] = [
        ...(kstartupData || []).map(item => ({
          id: item.announcement_id,
          title: item.biz_pbanc_nm,
          organization: item.instt_nm,
          end_date: item.end_date,
          source: 'kstartup'
        })),
        ...(bizinfoData || []).map(item => ({
          id: item.pblanc_id,
          title: item.pblanc_nm,
          organization: item.instt_nm,
          end_date: item.rcept_endde,
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

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center py-12">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">정부지원 공고</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <Link href={`/announcement/${announcement.id}`} className="block">
              <h2 className="text-xl font-semibold mb-3 line-clamp-2">
                {announcement.title}
              </h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p>기관: {announcement.organization}</p>
                <p>마감: {announcement.end_date}</p>
                <p className="text-xs text-gray-400">
                  출처: {announcement.source === 'kstartup' ? 'K-Startup' : '기업마당'}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {announcements.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          공고가 없습니다.
        </div>
      )}
    </div>
  );
}
