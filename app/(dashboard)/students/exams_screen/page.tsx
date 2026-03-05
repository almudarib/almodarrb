import Link from 'next/link';
import { getSession } from '@/lib/session';
import {
  fetchStudent,
  examGroupsByLanguage,
  type Dict,
} from '@/actions/service';

/**
 * شاشة قائمة مجموعات الاختبارات (SSR)
 * - تعتمد على وجود student_id في الكوكيز لتحديد الطالب
 * - تتحقق من السماح بعرض الاختبارات ولغة الطالب
 * - تجلب مجموعات الاختبارات حسب اللغة وتعرضها
 */
export default async function ExamsScreenPage() {
  const session = await getSession();
  const studentId = session?.id ?? null;

  if (!studentId) {
    return viewMessage('لا يوجد طالب مرتبط بالحساب', {
      actionHref: '/student/login',
      actionText: 'الذهاب لصفحة الدخول',
    });
  }

  const stuRes = await fetchStudent(studentId);
  if (!stuRes.ok) {
    return viewMessage(stuRes.error, { actionHref: '/students/dash', actionText: 'العودة للوحة' });
  }
  const stu = (stuRes.data as Dict | null) ?? null;
  const showExams = Boolean(stu?.['show_exams']);
  const language = (stu?.['language'] as string | undefined) ?? null;
  const dir = computeDir(language);

  if (!showExams) {
    return viewMessage('غير مسموح بعرض الاختبارات حالياً', {
      dir,
      actionHref: '/students/dash',
      actionText: 'العودة للوحة',
    });
  }
  if (!language) {
    return viewMessage('يرجى مراجعة الإدارة لتحديد اللغة', {
      dir,
      actionHref: '/students/dash',
      actionText: 'العودة للوحة',
    });
  }

  const groupsRes = await examGroupsByLanguage(language);
  if (!groupsRes.ok) {
    return viewMessage(groupsRes.error, { dir, actionHref: '/students/dash', actionText: 'العودة للوحة' });
  }
  const groups = (groupsRes.data as Dict[]) ?? [];
  const list = groups
    .map((g) => ({
      id: toInt(g['id']),
      title: String(g['title'] ?? 'مجموعة غير معنونة'),
    }))
    .filter((g) => g.id > 0)
    .sort((a, b) => b.id - a.id);

  return (
    <div dir={dir} className="min-h-svh bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/students/dash"
            className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            aria-label="رجوع"
          >
            ← رجوع
          </Link>
          <h1 className="text-lg font-bold text-slate-800">مركز الاختبارات</h1>
        </div>

        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {list.map((e) => (
              <div
                key={e.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="flex">
                  <div className="w-1.5 bg-amber-500" />
                  <div className="flex-1 p-4">
                    <div className="font-bold text-[#09203A] text-base">{e.title}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      <InfoTag label="مجموعة اختبارات" />
                    </div>
                  </div>
                  <div className="p-3">
                    <Link
                      href={`/students/group_exams?id=${e.id}&title=${encodeURIComponent(e.title)}`}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-[#09203A] text-white hover:bg-[#09203A]"
                    >
                      افتح
                    </Link>
                  </div>
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
      <div className="text-5xl text-slate-200 mb-3">📄</div>
      <div className="text-slate-600">لا توجد مجموعات متاحة حالياً</div>
    </div>
  );
}

function InfoTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-slate-600">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
      {label}
    </span>
  );
}

function viewMessage(message: string, opts?: { dir?: 'rtl' | 'ltr'; actionHref?: string; actionText?: string }) {
  const dir = opts?.dir ?? 'rtl';
  return (
    <div dir={dir} className="min-h-svh bg-slate-50 flex items-center justify-center p-6">
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

function computeDir(language: string | null): 'rtl' | 'ltr' {
  const lang = String(language ?? '').trim().toUpperCase();
  if (lang === 'EN' || lang === 'TR') return 'ltr';
  if (lang) return 'rtl';
  return 'rtl';
}

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}
