import { Paper, Typography } from '@mui/material';

export default function Loading() {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
      <Typography>جاري تحميل الجلسات...</Typography>
    </Paper>
  );
}
