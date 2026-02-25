'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton({ label = '뒤로 가기' }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-sm text-sotto-500 hover:text-sotto-700"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
