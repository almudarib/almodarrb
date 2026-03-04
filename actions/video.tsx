'use server';

/**
 * ملف إجراءات خادم (Server Actions) خاص بتشغيل فيديوهات الطلاب.
 * - يقدّم دوال للتحقق من رابط الفيديو قبل العرض في الواجهة.
 * - تنفيذ أفضل الممارسات: التحقق من صحة البيانات، مهلة للشبكة، ومعالجة أخطاء واضحة.
 *
 * ملاحظات:
 * - هذه الدوال تُستدعى من مكونات App Router (Next.js 14+).
 * - استخدمها ضمن مكوّنات خادمية (Server Components) أو عبر نماذج الإجراءات.
 */

// الأنواع العامة لنتائج الإجراءات
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export type ActionError = {
  code:
    | 'INVALID_INPUT'
    | 'UNSUPPORTED_PROTOCOL'
    | 'UNREACHABLE'
    | 'NOT_VIDEO'
    | 'INTERNAL';
  message: string;
  details?: unknown;
};

// معلومات الفيديو بعد التحقق
export type VideoInfo = {
  url: string;
  title: string;
  contentType?: string;
  contentLength?: number;
  acceptRanges?: string | null;
};

// إدخال دالة الحصول على معلومات الفيديو
export type GetVideoInfoInput = {
  videoUrl: string;
  title?: string;
};

// إدخال دالة تسجيل المشاكل
export type ReportVideoIssueInput = {
  videoUrl: string;
  reason: 'playback_error' | 'format_not_supported' | 'network_error' | 'other';
  message?: string;
};

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const DEFAULT_TITLE = 'مشغل الفيديو';

/**
 * يتحقق من أن النص يمثل رابط HTTP(S) صالحاً ويعيد كائن URL أو null.
 */
function parseAndValidateHttpUrl(input: string): URL | null {
  try {
    const trimmed = input?.trim();
    if (!trimmed) return null;
    const u = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(u.protocol)) return null;
    return u;
  } catch {
    return null;
  }
}

/**
 * ينظّف العنوان ويضمن طولاً وحدوداً آمنة للعرض.
 */
function sanitizeTitle(title?: string): string {
  if (!title) return DEFAULT_TITLE;
  const cleaned = title.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return DEFAULT_TITLE;
  return cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
}

/**
 * يرسل طلب HEAD مع مهلة، وإن فشل يحاول طلب GET بنطاق صغير لتفادي تحميل كامل الملف.
 */
async function probeResource(
  url: string,
  timeoutMs = 7000
): Promise<Response> {
  // محاولة HEAD أولاً
  try {
    const res = await fetchWithTimeout(url, { method: 'HEAD' }, timeoutMs);
    if (res.ok) return res;
  } catch {
    // تجاهل وسنحاول GET
  }
  // بديل خفيف باستخدام GET مع Range
  const res2 = await fetchWithTimeout(
    url,
    { method: 'GET', headers: { Range: 'bytes=0-0' } },
    timeoutMs
  );
  return res2;
}

/**
 * غلاف fetch مع إلغاء عند انتهاء المهلة.
 */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort('timeout'), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * يحدد إذا كان نوع المحتوى مرجّحاً أن يكون فيديو.
 * في حال عدم توفر نوع المحتوى، لا نفشل مباشرةً لأن بعض الخوادم لا تعيد العنوان.
 */
function isProbablyVideo(contentType: string | null): boolean {
  if (!contentType) return true; // السماح في حالة عدم توفر العنوان
  const ct = contentType.toLowerCase().split(';')[0].trim();
  return ct.startsWith('video/') || ct === 'application/octet-stream';
}

/**
 * دالة خادم: تتحقق من صحة رابط الفيديو وتسترجع بعض التعريفات الأساسية قبل العرض.
 * استخدم هذه الدالة داخل مكوّن خادمي لجلب بيانات الفيديو (SSR) أو ضمن نموذج إجراء.
 */
