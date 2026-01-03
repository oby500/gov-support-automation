'use client';

export default function MyApplicationsPage() {
  const applications = [
    {
      id: '1',
      announcementTitle: '2024년 기술창업 지원사업',
      createdAt: '2024-01-03',
      status: 'completed',
      tier: 'Standard'
    }
  ];

  const handleDownload = (id: string, format: 'docx' | 'pdf') => {
    console.log(`Download ${id} as ${format}`);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">내 신청서 목록</h1>
      
      {applications.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          작성된 신청서가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    {app.announcementTitle}
                  </h2>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>작성일: {app.createdAt}</p>
                    <p>티어: {app.tier}</p>
                    <p>상태: {app.status === 'completed' ? '완료' : '작성중'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(app.id, 'docx')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  DOCX 다운로드
                </button>
                <button
                  onClick={() => handleDownload(app.id, 'pdf')}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  PDF 다운로드
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
