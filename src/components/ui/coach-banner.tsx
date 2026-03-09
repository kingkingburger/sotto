'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'sotto-coach-dismissed';

export function CoachBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      // SSR or storage unavailable
    }
  }, []);

  function handleDismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="mb-4 overflow-hidden"
        >
          <div className="flex items-start gap-3 rounded-2xl border border-sotto-200 bg-gradient-to-br from-sotto-100 to-sotto-500/[0.12] px-4 py-3.5">
            <span className="mt-0.5 text-[28px] leading-none flex-shrink-0">🍱</span>
            <div className="flex-1 text-sm leading-relaxed text-sotto-700">
              <p><strong className="font-semibold text-sotto-900">매주 도시락 메뉴를 추천해드려요.</strong>{' '}카드를 탭하면 레시피를 볼 수 있고, 🎲로 다시 뽑을 수 있어요.</p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sotto-200 text-sotto-600 transition-colors hover:bg-sotto-300"
              aria-label="안내 닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
