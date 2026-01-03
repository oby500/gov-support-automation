'use client';

import { useParams } from 'next/navigation';
import { ApplicationWriter } from '@/components/ApplicationWriter';

export default function AnnouncementDetailPage() {
  const params = useParams();

  return (
    <div style={{ padding: 40 }}>
      <h2>공고 ID: {params.id}</h2>

      {/* 핵심 */}
      <ApplicationWriter 
        announcementId={params.id as string} 
        announcementSource="kstartup"
      />
    </div>
  );
}
