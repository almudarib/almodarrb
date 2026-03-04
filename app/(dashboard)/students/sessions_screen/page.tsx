import Link from 'next/link';
import { cookies } from 'next/headers';
import { fetchStudent, listSessions, type Dict } from '@/actions/service';

/**
 * شاشة قائمة الجلسات الفيديوية (SSR)
 * - تعتمد على وجود student_id في الكوكيز
 * - تحاول جلب جلسات باللغة الخاصة بالطالب، وإن لم تتوفر تُظهر المتاح العام
 * - تفتح روابط YouTube في تبويب خارجي، وروابط الملفات مباشرة في تبويب جديد
 */
export default async function SessionsScreenPage() {
  const cookieStore = await cookies();
  const sidCookie = cookieStore.get('student_id');
  const studentId = parsePositiveInt(sidCookie?.value ?? '');

  // محاولة معرفة لغة الطالب لتحسين نتائج الجلسات
  let language: string | null = null;
  if (studentId) {
    const stuRes = await fetchStudent(studentId);
    if (stuRes.ok) {
      const stu = (stuRes.data as Dict) ?? {};
      const lang = String(stu['language'] ?? '').trim();
      language = lang || null;
    }
  }

  // طلب الجلسات باللغة المحددة أولاً، ثم بديل عام عند غياب النتائج
  const byLang = await listSessions({
    isActive: true,
    sortBy: 'created_at',
    ascending: false,
    page: 1,
    perPage: 200,
    language,
  });
  if (!byLang.ok) {
    return viewMessage(byLang.error, { actionHref: '/student/dash', actionText: 'العودة للوحة' });
  }
  let rows = (byLang.data as Dict[]) ?? [];
  if (rows.length === 0) {
    const all = await listSessions({
      isActive: true,
      sortBy: 'created_at',
      ascending: false,
      page: 1,
      perPage: 200,
    });
    if (!all.ok) {
      return viewMessage(all.error, { actionHref: '/student/dash', actionText: 'العودة للوحة' });
    }
    rows = (all.data as Dict[]) ?? [];
  }
  const list = rows.map((r, idx) => ({
    id: toInt(r['id']),
    title: String(r['title'] ?? 'درس'),
    language: String(r['language'] ?? ''),
    order_number: toInt(r['order_number']) || idx + 1,
    video_url: String(r['video_url'] ?? ''),
  })).filter((s) => s.id > 0 && s.video_url);

  return (
    <div dir="rtl" className="min-h-svh bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/student/dash"
            className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            aria-label="رجوع"
          >
            ← رجوع
          </Link>
          <h1 className="text-lg font-bold text-slate-800">الدروس التعليمية</h1>
        </div>

        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {list.map((s, index) => (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center"
              >
                <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                  {(s.order_number || index + 1)}
                </div>
                <div className="flex-1 ms-3">
                  <div className="font-semibold text-sky-700">{s.title}</div>
                  <div className="text-xs text-slate-500">اللغة: {s.language || 'غير محددة'}</div>
                </div>
                <div className="ms-2">
                  <Link
                    href={`/student/video_screeen?videoUrl=${encodeURIComponent(s.video_url)}&title=${encodeURIComponent(s.title)}`}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                    aria-label="عرض الفيديو"
                  >
                    عرض الفيديو
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
      <div className="text-5xl text-slate-200 mb-3">🎬</div>
      <div className="text-slate-600">لا توجد جلسات فيديو متاحة</div>
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

function parsePositiveInt(v: string): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}
