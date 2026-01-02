/**
 * 관리자 대시보드 페이지
 */

import { Metadata } from 'next';
import AdminDashboard from './AdminDashboard';

export const metadata: Metadata = {
  title: '관리자 대시보드 - 로튼',
};

export default function AdminPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">관리자 대시보드</h1>
      <AdminDashboard />
    </div>
  );
}
