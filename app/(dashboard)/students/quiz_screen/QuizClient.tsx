'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Stack,
  Typography,
  Paper,
  Box,
  Container,
  Modal,
  Fade,
  Backdrop,
  CircularProgress
} from '@mui/material';
import { Timer, Star } from 'lucide-react';
import ProtectionProvider from '../../../security/ProtectionProvider';

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
  questions,
  durationMinutes,
  groupId,
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
    Object.fromEntries(questions.map((q) => [q.id, null]))
  );

  const totalSeconds = Math.max(0, Math.floor((durationMinutes || 0) * 60));
  const [left, setLeft] = React.useState(totalSeconds);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{ score: number } | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [imgLoading, setImgLoading] = React.useState(true);

  const currentQuestion = questions[index];
  const selectedAnswer = answers[currentQuestion.id];

  React.useEffect(() => {
    if (currentQuestion.image_url) setImgLoading(true);
  }, [index, currentQuestion.image_url]);

  React.useEffect(() => {
    if (totalSeconds <= 0 || done) return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          handleSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done, answers]);

  async function handleSubmit() {
    if (submitting || done) return;
    setSubmitting(true);
    const correctCount = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_option ? 1 : 0), 0);
    const score = Math.round((correctCount / questions.length) * 100);
    const timeSpent = Math.ceil((totalSeconds - left) / 60);

    try {
      await onSubmit({ examId, score, durationMinutes: timeSpent });
      setDone({ score });
      setShowModal(true);
    } catch (e) {
      setDone({ score });
      setShowModal(true);
    } finally {
      setSubmitting(false);
    }
  }

  const mm = Math.floor(left / 60).toString().padStart(2, '0');
  const ss = (left % 60).toString().padStart(2, '0');

  return (
    <ProtectionProvider config={{ watermarkText: 'المدرب والاستاذ أبو تيم', watermarkWithTime: false }}>
      <Container
        maxWidth="sm"
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          p: 1.5, // تقليل المساحة الخارجية
          direction: 'rtl',
          overflow: 'hidden', // منع السكرول تماماً
          bgcolor: '#fcfcfc'
        }}
      >
        {/* هيدر مدمج في سطر واحد */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
          <Typography variant="body2" fontWeight={900} color="#09203A">
            السؤال {index + 1} / {questions.length}
          </Typography>

          <Box sx={{
            bgcolor: '#09203A', color: 'white', px: 1.5, py: 0.3, borderRadius: 5,
            display: 'flex', alignItems: 'center', gap: 0.5
          }}>
            <Typography variant="body2" fontWeight={800}>{mm}:{ss}</Typography>
            <Timer size={14} />
          </Box>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 6,
            border: '1px solid #f1f5f9',
            flexGrow: 0, // لا يتمدد بشكل عشوائي
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            overflow: 'hidden',
            width: '100%'
          }}
        >
          {/* نص السؤال - تقليل الهوامش */}
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#09203A', textAlign: 'center', mb: 0.5 }}>
            {currentQuestion.question || '.'}
          </Typography>

          {/* الصورة - تم تصغير الارتفاع لرفع الخيارات والزر */}
          {currentQuestion.image_url && (
            <Box sx={{
              width: '100%', height: 140, position: 'relative', borderRadius: 3,
              bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
              mb: 1
            }}>
              {imgLoading && <CircularProgress size={20} sx={{ color: '#BC8803' }} />}
              <img
                key={currentQuestion.image_url}
                src={currentQuestion.image_url}
                onLoad={() => setImgLoading(false)}
                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', display: imgLoading ? 'none' : 'block' }}
              />
            </Box>
          )}

          {/* الخيارات - Stack ضيق لتقريب الأزرار */}
          <Stack spacing={1}>
            {(['A', 'B', 'C', 'D'] as const).map((letter) => {
              const textMap = { A: currentQuestion.option_a, B: currentQuestion.option_b, C: currentQuestion.option_c, D: currentQuestion.option_d };
              const isCorrect = currentQuestion.correct_option === letter;
              const isSelected = selectedAnswer === letter;
              let state: 'neutral' | 'correct' | 'wrong' = 'neutral';
              if (selectedAnswer) {
                if (isCorrect) state = 'correct';
                else if (isSelected) state = 'wrong';
              }
              return (
                <OptionButton key={letter} letter={letter} text={textMap[letter]} state={state}
                  onClick={() => { if (!selectedAnswer) setAnswers(p => ({ ...p, [currentQuestion.id]: letter })); }}
                  disabled={!!selectedAnswer || !!done}
                />
              );
            })}
          </Stack>

          {/* تم رفع الزر ليلتصق بآخر خيار مباشرة */}
          <Button
            fullWidth variant="contained"
            disabled={!selectedAnswer || submitting || !!done}
            onClick={() => {
              if (index < questions.length - 1) setIndex(index + 1);
              else handleSubmit();
            }}
            sx={{
              borderRadius: 3,
              py: 1.5,
              mt: 1, // مسافة صغيرة فقط فوق الزر
              fontWeight: 800,
              bgcolor: '#BC8803',
              fontSize: '1rem',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#a67702' },
              '&.Mui-disabled': { bgcolor: '#f1f5f9', color: '#cbd5e1' }
            }}
          >
            {index === questions.length - 1 ? 'إنهاء وإرسال النتيجة' : 'السؤال التالي'}
          </Button>
        </Paper>
      </Container>

      {/* مودل النتيجة */}
      <Modal open={showModal} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
        <Fade in={showModal}>
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '85%', maxWidth: 320, bgcolor: 'background.paper', borderRadius: 8,
            boxShadow: 24, p: 3, textAlign: 'center', outline: 'none'
          }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#09203A', mb: 2 }}>انتهى الاختبار</Typography>
            <Box sx={{ bgcolor: '#FFCC33', width: 70, height: 70, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <Star size={35} fill="#fff" color="#fff" />
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ color: '#09203A', mb: 3 }}>{done?.score}%</Typography>
            {/* زر العودة داخل المودل */}
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                // تحديد الرابط المستهدف
                const targetUrl = groupId
                  ? `/students/group_exams?id=${groupId}`
                  : '/students/exams_screen';

                // استخدام window.location لإجبار المتصفح على تحميل الصفحة من جديد
                window.location.href = targetUrl;
              }}
              sx={{ bgcolor: '#09203A', borderRadius: 3, py: 1.2, fontWeight: 700 }}
            >
              العودة للقائمة
            </Button>
          </Box>
        </Fade>
      </Modal>
    </ProtectionProvider>
  );
}

