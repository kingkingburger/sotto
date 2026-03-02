import Link from 'next/link';
import { ArrowRight, Tag, UtensilsCrossed, ShoppingBasket } from 'lucide-react';

const steps = [
  {
    icon: Tag,
    step: '01',
    title: '컨셉 선택',
    description: '원하는 스타일 태그 고르기',
    detail: '가성비, 맛위주, 간편함 등 내 취향에 맞는 태그를 선택하세요.',
  },
  {
    icon: UtensilsCrossed,
    step: '02',
    title: '메뉴 확인',
    description: 'AI가 추천한 주간 메뉴 확인',
    detail: '선택한 태그를 기반으로 하루하루 도시락 메뉴를 추천해 드려요.',
  },
  {
    icon: ShoppingBasket,
    step: '03',
    title: '장보기 목록',
    description: '필요한 재료 한눈에 정리',
    detail: '모든 메뉴의 재료를 카테고리별로 합산해 장보기 목록을 만들어요.',
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      {/* Hero */}
      <section className="flex flex-col items-center py-20 text-center">
        <div className="mb-4 inline-flex items-center rounded-full bg-sotto-100 px-4 py-1.5 text-sm font-medium text-sotto-600">
          🍱 주간 도시락 메뉴 플래너
        </div>
        <h1 className="mb-4 text-6xl font-bold tracking-tight text-sotto-800 sm:text-7xl">
          Sotto
        </h1>
        <p className="mb-3 text-xl font-semibold text-sotto-700 sm:text-2xl">
          조용히 준비하는 일주일 도시락
        </p>
        <p className="mb-10 max-w-md text-lg text-sotto-500">
          &apos;뭐 싸가지?&apos; 고민, 이제 그만!
        </p>
        <Link
          href="/menu?days=5"
          className="group inline-flex items-center gap-2 rounded-2xl bg-sotto-700 px-8 py-4 text-lg font-semibold text-white shadow-md transition-all hover:bg-sotto-600 hover:shadow-lg active:bg-sotto-800"
        >
          바로 추천받기
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="/select"
          className="mt-3 text-sm font-medium text-sotto-500 hover:text-sotto-700"
        >
          취향에 맞게 선택하기 →
        </Link>
      </section>

      {/* Divider */}
      <div className="flex items-center gap-4 py-2">
        <div className="h-px flex-1 bg-sotto-200" />
        <span className="text-sm font-medium text-sotto-400">이렇게 사용해요</span>
        <div className="h-px flex-1 bg-sotto-200" />
      </div>

      {/* Steps */}
      <section className="py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, step, title, description, detail }) => (
            <div
              key={step}
              className="group relative rounded-2xl border border-sotto-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sotto-100 transition-colors group-hover:bg-sotto-200">
                  <Icon className="h-6 w-6 text-sotto-600" />
                </div>
                <span className="text-3xl font-bold text-sotto-200">{step}</span>
              </div>
              <h3 className="mb-1 text-lg font-bold text-sotto-800">{title}</h3>
              <p className="mb-3 text-sm font-medium text-sotto-500">{description}</p>
              <p className="text-sm leading-relaxed text-sotto-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-3xl bg-sotto-700 px-8 py-12 text-center text-white">
        <p className="mb-2 text-sm font-medium text-sotto-300">준비됐나요?</p>
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
          지금 바로 이번 주 메뉴를 정해보세요
        </h2>
        <p className="mb-8 text-sotto-300">
          컨셉 태그만 선택하면 AI가 알아서 메뉴와 장보기 목록을 만들어 드려요.
        </p>
        <Link
          href="/select"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-sotto-700 transition-colors hover:bg-sotto-100"
        >
          시작하기
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
