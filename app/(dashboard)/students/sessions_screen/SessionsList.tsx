import { cookies } from 'next/headers';
import { fetchStudent, listSessions, type Dict } from '@/actions/service';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  Stack,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import MovieCreationOutlinedIcon from '@mui/icons-material/MovieCreationOutlined';
import { LinkButton } from './LinkButton';

export default async function SessionsList() {
  const cookieStore = await cookies();
  const sidCookie = cookieStore.get('student_id');
  const studentId = parsePositiveInt(sidCookie?.value ?? '');

  let language: string | null = null;
  if (studentId) {
    const stuRes = await fetchStudent(studentId);
    if (stuRes.ok) {
      const stu = (stuRes.data as Dict) ?? {};
      const lang = String(stu['language'] ?? '').trim();
      language = lang || null;
    }
  }

  const byLang = await listSessions({
    isActive: true,
    sortBy: 'created_at',
    ascending: false,
    page: 1,
    perPage: 200,
    language,
  });
  if (!byLang.ok) {
    return viewMessage(byLang.error, { actionHref: '/student/dash', actionText: 'العودة للوحة' });
  }
  let rows = (byLang.data as Dict[]) ?? [];
  if (rows.length === 0) {
    const all = await listSessions({
      isActive: true,
      sortBy: 'created_at',
      ascending: false,
      page: 1,
      perPage: 200,
    });
    if (!all.ok) {
      return viewMessage(all.error, { actionHref: '/student/dash', actionText: 'العودة للوحة' });
    }
    rows = (all.data as Dict[]) ?? [];
  }
  const list = rows
    .map((r, idx) => ({
      id: toInt(r['id']),
      title: String(r['title'] ?? 'درس'),
      language: String(r['language'] ?? ''),
      order_number: toInt(r['order_number']) || idx + 1,
      video_url: String(r['video_url'] ?? ''),
    }))
    .filter((s) => s.id > 0 && s.video_url);

  if (list.length === 0) {
    return <EmptyState />;
  }

  return (
    <Stack spacing={1.5}>
      {list.map((s, index) => (
        <Paper
          key={s.id}
          variant="outlined"
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Avatar sx={{ bgcolor: 'rgb(240 249 255)', color: 'rgb(3 105 161)', fontWeight: 700 }}>
            {s.order_number || index + 1}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography color="rgb(3 105 161)" fontWeight={600}>
              {s.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              اللغة: {s.language || 'غير محددة'}
            </Typography>
          </Box>
          {isYouTubeUrl(s.video_url) ? (
            <Button
              component="a"
              href={s.video_url}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              color="warning"
              startIcon={<PlayCircleOutlineIcon />}
            >
              عرض على YouTube
            </Button>
          ) : (
            <LinkButton
              href={`/student/video_screeen?videoUrl=${encodeURIComponent(s.video_url)}&title=${encodeURIComponent(s.title)}`}
              variant="contained"
              color="warning"
              startIcon={<PlayCircleOutlineIcon />}
            >
              عرض الفيديو
            </LinkButton>
          )}
        </Paper>
      ))}
    </Stack>
  );
}

function EmptyState() {
  return (
    <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
      <MovieCreationOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
      <Typography color="text.secondary">لا توجد جلسات فيديو متاحة</Typography>
    </Paper>
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
              <LinkButton href={opts.actionHref} variant="contained" color="primary">
                {opts.actionText}
              </LinkButton>
            </Box>
          ) : null}
        </Paper>
      </Container>
    </Box>
  );
}

function parsePositiveInt(v: string): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return host.includes('youtube.com') || host.includes('youtu.be');
  } catch {
    return false;
  }
}
