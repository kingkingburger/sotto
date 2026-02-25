import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-sotto-200 bg-sotto-50/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-sotto-700 hover:text-sotto-600 transition-colors"
        >
          Sotto
        </Link>
      </div>
    </header>
  );
}
