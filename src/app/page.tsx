import Link from 'next/link';
import { ArrowRight, Tag, UtensilsCrossed, ShoppingBasket, Sparkles } from 'lucide-react';

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
    <div className="gradient-hero">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-8">
        {/* Hero */}
        <section className="flex flex-col items-center py-16 text-center sm:py-24">
          <div className="mb-6 inline-flex animate-fadeIn items-center gap-2 rounded-full border border-sotto-200 bg-white/80 px-5 py-2 text-sm font-medium text-sotto-600 shadow-card backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-sotto-400" />
            주간 도시락 메뉴 플래너
          </div>
          <h1 className="mb-4 animate-fadeIn text-5xl font-bold tracking-tight text-sotto-800 opacity-0 animate-delay-100 sm:text-7xl">
            Sotto
          </h1>
          <p className="mb-3 animate-fadeIn text-xl font-semibold text-sotto-700 opacity-0 animate-delay-200 sm:text-2xl">
            조용히 준비하는 일주일 도시락
          </p>
          <p className="mb-10 max-w-md animate-fadeIn text-lg text-sotto-500 opacity-0 animate-delay-300">
            &apos;뭐 싸가지?&apos; 고민, 이제 그만!
          </p>
          <div className="flex animate-slideUp flex-col items-center gap-3 opacity-0 animate-delay-400 sm:flex-row sm:gap-4">
            <Link
              href="/menu?days=5"
              className="group inline-flex items-center gap-2 rounded-2xl bg-sotto-700 px-8 py-4 text-lg font-semibold text-white shadow-elevated transition-all hover:bg-sotto-600 hover:shadow-lg hover:-translate-y-0.5 active:bg-sotto-800 active:translate-y-0"
            >
              바로 추천받기
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/select"
              className="inline-flex items-center gap-1 rounded-xl border border-sotto-200 bg-white/80 px-6 py-3 text-sm font-semibold text-sotto-600 shadow-card backdrop-blur-sm transition-all hover:bg-white hover:shadow-card-hover"
            >
              취향에 맞게 선택하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Divider */}
        <div className="flex items-center gap-4 py-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sotto-200 to-transparent" />
          <span className="text-sm font-medium text-sotto-400">이렇게 사용해요</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sotto-200 to-transparent" />
        </div>

        {/* Steps */}
        <section className="py-12">
          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map(({ icon: Icon, step, title, description, detail }, i) => (
              <div
                key={step}
                className="group relative overflow-hidden rounded-2xl border border-sotto-200 bg-white p-6 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1"
                style={{ animationDelay: `${i * 100 + 200}ms` }}
              >
                <div className="absolute -right-4 -top-4 text-8xl font-black text-sotto-50 transition-colors group-hover:text-sotto-100">
                  {step}
                </div>
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sotto-100 to-sotto-200 transition-all group-hover:from-sotto-200 group-hover:to-sotto-300">
                    <Icon className="h-6 w-6 text-sotto-600" />
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-sotto-800">{title}</h3>
                  <p className="mb-3 text-sm font-medium text-sotto-500">{description}</p>
                  <p className="text-sm leading-relaxed text-sotto-400">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-sotto-700 via-sotto-700 to-sotto-800 px-8 py-12 text-center text-white shadow-elevated">
          <p className="mb-2 text-sm font-medium text-sotto-300">준비됐나요?</p>
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
            지금 바로 이번 주 메뉴를 정해보세요
          </h2>
          <p className="mb-8 text-sotto-300">
            컨셉 태그만 선택하면 AI가 알아서 메뉴와 장보기 목록을 만들어 드려요.
          </p>
          <Link
            href="/select"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-sotto-700 shadow-card transition-all hover:bg-sotto-50 hover:shadow-card-hover hover:-translate-y-0.5"
          >
            시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
