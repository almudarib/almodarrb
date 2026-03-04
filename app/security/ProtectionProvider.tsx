'use client';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Typography } from '@mui/material';

type ProtectionConfig = {
  protectCopy: boolean;
  protectScreenshot: boolean;
  protectVideo: boolean;
  watermarkText?: string;
  watermarkWithTime?: boolean;
  watermarkFontSize?: number;
  watermarkAngle?: number;
  watermarkOpacity?: number;
  watermarkTileWidth?: number;
  watermarkTileHeight?: number;
};

export const ProtectionConfigContext = createContext<ProtectionConfig>({
  protectCopy: true,
  protectScreenshot: true,
  protectVideo: true,
  watermarkText: 'Protected',
  watermarkWithTime: true,
  watermarkFontSize: 24,
  watermarkAngle: -30,
  watermarkOpacity: 0.08,
});

function useThrottle(ms: number) {
  const lastRef = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastRef.current > ms) {
      lastRef.current = now;
      return true;
    }
    return false;
  }, [ms]);
}

function useSecurityLogger() {
  const post = useCallback(async (type: string, data?: Record<string, unknown>) => {
    try {
      await fetch('/api/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          data: data || {},
          ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          ts: Date.now(),
        }),
        keepalive: true,
      });
    } catch {}
  }, []);
  return post;
}

