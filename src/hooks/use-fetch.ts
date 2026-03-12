'use client';

import { useEffect, useRef, useState } from 'react';

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * AbortController를 자동으로 관리하는 fetch 훅.
 * url이 null이면 fetch를 건너뜀.
 * deps가 변경될 때마다 이전 요청을 abort하고 새로 fetch.
 */
export function useFetch<T>(
  url: string | null,
  options?: RequestInit,
): UseFetchState<T> {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: url !== null,
    error: null,
  });

  // options 객체 참조 안정화 — JSON 직렬화로 비교
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (url === null) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));

    async function doFetch() {
      try {
        const res = await fetch(url!, {
          ...optionsRef.current,
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: T = await res.json();
        setState({ data, loading: false, error: null });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : '오류가 발생했어요';
        setState({ data: null, loading: false, error: msg });
      }
    }

    doFetch();
    return () => controller.abort();
  }, [url]);

  return state;
}
