'use client';

export default function MenuError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 text-center px-4">
      <div className="text-4xl">😥</div>
      <div>
        <h2 className="text-xl font-semibold text-sotto-800 mb-2">
          메뉴를 불러오는 중 문제가 발생했어요
        </h2>
        {error.message && (
          <p className="text-sm text-sotto-500">{error.message}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-6 py-2 rounded-full bg-sotto-700 text-white font-medium hover:bg-sotto-600 transition-colors"
      >
        다시 시도하기
      </button>
    </div>
  );
}
