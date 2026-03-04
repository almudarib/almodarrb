'use client';
import * as React from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';

export default function EmotionProvider({ children }: { children: React.ReactNode }) {
  const [cache] = React.useState(() => {
    const insertionPoint =
      typeof document !== 'undefined'
        ? (document.querySelector('meta[name="emotion-insertion-point"]') as HTMLElement | null)
        : null;
    return createCache({ key: 'mui', prepend: true, insertionPoint: insertionPoint ?? undefined });
  });

  useServerInsertedHTML(() => {
    const inserted = (cache as unknown as { inserted: Record<string, string> }).inserted;
    const names = Object.keys(inserted);
    if (names.length === 0) return null;
    return (
      <style
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: names.map((n) => inserted[n]).join(' ') }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
