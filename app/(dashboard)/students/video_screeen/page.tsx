import Link from 'next/link';
import { getVideoInfo } from '@/actions/video';

/**
 * شاشة مشغل الفيديو (SSR)
 * - تقرأ videoUrl و title من searchParams
 * - تدعم روابط YouTube عبر iframe، وروابط ملفات الفيديو عبر عنصر video
 */
export default async function VideoScreeenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const videoUrl = normalizeParam(sp.videoUrl);
  const title = normalizeParam(sp.title) || 'مشغل الفيديو';
  if (!videoUrl) {
    return viewMessage('رابط الفيديو غير متوفر', {
      actionHref: '/student/sessions_screen',
      actionText: 'العودة إلى قائمة الدروس',
    });
  }

  const yt = asYouTubeEmbed(videoUrl);
  if (yt) {
    return (
      <div dir="rtl" className="min-h-svh bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="aspect-video w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-black">
            <iframe
              src={yt}
              title={title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    );
  }

  // التحقق من الرابط قبل عرضه عبر عنصر الفيديو
  const info = await getVideoInfo({ videoUrl, title });
  if (!info.ok) {
    return viewMessage(info.error.message || 'تعذر التحقق من رابط الفيديو', {
      actionHref: '/student/sessions_screen',
      actionText: 'العودة إلى قائمة الدروس',
    });
  }

  return (
    <div dir="rtl" className="min-h-svh bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-black">
          <video
            src={info.data.url}
            controls
            className="w-full h-auto"
            style={{ maxHeight: '80vh' }}
          />
        </div>
        <div className="mt-3 text-center">
          <a
            href={info.data.url}
            className="text-sky-700 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            فتح في تبويب جديد
          </a>
        </div>
      </div>
    </div>
  );
}

function viewMessage(message: string, opts?: { actionHref?: string; actionText?: string }) {
  return (
    <div dir="rtl" className="min-h-svh bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
        <h1 className="text-xl font-bold mb-2">تنبيه</h1>
        <p className="text-slate-600">{message}</p>
        {opts?.actionHref && opts?.actionText ? (
          <div className="mt-4">
            <Link
              className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
              href={opts.actionHref}
            >
              {opts.actionText}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function normalizeParam(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const raw = Array.isArray(v) ? v[0] : v;
  const s = String(raw ?? '').trim();
  return s.length > 0 ? s : null;
}

function asYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}`;
      // أنماط أخرى مثل /embed/ID
      if (u.pathname.startsWith('/embed/')) return url;
    }
    return null;
  } catch {
    return null;
  }
}

