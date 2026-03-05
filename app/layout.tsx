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
  description: "المدرب - تعليم القيادة بادارة المدرب والاستاذ (أبو تيم) ",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", url: "/icon.png" },
    { rel: "shortcut icon", url: "/icon.png" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
