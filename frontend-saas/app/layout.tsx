import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "로튼 - 정부지원사업 검색",
  description: "K-Startup과 BizInfo의 정부지원사업 공고를 한눈에",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
