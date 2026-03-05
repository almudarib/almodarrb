'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type Dict = Record<string, unknown>;
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: unknown; fieldErrors?: Record<string, string> };

function asPositiveInt(n: unknown): number | null {
  const x = Number(n);
  return Number.isInteger(x) && x > 0 ? x : null;
}
function ensureNonEmpty(s: unknown): string | null {
  const v = String(s ?? '').trim();
  return v.length > 0 ? v : null;
}
function validateNationalId(nid: unknown): string | null {
  const s = String(nid ?? '').trim();
  return /^\d{10,20}$/.test(s) ? s : null;
}
function clampToNonNegativeInt(n: unknown): number {
  const x = Math.floor(Number(n ?? 0));
  return Number.isFinite(x) && x > 0 ? x : 0;
}
function ensureHttps(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:') {
      return url.replace(/^http:\/\//, 'https://');
    }
    return url;
  } catch {
    return url;
  }
}
function isSupabasePublicUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/');
}
function isSupabaseSignedUrl(url: string): boolean {
  return url.includes('/storage/v1/object/sign/') || url.includes('token=');
}
function isValidImageRef(path: string | null | undefined): boolean {
  if (!path || String(path).trim() === '') return false;
  const s = String(path);
  const lower = s.toLowerCase();
  if (lower.startsWith('data:image/')) {
    return lower.includes('png') || lower.includes('jpeg') || lower.includes('jpg') || lower.includes('gif');
  }
  try {
    const u = new URL(s);
    const p = u.pathname.toLowerCase();
    return p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.gif') || p.includes('/exam-images/');
  } catch {
    return lower.startsWith('exam-images/');
  }
}

