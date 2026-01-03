import Link from 'next/link';

export default function EntryPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>roten.kr flow test</h1>
      <Link href="/announcement/test-id">
        → 공고 상세로 이동
      </Link>
    </main>
  );
}
