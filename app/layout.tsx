import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import EmotionProvider from "./emotion";
import ProtectionProvider from "./security/ProtectionProvider";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "المدرب",
    template: "%s | المدرب",
  },
  applicationName: "المدرب",
  description: "منصة اختبارات وتدريب",
  icons: [
    { rel: "icon", url: "/logo%20(1).png" },
    { rel: "shortcut icon", url: "/logo%20(1).png" },
    { rel: "apple-touch-icon", url: "/logo%20(1).png" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="emotion-insertion-point" content="" />
        <link rel="icon" href="/logo%20(1).png" />
        <link rel="apple-touch-icon" href="/logo%20(1).png" />
      </head>
      <body className="antialiased">
        <EmotionProvider>
          <ProtectionProvider config={{ watermarkText: "", protectCopy: true, protectScreenshot: true, protectVideo: true }}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </ProtectionProvider>
        </EmotionProvider>
      </body>
    </html>
  );
}
