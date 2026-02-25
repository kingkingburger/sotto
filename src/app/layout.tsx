import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sotto — 주간 도시락 메뉴 플래너',
  description: '"뭐 싸가지?" 고민 끝! 일주일 도시락 메뉴를 쉽고 재미있게 정하세요.',
  openGraph: {
    title: 'Sotto — 주간 도시락 메뉴 플래너',
    description: '직장인을 위한 주간 도시락 메뉴 추천 서비스',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen font-sans">
        <main className="mx-auto max-w-4xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
