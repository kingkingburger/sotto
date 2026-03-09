import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function BackButton({ label = '뒤로 가기', href = '/' }: { label?: string; href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-sotto-500 transition-colors hover:text-sotto-700"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
