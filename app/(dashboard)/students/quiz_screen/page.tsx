import Link from 'next/link';
import { Suspense } from 'react';
import { getSession, clearSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { LOGIN_PATH } from '@/lib/paths';
import {
  fetchStudent,
  getExam,
  examQuestions,
  examImageUrl,
  submitExamResult,
  type Dict,
} from '@/actions/service';
import QuizClient from './QuizClient';

/**
 * صفحة بدء الامتحان (SSR)
 * - تقرأ examId من searchParams
 * - تتحقق من الطالب واللغة وصلاحية عرض الاختبارات
 * - تجلب بيانات الامتحان والأسئلة وتمريرها لمكوّن عميل
 */
export default function QuizScreenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div dir="rtl" className="min-h-svh bg-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
            <h1 className="text-xl font-bold mb-2">جارٍ تحميل الاختبار…</h1>
            <p className="text-slate-600">يرجى الانتظار لحظات قليلة.</p>
          </div>
        </div>
      }
    >
      <QuizScreenContent searchParams={searchParams} />
    </Suspense>
  );
}

async function QuizScreenContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const examId = parsePositiveInt(
    typeof sp.examId === 'string' ? sp.examId : Array.isArray(sp.examId) ? sp.examId[0] : undefined,
  );
  if (!examId) {
    return viewMessage('معرف الامتحان غير صالح', {
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

  const eRes = await getExam(examId);
  if (!eRes.ok || !eRes.data) {
    return viewMessage(eRes.ok ? 'الامتحان غير موجود' : eRes.error, {
      dir,
      actionHref: '/students/exams_screen',
      actionText: 'العودة إلى المجموعات',
    });
  }
  const exam = eRes.data as Dict;
  const title = String(exam['title'] ?? 'اختبار');
  const durationMinutes = toInt(exam['duration_minutes']) || 0;
  const groupId = toInt(exam['group_id']) || null;

  const qRes = await examQuestions(examId);
  if (!qRes.ok) {
    return viewMessage(qRes.error, {
      dir,
      actionHref: '/students/exams_screen',
      actionText: 'العودة إلى المجموعات',
    });
  }
  const rawQuestions = (qRes.data as Dict[]) ?? [];
  const questions = await Promise.all(
    rawQuestions.map(async (q) => {
      const imageRaw = (q['image_url'] as string | null) ?? null;
      const img = await examImageUrl(imageRaw);
      const image_url = img.ok ? (img.data ?? null) : null;
      return {
        id: toInt(q['id']),
        question: String(q['question'] ?? ''),
        image_url,
        option_a: String(q['option_a'] ?? ''),
        option_b: String(q['option_b'] ?? ''),
        option_c: String(q['option_c'] ?? ''),
        option_d: String(q['option_d'] ?? ''),
        correct_option: (String(q['correct_option'] ?? '').toUpperCase() as 'A' | 'B' | 'C' | 'D') || 'A',
      };
    }),
  );
  const clean = questions.filter((x) => x.id > 0);

  async function submitResultAction(input: {
    examId: number;
    score: number;
    durationMinutes: number;
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    'use server';
    const session = await getSession();
    const sid = session?.id ?? null;
    if (!sid) return { ok: false, error: 'لا يوجد طالب مرتبط بالحساب' };
    const res = await submitExamResult(sid, input.examId, input.score, input.durationMinutes);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  }

  return (
    <div dir={dir} className="min-h-svh bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
{/* استبدل Link بـ وسم a عادي أو زر يعتمد على window.location */}
<a
  href={groupId ? `/students/group_exams?id=${groupId}` : '/students/exams_screen'}
  className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 no-underline"
  aria-label="رجوع"
>
  ← رجوع
</a>
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        </div>
        <QuizClient
          examId={examId}
          title={title}
          durationMinutes={durationMinutes}
          groupId={groupId}
          questions={clean}
          onSubmit={submitResultAction}
        />
      </div>
    </div>
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

