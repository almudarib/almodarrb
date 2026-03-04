"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  Container,
  Typography,
  Stack,
  IconButton,
  Paper,
  CircularProgress,
  Avatar,
} from "@mui/material";
import {
  Instagram,
  Facebook,
  WhatsApp,
  MusicNote,
  Logout,
  Assignment,
  PlayCircleFilled,
} from "@mui/icons-material";
import logo from "@/app/logo (1).png";

// الألوان المستخرجة من التصميم
const THEME_COLORS = {
  headerBg: "#0d2137", // الكحلي الغامق
  background: "#f4f7fa", // الخلفية الفاتحة جداً
  mainText: "#1a365d",
  subText: "#718096",
  accentYellow: "#f6ad55",
  cardShadow: "rgba(0, 0, 0, 0.05) 0px 10px 30px",
};

type StudentDashProps = {
  exams?: number;
  doneExams?: number;
  logoutAction?: (formData: FormData) => void | Promise<void>;
};

export default function StudentDashPageUI({ exams = 12, doneExams = 1, logoutAction }: StudentDashProps) {
  const progress = exams > 0 ? (doneExams / exams) * 100 : 0;

  return (
    <Box sx={{ bgcolor: THEME_COLORS.background, minHeight: "100vh", direction: "rtl" }}>
      {/* الترويسة - Header */}
      <Box
        sx={{
          bgcolor: THEME_COLORS.headerBg,
          color: "white",
          pt: 4,
          pb: 10, // مساحة إضافية ليبرز الكرت فوقها
          px: 3,
          borderBottomLeftRadius: "40px",
          borderBottomRightRadius: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
<Stack direction="row" alignItems="center">
  <Avatar
    src={logo.src}
    variant="rounded"
    sx={{ 
      width: 55, 
      height: 55, 
      bgcolor: "white", 
      p: 0.5, 
      borderRadius: "12px",
      ml: 3 
    }}
  />
  <Box>
    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1.1rem" }}>
      المدرب والاستاذ (أبو تيم)
    </Typography>
    <Typography variant="body2" sx={{ opacity: 0.8, fontSize: "0.8rem" }}>
      لتعليم قيادة المركبات
    </Typography>
  </Box>
</Stack>

        <form action={logoutAction}>
          <IconButton
            type="submit"
            sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "white", borderRadius: "12px", p: 1 }}
          >
            <Logout sx={{ transform: "rotate(180deg)" }} />
          </IconButton>
        </form>
      </Box>

      <Container maxWidth={false} sx={{ mt: -7, pb: 4, px: 3 }}>
        <Stack spacing={3}>
          {/* بطاقة الإنجاز العام */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: "32px",
              textAlign: "center",
              boxShadow: THEME_COLORS.cardShadow,
            }}
          >
            <Typography variant="h6" fontWeight="bold" color={THEME_COLORS.mainText} mb={3}>
              معدل الإنجاز العام
            </Typography>

            <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
              {/* الدائرة الخلفية الرمادية */}
              <CircularProgress
                variant="determinate"
                value={100}
                size={160}
                thickness={4.5}
                sx={{ color: "#edf2f7" }}
              />
              {/* الدائرة الملونة للإنجاز */}
              <CircularProgress
                variant="determinate"
                value={progress}
                size={160}
                thickness={4.5}
                sx={{
                  color: THEME_COLORS.headerBg,
                  position: "absolute",
                  left: 0,
                  strokeLinecap: "round",
                }}
              />
              <Box
                sx={{
                  top: 0, left: 0, bottom: 0, right: 0,
                  position: "absolute",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h3" fontWeight="bold" color={THEME_COLORS.mainText}>
                  {Math.round(progress)}%
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} mt={1}>
              <Box sx={{ width: 8, height: 8, bgcolor: THEME_COLORS.accentYellow, borderRadius: "50%" }} />
              <Typography color={THEME_COLORS.subText} variant="body2" fontWeight="500">
                {doneExams} / {exams} اختبارات
              </Typography>
            </Stack>
          </Paper>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
            <NavCard
              title="الاختبارات"
              subtitle="الفحص النظري"
              icon={<Assignment sx={{ fontSize: 35, color: THEME_COLORS.headerBg }} />}
              iconBg="#edf2f7"
              href="/students/exams_screen"
            />
            <NavCard
              title="الفيديوهات"
              subtitle="قم بالمشاهدة"
              icon={<PlayCircleFilled sx={{ fontSize: 35, color: THEME_COLORS.accentYellow }} />}
              iconBg="#fff9eb"
              href="/students/sessions_screen"
              isYellow
            />
          </Box>

          {/* قسم التواصل الاجتماعي - نفس تصميم صفحة تسجيل الدخول */}
          <Box
            sx={{
              width: "100%",
              bgcolor: "#f0f2f5",
              borderRadius: "20px",
              p: 3,
              textAlign: "center",
              border: "1px solid #e0e0e0",
            }}
          >
            <Typography sx={{ mb: 2, color: "#263238", fontWeight: 600 }}>
              تابعنا على منصات التواصل
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
              {[
                { icon: <Instagram />, color: "#e1306c" },
                { icon: <MusicNote />, color: "#000000" },
                { icon: <Facebook />, color: "#1877f2" },
                { icon: <WhatsApp />, color: "#25d366" },
              ].map((social, index) => (
                <IconButton
                  key={index}
                  sx={{
                    bgcolor: "white",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    "&:hover": { bgcolor: "#f8f9fa" },
                    p: 1.5,
                  }}
                >
                  {React.cloneElement(social.icon, { sx: { fontSize: 28, color: "#263238" } })}
                </IconButton>
              ))}
            </Stack>
            <Typography sx={{ color: "#ffc107", fontWeight: "bold", fontSize: "1.1rem" }}>
              بإشراف المدرب والاستاذ (أبو تيم)
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

// مكون كرت التنقل (الاختبارات والفيديوهات)
type NavCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  href: string;
  isYellow?: boolean;
};
function NavCard({ title, subtitle, icon, iconBg, href, isYellow }: NavCardProps) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "28px",
          textAlign: "center",
          height: "100%",
          width: "100%",
          boxShadow: THEME_COLORS.cardShadow,
          transition: "0.3s",
          "&:active": { transform: "scale(0.95)" },
        }}
      >
        <Box
          sx={{
            width: 65,
            height: 65,
            borderRadius: "50%",
            bgcolor: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          {icon}
        </Box>
        <Typography fontWeight="bold" color={isYellow ? THEME_COLORS.accentYellow : THEME_COLORS.mainText}>
          {title}
        </Typography>
        <Typography variant="caption" color={THEME_COLORS.subText} sx={{ display: "block", mt: 0.5 }}>
          {subtitle}
        </Typography>
      </Paper>
    </Link>
  );
}

// (لا حاجة لمكوّن SocialIconButton هنا لأننا استخدمنا نفس أسلوب صفحة الدخول)
