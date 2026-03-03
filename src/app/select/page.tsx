'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Calendar } from 'lucide-react';
import { CONCEPT_TAGS, TAG_COLORS } from '@/lib/constants';
import type { ConceptTag } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/** 선택 시 카드 배경에 쓸 태그별 연한 컬러 (hex, 알파 인라인 스타일용) */
const TAG_SELECTED_BG: Record<ConceptTag, string> = {
  budget: 'rgba(74, 222, 128, 0.12)',
  taste: 'rgba(249, 115, 22, 0.10)',
  volume: 'rgba(59, 130, 246, 0.10)',
  easy: 'rgba(167, 139, 250, 0.12)',
  nutrition: 'rgba(20, 184, 166, 0.12)',
};

/** 선택 시 체크 인디케이터 & 테두리에 쓸 태그별 컬러 */
const TAG_ACCENT_COLOR: Record<ConceptTag, string> = {
  budget: '#16a34a',
  taste: '#c2410c',
  volume: '#1d4ed8',
  easy: '#7c3aed',
  nutrition: '#0f766e',
};

type Period = 5 | 7;

export default function SelectPage() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<ConceptTag[]>([]);
  const [period, setPeriod] = useState<Period>(5);

  function toggleTag(tag: ConceptTag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleSubmit() {
    if (selectedTags.length === 0) return;
    const params = new URLSearchParams({
      tags: selectedTags.join(','),
      days: String(period),
    });
    router.push(`/menu?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Heading */}
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-3xl font-bold text-sotto-800">어떤 도시락을 원하세요?</h1>
        <p className="text-sotto-500">원하는 스타일을 모두 골라보세요 (복수 선택 가능)</p>
      </div>

      {/* Concept Tag Cards */}
      <section className="mb-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONCEPT_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                style={
                  isSelected
                    ? {
                        backgroundColor: TAG_SELECTED_BG[tag.id],
                        borderColor: TAG_ACCENT_COLOR[tag.id],
                      }
                    : undefined
                }
                className={`relative flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
                  isSelected
                    ? 'scale-[1.02] shadow-card-hover'
                    : 'border-sotto-200 bg-white hover:border-sotto-300 hover:shadow-card'
                }`}
              >
                {/* Selected indicator */}
                <div
                  style={isSelected ? { backgroundColor: TAG_ACCENT_COLOR[tag.id] } : undefined}
                  className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
                    isSelected ? 'scale-100' : 'scale-0 bg-sotto-200'
                  }`}
                >
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>

                <span className="text-5xl">{tag.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TAG_COLORS[tag.id]}`}
                    >
                      {tag.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-sotto-500">{tag.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Period Picker — Segment Control */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-sotto-800">
          <Calendar className="h-5 w-5 text-sotto-500" />
          며칠치 메뉴를 만들까요?
        </h2>
        <div className="flex rounded-xl border border-sotto-200 bg-sotto-100 p-1">
          {([5, 7] as Period[]).map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`flex-1 cursor-pointer rounded-lg py-3 text-center text-sm font-semibold transition-all duration-200 ${
                period === days
                  ? 'bg-accent-500 text-white shadow-sm'
                  : 'bg-transparent text-sotto-500 hover:text-sotto-700'
              }`}
            >
              {days}일
            </button>
          ))}
        </div>
      </section>

      {/* Selected tags preview */}
      {selectedTags.length > 0 && (
        <div className="mb-6 animate-fadeIn rounded-2xl border border-sotto-200 bg-white p-4 shadow-card">
          <p className="mb-2 text-xs font-medium text-sotto-400">선택한 컨셉</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tagId) => {
              const tag = CONCEPT_TAGS.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <Badge
                  key={tagId}
                  label={`${tag.emoji} ${tag.label}`}
                  colorClass={TAG_COLORS[tagId]}
                />
              );
            })}
            <Badge label={`${period}일치`} />
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={selectedTags.length === 0}
          size="lg"
          className="w-full max-w-sm"
        >
          메뉴 추천받기
        </Button>
        {selectedTags.length === 0 && (
          <p className="text-sm text-sotto-400">태그를 하나 이상 선택해 주세요</p>
        )}
      </div>
    </div>
  );
}
