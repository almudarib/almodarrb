import Link from 'next/link';
import { cookies } from 'next/headers';
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
export default async function QuizScreenPage({
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
      actionHref: '/student/exams_screen',
      actionText: 'العودة إلى المجموعات',
    });
  }

  const cookieStore = await cookies();
  const sidCookie = cookieStore.get('student_id');
  const studentId = parsePositiveInt(sidCookie?.value ?? '');
  if (!studentId) {
    return viewMessage('لا يوجد طالب مرتبط بالحساب', {
      actionHref: '/student/login',
      actionText: 'الذهاب لصفحة الدخول',
    });
  }

  const stuRes = await fetchStudent(studentId);
  if (!stuRes.ok) {
    return viewMessage(stuRes.error, { actionHref: '/student/dash', actionText: 'العودة للوحة' });
  }
  const stu = (stuRes.data as Dict | null) ?? null;
  const showExams = Boolean(stu?.['show_exams']);
  const language = (stu?.['language'] as string | undefined) ?? null;
  const dir = computeDir(language);
  if (!showExams) {
    return viewMessage('غير مسموح بعرض الاختبارات حالياً', {
      dir,
      actionHref: '/student/dash',
      actionText: 'العودة للوحة',
    });
  }

  const eRes = await getExam(examId);
  if (!eRes.ok || !eRes.data) {
    return viewMessage(eRes.ok ? 'الامتحان غير موجود' : eRes.error, {
      dir,
      actionHref: '/student/exams_screen',
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
      actionHref: '/student/exams_screen',
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
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('student_id');
    const studentId = parsePositiveInt(sidCookie?.value ?? '');
    if (!studentId) return { ok: false, error: 'لا يوجد طالب مرتبط بالحساب' };
    const res = await submitExamResult(studentId, input.examId, input.score, input.durationMinutes);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  }

  return (
    <div dir={dir} className="min-h-svh bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href={groupId ? `/student/group_exams?id=${groupId}` : '/student/exams_screen'}
            className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            aria-label="رجوع"
          >
            ← رجوع
          </Link>
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

