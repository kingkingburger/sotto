'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal } from 'lucide-react';
import { CONCEPT_TAGS, TAG_COLORS } from '@/lib/constants';
import type { ConceptTag } from '@/types/recipe';
import { Badge } from './badge';

interface FilterSheetProps {
  tags: ConceptTag[];
  days: 5 | 7;
  onApply: (tags: ConceptTag[], days: 5 | 7) => void;
}

export function FilterSheet({ tags, days, onApply }: FilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localTags, setLocalTags] = useState<ConceptTag[]>(tags);
  const [localDays, setLocalDays] = useState<5 | 7>(days);

  // Escape key handler
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  function handleOpen() {
    setLocalTags(tags);
    setLocalDays(days);
    setIsOpen(true);
  }

  function handleApply() {
    onApply(localTags, localDays);
    setIsOpen(false);
  }

  function handleReset() {
    setLocalTags([]);
    setLocalDays(5);
  }

  function toggleTag(tag: ConceptTag) {
    setLocalTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const hasActiveFilters = tags.length > 0 || days !== 5;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        className={`relative flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
          hasActiveFilters
            ? 'border-accent-300 bg-accent-50 text-accent-700'
            : 'border-sotto-200 bg-white text-sotto-600 hover:border-sotto-300 hover:bg-sotto-50'
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        필터
        {hasActiveFilters && (
          <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">
            {tags.length + (days !== 5 ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Overlay + Sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-2xl sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
              onKeyDown={handleKeyDown}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="필터 설정"
            >
              {/* Handle bar (mobile) */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-sotto-200" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pb-2 pt-5">
                <h2 className="text-lg font-bold text-sotto-800">필터</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-sotto-100 text-sotto-500 transition-colors hover:bg-sotto-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                {/* Tags */}
                <div className="mb-6">
                  <p className="mb-3 text-sm font-medium text-sotto-500">컨셉</p>
                  <div className="flex flex-wrap gap-2">
                    {CONCEPT_TAGS.map((tag) => {
                      const isSelected = localTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-all ${
                            isSelected
                              ? TAG_COLORS[tag.id] + ' scale-[1.02] shadow-sm'
                              : 'border-sotto-200 bg-white text-sotto-500 hover:border-sotto-300'
                          }`}
                        >
                          <div className="flex flex-col items-start">
                            <span className="flex items-center gap-1.5">
                              <span>{tag.emoji}</span>
                              {tag.label}
                            </span>
                            <span className="text-xs font-normal text-sotto-400">{tag.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Days */}
                <div className="mb-8">
                  <p className="mb-3 text-sm font-medium text-sotto-500">기간</p>
                  <div className="flex rounded-xl border border-sotto-200 bg-sotto-50 p-1">
                    {([5, 7] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setLocalDays(d)}
                        className={`flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all ${
                          localDays === d
                            ? 'bg-white text-sotto-800 shadow-sm'
                            : 'text-sotto-400 hover:text-sotto-600'
                        }`}
                      >
                        {d}일
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 rounded-xl border border-sotto-200 py-3 text-sm font-semibold text-sotto-500 transition-all hover:bg-sotto-50"
                  >
                    초기화
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex-1 rounded-xl bg-sotto-700 py-3 text-sm font-semibold text-white transition-all hover:bg-sotto-600 active:bg-sotto-800"
                  >
                    적용하기
                  </button>
                </div>

                {/* Active filters preview */}
                {localTags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {localTags.map((tagId) => {
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
                    {localDays !== 5 && <Badge label={`${localDays}일`} />}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
