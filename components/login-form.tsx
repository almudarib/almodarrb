"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { loginStudentByNationalId } from "@/actions/stu-auth";
import { DASHBOARD_PATH } from "@/lib/paths";
import Image from "next/image";
import Logo from "@/app/logo (1).png";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  IconButton,
  Avatar,
} from "@mui/material";
import { Instagram, Facebook, WhatsApp, MusicNote } from "@mui/icons-material";

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getOrCreateDeviceFingerprint(): Promise<string> {
  try {
    const key = "almodereb_device_fp";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const seedParts = [
      navigator.userAgent || "",
      navigator.language || "",
      String(screen?.width || ""),
      String(screen?.height || ""),
      String(new Date().getTimezoneOffset()),
      String(Math.random()),
      String(performance?.now() || ""),
    ].join("|");
    const fp = await sha256Hex(seedParts);
    localStorage.setItem(key, fp);
    return fp;
  } catch {
    return "anon";
  }
}

function formatErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return "Unknown error";
  }
}

export function LoginForm() {
  const router = useRouter();
  const [nationalId, setNationalId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const ni = nationalId.trim();
      if (!/^\d{10,20}$/.test(ni)) {
        setError("يرجى إدخال رقم هوية صالح (10-20 رقمًا)");
        setLoading(false);
        return;
      }
      const fingerprint = await getOrCreateDeviceFingerprint();
      const res = await loginStudentByNationalId({
        national_id: ni,
        device_fingerprint: fingerprint,
      });
      if (!res.ok) {
        setError(res.error ?? "تعذر تسجيل الدخول");
        setLoading(false);
        return;
      }
      router.replace(DASHBOARD_PATH);
    } catch (e) {
      setError(formatErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f8f9fa", // خلفية فاتحة جداً مثل الصورة
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Stack spacing={3} alignItems="center">
          
          {/* الشعار - Logo */}
          <Box
            sx={{
              p: 1,
              bgcolor: "white",
              borderRadius: "24px",
              boxShadow: "0px 4px 20px rgba(0,0,0,0.05)",
              border: "1px solid #e0e0e0",
              mb: 2
            }}
          >
            <Avatar variant="rounded" sx={{ width: 180, height: 180, borderRadius: "18px", overflow: "hidden" }}>
              <Image src={Logo} alt="Logo" width={180} height={180} />
            </Avatar>
          </Box>

          {/* حقل إدخال رقم الهوية */}
          <TextField
            fullWidth
            placeholder="أدخل رقم الهوية"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            disabled={loading}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                bgcolor: "white",
                height: "60px",
                fontSize: "1.1rem",
                "& fieldset": { borderColor: "#eee" },
              },
              "& input": { textAlign: "center", color: "#455a64" },
            }}
          />

          {/* زر الدخول */}
          <Button
            fullWidth
            onClick={handleLogin}
            disabled={loading}
            variant="contained"
            sx={{
              bgcolor: "#0a192f", // اللون الكحلي الغامق
              color: "white",
              borderRadius: "16px",
              height: "60px",
              fontSize: "1.3rem",
              fontWeight: "bold",
              textTransform: "none",
              "&:hover": { bgcolor: "#050c17" },
            }}
          >
            {loading ? "جارٍ الدخول..." : "دخول"}
          </Button>

          {error && <Alert severity="error" sx={{ width: "100%", borderRadius: "12px" }}>{error}</Alert>}

          {/* تذييل الصفحة - منصات التواصل */}
          <Box
            sx={{
              width: "100%",
              bgcolor: "#f0f2f5", // خلفية الرمادي الفاتح في الأسفل
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
                    p: 1.5
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
