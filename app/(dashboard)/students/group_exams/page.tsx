import Link from 'next/link';
import { getSession, clearSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { LOGIN_PATH } from '@/lib/paths';
import {
  fetchStudent,
  getExamGroup,
  examsByGroup,
  type Dict,
} from '@/actions/service';

/**
 * شاشة اختبارات المجموعة (SSR)
 * - تقرأ groupId من searchParams
 * - تتحقق من هوية الطالب عبر الكوكيز show_exams + اللغة
 * - تجلب اختبارات المجموعة وترتّبها
 */
export default async function GroupExamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const groupId = parsePositiveInt(
    typeof sp.id === 'string' ? sp.id : Array.isArray(sp.id) ? sp.id[0] : undefined,
  );
  const titleFromQuery =
    typeof sp.title === 'string' ? sp.title : Array.isArray(sp.title) ? sp.title[0] : undefined;
  if (!groupId) {
    return viewMessage('معرف المجموعة غير صالح', {
      actionHref: '/students/exams_screen',
      actionText: 'العودة إلى المجموعات',
    });
  }

  const session = await getSession();
  const studentId = session?.id ?? null;
  if (!studentId) {
    return viewMessage('لا يوجد طالب مرتبط بالحساب', {
      actionHref: '/student/login',
      actionText: 'الذهاب لصفحة الدخول',
    });
  }

  const stuRes = await fetchStudent(studentId);
  if (!stuRes.ok || !stuRes.data) {
    await clearSession();
    redirect(LOGIN_PATH);
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

  // عنوان المجموعة: من الاستعلام أو من قاعدة البيانات
  let groupTitle = titleFromQuery?.trim();
  if (!groupTitle) {
    const gRes = await getExamGroup(groupId);
    if (!gRes.ok) {
      return viewMessage(gRes.error, { dir, actionHref: '/students/exams_screen', actionText: 'العودة إلى المجموعات' });
    }
    groupTitle = String((gRes.data as Dict | null)?.['title'] ?? 'اختبارات المجموعة');
  }

  const exRes = await examsByGroup(groupId);
  if (!exRes.ok) {
    return viewMessage(exRes.error, { dir, actionHref: '/students/exams_screen', actionText: 'العودة إلى المجموعات' });
  }
  const exams = ((exRes.data as Dict[]) ?? []).slice();
  exams.sort((a, b) => {
    const as = String(a['created_at'] ?? '');
    const bs = String(b['created_at'] ?? '');
    const ad = Date.parse(as);
    const bd = Date.parse(bs);
    if (Number.isFinite(ad) && Number.isFinite(bd)) {
      return ad - bd;
    }
    const ai = Number(a['id'] ?? 0);
    const bi = Number(b['id'] ?? 0);
    return ai - bi;
  });
  const list = exams
    .map((e) => ({
      id: toInt(e['id']),
      title: String(e['title'] ?? 'اختبار غير معنون'),
      duration: toInt(e['duration_minutes']),
    }))
    .filter((e) => e.id > 0);

  return (
    <div dir={dir} className="min-h-svh bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/students/exams_screen"
            className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            aria-label="رجوع"
          >
            ← رجوع
          </Link>
          <h1 className="text-lg font-bold text-slate-800">{groupTitle || 'اختبارات المجموعة'}</h1>
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
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <InfoTag label={`${e.duration} دقيقة`} />
                      <InfoTag label="متعدد الخيارات" />
                    </div>
                  </div>
                  <div className="p-3">
                    <Link
                      href={`/students/quiz_screen?examId=${e.id}`}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-[#09203A] text-white hover:bg-[#09203A]"
                    >
                      ابدأ
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
      <div className="text-5xl text-slate-200 mb-3">📝</div>
      <div className="text-slate-600">لا توجد اختبارات متاحة حالياً</div>
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

function viewMessage(
  message: string,
  opts?: { dir?: 'rtl' | 'ltr'; actionHref?: string; actionText?: string },
) {
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

function parsePositiveInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

