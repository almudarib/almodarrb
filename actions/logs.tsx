'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * دوال تسجيل دخول/خروج الطلاب عبر App Router (Next.js 14+)
 * - تستخدم عميل Supabase بصلاحية إدارية على الخادم
 * - تتحقق من صحة المُدخلات وتعيد نتائج مهيكلة
 * - تُستخدم على الخادم فقط وتستفيد من التجزئة التلقائية في Next.js
 */

export type LogStudentLoginInput = {
  student_id: number;
  ip?: string | null;
  dryRun?: boolean;
};

export type LogStudentLoginResult =
  | { ok: true; id: number }
  | { ok: false; error: string; details?: unknown; fieldErrors?: Record<string, string> };

export type LogStudentLogoutInput = {
  student_id: number;
  dryRun?: boolean;
};

export type LogStudentLogoutResult =
  | { ok: true }
  | { ok: false; error: string; details?: unknown; fieldErrors?: Record<string, string> };

export type HasOpenLoginResult =
  | { ok: true; open: boolean }
  | { ok: false; error: string; details?: unknown; fieldErrors?: Record<string, string> };

/**
 * يسجل دخول الطالب بإنشاء سجل في جدول student_logins
 * المعاملات:
 * - student_id: معرّف الطالب (مطلوب، عدد صحيح موجب)
 * - ip: عنوان الـ IP (اختياري، IPv4/IPv6)
 * - dryRun: إن كانت true لا يتم الإدراج ويُعاد id افتراضي
 * القيم المرجعة:
 * - ok=true مع id للسجل المُدرج أو ok=false عند الخطأ
 */
export async function logStudentLogin(input: LogStudentLoginInput): Promise<LogStudentLoginResult> {
  try {
    const fieldErrors: Record<string, string> = {};
    const studentId = Number(input?.student_id);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      fieldErrors.student_id = 'student_id غير صالح';
    }
    const ip = normalizeIp(input?.ip ?? undefined);
    if (input?.ip !== undefined && ip === null) {
      fieldErrors.ip = 'عنوان IP غير صالح';
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, error: 'المدخلات غير صالحة', fieldErrors };
    }
    if (input?.dryRun) {
      return { ok: true, id: -1 };
    }

    const supabase = createAdminClient();
    const payload: Record<string, unknown> = {
      student_id: studentId,
      logged_in_at: new Date().toISOString(),
    };
    if (ip) payload.ip_address = ip;

    const { data, error } = await supabase
      .from('student_logins')
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const id = (data as { id?: number } | null)?.id;
    if (!id || !Number.isInteger(id)) {
      return { ok: false, error: 'فشل الحصول على المعرّف بعد الإدراج' };
    }
    return { ok: true, id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

/**
 * يسجل خروج الطالب بتحديث آخر سجل دخول غير مغلق (logged_out_at IS NULL)
 * المعاملات:
 * - student_id: معرّف الطالب (مطلوب، عدد صحيح موجب)
 * - dryRun: إن كانت true لا يتم التحديث ويُعاد نجاح صوري
 * القيم المرجعة:
 * - ok=true عند نجاح التحديث، ok=false عند عدم العثور أو حدوث خطأ
 */
export async function logStudentLogout(
  input: LogStudentLogoutInput,
): Promise<LogStudentLogoutResult> {
  try {
    const fieldErrors: Record<string, string> = {};
    const studentId = Number(input?.student_id);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      fieldErrors.student_id = 'student_id غير صالح';
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, error: 'المدخلات غير صالحة', fieldErrors };
    }
    if (input?.dryRun) {
      return { ok: true };
    }

    const supabase = createAdminClient();
    const { data: lastOpen, error: selErr } = await supabase
      .from('student_logins')
      .select('id, logged_out_at')
      .eq('student_id', studentId)
      .is('logged_out_at', null)
      .order('logged_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (selErr) {
      return { ok: false, error: selErr.message, details: selErr };
    }
    const id = (lastOpen as { id?: number } | null)?.id ?? null;
    if (!id) {
      return { ok: false, error: 'لا يوجد سجل دخول مفتوح لهذا الطالب' };
    }
    const { error: updErr } = await supabase
      .from('student_logins')
      .update({ logged_out_at: new Date().toISOString() })
      .eq('id', id);
    if (updErr) {
      return { ok: false, error: updErr.message, details: updErr };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

/**
 * يتحقق ما إذا كان لدى الطالب جلسة دخول مفتوحة (بدون logged_out_at)
 * المعاملات:
 * - studentId: معرّف الطالب
 * القيم المرجعة:
 * - ok=true مع open=true/false، أو ok=false عند الخطأ
 */
export async function hasOpenLogin(studentId: number): Promise<HasOpenLoginResult> {
  try {
    const fieldErrors: Record<string, string> = {};
    const id = Number(studentId);
    if (!Number.isInteger(id) || id <= 0) {
      fieldErrors.studentId = 'studentId غير صالح';
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, error: 'المدخلات غير صالحة', fieldErrors };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('student_logins')
      .select('id')
      .eq('student_id', id)
      .is('logged_out_at', null)
      .order('logged_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      return { ok: false, error: error.message, details: error };
    }
    const hasId = !!(data && (data as { id?: number }).id);
    return { ok: true, open: hasId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير معروف',
      details: error,
    };
  }
}

/**
 * يتحقق من صحة عنوان IP (IPv4 أو IPv6)، ويُعيد قيمة منسّقة
 * يعيد null عند عدم صحة القيمة/عدم وجودها
 */
function normalizeIp(ip?: string): string | null {
  const v = (ip ?? '').trim();
  if (!v) return null;
  // IPv4: 0.0.0.0 — 255.255.255.255
  const ipv4 =
    /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  // IPv6 (مختصر/طويل غير مدعوم بالكامل هنا، يُغطّي الشكل الكامل الأساسي)
  const ipv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv4.test(v) || ipv6.test(v)) return v;
  return null;
}

