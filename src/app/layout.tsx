import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SWRegister } from '@/components/sw-register';
import { Toaster } from 'sonner';
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <SWRegister />
        <Toaster position="bottom-center" richColors closeButton />
      </body>
    </html>
  );
}