function Watermark({
  text,
  includeTime = true,
  fontSize = 28,
  angle = -30,
  opacity = 0.08,
  tileWidth,
  tileHeight,
}: {
  text: string;
  includeTime?: boolean;
  fontSize?: number;
  angle?: number;
  opacity?: number;
  tileWidth?: number;
  tileHeight?: number;
}) {
  const [stamp, setStamp] = useState(() => new Date());
  useEffect(() => {
    if (!includeTime) return;
    const id = setInterval(() => setStamp(new Date()), 60000);
    return () => clearInterval(id);
  }, [includeTime]);
  const pattern = useMemo(() => {
    const t = includeTime ? `${text} · ${stamp.toLocaleString()}` : text;
    const estWidth = Math.max(600, Math.round(t.length * (fontSize * 0.8)) + 120);
    const w = tileWidth ?? estWidth;
    const h = tileHeight ?? Math.max(340, Math.round(fontSize * 12));
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);
    const fill = `rgba(0,0,0,${opacity})`;
    const encoded = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <defs><filter id="s"><feGaussianBlur stdDeviation="0.15"/></filter></defs>
        <text x="${cx}" y="${cy}" fill="${fill}" transform="rotate(${angle},${cx},${cy})" font-family="system-ui, Arial" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" direction="rtl" unicode-bidi="bidi-override" filter="url(#s)">${t}</text>
      </svg>`
    );
    return { url: `url("data:image/svg+xml,${encoded}")`, width: w, height: h };
  }, [text, stamp, includeTime, fontSize, angle, opacity, tileWidth, tileHeight]);
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2147483647,
        backgroundImage: pattern.url,
        backgroundRepeat: 'repeat',
        backgroundSize: `${pattern.width}px ${pattern.height}px`,
        mixBlendMode: 'multiply',
      }}
    />
  );
}

export default function ProtectionProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<ProtectionConfig>;
}) {
  const merged = useMemo<ProtectionConfig>(
    () => ({
      protectCopy: true,
      protectScreenshot: true,
      protectVideo: true,
      watermarkText: 'Protected',
      watermarkWithTime: true,
      watermarkFontSize: 24,
      watermarkAngle: -30,
      watermarkOpacity: 0.08,
      ...config,
    }),
    [config]
  );
  const log = useSecurityLogger();
  const allowLog = useThrottle(1000);
  const [masked, setMasked] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (merged.protectCopy) root.classList.add('protect-copy');
    else root.classList.remove('protect-copy');
    return () => {
      root.classList.remove('protect-copy');
    };
  }, [merged.protectCopy]);

  useEffect(() => {
    if (!merged.protectCopy) return;
    const root = document.documentElement;
    root.style.setProperty('-webkit-user-select', 'none');
    root.style.setProperty('-webkit-touch-callout', 'none');
    const onContext = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('[data-allow-copy="true"]')) return;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t as HTMLElement).isContentEditable)
        return;
      e.preventDefault();
      if (allowLog()) log('right_click_blocked', {});
    };
    const onSelect = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('[data-allow-copy="true"]')) return;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t as HTMLElement).isContentEditable)
        return;
      e.preventDefault();
      if (allowLog()) log('select_blocked', {});
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const combo =
        (e.ctrlKey || e.metaKey) &&
        (k === 'c' || k === 'x' || k === 'v' || k === 'a' || k === 's' || k === 'p' || k === 'u');
      const devtools =
        (e.ctrlKey && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) || k === 'f12';
      if (combo || devtools) {
        const t = e.target as HTMLElement | null;
        if (
          t &&
          (t.getAttribute('data-allow-copy') === 'true' ||
            t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            (t as HTMLElement).isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        if (allowLog()) log('shortcut_blocked', { key: e.key, ctrl: e.ctrlKey, meta: e.metaKey });
      }
    };
    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', onContext, { capture: true });
    document.addEventListener('selectstart', onSelect, { capture: true });
    document.addEventListener('keydown', onKey, { capture: true });
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('touchstart', () => {}, { passive: true });
    return () => {
      root.style.removeProperty('-webkit-user-select');
      root.style.removeProperty('-webkit-touch-callout');
      document.removeEventListener('contextmenu', onContext, { capture: true } as any);
      document.removeEventListener('selectstart', onSelect, { capture: true } as any);
      document.removeEventListener('keydown', onKey, { capture: true } as any);
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('touchstart', () => {}, { passive: true } as any);
    };
  }, [merged.protectCopy, log, allowLog]);

  useEffect(() => {
    if (!merged.protectScreenshot) return;
    const showMask = () => {
      setMasked(true);
      if (allowLog()) log('mask_on', {});
    };
    const hideMask = () => {
      setMasked(false);
      if (allowLog()) log('mask_off', {});
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') showMask();
      else hideMask();
    };
    const onBlur = () => showMask();
    const onFocus = () => hideMask();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        setMasked(true);
        setTimeout(() => setMasked(false), 1500);
        if (allowLog()) log('printscreen_blocked', {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('keyup', onKey, { capture: true });
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('keyup', onKey, { capture: true } as any);
    };
  }, [merged.protectScreenshot, log, allowLog]);

  useEffect(() => {
    if (!merged.protectVideo) return;
    const videos = new Set<HTMLVideoElement>();
    const scan = () => {
      document.querySelectorAll('video').forEach((v) => {
        if (videos.has(v)) return;
        videos.add(v);
        try {
          v.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback nopictureinpicture');
          if ('disablePictureInPicture' in v) {
            (v as HTMLVideoElement & { disablePictureInPicture?: boolean }).disablePictureInPicture = true;
          }
          v.addEventListener('contextmenu', (e) => e.preventDefault());
        } catch {}
      });
    };
    const obs = new MutationObserver(() => scan());
    scan();
    obs.observe(document.documentElement, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [merged.protectVideo]);

  const maskNode = masked ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        backdropFilter: 'blur(25px) saturate(0.5)',
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        pointerEvents: 'none',
      }}
    >
      <div style={{ textAlign: 'center', padding: 20 }}>
        <Typography variant="h6">المحتوى محمي</Typography>
        <Typography variant="caption">يرجى العودة لصفحة الاختبار</Typography>
      </div>
    </div>
  ) : null;

  return (
    <ProtectionConfigContext.Provider value={merged}>
      {merged.protectScreenshot && merged.watermarkText ? (
        <Watermark
          text={merged.watermarkText}
          includeTime={merged.watermarkWithTime !== false}
          fontSize={merged.watermarkFontSize}
          angle={merged.watermarkAngle}
          opacity={merged.watermarkOpacity}
          tileWidth={merged.watermarkTileWidth}
          tileHeight={merged.watermarkTileHeight}
        />
      ) : null}
      {maskNode}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </ProtectionConfigContext.Provider>
  );
}

export function ProtectedText({
  encoded,
  as = 'span',
  render = 'text',
  className,
}: {
  encoded: string;
  as?: keyof React.JSX.IntrinsicElements;
  render?: 'text' | 'canvas';
  className?: string;
}) {
  const [text, setText] = useState('');
  useEffect(() => {
    try {
      setText(atob(encoded));
    } catch {
      setText('');
    }
  }, [encoded]);
  if (render === 'canvas') {
    return <CanvasText text={text} className={className} />;
  }
  return React.createElement(as as any, { className, style: { userSelect: 'none' }, 'data-protected': true } as any, text);
}

function CanvasText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const font = '16px system-ui, Arial';
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const width = Math.ceil(metrics.width + 8);
    const height = Math.ceil(24);
    c.width = width;
    c.height = height;
    const ctx2 = c.getContext('2d');
    if (!ctx2) return;
    ctx2.font = font;
    ctx2.fillStyle = '#111';
    ctx2.textBaseline = 'top';
    ctx2.fillText(text, 4, 4);
  }, [text]);
  return <canvas ref={ref} className={className} style={{ pointerEvents: 'none' }} />;
}

export function AllowCopy({ children, as = 'div' }: { children: React.ReactNode; as?: keyof React.JSX.IntrinsicElements }) {
  return React.createElement(as as any, { 'data-allow-copy': 'true' } as any, children);
}
