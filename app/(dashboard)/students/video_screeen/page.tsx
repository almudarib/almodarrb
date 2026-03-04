import Link from 'next/link';
import { getVideoInfo } from '@/actions/video';

export default async function VideoScreeenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const videoUrl = normalizeParam(sp?.videoUrl);
  const title = normalizeParam(sp?.title) || 'مشغل الفيديو';
  if (!videoUrl) {
    return viewMessage('رابط الفيديو غير متوفر', {
      actionHref: '/students/sessions_screen',
      actionText: 'العودة إلى قائمة الدروس',
    });
  }
  const yt = asYouTubeEmbed(videoUrl);
  if (yt) {
    return (
      <div dir="rtl" className="min-h-svh bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/students/sessions_screen"
              className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            >
              ← رجوع
            </Link>
            <h1 className="text-base font-bold text-slate-800">{title}</h1>
          </div>
          <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-black">
            <div className="w-full aspect-[16/9]">
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
      </div>
    );
  }
  const info = await getVideoInfo({ videoUrl, title });
  if (!info.ok) {
    return viewMessage(info.error.message || 'تعذر التحقق من رابط الفيديو', {
      actionHref: '/students/sessions_screen',
      actionText: 'العودة إلى قائمة الدروس',
    });
  }
  return (
    <div dir="rtl" className="min-h-svh bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/students/sessions_screen"
            className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            ← رجوع
          </Link>
          <h1 className="text-base font-bold text-slate-800">{title}</h1>
        </div>
        <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-black">
          <video
            src={info.data.url}
            controls
            className="w-full h-auto max-h-[80vh]"
          />
        </div>
        <div className="mt-3 text-center">
          <a
            href={info.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 rounded-lg text-sky-700 hover:text-sky-800"
          >
            فتح في تبويب جديد
          </a>
        </div>
      </div>
    </div>
  );
}

function viewMessage(
  message: string,
  opts?: { actionHref?: string; actionText?: string },
) {
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
      if (u.pathname.startsWith('/embed/')) return url;
    }
    return null;
  } catch {
    return null;
  }
}

