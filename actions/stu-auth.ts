'use server';

import {
  findStudentByNationalId,
  verifyOrRegisterDevice,
  touchDeviceFingerprint,
  fetchStudent,
  ensureAppSessionId,
  startStudentSession,
  type Dict,
} from '@/actions/service';
import { logStudentLogin } from '@/actions/logs';
import { setSession } from '@/lib/session';

export type StudentLoginRecord = {
  id: number;
};

export async function loginStudentByNationalId(input: {
  national_id: string;
  device_fingerprint: string;
}): Promise<
  | { ok: true; student: StudentLoginRecord }
  | { ok: false; error: string }
> {
  try {
    const nationalId = String(input?.national_id ?? '').trim();
    const fingerprint = String(input?.device_fingerprint ?? '').trim();

    if (!/^\d{10,20}$/.test(nationalId)) {
      return { ok: false, error: 'يرجى إدخال رقم هوية صالح (10-20 رقمًا)' };
    }
    if (!fingerprint) {
      return { ok: false, error: 'تعذر تحديد بصمة الجهاز' };
    }

    const lookup = await findStudentByNationalId(nationalId);
    if (!lookup.ok) return { ok: false, error: lookup.error };
    const student = (lookup.data as Dict | null) ?? null;
    if (!student || typeof student['id'] !== 'number') {
      return { ok: false, error: 'الطالب غير موجود أو غير فعّال' };
    }
    const studentId = student['id'] as number;

    const verify = await verifyOrRegisterDevice(studentId, fingerprint);
    if (!verify.ok) return { ok: false, error: verify.error };
    if (!verify.data) {
      return { ok: false, error: 'هذا الجهاز غير معتمد لهذا الطالب' };
    }

    try {
      await logStudentLogin({ student_id: studentId });
    } catch {}
    try {
      await touchDeviceFingerprint(studentId, fingerprint);
    } catch {}

    let lang = 'AR';
    let name: string | undefined = undefined;
    try {
      const fs = await fetchStudent(studentId);
      if (fs.ok) {
        const d = fs.data as Dict | null;
        const l = (d?.['language'] as string | undefined) ?? 'AR';
        lang = l;
        const nm = (d?.['name'] as string | undefined) ?? (d?.['full_name'] as string | undefined);
        if (nm && String(nm).trim()) name = String(nm).trim();
      }
    } catch {}
    try {
      const sidRes = await ensureAppSessionId(lang);
      if (sidRes.ok) {
        await startStudentSession(studentId, sidRes.data);
      }
    } catch {}

    try {
      await setSession({ id: studentId, name, role: 'student' });
    } catch {}

    return { ok: true, student: { id: studentId } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
    return { ok: false, error: msg };
  }
}
