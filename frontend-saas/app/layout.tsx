import './globals.css'

export const metadata = {
  title: '로튼 - 정부지원사업',
  description: 'AI 기반 정부지원사업 신청서 자동 작성',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