export async function getVideoInfo(
  input: GetVideoInfoInput
): Promise<ActionResult<VideoInfo>> {
  try {
    // التحقق الأولي للمدخلات
    const urlRaw = input?.videoUrl;
    if (!urlRaw || typeof urlRaw !== 'string') {
      return {
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'رابط الفيديو مفقود أو غير صالح.',
        },
      };
    }

    // التحقق من البروتوكول والصياغة
    const parsed = parseAndValidateHttpUrl(urlRaw);
    if (!parsed) {
      return {
        ok: false,
        error: {
          code: 'UNSUPPORTED_PROTOCOL',
          message:
            'الرابط يجب أن يكون بصيغة HTTP/HTTPS وبهيئة عنوان URL صحيح.',
        },
      };
    }

    // فحص المورد عن بُعد للتحقق من إمكانية الوصول وطبيعة المحتوى
    let res: Response;
    try {
      res = await probeResource(parsed.toString());
    } catch (e) {
      return {
        ok: false,
        error: {
          code: 'UNREACHABLE',
          message: 'تعذر الوصول إلى المورد. تحقق من الرابط أو الشبكة.',
          details: e instanceof Error ? e.message : String(e),
        },
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: {
          code: 'UNREACHABLE',
          message: `تعذر الوصول إلى المورد (الحالة ${res.status}).`,
        },
      };
    }

    // التحقق من نوع المحتوى إن وجد
    const contentType = res.headers.get('content-type');
    if (!isProbablyVideo(contentType)) {
      return {
        ok: false,
        error: {
          code: 'NOT_VIDEO',
          message:
            'المورد الذي تم الوصول إليه لا يبدو كملف فيديو مدعوم للمتصفحات.',
          details: { contentType },
        },
      };
    }

    const len = res.headers.get('content-length');
    const contentLength =
      len && Number.isFinite(Number(len)) ? Number(len) : undefined;
    const acceptRanges = res.headers.get('accept-ranges');

    const info: VideoInfo = {
      url: parsed.toString(),
      title: sanitizeTitle(input?.title),
      contentType: contentType ?? undefined,
      contentLength,
      acceptRanges,
    };
    return { ok: true, data: info };
  } catch (e) {
    console.error('getVideoInfo error:', e);
    return {
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'حدث خطأ غير متوقع أثناء معالجة الطلب.',
        details: e instanceof Error ? e.message : String(e),
      },
    };
  }
}

/**
 * دالة خادم: تسجيل مشكلة تشغيل قادمة من الواجهة لغايات التشخيص.
 * يمكن لاحقاً وصلها بقاعدة بيانات أو خدمة مراقبة.
 */
export async function reportVideoIssue(
  input: ReportVideoIssueInput
): Promise<ActionResult<{ logged: true }>> {
  try {
    // تحقق أساسي من المدخلات
    const parsedUrl = parseAndValidateHttpUrl(input?.videoUrl ?? '');
    if (!parsedUrl) {
      return {
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'رابط الفيديو غير صالح.',
        },
      };
    }
    const allowedReasons = new Set([
      'playback_error',
      'format_not_supported',
      'network_error',
      'other',
    ]);
    if (!allowedReasons.has(input?.reason)) {
      return {
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'سبب المشكلة غير مدعوم.',
        },
      };
    }

    // حالياً: نطبع في السجل فقط. يمكن الاستبدال بكتابة لقاعدة بيانات.
    console.warn('[video:issue]', {
      videoUrl: parsedUrl.toString(),
      reason: input.reason,
      message: input?.message ?? '',
      at: new Date().toISOString(),
    });

    return { ok: true, data: { logged: true } };
  } catch (e) {
    console.error('reportVideoIssue error:', e);
    return {
      ok: false,
      error: {
        code: 'INTERNAL',
        message: 'تعذر تسجيل المشكلة بسبب خطأ داخلي.',
        details: e instanceof Error ? e.message : String(e),
      },
    };
  }
}
