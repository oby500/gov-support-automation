'use client';

/**
 * 챗봇용 공고 카드 컴포넌트
 *
 * 챗봇 대화 내에서 검색 결과를 카드 형태로 표시
 */

import { Calendar, Building2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Announcement {
  id: string;
  source: string;
  title: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  region?: string;
  industry?: string;
  hasWritableContent?: boolean;
}

interface AnnouncementCardProps {
  announcement: Announcement;
  compact?: boolean;
}

export function AnnouncementCard({ announcement, compact = false }: AnnouncementCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '미정';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getSourceBadge = (source: string) => {
    if (source.toLowerCase().includes('kstartup') || source.toLowerCase().includes('ks')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
          K-Startup
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
        BizInfo
      </span>
    );
  };

  return (
    <Link
      href={`/announcement/${announcement.id}`}
      className="block group"
    >
      <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition-all bg-white">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {announcement.title}
            </h4>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-blue-600 transition-colors" />
        </div>

        {/* 기관 */}
        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
          <Building2 className="w-3.5 h-3.5" />
          <span className="truncate">{announcement.organization}</span>
        </div>

        {/* 메타 정보 */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {getSourceBadge(announcement.source)}

          {announcement.region && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
              {announcement.region}
            </span>
          )}

          {announcement.industry && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              {announcement.industry}
            </span>
          )}

          {announcement.hasWritableContent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              AI 작성 가능
            </span>
          )}
        </div>

        {/* 마감일 */}
        {announcement.endDate && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>마감: {formatDate(announcement.endDate)}</span>
          </div>
        )}

        {/* 요약 (compact 모드가 아닐 때만) */}
        {!compact && announcement.summary && (
          <p className="mt-2 text-xs text-gray-600 line-clamp-2">
            {announcement.summary}
          </p>
        )}
      </div>
    </Link>
  );
}
