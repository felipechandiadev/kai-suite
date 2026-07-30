'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Marca la imagen como lista aunque venga de caché (donde a veces no se dispara `onLoad`).
 */
export function useImageWithPlaceholder(src: string) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLImageElement | null>(null);

  useLayoutEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  const onLoad = useCallback(() => setLoaded(true), []);
  const onError = useCallback(() => {
    setError(true);
    setLoaded(false);
  }, []);

  return { ref, loaded, error, onLoad, onError };
}
