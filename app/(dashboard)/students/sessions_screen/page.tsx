import {
  Container,
  Box,
  Paper,
  Typography,
  Stack,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { LinkButton } from './LinkButton';
import SessionsList from './SessionsList';

/**
 * شاشة قائمة الجلسات الفيديوية (SSR)
 * - تعتمد على وجود student_id في الكوكيز
 * - تحاول جلب جلسات باللغة الخاصة بالطالب، وإن لم تتوفر تُظهر المتاح العام
 * - تفتح روابط YouTube في تبويب خارجي، وروابط غير YouTube تُفتح في صفحة المشغّل
 */
export default function SessionsScreenPage() {
  return (
    <Box dir="rtl" sx={{ minHeight: '100svh', bgcolor: 'rgb(248 250 252)' }}>
      <Container maxWidth="md" sx={{ py: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <LinkButton
            href="/students/dash"
            variant="outlined"
            startIcon={<ArrowBackIosNewIcon />}
          >
            رجوع
          </LinkButton>
          <Typography fontWeight={700}>الدروس التعليمية</Typography>
        </Stack>
        <SessionsList />
      </Container>
    </Box>
  );
}
