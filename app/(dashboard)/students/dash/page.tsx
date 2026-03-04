import Image from 'next/image';
import Link from 'next/link';
import logo from '@/app/logo (1).png';
import { redirect } from 'next/navigation';

import {
  fetchStudent,
  countExams,
  countSessions,
  countStudentCompletedExams,
  countWatchedSessionsForStudent,
  finishLastAppSessionForStudent,
  type Dict,
} from '@/actions/service';
import { logStudentLogout } from '@/actions/logs';
import { getSession, clearSession } from '@/lib/session';
import { LOGIN_PATH } from '@/lib/paths';

/**
 * صفحة لوحة الطالب (SSR)
 * - تعتمد على جلسة app_session لتحديد هوية الطالب
 * - تجلب إحصائيات الامتحانات والجلسات من دوال خادمية
 * - توفر زر تسجيل خروج ينفّذ دوال خادمة لإغلاق الجلسة وتحديث السجلات
 */
export default async function StudentDashPage() {
  const session = await getSession();
  const studentId = session?.id ?? null;

  // في حال عدم وجود الطالب الحالي نعرض رسالة ودعوة لتسجيل الدخول
  if (!studentId) {
    return (
      <div className="min-h-svh bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
          <h1 className="text-xl font-bold mb-2">لا يوجد طالب مرتبط بالحساب</h1>
          <p className="text-slate-600 mb-4">الرجاء تسجيل الدخول أولًا للوصول إلى لوحة الطالب</p>
          <Link className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700" href={LOGIN_PATH}>
            الذهاب إلى صفحة الدخول
          </Link>
        </div>
      </div>
    );
  }

  // نجلب بيانات الطالب للحصول على اللغة
  const stuRes = await fetchStudent(Number(studentId));
  if (!stuRes.ok) {
    return errorView(stuRes.error);
  }
  const language = ((stuRes.data as Dict | null)?.['language'] as string | undefined) ?? null;
  if (!language) {
    return errorView('لم يتم العثور على اللغة');
  }

  // جلب الإحصائيات المطلوبة بالتوازي
  const [examsR, sessionsR, doneExamsR, doneSessionsR] = await Promise.all([
    countExams(language),
    countSessions(language),
    countStudentCompletedExams(Number(studentId), language),
    countWatchedSessionsForStudent(Number(studentId), language),
  ]);
  if (!examsR.ok) return errorView(examsR.error);
  if (!sessionsR.ok) return errorView(sessionsR.error);
  if (!doneExamsR.ok) return errorView(doneExamsR.error);
  if (!doneSessionsR.ok) return errorView(doneSessionsR.error);

  const exams = toInt(examsR.data);
  const doneExams = toInt(doneExamsR.data);
  const progress = exams > 0 ? Math.min(1, Math.max(0, doneExams / exams)) : 0;

  /**
   * أكشن الخروج:
   * - يسجل خروج الطالب في student_logins إن وجد
   * - يغلق آخر جلسة تطبيق فعالة
   * - يمسح جلسة التطبيق ويوجّه إلى صفحة الدخول
   */
  async function logoutAction() {
    'use server';
    const sid = (await getSession())?.id ?? null;
    try {
      if (sid) {
        try {
          await logStudentLogout({ student_id: Number(sid) });
        } catch {}
        try {
          await finishLastAppSessionForStudent(Number(sid));
        } catch {}
      }
    } finally {
      try { await clearSession(); } catch {}
      redirect(LOGIN_PATH);
    }
  }

  // واجهة شبيهة بالتصميم الأصلي بشكل مبسّط باستخدام Tailwind
  return (
    <div className="min-h-svh bg-slate-50">
      {/* الترويسة */}
      <div className="bg-gradient-to-br from-sky-600 to-sky-500 text-white shadow-md rounded-b-[40px]">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center gap-4">
          <div className="rounded-xl overflow-hidden border border-white/30">
            <Image src={logo} alt="Logo" width={64} height={64} />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-lg">المدرب والاستاذ (أبو تيم)</div>
            <div className="text-white/90 text-sm">لتعليم قيادة المركبات</div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition font-semibold"
              aria-label="خروج"
            >
              خروج
            </button>
          </form>
        </div>
      </div>

      {/* المحتوى */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* بطاقة التقدم */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <div className="font-extrabold text-slate-800 text-center mb-4">معدل الإنجاز العام</div>
          <div className="flex items-center justify-center mb-4">
            <ProgressCircle progress={progress} />
          </div>
          <div className="text-center text-slate-600">
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              <span>
                {doneExams} / {exams} اختبارات
              </span>
            </div>
          </div>
        </div>

        {/* أزرار التنقل */}
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NavCard
            title="الاختبارات"
            subtitle="الفحص النظري"
            href="/students/exams_screen"
            colorClass="text-sky-600"
            badgeClass="bg-sky-50"
            icon="📝"
          />
          <NavCard
            title="الفيديوهات"
            subtitle="قم بالمشاهدة"
            href="/students/sessions_screen"
            colorClass="text-amber-600"
            badgeClass="bg-amber-50"
            icon="🎬"
          />
        </div>

        {/* قسم التواصل الاجتماعي */}
        <div className="mt-9 bg-sky-50 rounded-2xl border border-sky-100 p-5 text-center">
          <div className="font-bold text-sky-700 mb-3">تابعنا على منصات التواصل</div>
          <div className="flex items-center justify-center gap-3">
            <SocialLink href="https://instagram.com" label="Instagram" />
            <SocialLink href="https://tiktok.com" label="TikTok" />
            <SocialLink href="https://facebook.com" label="Facebook" />
            <SocialLink href="https://wa.me/" label="WhatsApp" />
          </div>
          <div className="mt-2 font-semibold text-amber-600">بإشراف المدرب والاستاذ (أبو تيم)</div>
        </div>
      </div>
    </div>
  );
}

/** عرض رسالة خطأ مبسطة */
function errorView(message: string) {
  return (
    <div className="min-h-svh bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
        <h1 className="text-xl font-bold mb-2">حدث خطأ</h1>
        <p className="text-slate-600">{message}</p>
        <div className="mt-4">
          <Link className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700" href={LOGIN_PATH}>
            العودة إلى صفحة الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}

/** عنصر عرض لنسبة التقدم بشكل دائري بسيط */
function ProgressCircle({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100);
  // شريط دائري بسيط باستخدام CSS فقط
  const angle = Math.min(360, Math.max(0, Math.round(progress * 360)));
  const conic = `conic-gradient(#0284c7 ${angle}deg, #e5e7eb 0deg)`;
  return (
    <div className="relative" style={{ width: 120, height: 120 }}>
      <div
        className="rounded-full"
        style={{
          width: 120,
          height: 120,
          backgroundImage: conic,
        }}
        aria-label={`Progress ${pct}%`}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-2xl font-bold text-sky-700">{pct}%</div>
      </div>
    </div>
  );
}

/** بطاقة تنقل مبسطة */
function NavCard({
  title,
  subtitle,
  href,
  colorClass,
  badgeClass,
  icon,
}: {
  title: string;
  subtitle?: string;
  href: string;
  colorClass: string;
  badgeClass: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-4">
        <div className={`flex items-center justify-center w-14 h-14 rounded-full ${badgeClass} text-2xl`}>
          <span aria-hidden>{icon}</span>
        </div>
        <div>
          <div className={`font-semibold ${colorClass}`}>{title}</div>
          {subtitle ? <div className="text-sm text-slate-500">{subtitle}</div> : null}
        </div>
      </div>
    </Link>
  );
}

/** رابط اجتماعي بسيط */
function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="inline-flex items-center px-3 py-2 rounded-full border border-sky-200 text-sky-700 hover:bg-sky-100 text-sm"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}

/** أدوات مساعدة بسيطة */
function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

