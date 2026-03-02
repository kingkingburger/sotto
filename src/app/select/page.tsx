'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Calendar } from 'lucide-react';
import { CONCEPT_TAGS, TAG_COLORS } from '@/lib/constants';
import type { ConceptTag } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONCEPT_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`relative flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-sotto-700 bg-sotto-50 shadow-card-hover scale-[1.02]'
                    : 'border-sotto-200 bg-white hover:border-sotto-300 hover:shadow-card'
                }`}
              >
                {/* Selected indicator */}
                <div
                  className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
                    isSelected ? 'bg-sotto-700 scale-100' : 'scale-0 bg-sotto-200'
                  }`}
                >
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>

                <span className="text-4xl">{tag.emoji}</span>
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

      {/* Period Picker */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-sotto-800">
          <Calendar className="h-5 w-5 text-sotto-500" />
          며칠치 메뉴를 만들까요?
        </h2>
        <div className="flex gap-3">
          {([5, 7] as Period[]).map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`flex flex-1 flex-col items-center rounded-2xl border-2 px-4 py-5 transition-all duration-200 ${
                period === days
                  ? 'border-sotto-700 bg-sotto-50 shadow-card-hover scale-[1.02]'
                  : 'border-sotto-200 bg-white hover:border-sotto-300 hover:shadow-card'
              }`}
            >
              <span className="text-2xl font-bold text-sotto-800">{days}일</span>
              <span className="mt-1 text-sm text-sotto-500">
                {days === 5 ? '평일' : '한 주'}
              </span>
              <div
                className={`mt-2 overflow-hidden transition-all duration-200 ${
                  period === days ? 'max-h-6 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <span className="inline-flex items-center rounded-full bg-sotto-700 px-2 py-0.5 text-xs font-medium text-white">
                  선택됨
                </span>
              </div>
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