// ============ الطلاب والأجهزة ============
export async function findStudentByNationalId(nationalId: string): Promise<ServiceResult<Dict | null>> {
  try {
    const ni = validateNationalId(nationalId);
    if (!ni) {
      return { ok: false, error: 'رقم الهوية غير صالح', fieldErrors: { national_id: 'invalid' } };
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('national_id', ni)
      .or('status.eq.active,status.eq.passed')
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict) ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function fetchStudent(studentId: number): Promise<ServiceResult<Dict | null>> {
  try {
    const id = asPositiveInt(studentId);
    if (!id) return { ok: false, error: 'studentId غير صالح', fieldErrors: { student_id: 'invalid' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('students').select('*').eq('id', id).limit(1).maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict) ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function checkDeviceFingerprint(studentId: number, fingerprint: string): Promise<ServiceResult<boolean>> {
  try {
    const id = asPositiveInt(studentId);
    const fp = ensureNonEmpty(fingerprint);
    if (!id || !fp) {
      return { ok: false, error: 'مدخلات غير صالحة', fieldErrors: { student_id: !id ? 'invalid' : undefined, fingerprint: !fp ? 'invalid' : undefined } as Record<string, string> };
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('student_devices')
      .select('id')
      .eq('student_id', id)
      .eq('device_fingerprint', fp)
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: !!data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function registerDeviceFingerprint(studentId: number, fingerprint: string): Promise<ServiceResult<null>> {
  try {
    const id = asPositiveInt(studentId);
    const fp = ensureNonEmpty(fingerprint);
    if (!id || !fp) {
      return { ok: false, error: 'مدخلات غير صالحة', fieldErrors: { student_id: !id ? 'invalid' : undefined, fingerprint: !fp ? 'invalid' : undefined } as Record<string, string> };
    }
    const supabase = createAdminClient();
    const { error } = await supabase.from('student_devices').insert({
      student_id: id,
      device_fingerprint: fp,
      is_active: true,
      last_used_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function touchDeviceFingerprint(studentId: number, fingerprint: string): Promise<ServiceResult<null>> {
  try {
    const id = asPositiveInt(studentId);
    const fp = ensureNonEmpty(fingerprint);
    if (!id || !fp) {
      return { ok: false, error: 'مدخلات غير صالحة', fieldErrors: { student_id: !id ? 'invalid' : undefined, fingerprint: !fp ? 'invalid' : undefined } as Record<string, string> };
    }
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('student_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('student_id', id)
      .eq('device_fingerprint', fp);
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function verifyOrRegisterDevice(studentId: number, fingerprint: string): Promise<ServiceResult<boolean>> {
  try {
    const id = asPositiveInt(studentId);
    const fp = ensureNonEmpty(fingerprint);
    if (!id || !fp) {
      return { ok: false, error: 'مدخلات غير صالحة', fieldErrors: { student_id: !id ? 'invalid' : undefined, fingerprint: !fp ? 'invalid' : undefined } as Record<string, string> };
    }
    const supabase = createAdminClient();
    const { data: rows, error } = await supabase.from('student_devices').select('*').eq('student_id', id);
    if (error) return { ok: false, error: error.message, details: error };
    const devices = (rows ?? []) as Dict[];
    if (devices.length === 0) {
      const { error: insErr } = await supabase.from('student_devices').insert({
        student_id: id,
        device_fingerprint: fp,
        is_active: true,
        last_used_at: new Date().toISOString(),
      });
      if (insErr) return { ok: false, error: insErr.message, details: insErr };
      return { ok: true, data: true };
    }
    const matched = devices.some((d) => String(d['device_fingerprint'] ?? '') === fp && d['is_active'] === true);
    return { ok: true, data: matched };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function lastExamResult(studentId: number): Promise<ServiceResult<Dict | null>> {
  try {
    const id = asPositiveInt(studentId);
    if (!id) return { ok: false, error: 'studentId غير صالح', fieldErrors: { student_id: 'invalid' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exam_results')
      .select('*')
      .eq('student_id', id)
      .order('taken_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict) ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

// ============ الجلسات ============
export async function sessionsByLanguage(language: string): Promise<ServiceResult<Dict[]>> {
  try {
    const lang = ensureNonEmpty(language);
    if (!lang) return { ok: false, error: 'language مطلوب', fieldErrors: { language: 'required' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('language', lang)
      .eq('is_active', true)
      .order('order_number', { ascending: true });
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function listSessions(params: {
  isActive?: boolean;
  kind?: string | null;
  sortBy?: string | null;
  ascending?: boolean;
  page?: number | null;
  perPage?: number | null;
  language?: string | null;
}): Promise<ServiceResult<Dict[]>> {
  try {
    const supabase = createAdminClient();
    let q = supabase.from('sessions').select('*');
    const lang = params?.language ? String(params.language).trim() : '';
    if (lang) q = q.eq('language', lang);
    if (typeof params?.isActive === 'boolean') {
      q = q.eq('is_active', params.isActive);
    }
    const sortBy = params?.sortBy && String(params.sortBy).trim() ? String(params.sortBy).trim() : 'created_at';
    const ordered = q.order(sortBy, { ascending: params?.ascending ?? true });
    const page = asPositiveInt(params?.page ?? undefined);
    const perPage = asPositiveInt(params?.perPage ?? undefined);
    if (page && perPage) {
      const start = (page - 1) * perPage;
      const end = start + perPage - 1;
      const { data, error } = await ordered.range(start, end);
      if (error) return { ok: false, error: error.message, details: error };
      return { ok: true, data: (data as Dict[]) ?? [] };
    }
    const { data, error } = await ordered;
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function fetchUser(userId: number): Promise<ServiceResult<Dict | null>> {
  try {
    const id = asPositiveInt(userId);
    if (!id) return { ok: false, error: 'userId غير صالح', fieldErrors: { user_id: 'invalid' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('users').select('*').eq('id', id).limit(1).maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict) ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function examsByLanguage(language: string): Promise<ServiceResult<Dict[]>> {
  try {
    const lang = ensureNonEmpty(language);
    if (!lang) return { ok: false, error: 'language مطلوب', fieldErrors: { language: 'required' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('language', lang)
      .eq('is_active', true)
      .order('id', { ascending: true });
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function countExams(language: string): Promise<ServiceResult<number>> {
  try {
    const res = await examsByLanguage(language);
    if (!res.ok) return res as unknown as ServiceResult<number>;
    return { ok: true, data: res.data.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function countSessions(language: string): Promise<ServiceResult<number>> {
  try {
    const s = await sessionsByLanguage(language);
    if (s.ok && s.data.length > 0) return { ok: true, data: s.data.length };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict[]).length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function countStudentCompletedExams(studentId: number, language: string): Promise<ServiceResult<number>> {
  try {
    const id = asPositiveInt(studentId);
    if (!id) return { ok: false, error: 'studentId غير صالح', fieldErrors: { student_id: 'invalid' } };
    const ex = await examsByLanguage(language);
    if (!ex.ok) return ex as unknown as ServiceResult<number>;
    const ids = ex.data.map((e) => (e['id'] as number)).filter((v) => Number.isInteger(v));
    if (ids.length === 0) return { ok: true, data: 0 };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exam_results')
      .select('exam_id')
      .eq('student_id', id)
      .in('exam_id', ids);
    if (error) return { ok: false, error: error.message, details: error };
    const rows = (data as Dict[]) ?? [];
    const uniq = new Set(rows.map((r) => r['exam_id'] as number));
    return { ok: true, data: uniq.size };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function countStudentExamAttempts(studentId: number, language: string): Promise<ServiceResult<number>> {
  try {
    const id = asPositiveInt(studentId);
    if (!id) return { ok: false, error: 'studentId غير صالح', fieldErrors: { student_id: 'invalid' } };
    const ex = await examsByLanguage(language);
    if (!ex.ok) return ex as unknown as ServiceResult<number>;
    const ids = ex.data.map((e) => (e['id'] as number)).filter((v) => Number.isInteger(v));
    if (ids.length === 0) return { ok: true, data: 0 };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exam_results')
      .select('id')
      .eq('student_id', id)
      .in('exam_id', ids);
    if (error) return { ok: false, error: error.message, details: error };
    const rows = (data as Dict[]) ?? [];
    return { ok: true, data: rows.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}
export async function countWatchedSessionsForStudent(studentId: number, language: string): Promise<ServiceResult<number>> {
  try {
    const id = asPositiveInt(studentId);
    if (!id) return { ok: false, error: 'studentId غير صالح', fieldErrors: { student_id: 'invalid' } };
    let sessions: Dict[] = [];
    const s = await sessionsByLanguage(language);
    if (s.ok && s.data.length > 0) sessions = s.data;
    if (sessions.length === 0) {
      const supabase = createAdminClient();
      const { data } = await supabase.from('sessions').select('*').eq('is_active', true).order('created_at', { ascending: true });
      sessions = (data as Dict[]) ?? [];
    }
    if (sessions.length === 0) return { ok: true, data: 0 };
    const ids = sessions.map((s) => s['id'] as number).filter((v) => Number.isInteger(v));
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('student_sessions')
      .select('session_id,duration_minutes')
      .eq('student_id', id)
      .in('session_id', ids)
      .gt('duration_minutes', 0);
    if (error) return { ok: false, error: error.message, details: error };
    const uniq = new Set(((data as Dict[]) ?? []).map((r) => r['session_id'] as number));
    return { ok: true, data: uniq.size };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function ensureAppSessionId(language: string): Promise<ServiceResult<number>> {
  try {
    const lang = ensureNonEmpty(language) ?? 'AR';
    const supabase = createAdminClient();
    const { data: existing, error: selErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('title', 'APP_SESSION')
      .eq('language', lang)
      .limit(1)
      .maybeSingle();
    if (selErr) return { ok: false, error: selErr.message, details: selErr };
    if (existing && typeof (existing as Dict)['id'] === 'number') {
      return { ok: true, data: (existing as Dict)['id'] as number };
    }
    const { data: created, error: insErr } = await supabase
      .from('sessions')
      .insert({
        title: 'APP_SESSION',
        video_url: 'app://session',
        language: lang,
        order_number: 0,
        is_active: true,
      })
      .select('id')
      .maybeSingle();
    if (insErr) return { ok: false, error: insErr.message, details: insErr };
    const cid = (created as Dict | null)?.['id'] as number | undefined;
    if (cid) return { ok: true, data: cid };
    const { data: fetched } = await supabase
      .from('sessions')
      .select('id')
      .eq('title', 'APP_SESSION')
      .eq('language', lang)
      .limit(1)
      .maybeSingle();
    const fid = (fetched as Dict | null)?.['id'] as number | undefined;
    if (fid) return { ok: true, data: fid };
    return { ok: false, error: 'تعذر إنشاء جلسة التطبيق' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function startStudentSession(studentId: number, sessionId: number): Promise<ServiceResult<number | null>> {
  try {
    const sid = asPositiveInt(sessionId);
    const stid = asPositiveInt(studentId);
    if (!sid || !stid) return { ok: false, error: 'معرّفات غير صالحة', fieldErrors: { session_id: !sid ? 'invalid' : undefined, student_id: !stid ? 'invalid' : undefined } as Record<string, string> };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('student_sessions')
      .insert({
        student_id: stid,
        session_id: sid,
        opened_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: ((data as Dict | null)?.['id'] as number | undefined) ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function finishStudentSession(logId: number, durationMinutes: number): Promise<ServiceResult<null>> {
  try {
    const lid = asPositiveInt(logId);
    const dur = clampToNonNegativeInt(durationMinutes);
    if (!lid) return { ok: false, error: 'logId غير صالح', fieldErrors: { id: 'invalid' } };
    const supabase = createAdminClient();
    const { error } = await supabase.from('student_sessions').update({ duration_minutes: dur }).eq('id', lid);
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function finishLastAppSessionForStudent(studentId: number): Promise<ServiceResult<null>> {
  try {
    const stid = asPositiveInt(studentId);
    if (!stid) return { ok: false, error: 'studentId غير صالح', fieldErrors: { student_id: 'invalid' } };
    const stu = await fetchStudent(stid);
    const language = stu.ok ? ((stu.data?.['language'] as string | undefined) ?? 'AR') : 'AR';
    const sidRes = await ensureAppSessionId(language);
    if (!sidRes.ok) return sidRes as unknown as ServiceResult<null>;
    const sessionId = sidRes.data;
    const supabase = createAdminClient();
    const { data: latest, error } = await supabase
      .from('student_sessions')
      .select('*')
      .eq('student_id', stid)
      .eq('session_id', sessionId)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    if (latest && typeof (latest as Dict)['id'] === 'number') {
      const id = (latest as Dict)['id'] as number;
      const openedAtStr = (latest as Dict)['opened_at'] as string | undefined;
      let minutes = 0;
      if (openedAtStr) {
        try {
          const opened = new Date(openedAtStr);
          minutes = Math.max(0, Math.floor((Date.now() - opened.getTime()) / (60 * 1000)));
        } catch {
          minutes = 0;
        }
      }
      const fin = await finishStudentSession(id, minutes);
      if (!fin.ok) return fin as unknown as ServiceResult<null>;
    }
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function logStudentSession(studentId: number, sessionId: number, durationMinutes: number): Promise<ServiceResult<null>> {
  try {
    const stid = asPositiveInt(studentId);
    const sid = asPositiveInt(sessionId);
    const dur = clampToNonNegativeInt(durationMinutes);
    if (!stid || !sid) {
      return { ok: false, error: 'مدخلات غير صالحة', fieldErrors: { student_id: !stid ? 'invalid' : undefined, session_id: !sid ? 'invalid' : undefined } as Record<string, string> };
    }
    const supabase = createAdminClient();
    const { error } = await supabase.from('student_sessions').insert({
      student_id: stid,
      session_id: sid,
      duration_minutes: dur,
    });
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

// ============ الامتحانات والمجموعات ============
export async function availableExamForStudent(language: string): Promise<ServiceResult<Dict | null>> {
  try {
    const lang = ensureNonEmpty(language);
    if (!lang) return { ok: false, error: 'language مطلوب', fieldErrors: { language: 'required' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('language', lang)
      .eq('is_active', true)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict) ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function examGroupsByLanguage(language: string): Promise<ServiceResult<Dict[]>> {
  try {
    const lang = ensureNonEmpty(language);
    if (!lang) return { ok: false, error: 'language مطلوب', fieldErrors: { language: 'required' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exam_groups')
      .select('*')
      .eq('language', lang)
      .eq('is_active', true)
      .order('id', { ascending: true });
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function getExamGroup(groupId: number): Promise<ServiceResult<Dict | null>> {
  try {
    const id = asPositiveInt(groupId);
    if (!id) return { ok: false, error: 'groupId غير صالح', fieldErrors: { group_id: 'invalid' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('exam_groups').select('*').eq('id', id).limit(1).maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict) ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function examsByGroup(groupId: number): Promise<ServiceResult<Dict[]>> {
  try {
    const id = asPositiveInt(groupId);
    if (!id) return { ok: false, error: 'groupId غير صالح', fieldErrors: { group_id: 'invalid' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('group_id', id)
      .eq('is_active', true)
      .order('id', { ascending: true });
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function examQuestions(examId: number): Promise<ServiceResult<Dict[]>> {
  try {
    const id = asPositiveInt(examId);
    if (!id) return { ok: false, error: 'examId غير صالح', fieldErrors: { exam_id: 'invalid' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('exam_questions').select('*').eq('exam_id', id).order('id', { ascending: true });
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict[]) ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function getExam(examId: number): Promise<ServiceResult<Dict | null>> {
  try {
    const id = asPositiveInt(examId);
    if (!id) return { ok: false, error: 'examId غير صالح', fieldErrors: { exam_id: 'invalid' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('exams').select('*').eq('id', id).limit(1).maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    return { ok: true, data: (data as Dict) ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

// ============ صور أسئلة الامتحان (Storage) ============
export async function examImageUrl(path: string | null | undefined): Promise<ServiceResult<string | null>> {
  try {
    if (!path || String(path).trim() === '') return { ok: true, data: null };
    let p = String(path);
    if (p.startsWith('http')) {
      if (isSupabasePublicUrl(p) || isSupabaseSignedUrl(p)) {
        return { ok: true, data: ensureHttps(p) };
      }
      const marker = '/exam-images/';
      const idx = p.indexOf(marker);
      if (idx !== -1) {
        p = p.substring(idx + marker.length);
      } else {
        return { ok: true, data: ensureHttps(p) };
      }
    }
    p = p.replace(/^\/+/, '');
    if (p.startsWith('exam-images/')) p = p.substring('exam-images/'.length);
    const supabase = createAdminClient();
    // Prefer signed URL; fall back to public URL
    const { data, error } = await supabase.storage.from('exam-images').createSignedUrl(p, 3600);
    if (!error && data?.signedUrl) return { ok: true, data: data.signedUrl };
    const { data: pub } = await supabase.storage.from('exam-images').getPublicUrl(p);
    return { ok: true, data: pub.publicUrl ?? null };
  } catch {
    try {
      const p = String(path ?? '').replace(/^\/+/, '').replace(/^exam-images\//, '');
      const supabase = createAdminClient();
      const { data: pub } = await supabase.storage.from('exam-images').getPublicUrl(p);
      return { ok: true, data: pub.publicUrl ?? null };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
    }
  }
}

export async function examImageUrlTransformed(path: string | null | undefined, opts?: { width?: number; height?: number; quality?: number }): Promise<ServiceResult<string | null>> {
  try {
    if (!path || String(path).trim() === '') return { ok: true, data: null };
    let p = String(path);
    if (p.startsWith('http')) {
      if (isSupabasePublicUrl(p) || isSupabaseSignedUrl(p)) {
        return { ok: true, data: ensureHttps(p) };
      }
      const marker = '/exam-images/';
      const idx = p.indexOf(marker);
      if (idx !== -1) {
        p = p.substring(idx + marker.length);
      } else {
        return { ok: true, data: ensureHttps(p) };
      }
    }
    p = p.replace(/^\/+/, '');
    if (p.startsWith('exam-images/')) p = p.substring('exam-images/'.length);
    const supabase = createAdminClient();
    const transform = {
      width: opts?.width,
      height: opts?.height,
      quality: opts?.quality ?? 70,
    };
    const { data, error } = await supabase.storage.from('exam-images').createSignedUrl(p, 3600, { transform });
    if (!error && data?.signedUrl) return { ok: true, data: data.signedUrl };
    const { data: pub } = await supabase.storage.from('exam-images').getPublicUrl(p, { transform });
    return { ok: true, data: pub.publicUrl ?? null };
  } catch {
    try {
      const p = String(path ?? '').replace(/^\/+/, '').replace(/^exam-images\//, '');
      const supabase = createAdminClient();
      const transform = {
        width: opts?.width,
        height: opts?.height,
        quality: opts?.quality ?? 70,
      };
      const { data: pub } = await supabase.storage.from('exam-images').getPublicUrl(p, { transform });
      return { ok: true, data: pub.publicUrl ?? null };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
    }
  }
}

export async function fetchQuestionImageUrlById(questionId: number): Promise<ServiceResult<string | null>> {
  try {
    const id = asPositiveInt(questionId);
    if (!id) return { ok: false, error: 'questionId غير صالح', fieldErrors: { question_id: 'invalid' } };
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('exam_questions').select('image_url').eq('id', id).limit(1).maybeSingle();
    if (error) return { ok: false, error: error.message, details: error };
    const url = (data as Dict | null)?.['image_url'] as string | null | undefined;
    return { ok: true, data: url ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function resolveQuestionImage(questionId: number, imageUrl: string | null | undefined): Promise<ServiceResult<string | null>> {
  try {
    let ref = imageUrl ?? null;
    if (!isValidImageRef(ref)) {
      const fetched = await fetchQuestionImageUrlById(questionId);
      if (!fetched.ok) return fetched as unknown as ServiceResult<string | null>;
      ref = fetched.data;
      if (!isValidImageRef(ref)) return { ok: true, data: null };
    }
    if ((ref ?? '').startsWith('data:image/')) {
      return { ok: true, data: ref };
    }
    if ((ref ?? '').startsWith('http')) {
      if (isSupabasePublicUrl(ref!) || isSupabaseSignedUrl(ref!)) {
        return { ok: true, data: ensureHttps(ref!) };
      }
      return { ok: true, data: ensureHttps(ref!) };
    }
    return await examImageUrl(ref);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function resolveQuestionImageTransformed(
  questionId: number,
  imageUrl: string | null | undefined,
  opts?: { width?: number; height?: number; quality?: number },
): Promise<ServiceResult<string | null>> {
  try {
    let ref = imageUrl ?? null;
    if (!isValidImageRef(ref)) {
      const fetched = await fetchQuestionImageUrlById(questionId);
      if (!fetched.ok) return fetched as unknown as ServiceResult<string | null>;
      ref = fetched.data;
      if (!isValidImageRef(ref)) return { ok: true, data: null };
    }
    if ((ref ?? '').startsWith('data:image/')) {
      return { ok: true, data: ref };
    }
    if ((ref ?? '').startsWith('http')) {
      if (isSupabasePublicUrl(ref!) || isSupabaseSignedUrl(ref!)) {
        return { ok: true, data: ensureHttps(ref!) };
      }
      return { ok: true, data: ensureHttps(ref!) };
    }
    return await examImageUrlTransformed(ref, opts);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}

export async function submitExamResult(studentId: number, examId: number, score: number, durationMinutes: number): Promise<ServiceResult<null>> {
  try {
    const stid = asPositiveInt(studentId);
    const exid = asPositiveInt(examId);
    const s = Math.max(0, Math.min(100, Math.round(Number(score))));
    const dur = clampToNonNegativeInt(durationMinutes);
    if (!stid || !exid) {
      return { ok: false, error: 'مدخلات غير صالحة', fieldErrors: { student_id: !stid ? 'invalid' : undefined, exam_id: !exid ? 'invalid' : undefined } as Record<string, string> };
    }
    const supabase = createAdminClient();
    const { error } = await supabase.from('exam_results').insert({
      student_id: stid,
      exam_id: exid,
      score: s,
      duration_minutes: dur,
    });
    if (error) return { ok: false, error: error.message, details: error };
    try {
      revalidatePath('/students/dash');
    } catch {}
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', details: e };
  }
}
