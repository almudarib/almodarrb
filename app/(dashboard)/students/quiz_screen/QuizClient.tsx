'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Stack,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  Box,
  Container,
  Modal,
  Fade,
  Backdrop,
  CircularProgress
} from '@mui/material';
import { Timer, Star } from 'lucide-react'; // استخدام أيقونة النجمة المطابقة للصورة
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

  // ضبط التحميل عند تغيير السؤال
  React.useEffect(() => {
    if (currentQuestion.image_url) setImgLoading(true);
  }, [index, currentQuestion.image_url]);

  // التايمر والانتهاء التلقائي
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

    const correctCount = questions.reduce((acc, q) => {
      return acc + (answers[q.id] === q.correct_option ? 1 : 0);
    }, 0);

    const score = Math.round((correctCount / questions.length) * 100);
    const timeSpent = Math.ceil((totalSeconds - left) / 60);

    try {
      await onSubmit({ examId, score, durationMinutes: timeSpent });
      setDone({ score });
      setShowModal(true); // إظهار المودل المطلوب
    } catch (e) {
      setDone({ score });
      setShowModal(true);
    } finally {
      setSubmitting(false);
    }
  }

  const mm = Math.floor(left / 60).toString().padStart(2, '0');
  const ss = (left % 60).toString().padStart(2, '0');
  const progress = totalSeconds > 0 ? ((totalSeconds - left) / totalSeconds) * 100 : 0;

  return (
    <ProtectionProvider config={{ watermarkText: 'المدرب والاستاذ أبو تيم', watermarkWithTime: false }}>
    <Container maxWidth="sm" sx={{ py: 3, direction: 'rtl' }}>
      <Stack spacing={3}>
        
        {/* شريط التقدم باللون الكحلي الداكن */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: '1px solid #f1f5f9' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
             <Chip 
              icon={<Timer size={16} />} 
              label={`${mm}:${ss}`} 
              sx={{ fontWeight: 800, bgcolor: left < 60 ? '#fef2f2' : '#f8fafc', color: left < 60 ? '#ef4444' : '#09203A' }} 
            />
            <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
              السؤال {index + 1} من {questions.length}
            </Typography>
          </Stack>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ 
              height: 10, borderRadius: 5, bgcolor: '#e2e8f0',
              '& .MuiLinearProgress-bar': { bgcolor: '#09203A' } 
            }} 
          />
        </Paper>

        {/* كارد السؤال */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 5, border: '1px solid #f1f5f9' }}>
          <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: '#09203A' }}>
            {currentQuestion.question}
          </Typography>

          {currentQuestion.image_url && (
            <Box mb={3} sx={{ 
              width: '100%', position: 'relative', minHeight: 180, 
              borderRadius: 4, overflow: 'hidden', bgcolor: '#f8fafc',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9'
            }}>
              {imgLoading && <CircularProgress size={30} sx={{ color: '#BC8803', position: 'absolute' }} />}
              <img 
                key={currentQuestion.image_url}
                src={currentQuestion.image_url} 
                onLoad={() => setImgLoading(false)}
                style={{ width: '100%', display: imgLoading ? 'none' : 'block' }} 
              />
            </Box>
          )}

          <Stack spacing={1.5}>
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
        </Paper>

        {/* زر التالي باللون الذهبي */}
        <Button
          fullWidth variant="contained" size="large"
          disabled={!selectedAnswer || submitting || !!done}
          onClick={() => {
            if (index < questions.length - 1) setIndex(index + 1);
            else handleSubmit();
          }}
          sx={{ 
            borderRadius: 4, py: 2, fontWeight: 800, bgcolor: '#BC8803',
            '&:hover': { bgcolor: '#a67702' },
            '&.Mui-disabled': { bgcolor: '#f1f5f9' }
          }}
        >
          {index === questions.length - 1 ? 'إنهاء وإرسال النتيجة' : 'السؤال التالي'}
        </Button>
      </Stack>

      {/* مودل انتهى الاختبار - مطابق للصورة المرفقة */}
      <Modal
        open={showModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500 }}
      >
        <Fade in={showModal}>
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '85%', maxWidth: 350, bgcolor: 'background.paper', borderRadius: 8,
            boxShadow: 24, p: 4, textAlign: 'center', outline: 'none'
          }}>
            {/* عنوان المودل */}
            <Typography variant="h4" fontWeight={500} sx={{ color: '#09203A', mb: 3 }}>
              انتهى الاختبار
            </Typography>

            {/* أيقونة النجمة الدائرية كما في الصورة */}
            <Box sx={{ 
              bgcolor: '#FFCC33', // لون النجمة الذهبي
              width: 90, height: 90, borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              mx: 'auto', mb: 2 
            }}>
              <Star size={50} fill="#fff" color="#fff" />
            </Box>

            {/* النتيجة */}
            <Typography sx={{ color: '#64748b', mb: 0.5, fontSize: '1.1rem' }}>
              درجتك النهائية هي:
            </Typography>
            <Typography variant="h2" fontWeight={900} sx={{ color: '#09203A', mb: 4 }}>
              {done?.score}%
            </Typography>

            {/* زر العودة للقائمة بنفس لون الهيدر في الصورة */}
            <Button 
              fullWidth variant="contained" 
              onClick={() => {
                if (groupId) router.push(`/students/group_exams?id=${groupId}`);
                else router.push('/students/exams_screen');
              }}
              sx={{ 
                bgcolor: '#09203A', borderRadius: 3, py: 1.5, fontSize: '1.1rem',
                fontWeight: 700, textTransform: 'none',
                '&:hover': { bgcolor: '#1e293b' } 
              }}
            >
              العودة للقائمة
            </Button>
          </Box>
        </Fade>
      </Modal>
    </Container>
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
        justifyContent: 'space-between', p: 2, borderRadius: 4, border: '2px solid', 
        borderColor: styles.border, bgcolor: styles.bg, color: styles.text,
        '&.Mui-disabled': { opacity: 1, color: styles.text, borderColor: styles.border }
      }}
    >
      <Typography fontWeight={700} sx={{ textAlign: 'right', flex: 1, px: 1 }}>{text}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {(state === 'correct' || state === 'wrong') && (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: state === 'correct' ? '#28a745' : '#dc3545',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 16
            }}
          >
            {state === 'correct' ? '✓' : '✗'}
          </Box>
        )}
        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: styles.iconBg, color: styles.iconText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
          {letter}
        </Box>
      </Box>
    </Button>
  );
}
