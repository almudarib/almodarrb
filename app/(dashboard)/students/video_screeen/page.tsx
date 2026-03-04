import Link from 'next/link';
import { getVideoInfo } from '@/actions/video';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

/**
 * شاشة مشغل الفيديو (SSR)
 * - تقرأ videoUrl و title من searchParams
 * - تدعم روابط YouTube عبر iframe، وروابط ملفات الفيديو عبر عنصر video
 */
export default async function VideoScreeenPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams ?? {};
  const videoUrl = normalizeParam(sp.videoUrl);
  const title = normalizeParam(sp.title) || 'مشغل الفيديو';
  if (!videoUrl) {
    return viewMessage('رابط الفيديو غير متوفر', {
      actionHref: '/student/sessions_screen',
      actionText: 'العودة إلى قائمة الدروس',
    });
  }

  const yt = asYouTubeEmbed(videoUrl);
  if (yt) {
    return (
      <Box dir="rtl" sx={{ minHeight: '100svh', bgcolor: 'rgb(248 250 252)' }}>
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <Button component={Link} href="/student/sessions_screen" variant="outlined" startIcon={<ArrowBackIosNewIcon />}>
              رجوع
            </Button>
            <Typography fontWeight={700}>{title}</Typography>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'black' }}>
            <Box sx={{ width: '100%', aspectRatio: '16 / 9' }}>
              <iframe
                src={yt}
                title={title}
                style={{ width: '100%', height: '100%' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  // التحقق من الرابط قبل عرضه عبر عنصر الفيديو
  const info = await getVideoInfo({ videoUrl, title });
  if (!info.ok) {
    return viewMessage(info.error.message || 'تعذر التحقق من رابط الفيديو', {
      actionHref: '/student/sessions_screen',
      actionText: 'العودة إلى قائمة الدروس',
    });
  }

  return (
    <Box dir="rtl" sx={{ minHeight: '100svh', bgcolor: 'rgb(248 250 252)' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Button component={Link} href="/student/sessions_screen" variant="outlined" startIcon={<ArrowBackIosNewIcon />}>
            رجوع
          </Button>
          <Typography fontWeight={700}>{title}</Typography>
        </Box>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'black' }}>
          <Box>
            <video
              src={info.data.url}
              controls
              style={{ width: '100%', height: 'auto', maxHeight: '80vh' }}
            />
          </Box>
        </Paper>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            href={info.data.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            startIcon={<OpenInNewIcon />}
          >
            فتح في تبويب جديد
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

function viewMessage(message: string, opts?: { actionHref?: string; actionText?: string }) {
  return (
    <Box dir="rtl" sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: 'rgb(248 250 252)' }}>
      <Container maxWidth="sm">
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography fontWeight={700} sx={{ mb: 1.5 }}>
            تنبيه
          </Typography>
          <Typography color="text.secondary">{message}</Typography>
          {opts?.actionHref && opts?.actionText ? (
            <Box sx={{ mt: 2 }}>
              <Button component={Link} href={opts.actionHref} variant="contained" color="primary">
                {opts.actionText}
              </Button>
            </Box>
          ) : null}
        </Paper>
      </Container>
    </Box>
  );
}

function normalizeParam(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const raw = Array.isArray(v) ? v[0] : v;
  const s = String(raw ?? '').trim();
  return s.length > 0 ? s : null;
}

function asYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}`;
      // أنماط أخرى مثل /embed/ID
      if (u.pathname.startsWith('/embed/')) return url;
    }
    return null;
  } catch {
    return null;
  }
}

