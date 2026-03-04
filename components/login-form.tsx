"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { loginStudentByNationalId } from "@/actions/stu-auth";
import { DASHBOARD_PATH } from "@/lib/paths";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  IconButton,
  Paper,
} from "@mui/material";
import { Instagram, Facebook, WhatsApp, MusicNote } from "@mui/icons-material";

async function sha256Hex(input: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    const arr = new Uint8Array(16);
    (crypto.getRandomValues ? crypto.getRandomValues(arr) : arr).forEach((_, i) => {
      arr[i] = Math.floor(Math.random() * 256);
    });
    return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

async function getOrCreateDeviceFingerprint(): Promise<string> {
  try {
    const key = "device_fingerprint";
    const existing = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (existing && existing.trim().length > 0) return existing;
    const nav = (typeof navigator !== "undefined"
      ? (navigator as Navigator & { hardwareConcurrency?: number })
      : undefined);
    const raw = JSON.stringify({
      ua: nav ? nav.userAgent : "",
      lang: nav ? nav.language : "",
      tz:
        typeof Intl !== "undefined" && Intl.DateTimeFormat
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "",
      cores: nav?.hardwareConcurrency ?? "",
      screen:
        typeof window !== "undefined"
          ? { w: window.screen?.width ?? 0, h: window.screen?.height ?? 0, dpr: window.devicePixelRatio ?? 1 }
          : { w: 0, h: 0, dpr: 1 },
      seed: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    });
    const fp = await sha256Hex(raw);
    if (typeof window !== "undefined") localStorage.setItem(key, fp);
    return fp;
  } catch {
    return String(Date.now());
  }
}

function formatErrorMessage(msg: unknown): string {
  if (typeof msg === "string") return msg;
  if (msg instanceof Error) return msg.message;
  try {
    return JSON.stringify(msg);
  } catch {
    return "حدث خطأ غير معروف";
  }
}

export function LoginForm() {
  const router = useRouter();
  const [nationalId, setNationalId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function openExternal(url: string) {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      location.href = url;
    }
  }

  async function handleLogin() {
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
  }

  return (
    <Container
      maxWidth="sm"
      sx={{ display: "flex", minHeight: "100svh", alignItems: "center", justifyContent: "center" }}
    >
      <Paper elevation={0} sx={{ p: 4, width: "100%", borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <Stack spacing={3} alignItems="center">
          <Box
            sx={{
              width: "100%",
              bgcolor: "primary.main",
              opacity: 0.06,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "primary.main",
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography color="primary" fontWeight={700}>
              تسجيل دخول الطالب
            </Typography>
          </Box>
          <TextField
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            fullWidth
            inputMode="numeric"
            placeholder="أدخل رقم الهوية"
            label="رقم الهوية"
            disabled={loading}
            FormHelperTextProps={{ sx: { textAlign: "center" } }}
            inputProps={{ inputMode: "numeric", pattern: "\\d*", style: { textAlign: "center" } }}
          />
          <Button
            onClick={handleLogin}
            fullWidth
            size="large"
            variant="contained"
            disabled={loading}
            sx={{ borderRadius: 2, height: 48 }}
          >
            {loading ? "... جارٍ الدخول" : "دخول"}
          </Button>
          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}
          <Box
            sx={{
              width: "100%",
              bgcolor: "primary.main",
              opacity: 0.06,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "primary.main",
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography color="primary" fontWeight={700} sx={{ mb: 1 }}>
              تابعنا على منصات التواصل
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center">
              <IconButton aria-label="Instagram" onClick={() => openExternal("https://instagram.com")} color="primary">
                <Instagram />
              </IconButton>
              <IconButton aria-label="TikTok" onClick={() => openExternal("https://tiktok.com")} color="primary">
                <MusicNote />
              </IconButton>
              <IconButton aria-label="Facebook" onClick={() => openExternal("https://facebook.com")} color="primary">
                <Facebook />
              </IconButton>
              <IconButton aria-label="WhatsApp" onClick={() => openExternal("https://wa.me/")} color="primary">
                <WhatsApp />
              </IconButton>
            </Stack>
            <Typography sx={{ mt: 1 }} color="warning.main" fontWeight={600}>
              بإشراف المدرب والاستاذ (أبو تيم)
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