function OptionButton({ letter, text, state, onClick, disabled }: any) {
  const styles = {
    correct: { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', iconBg: '#22c55e', iconText: '#fff' },
    wrong: { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c', iconBg: '#ef4444', iconText: '#fff' },
    neutral: { bg: '#fff', border: '#e2e8f0', text: '#475569', iconBg: '#f1f5f9', iconText: '#64748b' }
  }[state as 'correct' | 'wrong' | 'neutral'];

  return (
    <Button fullWidth onClick={onClick} disabled={disabled}
      sx={{
        justifyContent: 'space-between', p: 1.2, borderRadius: 3, border: '1.5px solid',
        borderColor: styles.border, bgcolor: styles.bg, color: styles.text,
        minHeight: 50, textTransform: 'none',
        '&.Mui-disabled': { opacity: 1, color: styles.text, borderColor: styles.border }
      }}
    >
      <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'right', flex: 1, px: 1 }}>{text}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {(state === 'correct' || state === 'wrong') && (
          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: state === 'correct' ? '#28a745' : '#dc3545', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11 }}>
            {state === 'correct' ? '✓' : '✗'}
          </Box>
        )}
        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: styles.iconBg, color: styles.iconText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>
          {letter}
        </Box>
      </Box>
    </Button>
  );
}