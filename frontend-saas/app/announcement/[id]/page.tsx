'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Building2, ArrowLeft } from 'lucide-react';

interface AnnouncementDetail {
  id: string;
  title: string;
  organization: string;
  source: string;
  start_date: string;
  end_date: string;
  status: string;
  simple_summary?: string;
}

export default function AnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    async function fetchDetail() {
      try {
        const response = await fetch(`${API_URL}/api/announcement/${params.id}`);
        const data = await response.json();
        setAnnouncement(data);
      } catch (error) {
        console.error('상세 정보 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchDetail();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">공고를 찾을 수 없습니다.</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    if (status === 'ongoing') return <Badge variant="success">진행중</Badge>;
    if (status === 'deadline') return <Badge variant="warning">마감임박</Badge>;
    return <Badge variant="default">종료</Badge>;
  };

  const getSourceBadge = (source: string) => {
    if (source === 'kstartup') return <Badge variant="default">K-Startup</Badge>;
    return <Badge variant="default">BizInfo</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex gap-2 mb-4">
              {getSourceBadge(announcement.source)}
              {getStatusBadge(announcement.status)}
            </div>
            <CardTitle className="text-2xl mb-4">{announcement.title}</CardTitle>
            <CardDescription className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{announcement.organization}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {announcement.start_date} ~ {announcement.end_date}
                </span>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>

        {announcement.simple_summary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{announcement.simple_summary}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
