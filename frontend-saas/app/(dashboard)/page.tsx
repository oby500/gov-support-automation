import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">정부지원 공고 목록</h1>
      
      <div className="space-y-4">
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <Link href="/announcement/test-id" className="block">
            <h2 className="text-xl font-semibold mb-2">
              [테스트] 2024년 기술창업 지원사업
            </h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>기관: 중소벤처기업부</p>
              <p>기간: 2024-01-01 ~ 2024-12-31</p>
              <p>지원금액: 최대 1억원</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
