'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ApplicationWriter } from '@/components/ApplicationWriter';

export default function AnnouncementDetailPage() {
  const params = useParams();
  const announcementId = params.id as string;
  const [showWriter, setShowWriter] = useState(false);

  const announcement = {
    id: announcementId,
    title: '2024년 기술창업 지원사업',
    organization: '중소벤처기업부',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    budget: '최대 1억원',
    source: 'kstartup' as const
  };

  if (showWriter) {
    return (
      <div className="container mx-auto p-8">
        <ApplicationWriter
          announcementId={announcementId}
          announcementSource={announcement.source}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{announcement.title}</h1>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-3">
          <div>
            <span className="font-semibold">주관기관:</span> {announcement.organization}
          </div>
          <div>
            <span className="font-semibold">신청기간:</span> {announcement.startDate} ~ {announcement.endDate}
          </div>
          <div>
            <span className="font-semibold">지원금액:</span> {announcement.budget}
          </div>
        </div>

        <button
          onClick={() => setShowWriter(true)}
          className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          AI 신청서 작성 시작
        </button>
      </div>
    </div>
  );
}
