'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Stack, Typography, Paper, LinearProgress, Alert } from '@mui/material';

type Question = {
  id: number;
  question: string;
  image_url: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
};

export default function QuizClient({
  examId,
  title,
  durationMinutes,
  groupId,
  questions,
  onSubmit,
}: {
  examId: number;
  title: string;
  durationMinutes: number;
  groupId: number | null;
  questions: Question[];
  onSubmit: (payload: { examId: number; score: number; durationMinutes: number }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<number, 'A' | 'B' | 'C' | 'D' | null>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, null])),
  );
  const totalSeconds = Math.max(0, Math.floor((durationMinutes || 0) * 60));
  const [left, setLeft] = React.useState(totalSeconds);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ score: number } | null>(null);

  React.useEffect(() => {
    if (totalSeconds <= 0) return;
    const t = setInterval(() => {
      setLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [totalSeconds]);
  React.useEffect(() => {
    if (left === 0 && !done) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  function setAnswerForCurrent(choice: 'A' | 'B' | 'C' | 'D') {
    const q = questions[index];
    setAnswers((prev) => ({ ...prev, [q.id]: choice }));
  }
  function next() {
    setIndex((i) => Math.min(questions.length - 1, i + 1));
  }
  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  async function handleSubmit() {
    if (submitting || done) return;
    setSubmitting(true);
    setError(null);
    const correct = questions.reduce((acc, q) => {
      const sel = answers[q.id];
      return acc + (sel === q.correct_option ? 1 : 0);
    }, 0);
    const score = Math.round((correct / Math.max(1, questions.length)) * 100);
    const spent = Math.ceil((totalSeconds - left) / 60);
    try {
      const res = await onSubmit({ examId, score, durationMinutes: spent });
      if ('ok' in res && res.ok) {
        setDone({ score });
        setTimeout(() => {
          if (groupId) router.push(`/student/group_exams?id=${groupId}`);
          else router.push('/student/exams_screen');
        }, 1000);
      } else {
        setError(res.error ?? 'حدث خطأ أثناء حفظ النتيجة');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر إرسال النتيجة');
    } finally {
      setSubmitting(false);
    }
  }

  const q = questions[index];
  const pct = totalSeconds > 0 ? Math.round(((totalSeconds - left) / totalSeconds) * 100) : 0;
  const mm = Math.floor(left / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(left % 60)
    .toString()
    .padStart(2, '0');

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography fontWeight={700}>{title}</Typography>
          <Typography color="text.secondary">الوقت المتبقي: {mm}:{ss}</Typography>
        </Stack>
        {totalSeconds > 0 ? <LinearProgress variant="determinate" value={pct} /> : null}
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {done ? <Alert severity="success">تم حفظ نتيجتك: {done.score}%</Alert> : null}

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2}>
          <Typography fontWeight={700}>سؤال {index + 1} من {questions.length}</Typography>
          <Typography>{q.question}</Typography>
          {q.image_url ? (
            // نستخدم img مباشرة لتفادي إعدادات next/image لمجالات خارجية
            <img src={q.image_url} alt="" style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid #e5e7eb' }} />
          ) : null}
          <Stack spacing={1}>
            <AnswerButton
              label={`A) ${q.option_a}`}
              selected={answers[q.id] === 'A'}
              onClick={() => setAnswerForCurrent('A')}
            />
            <AnswerButton
              label={`B) ${q.option_b}`}
              selected={answers[q.id] === 'B'}
              onClick={() => setAnswerForCurrent('B')}
            />
            <AnswerButton
              label={`C) ${q.option_c}`}
              selected={answers[q.id] === 'C'}
              onClick={() => setAnswerForCurrent('C')}
            />
            <AnswerButton
              label={`D) ${q.option_d}`}
              selected={answers[q.id] === 'D'}
              onClick={() => setAnswerForCurrent('D')}
            />
          </Stack>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1} justifyContent="space-between">
        <Button variant="outlined" onClick={prev} disabled={index === 0 || submitting}>
          السابق
        </Button>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={next} disabled={index >= questions.length - 1 || submitting}>
            التالي
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            إنهاء وإرسال
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

function AnswerButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      variant={selected ? 'contained' : 'outlined'}
      color={selected ? 'primary' : 'inherit'}
      sx={{ justifyContent: 'flex-start', borderRadius: 2, textTransform: 'none' }}
    >
      {label}
    </Button>
  );
}

